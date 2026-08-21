# ⚡ Life Reminder & Task Assistant (PRO)

A personal, real-time reminder system and financial commitment manager built for Windows and **Mobile Phones (iOS & Android)**. Designed specifically to track and notify you about:

- 🏠 **Home Rent** (Monthly recurring, advance warning, landlord UPI/Bank notes)
- ⚡ **Current / Electricity Bills** (Due dates, consumer IDs, payment links)
- 💧 **Water Bills** (Utility schedule, amount tracking)
- 🛒 **Monthly Groceries** (Shopping dates, item checklist, budget)
- 📈 **Stock Market & SIP** (SIP auto-debits, morning market open alerts, equity targets)
- 📅 **Meetings & Appointments** (Specific times, meeting URLs, advance alarms)
- 🔔 **Custom Reminders** (Insurance, medicine, EMI, gym, subscriptions)

---

## 🌟 Key Features

1. **📱 Real-Time Mobile Phone Push Notifications (iOS & Android)**:
   - **Zero-Setup Push via ntfy.sh (Recommended)**: Install the free `ntfy` mobile app, subscribe to your private topic, and instantly get push alerts on your phone with custom sounds, priority tags, and emojis.
   - **Alternative Channels Supported**: Telegram Bot, WhatsApp (via CallMeBot), Pushover, and Discord Webhooks.
   - **Mobile Wi-Fi Access**: Open the full dashboard directly in your phone browser over home Wi-Fi (`http://<Your-IP>:8765`).
2. **Guaranteed Real-Time Windows Desktop Notifications**:
   - Dispatches native Windows 10/11 Toast notifications directly to your Windows Action Center with audible chimes.
   - Works in the background even if your browser tab is closed.
3. **Modern Glassmorphic Web Dashboard**:
   - Live clock and real-time countdown badges ("Due in 3 hours", "Overdue by 2 days", "Today at 09:00 AM").
   - Filter by categories or status (Pending, Snoozed, Completed).
   - Timeline / Calendar view.
4. **Monthly Financial Commitments & Budget Tracker**:
   - Calculates total upcoming monthly expenses (Rent + Bills + SIP + Groceries) vs amount paid so far.
5. **Smart Actions**:
   - **Mark as Paid / Done**: Automatically records into payment history and advances recurring reminders to the next month/cycle.
   - **Snooze**: Postpone reminders by 15 mins, 1 hour, 3 hours, or tomorrow morning.
6. **Zero External Dependencies**:
   - Built using Python's standard library. No complex pip installations required!

---

## 📱 How to Receive Notifications on Your Phone (1-Minute Setup)

1. Open the dashboard at `http://127.0.0.1:8765` and click **"📱 Phone Alerts"** in the top navigation.
2. **For Instant Push (ntfy.sh - Recommended)**:
   - Install the free **ntfy** app on your phone:
     - [Apple App Store (iOS)](https://apps.apple.com/app/ntfy/id1625396347)
     - [Google Play Store (Android)](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
   - In the ntfy app, tap **"+"** and enter the topic name displayed in your dashboard (e.g. `reminders_abc123`).
   - Click **"📲 Send Test Ping to Phone"** to verify your phone rings!
3. **For Telegram or WhatsApp**:
   - Select the respective tab in the Phone Alerts modal, enter your Bot Token / WhatsApp phone, and click **Save**.

---

## 🚀 How to Run

### Option 1: 1-Click Launch (Recommended)
Double-click [`start_reminders.bat`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/start_reminders.bat).
This will start the background reminder engine and automatically open your dashboard at `http://127.0.0.1:8765`.

### Option 2: Run via Terminal
```powershell
cd C:\Users\pb963\.gemini\antigravity\scratch\life-reminder-app
python server.py
```

### Option 3: Auto-Start on Windows Boot
Double-click [`setup_autostart.bat`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/setup_autostart.bat) once. This will configure the reminder background service to start automatically whenever your PC turns on.

---

## 📁 File Structure

- [`server.py`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/server.py) - HTTP server, mobile test endpoints & REST API
- [`scheduler.py`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/scheduler.py) - Continuous background scheduler dispatching alerts to PC and Phone
- [`notifier.py`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/notifier.py) - Multi-channel mobile push engine (ntfy, Telegram, WhatsApp, Pushover, Discord) & Windows native toast engine
- [`database.py`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/database.py) - Local database manager, recurrence engine & settings storage
- [`static/index.html`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/static/index.html) - Dashboard user interface with dedicated Mobile Sync modal
- [`static/styles.css`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/static/styles.css) - Modern dark/glassmorphic styling & mobile responsive layouts
- [`static/app.js`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/static/app.js) - Client-side state, phone sync wizard, audio chime, and live countdowns
- [`test_suite.py`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/test_suite.py) - Automated test suite for database, scheduler, and mobile push dispatchers
- [`start_reminders.bat`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/start_reminders.bat) - 1-Click Windows launcher
- [`setup_autostart.bat`](file:///C:/Users/pb963/.gemini/antigravity/scratch/life-reminder-app/setup_autostart.bat) - 1-Click Windows startup setup

