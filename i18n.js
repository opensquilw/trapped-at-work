// ---------- language state ----------
let LANG = localStorage.getItem('lt_lang') || 'en';

function setLang(l) {
  LANG = l;
  localStorage.setItem('lt_lang', l);
}

// ---------- static UI strings ----------
const STRINGS = {
  appTitle: { en: 'Trapped At Work', zh: '打工仔失自由' },
  navDashboard: { en: 'Home', zh: '主頁' },
  navLeave: { en: 'Leave', zh: '假期' },
  navCpd: { en: 'CPD', zh: '進修' },
  navReminders: { en: 'Reminders', zh: '提醒' },

  // Dashboard
  dashLeaveTitle: { en: 'Leave balance', zh: '假期結餘' },
  dashLeaveEmpty: { en: 'No leave types set up. Add one in Settings.', zh: '未設有假期類別，請於設定新增。' },
  dashDaysUsed: { en: 'days used', zh: '日已用' },
  dashUnlimited: { en: 'no limit set', zh: '無設上限' },
  dashRemindersTitle: { en: 'Upcoming reminders', zh: '即將到期提醒' },
  dashRemindersEmpty: { en: 'No reminders yet. Tap + to add one.', zh: '暫時未有提醒，撳「＋」新增。' },
  dashSeeAll: { en: 'See all', zh: '查看全部' },
  dashUpcomingLeaveTitle: { en: 'Upcoming leave', zh: '未來假期' },
  dashUpcomingLeaveEmpty: { en: 'No upcoming leave logged.', zh: '未有已排定的假期。' },
  addChoiceTitle: { en: 'What do you want to add?', zh: '想新增乜嘢？' },
  addChoiceLeave: { en: 'Log leave', zh: '記錄假期' },
  addChoiceReminder: { en: 'Add reminder', zh: '新增提醒' },
  addChoiceCpd: { en: 'Add CPD record', zh: '新增進修記錄' },
  addChoiceLicence: { en: 'Add licence renewal', zh: '新增執照續期' },
  addChoicePlanned: { en: 'Add upcoming course', zh: '新增即將參加課程' },
  dashExpiringTitle: { en: 'Expiring soon', zh: '即將到期' },
  dashCpdTitle: { en: 'CPD progress', zh: '進修進度' },
  dashCpdSetup: { en: 'Set your CPD start date in Settings to begin.', zh: '請先於設定填寫進修開始日期。' },

  // Leave screen
  leaveHistoryTitle: { en: 'Leave history', zh: '假期記錄' },
  leaveHistoryEmpty: { en: 'No leave logged for this year. Tap + to add one.', zh: '今年未有假期記錄，撳「＋」新增。' },
  leaveFormTitleAdd: { en: 'Log Leave', zh: '記錄假期' },
  leaveFormTitleEdit: { en: 'Edit Leave', zh: '編輯假期記錄' },
  fLeaveType: { en: 'Leave type', zh: '假期類別' },
  fStartDate: { en: 'Start date', zh: '開始日期' },
  fEndDate: { en: 'End date', zh: '結束日期' },
  fDays: { en: 'Days', zh: '日數' },
  fDaysHint: { en: 'Auto-filled from dates — adjust for half days.', zh: '按日期自動計算，可自行調整半日假。' },
  fNote: { en: 'Note (optional)', zh: '備註（可選）' },
  btnSave: { en: 'Save', zh: '儲存' },
  btnCancel: { en: 'Cancel', zh: '取消' },
  btnDelete: { en: 'Delete', zh: '刪除' },

  // Reminders screen
  remindersEmpty: { en: 'No reminders yet. Tap + to add one.', zh: '暫時未有提醒，撳「＋」新增。' },
  remindersDoneTitle: { en: 'Completed', zh: '已完成' },
  reminderFormTitleAdd: { en: 'Add Reminder', zh: '新增提醒' },
  reminderFormTitleEdit: { en: 'Edit Reminder', zh: '編輯提醒' },
  fTitle: { en: 'Title', zh: '標題' },
  fDueDate: { en: 'Due date', zh: '到期日' },
  overdueBadge: { en: 'Overdue', zh: '已逾期' },
  todayBadge: { en: 'Today', zh: '今日' },
  remindersTasksTitle: { en: 'Tasks', zh: '待辦事項' },

  // Licences / renewals
  licencesTitle: { en: 'Licences & renewals', zh: '執照與續期' },
  licencesEmpty: { en: 'No licences tracked yet.', zh: '未有執照記錄。' },
  licenceFormTitleAdd: { en: 'Add Licence', zh: '新增執照' },
  licenceFormTitleEdit: { en: 'Edit Licence', zh: '編輯執照' },
  fLicenceName: { en: 'Licence / certificate name', zh: '執照／證書名稱' },
  fLicenceAuthority: { en: 'Issuing body', zh: '發證機構' },
  fLicenceExpiry: { en: 'Next expiry date', zh: '下次到期日' },
  fLicenceInterval: { en: 'Renew every', zh: '續期週期' },
  intervalMonths6: { en: 'Every 6 months', zh: '每 6 個月' },
  intervalMonths12: { en: 'Every year', zh: '每年' },
  intervalMonths24: { en: 'Every 2 years', zh: '每 2 年' },
  intervalMonths36: { en: 'Every 3 years', zh: '每 3 年' },
  licenceRenewedBtn: { en: 'Mark renewed', zh: '標記已續期' },
  licenceRenewedConfirm: { en: 'Roll the expiry date forward by one renewal period?', zh: '將到期日順延一個續期週期？' },
  expiredBadge: { en: 'Expired', zh: '已過期' },
  expiringBadge: { en: 'Expiring soon', zh: '即將到期' },
  daysLeftSuffix: { en: 'days left', zh: '日後到期' },

  // Planned courses
  plannedTitle: { en: 'Upcoming courses', zh: '即將參加嘅課程' },
  plannedEmpty: { en: 'Nothing planned yet. Tap + to add a course you are signed up for.', zh: '未有已計劃嘅課程，撳「＋」新增。' },
  plannedFormTitleAdd: { en: 'Add Upcoming Course', zh: '新增課程' },
  plannedFormTitleEdit: { en: 'Edit Upcoming Course', zh: '編輯課程' },
  fPlannedTitle: { en: 'Course / event name', zh: '課程／活動名稱' },
  fPlannedDate: { en: 'Date', zh: '日期' },
  fPlannedTime: { en: 'Start time (optional)', zh: '開始時間（可選）' },
  fPlannedLink: { en: 'Link (registration / joining URL)', zh: '連結（報名／參加網址）' },
  fPlannedOrganizer: { en: 'Organizer', zh: '主辦機構' },
  fPlannedPoints: { en: 'Expected points (optional)', zh: '預計分數（可選）' },
  fPlannedComments: { en: 'Comments', zh: '備註' },
  openLinkBtn: { en: 'Open link', zh: '開啟連結' },
  markAttendedBtn: { en: 'Mark attended → log it', zh: '已出席 → 記錄落去' },
  markAttendedHint: { en: 'This creates a CPD record from the course details, then removes it from the upcoming list.', zh: '會用課程資料建立一筆進修記錄，並從即將參加清單移除。' },

  // Calendar export
  calendarTitle: { en: 'Calendar reminders', zh: '日曆提醒' },
  calendarHint: {
    en: 'A web app cannot send you notifications when it is closed. Add these to your phone\'s Calendar instead — it will alert you properly, even months ahead.',
    zh: '網頁應用程式喺閂咗嘅時候係無法發送通知。將呢啲加入手機日曆，就算幾個月後都會準時提你。',
  },
  addToCalendarBtn: { en: 'Add to calendar', zh: '加入日曆' },
  exportAllCalBtn: { en: 'Add all to calendar', zh: '全部加入日曆' },
  calNothing: { en: 'Nothing to add to the calendar yet.', zh: '暫時未有可加入日曆嘅項目。' },
  alarmNote: { en: 'Alerts are set for 2 months, 2 weeks and 1 day before each licence expiry, and 1 week and 1 day before each course.', zh: '執照到期前 2 個月、2 星期及 1 日各有提示；課程則於 1 星期及 1 日前提示。' },

  // CPD screen
  cpdPtsLabel: { en: 'pts', zh: '分' },
  cpdSetupPrompt: { en: 'Set your CPD start date in Settings to begin.', zh: '請先於設定填寫進修開始日期。' },
  cpdStatTotal: { en: 'Total pts since start', zh: '開始至今總分' },
  cpdStatCycles: { en: 'Cycles tracked', zh: '已記錄週期' },
  cpdStatDays: { en: 'Days left this cycle', zh: '本週期剩餘日數' },
  cpdPastCycles: { en: 'Past cycles', zh: '過往週期' },
  cpdRecordsTitle: { en: 'CPD records', zh: '進修記錄' },
  cpdRecordsEmpty: { en: 'No CPD records yet. Tap + to add your first one.', zh: '暫時未有進修記錄，撳「＋」新增。' },
  cpdSearchPlaceholder: { en: 'Search records…', zh: '搜尋記錄⋯' },
  cpdAllCycles: { en: 'All cycles', zh: '全部週期' },
  badgeMet: { en: 'Met', zh: '達標' },
  badgeShort: { en: 'Short', zh: '未達標' },
  cpdFormTitleAdd: { en: 'Add CPD Record', zh: '新增進修記錄' },
  cpdFormTitleEdit: { en: 'Edit CPD Record', zh: '編輯進修記錄' },
  fCpdTitle: { en: 'What (activity / topic)', zh: '活動／主題' },
  fCpdDate: { en: 'When', zh: '日期' },
  fCpdPoints: { en: 'Points', zh: '分數' },
  fCpdCategory: { en: 'Category', zh: '類別' },
  fCpdLocation: { en: 'Where (venue / organizer)', zh: '地點／主辦機構' },
  fCpdFile: { en: 'Proof of approval / attendance (optional)', zh: '核准／出席證明（可選）' },
  cpdFileTooBig: { en: 'That file is larger than 8MB. Please choose a smaller one.', zh: '檔案超過 8MB，請選擇較細的檔案。' },
  detailOpen: { en: 'Open', zh: '開啟' },
  detailEdit: { en: 'Edit', zh: '編輯' },
  detailDate: { en: 'Date', zh: '日期' },
  detailPoints: { en: 'Points', zh: '分數' },
  detailWhere: { en: 'Where', zh: '地點' },
  detailNotes: { en: 'Notes', zh: '備註' },
  cpdBeforeStart: { en: 'Dated before your tracking start date — not counted toward totals.', zh: '此記錄早於進修開始日期，不會計入總分。' },

  // Settings
  settingsTitle: { en: 'Settings', zh: '設定' },
  settingsCpdTitle: { en: 'CPD cycles', zh: '進修週期' },
  cyclesHint: {
    en: 'Each rule runs from its start date until the next rule begins. If your cycle length changes, add a second rule starting on that date — earlier cycles keep their old length.',
    zh: '每條規則由其開始日期生效，直至下一條規則開始。如果週期長度有變，只需新增一條由該日起計嘅規則，之前嘅週期會保留原有長度。',
  },
  addCycleRuleBtn: { en: '+ Add cycle rule', zh: '＋ 新增週期規則' },
  cycleRuleFormAdd: { en: 'Add Cycle Rule', zh: '新增週期規則' },
  cycleRuleFormEdit: { en: 'Edit Cycle Rule', zh: '編輯週期規則' },
  fRuleStart: { en: 'Cycle start date', zh: '週期開始日期' },
  ruleStartHint: { en: 'The first day of the cycle, e.g. 1 July 2025.', zh: '週期嘅第一日，例如 2025 年 7 月 1 日。' },
  fRuleMonths: { en: 'Cycle length', zh: '週期長度' },
  len6m: { en: '6 months', zh: '6 個月' },
  len1y: { en: '1 year', zh: '1 年' },
  len2y: { en: '2 years', zh: '2 年' },
  len3y: { en: '3 years', zh: '3 年' },
  len4y: { en: '4 years', zh: '4 年' },
  len5y: { en: '5 years', zh: '5 年' },
  fRuleTarget: { en: 'Points required in this cycle', zh: '此週期所需分數' },
  ruleFromLabel: { en: 'From', zh: '由' },
  cycleRuleDeleteConfirm: { en: 'Delete this cycle rule?', zh: '刪除此週期規則？' },
  cycleRuleNeedOne: { en: 'Add a cycle rule to start tracking your points.', zh: '請新增週期規則以開始計算分數。' },
  fCpdStart: { en: 'CPD tracking start date', zh: '進修記錄開始日期' },
  cpdStartHint: { en: 'Your CPD year renews every 12 months from this date\'s month and day.', zh: '進修年度由此日期的月／日起，每 12 個月更新一次。' },
  fCpdTarget: { en: 'Annual point target', zh: '每年目標分數' },
  saveCpdSettings: { en: 'Save CPD settings', zh: '儲存進修設定' },

  // Import
  settingsImportTitle: { en: 'Import CPD records', zh: '匯入進修記錄' },
  importHint: {
    en: 'Load records from a .json file, or paste the data below. Existing records are kept — anything already logged on the same date with the same title is skipped.',
    zh: '可由 .json 檔案匯入記錄，或喺下面貼上資料。原有記錄會保留，日期同名稱一樣嘅重複記錄會自動略過。',
  },
  importFileLabel: { en: 'Choose a .json file', zh: '選擇 .json 檔案' },
  importPasteLabel: { en: 'Or paste the data here', zh: '或喺呢度貼上資料' },
  importReplace: { en: 'Replace all existing CPD records instead of merging', zh: '取代所有現有進修記錄（而非合併）' },
  importReplaceConfirm: { en: 'This will delete every CPD record already on this device and replace them with the imported ones. Continue?', zh: '此操作會刪除本機所有現有進修記錄，並以匯入嘅記錄取代，確定繼續？' },
  importBtn: { en: 'Import records', zh: '匯入記錄' },
  importNothing: { en: 'Choose a file or paste the data first.', zh: '請先選擇檔案或貼上資料。' },
  importBadJson: { en: 'Could not read that — it does not look like valid JSON.', zh: '無法讀取，格式似乎唔係有效嘅 JSON。' },
  importNoRecords: { en: 'No usable records found in that data.', zh: '資料中找不到可用嘅記錄。' },
  importedLabel: { en: 'imported', zh: '已匯入' },
  skippedLabel: { en: 'skipped as duplicates', zh: '重複而略過' },
  settingsLanguage: { en: 'Language', zh: '語言' },
  settingsLeaveTypesTitle: { en: 'Leave types', zh: '假期類別' },
  settingsLeaveTypesHint: { en: 'Set each type\'s annual entitlement, or mark it unlimited to just track usage.', zh: '為每個假期類別設定每年可享日數，或設為「無上限」只記錄使用量。' },
  fTypeNameEn: { en: 'Name (English)', zh: '名稱（英文）' },
  fTypeNameZh: { en: 'Name (中文)', zh: '名稱（中文）' },
  fEntitlement: { en: 'Annual entitlement (days)', zh: '每年可享日數' },
  fUnlimited: { en: 'Unlimited (don\'t cap)', zh: '無上限（唔設上限）' },
  addTypeBtn: { en: '+ Add leave type', zh: '＋ 新增假期類別' },
  addTypeTitle: { en: 'Add Leave Type', zh: '新增假期類別' },
  deleteTypeConfirm: { en: 'Delete this leave type and all its logged entries?', zh: '刪除此假期類別及所有相關記錄？' },
  dangerZone: { en: 'Danger zone', zh: '危險區域' },
  clearDataBtn: { en: 'Erase all data', zh: '清除所有資料' },
  clearDataConfirm: { en: 'This will permanently erase all leave records, reminders, CPD records and settings on this device. Continue?', zh: '此操作將永久刪除本機所有假期記錄、提醒、進修記錄及設定，確定繼續？' },
  footnoteLocal: { en: 'All data stays on this device only — nothing is uploaded to a server.', zh: '所有資料只存於本機裝置，不會上傳伺服器。' },
};

// ---------- CPD categories (bilingual) ----------
// Formal written Chinese here rather than casual Cantonese — this is the
// clinical/professional half of the app.
const CPD_CATEGORIES = [
  { id: 'conference', en: 'Conference', zh: '會議／研討會' },
  { id: 'course', en: 'Course / Workshop', zh: '課程／工作坊' },
  { id: 'seminar', en: 'Seminar / Lecture', zh: '講座／講課' },
  { id: 'online', en: 'Online / E-learning', zh: '網上學習' },
  { id: 'clinical', en: 'Clinical Meeting / Case Discussion', zh: '臨床會議／個案討論' },
  { id: 'journal', en: 'Journal Club', zh: '期刊研讀會' },
  { id: 'selfstudy', en: 'Self-directed Study', zh: '自主進修' },
  { id: 'other', en: 'Other', zh: '其他' },
];

function cpdCatLabel(id) {
  const c = CPD_CATEGORIES.find(x => x.id === id);
  return c ? (c[LANG] || c.en) : id;
}

function t(key) {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[LANG] || entry.en;
}

function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}
