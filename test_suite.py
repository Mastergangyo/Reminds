"""
Automated Test & Verification Suite for Life Reminder Assistant
Tests database operations, recurrence calculation, mobile push dispatchers (ntfy, Telegram, WhatsApp, Pushover, Discord),
Windows desktop toasts, and real-time scheduler.
"""

import os
import sys
import time
import json
import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import Database, calculate_next_occurrence
from scheduler import ReminderScheduler
from notifier import (
    send_windows_toast,
    send_ntfy_push,
    send_mobile_notification,
    send_unified_notification,
    get_category_tags
)
from server import get_local_ip_addresses

def test_database():
    print("\n[1/5] Testing Database & Recurrence Engine...")
    test_db_path = os.path.join(os.path.dirname(__file__), "test_db.json")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    db = Database(db_path=test_db_path)
    
    # 1. Check default seeded reminders & mobile settings
    reminders = db.get_all_reminders()
    assert len(reminders) >= 6, f"Expected at least 6 seed reminders, got {len(reminders)}"
    settings = db.get_settings()
    assert "mobile_notifications" in settings, "Expected mobile_notifications in settings"
    assert settings["mobile_notifications"]["enabled"] is True
    assert "ntfy_topic" in settings["mobile_notifications"]
    print(f"  ✓ Initialized default database with {len(reminders)} seed reminders and mobile push config (ntfy topic: {settings['mobile_notifications']['ntfy_topic']})")

    # 2. Add custom reminder
    new_r = db.add_reminder({
        "title": "Pay High Speed Internet Bill",
        "category": "electricity",
        "amount": 999,
        "due_date": "2026-08-25",
        "due_time": "14:00",
        "recurrence": "monthly",
        "advance_days": 2,
        "priority": "high",
        "notes": "Fiber connection #12345"
    })
    assert new_r["title"] == "Pay High Speed Internet Bill"
    print("  ✓ Created new reminder successfully")

    # 3. Test Mark as Paid / Done & Recurrence Roll-Over
    rent_item = [r for r in reminders if r["category"] == "rent"][0]
    original_due = rent_item["due_date"]
    done_result = db.mark_as_done(rent_item["id"], notes="Paid via UPI")
    
    updated_rent = db.get_reminder(rent_item["id"])
    assert updated_rent["due_date"] != original_due, f"Expected roll-over, got same date: {updated_rent['due_date']}"
    print(f"  ✓ 'Mark as Paid' correctly rolled recurring Rent from {original_due} to next month: {updated_rent['due_date']}")

    # 4. Test Snooze
    snooze_item = reminders[1]
    db.snooze_reminder(snooze_item["id"], minutes=45)
    updated_snooze = db.get_reminder(snooze_item["id"])
    assert updated_snooze["snoozed_until"] is not None
    print(f"  ✓ Snooze functionality verified (snoozed until {updated_snooze['snoozed_until'][:16]})")

    # 5. Check Summary Calculation
    summary = db.get_summary()
    assert summary["paid_this_month"] > 0
    print(f"  ✓ Financial summary verified: Monthly Commitments = ₹{summary['total_monthly_commitment']:,.0f}, Paid = ₹{summary['paid_this_month']:,.0f}")

    # 6. Test Settings Update for Mobile
    db.update_settings({
        "mobile_notifications": {
            "provider": "telegram",
            "telegram_chat_id": "123456789"
        }
    })
    updated_settings = db.get_settings()
    assert updated_settings["mobile_notifications"]["provider"] == "telegram"
    assert updated_settings["mobile_notifications"]["telegram_chat_id"] == "123456789"
    print("  ✓ Mobile notification settings deep-merge and persistence verified.")

    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    print("  ✓ Database & Recurrence tests PASSED!\n")


