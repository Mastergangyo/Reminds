"""
Unified Notification Engine: Windows Native Desktop & Mobile Phone Push
Provides zero-dependency Windows desktop toast notifications, audio chimes,
and instant real-time Mobile Phone push notifications (ntfy.sh, Telegram, WhatsApp, Pushover, Discord).
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import subprocess
import threading
import logging

logger = logging.getLogger("Notifier")

def play_chime(sound_type="reminder"):
    """Plays an audible alert chime using Python winsound or system sound."""
    def _play():
        try:
            if sys.platform == "win32":
                import winsound
                if sound_type == "urgent":
                    winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                elif sound_type == "done":
                    winsound.MessageBeep(winsound.MB_ICONASTERISK)
                else:
                    # Double pleasant chime for regular reminder
                    winsound.Beep(880, 150)   # A5 note
                    winsound.Beep(1175, 250)  # D6 note
        except Exception as e:
            logger.debug(f"Audio playback error: {e}")

    threading.Thread(target=_play, daemon=True).start()


def send_windows_toast(title: str, message: str, sound=True):
    """
    Sends a native Windows 10/11 Desktop Toast notification using PowerShell.
    Works reliably without external pip dependencies.
    """
    if sound:
        play_chime()

    if sys.platform != "win32":
        logger.info(f"Desktop Notification [{title}]: {message}")
        return True

    # Escape quotes and backslashes for PowerShell
    safe_title = title.replace('`', '``').replace('"', '`"').replace('$', '`$')
    safe_msg = message.replace('`', '``').replace('"', '`"').replace('$', '`$')

    # PowerShell script using Windows.UI.Notifications WinRT Toast API with balloon tip fallback
    ps_script = f"""
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $toastXml = [xml] $template.GetXml()
    $nodes = $toastXml.GetElementsByTagName("text")
    $nodes.Item(0).AppendChild($toastXml.CreateTextNode("{safe_title}")) > $null
    $nodes.Item(1).AppendChild($toastXml.CreateTextNode("{safe_msg}")) > $null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($toastXml)
    $appId = "Life.Reminder.Assistant"
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
    """

    def _show_toast():
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                capture_output=True,
                timeout=8
            )
            if result.returncode != 0:
                _fallback_balloon_tip(safe_title, safe_msg)
        except Exception as ex:
            logger.warning(f"Toast delivery failed, using fallback: {ex}")
            _fallback_balloon_tip(safe_title, safe_msg)

    threading.Thread(target=_show_toast, daemon=True).start()
    return True


def _fallback_balloon_tip(title: str, message: str):
    """Fallback Windows notification using Windows Forms NotifyIcon."""
    ps_fallback = f"""
    Add-Type -AssemblyName System.Windows.Forms
    $global:balloon = New-Object System.Windows.Forms.NotifyIcon
    $path = (Get-Process -id $pid).Path
    $balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
    $balloon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
    $balloon.BalloonTipText = "{message}"
    $balloon.BalloonTipTitle = "{title}"
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(5000)
    Start-Sleep -Seconds 5
    $balloon.Dispose()
    """
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_fallback],
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            timeout=10
        )
    except Exception:
        pass


# ============================================================================
# Mobile Notification Dispatchers (ntfy, Telegram, WhatsApp, Pushover, Discord)
# ============================================================================

def get_category_tags(category: str, priority: str = "normal"):
    """Maps reminder category to ntfy emoji tags."""
    tags = []
    if priority == "high" or priority == "urgent":
        tags.append("rotating_light")
    elif priority == "overdue":
        tags.append("warning")

    cat_map = {
        "rent": "house,money_with_wings",
        "electricity": "zap,bulb",
        "water": "droplet,potable_water",
        "grocery": "shopping_cart,bread",
        "stocks": "chart_with_upwards_trend,chart",
        "meeting": "calendar,speech_balloon",
        "custom": "bell,alarm_clock"
    }
    tag_str = cat_map.get(category, "bell")
    tags.extend(tag_str.split(","))
    return ",".join(tags)


def send_ntfy_push(topic: str, title: str, message: str, priority: str = "default", reminder: dict = None) -> dict:
    """
    Sends an instant push notification to iOS / Android via ntfy.sh (Zero-configuration).
    """
    if not topic:
        return {"success": False, "error": "ntfy topic is empty"}

    url = f"https://ntfy.sh/{urllib.parse.quote(topic.strip())}"
    
    # Priority mapping: 1=min, 2=low, 3=default, 4=high, 5=urgent/max
    prio_map = {
        "urgent": "5",
        "high": "4",
        "medium": "3",
        "normal": "3",
        "default": "3",
        "low": "2"
    }
    prio_header = prio_map.get(priority.lower(), "3")
    
    cat = (reminder or {}).get("category", "custom")
    tags = get_category_tags(cat, priority)

    headers = {
        "Title": title.encode("utf-8"),
        "Priority": prio_header,
        "Tags": tags,
        "User-Agent": "LifeReminderAssistant/2.0"
    }

    if reminder and reminder.get("link"):
        link = reminder.get("link").strip()
        if link.startswith("http"):
            headers["Click"] = link
            headers["Actions"] = f"view, Open Portal, {link}"

    req = urllib.request.Request(url, data=message.encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                logger.info(f"📱 ntfy push delivered successfully to topic: {topic}")
                return {
                    "success": True,
                    "provider": "ntfy",
                    "topic": topic,
                    "message": f"Push notification delivered to ntfy topic: {topic}"
                }
            else:
                return {"success": False, "error": f"HTTP status {response.status}"}
    except Exception as e:
        logger.error(f"ntfy delivery failed: {e}")
        return {"success": False, "error": str(e)}


def send_telegram_message(bot_token: str, chat_id: str, title: str, message: str, reminder: dict = None) -> dict:
    """
    Sends a formatted message to Telegram Bot & Chat ID.
    """
    if not bot_token or not chat_id:
        return {"success": False, "error": "Telegram bot_token and chat_id are required"}

    url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
    
    # Format HTML message
    html_text = f"<b>{title}</b>\n\n{message}"
    if reminder and reminder.get("link"):
        html_text += f"\n\n🔗 <a href='{reminder['link']}'>Open Action Link</a>"

    payload = {
        "chat_id": chat_id.strip(),
        "text": html_text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            if res_json.get("ok"):
                logger.info("📱 Telegram notification delivered successfully")
                return {"success": True, "provider": "telegram", "message": "Telegram message sent successfully!"}
            else:
                return {"success": False, "error": res_json.get("description", "Unknown Telegram error")}
    except Exception as e:
        logger.error(f"Telegram delivery failed: {e}")
        return {"success": False, "error": str(e)}


def send_whatsapp_callmebot(phone: str, api_key: str, title: str, message: str) -> dict:
    """
    Sends a WhatsApp message via CallMeBot API.
    """
    if not phone or not api_key:
        return {"success": False, "error": "WhatsApp phone number and CallMeBot API key are required"}

    text = f"*{title}*\n\n{message}"
    query = urllib.parse.urlencode({
        "phone": phone.strip().replace("+", ""),
        "text": text,
        "apikey": api_key.strip()
    })
    url = f"https://api.callmebot.com/whatsapp.php?{query}"

    req = urllib.request.Request(url, headers={"User-Agent": "LifeReminderAssistant/2.0"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_text = response.read().decode("utf-8", errors="ignore")
            if "Message queued" in res_text or "OK" in res_text or response.status == 200:
                logger.info("📱 WhatsApp message queued successfully via CallMeBot")
                return {"success": True, "provider": "whatsapp", "message": "WhatsApp message queued!"}
            else:
                return {"success": False, "error": res_text[:120]}
    except Exception as e:
        logger.error(f"WhatsApp delivery failed: {e}")
        return {"success": False, "error": str(e)}


def send_pushover_alert(user_key: str, api_token: str, title: str, message: str, priority: str = "normal") -> dict:
    """
    Sends a Pushover push notification.
    """
    if not user_key or not api_token:
        return {"success": False, "error": "Pushover user_key and api_token are required"}

    prio_val = 1 if priority in ["high", "urgent"] else 0
    payload = urllib.parse.urlencode({
        "token": api_token.strip(),
        "user": user_key.strip(),
        "title": title,
        "message": message,
        "priority": prio_val
    }).encode("utf-8")

    req = urllib.request.Request("https://api.pushover.net/1/messages.json", data=payload, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                return {"success": True, "provider": "pushover", "message": "Pushover alert delivered!"}
            return {"success": False, "error": f"HTTP status {response.status}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_discord_webhook(webhook_url: str, title: str, message: str) -> dict:
    """
    Sends a rich Discord notification message to a webhook channel.
    """
    if not webhook_url:
        return {"success": False, "error": "Discord webhook URL is required"}

    payload = {
        "embeds": [{
            "title": title,
            "description": message,
            "color": 65280 if "DUE" in title else (16711680 if "OVERDUE" in title else 65535),
            "footer": {"text": "Life Reminder Assistant Pro"}
        }]
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(webhook_url.strip(), data=data, headers={"Content-Type": "application/json", "User-Agent": "LifeReminderAssistant/2.0"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status in [200, 204]:
                return {"success": True, "provider": "discord", "message": "Discord webhook message delivered!"}
            return {"success": False, "error": f"HTTP status {response.status}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_mobile_notification(title: str, message: str, priority: str = "normal", reminder: dict = None, settings: dict = None) -> dict:
    """
    Routes and sends a mobile notification based on active settings.
    """
    if not settings:
        settings = {}
    
    mobile_cfg = settings.get("mobile_notifications", {})
    if not mobile_cfg.get("enabled", True):
        return {"success": False, "message": "Mobile notifications are disabled"}

    provider = mobile_cfg.get("provider", "ntfy").lower()

    if provider == "ntfy":
        topic = mobile_cfg.get("ntfy_topic", "")
        return send_ntfy_push(topic, title, message, priority, reminder)
    elif provider == "telegram":
        token = mobile_cfg.get("telegram_bot_token", "")
        chat_id = mobile_cfg.get("telegram_chat_id", "")
        return send_telegram_message(token, chat_id, title, message, reminder)
    elif provider == "whatsapp":
        phone = mobile_cfg.get("whatsapp_phone", "")
        apikey = mobile_cfg.get("whatsapp_api_key", "")
        return send_whatsapp_callmebot(phone, apikey, title, message)
    elif provider == "pushover":
        user_key = mobile_cfg.get("pushover_user_key", "")
        token = mobile_cfg.get("pushover_api_token", "")
        return send_pushover_alert(user_key, token, title, message, priority)
    elif provider == "discord":
        webhook_url = mobile_cfg.get("discord_webhook_url", "")
        return send_discord_webhook(webhook_url, title, message)
    else:
        # Default fallback to ntfy
        topic = mobile_cfg.get("ntfy_topic", "")
        return send_ntfy_push(topic, title, message, priority, reminder)


def send_unified_notification(title: str, message: str, priority: str = "normal", reminder: dict = None, sound=True, settings: dict = None):
    """
    Dispatches both Windows Desktop Toast and Mobile Phone Notification concurrently in background threads.
    """
    if not settings:
        settings = {}

    toast_enabled = settings.get("toast_enabled", True)
    sound_enabled = settings.get("sound_enabled", True) if sound else False

    # 1. Desktop Notification
    if toast_enabled:
        send_windows_toast(title, message, sound=sound_enabled)
    elif sound_enabled:
        play_chime("urgent" if priority in ["high", "urgent"] else "reminder")

    # 2. Mobile Notification
    mobile_cfg = settings.get("mobile_notifications", {})
    if mobile_cfg.get("enabled", True):
        def _send_mobile_async():
            try:
                res = send_mobile_notification(title, message, priority=priority, reminder=reminder, settings=settings)
                logger.info(f"Mobile dispatch result: {res}")
            except Exception as ex:
                logger.error(f"Mobile notification background dispatch error: {ex}")

        threading.Thread(target=_send_mobile_async, daemon=True).start()

    return True


if __name__ == "__main__":
    print("Testing Notification Engine...")
    print("1. Testing Windows Toast...")
    send_windows_toast("⚡ Test Title", "Test Message")
    print("2. Testing ntfy push dispatch to 'test-reminders-topic'...")
    res = send_ntfy_push("test-reminders-topic-12345", "⚡ Electricity Bill Due!", "Current bill of ₹2,450 is due tomorrow.", priority="high")
    print("Result:", res)

