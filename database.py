"""
Database & Reminder Management Engine
Handles JSON storage, recurrence computation, financial commitment tracking, and history logs.
"""

import os
import json
import uuid
import datetime
from datetime import timedelta
import calendar

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reminders_db.json")

DEFAULT_CATEGORIES = [
    {"id": "rent", "name": "Home Rent", "icon": "🏠", "color": "#10b981", "type": "financial"},
    {"id": "electricity", "name": "Current / Power Bill", "icon": "⚡", "color": "#f59e0b", "type": "financial"},
    {"id": "water", "name": "Water Bill", "icon": "💧", "color": "#06b6d4", "type": "financial"},
    {"id": "grocery", "name": "Monthly Grocery", "icon": "🛒", "color": "#8b5cf6", "type": "task"},
    {"id": "stocks", "name": "Stock Market & SIP", "icon": "📈", "color": "#ec4899", "type": "financial"},
    {"id": "meeting", "name": "Meetings & Events", "icon": "📅", "color": "#3b82f6", "type": "task"},
    {"id": "custom", "name": "Other Tasks", "icon": "🔔", "color": "#64748b", "type": "general"},
]

def get_next_monthly_date(day_of_month: int, from_date: datetime.date = None) -> datetime.date:
    """Returns the next occurrence date for a specific day of the month."""
    if from_date is None:
        from_date = datetime.date.today()
    
    year = from_date.year
    month = from_date.month
    
    # Cap day to maximum days in current month
    max_days = calendar.monthrange(year, month)[1]
    target_day = min(day_of_month, max_days)
    
    candidate = datetime.date(year, month, target_day)
    if candidate >= from_date:
        return candidate
    
    # Move to next month
    if month == 12:
        year += 1
        month = 1
    else:
        month += 1
    
    max_days = calendar.monthrange(year, month)[1]
    target_day = min(day_of_month, max_days)
    return datetime.date(year, month, target_day)

def calculate_next_occurrence(recurrence: str, current_due_date: str, current_due_time: str) -> tuple[str, str]:
    """Calculates the next due date/time based on recurrence pattern."""
    try:
        dt = datetime.datetime.strptime(f"{current_due_date} {current_due_time}", "%Y-%m-%d %H:%M")
    except Exception:
        dt = datetime.datetime.now()

    today = datetime.datetime.now()

    if recurrence == "daily":
        next_dt = dt + timedelta(days=1)
        while next_dt < today:
            next_dt += timedelta(days=1)
    elif recurrence == "weekdays":  # Mon-Fri
        next_dt = dt + timedelta(days=1)
        while next_dt.weekday() >= 5 or next_dt < today:  # 5=Sat, 6=Sun
            next_dt += timedelta(days=1)
    elif recurrence == "weekly":
        next_dt = dt + timedelta(weeks=1)
        while next_dt < today:
            next_dt += timedelta(weeks=1)
    elif recurrence == "monthly":
        day = dt.day
        year = dt.year
        month = dt.month + 1
        if month > 12:
            month = 1
            year += 1
        max_days = calendar.monthrange(year, month)[1]
        next_day = min(day, max_days)
        next_dt = datetime.datetime(year, month, next_day, dt.hour, dt.minute)
    elif recurrence == "quarterly":
        month = dt.month + 3
        year = dt.year
        if month > 12:
            month -= 12
            year += 1
        max_days = calendar.monthrange(year, month)[1]
        next_day = min(dt.day, max_days)
        next_dt = datetime.datetime(year, month, next_day, dt.hour, dt.minute)
    elif recurrence == "yearly":
        next_dt = datetime.datetime(dt.year + 1, dt.month, dt.day, dt.hour, dt.minute)
    else:
        # One-time
        return current_due_date, current_due_time

    return next_dt.strftime("%Y-%m-%d"), next_dt.strftime("%H:%M")