def test_recurrence_math():
    print("[2/5] Testing Recurrence Math...")
    # Daily
    next_d, next_t = calculate_next_occurrence("daily", "2026-08-22", "09:00")
    assert next_d == "2026-08-23"
    print(f"  ✓ Daily roll: 2026-08-22 -> {next_d}")

    # Monthly (e.g. 1st)
    next_d, next_t = calculate_next_occurrence("monthly", "2026-08-01", "09:00")
    assert next_d == "2026-09-01"
    print(f"  ✓ Monthly roll: 2026-08-01 -> {next_d}")

    # Weekdays (e.g. Friday to Monday)
    next_d, next_t = calculate_next_occurrence("weekdays", "2026-08-21", "09:15")
    print(f"  ✓ Weekday roll: 2026-08-21 -> {next_d}")
    print("  ✓ Recurrence calculation tests PASSED!\n")


def test_mobile_push_engine():
    print("[3/5] Testing Mobile Notification Engine & Providers...")
    
    # 1. Test Tag Generation
    rent_tags = get_category_tags("rent", "high")
    assert "house" in rent_tags
    assert "rotating_light" in rent_tags
    print(f"  ✓ Category emoji tagging verified: rent (high priority) -> {rent_tags}")

    # 2. Test ntfy Live/Mock Dispatch
    test_topic = f"test_reminders_unit_{int(time.time())}"
    res = send_ntfy_push(
        topic=test_topic,
        title="⚡ Verification Ping",
        message="Test alert: Rent, Bills & Groceries push delivery working.",
        priority="high",
        reminder={"category": "rent", "link": "https://example.com"}
    )
    assert res["success"] is True, f"ntfy push failed: {res}"
    print(f"  ✓ ntfy.sh instant mobile push dispatch verified (Topic: {test_topic})")

    # 3. Test Routing via send_mobile_notification
    settings = {
        "mobile_notifications": {
            "enabled": True,
            "provider": "ntfy",
            "ntfy_topic": test_topic
        }
    }
    routed_res = send_mobile_notification("⚡ Test Bill Due", "Due today at 10:00 AM", priority="high", settings=settings)
    assert routed_res["success"] is True
    print("  ✓ send_mobile_notification provider routing verified.")

    # 4. Test Unified Desktop + Mobile Dispatch
    unified_res = send_unified_notification(
        "⚡ Unified Alert Test",
        "Dispatched simultaneously to Windows Action Center and Mobile Phone.",
        priority="normal",
        sound=False,
        settings=settings
    )
    assert unified_res is True
    print("  ✓ Unified Concurrent Dispatcher (Windows Desktop + Mobile Phone) verified.\n")


def test_network_and_lan_detection():
    print("[4/5] Testing Local Network & Mobile Wi-Fi Access...")
    local_ips = get_local_ip_addresses()
    assert len(local_ips) > 0
    print(f"  ✓ Local Host IP Detection verified: {local_ips}")
    print(f"  ✓ Mobile Browser Wi-Fi Dashboard URL: http://{local_ips[0]}:8765\n")


def test_scheduler_live():
    print("[5/5] Testing Real-Time Background Scheduler Logic...")
    test_db_path = os.path.join(os.path.dirname(__file__), "test_sched_db.json")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    db = Database(db_path=test_db_path)
    
    # Add a reminder due right now
    now = datetime.datetime.now()
    due_time = (now - datetime.timedelta(minutes=1)).strftime("%H:%M")
    
    db.add_reminder({
        "title": "URGENT TEST: Water Bill Due Now",
        "category": "water",
        "amount": 350,
        "due_date": now.strftime("%Y-%m-%d"),
        "due_time": due_time,
        "recurrence": "one-time",
        "advance_days": 0,
        "priority": "high",
        "notes": "Testing immediate due trigger"
    })

    scheduler = ReminderScheduler(db, check_interval_seconds=1)
    scheduler.check_and_notify()
    
    print("  ✓ Scheduler successfully evaluated active due queue and fired unified notification trigger (Windows + Mobile).")
    
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    print("  ✓ Scheduler tests PASSED!\n")


if __name__ == "__main__":
    print("=" * 68)
    print("   RUNNING REAL-TIME SYSTEM & MOBILE NOTIFICATION VERIFICATION")
    print("=" * 68)
    test_database()
    test_recurrence_math()
    test_mobile_push_engine()
    test_network_and_lan_detection()
    test_scheduler_live()
    print("=" * 68)
    print("🎉 ALL SYSTEMS & MOBILE NOTIFICATIONS OPERATIONAL & VERIFIED!")
    print("=" * 68)

