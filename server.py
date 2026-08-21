"""
Local Real-Time Reminder Server & Web API
Zero-dependency HTTP server that hosts the dashboard, handles mobile & desktop alert dispatching,
and runs the background notification scheduler.
"""

import os
import sys
import json
import socket
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
import logging

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import Database
from scheduler import ReminderScheduler
from notifier import send_windows_toast, send_mobile_notification, send_unified_notification, play_chime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ReminderServer")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

db = Database()
scheduler = ReminderScheduler(db, check_interval_seconds=20)


def get_local_ip_addresses():
    """Detects local IPv4 addresses of the host machine for mobile LAN access."""
    ips = set()
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    return sorted(list(ips)) or ["127.0.0.1"]


class ReminderAPIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def log_message(self, format, *args):
        logger.debug("%s - %s", self.address_string(), format % args)

    def _send_json(self, data, status_code=200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(response_bytes)

    def _read_body_json(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # API Routes
        if path == "/api/reminders":
            category = query.get("category", ["all"])[0]
            status = query.get("status", ["all"])[0]
            reminders = db.get_all_reminders(category=category, status=status)
            return self._send_json({"success": True, "reminders": reminders})

        elif path == "/api/categories":
            return self._send_json({"success": True, "categories": db.get_categories()})

        elif path == "/api/summary":
            summary = db.get_summary()
            return self._send_json({"success": True, "summary": summary})

        elif path == "/api/history":
            history = db.get_history(limit=50)
            return self._send_json({"success": True, "history": history})

        elif path == "/api/settings":
            return self._send_json({"success": True, "settings": db.get_settings()})

        elif path == "/api/network-info":
            local_ips = get_local_ip_addresses()
            port = self.server.server_port
            mobile_urls = [f"http://{ip}:{port}" for ip in local_ips]
            return self._send_json({
                "success": True,
                "local_ips": local_ips,
                "port": port,
                "mobile_urls": mobile_urls
            })

        elif path.startswith("/api/reminders/"):
            reminder_id = path.split("/")[-1]
            reminder = db.get_reminder(reminder_id)
            if reminder:
                return self._send_json({"success": True, "reminder": reminder})
            return self._send_json({"error": "Reminder not found"}, 404)

        # Serve static assets
        if path == "/" or path == "":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/reminders":
            data = self._read_body_json()
            if not data.get("title"):
                return self._send_json({"error": "Title is required"}, 400)
            new_r = db.add_reminder(data)
            return self._send_json({"success": True, "reminder": new_r}, 201)

        elif path.endswith("/done"):
            parts = path.strip("/").split("/")
            if len(parts) >= 3 and parts[0] == "api" and parts[1] == "reminders":
                reminder_id = parts[2]
                body = self._read_body_json()
                result = db.mark_as_done(reminder_id, notes=body.get("notes", ""))
                if result:
                    play_chime(sound_type="done")
                    return self._send_json({"success": True, **result})
                return self._send_json({"error": "Reminder not found"}, 404)

        elif path.endswith("/snooze"):
            parts = path.strip("/").split("/")
            if len(parts) >= 3 and parts[0] == "api" and parts[1] == "reminders":
                reminder_id = parts[2]
                body = self._read_body_json()
                minutes = int(body.get("minutes", 30))
                updated = db.snooze_reminder(reminder_id, minutes)
                if updated:
                    return self._send_json({"success": True, "reminder": updated})
                return self._send_json({"error": "Reminder not found"}, 404)

        elif path == "/api/settings":
            data = self._read_body_json()
            updated_settings = db.update_settings(data)
            return self._send_json({"success": True, "settings": updated_settings})

        elif path == "/api/test-notification":
            body = self._read_body_json()
            title = body.get("title", "⚡ Test Reminder Alert")
            message = body.get("message", "This is a real-time alert test on your PC. It works perfectly!")
            current_settings = db.get_settings()
            send_windows_toast(title, message, sound=True)
            return self._send_json({"success": True, "message": "Desktop notification dispatched!"})

        elif path == "/api/test-mobile-notification":
            body = self._read_body_json()
            current_settings = db.get_settings()
            
            # Allow testing with custom override fields passed from the settings dialog
            if "mobile_notifications" in body:
                current_settings["mobile_notifications"].update(body["mobile_notifications"])
            
            title = body.get("title", "⚡ Mobile Reminder Alert Test")
            message = body.get("message", "Your mobile phone is successfully linked with Life Reminder Assistant! You will receive timely alerts on this phone.")
            priority = body.get("priority", "high")
            
            res = send_mobile_notification(title, message, priority=priority, settings=current_settings)
            return self._send_json({
                "success": res.get("success", False),
                "result": res
            })

        return self._send_json({"error": "Not found"}, 404)

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/reminders/"):
            reminder_id = path.split("/")[-1]
            data = self._read_body_json()
            updated = db.update_reminder(reminder_id, data)
            if updated:
                return self._send_json({"success": True, "reminder": updated})
            return self._send_json({"error": "Reminder not found"}, 404)

        return self._send_json({"error": "Not found"}, 404)

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/reminders/"):
            reminder_id = path.split("/")[-1]
            if db.delete_reminder(reminder_id):
                return self._send_json({"success": True, "message": "Deleted successfully"})
            return self._send_json({"error": "Reminder not found"}, 404)

        return self._send_json({"error": "Not found"}, 404)


def run_server(port=8765, open_browser=True):
    os.makedirs(STATIC_DIR, exist_ok=True)
    scheduler.start()

    # Bind to 0.0.0.0 so both localhost and mobile devices on the same Wi-Fi can connect
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, ReminderAPIHandler)
    
    local_url = f"http://127.0.0.1:{port}"
    local_ips = get_local_ip_addresses()

    print("\n" + "=" * 68)
    print("🚀  LIFE REMINDER & TASK ASSISTANT (PRO) IS LIVE!")
    print(f"💻  PC Dashboard:        {local_url}")
    if local_ips and local_ips[0] != "127.0.0.1":
        for ip in local_ips:
            print(f"📱  Mobile Phone Access: http://{ip}:{port}")
    print("⏰  Background Real-Time Scheduler: Active (Windows + Mobile Push)")
    print("=" * 68 + "\n")

    if open_browser:
        try:
            webbrowser.open(local_url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Reminder Server...")
        scheduler.stop()
        httpd.server_close()


if __name__ == "__main__":
    port = 8765
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port=port)