def get_default_database():
    """Generates initial seed data tailored for the user's requirements."""
    today = datetime.date.today()
    rent_date = get_next_monthly_date(1, today)
    sip_date = get_next_monthly_date(5, today)
    elec_date = get_next_monthly_date(10, today)
    water_date = get_next_monthly_date(15, today)
    grocery_date = get_next_monthly_date(2, today)
    meeting_date = (today + timedelta(days=2)).strftime("%Y-%m-%d")

    return {
        "settings": {
            "currency": "₹",
            "sound_enabled": True,
            "toast_enabled": True,
            "theme": "dark",
            "advance_alert_default": "1_day",
            "mobile_notifications": {
                "enabled": True,
                "provider": "ntfy",
                "ntfy_topic": f"reminders_{uuid.uuid4().hex[:8]}",
                "telegram_bot_token": "",
                "telegram_chat_id": "",
                "whatsapp_phone": "",
                "whatsapp_api_key": "",
                "pushover_user_key": "",
                "pushover_api_token": "",
                "discord_webhook_url": ""
            }
        },
        "reminders": [
            {
                "id": str(uuid.uuid4()),
                "title": "Pay Home Rent",
                "category": "rent",
                "amount": 15000,
                "due_date": rent_date.strftime("%Y-%m-%d"),
                "due_time": "09:00",
                "recurrence": "monthly",
                "advance_days": 2,
                "priority": "high",
                "notes": "Transfer to landlord bank account / UPI. Collect receipt.",
                "link": "",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Pay Current / Electricity Bill",
                "category": "electricity",
                "amount": 2450,
                "due_date": elec_date.strftime("%Y-%m-%d"),
                "due_time": "10:30",
                "recurrence": "monthly",
                "advance_days": 3,
                "priority": "high",
                "notes": "Consumer No: 9876543210. Check unit consumption.",
                "link": "https://www.electricity.gov.in",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Pay Water Utility Bill",
                "category": "water",
                "amount": 420,
                "due_date": water_date.strftime("%Y-%m-%d"),
                "due_time": "11:00",
                "recurrence": "monthly",
                "advance_days": 2,
                "priority": "medium",
                "notes": "Municipal water authority account #WA-4412",
                "link": "",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Monthly Grocery Stockup & Essentials",
                "category": "grocery",
                "amount": 8000,
                "due_date": grocery_date.strftime("%Y-%m-%d"),
                "due_time": "16:00",
                "recurrence": "monthly",
                "advance_days": 1,
                "priority": "medium",
                "notes": "Check pantry: Rice, Atta, Cooking Oil, Spices, Dairy, Cleaning supplies.",
                "link": "",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Stock Market Monthly SIP & Investment",
                "category": "stocks",
                "amount": 10000,
                "due_date": sip_date.strftime("%Y-%m-%d"),
                "due_time": "09:30",
                "recurrence": "monthly",
                "advance_days": 1,
                "priority": "high",
                "notes": "Index Funds SIP + Direct Equity allocation check. Verify bank balance.",
                "link": "",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Stock Market Opening Review",
                "category": "stocks",
                "amount": 0,
                "due_date": today.strftime("%Y-%m-%d"),
                "due_time": "09:15",
                "recurrence": "weekdays",
                "advance_days": 0,
                "priority": "normal",
                "notes": "Check pre-market trends, global cues, and portfolio watchlist.",
                "link": "",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Weekly Planning / Project Review Meeting",
                "category": "meeting",
                "amount": 0,
                "due_date": meeting_date,
                "due_time": "11:00",
                "recurrence": "weekly",
                "advance_days": 0,
                "priority": "high",
                "notes": "Review monthly deliverables, roadmap and pending action items.",
                "link": "https://meet.google.com",
                "status": "pending",
                "snoozed_until": None,
                "last_notified": None,
                "created_at": datetime.datetime.now().isoformat()
            }
        ],
        "history": [],
        "categories": DEFAULT_CATEGORIES
    }


