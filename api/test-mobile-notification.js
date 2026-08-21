/**
 * Vercel Serverless Function: Multi-Channel Mobile Notification Dispatcher
 * Supports Telegram, WhatsApp (CallMeBot), ntfy.sh, Pushover, and Discord
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { mobile_notifications, title, message, priority, reminder } = body;

    const config = mobile_notifications || {};
    if (config.enabled === false) {
      return res.status(200).json({ success: true, message: 'Mobile notifications are disabled in settings.' });
    }

    const provider = config.provider || 'ntfy';
    const alertTitle = title || '⚡ Life Reminder Alert';
    const alertMsg = message || 'You have an upcoming life commitment reminder.';

    // 1. Telegram Bot Dispatcher
    if (provider === 'telegram') {
      const botToken = (config.telegram_bot_token || '').trim();
      const chatId = (config.telegram_chat_id || '').trim();

      if (!botToken || !chatId) {
        return res.status(400).json({
          success: false,
          error: 'Telegram requires Bot API Token and Chat ID. Please check Phone Alerts settings.'
        });
      }

      let text = `<b>${alertTitle}</b>\n\n${alertMsg}`;
      if (reminder && reminder.link) {
        text += `\n\n🔗 <a href="${reminder.link}">Open Action Link</a>`;
      }

      const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const tgRes = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      });

      const tgData = await tgRes.json();
      if (tgData.ok) {
        return res.status(200).json({
          success: true,
          provider: 'telegram',
          result: { success: true, message: '✅ Telegram message delivered successfully to your chat!' }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Telegram API Error: ${tgData.description || 'Invalid token or chat ID'}`
        });
      }
    }

    // 2. WhatsApp (CallMeBot API) Dispatcher
    else if (provider === 'whatsapp') {
      const phone = (config.whatsapp_phone || '').trim().replace('+', '');
      const apiKey = (config.whatsapp_api_key || '').trim();

      if (!phone || !apiKey) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp requires Phone number (with country code, e.g. 919876543210) and CallMeBot API Key.'
        });
      }

      const waText = `*${alertTitle}*\n\n${alertMsg}`;
      const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(waText)}&apikey=${encodeURIComponent(apiKey)}`;

      const waRes = await fetch(waUrl, {
        headers: { 'User-Agent': 'LifeReminderAssistant/2.0' }
      });

      const waTextRes = await waRes.text();
      if (waRes.ok || waTextRes.includes('Message queued') || waTextRes.includes('OK')) {
        return res.status(200).json({
          success: true,
          provider: 'whatsapp',
          result: { success: true, message: '✅ WhatsApp message queued and sent successfully!' }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `CallMeBot Error: ${waTextRes.substring(0, 150) || 'Failed to send WhatsApp message. Verify your API key and phone number.'}`
        });
      }
    }

    // 3. ntfy.sh Dispatcher
    else if (provider === 'ntfy') {
      const topic = (config.ntfy_topic || '').trim();
      if (!topic) {
        return res.status(400).json({ success: false, error: 'ntfy topic is empty.' });
      }

      const ntfyUrl = `https://ntfy.sh/${encodeURIComponent(topic)}`;
      const headers = {
        'Title': alertTitle,
        'Priority': priority === 'high' ? '4' : '3',
        'Tags': 'bell,zap'
      };
      if (reminder && reminder.link) {
        headers['Click'] = reminder.link;
      }

      const ntfyRes = await fetch(ntfyUrl, {
        method: 'POST',
        headers: headers,
        body: alertMsg
      });

      if (ntfyRes.ok) {
        return res.status(200).json({
          success: true,
          provider: 'ntfy',
          result: { success: true, message: `✅ Push notification sent to ntfy topic: ${topic}` }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `ntfy error: HTTP ${ntfyRes.status}`
        });
      }
    }

    // 4. Discord Webhook Dispatcher
    else if (provider === 'discord') {
      const webhookUrl = (config.discord_webhook_url || '').trim();
      if (!webhookUrl) {
        return res.status(400).json({ success: false, error: 'Discord webhook URL is empty.' });
      }

      const discRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: alertTitle,
            description: alertMsg,
            color: 65280,
            footer: { text: 'Life Reminder Assistant PRO' }
          }]
        })
      });

      if (discRes.ok) {
        return res.status(200).json({
          success: true,
          provider: 'discord',
          result: { success: true, message: '✅ Discord webhook notification delivered!' }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Discord webhook error: HTTP ${discRes.status}`
        });
      }
    }

    // 5. Pushover Dispatcher
    else if (provider === 'pushover') {
      const userKey = (config.pushover_user_key || '').trim();
      const apiToken = (config.pushover_api_token || '').trim();

      if (!userKey || !apiToken) {
        return res.status(400).json({ success: false, error: 'Pushover User Key and App Token are required.' });
      }

      const poRes = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: apiToken,
          user: userKey,
          title: alertTitle,
          message: alertMsg,
          priority: priority === 'high' ? '1' : '0'
        })
      });

      const poData = await poRes.json();
      if (poData.status === 1) {
        return res.status(200).json({
          success: true,
          provider: 'pushover',
          result: { success: true, message: '✅ Pushover notification sent!' }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Pushover error: ${poData.errors ? poData.errors.join(', ') : 'Unknown'}`
        });
      }
    }

    return res.status(400).json({ success: false, error: `Unknown provider: ${provider}` });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
}
