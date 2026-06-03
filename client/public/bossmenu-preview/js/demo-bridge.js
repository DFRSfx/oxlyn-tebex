/* ==========================================================================
 *  OXLYN-BOSSMENU | Website Live-Preview bridge
 * ==========================================================================
 *  In the real resource, the NUI is driven by:
 *    1. the FiveM game client, which posts  {action:'open', config, locales}
 *    2. the Lua server, which answers NUI callbacks  fetch('https://oxlyn-bossmenu/<name>')
 *
 *  Neither exists in a browser. This bridge plays both roles so the exact
 *  same html/css/js can run, fully interactive, on the website:
 *    • builds a mock `config`/`locales` payload (mirrors client/main.lua
 *      buildPayload + config.lua) and posts the boot message,
 *    • overrides window.fetch to intercept every NUI callback and serve
 *      in-memory mock data ported 1:1 from server/showcase.lua.
 *
 *  Reset on reload — exactly like the resource's showcase mode.
 * ========================================================================== */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  //  Company definition (config.lua → Config.Companies['police'])
  // ------------------------------------------------------------------
  var COMPANY = {
    id: 'police',
    name: 'Los Santos Police Department',
    shortName: 'LSPD',
    job: 'police',
    bossGrades: [4],
    color: 'linear-gradient(135deg,#0ea5e9,#1e40af)',
    ranks: [
      { name: 'Cadet',      label: 'Cadet',      grade: 0, salary: 600 },
      { name: 'Officer',    label: 'Officer',    grade: 1, salary: 1000 },
      { name: 'Sergeant',   label: 'Sergeant',   grade: 2, salary: 1500 },
      { name: 'Lieutenant', label: 'Lieutenant', grade: 3, salary: 2200 },
      { name: 'Chief',      label: 'Chief',      grade: 4, salary: 3500 },
    ],
  };

  var BOSS = { identifier: 'showcase:boss', name: 'Alex Carter', grade: 4 };

  // ------------------------------------------------------------------
  //  In-memory state (config.lua → Config.Showcase)
  // ------------------------------------------------------------------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = {
    company: COMPANY,
    ranks: clone(COMPANY.ranks),
    balance: 152480,
    bossIdentifier: BOSS.identifier,
    employees: [
      // The signed-in boss, always first (showcase.getPlayerInfo behaviour)
      { identifier: BOSS.identifier,    name: BOSS.name,          grade: 4, online: true,  source: 0 },
      { identifier: 'showcase:emp_01',  name: 'James Wilson',     grade: 3, online: true  },
      { identifier: 'showcase:emp_02',  name: 'Sarah Mitchell',   grade: 3, online: false },
      { identifier: 'showcase:emp_03',  name: 'Michael Brown',    grade: 2, online: true  },
      { identifier: 'showcase:emp_04',  name: 'Emily Davis',      grade: 2, online: true  },
      { identifier: 'showcase:emp_05',  name: 'David Thompson',   grade: 1, online: false },
      { identifier: 'showcase:emp_06',  name: 'Jessica Anderson', grade: 1, online: true  },
      { identifier: 'showcase:emp_07',  name: 'Robert Garcia',    grade: 1, online: false },
      { identifier: 'showcase:emp_08',  name: 'Olivia Martinez',  grade: 1, online: true  },
      { identifier: 'showcase:emp_09',  name: 'Daniel Walker',    grade: 0, online: true  },
      { identifier: 'showcase:emp_10',  name: 'Sophia Lewis',     grade: 0, online: false },
    ],
    candidates: [
      { source: 901, identifier: 'showcase:cand_01', name: 'Liam Carter',    job: 'unemployed', jobLabel: 'Unemployed' },
      { source: 902, identifier: 'showcase:cand_02', name: 'Ava Roberts',    job: 'unemployed', jobLabel: 'Unemployed' },
      { source: 903, identifier: 'showcase:cand_03', name: 'Noah Hughes',    job: 'unemployed', jobLabel: 'Unemployed' },
      { source: 904, identifier: 'showcase:cand_04', name: 'Mia Phillips',   job: 'mechanic',   jobLabel: 'Mechanic' },
      { source: 905, identifier: 'showcase:cand_05', name: 'Ethan Foster',   job: 'taxi',       jobLabel: 'Taxi Driver' },
      { source: 906, identifier: 'showcase:cand_06', name: 'Isabella Clark', job: 'unemployed', jobLabel: 'Unemployed' },
      { source: 907, identifier: 'showcase:cand_07', name: 'Lucas Reed',     job: 'unemployed', jobLabel: 'Unemployed' },
    ],
    shifts: [],
    nextShiftId: 1,
    shiftsGenerated: false,
  };

  // ------------------------------------------------------------------
  //  Helpers (ported from showcase.lua)
  // ------------------------------------------------------------------
  function findEmployeeIndex(identifier) {
    for (var i = 0; i < state.employees.length; i++) {
      if (state.employees[i].identifier === identifier) return i;
    }
    return -1;
  }
  function findCandidateIndex(sourceOrIdent) {
    var s = String(sourceOrIdent);
    for (var i = 0; i < state.candidates.length; i++) {
      if (String(state.candidates[i].source) === s || state.candidates[i].identifier === s) return i;
    }
    return -1;
  }
  function sortedEmployees() {
    var list = state.employees.slice();
    list.sort(function (a, b) {
      if (a.grade !== b.grade) return b.grade - a.grade;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function nowSecs() { return Math.floor(Date.now() / 1000); }
  function isoLocal(epochSecs) {
    var d = new Date(epochSecs * 1000);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function parseIsoLocal(iso) {
    var m = /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/.exec(iso || '');
    if (!m) return null;
    return Math.floor(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() / 1000);
  }

  function genTimesheet() {
    if (state.shiftsGenerated) return;
    state.shiftsGenerated = true;
    var i, e;
    // Open shifts for everyone currently online (20min–3h elapsed)
    for (i = 0; i < state.employees.length; i++) {
      e = state.employees[i];
      if (e.online) {
        var startEpoch = nowSecs() - randInt(20 * 60, 180 * 60);
        state.shifts.push({
          id: state.nextShiftId++, identifier: e.identifier, name: e.name, grade: e.grade,
          in_time: isoLocal(startEpoch), out_time: null, secs: nowSecs() - startEpoch,
        });
      }
    }
    // 2–4 finished shifts per employee over the last 7 days
    for (i = 0; i < state.employees.length; i++) {
      e = state.employees[i];
      var count = randInt(2, 4);
      for (var k = 0; k < count; k++) {
        var daysAgo = randInt(1, 7);
        var s = nowSecs() - daysAgo * 86400 + randInt(8 * 3600, 16 * 3600);
        var dur = randInt(2 * 3600, 8 * 3600);
        var end = s + dur;
        if (end < nowSecs()) {
          state.shifts.push({
            id: state.nextShiftId++, identifier: e.identifier, name: e.name, grade: e.grade,
            in_time: isoLocal(s), out_time: isoLocal(end), secs: dur,
          });
        }
      }
    }
    state.shifts.sort(function (a, b) { return a.in_time > b.in_time ? -1 : 1; });
  }
  function refreshOpenShifts() {
    var now = nowSecs();
    state.shifts.forEach(function (s) {
      if (!s.out_time) {
        var epoch = parseIsoLocal(s.in_time);
        if (epoch) s.secs = Math.max(0, now - epoch);
      }
    });
  }

  // ------------------------------------------------------------------
  //  NUI callback handlers — keyed by the name company.js/app.js fetch.
  //  Each returns the SHAPE company.js expects (i.e. the value the Lua
  //  RegisterNUICallback `cb(...)` would send — see client/main.lua).
  // ------------------------------------------------------------------
  var handlers = {
    ready: function () { return {}; },
    close: function () {
      // Nothing to close to on a website — re-open after the close animation
      // so the preview is never left blank (acts as a soft reset).
      setTimeout(bootOS, 380);
      return {};
    },

    getCompanyData: function () {
      return { balance: state.balance, employees: sortedEmployees(), ranks: state.ranks };
    },
    getCompanySettings: function () { return { allowedGrades: {}, tabAccess: {} }; },
    setCompanySettings: function () { return { ok: true }; },

    listPlayers: function () { return { players: state.candidates }; },

    hirePlayer: function (d) {
      var idx = findCandidateIndex(d.source);
      if (idx === -1) return { ok: false };
      var cand = state.candidates.splice(idx, 1)[0];
      state.employees.push({
        identifier: cand.identifier, source: cand.source, name: cand.name,
        grade: parseInt(d.grade, 10) || 0, online: true,
      });
      return { ok: true };
    },
    setGrade: function (d) {
      var idx = findEmployeeIndex(d.identifier);
      if (idx === -1) return { ok: false };
      state.employees[idx].grade = parseInt(d.grade, 10) || 0;
      return { ok: true };
    },
    firePlayer: function (d) {
      var idx = findEmployeeIndex(d.identifier);
      if (idx === -1) return { ok: false };
      if (d.identifier === state.bossIdentifier) return { ok: false }; // never fire the boss
      state.employees.splice(idx, 1);
      return { ok: true };
    },
    setGradeSalary: function (d) {
      var grade = parseInt(d.grade, 10), salary = parseInt(d.salary, 10);
      if (isNaN(grade) || isNaN(salary) || salary < 0) return { ok: false };
      for (var i = 0; i < state.ranks.length; i++) {
        if (state.ranks[i].grade === grade) { state.ranks[i].salary = salary; return { ok: true }; }
      }
      return { ok: false };
    },

    depositMoney: function (d) {
      var amount = parseInt(d.amount, 10) || 0;
      if (amount <= 0) return { ok: false, error: 'invalid_amount' };
      state.balance += amount;
      return { ok: true };
    },
    withdrawMoney: function (d) {
      var amount = parseInt(d.amount, 10) || 0;
      if (amount <= 0) return { ok: false, error: 'invalid_amount' };
      if (state.balance < amount) return { ok: false, error: 'insufficient_society' };
      state.balance -= amount;
      return { ok: true };
    },
    payBonus: function (d) {
      var amount = parseInt(d.amount, 10) || 0;
      if (amount <= 0) return { ok: false, error: 'invalid_amount' };
      if (findEmployeeIndex(d.identifier) === -1) return { ok: false, error: 'not_member' };
      if (state.balance < amount) return { ok: false, error: 'insufficient_society' };
      state.balance -= amount;
      return { ok: true };
    },

    addRank: function (d) {
      var grade = parseInt(d.grade, 10);
      var label = String(d.label || '').slice(0, 60);
      var salary = parseInt(d.salary, 10) || 0;
      if (isNaN(grade) || grade < 0 || label === '' || salary < 0) return { ok: false, error: 'invalid' };
      for (var i = 0; i < state.ranks.length; i++) {
        if (state.ranks[i].grade === grade) return { ok: false, error: 'grade_exists' };
      }
      var internal = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || ('grade' + grade);
      state.ranks.push({ name: internal, label: label, grade: grade, salary: salary });
      state.ranks.sort(function (a, b) { return a.grade - b.grade; });
      return { ok: true };
    },
    updateRankLabel: function (d) {
      var grade = parseInt(d.grade, 10);
      var label = String(d.label || '').slice(0, 60);
      if (isNaN(grade) || label === '') return { ok: false };
      for (var i = 0; i < state.ranks.length; i++) {
        if (state.ranks[i].grade === grade) { state.ranks[i].label = label; return { ok: true }; }
      }
      return { ok: false };
    },
    deleteRank: function (d) {
      var grade = parseInt(d.grade, 10);
      if (isNaN(grade)) return { ok: false, error: 'invalid' };
      if (COMPANY.bossGrades.indexOf(grade) !== -1) return { ok: false, error: 'is_boss_grade' };
      var count = 0;
      state.employees.forEach(function (e) { if (e.grade === grade) count++; });
      if (count > 0) return { ok: false, error: 'has_members', count: count };
      for (var i = 0; i < state.ranks.length; i++) {
        if (state.ranks[i].grade === grade) { state.ranks.splice(i, 1); return { ok: true }; }
      }
      return { ok: false };
    },

    // ---- Timesheet ----
    getTimesheet: function () {
      genTimesheet(); refreshOpenShifts();
      return { shifts: state.shifts, isBoss: true, myIdentifier: state.bossIdentifier };
    },
    clockIn: function (d) {
      genTimesheet();
      var target = (d.identifier && d.identifier !== '') ? d.identifier : state.bossIdentifier;
      if (!target) return { ok: false, error: 'no_id' };
      for (var i = 0; i < state.shifts.length; i++) {
        if (state.shifts[i].identifier === target && !state.shifts[i].out_time) {
          return { ok: false, error: 'already_open' };
        }
      }
      var idx = findEmployeeIndex(target);
      var emp = idx !== -1 ? state.employees[idx] : null;
      state.shifts.unshift({
        id: state.nextShiftId++, identifier: target,
        name: emp ? emp.name : 'Employee', grade: emp ? emp.grade : 0,
        in_time: isoLocal(nowSecs()), out_time: null, secs: 0,
      });
      if (emp) emp.online = true;
      return { ok: true };
    },
    clockOut: function (d) {
      var shiftId = parseInt(d.shiftId, 10);
      if (isNaN(shiftId)) return { ok: false, error: 'no_id' };
      for (var i = 0; i < state.shifts.length; i++) {
        var s = state.shifts[i];
        if (s.id === shiftId) {
          if (s.out_time) return { ok: false, error: 'already_closed' };
          var start = parseIsoLocal(s.in_time) || nowSecs();
          var now = nowSecs();
          s.out_time = isoLocal(now);
          s.secs = Math.max(0, now - start);
          return { ok: true };
        }
      }
      return { ok: false, error: 'not_found' };
    },
    clearTimesheet: function () {
      state.shifts = []; state.nextShiftId = 1; state.shiftsGenerated = true;
      return { ok: true };
    },
  };

  // ------------------------------------------------------------------
  //  fetch override — intercept ONLY the NUI callbacks; everything else
  //  (e.g. loading locales/en.json) passes straight through.
  // ------------------------------------------------------------------
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  var NUI_RE = /^https?:\/\/(?:oxlyn-bossmenu|cfx-nui-oxlyn-bossmenu)\/(.+)$/i;

  window.fetch = function (url, opts) {
    var u = (typeof url === 'string') ? url : (url && url.url) || '';
    var m = NUI_RE.exec(u);
    if (!m) {
      if (realFetch) return realFetch(url, opts);
      return Promise.reject(new Error('fetch unavailable'));
    }
    var name = m[1];
    var body = {};
    try { if (opts && opts.body) body = JSON.parse(opts.body); } catch (_) {}

    var result;
    try {
      result = handlers[name] ? handlers[name](body) : {};
    } catch (err) {
      console.error('[bossmenu-preview] handler error for "' + name + '":', err);
      result = {};
    }

    // Small artificial latency so optimistic UI / spinners read naturally.
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(new Response(JSON.stringify(result == null ? {} : result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }, 90);
    });
  };

  // ------------------------------------------------------------------
  //  Boot payload (mirrors client/main.lua buildPayload + config.lua)
  // ------------------------------------------------------------------
  function buildConfig() {
    // Apps: ship the company app pre-installed + on the desktop so the
    // preview lands on a populated OxlynOS desktop. The rest are installed
    // too, so the dock looks complete and visitors can explore.
    var apps = [
      { id: 'appstore',          name: 'app_name_appstore',          enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'settings',          name: 'app_name_settings',          enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'calculator',        name: 'app_name_calculator',        enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'companyManagement', name: 'app_name_companyManagement', enabled: true, installed: true, showInDock: true,  showOnDesktop: true  },
      { id: 'browser',           name: 'app_name_browser',           enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'calendar',          name: 'app_name_calendar',          enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'clock',             name: 'app_name_clock',             enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'notes',             name: 'app_name_notes',             enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
      { id: 'reminders',         name: 'app_name_reminders',         enabled: true, installed: true, showInDock: true,  showOnDesktop: false },
    ];

    var store = {
      apps: [
        { id: 'companyManagement', name: 'app_name_companyManagement', developer: 'Oxlyn Software', category: 'app_category_companyManagement', description: 'Manage your company: employees, finances, inventory and settings — all in a single panel.', rating: 4.8, ratings: 1247, size: '32 MB', featured: true, tag: 'editor' },
        { id: 'browser',   name: 'app_name_browser',   developer: 'Oxlyn Software', category: 'app_category_browser',   description: 'Fast and simple browser for your intranet, with city favorites pre-configured.', rating: 4.6, ratings: 892, size: '124 MB', featured: true, tag: 'trending' },
        { id: 'calculator',name: 'app_name_calculator',developer: 'Oxlyn Software', category: 'app_category_calculator',description: 'Basic calculations and percentages.', rating: 4.5, ratings: 412, size: '8 MB' },
        { id: 'calendar',  name: 'app_name_calendar',  developer: 'Oxlyn Software', category: 'app_category_calendar',  description: 'View the current month, navigate dates and mark important appointments.', rating: 4.4, ratings: 356, size: '22 MB' },
        { id: 'clock',     name: 'app_name_clock',     developer: 'Oxlyn Software', category: 'app_category_clock',     description: 'World clock, stopwatch and timer in one place.', rating: 4.3, ratings: 245, size: '15 MB' },
        { id: 'settings',  name: 'app_name_settings',  developer: 'Oxlyn Software', category: 'app_category_settings',  description: 'Customize your system, wallpaper and more.', rating: 4.7, ratings: 1024 },
        { id: 'notes',     name: 'app_name_notes',     developer: 'Oxlyn Software', category: 'app_category_notes',     description: 'Take quick notes, pin your favorites and search through history.', rating: 4.7, ratings: 678, size: '18 MB', featured: true, tag: 'new' },
        { id: 'reminders', name: 'app_name_reminders', developer: 'Oxlyn Software', category: 'app_category_reminders', description: 'To-do lists with dates, priorities and multiple customizable lists.', rating: 4.8, ratings: 543, size: '14 MB', tag: 'new' },
        { id: 'appstore',  name: 'app_name_appstore',  developer: 'Oxlyn Software', category: 'app_category_appstore',  description: 'Discover and install new apps.', hidden: true },
      ],
    };

    return {
      system: { name: 'OxlynOS', version: '15.2 Sequoia' },
      account: {
        name: BOSS.name,
        avatar: 'img/avatar.png',
        requirePassword: false,        // smooth one-click sign-in into the desktop
        acceptAnyPassword: true,
        password: '',
        showPasswordText: true,
        testHint: '',
        loginButton: 'app_login_button',
        wrongPasswordMsg: 'app_login_wrong_password_msg',
      },
      wallpaper: 'img/wallpaper.jpg',
      wallpapers: [
        { name: 'Default',   value: 'img/wallpaper.jpg' },
        { name: 'Aurora',    value: 'linear-gradient(135deg, #2a1f5c 0%, #4a1f7c 50%, #1a1240 100%)' },
        { name: 'Twilight',  value: 'linear-gradient(160deg, #ff6b6b 0%, #ff9f6b 40%, #6f4cdc 100%)' },
        { name: 'Ocean',     value: 'linear-gradient(180deg, #0a3d62 0%, #006266 50%, #04293a 100%)' },
        { name: 'Forest',    value: 'linear-gradient(180deg, #134e4a 0%, #1a3a2a 100%)' },
        { name: 'Charcoal',  value: 'linear-gradient(180deg, #2a2a2e 0%, #0a0a0c 100%)' },
        { name: 'Solar',     value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
        { name: 'Nebula',    value: 'radial-gradient(ellipse at 30% 30%, #ff7e6b 0%, transparent 45%), radial-gradient(ellipse at 70% 70%, #6f4cdc 0%, transparent 50%), #1a1240' },
      ],
      cursorStyle: 'macos',
      apps: apps,
      store: store,
      browser: {
        searchEngine: 'browser_search_engine',
        placeholder: 'browser_search_placeholder',
        fakeMessage: 'browser_fake_message',
        homepageTitle: 'browser_homepage_title',
        homepageSubtitle: 'browser_homepage_subtitle',
        suggestions: ['Los Santos News', 'LSC Stock Quote', 'Bleeter', 'LifeInvader', 'Weazel News'],
      },
      calculator: { decimalSeparator: '.', maxDecimals: 8 },
      // Player's company + role (from showcase.getPlayerInfo)
      company: COMPANY,
      playerId: BOSS.identifier,
      playerName: BOSS.name,
      isBoss: true,
      myAccess: 'full',
      myGrade: 4,
      settings: { allowedGrades: {}, tabAccess: {} },
    };
  }

  var LOCALES = {};

  function bootOS() {
    window.postMessage({ action: 'open', config: buildConfig(), locales: LOCALES }, '*');
  }

  // Load the English locale (same file the resource ships), then boot.
  function start() {
    var done = false;
    function go() { if (done) return; done = true; document.getElementById('os-root'); bootOS(); }

    if (realFetch) {
      realFetch('locales/en.json')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (json) { LOCALES = json || {}; })
        .catch(function () { /* fall back to built-in PT strings */ })
        .then(go);
    } else {
      go();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