class Database:
    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self._load()

    def _load(self):
        if not os.path.exists(self.db_path):
            self.data = get_default_database()
            self._save()
        else:
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception:
                self.data = get_default_database()
                self._save()

    def _save(self):
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def get_settings(self):
        settings = self.data.get("settings", {})
        # Backfill default mobile notification settings if missing
        if "mobile_notifications" not in settings or not isinstance(settings["mobile_notifications"], dict):
            settings["mobile_notifications"] = {
                "enabled": True,
                "provider": "ntfy",
                "ntfy_topic": f"reminders_{uuid.uuid4().hex[:8]}",
                "telegram_bot_token": "",
                "telegram_chat_id": "",
                "whatsapp_phone": "",
                "whatsapp_api_key": "",
                "pushover_user_key": "",
                "pushover_api_token": "",
                "discord_webhook_url": ""
            }
            self._save()
        else:
            # Ensure ntfy_topic is present
            if not settings["mobile_notifications"].get("ntfy_topic"):
                settings["mobile_notifications"]["ntfy_topic"] = f"reminders_{uuid.uuid4().hex[:8]}"
                self._save()
        return settings

    def update_settings(self, new_settings):
        current = self.get_settings()
        for k, v in new_settings.items():
            if k == "mobile_notifications" and isinstance(v, dict):
                current.setdefault("mobile_notifications", {}).update(v)
            else:
                current[k] = v
        self.data["settings"] = current
        self._save()
        return self.data["settings"]

    def get_categories(self):
        return self.data.get("categories", DEFAULT_CATEGORIES)

    def get_all_reminders(self, category=None, status=None):
        reminders = self.data.get("reminders", [])
        if category and category != "all":
            reminders = [r for r in reminders if r.get("category") == category]
        if status and status != "all":
            reminders = [r for r in reminders if r.get("status") == status]
        
        # Sort by due_date and due_time
        reminders.sort(key=lambda r: (r.get("due_date", ""), r.get("due_time", "")))
        return reminders

    def get_reminder(self, reminder_id):
        for r in self.data.get("reminders", []):
            if r["id"] == reminder_id:
                return r
        return None

    def add_reminder(self, reminder_data):
        new_reminder = {
            "id": str(uuid.uuid4()),
            "title": reminder_data.get("title", "Untitled Reminder"),
            "category": reminder_data.get("category", "custom"),
            "amount": float(reminder_data.get("amount", 0) or 0),
            "due_date": reminder_data.get("due_date", datetime.date.today().strftime("%Y-%m-%d")),
            "due_time": reminder_data.get("due_time", "09:00"),
            "recurrence": reminder_data.get("recurrence", "one-time"),
            "advance_days": int(reminder_data.get("advance_days", 0) or 0),
            "priority": reminder_data.get("priority", "normal"),
            "notes": reminder_data.get("notes", ""),
            "link": reminder_data.get("link", ""),
            "status": "pending",
            "snoozed_until": None,
            "last_notified": None,
            "created_at": datetime.datetime.now().isoformat()
        }
        self.data.setdefault("reminders", []).append(new_reminder)
        self._save()
        return new_reminder

    def update_reminder(self, reminder_id, updates):
        reminder = self.get_reminder(reminder_id)
        if not reminder:
            return None
        
        for key in ["title", "category", "amount", "due_date", "due_time", "recurrence", "advance_days", "priority", "notes", "link", "status"]:
            if key in updates:
                if key == "amount":
                    reminder[key] = float(updates[key] or 0)
                elif key == "advance_days":
                    reminder[key] = int(updates[key] or 0)
                else:
                    reminder[key] = updates[key]
        
        if "snoozed_until" in updates:
            reminder["snoozed_until"] = updates["snoozed_until"]

        self._save()
        return reminder

    def delete_reminder(self, reminder_id):
        initial_len = len(self.data.get("reminders", []))
        self.data["reminders"] = [r for r in self.data.get("reminders", []) if r["id"] != reminder_id]
        if len(self.data["reminders"]) < initial_len:
            self._save()
            return True
        return False

    def mark_as_done(self, reminder_id, notes=""):
        reminder = self.get_reminder(reminder_id)
        if not reminder:
            return None

        now = datetime.datetime.now()
        # Record into history
        history_entry = {
            "id": str(uuid.uuid4()),
            "reminder_id": reminder["id"],
            "title": reminder["title"],
            "category": reminder["category"],
            "amount": reminder.get("amount", 0),
            "completed_at": now.isoformat(),
            "due_date": reminder["due_date"],
            "notes": notes or f"Marked as completed / paid on {now.strftime('%d %b %Y, %I:%M %p')}"
        }
        self.data.setdefault("history", []).append(history_entry)

        # Handle recurrence
        recurrence = reminder.get("recurrence", "one-time")
        if recurrence != "one-time":
            next_date, next_time = calculate_next_occurrence(recurrence, reminder["due_date"], reminder["due_time"])
            reminder["due_date"] = next_date
            reminder["due_time"] = next_time
            reminder["status"] = "pending"
            reminder["snoozed_until"] = None
            reminder["last_notified"] = None
        else:
            reminder["status"] = "completed"
            reminder["snoozed_until"] = None

        self._save()
        return {"reminder": reminder, "history": history_entry}

    def snooze_reminder(self, reminder_id, minutes: int):
        reminder = self.get_reminder(reminder_id)
        if not reminder:
            return None
        
        snooze_time = datetime.datetime.now() + timedelta(minutes=minutes)
        reminder["snoozed_until"] = snooze_time.isoformat()
        self._save()
        return reminder

    def get_history(self, limit=50):
        history = self.data.get("history", [])
        history.sort(key=lambda h: h.get("completed_at", ""), reverse=True)
        return history[:limit]

    def get_summary(self):
        now = datetime.datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        week_ahead_str = (now + timedelta(days=7)).strftime("%Y-%m-%d")
        current_month_str = now.strftime("%Y-%m")

        reminders = self.data.get("reminders", [])
        history = self.data.get("history", [])

        overdue = 0
        due_today = 0
        due_this_week = 0
        total_monthly_commitment = 0.0
        paid_this_month = 0.0

        for r in reminders:
            if r.get("status") == "completed":
                continue
            
            due_d = r.get("due_date", "")
            amt = float(r.get("amount", 0) or 0)
            
            if due_d < today_str:
                overdue += 1
            elif due_d == today_str:
                due_today += 1
                due_this_week += 1
            elif due_d <= week_ahead_str:
                due_this_week += 1

            if due_d.startswith(current_month_str):
                total_monthly_commitment += amt

        # Calculate paid this month from history
        for h in history:
            completed_at = h.get("completed_at", "")
            if completed_at.startswith(current_month_str):
                paid_this_month += float(h.get("amount", 0) or 0)

        return {
            "overdue_count": overdue,
            "due_today_count": due_today,
            "due_this_week_count": due_this_week,
            "total_monthly_commitment": total_monthly_commitment,
            "paid_this_month": paid_this_month,
            "total_active_reminders": len([r for r in reminders if r.get("status") != "completed"])
        }
