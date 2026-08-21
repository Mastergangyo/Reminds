"""
Background Real-Time Reminder Scheduler
Continuously monitors reminders, evaluates advance alerts & snoozes, and dispatches native notifications.
"""

import time
import datetime
import threading
import logging
from database import Database
from notifier import send_unified_notification, play_chime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("Scheduler")

class ReminderScheduler:
    def __init__(self, db: Database, check_interval_seconds: int = 25):
        self.db = db
        self.check_interval = check_interval_seconds
        self.is_running = False
        self._thread = None
        self._notified_cache = set() # (reminder_id, date_str, alert_type)

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Real-time Reminder Scheduler started.")

    def stop(self):
        self.is_running = False
        logger.info("Scheduler stopped.")

    def _run_loop(self):
        # Initial wait to let server start up smoothly
        time.sleep(2)
        while self.is_running:
            try:
                self.check_and_notify()
            except Exception as e:
                logger.error(f"Error in scheduler check loop: {e}", exc_info=True)
            time.sleep(self.check_interval)

    def check_and_notify(self):
        now = datetime.datetime.now()
        today = now.date()
        today_str = today.strftime("%Y-%m-%d")
        current_time_str = now.strftime("%H:%M")

        settings = self.db.get_settings()
        sound_enabled = settings.get("sound_enabled", True)
        currency = settings.get("currency", "₹")

        reminders = self.db.get_all_reminders()

        for r in reminders:
            if r.get("status") == "completed":
                continue

            r_id = r["id"]
            title = r.get("title", "Reminder")
            category = r.get("category", "custom")
            amount = r.get("amount", 0)
            due_date_str = r.get("due_date", "")
            due_time_str = r.get("due_time", "09:00")
            advance_days = int(r.get("advance_days", 0) or 0)
            priority = r.get("priority", "normal")
            snoozed_until_str = r.get("snoozed_until")

            amt_text = f" ({currency}{amount:,.0f})" if amount and amount > 0 else ""

            # 1. Check Snoozed Reminder
            if snoozed_until_str:
                try:
                    snooze_dt = datetime.datetime.fromisoformat(snoozed_until_str)
                    if now >= snooze_dt:
                        cache_key = (r_id, "snooze", snoozed_until_str[:16])
                        if cache_key not in self._notified_cache:
                            self._notified_cache.add(cache_key)
                            # Clear snooze in DB
                            self.db.update_reminder(r_id, {"snoozed_until": None})
                            msg = f"🔔 Snoozed reminder is now due!{amt_text}\n{r.get('notes', '')}".strip()
                            logger.info(f"Triggering Snooze Alert (Desktop + Mobile): {title}")
                            send_unified_notification(
                                f"⏰ Snooze Alert: {title}",
                                msg,
                                priority=priority,
                                reminder=r,
                                sound=sound_enabled,
                                settings=settings
                            )
                            continue
                except Exception as ex:
                    logger.debug(f"Error parsing snooze timestamp: {ex}")

            # Parse Due Date
            try:
                due_date = datetime.datetime.strptime(due_date_str, "%Y-%m-%d").date()
            except Exception:
                continue

            # 2. Check Due Today & Time reached
            if due_date == today:
                if current_time_str >= due_time_str:
                    cache_key = (r_id, today_str, "due_today")
                    if cache_key not in self._notified_cache:
                        self._notified_cache.add(cache_key)
                        self.db.update_reminder(r_id, {"last_notified": now.isoformat()})
                        notes = r.get("notes", "")
                        body = f"Due today at {due_time_str}{amt_text}.\n{notes}".strip()
                        logger.info(f"Triggering Due Reminder (Desktop + Mobile): {title}")
                        send_unified_notification(
                            f"⏰ DUE NOW: {title}",
                            body,
                            priority=priority or "high",
                            reminder=r,
                            sound=sound_enabled,
                            settings=settings
                        )
                        continue

            # 3. Check Overdue
            elif due_date < today:
                # Notify once per day if overdue
                cache_key = (r_id, today_str, "overdue")
                if cache_key not in self._notified_cache:
                    # Notify during daytime (e.g., after 9:00 AM)
                    if current_time_str >= "09:00":
                        self._notified_cache.add(cache_key)
                        days_overdue = (today - due_date).days
                        body = f"⚠️ Overdue by {days_overdue} day(s){amt_text}!\nDue date was: {due_date_str}."
                        logger.info(f"Triggering Overdue Reminder (Desktop + Mobile): {title}")
                        send_unified_notification(
                            f"🚨 OVERDUE: {title}",
                            body,
                            priority="urgent",
                            reminder=r,
                            sound=sound_enabled,
                            settings=settings
                        )
                        continue

            # 4. Check Advance Notice (e.g. 1 to 3 days prior)
            elif advance_days > 0 and due_date > today:
                days_until_due = (due_date - today).days
                if days_until_due <= advance_days:
                    cache_key = (r_id, today_str, f"advance_{days_until_due}")
                    if cache_key not in self._notified_cache:
                        # Send advance alert at daytime
                        if current_time_str >= "09:00":
                            self._notified_cache.add(cache_key)
                            body = f"Upcoming in {days_until_due} day(s){amt_text}.\nDue on: {due_date.strftime('%a, %d %b %Y')} at {due_time_str}."
                            logger.info(f"Triggering Advance Reminder (Desktop + Mobile): {title}")
                            send_unified_notification(
                                f"⏳ Upcoming Reminder: {title}",
                                body,
                                priority="normal",
                                reminder=r,
                                sound=sound_enabled,
                                settings=settings
                            )

