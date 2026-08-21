/**
 * Life Reminder & Assistant - Universal Frontend Application Logic
 * Supports both Backend REST API Mode and Direct Browser LocalStorage Mode!
 */

// Application State
let reminders = [];
let historyRecords = [];
let categories = [];
let settings = {
  currency: '₹',
  sound_enabled: true,
  toast_enabled: true,
  mobile_notifications: {
    enabled: true,
    provider: 'ntfy',
    ntfy_topic: 'reminders_' + Math.random().toString(36).substring(2, 9),
    telegram_bot_token: '',
    telegram_chat_id: '',
    whatsapp_phone: '',
    whatsapp_api_key: '',
    pushover_user_key: '',
    pushover_api_token: '',
    discord_webhook_url: ''
  }
};
let activeTab = 'reminders';
let currentSnoozeTargetId = null;
let isBackendConnected = false;

// Category Metadata Mapping
const categoryMeta = {
  rent: { name: 'Home Rent', icon: '🏠', color: '#10b981' },
  electricity: { name: 'Current / Power', icon: '⚡', color: '#f59e0b' },
  water: { name: 'Water Bill', icon: '💧', color: '#06b6d4' },
  grocery: { name: 'Monthly Grocery', icon: '🛒', color: '#8b5cf6' },
  stocks: { name: 'Stock Market & SIP', icon: '📈', color: '#ec4899' },
  meeting: { name: 'Meeting & Events', icon: '📅', color: '#3b82f6' },
  custom: { name: 'Other Task', icon: '🔔', color: '#64748b' }
};

// Default Initial Seed Data (matching user's exact requirements)
function getDefaultData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Format dates: Rent on 1st, Grocery on 2nd, SIP on 5th, Electricity on 10th, Water on 15th
  const rentDate = new Date(year, month, 1);
  if (rentDate < now) rentDate.setMonth(month + 1);

  const groceryDate = new Date(year, month, 2);
  if (groceryDate < now) groceryDate.setMonth(month + 1);

  const sipDate = new Date(year, month, 5);
  if (sipDate < now) sipDate.setMonth(month + 1);

  const elecDate = new Date(year, month, 10);
  if (elecDate < now) elecDate.setMonth(month + 1);

  const waterDate = new Date(year, month, 15);
  if (waterDate < now) waterDate.setMonth(month + 1);

  const todayStr = now.toISOString().split('T')[0];
  const nextMeetingDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const formatDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    settings: {
      currency: '₹',
      sound_enabled: true,
      toast_enabled: true,
      mobile_notifications: {
        enabled: true,
        provider: 'ntfy',
        ntfy_topic: 'reminders_' + Math.random().toString(36).substring(2, 9),
        telegram_bot_token: '',
        telegram_chat_id: '',
        whatsapp_phone: '',
        whatsapp_api_key: '',
        pushover_user_key: '',
        pushover_api_token: '',
        discord_webhook_url: ''
      }
    },
    reminders: [
      {
        id: 'seed-rent-01',
        title: 'Pay Home Rent',
        category: 'rent',
        amount: 15000,
        due_date: formatDateStr(rentDate),
        due_time: '09:00',
        recurrence: 'monthly',
        advance_days: 2,
        priority: 'high',
        notes: 'Transfer to Landlord UPI / Bank. Verify electricity reading if included.',
        link: '',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-elec-02',
        title: 'Pay Current / Electricity Bill',
        category: 'electricity',
        amount: 2450,
        due_date: formatDateStr(elecDate),
        due_time: '10:30',
        recurrence: 'monthly',
        advance_days: 3,
        priority: 'high',
        notes: 'Consumer No: 9876543210. Check state electricity board portal.',
        link: 'https://www.electricity.gov.in',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-water-03',
        title: 'Pay Water Utility Bill',
        category: 'water',
        amount: 420,
        due_date: formatDateStr(waterDate),
        due_time: '11:00',
        recurrence: 'monthly',
        advance_days: 2,
        priority: 'medium',
        notes: 'Municipal water authority account WA-4412',
        link: '',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-groc-04',
        title: 'Monthly Grocery Stockup & Essentials',
        category: 'grocery',
        amount: 8000,
        due_date: formatDateStr(groceryDate),
        due_time: '16:00',
        recurrence: 'monthly',
        advance_days: 1,
        priority: 'medium',
        notes: 'Pantry checklist: Atta, Rice, Oil, Spices, Dairy, Cleaning supplies, Snacks.',
        link: '',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-sip-05',
        title: 'Stock Market Monthly SIP & Investment',
        category: 'stocks',
        amount: 10000,
        due_date: formatDateStr(sipDate),
        due_time: '09:30',
        recurrence: 'monthly',
        advance_days: 1,
        priority: 'high',
        notes: 'Index Fund SIP + Direct stock investment allocation. Verify bank balance.',
        link: '',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-stock-open-06',
        title: 'Stock Market Opening Review',
        category: 'stocks',
        amount: 0,
        due_date: todayStr,
        due_time: '09:15',
        recurrence: 'weekdays',
        advance_days: 0,
        priority: 'normal',
        notes: 'Check pre-market trends, global cues, and portfolio watchlist.',
        link: '',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-meet-07',
        title: 'Weekly Planning & Project Review Meeting',
        category: 'meeting',
        amount: 0,
        due_date: nextMeetingDate,
        due_time: '11:00',
        recurrence: 'weekly',
        advance_days: 0,
        priority: 'high',
        notes: 'Review monthly deliverables, roadmap, and pending action items.',
        link: 'https://meet.google.com',
        status: 'pending',
        snoozed_until: null,
        created_at: new Date().toISOString()
      }
    ],
    history: []
  };
}

// Web Audio API Chime Synthesizer
class SoundChime {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMelody(notes = [523.25, 659.25, 783.99, 1046.50]) {
    if (!settings.sound_enabled) return;
    this.init();
    if (!this.ctx) return;

    let time = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.12);

      gain.gain.setValueAtTime(0, time + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, time + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time + idx * 0.12);
      osc.stop(time + idx * 0.12 + 0.4);
    });
  }

  playDoneSound() {
    if (!settings.sound_enabled) return;
    this.playMelody([587.33, 880.00]);
  }
}

const audioChime = new SoundChime();

// Live Clock
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  
  const clockTime = document.getElementById('liveClockTime');
  const clockDate = document.getElementById('liveClockDate');
  if (clockTime) clockTime.textContent = timeStr;
  if (clockDate) clockDate.textContent = dateStr;
}

