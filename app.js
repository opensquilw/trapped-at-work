(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const DEFAULT_TYPES = [
    { id: 'al', en: 'Annual Leave', zh: '年假', entitlement: 14, unlimited: false },
    { id: 'sick', en: 'Sick Leave', zh: '病假', entitlement: 0, unlimited: true },
    { id: 'unpaid', en: 'Unpaid Leave', zh: '無薪假', entitlement: 0, unlimited: true },
    { id: 'other', en: 'Other', zh: '其他', entitlement: 0, unlimited: true },
  ];

  const state = {
    types: [],
    entries: [],
    reminders: [],
    cpdSettings: null,      // { startDate: 'YYYY-MM-DD', target: number }
    cpdRecords: [],
    leaveYear: new Date().getFullYear(),
    editingEntryId: null,
    editingReminderId: null,
    editingTypeId: null,
    editingCpdId: null,
    pendingFile: null,      // { name, type, dataUrl } staged until the CPD form is saved
    removeAttachment: false,
    cpdFilterCycle: 'all',
    cpdSearch: '',
  };

  // Attachments live in IndexedDB so they don't eat the localStorage quota.
  // Deliberately namespaced away from the standalone CPD app's `cpdtracker_db` /
  // `cpdtracker_*` keys — on GitHub Pages both apps share an origin, so reusing
  // those names would write straight into the live app's data.
  const IDB_NAME = 'lt_cpd_db';
  const IDB_STORE = 'attachments';
  const MAX_FILE_BYTES = 8 * 1024 * 1024;

  const dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function idbTx(mode, fn) {
    return dbPromise.then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const result = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : undefined);
      tx.onerror = () => reject(tx.error);
    }));
  }
  const idbPut = rec => idbTx('readwrite', store => store.put(rec));
  const idbGet = id => idbTx('readonly', store => store.get(id));
  const idbDelete = id => idbTx('readwrite', store => store.delete(id));
  const idbClear = () => idbTx('readwrite', store => store.clear());

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function load() {
    try { state.types = JSON.parse(localStorage.getItem('lt_types')) || DEFAULT_TYPES.slice(); }
    catch { state.types = DEFAULT_TYPES.slice(); }
    if (!state.types.length) state.types = DEFAULT_TYPES.slice();
    try { state.entries = JSON.parse(localStorage.getItem('lt_entries')) || []; } catch { state.entries = []; }
    try { state.reminders = JSON.parse(localStorage.getItem('lt_reminders')) || []; } catch { state.reminders = []; }
    try { state.cpdSettings = JSON.parse(localStorage.getItem('lt_cpd_settings')) || null; } catch { state.cpdSettings = null; }
    try { state.cpdRecords = JSON.parse(localStorage.getItem('lt_cpd_records')) || []; } catch { state.cpdRecords = []; }
  }
  function saveTypes() { localStorage.setItem('lt_types', JSON.stringify(state.types)); }
  function saveEntries() { localStorage.setItem('lt_entries', JSON.stringify(state.entries)); }
  function saveReminders() { localStorage.setItem('lt_reminders', JSON.stringify(state.reminders)); }
  function saveCpdSettings() { localStorage.setItem('lt_cpd_settings', JSON.stringify(state.cpdSettings)); }
  function saveCpdRecords() { localStorage.setItem('lt_cpd_records', JSON.stringify(state.cpdRecords)); }

  function typeLabel(type) { return type ? (type[LANG] || type.en) : ''; }
  function typeById(id) { return state.types.find(t => t.id === id); }

  function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function daysBetweenInclusive(startStr, endStr) {
    const a = new Date(startStr + 'T00:00:00');
    const b = new Date(endStr + 'T00:00:00');
    const diff = Math.round((b - a) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  }
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (LANG === 'zh') {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function formatDateRange(start, end) {
    return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
  }

  function parseISO(s) {
    const p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function toISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addYears(d, n) {
    const r = new Date(d);
    r.setFullYear(r.getFullYear() + n);
    return r;
  }
  function fmtMonthYear(d) {
    if (LANG === 'zh') return `${d.getFullYear()}年${d.getMonth() + 1}月`;
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
  }
  function roundPts(n) { return Math.round(n * 100) / 100; }
  function pointsSum(records) {
    return records.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
  }

  // Rolling 12-month CPD cycles anchored to the tracking start date's month/day.
  function buildCycles(startISO, today) {
    const start = parseISO(startISO);
    const cycles = [];
    let cs = new Date(start);
    let guard = 0;
    while (cs <= today && guard < 200) {
      const ce = addYears(cs, 1);
      ce.setDate(ce.getDate() - 1);
      cycles.push({ start: new Date(cs), end: ce, index: cycles.length });
      cs = addYears(cs, 1);
      guard++;
    }
    if (!cycles.length) {
      const ce0 = addYears(start, 1);
      ce0.setDate(ce0.getDate() - 1);
      cycles.push({ start, end: ce0, index: 0 });
    }
    return cycles;
  }
  function cycleForDate(cycles, d) {
    for (const c of cycles) {
      if (d >= c.start && d <= c.end) return c;
    }
    if (d > cycles[cycles.length - 1].end) return cycles[cycles.length - 1];
    return null; // dated before tracking started
  }
  // Records dated before the tracking start date are kept but excluded from totals.
  function trackedCpdRecords() {
    if (!state.cpdSettings) return [];
    const start = parseISO(state.cpdSettings.startDate);
    return state.cpdRecords.filter(r => parseISO(r.date) >= start);
  }

  // ---------- navigation ----------
  function showScreen(name) {
    $$('.screen').forEach(s => s.hidden = s.id !== name);
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
    window.scrollTo(0, 0);
  }

  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen(btn.dataset.screen);
      renderAll();
    });
  });

  $$('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => { showScreen(btn.dataset.goto); renderAll(); });
  });

  $('#settings-btn').addEventListener('click', () => { showScreen('settings-screen'); renderSettings(); });

  // ---------- dashboard ----------
  function renderDashboard() {
    const cardsEl = $('#dash-leave-cards');
    cardsEl.innerHTML = '';
    const year = new Date().getFullYear();
    if (!state.types.length) {
      $('#dash-leave-empty').hidden = false;
    } else {
      $('#dash-leave-empty').hidden = true;
      state.types.forEach(type => cardsEl.appendChild(buildLeaveCard(type, year)));
    }

    // compact CPD summary, same visual language as the leave cards
    const cpdEl = $('#dash-cpd-card');
    cpdEl.innerHTML = '';
    const info = cpdCycleInfo();
    if (!info) {
      const p = document.createElement('p');
      p.className = 'empty-msg';
      p.textContent = t('dashCpdSetup');
      cpdEl.appendChild(p);
    } else {
      const target = Number(state.cpdSettings.target) || 0;
      const pts = cpdPointsInCycle(info.current);
      const card = document.createElement('div');
      card.className = 'leave-card';
      const pct = target > 0 ? Math.min(100, (pts / target) * 100) : 0;
      card.innerHTML = `
        <div class="leave-card-top">
          <span class="leave-card-name">${fmtMonthYear(info.current.start)} – ${fmtMonthYear(info.current.end)}</span>
          <span class="leave-card-nums"><b>${pts}</b> / ${roundPts(target)} ${t('cpdPtsLabel')}</span>
        </div>
        <div class="leave-bar-track"><div class="leave-bar-fill" style="width:${pct}%"></div></div>
      `;
      cpdEl.appendChild(card);
    }

    // upcoming reminders (not done, sorted by due date), top 5
    const upcoming = state.reminders
      .filter(r => !r.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 5);
    const remList = $('#dash-reminders-list');
    remList.innerHTML = '';
    $('#dash-reminders-empty').hidden = upcoming.length > 0;
    upcoming.forEach(r => remList.appendChild(buildReminderItem(r)));

    // upcoming leave
    const today = todayStr();
    const upcomingLeave = state.entries
      .filter(e => e.end >= today)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 5);
    const leaveList = $('#dash-upcoming-leave-list');
    leaveList.innerHTML = '';
    $('#dash-upcoming-leave-empty').hidden = upcomingLeave.length > 0;
    upcomingLeave.forEach(e => leaveList.appendChild(buildLeaveHistoryItem(e)));
  }

  function buildLeaveCard(type, year) {
    const used = state.entries
      .filter(e => e.typeId === type.id && new Date(e.start).getFullYear() === year)
      .reduce((sum, e) => sum + Number(e.days), 0);
    const card = document.createElement('div');
    card.className = 'leave-card';
    const top = document.createElement('div');
    top.className = 'leave-card-top';
    const name = document.createElement('span');
    name.className = 'leave-card-name';
    name.textContent = typeLabel(type);
    const nums = document.createElement('span');
    nums.className = 'leave-card-nums';
    if (type.unlimited) {
      nums.innerHTML = `<b>${used}</b> ${t('dashDaysUsed')}`;
    } else {
      nums.innerHTML = `<b>${used}</b> / ${type.entitlement}`;
    }
    top.appendChild(name);
    top.appendChild(nums);
    card.appendChild(top);
    if (!type.unlimited) {
      const track = document.createElement('div');
      track.className = 'leave-bar-track';
      const fill = document.createElement('div');
      fill.className = 'leave-bar-fill' + (used > type.entitlement ? ' over' : '');
      const pct = type.entitlement > 0 ? Math.min(100, (used / type.entitlement) * 100) : 100;
      fill.style.width = pct + '%';
      track.appendChild(fill);
      card.appendChild(track);
    }
    return card;
  }

  function buildLeaveHistoryItem(entry) {
    const type = typeById(entry.typeId);
    const li = document.createElement('li');
    li.className = 'record-item';
    li.innerHTML = `
      <span class="record-pts">${entry.days}</span>
      <span class="record-main">
        <span class="record-title">${typeLabel(type)}</span>
        <span class="record-meta">${formatDateRange(entry.start, entry.end)}</span>
      </span>
    `;
    li.addEventListener('click', () => openLeaveForm(entry.id));
    return li;
  }

  function buildReminderItem(r) {
    const li = document.createElement('li');
    li.className = 'record-item' + (r.done ? ' done' : '');
    const today = todayStr();
    let badge = '';
    if (!r.done) {
      if (r.due < today) badge = `<span class="badge warn">${t('overdueBadge')}</span>`;
      else if (r.due === today) badge = `<span class="badge info">${t('todayBadge')}</span>`;
    }
    li.innerHTML = `
      <span class="record-check ${r.done ? 'checked' : ''}">${r.done ? '✓' : ''}</span>
      <span class="record-main">
        <span class="record-title">${escapeHtml(r.title)}</span>
        <span class="record-meta">${formatDate(r.due)} ${badge}</span>
      </span>
    `;
    li.querySelector('.record-check').addEventListener('click', (ev) => {
      ev.stopPropagation();
      r.done = !r.done;
      saveReminders();
      renderAll();
    });
    li.addEventListener('click', () => openReminderForm(r.id));
    return li;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- leave screen ----------
  function renderLeaveScreen() {
    $('#leave-year-label').textContent = state.leaveYear;
    const cardsEl = $('#leave-cards');
    cardsEl.innerHTML = '';
    if (!state.types.length) {
      $('#leave-cards-empty').hidden = false;
    } else {
      $('#leave-cards-empty').hidden = true;
      state.types.forEach(type => cardsEl.appendChild(buildLeaveCard(type, state.leaveYear)));
    }

    const entries = state.entries
      .filter(e => new Date(e.start).getFullYear() === state.leaveYear)
      .sort((a, b) => b.start.localeCompare(a.start));
    const listEl = $('#leave-history-list');
    listEl.innerHTML = '';
    $('#leave-history-empty').hidden = entries.length > 0;
    entries.forEach(e => listEl.appendChild(buildLeaveHistoryItem(e)));
  }

  $('#leave-year-prev').addEventListener('click', () => { state.leaveYear--; renderLeaveScreen(); });
  $('#leave-year-next').addEventListener('click', () => { state.leaveYear++; renderLeaveScreen(); });

  // ---------- leave form ----------
  function openLeaveForm(entryId) {
    state.editingEntryId = entryId || null;
    const typeSel = $('#lf-type');
    typeSel.innerHTML = state.types.map(ty => `<option value="${ty.id}">${typeLabel(ty)}</option>`).join('');

    if (entryId) {
      const entry = state.entries.find(e => e.id === entryId);
      $('#leave-form-title').textContent = t('leaveFormTitleEdit');
      typeSel.value = entry.typeId;
      $('#lf-start').value = entry.start;
      $('#lf-end').value = entry.end;
      $('#lf-days').value = entry.days;
      $('#lf-note').value = entry.note || '';
      $('#leave-delete-btn').hidden = false;
    } else {
      $('#leave-form-title').textContent = t('leaveFormTitleAdd');
      $('#leave-form').reset();
      const today = todayStr();
      $('#lf-start').value = today;
      $('#lf-end').value = today;
      $('#lf-days').value = 1;
      $('#leave-delete-btn').hidden = true;
    }
    showScreen('leave-form-screen');
  }

  function syncLeaveDays() {
    const start = $('#lf-start').value;
    const end = $('#lf-end').value;
    if (start && end && end >= start) {
      $('#lf-days').value = daysBetweenInclusive(start, end);
    }
  }
  $('#lf-start').addEventListener('change', syncLeaveDays);
  $('#lf-end').addEventListener('change', syncLeaveDays);

  $('#leave-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = {
      typeId: $('#lf-type').value,
      start: $('#lf-start').value,
      end: $('#lf-end').value,
      days: Number($('#lf-days').value),
      note: $('#lf-note').value.trim(),
    };
    if (data.end < data.start) { $('#lf-end').value = data.start; data.end = data.start; }
    if (state.editingEntryId) {
      const entry = state.entries.find(e => e.id === state.editingEntryId);
      Object.assign(entry, data);
    } else {
      state.entries.push({ id: uid(), ...data });
    }
    saveEntries();
    showScreen('leave-screen');
    renderAll();
  });
  $('#leave-cancel-btn').addEventListener('click', () => { showScreen('leave-screen'); renderAll(); });
  $('#leave-delete-btn').addEventListener('click', () => {
    state.entries = state.entries.filter(e => e.id !== state.editingEntryId);
    saveEntries();
    showScreen('leave-screen');
    renderAll();
  });

  // ---------- reminders screen ----------
  function renderReminders() {
    const active = state.reminders.filter(r => !r.done).sort((a, b) => a.due.localeCompare(b.due));
    const done = state.reminders.filter(r => r.done).sort((a, b) => b.due.localeCompare(a.due));
    const listEl = $('#reminders-list');
    listEl.innerHTML = '';
    $('#reminders-empty').hidden = active.length > 0;
    active.forEach(r => listEl.appendChild(buildReminderItem(r)));

    const doneWrap = $('#reminders-done-wrap');
    doneWrap.hidden = done.length === 0;
    const doneList = $('#reminders-done-list');
    doneList.innerHTML = '';
    done.forEach(r => doneList.appendChild(buildReminderItem(r)));
  }

  function openReminderForm(reminderId) {
    state.editingReminderId = reminderId || null;
    if (reminderId) {
      const r = state.reminders.find(x => x.id === reminderId);
      $('#reminder-form-title').textContent = t('reminderFormTitleEdit');
      $('#rf-title').value = r.title;
      $('#rf-due').value = r.due;
      $('#rf-note').value = r.note || '';
      $('#reminder-delete-btn').hidden = false;
    } else {
      $('#reminder-form-title').textContent = t('reminderFormTitleAdd');
      $('#reminder-form').reset();
      $('#rf-due').value = todayStr();
      $('#reminder-delete-btn').hidden = true;
    }
    showScreen('reminder-form-screen');
  }

  $('#reminder-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = {
      title: $('#rf-title').value.trim(),
      due: $('#rf-due').value,
      note: $('#rf-note').value.trim(),
    };
    if (state.editingReminderId) {
      const r = state.reminders.find(x => x.id === state.editingReminderId);
      Object.assign(r, data);
    } else {
      state.reminders.push({ id: uid(), done: false, ...data });
    }
    saveReminders();
    showScreen('reminders-screen');
    renderAll();
  });
  $('#reminder-cancel-btn').addEventListener('click', () => { showScreen('reminders-screen'); renderAll(); });
  $('#reminder-delete-btn').addEventListener('click', () => {
    state.reminders = state.reminders.filter(r => r.id !== state.editingReminderId);
    saveReminders();
    showScreen('reminders-screen');
    renderAll();
  });

  // ---------- CPD ----------
  const RING_C = 2 * Math.PI * 60;

  function cpdCycleInfo() {
    if (!state.cpdSettings) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cycles = buildCycles(state.cpdSettings.startDate, today);
    const current = cycleForDate(cycles, today) || cycles[cycles.length - 1];
    return { cycles, current, today };
  }

  function cpdPointsInCycle(cycle) {
    return roundPts(pointsSum(trackedCpdRecords().filter(r => {
      const d = parseISO(r.date);
      return d >= cycle.start && d <= cycle.end;
    })));
  }

  function renderCpd() {
    const info = cpdCycleInfo();
    const ring = $('#ring-progress');
    const target = state.cpdSettings ? Number(state.cpdSettings.target) || 0 : 0;

    if (!info) {
      $('#ring-points').textContent = '0';
      $('#ring-target').textContent = '10';
      ring.style.strokeDasharray = RING_C;
      ring.style.strokeDashoffset = RING_C;
      $('#cpd-cycle-range').textContent = '—';
      $('#cpd-ring-status').textContent = t('cpdSetupPrompt');
      $('#cpd-stat-total').textContent = '0';
      $('#cpd-stat-cycles').textContent = '0';
      $('#cpd-stat-days').textContent = '—';
      $('#cpd-cycle-history').innerHTML = '';
    } else {
      const { cycles, current, today } = info;
      const pts = cpdPointsInCycle(current);
      $('#ring-points').textContent = pts;
      $('#ring-target').textContent = roundPts(target);
      const pct = target > 0 ? Math.min(1, pts / target) : 0;
      ring.style.strokeDasharray = RING_C;
      ring.style.strokeDashoffset = RING_C * (1 - pct);
      ring.style.stroke = pts >= target && target > 0 ? 'var(--success)' : 'var(--primary)';

      $('#cpd-cycle-range').textContent = `${fmtMonthYear(current.start)} – ${fmtMonthYear(current.end)}`;
      const daysLeft = Math.max(0, Math.round((current.end - today) / 86400000));
      const remaining = roundPts(Math.max(0, target - pts));
      $('#cpd-ring-status').textContent = remaining > 0
        ? (LANG === 'zh' ? `距離目標仲差 ${remaining} 分` : `${remaining} pts to go`)
        : (LANG === 'zh' ? '本週期已達標 🎉' : 'Target met for this cycle 🎉');

      $('#cpd-stat-total').textContent = roundPts(pointsSum(trackedCpdRecords()));
      $('#cpd-stat-cycles').textContent = cycles.length;
      $('#cpd-stat-days').textContent = daysLeft;

      const hist = $('#cpd-cycle-history');
      hist.innerHTML = '';
      cycles.slice(0, -1).reverse().forEach(c => {
        const pts = cpdPointsInCycle(c);
        const met = target > 0 && pts >= target;
        const li = document.createElement('li');
        li.className = 'cycle-item';
        li.innerHTML = `
          <span class="cy-range">${fmtMonthYear(c.start)} – ${fmtMonthYear(c.end)}</span>
          <span class="cy-pts">${pts} / ${roundPts(target)}</span>
          <span class="badge ${met ? 'met' : 'short'}">${met ? t('badgeMet') : t('badgeShort')}</span>
        `;
        hist.appendChild(li);
      });
    }

    renderCpdFilter(info);
    renderCpdRecords(info);
  }

  function renderCpdFilter(info) {
    const sel = $('#cpd-cycle-filter');
    const prev = state.cpdFilterCycle;
    sel.innerHTML = `<option value="all">${t('cpdAllCycles')}</option>`;
    if (info) {
      info.cycles.slice().reverse().forEach(c => {
        const opt = document.createElement('option');
        opt.value = String(c.index);
        opt.textContent = `${fmtMonthYear(c.start)} – ${fmtMonthYear(c.end)}`;
        sel.appendChild(opt);
      });
    }
    sel.value = [...sel.options].some(o => o.value === prev) ? prev : 'all';
    state.cpdFilterCycle = sel.value;
  }

  function renderCpdRecords(info) {
    let list = state.cpdRecords.slice().sort((a, b) =>
      b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

    if (info && state.cpdFilterCycle !== 'all') {
      const c = info.cycles[Number(state.cpdFilterCycle)];
      if (c) {
        list = list.filter(r => {
          const d = parseISO(r.date);
          return d >= c.start && d <= c.end;
        });
      }
    }
    const q = state.cpdSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(r => [r.title, cpdCatLabel(r.category), r.location, r.notes]
        .some(v => (v || '').toLowerCase().includes(q)));
    }

    const el = $('#cpd-records-list');
    el.innerHTML = '';
    $('#cpd-records-empty').hidden = list.length > 0;
    list.forEach(r => el.appendChild(buildCpdItem(r)));
  }

  function buildCpdItem(r) {
    const li = document.createElement('li');
    li.className = 'record-item';
    const clip = r.hasAttachment
      ? '<svg class="clip-icon" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16.5 6v11.5a4.5 4.5 0 0 1-9 0V5a3 3 0 0 1 6 0v10.5a1.5 1.5 0 0 1-3 0V6H9v9.5a3 3 0 0 0 6 0V5a4.5 4.5 0 0 0-9 0v12.5a6 6 0 0 0 12 0V6h-1.5Z"/></svg>'
      : '';
    li.innerHTML = `
      <span class="record-pts">${roundPts(Number(r.points) || 0)}</span>
      <span class="record-main">
        <span class="record-title">${escapeHtml(r.title)}</span>
        <span class="record-meta">${formatDate(r.date)} · ${escapeHtml(cpdCatLabel(r.category))}</span>
      </span>
      ${clip}
    `;
    li.addEventListener('click', () => openCpdDetail(r.id));
    return li;
  }

  function openCpdDetail(id) {
    const r = state.cpdRecords.find(x => x.id === id);
    if (!r) return;
    const body = $('#modal-body');
    const beforeStart = state.cpdSettings && parseISO(r.date) < parseISO(state.cpdSettings.startDate);
    body.innerHTML = `
      <p class="detail-title">${escapeHtml(r.title)}</p>
      <p class="detail-cat">${escapeHtml(cpdCatLabel(r.category))}</p>
      <div class="detail-row"><span class="dl">${t('detailDate')}</span><span class="dv">${formatDate(r.date)}</span></div>
      <div class="detail-row"><span class="dl">${t('detailPoints')}</span><span class="dv">${roundPts(Number(r.points) || 0)}</span></div>
      ${r.location ? `<div class="detail-row"><span class="dl">${t('detailWhere')}</span><span class="dv">${escapeHtml(r.location)}</span></div>` : ''}
      ${r.notes ? `<div class="detail-row"><span class="dl">${t('detailNotes')}</span><span class="dv">${escapeHtml(r.notes)}</span></div>` : ''}
      ${beforeStart ? `<p class="detail-note">${t('cpdBeforeStart')}</p>` : ''}
      <div id="detail-attach-slot"></div>
      <div class="detail-actions">
        <button class="btn btn-primary" id="detail-edit-btn">${t('detailEdit')}</button>
      </div>
    `;
    $('#detail-edit-btn').addEventListener('click', () => {
      $('#record-modal').hidden = true;
      openCpdForm(id);
    });

    if (r.hasAttachment) {
      idbGet(id).then(att => {
        if (!att) return;
        const slot = $('#detail-attach-slot');
        const isImg = (att.type || '').startsWith('image/');
        const wrap = document.createElement('div');
        wrap.className = 'detail-attach';
        wrap.innerHTML = isImg
          ? `<img src="${att.dataUrl}" alt="" /><span class="fp-name">${escapeHtml(att.name)}</span>`
          : `<span class="fp-icon">PDF</span><span class="fp-name">${escapeHtml(att.name)}</span>`;
        const open = document.createElement('button');
        open.className = 'btn btn-secondary';
        open.style.flex = 'none';
        open.textContent = t('detailOpen');
        open.addEventListener('click', () => openDataUrl(att));
        wrap.appendChild(open);
        slot.appendChild(wrap);
      }).catch(() => {});
    }
    $('#record-modal').hidden = false;
  }

  // Data URLs can't be opened directly in a tab in some browsers, so convert to a blob URL.
  function openDataUrl(att) {
    try {
      const [meta, b64] = att.dataUrl.split(',');
      const mime = (meta.match(/:(.*?);/) || [])[1] || att.type || 'application/octet-stream';
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      window.open(att.dataUrl, '_blank');
    }
  }

  $('#modal-close-btn').addEventListener('click', () => { $('#record-modal').hidden = true; });
  $('#record-modal').addEventListener('click', ev => {
    if (ev.target.id === 'record-modal') $('#record-modal').hidden = true;
  });

  $('#cpd-cycle-filter').addEventListener('change', ev => {
    state.cpdFilterCycle = ev.target.value;
    renderCpdRecords(cpdCycleInfo());
  });
  $('#cpd-search').addEventListener('input', ev => {
    state.cpdSearch = ev.target.value;
    renderCpdRecords(cpdCycleInfo());
  });

  // ---------- CPD form ----------
  function openCpdForm(id) {
    state.editingCpdId = id || null;
    state.pendingFile = null;
    state.removeAttachment = false;

    const sel = $('#cf-category');
    sel.innerHTML = CPD_CATEGORIES.map(c => `<option value="${c.id}">${cpdCatLabel(c.id)}</option>`).join('');

    if (id) {
      const r = state.cpdRecords.find(x => x.id === id);
      $('#cpd-form-title').textContent = t('cpdFormTitleEdit');
      $('#cf-title').value = r.title;
      $('#cf-date').value = r.date;
      $('#cf-points').value = r.points;
      sel.value = r.category;
      $('#cf-location').value = r.location || '';
      $('#cf-notes').value = r.notes || '';
      $('#cpd-delete-btn').hidden = false;
      if (r.hasAttachment) {
        idbGet(id).then(att => { if (att) showFilePreview(att, true); }).catch(() => {});
      } else {
        hideFilePreview();
      }
    } else {
      $('#cpd-form-title').textContent = t('cpdFormTitleAdd');
      $('#cpd-form').reset();
      $('#cf-date').value = todayStr();
      $('#cpd-delete-btn').hidden = true;
      hideFilePreview();
    }
    showScreen('cpd-form-screen');
  }

  function hideFilePreview() {
    const p = $('#cf-file-preview');
    p.hidden = true;
    p.innerHTML = '';
  }

  function showFilePreview(att, existing) {
    const p = $('#cf-file-preview');
    const isImg = (att.type || '').startsWith('image/');
    p.innerHTML = isImg
      ? `<img src="${att.dataUrl}" alt="" /><span class="fp-name">${escapeHtml(att.name)}</span>`
      : `<span class="fp-icon">PDF</span><span class="fp-name">${escapeHtml(att.name)}</span>`;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'fp-remove';
    rm.setAttribute('aria-label', 'Remove');
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      state.pendingFile = null;
      if (existing) state.removeAttachment = true;
      $('#cf-file').value = '';
      hideFilePreview();
    });
    p.appendChild(rm);
    p.hidden = false;
  }

  $('#cf-file').addEventListener('change', ev => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      alert(t('cpdFileTooBig'));
      ev.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.pendingFile = { name: file.name, type: file.type, dataUrl: reader.result };
      state.removeAttachment = false;
      showFilePreview(state.pendingFile, false);
    };
    reader.readAsDataURL(file);
  });

  $('#cpd-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const data = {
      title: $('#cf-title').value.trim(),
      date: $('#cf-date').value,
      points: Number($('#cf-points').value) || 0,
      category: $('#cf-category').value,
      location: $('#cf-location').value.trim(),
      notes: $('#cf-notes').value.trim(),
    };

    let rec;
    if (state.editingCpdId) {
      rec = state.cpdRecords.find(x => x.id === state.editingCpdId);
      Object.assign(rec, data);
    } else {
      rec = { id: uid(), createdAt: Date.now(), hasAttachment: false, ...data };
      state.cpdRecords.push(rec);
    }

    const done = () => {
      saveCpdRecords();
      showScreen('cpd-screen');
      renderAll();
    };

    if (state.pendingFile) {
      rec.hasAttachment = true;
      idbPut({ id: rec.id, ...state.pendingFile }).then(done).catch(done);
    } else if (state.removeAttachment) {
      rec.hasAttachment = false;
      idbDelete(rec.id).then(done).catch(done);
    } else {
      done();
    }
  });

  $('#cpd-cancel-btn').addEventListener('click', () => { showScreen('cpd-screen'); renderAll(); });
  $('#cpd-delete-btn').addEventListener('click', () => {
    const id = state.editingCpdId;
    state.cpdRecords = state.cpdRecords.filter(r => r.id !== id);
    saveCpdRecords();
    idbDelete(id).catch(() => {});
    showScreen('cpd-screen');
    renderAll();
  });

  // ---------- CPD settings ----------
  $('#cpd-settings-form').addEventListener('submit', ev => {
    ev.preventDefault();
    state.cpdSettings = {
      startDate: $('#cs-start').value,
      target: Number($('#cs-target').value) || 10,
    };
    saveCpdSettings();
    renderAll();
    showScreen('cpd-screen');
  });

  // ---------- settings ----------
  function renderSettings() {
    $$('.seg-btn[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === LANG));
    if (state.cpdSettings) {
      $('#cs-start').value = state.cpdSettings.startDate;
      $('#cs-target').value = state.cpdSettings.target;
    } else if (!$('#cs-start').value) {
      $('#cs-start').value = todayStr();
      $('#cs-target').value = 10;
    }
    const listEl = $('#type-list');
    listEl.innerHTML = '';
    state.types.forEach(type => {
      const used = state.entries
        .filter(e => e.typeId === type.id && new Date(e.start).getFullYear() === new Date().getFullYear())
        .reduce((sum, e) => sum + Number(e.days), 0);
      const li = document.createElement('li');
      li.className = 'type-item';
      const metaText = type.unlimited ? t('dashUnlimited') : `${used} / ${type.entitlement}`;
      li.innerHTML = `<span class="ti-name">${typeLabel(type)}</span><span class="ti-meta">${metaText}</span>`;
      li.addEventListener('click', () => openTypeForm(type.id));
      listEl.appendChild(li);
    });
  }

  $$('.seg-btn[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      applyI18n();
      renderAll();
    });
  });

  $('#clear-data-btn').addEventListener('click', () => {
    if (!confirm(t('clearDataConfirm'))) return;
    ['lt_types', 'lt_entries', 'lt_reminders', 'lt_cpd_settings', 'lt_cpd_records']
      .forEach(k => localStorage.removeItem(k));
    idbClear().catch(() => {});
    load();
    showScreen('dashboard-screen');
    renderAll();
  });

  // ---------- leave type form ----------
  function openTypeForm(typeId) {
    state.editingTypeId = typeId || null;
    if (typeId) {
      const ty = typeById(typeId);
      $('#type-form-title').textContent = ty[LANG] || ty.en;
      $('#tf-name-en').value = ty.en;
      $('#tf-name-zh').value = ty.zh;
      $('#tf-entitlement').value = ty.entitlement;
      $('#tf-unlimited').checked = !!ty.unlimited;
      $('#type-delete-btn').hidden = false;
    } else {
      $('#type-form-title').textContent = t('addTypeTitle');
      $('#type-form').reset();
      $('#tf-entitlement').value = 0;
      $('#type-delete-btn').hidden = true;
    }
    toggleEntitlementField();
    showScreen('type-form-screen');
  }
  function toggleEntitlementField() {
    $('#tf-entitlement').disabled = $('#tf-unlimited').checked;
  }
  $('#tf-unlimited').addEventListener('change', toggleEntitlementField);

  $('#add-type-btn').addEventListener('click', () => openTypeForm(null));

  $('#type-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = {
      en: $('#tf-name-en').value.trim(),
      zh: $('#tf-name-zh').value.trim(),
      entitlement: Number($('#tf-entitlement').value) || 0,
      unlimited: $('#tf-unlimited').checked,
    };
    if (state.editingTypeId) {
      const ty = typeById(state.editingTypeId);
      Object.assign(ty, data);
    } else {
      state.types.push({ id: uid(), ...data });
    }
    saveTypes();
    showScreen('settings-screen');
    renderAll();
  });
  $('#type-cancel-btn').addEventListener('click', () => { showScreen('settings-screen'); renderAll(); });
  $('#type-delete-btn').addEventListener('click', () => {
    if (!confirm(t('deleteTypeConfirm'))) return;
    state.entries = state.entries.filter(e => e.typeId !== state.editingTypeId);
    state.types = state.types.filter(ty => ty.id !== state.editingTypeId);
    saveTypes();
    saveEntries();
    showScreen('settings-screen');
    renderAll();
  });

  // ---------- add choice (FAB) ----------
  $('#add-btn').addEventListener('click', () => {
    const current = $$('.screen').find(s => !s.hidden);
    if (current && current.id === 'leave-screen') { openLeaveForm(null); return; }
    if (current && current.id === 'reminders-screen') { openReminderForm(null); return; }
    if (current && current.id === 'cpd-screen') { openCpdForm(null); return; }
    $('#add-choice-modal').hidden = false;
  });
  $('#add-choice-close-btn').addEventListener('click', () => { $('#add-choice-modal').hidden = true; });
  $('#add-choice-modal').addEventListener('click', (ev) => { if (ev.target.id === 'add-choice-modal') $('#add-choice-modal').hidden = true; });
  $('#add-choice-leave').addEventListener('click', () => { $('#add-choice-modal').hidden = true; openLeaveForm(null); });
  $('#add-choice-cpd').addEventListener('click', () => { $('#add-choice-modal').hidden = true; openCpdForm(null); });
  $('#add-choice-reminder').addEventListener('click', () => { $('#add-choice-modal').hidden = true; openReminderForm(null); });

  // ---------- render all ----------
  function renderAll() {
    applyI18n();
    renderDashboard();
    renderLeaveScreen();
    renderCpd();
    renderReminders();
    renderSettings();
  }

  // ---------- init ----------
  load();
  applyI18n();
  renderAll();
  showScreen('dashboard-screen');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