// In-App Toast Notification
function showToast(title, message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  if (isError) toast.style.borderLeftColor = '#f43f5e';

  toast.innerHTML = `
    <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 2px;">${title}</div>
    <div style="font-size: 0.78rem; color: #9ca3af;">${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// LocalStorage Persistence Helpers
function loadLocalDB() {
  const raw = localStorage.getItem('life_reminders_db');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing local storage:', e);
    }
  }
  const defaultData = getDefaultData();
  saveLocalDB(defaultData);
  return defaultData;
}

function saveLocalDB(data) {
  localStorage.setItem('life_reminders_db', JSON.stringify(data));
}

// Recurrence Math
function computeNextDate(recurrence, currentDateStr, currentTimeStr) {
  const [year, month, day] = currentDateStr.split('-').map(Number);
  let d = new Date(year, month - 1, day);
  const now = new Date();

  if (recurrence === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (recurrence === 'weekdays') {
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) { // 0=Sun, 6=Sat
      d.setDate(d.getDate() + 1);
    }
  } else if (recurrence === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (recurrence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (recurrence === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else if (recurrence === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    return { date: currentDateStr, time: currentTimeStr };
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return { date: `${y}-${m}-${dayStr}`, time: currentTimeStr };
}

// Load All Data (Dual Mode: Server API or LocalStorage)
async function loadData() {
  let dbData = null;

  try {
    const res = await fetch('/api/reminders', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.reminders) {
        isBackendConnected = true;
        reminders = data.reminders;
        const setRes = await fetch('/api/settings').then(r => r.json());
        if (setRes && setRes.settings) settings = setRes.settings;
        const histRes = await fetch('/api/history').then(r => r.json());
        if (histRes && histRes.history) historyRecords = histRes.history;
      }
    }
  } catch (e) {
    isBackendConnected = false;
  }

  if (!isBackendConnected) {
    dbData = loadLocalDB();
    reminders = dbData.reminders || [];
    historyRecords = dbData.history || [];
    settings = dbData.settings || settings;
  }

  // Update Currency Symbols & Inputs
  document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = settings.currency || '₹');
  const currInput = document.getElementById('settingCurrency');
  if (currInput) currInput.value = settings.currency || '₹';
  const soundInput = document.getElementById('settingSound');
  if (soundInput) soundInput.checked = settings.sound_enabled;
  const toastInput = document.getElementById('settingToast');
  if (toastInput) toastInput.checked = settings.toast_enabled;

  renderReminders();
  renderTimeline();
  computeAndRenderSummary();
  if (activeTab === 'history') loadHistory();

  // Update mobile status UI
  updateMobileUI();

  // Run in-browser real-time due checker
  checkRealTimeDueReminders();
}

let activeCategoryFilter = 'all';

// Summary & Category Counts Calculation
function computeAndRenderSummary() {
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const curr = settings.currency || '₹';
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let overdue = 0;
  let dueToday = 0;
  let dueThisWeek = 0;
  let totalMonthlyCommitment = 0;
  let paidThisMonth = 0;

  const catCounts = {
    all: 0,
    rent: 0,
    electricity: 0,
    water: 0,
    grocery: 0,
    stocks: 0,
    meeting: 0,
    custom: 0
  };

  reminders.forEach(r => {
    if (r.status !== 'completed') {
      catCounts.all++;
      if (catCounts[r.category] !== undefined) {
        catCounts[r.category]++;
      } else {
        catCounts.custom++;
      }

      const [year, month, day] = r.due_date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));
      const amt = parseFloat(r.amount) || 0;

      if (diffDays < 0) overdue++;
      else if (diffDays === 0) {
        dueToday++;
        dueThisWeek++;
      } else if (diffDays <= 7) {
        dueThisWeek++;
      }

      if (r.due_date.startsWith(currentMonthStr)) {
        totalMonthlyCommitment += amt;
      }
    }
  });

  // Update Category Counts in Category Tabs
  const countMapping = {
    all: 'countCatAll',
    rent: 'countCatRent',
    electricity: 'countCatElectricity',
    water: 'countCatWater',
    grocery: 'countCatGrocery',
    stocks: 'countCatStocks',
    meeting: 'countCatMeeting',
    custom: 'countCatCustom'
  };

  Object.entries(countMapping).forEach(([cat, elId]) => {
    const el = document.getElementById(elId);
    if (el) el.textContent = catCounts[cat] || 0;
  });

  historyRecords.forEach(h => {
    if (h.completed_at && h.completed_at.startsWith(currentMonthStr)) {
      paidThisMonth += parseFloat(h.amount) || 0;
    }
  });

  const statOverdue = document.getElementById('statOverdue');
  const statToday = document.getElementById('statToday');
  const statWeek = document.getElementById('statWeek');
  const statCommitment = document.getElementById('statCommitment');
  const statPaidProgress = document.getElementById('statPaidProgress');
  const statPaidText = document.getElementById('statPaidText');

  if (statOverdue) statOverdue.textContent = overdue;
  if (statToday) statToday.textContent = dueToday;
  if (statWeek) statWeek.textContent = dueThisWeek;

  if (statCommitment) {
    statCommitment.textContent = `${curr}${totalMonthlyCommitment.toLocaleString()}`;
  }
  if (statPaidText) {
    statPaidText.textContent = `Paid: ${curr}${paidThisMonth.toLocaleString()}`;
  }
  if (statPaidProgress) {
    const pct = totalMonthlyCommitment > 0 ? Math.min(100, Math.round((paidThisMonth / totalMonthlyCommitment) * 100)) : (paidThisMonth > 0 ? 100 : 0);
    statPaidProgress.style.width = `${pct}%`;
  }
}

// Calculate Due / Countdown Badge
function getDueStatus(dueDateStr, dueTimeStr, snoozedUntilStr) {
  const now = new Date();

  // Check Snooze
  if (snoozedUntilStr) {
    const snoozeDate = new Date(snoozedUntilStr);
    if (snoozeDate > now) {
      const diffMins = Math.round((snoozeDate - now) / (1000 * 60));
      return {
        type: 'snoozed',
        text: `Snoozed (${diffMins}m left)`,
        cardClass: 'is-snoozed'
      };
    }
  }

  const [year, month, day] = dueDateStr.split('-').map(Number);
  const [hours, minutes] = (dueTimeStr || '09:00').split(':').map(Number);

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      type: 'overdue',
      text: `⚠️ Overdue ${daysOverdue}d ago`,
      cardClass: 'is-overdue'
    };
  } else if (diffDays === 0) {
    return {
      type: 'today',
      text: `⏰ Due Today at ${dueTimeStr}`,
      cardClass: 'is-today'
    };
  } else if (diffDays === 1) {
    return {
      type: 'upcoming',
      text: `Due Tomorrow`,
      cardClass: ''
    };
  } else {
    return {
      type: 'upcoming',
      text: `In ${diffDays} days (${targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
      cardClass: ''
    };
  }
}

// In-Browser Real-Time Reminder Alert Checker
const notifiedToday = new Set();
function checkRealTimeDueReminders() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  reminders.filter(r => r.status !== 'completed').forEach(r => {
    const isDueToday = r.due_date === todayStr;
    const isTimeReached = currentTimeStr >= (r.due_time || '09:00');
    const key = `${r.id}-${todayStr}`;

    if (isDueToday && isTimeReached && !notifiedToday.has(key)) {
      notifiedToday.add(key);
      audioChime.playMelody();
      showToast(`⏰ DUE NOW: ${r.title}`, `Reminder is due! ${r.notes || ''}`);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⏰ DUE NOW: ${r.title}`, {
          body: `Due at ${r.due_time}. ${r.amount ? `Amount: ${settings.currency}${r.amount}` : ''}\n${r.notes || ''}`,
          icon: 'favicon.svg'
        });
      }
    }
  });
}

// Confetti Celebration Engine
function triggerConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#38bdf8', '#fbbf24'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 300,
      y: canvas.height * 0.75,
      vx: (Math.random() - 0.5) * 16,
      vy: -(Math.random() * 14 + 10),
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: Math.random() * 0.018 + 0.012
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // gravity
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        active = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (active) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

// Render Reminders Grid
function renderReminders() {
  const container = document.getElementById('remindersGrid');
  const emptyState = document.getElementById('emptyState');
  if (!container) return;

  const searchQuery = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';

  const filtered = reminders.filter(r => {
    if (activeCategoryFilter !== 'all' && r.category !== activeCategoryFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const matchTitle = r.title.toLowerCase().includes(searchQuery);
      const matchNotes = (r.notes || '').toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchNotes) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(r => {
    const meta = categoryMeta[r.category] || categoryMeta.custom;
    const dueStatus = getDueStatus(r.due_date, r.due_time, r.snoozed_until);
    const curr = settings.currency || '₹';
    const hasAmount = r.amount && r.amount > 0;

    const advanceText = r.advance_days > 0 ? `⏰ Warns ${r.advance_days}d before` : '';
    const recurrenceText = r.recurrence !== 'one-time' ? `🔁 Repeats ${r.recurrence}` : '⚡ One-time';

    const formattedAmount = hasAmount ? `${curr}${Number(r.amount).toLocaleString('en-IN')}` : '';

    return `
      <div class="reminder-card ${dueStatus.cardClass}" id="card-${r.id}" style="border-top: 3px solid ${meta.color}; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 24px ${meta.color}15;">
        <div class="card-top">
          <span class="card-category-badge" style="background: ${meta.color}20; color: ${meta.color}; border: 1px solid ${meta.color}50;">
            ${meta.icon} ${meta.name}
          </span>
          <span class="countdown-badge ${dueStatus.type}">
            ${dueStatus.text}
          </span>
        </div>

        <div class="card-title">${escapeHtml(r.title)}</div>

        ${hasAmount ? `<div class="card-amount-tag" style="color: #34d399;">${formattedAmount}</div>` : ''}

        <div class="card-metadata">
          <div class="meta-row">
            <span class="meta-icon">📅</span>
            <span>Due: <strong>${formatDate(r.due_date)}</strong> at <strong>${r.due_time || '09:00'}</strong></span>
          </div>
          <div class="meta-row">
            <span class="meta-icon">⚙️</span>
            <span>${recurrenceText} ${advanceText ? `· ${advanceText}` : ''}</span>
          </div>
        </div>

        ${r.notes ? `<div class="card-notes" style="border-left-color: ${meta.color};">${escapeHtml(r.notes)}</div>` : ''}

        ${r.link ? `
          <a href="${escapeHtml(r.link)}" target="_blank" rel="noopener" class="card-link-btn">
            🔗 Open Link / Portal ↗
          </a>
        ` : ''}

        <div class="card-actions">
          <div class="action-btn-group-left">
            <button class="btn-action btn-done" onclick="markAsDone('${r.id}')" title="Mark as Completed or Paid">
              ✓ Mark Paid / Done
            </button>
            <button class="btn-action btn-snooze-action" onclick="openSnoozeModal('${r.id}')" title="Snooze Reminder">
              ⏰ Snooze
            </button>
          </div>
          <div class="action-btn-group-right">
            <button class="btn-icon" onclick="editReminder('${r.id}')" title="Edit">✏️</button>
            <button class="btn-icon btn-icon-danger" onclick="deleteReminder('${r.id}')" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Timeline View
function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const groups = {
    overdue: { title: '🚨 Overdue Items', items: [] },
    today: { title: '⏰ Due Today', items: [] },
    thisWeek: { title: '📅 Due This Week', items: [] },
    later: { title: '⏳ Upcoming Later', items: [] }
  };

  reminders.filter(r => r.status !== 'completed').forEach(r => {
    const [year, month, day] = r.due_date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) groups.overdue.items.push(r);
    else if (diffDays === 0) groups.today.items.push(r);
    else if (diffDays <= 7) groups.thisWeek.items.push(r);
    else groups.later.items.push(r);
  });

  const curr = settings.currency || '₹';
  let html = '';

  Object.values(groups).forEach(g => {
    if (g.items.length === 0) return;
    html += `
      <div class="timeline-group">
        <div class="timeline-group-title">
          <span>${g.title}</span>
          <span style="font-size: 0.78rem; color: var(--text-secondary); background: rgba(255, 255, 255, 0.08); padding: 2px 8px; border-radius: var(--radius-full);">${g.items.length} items</span>
        </div>
        <div class="timeline-list">
          ${g.items.map(r => {
            const meta = categoryMeta[r.category] || categoryMeta.custom;
            return `
              <div class="timeline-item">
                <div class="timeline-item-left">
                  <div class="timeline-item-icon" style="background: ${meta.color}25; color: ${meta.color}; border: 1px solid ${meta.color}40;">
                    ${meta.icon}
                  </div>
                  <div>
                    <div class="timeline-item-title">${escapeHtml(r.title)}</div>
                    <div class="timeline-item-meta">📅 ${formatDate(r.due_date)} at ${r.due_time || '09:00'} · <span style="color: ${meta.color}; font-weight: 600;">${meta.name}</span></div>
                  </div>
                </div>
                <div class="timeline-item-right">
                  ${r.amount > 0 ? `<div class="timeline-item-amount">${curr}${Number(r.amount).toLocaleString('en-IN')}</div>` : ''}
                  <button class="btn btn-sm btn-done" onclick="markAsDone('${r.id}')">✓ Done</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<div class="empty-state"><p>No timeline events available.</p></div>';
}

// Render History Records
function renderHistory() {
  const tbody = document.getElementById('historyTableBody');
  const countEl = document.getElementById('historyCount');
  if (!tbody) return;

  const history = historyRecords || [];
  if (countEl) countEl.textContent = `${history.length} records`;

  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No completed payments or tasks yet.</td></tr>`;
    return;
  }

  const curr = settings.currency || '₹';
  tbody.innerHTML = history.map(h => {
    const meta = categoryMeta[h.category] || categoryMeta.custom;
    const completedDate = new Date(h.completed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    return `
      <tr>
        <td><strong>${escapeHtml(h.title)}</strong></td>
        <td><span style="color: ${meta.color}; font-weight: 600;">${meta.icon} ${meta.name}</span></td>
        <td>${h.amount > 0 ? `<strong style="color: #34d399; font-family: var(--font-mono);">${curr}${Number(h.amount).toLocaleString('en-IN')}</strong>` : '-'}</td>
        <td>${formatDate(h.due_date)}</td>
        <td><span style="color: #34d399; font-weight: 500;">${completedDate}</span></td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${escapeHtml(h.notes || '')}</td>
      </tr>
    `;
  }).join('');
}

// Mark Done Action (Advances Recurring Date & Logs to History)
async function markAsDone(id) {
  audioChime.playDoneSound();
  triggerConfetti();

  const r = reminders.find(item => item.id === id);
  if (!r) return;

  const historyEntry = {
    id: 'hist-' + Date.now(),
    reminder_id: r.id,
    title: r.title,
    category: r.category,
    amount: r.amount || 0,
    due_date: r.due_date,
    completed_at: new Date().toISOString(),
    notes: `Marked completed / paid on ${new Date().toLocaleDateString([], { day: 'numeric', month: 'short' })}`
  };

  historyRecords.unshift(historyEntry);

  if (r.recurrence && r.recurrence !== 'one-time') {
    const next = computeNextDate(r.recurrence, r.due_date, r.due_time);
    r.due_date = next.date;
    r.due_time = next.time;
    r.status = 'pending';
    r.snoozed_until = null;
  } else {
    r.status = 'completed';
    r.snoozed_until = null;
  }

  // Persist
  if (isBackendConnected) {
    await fetch(`/api/reminders/${id}/done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: historyEntry.notes })
    }).catch(() => {});
  } else {
    saveLocalDB({ settings, reminders, history: historyRecords });
  }

  showToast('✓ Completed & Recorded!', `Marked "${r.title}" as completed.`);
  loadData();
}

// Snooze Actions
function openSnoozeModal(id) {
  currentSnoozeTargetId = id;
  const modal = document.getElementById('snoozeModal');
  if (modal) modal.classList.remove('hidden');
}

async function triggerSnooze(minutes) {
  if (!currentSnoozeTargetId) return;
  const modal = document.getElementById('snoozeModal');
  if (modal) modal.classList.add('hidden');

  const r = reminders.find(item => item.id === currentSnoozeTargetId);
  if (r) {
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
    r.snoozed_until = snoozeTime.toISOString();

    if (isBackendConnected) {
      await fetch(`/api/reminders/${currentSnoozeTargetId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: Number(minutes) })
      }).catch(() => {});
    } else {
      saveLocalDB({ settings, reminders, history: historyRecords });
    }

    showToast('⏰ Snoozed', `Reminder postponed for ${minutes} minutes.`);
    currentSnoozeTargetId = null;
    loadData();
  }
}

// Delete Reminder
async function deleteReminder(id) {
  if (!confirm('Are you sure you want to delete this reminder?')) return;

  reminders = reminders.filter(r => r.id !== id);

  if (isBackendConnected) {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' }).catch(() => {});
  } else {
    saveLocalDB({ settings, reminders, history: historyRecords });
  }

  showToast('Deleted', 'Reminder removed.');
  loadData();
}

// Add / Edit Modal Handlers
function openAddModal() {
  document.getElementById('editReminderId').value = '';
  document.getElementById('modalTitle').textContent = '➕ Add New Reminder';
  document.getElementById('reminderTitle').value = '';
  document.getElementById('reminderCategory').value = 'rent';
  document.getElementById('reminderAmount').value = '';
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('reminderDueDate').value = today;
  document.getElementById('reminderDueTime').value = '09:00';
  document.getElementById('reminderRecurrence').value = 'monthly';
  document.getElementById('reminderAdvance').value = '1';
  document.getElementById('reminderPriority').value = 'medium';
  document.getElementById('reminderNotes').value = '';
  document.getElementById('reminderLink').value = '';

  document.getElementById('reminderModal').classList.remove('hidden');
}

function editReminder(id) {
  const r = reminders.find(item => item.id === id);
  if (!r) return;

  document.getElementById('editReminderId').value = r.id;
  document.getElementById('modalTitle').textContent = '✏️ Edit Reminder';
  document.getElementById('reminderTitle').value = r.title;
  document.getElementById('reminderCategory').value = r.category;
  document.getElementById('reminderAmount').value = r.amount || '';
  document.getElementById('reminderDueDate').value = r.due_date;
  document.getElementById('reminderDueTime').value = r.due_time || '09:00';
  document.getElementById('reminderRecurrence').value = r.recurrence || 'monthly';
  document.getElementById('reminderAdvance').value = r.advance_days || '0';
  document.getElementById('reminderPriority').value = r.priority || 'medium';
  document.getElementById('reminderNotes').value = r.notes || '';
  document.getElementById('reminderLink').value = r.link || '';

  document.getElementById('reminderModal').classList.remove('hidden');
}

// Quick Preset Handlers
function applyPreset(presetType) {
  openAddModal();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  if (presetType === 'rent') {
    document.getElementById('reminderTitle').value = 'Pay Home Rent';
    document.getElementById('reminderCategory').value = 'rent';
    document.getElementById('reminderAmount').value = '15000';
    document.getElementById('reminderDueDate').value = `${year}-${month}-01`;
    document.getElementById('reminderDueTime').value = '09:00';
    document.getElementById('reminderRecurrence').value = 'monthly';
    document.getElementById('reminderAdvance').value = '2';
    document.getElementById('reminderPriority').value = 'high';
    document.getElementById('reminderNotes').value = 'Bank transfer / UPI to Landlord. Verify electricity bill deduction if included.';
  } else if (presetType === 'electricity') {
    document.getElementById('reminderTitle').value = 'Pay Current / Electricity Bill';
    document.getElementById('reminderCategory').value = 'electricity';
    document.getElementById('reminderAmount').value = '2500';
    document.getElementById('reminderDueDate').value = `${year}-${month}-10`;
    document.getElementById('reminderDueTime').value = '10:00';
    document.getElementById('reminderRecurrence').value = 'monthly';
    document.getElementById('reminderAdvance').value = '3';
    document.getElementById('reminderPriority').value = 'high';
    document.getElementById('reminderNotes').value = 'Consumer ID: 9876543210. Check state power portal.';
  } else if (presetType === 'water') {
    document.getElementById('reminderTitle').value = 'Pay Water Utility Bill';
    document.getElementById('reminderCategory').value = 'water';
    document.getElementById('reminderAmount').value = '450';
    document.getElementById('reminderDueDate').value = `${year}-${month}-15`;
    document.getElementById('reminderDueTime').value = '11:00';
    document.getElementById('reminderRecurrence').value = 'monthly';
    document.getElementById('reminderAdvance').value = '2';
    document.getElementById('reminderPriority').value = 'medium';
    document.getElementById('reminderNotes').value = 'Municipal water connection #WA-4412';
  } else if (presetType === 'grocery') {
    document.getElementById('reminderTitle').value = 'Monthly Grocery Purchase & Stockup';
    document.getElementById('reminderCategory').value = 'grocery';
    document.getElementById('reminderAmount').value = '8000';
    document.getElementById('reminderDueDate').value = `${year}-${month}-02`;
    document.getElementById('reminderDueTime').value = '16:00';
    document.getElementById('reminderRecurrence').value = 'monthly';
    document.getElementById('reminderAdvance').value = '1';
    document.getElementById('reminderPriority').value = 'medium';
    document.getElementById('reminderNotes').value = 'Atta, Rice, Oil, Pulses, Dairy, Cleaning supplies, Snacks.';
  } else if (presetType === 'stocks') {
    document.getElementById('reminderTitle').value = 'Stock Market SIP & Investment';
    document.getElementById('reminderCategory').value = 'stocks';
    document.getElementById('reminderAmount').value = '10000';
    document.getElementById('reminderDueDate').value = `${year}-${month}-05`;
    document.getElementById('reminderDueTime').value = '09:30';
    document.getElementById('reminderRecurrence').value = 'monthly';
    document.getElementById('reminderAdvance').value = '1';
    document.getElementById('reminderPriority').value = 'high';
    document.getElementById('reminderNotes').value = 'Mutual fund auto-debit / Direct stock allocation. Check trading account balance.';
  } else if (presetType === 'meeting') {
    document.getElementById('reminderTitle').value = 'Work / Client Review Meeting';
    document.getElementById('reminderCategory').value = 'meeting';
    document.getElementById('reminderAmount').value = '0';
    document.getElementById('reminderDueDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('reminderDueTime').value = '11:00';
    document.getElementById('reminderRecurrence').value = 'weekly';
    document.getElementById('reminderAdvance').value = '0';
    document.getElementById('reminderPriority').value = 'high';
    document.getElementById('reminderNotes').value = 'Review deliverables, agenda, and action points.';
    document.getElementById('reminderLink').value = 'https://meet.google.com';
  }
}

// Utility formatting
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Request Browser Notifications API
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Live Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Initial Data & Permissions
  loadData();
  requestNotificationPermission();

  // Auto-sync & real-time alert polling every 10s
  setInterval(loadData, 10000);

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      
      if (activeTab === 'reminders') document.getElementById('tabReminders').classList.add('active');
      else if (activeTab === 'timeline') {
        document.getElementById('tabTimeline').classList.add('active');
        renderTimeline();
      } else if (activeTab === 'history') {
        document.getElementById('tabHistory').classList.add('active');
        loadHistory();
      }
    });
  });

  // Filters
  document.getElementById('searchInput')?.addEventListener('input', renderReminders);
  document.getElementById('categoryFilter')?.addEventListener('change', renderReminders);
  document.getElementById('statusFilter')?.addEventListener('change', renderReminders);

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.getAttribute('data-preset'));
    });
  });

  // Modal Open/Close
  document.getElementById('btnOpenAddModal')?.addEventListener('click', openAddModal);
  document.getElementById('btnCloseModal')?.addEventListener('click', () => {
    document.getElementById('reminderModal').classList.add('hidden');
  });
  document.getElementById('btnCancelModal')?.addEventListener('click', () => {
    document.getElementById('reminderModal').classList.add('hidden');
  });

  // Snooze Modal Close & Buttons
  document.getElementById('btnCloseSnooze')?.addEventListener('click', () => {
    document.getElementById('snoozeModal').classList.add('hidden');
  });
  document.querySelectorAll('.btn-snooze').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerSnooze(btn.getAttribute('data-minutes'));
    });
  });

  // ==========================================================================
  // Mobile Phone Notifications Management & Event Listeners
  // ==========================================================================
  
  let selectedMobileProvider = 'ntfy';

  function updateMobileUI() {
    const mob = settings.mobile_notifications || { enabled: true, provider: 'ntfy' };
    const dot = document.getElementById('mobileStatusDot');
    if (dot) {
      if (mob.enabled) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    }

    const desc = document.getElementById('mobileBannerDesc');
    if (desc) {
      if (mob.enabled) {
        const provName = mob.provider === 'ntfy' ? `ntfy.sh (Topic: ${mob.ntfy_topic || 'default'})` :
                         mob.provider === 'telegram' ? 'Telegram Bot' :
                         mob.provider === 'whatsapp' ? 'WhatsApp' :
                         mob.provider === 'pushover' ? 'Pushover' :
                         mob.provider === 'discord' ? 'Discord Webhook' : 'Push Alerts';
        desc.textContent = `Instant alerts active on your phone via ${provName} for all bills, rent, groceries, stocks and meetings.`;
      } else {
        desc.textContent = 'Mobile phone alerts are currently paused. Click configure to enable.';
      }
    }
  }

  function openMobileModal() {
    const mob = settings.mobile_notifications || {};
    selectedMobileProvider = mob.provider || 'ntfy';

    const toggle = document.getElementById('mobileEnabledToggle');
    if (toggle) toggle.checked = mob.enabled !== false;

    const topicInput = document.getElementById('ntfyTopicInput');
    if (topicInput) topicInput.value = mob.ntfy_topic || ('reminders_' + Math.random().toString(36).substring(2, 9));

    const tgToken = document.getElementById('telegramBotTokenInput');
    if (tgToken) tgToken.value = mob.telegram_bot_token || '';

    const tgChat = document.getElementById('telegramChatIdInput');
    if (tgChat) tgChat.value = mob.telegram_chat_id || '';

    const waPhone = document.getElementById('whatsappPhoneInput');
    if (waPhone) waPhone.value = mob.whatsapp_phone || '';

    const waKey = document.getElementById('whatsappApiKeyInput');
    if (waKey) waKey.value = mob.whatsapp_api_key || '';

    const poUser = document.getElementById('pushoverUserKeyInput');
    if (poUser) poUser.value = mob.pushover_user_key || '';

    const poToken = document.getElementById('pushoverApiTokenInput');
    if (poToken) poToken.value = mob.pushover_api_token || '';

    const discUrl = document.getElementById('discordWebhookInput');
    if (discUrl) discUrl.value = mob.discord_webhook_url || '';

    updateNtfyLinks();
    switchMobileProviderTab(selectedMobileProvider);

    // Fetch local LAN IPs for Mobile access
    if (isBackendConnected) {
      fetch('/api/network-info')
        .then(r => r.json())
        .then(data => {
          if (data && data.mobile_urls && data.mobile_urls.length > 0) {
            const lanEl = document.getElementById('lanMobileUrl');
            if (lanEl) lanEl.textContent = data.mobile_urls[0];
          }
        })
        .catch(() => {});
    }

    // Reset feedback
    const fb = document.getElementById('mobileTestFeedback');
    if (fb) fb.classList.add('hidden');

    document.getElementById('mobileModal')?.classList.remove('hidden');
  }

  function updateNtfyLinks() {
    const topic = document.getElementById('ntfyTopicInput')?.value.trim() || 'reminders_live';
    const subUrl = `https://ntfy.sh/${topic}`;
    const subUrlEl = document.getElementById('ntfySubUrl');
    if (subUrlEl) subUrlEl.textContent = subUrl;
    const dirLink = document.getElementById('ntfyDirectLink');
    if (dirLink) dirLink.href = subUrl;
  }

  function switchMobileProviderTab(provider) {
    selectedMobileProvider = provider;
    document.querySelectorAll('.provider-pill').forEach(pill => {
      if (pill.getAttribute('data-provider') === provider) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    const boxes = {
      ntfy: 'providerBoxNtfy',
      telegram: 'providerBoxTelegram',
      whatsapp: 'providerBoxWhatsapp',
      pushover: 'providerBoxPushover',
      discord: 'providerBoxDiscord'
    };

    Object.entries(boxes).forEach(([prov, boxId]) => {
      const box = document.getElementById(boxId);
      if (box) {
        if (prov === provider) box.classList.remove('hidden');
        else box.classList.add('hidden');
      }
    });
  }

  async function testMobilePing() {
    const feedback = document.getElementById('mobileTestFeedback');
    const icon = document.getElementById('mobileTestStatusIcon');
    const text = document.getElementById('mobileTestStatusText');
    
    if (feedback) {
      feedback.className = 'test-feedback-box';
      feedback.classList.remove('hidden');
      if (icon) icon.textContent = '⏳';
      if (text) text.textContent = 'Sending real-time push ping to your phone...';
    }

    const currentConfig = {
      enabled: document.getElementById('mobileEnabledToggle')?.checked ?? true,
      provider: selectedMobileProvider,
      ntfy_topic: document.getElementById('ntfyTopicInput')?.value.trim() || '',
      telegram_bot_token: document.getElementById('telegramBotTokenInput')?.value.trim() || '',
      telegram_chat_id: document.getElementById('telegramChatIdInput')?.value.trim() || '',
      whatsapp_phone: document.getElementById('whatsappPhoneInput')?.value.trim() || '',
      whatsapp_api_key: document.getElementById('whatsappApiKeyInput')?.value.trim() || '',
      pushover_user_key: document.getElementById('pushoverUserKeyInput')?.value.trim() || '',
      pushover_api_token: document.getElementById('pushoverApiTokenInput')?.value.trim() || '',
      discord_webhook_url: document.getElementById('discordWebhookInput')?.value.trim() || ''
    };

    if (isBackendConnected) {
      try {
        const res = await fetch('/api/test-mobile-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile_notifications: currentConfig,
            title: '⚡ Life Reminder Assistant Test',
            message: '📲 Mobile Alert Verified! You will receive timely reminders for Rent, Bills, Groceries, Stocks and Meetings directly on this phone.',
            priority: 'high'
          })
        });
        const data = await res.json();
        if (data && data.success) {
          if (feedback) feedback.className = 'test-feedback-box success';
          if (icon) icon.textContent = '✅';
          if (text) text.textContent = data.result?.message || 'Push notification sent! Check your phone right now.';
          showToast('📱 Mobile Alert Sent!', 'Notification successfully dispatched to your phone.');
        } else {
          if (feedback) feedback.className = 'test-feedback-box error';
          if (icon) icon.textContent = '❌';
          if (text) text.textContent = data.result?.error || data.error || 'Failed to deliver notification. Check your configuration.';
          showToast('Mobile Delivery Error', data.result?.error || 'Check provider settings', true);
        }
      } catch (err) {
        if (feedback) feedback.className = 'test-feedback-box error';
        if (icon) icon.textContent = '❌';
        if (text) text.textContent = 'Network error contacting server: ' + err.message;
      }
    } else {
      // Direct browser push to ntfy
      if (selectedMobileProvider === 'ntfy' && currentConfig.ntfy_topic) {
        try {
          await fetch(`https://ntfy.sh/${encodeURIComponent(currentConfig.ntfy_topic)}`, {
            method: 'POST',
            headers: {
              'Title': '⚡ Life Reminder Assistant Test',
              'Priority': '4',
              'Tags': 'bell,zap'
            },
            body: '📲 Mobile Alert Verified! You will receive timely reminders on this phone.'
          });
          if (feedback) feedback.className = 'test-feedback-box success';
          if (icon) icon.textContent = '✅';
          if (text) text.textContent = `Notification pushed directly to ntfy topic: ${currentConfig.ntfy_topic}`;
          showToast('📱 Push Alert Sent!', 'Dispatched to ntfy topic.');
        } catch (err) {
          if (feedback) feedback.className = 'test-feedback-box error';
          if (icon) icon.textContent = '❌';
          if (text) text.textContent = 'Could not push directly: ' + err.message;
        }
      } else {
        if (feedback) feedback.className = 'test-feedback-box success';
        if (icon) icon.textContent = '💡';
        if (text) text.textContent = 'Please run python server.py to test provider: ' + selectedMobileProvider;
      }
    }
  }

  async function saveMobileSettings() {
    const mobConfig = {
      enabled: document.getElementById('mobileEnabledToggle')?.checked ?? true,
      provider: selectedMobileProvider,
      ntfy_topic: document.getElementById('ntfyTopicInput')?.value.trim() || 'reminders_live',
      telegram_bot_token: document.getElementById('telegramBotTokenInput')?.value.trim() || '',
      telegram_chat_id: document.getElementById('telegramChatIdInput')?.value.trim() || '',
      whatsapp_phone: document.getElementById('whatsappPhoneInput')?.value.trim() || '',
      whatsapp_api_key: document.getElementById('whatsappApiKeyInput')?.value.trim() || '',
      pushover_user_key: document.getElementById('pushoverUserKeyInput')?.value.trim() || '',
      pushover_api_token: document.getElementById('pushoverApiTokenInput')?.value.trim() || '',
      discord_webhook_url: document.getElementById('discordWebhookInput')?.value.trim() || ''
    };

    settings.mobile_notifications = mobConfig;

    if (isBackendConnected) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).catch(() => {});
    } else {
      saveLocalDB({ settings, reminders, history: historyRecords });
    }

    document.getElementById('mobileModal')?.classList.add('hidden');
    showToast('📱 Mobile Settings Saved', 'Phone notifications configured successfully.');
    updateMobileUI();
  }

  // Hook Mobile Event Listeners
  document.getElementById('btnOpenMobileSync')?.addEventListener('click', openMobileModal);
  document.getElementById('btnBannerConfigure')?.addEventListener('click', openMobileModal);
  document.getElementById('btnSettingsOpenMobile')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.add('hidden');
    openMobileModal();
  });
  document.getElementById('btnCloseMobileModal')?.addEventListener('click', () => {
    document.getElementById('mobileModal')?.classList.add('hidden');
  });
  document.getElementById('btnBannerTestMobile')?.addEventListener('click', testMobilePing);
  document.getElementById('btnTestMobileNotification')?.addEventListener('click', testMobilePing);
  document.getElementById('btnSaveMobileSettings')?.addEventListener('click', saveMobileSettings);

  // Provider Pill selection
  document.querySelectorAll('.provider-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const prov = pill.getAttribute('data-provider');
      if (prov) switchMobileProviderTab(prov);
    });
  });

  // ntfy topic live URL update
  document.getElementById('ntfyTopicInput')?.addEventListener('input', updateNtfyLinks);

  // Copy buttons
  document.getElementById('btnCopyNtfyLink')?.addEventListener('click', () => {
    const topic = document.getElementById('ntfyTopicInput')?.value.trim() || 'reminders_live';
    const subUrl = `https://ntfy.sh/${topic}`;
    navigator.clipboard.writeText(subUrl).then(() => {
      showToast('📋 Copied!', 'Subscription URL copied to clipboard.');
    });
  });

  document.getElementById('btnCopyLanUrl')?.addEventListener('click', () => {
    const lanUrl = document.getElementById('lanMobileUrl')?.textContent || window.location.href;
    navigator.clipboard.writeText(lanUrl).then(() => {
      showToast('📋 Copied!', 'Dashboard URL copied to clipboard.');
    });
  });

  // Settings Modal
  document.getElementById('btnOpenSettings')?.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });
  document.getElementById('btnSaveSettings')?.addEventListener('click', async () => {
    const currency = document.getElementById('settingCurrency').value || '₹';
    const sound_enabled = document.getElementById('settingSound').checked;
    const toast_enabled = document.getElementById('settingToast').checked;

    settings.currency = currency;
    settings.sound_enabled = sound_enabled;
    settings.toast_enabled = toast_enabled;

    if (isBackendConnected) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).catch(() => {});
    } else {
      saveLocalDB({ settings, reminders, history: historyRecords });
    }

    document.getElementById('settingsModal').classList.add('hidden');
    showToast('Settings Saved', 'Preferences updated successfully.');
    loadData();
  });

  // Test Alert Button
  document.getElementById('btnTestAlert')?.addEventListener('click', async () => {
    audioChime.playMelody();
    showToast('🔔 Real-Time Alert Test', 'Dispatched real-time audio chime & browser notification test!');
    
    // Browser notification
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('⚡ Life Reminder Assistant Test', {
          body: 'Real-time alert engine is active and working perfectly! You will receive timely reminders for Rent, Bills, Groceries, Stocks and Meetings.',
          icon: 'favicon.svg'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('⚡ Life Reminder Assistant Test', {
              body: 'Real-time notifications enabled successfully!',
              icon: 'favicon.svg'
            });
          }
        });
      }
    }

    // Windows Toast API if backend is running
    if (isBackendConnected) {
      await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '⚡ Life Reminder Assistant',
          message: 'Real-time desktop alerts are active! You will get timely reminders for Rent, Bills, Groceries, Stocks and Meetings.'
        })
      }).catch(() => {});
    }
  });

  // Reminder Form Submit (Add / Edit)
  document.getElementById('reminderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editReminderId').value;

    const payload = {
      id: editId || 'rem-' + Date.now(),
      title: document.getElementById('reminderTitle').value.trim(),
      category: document.getElementById('reminderCategory').value,
      amount: parseFloat(document.getElementById('reminderAmount').value) || 0,
      due_date: document.getElementById('reminderDueDate').value,
      due_time: document.getElementById('reminderDueTime').value,
      recurrence: document.getElementById('reminderRecurrence').value,
      advance_days: parseInt(document.getElementById('reminderAdvance').value) || 0,
      priority: document.getElementById('reminderPriority').value,
      notes: document.getElementById('reminderNotes').value.trim(),
      link: document.getElementById('reminderLink').value.trim(),
      status: 'pending',
      snoozed_until: null,
      created_at: new Date().toISOString()
    };

    if (editId) {
      const idx = reminders.findIndex(r => r.id === editId);
      if (idx !== -1) reminders[idx] = { ...reminders[idx], ...payload };
    } else {
      reminders.push(payload);
    }

    if (isBackendConnected) {
      if (editId) {
        await fetch(`/api/reminders/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } else {
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } else {
      saveLocalDB({ settings, reminders, history: historyRecords });
    }

    document.getElementById('reminderModal').classList.add('hidden');
    showToast('Saved!', `Reminder "${payload.title}" is active.`);
    loadData();
  });

  // Quick Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      openAddModal();
      
      const today = new Date();
      const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];
      const thisMonth15 = new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];
      const thisMonth20 = new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0];
      const thisMonth5 = new Date(today.getFullYear(), today.getMonth() + 1, 5).toISOString().split('T')[0];
      const thisMonth10 = new Date(today.getFullYear(), today.getMonth() + 1, 10).toISOString().split('T')[0];

      if (preset === 'rent') {
        document.getElementById('reminderTitle').value = 'Pay Home Rent';
        document.getElementById('reminderCategory').value = 'rent';
        document.getElementById('reminderAmount').value = '15000';
        document.getElementById('reminderDueDate').value = nextMonthFirst;
        document.getElementById('reminderDueTime').value = '09:00';
        document.getElementById('reminderRecurrence').value = 'monthly';
        document.getElementById('reminderAdvance').value = '3';
        document.getElementById('reminderPriority').value = 'high';
        document.getElementById('reminderNotes').value = 'Payable to Landlord via UPI / Netbanking. Confirm receipt message.';
      } else if (preset === 'electricity') {
        document.getElementById('reminderTitle').value = 'Pay Electricity / Power Bill';
        document.getElementById('reminderCategory').value = 'electricity';
        document.getElementById('reminderAmount').value = '2500';
        document.getElementById('reminderDueDate').value = thisMonth15;
        document.getElementById('reminderDueTime').value = '10:00';
        document.getElementById('reminderRecurrence').value = 'monthly';
        document.getElementById('reminderAdvance').value = '2';
        document.getElementById('reminderPriority').value = 'high';
        document.getElementById('reminderNotes').value = 'Electricity Board Consumer Account #';
      } else if (preset === 'water') {
        document.getElementById('reminderTitle').value = 'Pay Water Utility Bill';
        document.getElementById('reminderCategory').value = 'water';
        document.getElementById('reminderAmount').value = '450';
        document.getElementById('reminderDueDate').value = thisMonth20;
        document.getElementById('reminderDueTime').value = '11:00';
        document.getElementById('reminderRecurrence').value = 'monthly';
        document.getElementById('reminderAdvance').value = '2';
        document.getElementById('reminderPriority').value = 'medium';
        document.getElementById('reminderNotes').value = 'Municipal water connection bill';
      } else if (preset === 'grocery') {
        document.getElementById('reminderTitle').value = 'Monthly Grocery Shopping';
        document.getElementById('reminderCategory').value = 'grocery';
        document.getElementById('reminderAmount').value = '8000';
        document.getElementById('reminderDueDate').value = thisMonth5;
        document.getElementById('reminderDueTime').value = '17:00';
        document.getElementById('reminderRecurrence').value = 'monthly';
        document.getElementById('reminderAdvance').value = '1';
        document.getElementById('reminderPriority').value = 'medium';
        document.getElementById('reminderNotes').value = 'Checklist: Rice, Wheat flour, Cooking oil, Pulses, Dairy, Spices, Cleaning supplies';
      } else if (preset === 'stocks') {
        document.getElementById('reminderTitle').value = 'Stock Market SIP Auto-Debit';
        document.getElementById('reminderCategory').value = 'stocks';
        document.getElementById('reminderAmount').value = '10000';
        document.getElementById('reminderDueDate').value = thisMonth10;
        document.getElementById('reminderDueTime').value = '09:15';
        document.getElementById('reminderRecurrence').value = 'monthly';
        document.getElementById('reminderAdvance').value = '1';
        document.getElementById('reminderPriority').value = 'high';
        document.getElementById('reminderNotes').value = 'Ensure sufficient balance in bank account for Mutual Fund / Equity SIP execution';
      } else if (preset === 'meeting') {
        document.getElementById('reminderTitle').value = 'Important Team Sync & Status Meeting';
        document.getElementById('reminderCategory').value = 'meeting';
        document.getElementById('reminderAmount').value = '';
        document.getElementById('reminderDueDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('reminderDueTime').value = '11:00';
        document.getElementById('reminderRecurrence').value = 'weekly';
        document.getElementById('reminderAdvance').value = '0';
        document.getElementById('reminderPriority').value = 'medium';
        document.getElementById('reminderNotes').value = 'Weekly review, sprint deliverables, and action items.';
        document.getElementById('reminderLink').value = 'https://meet.google.com/';
      }
    });
  });

  // Category Color Tabs Click Handler
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategoryFilter = pill.getAttribute('data-category') || 'all';
      renderReminders();
    });
  });

  // Color Theme Switcher
  function applyTheme(themeName) {
    document.body.className = 'dark-theme ' + themeName;
    document.querySelectorAll('.theme-pill-dot').forEach(dot => {
      if (dot.getAttribute('data-theme') === themeName) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  const savedTheme = localStorage.getItem('reminder_theme') || settings.theme || 'theme-midnight';
  applyTheme(savedTheme);

  document.querySelectorAll('.theme-pill-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const theme = dot.getAttribute('data-theme');
      if (theme) {
        applyTheme(theme);
        localStorage.setItem('reminder_theme', theme);
        settings.theme = theme;
        showToast('🎨 Theme Updated', `Switched palette to ${theme.replace('theme-', '')}`);
        if (isBackendConnected) {
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          }).catch(() => {});
        }
      }
    });
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl + K or Cmd + K: Focus Search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    // Escape: Close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    }
  });
});

