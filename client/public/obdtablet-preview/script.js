/* =============================================
   OXLYN OBD TABLET II - NUI v6
   - Font Awesome icons
   - Branding via Config
   - Auto-scanner apos boot se desligado
   - Tudo defensivo (null-safe)
   ============================================= */

const RESOURCE = 'oxlyn-obdtablet';
const root = document.getElementById('root');

/* DEFAULTS em ENGLISH - fallback final se uma key nao existir no locale ativo.
   Estes valores apenas sao usados quando o locale escolhido nao tem uma key.
   Os textos da UI vem do locale Lua (en.lua, pt.lua, etc.) atraves do data-i18n
   e do t() function. */
const LOCALE_DEFAULTS = {
    // System / Errors
    no_permission:       'You do not have permission to use this tablet.',
    not_in_vehicle:      'You must be in the vehicle to use the OBD-II port.',
    no_vehicle:          'No vehicle detected.',
    no_player:           'Player not found.',
    engine_running:      'Turn off the engine before reprogramming.',
    not_enough_money:    'Not enough money.',
    item_required:       'You need an OBD Tablet to use this.',
    error_generic:       'An unexpected error occurred.',
    invalid_data:        'Invalid data sent to ECU.',
    invalid_reprogram:   'Unknown reprogramming map.',
    disconnected:        'OBD-II cable disconnected.',
    lost_connection:     'Connection to ECU lost.',
    notify_need_connect: 'Connect the OBD-II cable first.',
    // Cable
    cable_align_hint:    'Drag the connector to the OBD-II port.',
    cable_align_ok:      'Pins aligned',
    cable_align_bad:     'Pins misaligned',
    cable_locked:        'Connector locked',
    cable_pick_up:       'Grab the connector',
    cable_hold_lock:     'Hold to lock...',
    cable_locking:       'Locking...',
    cable_pins_label:    'PINS · SAE J1962',
    cable_hint_banner:   'Grab the OBD-II connector and drag it to the port under the steering wheel.',
    btn_close_tablet:    'Close Tablet',
    // Success
    reprogram_applied:   'Reprogram flashed to ECU successfully.',
    reprogram_removed:   'ECU restored to factory parameters.',
    dyno_done:           'Dyno pull complete.',
    connected_ecu:       'Connected to ECU.',
    // Boot
    boot_init:           'INIT OBD-OS',
    boot_kernel:         'kernel v3.4.1 ... OK',
    boot_modules:        'loading modules: can_bus uds_iso14229 kwp2000 j2534 ... OK',
    boot_ready:          'system ready',
    // Home/Hero/App cards
    hero_title:          'OBD Tablet II',
    hero_subtitle:       'OXLYN DIAGNOSTICS · ISO 15765-4 CAN',
    home_search:         'Search functions, modules...',
    home_filters:        'Filters',
    home_section_main:   'Main functions',
    app_scanner:         'Scanner',
    app_scanner_desc:    'Read fault codes across all modules.',
    app_reprograms:      'Reprogram',
    app_reprograms_desc: 'ECU and module reprogramming.',
    app_dyno:            'Dyno',
    app_dyno_desc:       'Vehicle performance testing.',
    app_history:         'History',
    app_history_desc:    'View past records.',
    app_about:           'About',
    app_about_desc:      'System information and support.',
    // Vehicle card
    vc_status_online:    'OBD-II ONLINE',
    vc_status_offline:   'OBD-II OFFLINE',
    vc_view_details:     'View details',
    // Sys panel
    sys_panel_title:     'Vehicle system',
    sys_voltage:         'Battery voltage',
    sys_temperature:     'Engine temperature',
    sys_rpm:             'Engine RPM',
    sys_speed:           'Speed',
    sys_fuel:            'Fuel',
    sys_state:           'Status',
    sys_state_ok:        'No errors',
    sys_state_warn:      'Warnings',
    sys_state_crit:      'Critical',
    sys_state_offline:   'Offline',
    // Dock
    dock_home:           'Home',
    dock_scanner:        'Scanner',
    dock_reprograms:     'Reprogram',
    dock_dyno:           'Dyno',
    dock_history:        'History',
    dock_settings:       'Settings',
    // Connection
    conn_title:          'OBD-II Connection',
    conn_required:       'OBD-II connector not detected',
    conn_action:         'Start Connection',
    conn_connecting:     'Connecting to ECU...',
    conn_connected:      'CONNECTED',
    conn_disconnect:     'End Session',
    conn_usb_detect:     'USB-C OBD-II cable detected',
    conn_voltage:        'Battery voltage',
    conn_protocol_scan:  'Probing supported protocol',
    conn_protocol_found: 'Protocol found',
    conn_iso9141:        'ISO 9141-2: not supported',
    conn_kwp2000:        'KWP2000 (ISO 14230): not supported',
    conn_can_test:       'Testing CAN-H/CAN-L lines',
    conn_can_ok:         'CAN-BUS stabilized',
    conn_baud:           'Baud rate: 500 kbps',
    conn_ecu_handshake:  'Handshaking main ECU',
    conn_ecu_resp:       'ECU responded',
    conn_ecu_id:         'Identifying ECU',
    conn_reading_vin:    'Reading VIN from module',
    conn_reading_dtc:    'Scanning DTC codes',
    conn_dtc_count:      'codes found',
    conn_ready:          'System ready to receive commands',
    conn_misaligned:     'Connector misaligned, try again.',
    conn_label_vin:      'VIN',
    conn_label_fw:       'ECU FW',
    conn_label_map:      'MAP',
    conn_offline_short:  'OFFLINE',
    conn_off:            'OFF',
    conn_ecu_short:      'ECU',
    // Scanner Pro
    sp_modules_title:    'OBD-II Modules',
    sp_full_scan_btn:    'Full Diagnostic',
    sp_scan_idle:        'Awaiting diagnostic',
    sp_scan_start:       'Starting scan...',
    sp_scan_done:        'Diagnostic complete',
    sp_scan_progress:    'Scanning %s...',
    sp_scan_no_codes:    'Diagnostic OK - no codes',
    sp_scan_codes_found: '%d DTC codes found',
    sp_live_title:       'Live Sensors',
    ld_rpm:              'RPM',
    ld_speed:            'Speed',
    ld_coolant:          'Coolant',
    ld_battery:          'Battery',
    ld_fuel:             'Fuel',
    ld_maf:              'MAF',
    ld_throttle:         'Throttle',
    ld_engine_health:    'Engine Health',
    sp_dtc_title:        'DTC Codes',
    sp_dtc_active:       'active',
    sp_dtc_empty:        'No active codes',
    dtc_unknown:         'Unknown code',
    dtc_sev_critical:    'critical',
    dtc_sev_warning:     'warning',
    // Modules
    mod_ecm:             'Engine Control Module',
    mod_tcm:             'Transmission Control',
    mod_abs:             'Anti-lock Braking',
    mod_esp:             'Stability Control',
    mod_bcm:             'Body Control Module',
    mod_srs:             'Supplemental Restraint',
    mod_ipc:             'Instrument Cluster',
    mod_hvac:            'Climate Control',
    // DTC descriptions
    dtc_p0171_desc:      'Fuel system lean (Bank 1)',
    dtc_p0301_desc:      'Cylinder 1 misfire',
    dtc_p0420_desc:      'Catalyst efficiency below threshold',
    dtc_p0463_desc:      'Fuel level sensor erratic',
    dtc_p0700_desc:      'Transmission system fault',
    dtc_u0100_desc:      'Lost communication with ECM',
    dtc_b1342_desc:      'Body module fault (BCM)',
    dtc_c1234_desc:      'Front-left wheel sensor',
    // Reprogram core
    repro_free:          'Free',
    repro_already:       'This map is already flashed on this ECU.',
    repro_confirm:       'Confirm flashing',
    repro_current:       'Active map',
    repro_none:          'Stock (OEM)',
    repro_tunable:       'Configurable',
    repro_needs_conn:    'Connect the tablet to an ECU first.',
    repro_stock:         'OEM', repro_stock_desc: 'Restore the ECU to original manufacturer maps.',
    repro_sport:         'Sport', repro_sport_desc: 'Stage 1: +power, aggressive map.',
    repro_drag:          'Drag', repro_drag_desc: 'Stage 3: limiter removed.',
    repro_drift:         'Drift', repro_drift_desc: 'Drift map, handbrake mapping.',
    repro_eco:           'Eco', repro_eco_desc: 'Efficient map.',
    repro_rally:         'Rally', repro_rally_desc: 'Rally map, anti-lag.',
    repro_custom1:       'Tuner Custom', repro_custom1_desc: 'Extreme custom map.',
    // Connected actions
    sp_btn_reprogram:    'Reprogram ECU',
    sp_btn_dyno:         'Open Dyno',
    // Repro modal
    modal_title_repro:   'Confirm Flash',
    modal_duration:      'Duration',
    modal_warranty:      'Warranty',
    modal_warranty_void: 'Voided',
    modal_warranty_kept: 'Kept',
    modal_fuel:          'Fuel',
    modal_warning_msg:   'Flashing alters the vehicle handling/power. Engine off is recommended.',
    modal_cost_total:    'Total cost',
    btn_confirm_flash:   'Confirm Flash',
    effect_stock_1:      'Restore factory parameters',
    effect_stock_2:      'Original OEM calibration',
    // Custom tuner
    custom_title:        'Custom Tuner',
    custom_subtitle:     'Adjust your custom map parameters',
    custom_label_hp:     'Power (HP)',
    custom_label_topspeed:'Top Speed',
    custom_label_accel:  'Acceleration',
    custom_label_brakes: 'Braking',
    custom_label_grip:   'Grip',
    custom_label_susp:   'Suspension',
    custom_cost:         'Cost:',
    custom_reset:        'Reset',
    custom_apply:        'Save Map',
    custom_applied_desc: 'User-configured map',
    // Flash console (technical - kept identical across locales)
    c_session_open:      '[UDS] Diagnostic session opened (0x10 0x03 Programming)',
    c_sec_seed:          '[UDS] Security Access seed request (0x27 0x01)',
    c_sec_key:           '[UDS] Computing seed/key response... OK',
    c_sec_unlock:        '[UDS] Security unlocked (Level 2)',
    c_routine_start:     '[UDS] Routine 0xFF00 startRoutine: erase memory',
    c_erase_block:       '[FLASH] Erasing block 0x%s ... OK',
    c_write_block:       '[FLASH] Writing block 0x%s (%d bytes)',
    c_checksum:          '[FLASH] Checksum CRC32: %s',
    c_verify:            '[UDS] Routine 0xFF01 checkProgrammingDependencies',
    c_ecu_reset:         '[UDS] ECUReset (0x11 0x01)',
    c_session_close:     '[UDS] Returning to default session (0x10 0x01)',
    c_done:              '[OK] Reprogramming complete. Calibration: %s',
    c_error:             '[ERR] %s',
    // Dyno
    dyno_run:            'Start Pull',
    dyno_running:        'Pull in progress...',
    dyno_idle:           'Standby',
    dyno_hp:             'hp',
    dyno_nm:             'Nm',
    dyno_no_data:        'No data. Start a pull to measure.',
    dyno_peak_label:     'Peak',
    dyno_current_hp:     'Current',
    dyno_stock_hp:       'OEM',
    dyno_gain:           'Gain',
    dyno_torque:         'Torque',
    dyno_peak_rpm:       'Peak RPM',
    dyno_map:            'Current map',
    dyno_power_band:     'Power band',
    dyno_title:          'Dynamometer Bench',
    dyno_needs_conn:     'Connect the tablet to an ECU first.',
    // History
    history_empty:       'No records.',
    history_apply:       'Flash',
    history_reset:       'OEM Reset',
    history_when:        'Date/Time',
    history_plate:       'Plate',
    history_action:      'Operation',
    history_what:        'Map',
    history_who:         'Technician',
    history_tab_this:    'This vehicle',
    history_tab_all:     'All',
    // Settings
    settings_title:      'Settings',
    settings_system:     'System',
    settings_config:     'Configuration',
    settings_config_note:'All settings (language, costs, job restrictions, custom reprograms) are managed in <code>config.lua</code>. Ask your administrator to change them.',
    settings_version:    'Version',
    settings_protocol:   'Protocol',
    settings_cable:      'Cable',
    settings_kernel:     'Kernel',
    settings_manufacturer:'Manufacturer',
    // About
    about_version:       'Version',
    about_protocol:      'Protocol',
    about_cable:         'Cable',
    about_developer:     'Manufacturer',
    about_license:       'License',
    // Generic buttons
    btn_apply:           'Apply',
    btn_cancel:          'Cancel',
    btn_close:           'Close',
    btn_confirm:         'Confirm',
    btn_back:            'Back',
    btn_refresh:         'Refresh',
    // Misc
    repro_title:         'ECU Reprograms',
    ws_stencil:          'DASH HARNESS · J1962',
    // Reprogram highlights (fallback EN)
    hl_sport_1:          '+60% peak power',
    hl_sport_2:          '+35% top speed',
    hl_sport_3:          'Aggressive ignition map',
    hl_sport_4:          'Exhaust pops',
    hl_drag_1:           '+120% drive force',
    hl_drag_2:           '+70% top speed',
    hl_drag_3:           'Launch control mapping',
    hl_drag_4:           'Rev limiter removed',
    hl_drift_1:          '+15% power (slide control focus)',
    hl_drift_2:          '+30% steering lock',
    hl_drift_3:          'Slippery rear (low grip)',
    hl_drift_4:          'Handbrake mapping + aggressive throttle',
    hl_eco_1:            '-58% power',
    hl_eco_2:            '-32% top speed',
    hl_eco_3:            'Smooth throttle response',
    hl_eco_4:            'Reduces consumption ~22%',
    hl_custom1_1:        'Client-configurable',
    hl_custom1_2:        'Power, speed, grip sliders',
    hl_custom1_3:        'Unique map per session',
    // Stock reset highlights
    hl_stock_1:          'Restore factory calibration',
    hl_stock_2:          'Removes all aftermarket maps',
    hl_stock_3:          'OEM warranty compliant',
    // Custom dynamic highlights (formatted via tFmt)
    hl_custom_power:     '+%s%% power',
    hl_custom_speed:     '+%s%% top speed',
    hl_custom_brakes:    '+%s%% braking',
    hl_custom_unique:    'User-tuned map',
};

const state = {
    locale: {},
    localeCode: 'pt',
    reprograms: [],
    config: {},
    branding: {},
    connected: false,
    connecting: false,
    vehicle: null,
    currentMap: 'stock',
    statusPoll: null,
    missCount: 0,
    historyTab: 'this',
    dynoRunning: false,
    lastDyno: null,
    lastDynoPlate: null,
    flashInProgress: false,
    cable: { phase: 'idle', dragging: false, offsetX: 0, offsetY: 0, lockHoldStart: 0 },
};

/* ---------------- UTIL (defensivo) ---------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function $el(sel) { return typeof sel === 'string' ? $(sel) : sel; }
function setText(sel, txt) { const el = $el(sel); if (el) el.textContent = txt; }
function setHTML(sel, html) { const el = $el(sel); if (el) el.innerHTML = html; }
function setStyle(sel, prop, val) { const el = $el(sel); if (el) el.style[prop] = val; }
function setAttr(sel, attr, val) { const el = $el(sel); if (el) el.setAttribute(attr, val); }
function addClass(sel, cls) { const el = $el(sel); if (el) el.classList.add(cls); }
function rmClass(sel, cls) { const el = $el(sel); if (el) el.classList.remove(cls); }
function toggleClass(sel, cls, on) { const el = $el(sel); if (el) el.classList.toggle(cls, !!on); }
function on(sel, ev, fn) { const el = $el(sel); if (el) el.addEventListener(ev, fn); }

function t(key, fallback) {
    if (!key) return fallback || '';
    const v = state.locale[key];
    if (v != null && v !== '') return v;
    if (LOCALE_DEFAULTS[key] != null) return LOCALE_DEFAULTS[key];
    return (fallback != null) ? fallback : key;
}
function tFmt(key, ...args) {
    let s = t(key);
    args.forEach(a => { s = s.replace(/%s|%d/, String(a)); });
    return s;
}
function tReason(reason, fallbackKey) {
    if (!reason) return t(fallbackKey || 'error_generic');
    return t(reason, t(fallbackKey || 'error_generic'));
}

function postNUI(name, data = {}) {
    return fetch(`https://${RESOURCE}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(r => r.json()).catch(() => ({}));
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}
function fmtMoney(v) { return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(); }

/* ---------------- BRANDING (aplica textos do Config.Branding) ---------------- */
function applyBranding() {
    const b = state.branding || {};
    setText('#brand-name', b.name || 'OXLYN');
    setText('#brand-sub',  b.subtitle || 'DIAGNOSTICS');
    setText('#tb-brand',   b.name || 'OXLYN');
    setText('#boot-brand', (b.name || 'OXLYN') + ' Diagnostics');
    setText('#hero-title', b.appTitle || 'OBD Tablet II');
    setText('#hero-sub',   b.appSub || ((b.name || 'OXLYN') + ' DIAGNOSTICS · ISO 15765-4 CAN'));
    setText('#about-developer', b.aboutDeveloper || 'OXLYN Diagnostics');
    setText('#about-license',   b.aboutLicense   || 'Proprietary © OXLYN');
    setText('#settings-developer', b.aboutDeveloper || 'OXLYN Diagnostics');
    // logo "OBD-OS"
    const osName = b.osName || 'OBD-OS';
    const split = osName.split('-');
    const left = split[0] || osName;
    const right = split[1] ? '-' + split[1] : '';
    setHTML('#boot-logo-text', escapeHtml(left) + '<span>' + escapeHtml(right) + '</span>');
    setHTML('#about-logo',     escapeHtml(left) + '<span>' + escapeHtml(right) + '</span>');
    setText('#about-title', osName);
    // Flash console host
    const host = (b.consoleHost || 'root@obd-flasher') + ':~# uds_program --device=/dev/can0 --ecu=ECM';
    setText('#flash-title', host);
}

/* ---------------- LOCALE APPLICATION ---------------- */
/* Aplica todas as traducoes aos elementos do DOM com data-i18n* attributes.
   Suporta:
     data-i18n            -> textContent
     data-i18n-html       -> innerHTML (cuidado: so usado em conteudo confiavel da locale)
     data-i18n-placeholder-> placeholder atributo
     data-i18n-title      -> title atributo
     data-i18n-aria       -> aria-label atributo */
function applyLocale() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) el.setAttribute('title', t(key));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (key) el.setAttribute('aria-label', t(key));
    });
    // Atributo lang do <html>
    if (state.localeCode) document.documentElement.setAttribute('lang', state.localeCode);
}

/* ---------------- NAV ---------------- */
function showView(name) {
    // Tablet nao avanca sem ligacao: enquanto desconectado so 'scanner' e 'boot' sao permitidos.
    if (!state.connected && name !== 'scanner' && name !== 'boot') {
        // tentativa de navegacao sem conexao -> redirecciona para o minigame do cabo
        $$('.view').forEach(v => v.classList.remove('active'));
        addClass('#view-scanner', 'active');
        renderScanner();
        updateDockActive('scanner');
        notify(t('notify_need_connect'), 'warning');
        return;
    }

    $$('.view').forEach(v => v.classList.remove('active'));
    addClass(`#view-${name}`, 'active');

    if (name === 'scanner')    renderScanner();
    if (name === 'reprograms') renderReprograms();
    if (name === 'dyno')       renderDyno();
    if (name === 'history')    loadHistory();
    if (name === 'settings')   renderSettings();

    updateDockActive(name);
}

function updateDockActive(name) {
    $$('.dock-v2-btn, .dock-btn').forEach(b => b.classList.remove('active'));
    $$(`.dock-v2-btn[data-view="${name}"], .dock-btn[data-view="${name}"]`).forEach(b => b.classList.add('active'));
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (btn) {
        if (btn.classList.contains('locked')) return;
        showView(btn.getAttribute('data-view'));
    }
});

on('#btn-close-top',    'click', () => closeTablet());
on('#cable-close-btn',  'click', () => closeTablet());
on('#phys-home',        'click', () => showView('home'));

/* ---------- SEARCH BAR funcional (filtra apps + dock) ---------- */
on('#home-search', 'input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    $$('.app-card').forEach(card => {
        const h = card.querySelector('h3'); const p = card.querySelector('p');
        const txt = ((h && h.textContent) || '').toLowerCase() + ' ' +
                    ((p && p.textContent) || '').toLowerCase();
        const match = !q || txt.includes(q);
        card.style.display = match ? '' : 'none';
    });
});
on('#btn-disconnect','click', async () => {
    await postNUI('disconnect');
    state.connected = false;
    state.vehicle = null;
    state.currentMap = 'stock';
    state.cable.phase = 'idle';
    state.lastDyno = null;
    state.lastDynoPlate = null;
    renderConnectionState('disconnected');
    renderHomeIndicators();
    notify(t('disconnected'), 'info');
});

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTablet(); });

function closeTablet() { postNUI('close'); }

/* ---------------- CLOCK ---------------- */
function updateClock() {
    const n = new Date();
    setText('#clock', `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`);
}
setInterval(updateClock, 30000);

/* ---------------- BOOT ---------------- */
async function boot() {
    showView('boot');
    const bar = $('#boot-bar');
    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0%';
        void bar.offsetWidth;
        bar.style.transition = '';
    }
    $$('.boot-line').forEach(el => { el.classList.remove('visible'); el.textContent = ''; });

    const lines = [
        { id: 'boot-l1', txt: t('boot_init'),    delay: 320 },
        { id: 'boot-l2', txt: t('boot_kernel'),  delay: 420 },
        { id: 'boot-l3', txt: t('boot_modules'), delay: 520 },
        { id: 'boot-l4', txt: t('boot_ready'),   delay: 340 },
    ];
    let pct = 0;
    for (const l of lines) {
        const el = $('#' + l.id);
        if (el) { el.textContent = l.txt; el.classList.add('visible'); }
        await sleep(l.delay);
        pct += 25;
        if (bar) bar.style.width = pct + '%';
    }
    await sleep(280);
    updateClock();
    startStatusPoll();
    // Espera um tick para o status poll obter dados do veiculo
    await sleep(300);
    // Se ja esta conectado abre no lobby. Caso contrario, FORCA o scanner
    // (minigame do cabo) - tablet nao avanca sem ligacao.
    if (state.connected) showView('home');
    else                 showView('scanner');
}

/* ---------------- NOTIFICACOES ---------------- */
function notify(message, ntype = 'info') {
    const stack = $('#notify-stack');
    if (!stack) return;
    const iconMap = {
        info:    'fa-circle-info',
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
    };
    const iconClass = iconMap[ntype] || iconMap.info;
    const el = document.createElement('div');
    el.className = `notif ${ntype}`;
    el.innerHTML = `<div class="ic"><i class="fa-sharp fa-solid ${iconClass}"></i></div><div class="msg">${escapeHtml(message)}</div>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 400);
    }, 4000);
}

/* ---------------- STATUS POLL ---------------- */
function startStatusPoll() {
    if (state.statusPoll) clearInterval(state.statusPoll);
    state.statusPoll = setInterval(pollStatus, 800);
    pollStatus();
}
function stopStatusPoll() {
    if (state.statusPoll) { clearInterval(state.statusPoll); state.statusPoll = null; }
}

async function pollStatus() {
    if (state.flashInProgress) return;
    const r = await postNUI('status');
    if (!r) return;

    const wasIn = state.vehicle && state.vehicle.plate;
    const isIn  = r.inVehicle;
    const plateChanged = isIn && wasIn && r.vehicle && r.vehicle.plate !== state.vehicle.plate;

    if (plateChanged) {
        state.lastDyno = null;
        state.lastDynoPlate = null;
    }

    if (state.connected && (!isIn || plateChanged)) {
        state.missCount = (state.missCount || 0) + 1;
        if (state.missCount >= 2) {
            state.connected = false;
            state.vehicle = null;
            state.currentMap = 'stock';
            state.missCount = 0;
            state.cable.phase = 'idle';
            state.lastDyno = null;
            state.lastDynoPlate = null;
            renderConnectionState();
            renderHomeIndicators();
            notify(t('disconnected'), 'warning');
            const active = $('.view.active');
            if (active && active.id === 'view-scanner') renderScanner();
            if (active && active.id === 'view-reprograms') showView('reprograms');
            if (active && active.id === 'view-dyno')       showView('dyno');
        }
    } else {
        state.missCount = 0;
    }

    if (r.connected && isIn && r.vehicle && !state.connected) {
        state.connected = true;
        state.vehicle = r.vehicle;
        state.currentMap = r.currentMap || 'stock';
        renderConnectionState('connected');
    }

    if (state.connected && r.vehicle) {
        state.vehicle = Object.assign({}, state.vehicle, r.vehicle);
        if (r.currentMap !== undefined) state.currentMap = r.currentMap || 'stock';
        updateConnectedDash();
        updateDynoHeader();
    } else if (!state.connected && r.vehicle) {
        // pre-ligacao: ja temos info do veiculo para mostrar no home
        state.vehicle = r.vehicle;
    }

    renderHomeIndicators();
}

function renderHomeIndicators() {
    const ind  = $('#conn-indicator-home');
    const txt  = $('#conn-text-home');
    const led  = $('#status-led');
    const vcDot    = $('#vc-dot');
    const vcStatus = $('#vc-status');
    const vcPlate  = $('#vc-plate');
    const vcBtnTxt = $('#vc-btn-text');

    if (state.connected) {
        if (ind) ind.classList.add('online');
        if (txt) txt.textContent = t('conn_ecu_short');
        if (led) led.classList.add('online');
        if (vcDot) vcDot.classList.add('online');
        if (vcStatus) { vcStatus.textContent = t('vc_status_online'); vcStatus.style.color = '#4ade80'; }
        if (vcPlate && state.vehicle) vcPlate.textContent = (state.vehicle.plate || '------') + ' · ' + (state.vehicle.model || '').toUpperCase();
        if (vcBtnTxt) vcBtnTxt.textContent = t('vc_view_details');
    } else {
        if (ind) ind.classList.remove('online');
        if (txt) txt.textContent = t('conn_off');
        if (led) led.classList.remove('online');
        if (vcDot) vcDot.classList.remove('online');
        if (vcStatus) { vcStatus.textContent = t('vc_status_offline'); vcStatus.style.color = ''; }
        if (vcPlate) {
            if (state.vehicle && state.vehicle.plate) {
                vcPlate.textContent = state.vehicle.plate + ' · ' + (state.vehicle.model || '').toUpperCase();
            } else {
                vcPlate.textContent = '------ · ----';
            }
        }
        if (vcBtnTxt) vcBtnTxt.textContent = t('conn_action');
    }

    $$('.app-card[data-needs-conn]').forEach(el => {
        el.classList.toggle('locked', !state.connected);
        // Injecta/remove icone FA de cadeado (sem emoji)
        let lockIcon = el.querySelector('.ac-lock');
        if (!state.connected && !lockIcon) {
            lockIcon = document.createElement('i');
            lockIcon.className = 'ac-lock fa-sharp fa-solid fa-lock';
            el.appendChild(lockIcon);
        } else if (state.connected && lockIcon) {
            lockIcon.remove();
        }
    });
    $$('.dock-v2-btn[data-needs-conn]').forEach(el => {
        el.style.opacity = state.connected ? '1' : '.45';
    });

    renderSysPanel();
}

function renderSysPanel() {
    const v = state.vehicle;
    if (!$('#ss-voltage')) return;

    if (state.connected && v) {
        const voltage = (12.3 + (v.engine || 100) / 100 * 0.6).toFixed(1);
        setText('#ss-voltage', voltage + ' V');
        const temp = Math.round(78 + (v.engine || 100) * 0.12);
        setText('#ss-temp', temp + ' °C');
        setText('#ss-rpm',   (v.rpm || 0)   + ' RPM');
        setText('#ss-speed', (v.speed || 0) + ' km/h');
        setText('#ss-fuel',  (v.fuel || 0)  + ' %');
        const stateEl = $('#ss-state');
        const stateIc = $('#ss-state-icon');
        if (stateEl) {
            if ((v.engine || 100) >= 70) {
                stateEl.textContent = t('sys_state_ok');
                stateEl.style.color = '#4ade80';
                if (stateIc) stateIc.className = 'ss-icon ic-green';
            } else if ((v.engine || 100) >= 40) {
                stateEl.textContent = t('sys_state_warn');
                stateEl.style.color = '#fbbf24';
                if (stateIc) stateIc.className = 'ss-icon ic-warn';
            } else {
                stateEl.textContent = t('sys_state_crit');
                stateEl.style.color = '#f43f5e';
                if (stateIc) stateIc.className = 'ss-icon ic-err';
            }
        }
    } else {
        setText('#ss-voltage', '-- V');
        setText('#ss-temp',    '-- °C');
        setText('#ss-rpm',     '-- RPM');
        setText('#ss-speed',   '-- km/h');
        setText('#ss-fuel',    '-- %');
        const stateEl = $('#ss-state');
        if (stateEl) { stateEl.textContent = t('sys_state_offline'); stateEl.style.color = ''; }
    }
}

/* ---------------- SCANNER ---------------- */
function renderScanner() {
    if (state.connected) renderConnectionState('connected');
    else if (state.connecting) renderConnectionState('connecting');
    else renderConnectionState('disconnected');
}

function renderConnectionState(forceState) {
    const ds = $('#conn-screen-disconnected');
    const co = $('#conn-screen-connecting');
    const cn = $('#conn-screen-connected');
    const meta = $('#scanner-status');
    if (ds) ds.style.display = 'none';
    if (co) co.style.display = 'none';
    if (cn) cn.style.display = 'none';

    const s = forceState || (state.connected ? 'connected' : (state.connecting ? 'connecting' : 'disconnected'));
    if (s === 'connected') {
        if (cn) cn.style.display = 'flex';
        if (meta) { meta.textContent = '● ' + t('conn_connected'); meta.style.color = '#4ade80'; }
        updateConnectedDash();
    } else if (s === 'connecting') {
        if (co) co.style.display = 'flex';
        if (meta) { meta.textContent = '... ' + t('conn_connecting'); meta.style.color = '#fbbf24'; }
    } else {
        if (ds) ds.style.display = 'flex';
        if (meta) { meta.textContent = '○ ' + t('conn_offline_short'); meta.style.color = '#7d858d'; }
        resetCableMinigame();
    }
}

/* ================== SCANNER PROFISSIONAL ==================
   Os nomes/descricoes vem dos locales (mod_*, dtc_*_desc).
   sevKey: chave de severidade -> traduzida via t() em runtime. */
const SCANNER_MODULES = [
    { id: 'ECM',  nameKey: 'mod_ecm'  },
    { id: 'TCM',  nameKey: 'mod_tcm'  },
    { id: 'ABS',  nameKey: 'mod_abs'  },
    { id: 'ESP',  nameKey: 'mod_esp'  },
    { id: 'BCM',  nameKey: 'mod_bcm'  },
    { id: 'SRS',  nameKey: 'mod_srs'  },
    { id: 'IPC',  nameKey: 'mod_ipc'  },
    { id: 'HVAC', nameKey: 'mod_hvac' },
];
const DTC_LIBRARY = {
    P0171: { descKey: 'dtc_p0171_desc', sevKey: 'dtc_sev_warning'  },
    P0301: { descKey: 'dtc_p0301_desc', sevKey: 'dtc_sev_critical' },
    P0420: { descKey: 'dtc_p0420_desc', sevKey: 'dtc_sev_warning'  },
    P0463: { descKey: 'dtc_p0463_desc', sevKey: 'dtc_sev_warning'  },
    P0700: { descKey: 'dtc_p0700_desc', sevKey: 'dtc_sev_critical' },
    U0100: { descKey: 'dtc_u0100_desc', sevKey: 'dtc_sev_critical' },
    B1342: { descKey: 'dtc_b1342_desc', sevKey: 'dtc_sev_warning'  },
    C1234: { descKey: 'dtc_c1234_desc', sevKey: 'dtc_sev_warning'  },
};
let scannerBuilt = false;
let scanRunning = false;

function buildModulesList() {
    const list = $('#modules-list');
    if (!list || scannerBuilt) return;
    list.innerHTML = SCANNER_MODULES.map(m => `
        <div class="module-item" data-mod="${m.id}">
            <div class="m-dot"></div>
            <div class="m-id">${m.id}</div>
            <div class="m-name">${escapeHtml(t(m.nameKey))}</div>
            <div class="m-result">--</div>
        </div>
    `).join('');
    scannerBuilt = true;
}

function resetScanner() {
    const list = $('#modules-list');
    if (list) list.querySelectorAll('.module-item').forEach(it => {
        it.classList.remove('scanning','ok','error');
        const r = it.querySelector('.m-result');
        if (r) r.textContent = '--';
    });
    setStyle('#scan-progress-fill', 'width', '0%');
    setText('#scan-progress-label', t('sp_scan_idle'));
}

async function runDiagnosticScan() {
    if (scanRunning) return;
    scanRunning = true;
    const btn = $('#btn-full-scan');
    if (btn) btn.disabled = true;
    resetScanner();
    setText('#scan-progress-label', t('sp_scan_start'));
    await sleep(300);

    const v = state.vehicle || {};
    const engineHp = v.engine || 100;
    const fuelLvl  = v.fuel   || 100;
    const bodyHp   = v.body   || 100;

    // Decide quais modulos vao dar erro baseado na saude
    const moduleErrors = {};
    if (engineHp < 60) { moduleErrors.ECM = ['P0301', 'P0420', 'P0171']; }
    else if (engineHp < 80) { moduleErrors.ECM = ['P0171']; }
    if (fuelLvl < 15) { moduleErrors.IPC = ['P0463']; }
    if (bodyHp < 50)  { moduleErrors.BCM = ['B1342']; }
    if (engineHp < 30) { moduleErrors.TCM = ['P0700']; moduleErrors.ECM = (moduleErrors.ECM || []).concat(['U0100']); }

    const total = SCANNER_MODULES.length;
    for (let i = 0; i < total; i++) {
        const m = SCANNER_MODULES[i];
        const item = document.querySelector(`.module-item[data-mod="${m.id}"]`);
        if (item) {
            item.classList.add('scanning');
            const r = item.querySelector('.m-result');
            if (r) r.textContent = 'SCAN';
        }
        setText('#scan-progress-label', tFmt('sp_scan_progress', m.id));
        const pct = ((i + 1) / total) * 100;
        setStyle('#scan-progress-fill', 'width', pct.toFixed(0) + '%');
        await sleep(450 + Math.random() * 250);
        if (item) {
            item.classList.remove('scanning');
            const hasErr = !!moduleErrors[m.id];
            item.classList.add(hasErr ? 'error' : 'ok');
            const r = item.querySelector('.m-result');
            if (r) r.textContent = hasErr ? 'FAULT' : 'OK';
        }
    }

    setText('#scan-progress-label', t('sp_scan_done'));
    setStyle('#scan-progress-fill', 'width', '100%');

    // Popula DTCs
    const allDtcs = [];
    Object.entries(moduleErrors).forEach(([modId, codes]) => {
        codes.forEach(c => allDtcs.push({ code: c, module: modId, ...DTC_LIBRARY[c] }));
    });
    renderDtcsList(allDtcs);

    if (btn) btn.disabled = false;
    scanRunning = false;
    notify(allDtcs.length === 0 ? t('sp_scan_no_codes') : tFmt('sp_scan_codes_found', allDtcs.length), allDtcs.length === 0 ? 'success' : 'warning');
}

function renderDtcsList(dtcs) {
    const list = $('#dtcs-list');
    const count = $('#dtc-count');
    if (!list) return;
    if (!dtcs || dtcs.length === 0) {
        list.innerHTML = `
            <div class="dtc-empty">
                <i class="fa-sharp fa-solid fa-circle-check"></i>
                <span>${escapeHtml(t('sp_dtc_empty'))}</span>
            </div>`;
        if (count) { count.textContent = '0 ' + t('sp_dtc_active'); count.classList.remove('has-codes'); }
        return;
    }
    list.innerHTML = dtcs.map(d => {
        const desc = d.descKey ? t(d.descKey) : (d.desc || t('dtc_unknown'));
        const sev  = d.sevKey  ? t(d.sevKey)  : (d.sev  || t('dtc_sev_warning'));
        const isCritical = (d.sevKey === 'dtc_sev_critical') || (d.sev === 'critico') || (d.sev === 'critical');
        return `
        <div class="dtc-item ${isCritical ? 'severe' : ''}">
            <div class="dtc-code">${escapeHtml(d.code)}</div>
            <div class="dtc-desc">${escapeHtml(desc)}</div>
            <div class="dtc-sev">${escapeHtml(sev)} · ${escapeHtml(d.module || '')}</div>
        </div>`;
    }).join('');
    if (count) {
        count.textContent = dtcs.length + ' ' + t('sp_dtc_active');
        count.classList.add('has-codes');
    }
}

on('#btn-full-scan', 'click', () => runDiagnosticScan());

function updateLiveData() {
    const v = state.vehicle;
    if (!v || !$('#ld-rpm')) return;
    // Live values
    const rpm   = v.rpm   || 0;
    const speed = v.speed || 0;
    const fuel  = v.fuel  || 0;
    const engine = v.engine || 0;
    const coolant = Math.round(78 + engine * 0.12);
    const battery = (12.3 + engine / 100 * 0.6).toFixed(1);
    const throttle = Math.max(0, Math.min(100, Math.round((rpm / 70) - 8)));
    const maf      = (1.5 + (rpm / 1000) * 1.2 + Math.random() * 0.3).toFixed(1);

    setHTML('#ld-rpm',      `${rpm}`);
    setHTML('#ld-speed',    `${speed} <small>km/h</small>`);
    setHTML('#ld-coolant',  `${coolant} <small>°C</small>`);
    setHTML('#ld-battery',  `${battery} <small>V</small>`);
    setHTML('#ld-fuel',     `${fuel} <small>%</small>`);
    setHTML('#ld-maf',      `${maf} <small>g/s</small>`);
    setHTML('#ld-throttle', `${throttle} <small>%</small>`);
    setHTML('#ld-engine',   `${engine} <small>%</small>`);
}

function updateConnectedDash() {
    const v = state.vehicle;
    if (!v) return;

    // Build modules list (first time only)
    buildModulesList();

    // Vehicle header
    setText('#conn-plate',  v.plate || '------');
    setText('#conn-vin',    v.vin   || '-');
    setText('#conn-fw',     v.fw    || '-');
    setText('#conn-model',  (v.model || '-').toUpperCase());
    setText('#conn-class',  v.className || '-');

    const mapTxt = (state.currentMap === 'stock' || !state.currentMap) ? 'OEM' : t('repro_' + state.currentMap, state.currentMap).toUpperCase();
    setText('#conn-map', mapTxt);

    // Live data refresh
    updateLiveData();
}

/* =============================================
   CABLE MINIGAME
   ============================================= */
const CM = {
    stage: null, plug: null, port: null,
    cablePath: null, cableCore: null, cableShadow: null,
    lockBarFill: null, pinIndicators: null, rafId: null,
};

function resetCableMinigame() {
    state.cable.phase = 'idle';
    state.cable.dragging = false;
    state.cable.lockHoldStart = 0;

    const stage = $('#plug-stage');
    const plug  = $('#plug');
    const port  = $('#obd-port');
    if (!stage || !plug || !port) return;

    stage.classList.remove('dragging','lockHold');
    plug.classList.remove('locked','aligned','in-port');
    port.classList.remove('armed','armed-bad','locked');

    const sr = stage.getBoundingClientRect();
    if (sr.width === 0) { requestAnimationFrame(resetCableMinigame); return; }
    const initX = sr.width - 220;
    const initY = sr.height / 2 - 50;
    plug.style.left = initX + 'px';
    plug.style.top  = initY + 'px';
    plug.style.right = 'auto';
    plug.style.transform = 'none';

    if (CM.pinIndicators) CM.pinIndicators.forEach(el => el.classList.remove('on','close'));
    if (CM.lockBarFill) CM.lockBarFill.style.width = '0%';
    setText('#hud-pin-count', '0/16');

    drawCable();
    updateAlignment();
}

function buildPinIndicators() {
    const container = $('#pin-indicator-strip');
    if (!container) return;
    container.innerHTML = '';
    CM.pinIndicators = [];
    for (let i = 0; i < 16; i++) {
        const el = document.createElement('span');
        el.className = 'pin-dot';
        container.appendChild(el);
        CM.pinIndicators.push(el);
    }
}

function initCableMinigame() {
    const stage = $('#plug-stage');
    const plug  = $('#plug');
    const port  = $('#obd-port');
    if (!stage || !plug || !port) return;
    CM.stage = stage; CM.plug = plug; CM.port = port;
    CM.cablePath   = $('#cable-path');
    CM.cableCore   = $('#cable-path-core');
    CM.cableShadow = $('#cable-path-shadow');
    CM.lockBarFill = $('#lock-bar-fill');
    buildPinIndicators();
    on(plug, 'mousedown', onPlugDown);
    document.addEventListener('mousemove', onPlugMove);
    document.addEventListener('mouseup',   onPlugUp);
    plug.addEventListener('touchstart', e => {
        if (!e.touches || !e.touches[0]) return;
        onPlugDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: () => e.preventDefault() });
    });
    document.addEventListener('touchmove', e => {
        if (!e.touches || !e.touches[0] || !state.cable.dragging) return;
        onPlugMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    });
    document.addEventListener('touchend', onPlugUp);
    requestAnimationFrame(() => resetCableMinigame());
    window.addEventListener('resize', () => {
        if (state.cable.phase === 'idle') resetCableMinigame();
    });
}

function onPlugDown(e) {
    if (state.connecting || state.connected || state.cable.phase === 'locked') return;
    state.cable.dragging = true;
    state.cable.phase = 'dragging';
    CM.stage && CM.stage.classList.add('dragging');
    const pr = CM.plug.getBoundingClientRect();
    state.cable.offsetX = e.clientX - pr.left;
    state.cable.offsetY = e.clientY - pr.top;
    if (e.preventDefault) e.preventDefault();
}

function onPlugMove(e) {
    if (!state.cable.dragging || state.cable.phase === 'locked') return;
    const sr = CM.stage.getBoundingClientRect();
    const pw = CM.plug.offsetWidth, ph = CM.plug.offsetHeight;
    let nx = e.clientX - sr.left - state.cable.offsetX;
    let ny = e.clientY - sr.top  - state.cable.offsetY;
    nx = clamp(nx, 8, sr.width  - pw - 8);
    ny = clamp(ny, 8, sr.height - ph - 8);
    CM.plug.style.left = nx + 'px';
    CM.plug.style.top  = ny + 'px';
    drawCable();
    updateAlignment();
    const snap = checkSnap();
    if (snap.canLock) {
        if (state.cable.phase !== 'lockHold') {
            state.cable.phase = 'lockHold';
            state.cable.lockHoldStart = performance.now();
            CM.stage.classList.add('lockHold');
        }
    } else if (state.cable.phase === 'lockHold') {
        state.cable.phase = 'dragging';
        state.cable.lockHoldStart = 0;
        CM.stage.classList.remove('lockHold');
        if (CM.lockBarFill) CM.lockBarFill.style.width = '0%';
    }
}

function onPlugUp() {
    if (!state.cable.dragging) return;
    state.cable.dragging = false;
    if (state.cable.phase === 'locked') return;
    CM.stage && CM.stage.classList.remove('dragging','lockHold');
    if (state.cable.phase === 'lockHold') {
        const elapsed = performance.now() - state.cable.lockHoldStart;
        state.cable.phase = 'idle';
        state.cable.lockHoldStart = 0;
        if (CM.lockBarFill) CM.lockBarFill.style.width = '0%';
        if (elapsed > 350) { lockCableAndConnect(); return; }
        notify(t('conn_misaligned'), 'warning');
        return;
    }
    const snap = checkSnap();
    if (snap.nearPort && !snap.canLock) {
        notify(t('conn_misaligned'), 'warning');
    }
}

function cableLoop(now) {
    if (state.cable.phase === 'lockHold' && state.cable.dragging) {
        const elapsed = now - state.cable.lockHoldStart;
        const LOCK_TIME = (state.config && state.config.cableLockHoldMs) || 800;
        const pct = clamp(elapsed / LOCK_TIME, 0, 1);
        if (CM.lockBarFill) CM.lockBarFill.style.width = (pct * 100).toFixed(0) + '%';
        if (pct >= 1) lockCableAndConnect();
    }
    CM.rafId = requestAnimationFrame(cableLoop);
}

function getPlugTipPos() {
    if (!CM.plug || !CM.stage) return { x: 0, y: 0 };
    const sr = CM.stage.getBoundingClientRect();
    const pr = CM.plug.getBoundingClientRect();
    return { x: pr.left - sr.left + 20, y: pr.top - sr.top + pr.height / 2 };
}
function getPortMouthPos() {
    if (!CM.port || !CM.stage) return { x: 0, y: 0 };
    const sr = CM.stage.getBoundingClientRect();
    const r  = CM.port.getBoundingClientRect();
    return { x: r.left - sr.left + r.width - 4, y: r.top - sr.top + 50 };
}
function checkSnap() {
    const tip = getPlugTipPos(), mouth = getPortMouthPos();
    const dx = tip.x - mouth.x;
    const dy = Math.abs(tip.y - mouth.y);
    return { nearPort: dx >= -10 && dx <= 100, closeX: dx >= -8 && dx <= 55, aligned: dy <= 18, canLock: (dx >= -8 && dx <= 55) && dy <= 18, dx, dy };
}

function updateAlignment() {
    const ai = $('#align-indicator');
    const aiF = $('#ai-bar-fill');
    const aiL = $('#ai-label');
    if (!CM.port || !CM.plug || !ai) return;
    const snap = checkSnap();
    let intensity = 0;
    if (snap.nearPort) {
        const dxNorm = clamp(1 - (Math.max(0, snap.dx) / 100), 0, 1);
        const dyNorm = clamp(1 - (snap.dy / 60), 0, 1);
        intensity = dxNorm * 0.55 + dyNorm * 0.45;
    }
    if (aiF) aiF.style.width = (intensity * 100).toFixed(0) + '%';
    ai.classList.remove('ok','mid','bad');
    CM.port.classList.remove('armed','armed-bad');
    CM.plug.classList.remove('aligned','in-port');
    let lit = 0;
    if (snap.canLock) {
        ai.classList.add('ok');
        if (aiL) aiL.textContent = state.cable.phase === 'lockHold' ? t('cable_locking') : t('cable_hold_lock');
        CM.port.classList.add('armed');
        CM.plug.classList.add('aligned','in-port');
        lit = 16;
    } else if (snap.nearPort && snap.closeX && !snap.aligned) {
        ai.classList.add('mid');
        if (aiL) aiL.textContent = t('cable_align_bad');
        CM.port.classList.add('armed-bad');
        lit = Math.round(intensity * 16);
    } else if (snap.nearPort) {
        ai.classList.add('mid');
        if (aiL) aiL.textContent = t('cable_align_ok');
        lit = Math.round(intensity * 16);
    } else {
        ai.classList.add('bad');
        if (aiL) aiL.textContent = state.cable.phase === 'dragging' ? t('cable_align_bad') : t('cable_pick_up');
    }
    lightPins(lit);
    setText('#hud-pin-count', lit + '/16');
}

function lightPins(count) {
    if (!CM.pinIndicators) return;
    CM.pinIndicators.forEach((el, i) => {
        el.classList.toggle('on', i < count);
        el.classList.toggle('close', i >= count && i < count + 3);
    });
}

function drawCable() {
    if (!CM.cablePath) return;
    const tip = getPlugTipPos(), mouth = getPortMouthPos();
    const sx = mouth.x, sy = mouth.y, ex = tip.x, ey = tip.y;
    const dx = ex - sx;
    const dist = Math.sqrt(dx * dx + (ey - sy) ** 2);
    const sag = clamp(dist * 0.22, 22, 110);
    const c1x = sx + Math.max(dx, 40) * 0.35, c1y = sy + sag;
    const c2x = ex - Math.max(dx, 40) * 0.35, c2y = ey + sag;
    const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    if (CM.cableShadow) CM.cableShadow.setAttribute('d', d);
    CM.cablePath.setAttribute('d', d);
    if (CM.cableCore) CM.cableCore.setAttribute('d', d);
}

function lockCableAndConnect() {
    if (state.cable.phase === 'locked') return;
    state.cable.phase = 'locked';
    state.cable.dragging = false;
    CM.stage && CM.stage.classList.remove('dragging','lockHold');
    if (!CM.plug || !CM.port) return;
    CM.plug.classList.add('locked');
    CM.port.classList.add('locked','armed');
    const mouth = getPortMouthPos();
    const pr = CM.plug.getBoundingClientRect();
    CM.plug.style.left = (mouth.x - 20) + 'px';
    CM.plug.style.top  = (mouth.y - pr.height / 2) + 'px';
    drawCable();
    lightPins(16);
    const flash = $('#lock-flash');
    if (flash) { flash.classList.add('show'); setTimeout(() => flash.classList.remove('show'), 600); }
    notify(t('cable_locked'), 'success');
    setTimeout(() => beginConnectFromPlug(), 360);
}

async function beginConnectFromPlug() {
    const r = await postNUI('canConnect');
    if (!r || !r.ok) {
        notify(tReason(r && r.reason, 'not_in_vehicle'), 'error');
        setTimeout(() => resetCableMinigame(), 350);
        return;
    }
    await runConnectionSequence(r.vehicle);
}

async function runConnectionSequence(vehicleData) {
    state.connecting = true;
    renderConnectionState('connecting');
    const stepsEl = $('#conn-steps');
    if (stepsEl) stepsEl.innerHTML = '';
    const pushStep = async (cls, txt, wait = 220) => {
        if (!stepsEl) return;
        const el = document.createElement('div');
        el.className = 'step';
        el.innerHTML = `<span class="${cls}">${escapeHtml(txt)}</span>`;
        stepsEl.appendChild(el);
        stepsEl.scrollTop = stepsEl.scrollHeight;
        await sleep(30);
        el.classList.add('visible');
        await sleep(wait);
    };
    const rndHex = (n = 2) => {
        let s = ''; const c = '0123456789ABCDEF';
        for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)];
        return s;
    };
    const voltage = (12.3 + Math.random() * 0.6).toFixed(2);

    await pushStep('info', '> ' + t('conn_usb_detect'));
    await pushStep('raw',  '  [USB-PD] 5V/3A negotiated');
    await pushStep('ok',   '  ' + t('conn_voltage') + ': ' + voltage + ' V');
    await pushStep('raw',  '  [ELM327] AT Z (reset) ... OK');
    await pushStep('raw',  '  [ELM327] ATE0 ATH1 ATSP0');
    await pushStep('info', '> ' + t('conn_protocol_scan'));
    await pushStep('warn', '  ' + t('conn_iso9141'));
    await pushStep('warn', '  ' + t('conn_kwp2000'));
    await pushStep('info', '  ' + t('conn_can_test'));
    await pushStep('raw',  '  [CAN] tx 0x7DF 02 01 00');
    await pushStep('raw',  '  [CAN] rx 0x7E8 06 41 00 BE 3E F8 11');
    await pushStep('ok',   '  ' + t('conn_can_ok') + ' @ ' + t('conn_baud'));
    await pushStep('ok',   '  ' + t('conn_protocol_found') + ': ISO 15765-4 (CAN 11bit)');
    await pushStep('info', '> ' + t('conn_ecu_handshake'));
    await pushStep('raw',  '  [CAN] tx 0x7E0 02 10 01');
    await pushStep('raw',  '  [CAN] rx 0x7E8 06 50 01 00 32 01 F4');
    await pushStep('ok',   '  ' + t('conn_ecu_resp') + ' (0x' + rndHex(4) + ')');
    await pushStep('info', '  ' + t('conn_ecu_id') + ': ' + (vehicleData.fw || 'ECM-X1'));
    await pushStep('info', '> ' + t('conn_reading_vin'));
    await pushStep('ok',   '  VIN = ' + (vehicleData.vin || '------'));
    const dtcCount = Math.floor(Math.random() * 3);
    await pushStep('info', '> ' + t('conn_reading_dtc'));
    if (dtcCount === 0) await pushStep('ok', '  0 ' + t('conn_dtc_count'));
    else await pushStep('warn', '  ' + dtcCount + ' ' + t('conn_dtc_count'));
    await pushStep('ok', '> ' + t('conn_ready'));
    await pushStep('ok', '> ' + t('connected_ecu'));

    const r2 = await postNUI('connect');
    if (!r2 || !r2.ok) {
        notify(tReason(r2 && r2.reason, 'error_generic'), 'error');
        state.connecting = false;
        state.cable.phase = 'idle';
        renderConnectionState('disconnected');
        return;
    }
    state.connecting = false;
    state.connected  = true;
    state.vehicle    = r2.vehicle;
    state.currentMap = r2.currentMap || 'stock';
    state.missCount  = 0;
    renderHomeIndicators();
    notify(t('connected_ecu'), 'success');
    // Directo para o lobby (sem flash do dashboard scanner intermediario)
    showView('home');
}

/* ---------------- REPROGRAMS ---------------- */
function renderReprograms() {
    if (!state.connected) {
        setStyle('#repro-needs-conn', 'display', 'flex');
        setStyle('#repro-grid', 'display', 'none');
        return;
    }
    setStyle('#repro-needs-conn', 'display', 'none');
    setStyle('#repro-grid', 'display', 'grid');

    const grid = $('#repro-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Traduz um highlight: se for uma key de locale usa o valor, senao usa o literal.
    const trHl = (h) => t(h, h);

    const renderCard = (id, label, desc, color, cost, highlights) => {
        const card = document.createElement('div');
        card.className = 'repro-card';
        card.style.setProperty('--c', color || '#9aa3ad');
        if (state.currentMap === id) card.classList.add('current');
        let hlHtml = '';
        if (highlights && highlights.length) {
            hlHtml = '<ul class="repro-hl">' + highlights.slice(0, 4).map(h => `<li>${escapeHtml(trHl(h))}</li>`).join('') + '</ul>';
        }
        card.innerHTML = `
            <span class="badge" style="background:${color || '#9aa3ad'}">${escapeHtml(label)}</span>
            <h3>${escapeHtml(label)}</h3>
            <p>${escapeHtml(desc)}</p>
            ${hlHtml}
            <div class="cost">${cost > 0 ? fmtMoney(cost) : escapeHtml(t('repro_free'))}</div>
        `;
        card.addEventListener('click', () => openConfirm({ id, label, description: desc, cost }));
        return card;
    };

    // Cria card. Mapas com tunable=true abrem o configurador de sliders.
    const makeCard = (id, label, desc, color, cost, highlights, tunable) => {
        const card = document.createElement('div');
        card.className = 'repro-card';
        card.style.setProperty('--c', color || '#9aa3ad');
        if (state.currentMap === id) card.classList.add('current');
        let hlHtml = '';
        if (highlights && highlights.length) {
            hlHtml = '<ul class="repro-hl">' + highlights.slice(0, 4).map(h => `<li>${escapeHtml(trHl(h))}</li>`).join('') + '</ul>';
        }
        const tunableBadge = tunable ? `<span class="repro-tunable"><i class="fa-sharp fa-solid fa-sliders"></i> ${escapeHtml(t('repro_tunable'))}</span>` : '';
        card.innerHTML = `
            <span class="badge" style="background:${color || '#9aa3ad'}">${escapeHtml(label)}</span>
            <h3>${escapeHtml(label)}</h3>
            <p>${escapeHtml(desc)}</p>
            ${hlHtml}
            <div class="cost">${cost > 0 ? fmtMoney(cost) : escapeHtml(t('repro_free'))} ${tunableBadge}</div>
        `;
        card.addEventListener('click', () => {
            if (tunable) {
                state.tunableTargetId = id;
                openCustomConfig(cost);
            } else {
                openConfirm({ id, label, description: desc, cost });
            }
        });
        return card;
    };

    grid.appendChild(makeCard('stock', t('repro_stock'), t('repro_stock_desc'),
        '#9aa3ad', 0, [t('effect_stock_1'), t('effect_stock_2')], false));
    state.reprograms.forEach(r => {
        const labelStr = t(r.label, r.id);
        const descStr  = t(r.description, '');
        grid.appendChild(makeCard(r.id, labelStr, descStr, r.color, r.cost, r.highlights, !!r.tunable));
    });

    const lbl = $('#current-repro-label');
    if (lbl) {
        if (state.currentMap && state.currentMap !== 'stock') {
            lbl.textContent = (t('repro_current') + ': ' + t('repro_' + state.currentMap, state.currentMap)).toUpperCase();
        } else {
            lbl.textContent = (t('repro_current') + ': OEM').toUpperCase();
        }
    }
}

let pendingRepro = null;

/* REPRO_META: warrantyKept indica se a garantia se mantem (true) ou se perde (false).
   O texto da garantia e o combustivel sao resolvidos atraves do locale em runtime. */
const REPRO_META = {
    stock:   { icon: 'fa-rotate-left',    colors: ['#9aa3ad', '#6c7077'], fuel: '95 RON', warrantyKept: true  },
    sport:   { icon: 'fa-gauge-high',     colors: ['#ff6240', '#b3361e'], fuel: '95 RON', warrantyKept: false },
    drag:    { icon: 'fa-flag-checkered', colors: ['#fbbf24', '#b3870a'], fuel: '98 RON', warrantyKept: false },
    drift:   { icon: 'fa-rotate',         colors: ['#38bdf8', '#0284c7'], fuel: '95 RON', warrantyKept: false },
    eco:     { icon: 'fa-leaf',           colors: ['#4ade80', '#15803d'], fuel: '95 RON', warrantyKept: true  },
    custom1: { icon: 'fa-sliders',        colors: ['#a78bfa', '#5b3aff'], fuel: '98 RON', warrantyKept: false },
};

function openConfirm(r) {
    if (!state.connected) { notify(t('not_in_vehicle'), 'error'); return; }
    if (state.flashInProgress) return;
    if (state.currentMap === r.id) { notify(t('repro_already'), 'warning'); return; }
    pendingRepro = r;

    const meta = REPRO_META[r.id] || REPRO_META.sport;

    // Header
    setText('#modal-title', r.label);
    setText('#modal-desc',  r.description || '');

    // Icone do header com cor do repro
    const iconEl = $('#modal-icon');
    if (iconEl) {
        iconEl.style.background = `linear-gradient(135deg, ${meta.colors[0]}, ${meta.colors[1]})`;
        iconEl.style.boxShadow = `0 6px 14px ${meta.colors[0]}55`;
        iconEl.innerHTML = `<i class="fa-sharp fa-solid ${meta.icon}"></i>`;
    }

    // Efeitos (highlights do repro)
    const fullRepro = state.reprograms.find(x => x.id === r.id);
    const highlights = (fullRepro && fullRepro.highlights) || [];
    const effectIcons = ['fa-bolt', 'fa-gauge-high', 'fa-rocket', 'fa-arrows-up-down'];
    const effectsEl = $('#modal-effects');
    if (effectsEl) {
        if (r.id === 'stock' || highlights.length === 0) {
            effectsEl.innerHTML = `
                <div class="effect-item">
                    <i class="fa-sharp fa-solid fa-rotate-left"></i>
                    <span>${escapeHtml(t('effect_stock_1'))}</span>
                </div>
                <div class="effect-item">
                    <i class="fa-sharp fa-solid fa-shield-check"></i>
                    <span>${escapeHtml(t('effect_stock_2'))}</span>
                </div>`;
        } else {
            effectsEl.innerHTML = highlights.slice(0, 4).map((h, i) => `
                <div class="effect-item">
                    <i class="fa-sharp fa-solid ${effectIcons[i] || 'fa-circle-dot'}" style="color:${meta.colors[0]};background:${meta.colors[0]}1a"></i>
                    <span>${escapeHtml(t(h, h))}</span>
                </div>
            `).join('');
        }
    }

    // Meta (texto da garantia traduzido em runtime)
    setText('#modal-time', '~12s');
    setText('#modal-warranty', t(meta.warrantyKept ? 'modal_warranty_kept' : 'modal_warranty_void'));
    setText('#modal-fuel', meta.fuel);
    setText('#modal-cost', r.cost > 0 ? fmtMoney(r.cost) : t('repro_free'));

    addClass('#repro-modal', 'show');
}

on('#modal-cancel', 'click', () => {
    pendingRepro = null;
    rmClass('#repro-modal', 'show');
});
on('#modal-confirm', 'click', async () => {
    if (!pendingRepro) return;
    rmClass('#repro-modal', 'show');
    await flashSequence(pendingRepro);
    pendingRepro = null;
});

/* ===== CUSTOM TUNER CONFIG ===== */
const CUSTOM_SLIDER_DEFAULTS = {
    hp:        150,
    topspeed:  150,
    accel:     140,
    brakes:    130,
    grip:      120,
    susp:      110,
};

function fmtPct(val) {
    const diff = val - 100;
    if (diff > 0) return '+' + diff + '%';
    if (diff < 0) return diff + '%';
    return '0%';
}
function updateCustomLabels() {
    Object.keys(CUSTOM_SLIDER_DEFAULTS).forEach(k => {
        const sl = $('#cfg-' + k);
        const lbl = $('#cfg-' + k + '-val');
        if (sl && lbl) lbl.textContent = fmtPct(parseInt(sl.value, 10));
    });
}
function openCustomConfig(cost) {
    // Reset para defaults
    Object.entries(CUSTOM_SLIDER_DEFAULTS).forEach(([k, v]) => {
        const sl = $('#cfg-' + k);
        if (sl) sl.value = v;
    });
    updateCustomLabels();
    addClass('#custom-modal', 'show');
}
function closeCustomConfig() { rmClass('#custom-modal', 'show'); }

$$('.cfg-slider').forEach(sl => sl.addEventListener('input', updateCustomLabels));

on('#custom-cancel', 'click', () => closeCustomConfig());
on('#custom-reset',  'click', () => {
    Object.entries(CUSTOM_SLIDER_DEFAULTS).forEach(([k, v]) => {
        const sl = $('#cfg-' + k);
        if (sl) sl.value = v;
    });
    updateCustomLabels();
});
on('#custom-apply', 'click', async () => {
    const config = {
        hp:       parseInt(($('#cfg-hp')       || {}).value || 150, 10) / 100,
        topSpeed: parseInt(($('#cfg-topspeed') || {}).value || 150, 10) / 100,
        accel:    parseInt(($('#cfg-accel')    || {}).value || 140, 10) / 100,
        brakes:   parseInt(($('#cfg-brakes')   || {}).value || 130, 10) / 100,
        grip:     parseInt(($('#cfg-grip')     || {}).value || 120, 10) / 100,
        susp:     parseInt(($('#cfg-susp')     || {}).value || 110, 10) / 100,
    };
    const targetId = state.tunableTargetId || 'custom1';
    const r = await postNUI('setCustomReprogramConfig', { id: targetId, config });
    closeCustomConfig();
    if (!r || !r.ok) { notify(tReason(r && r.reason, 'error_generic'), 'error'); return; }
    const finalCost = (r.cost != null) ? r.cost : 5000;
    const target = state.reprograms.find(x => x.id === targetId);
    await flashSequence({
        id: targetId,
        label: t(target ? target.label : 'repro_custom1', 'Tuner Custom'),
        description: t('custom_applied_desc'),
        cost: finalCost,
    });
});

function randHex(len = 8) {
    let s = ''; const c = '0123456789ABCDEF';
    for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
}

async function flashSequence(r) {
    if (state.flashInProgress) return;
    state.flashInProgress = true;
    const repro = state.reprograms.find(x => x.id === r.id) || null;
    const reproLines = (repro && repro.flashLines) || [];

    const overlay = $('#flash-overlay');
    const con     = $('#flash-console');
    const bar     = $('#flash-bar-fill');
    const stat    = $('#flash-status');
    const timeEl  = $('#flash-time');
    if (con) con.innerHTML = '';
    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0%';
        void bar.offsetWidth;
        bar.style.transition = '';
    }
    if (overlay) overlay.classList.add('show');
    const startedAt = Date.now();
    const tickTimer = setInterval(() => {
        if (!timeEl) return;
        const e = Date.now() - startedAt;
        const mm = String(Math.floor(e / 60000)).padStart(2, '0');
        const ss = String(Math.floor((e / 1000) % 60)).padStart(2, '0');
        const ms = String(e % 1000).padStart(3, '0');
        timeEl.textContent = `${mm}:${ss}.${ms}`;
    }, 50);
    const pushLine = (cls, text) => {
        if (!con) return;
        const div = document.createElement('div');
        div.className = 'line';
        const now = Date.now() - startedAt;
        const tss = (now/1000).toFixed(3);
        div.innerHTML = `<span class="ts">[${tss.padStart(7, '0')}]</span><span class="${cls}">${escapeHtml(text)}</span>`;
        con.appendChild(div);
        con.scrollTop = con.scrollHeight;
    };
    const setStatus = (txt) => { if (stat) stat.textContent = txt; };
    const setBar = (p) => { if (bar) bar.style.width = clamp(p, 0, 100) + '%'; };

    setStatus('[ session ] init');
    pushLine('info', t('c_session_open'));
    await sleep(340);
    pushLine('info', '[CAN] tx 0x7E0 02 10 03    rx 0x7E8 06 50 03 00 32 01 F4');
    await sleep(300); setBar(8);
    setStatus('[ security ] handshake');
    pushLine('warn', t('c_sec_seed'));
    await sleep(220);
    pushLine('raw',  `[CAN] rx 0x7E8 06 67 01 ${randHex(2)} ${randHex(2)} ${randHex(2)} ${randHex(2)}`);
    await sleep(300);
    pushLine('ok', t('c_sec_key'));
    await sleep(260); setBar(18);
    pushLine('ok', t('c_sec_unlock'));
    await sleep(220); setBar(22);

    if (r.id === 'stock') {
        setStatus('[ flash ] erase user calibration');
        pushLine('warn', t('c_routine_start'));
        await sleep(320);
        for (let i = 0; i < 4; i++) {
            pushLine('raw', tFmt('c_erase_block', randHex(6)));
            await sleep(200 + Math.random() * 130);
            setBar(22 + (i + 1) * 6);
        }
    } else {
        setStatus('[ flash ] erasing flash memory');
        pushLine('warn', t('c_routine_start'));
        await sleep(320);
        for (let i = 0; i < 5; i++) {
            pushLine('raw', tFmt('c_erase_block', randHex(6)));
            await sleep(180 + Math.random() * 120);
            setBar(22 + (i + 1) * 4);
        }
    }
    setStatus('[ flash ] writing new calibration');
    const writeBlocks = (r.id === 'stock') ? 3 : 6;
    let reproLineIdx = 0;
    for (let i = 0; i < writeBlocks; i++) {
        pushLine('info', tFmt('c_write_block', randHex(6), 1024 + Math.floor(Math.random() * 3072)));
        await sleep(200 + Math.random() * 160);
        setBar(50 + (i + 1) * 3);
        if (reproLines.length > 0 && (i % 2 === 0 || i === writeBlocks - 1)) {
            pushLine('ok', reproLines[reproLineIdx % reproLines.length]);
            reproLineIdx++;
            await sleep(220);
        }
    }
    while (reproLineIdx < reproLines.length && reproLineIdx < 7) {
        pushLine('ok', reproLines[reproLineIdx]);
        reproLineIdx++;
        await sleep(160);
    }
    setBar(82);
    setStatus('[ verify ] computing checksum');
    pushLine('info', tFmt('c_checksum', '0x' + randHex(8)));
    await sleep(320); setBar(88);
    pushLine('info', t('c_verify'));
    await sleep(320); setBar(93);

    setStatus('[ verify ] applying handling');
    const result = await postNUI('applyReprogram', { reprogram: r.id });
    await sleep(280);

    if (result && result.ok) {
        pushLine('ok', t('c_ecu_reset'));
        await sleep(260); setBar(97);
        pushLine('ok', t('c_session_close'));
        await sleep(200); setBar(100);
        pushLine('ok', tFmt('c_done', r.id === 'stock' ? 'OEM' : r.id.toUpperCase()));
        setStatus('[ ok ] flash completed');
        state.currentMap = r.id === 'stock' ? 'stock' : r.id;
        state.lastDyno = null;
        state.lastDynoPlate = null;
        renderReprograms();
        updateConnectedDash();
        notify(r.id === 'stock' ? t('reprogram_removed') : t('reprogram_applied'), 'success');
    } else {
        const reasonKey = result && result.reason;
        const reasonText = reasonKey ? t(reasonKey) : 'UNKNOWN';
        pushLine('err', tFmt('c_error', reasonText));
        setStatus('[ err ] flash failed');
        setBar(0);
        notify(tReason(reasonKey, 'error_generic'), 'error');
    }
    clearInterval(tickTimer);
    await sleep(1100);
    if (overlay) overlay.classList.remove('show');
    state.flashInProgress = false;
}

/* ---------------- DYNO ---------------- */
function renderDyno() {
    if (!state.connected) {
        setStyle('#dyno-needs-conn', 'display', 'flex');
        setStyle('#dyno-wrap', 'display', 'none');
        return;
    }
    setStyle('#dyno-needs-conn', 'display', 'none');
    setStyle('#dyno-wrap', 'display', 'flex');
    updateDynoHeader();
    const plateNow = state.vehicle ? state.vehicle.plate : null;
    if (state.lastDyno && state.lastDynoPlate === plateNow) {
        renderDynoStats(state.lastDyno);
        setGaugeHp(state.lastDyno.currentHp, Math.max(600, state.lastDyno.currentHp * 1.2));
        setCurves(null, null, {
            peakStockHp:   state.lastDyno.stockHp,
            peakCurrentHp: state.lastDyno.currentHp,
        });
        setStyle('#dyno-empty-hint', 'display', 'none');
    } else {
        state.lastDyno = null;
        state.lastDynoPlate = null;
        renderDynoStats({ stockHp: 0, currentHp: 0, gainHp: 0, torque: 0, peakRpm: 6500, mapId: state.currentMap });
        setGaugeHp(0, 600);
        setCurves(null, null);
        hidePeakMarker();
        setStyle('#dyno-empty-hint', 'display', 'flex');
        setText('#dyno-empty-hint', t('dyno_no_data'));
    }
}

function updateDynoHeader() {
    const v = state.vehicle;
    if (!v) return;
    setText('#dyno-h-plate', v.plate || '------');
    setText('#dyno-h-model', (v.model || '-').toUpperCase());
    setText('#dyno-h-class', v.className || '-');
    setText('#dyno-h-map', (state.currentMap === 'stock' || !state.currentMap) ? 'OEM' : t('repro_' + state.currentMap).toUpperCase());
}

function renderDynoStats(d) {
    const hpUnit = t('dyno_hp'), nmUnit = t('dyno_nm');
    setHTML('#d-stock-hp', `${Math.round(d.stockHp)} <small>${escapeHtml(hpUnit)}</small>`);
    setHTML('#d-curr-hp',  `${Math.round(d.currentHp)} <small>${escapeHtml(hpUnit)}</small>`);
    const gain = d.gainHp;
    setHTML('#d-gain-hp',  `${gain >= 0 ? '+' : ''}${Math.round(gain)} <small>${escapeHtml(hpUnit)}</small>`);
    setHTML('#d-torque',   `${Math.round(d.torque)} <small>${escapeHtml(nmUnit)}</small>`);
    setText('#d-peak-rpm', d.peakRpm || 6500);
    setText('#d-map', (d.mapId === 'stock' || !d.mapId) ? 'OEM' : t('repro_' + d.mapId).toUpperCase());
    const gainStat = $('#d-gain-hp');
    if (gainStat) {
        const parent = gainStat.closest('.dyno-stat');
        if (parent) parent.classList.toggle('loss', gain < 0);
    }
}

const ARC_CX = 100, ARC_CY = 110, ARC_R = 80, ARC_DASH = 252;
function setGaugeHp(hp, maxHp) {
    const max = maxHp || 600;
    const pct = clamp(hp / max, 0, 1);
    setAttr('#gauge-arc', 'stroke-dashoffset', String(ARC_DASH * (1 - pct)));
    setText('#gauge-hp', Math.round(hp));
    const ang = (180 + pct * 180) * Math.PI / 180;
    const mx = ARC_CX + ARC_R * Math.cos(ang);
    const my = ARC_CY + ARC_R * Math.sin(ang);
    setAttr('#gauge-marker', 'cx', mx.toFixed(1));
    setAttr('#gauge-marker', 'cy', my.toFixed(1));
}

/* ============= CHART INTERATIVO ============= */
// Guarda os pontos das curvas para lookup no hover
const ChartData = { hp: null, tq: null, stock: null, maxHp: 700 };

function interpolateYAtX(pts, targetX) {
    if (!pts || pts.length === 0) return null;
    if (targetX <= pts[0].x) return pts[0].y;
    if (targetX >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
    for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].x <= targetX && pts[i + 1].x >= targetX) {
            const range = pts[i + 1].x - pts[i].x;
            const t = range === 0 ? 0 : (targetX - pts[i].x) / range;
            return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
        }
    }
    return null;
}
function yToHp(y, maxScale) {
    const H = 150, MAX = maxScale || 700;
    return Math.max(0, ((H - y - 8) / (H - 14)) * MAX);
}
function findPeak(pts) {
    if (!pts || !pts.length) return null;
    let best = pts[0];
    for (const p of pts) if (p.y < best.y) best = p;
    return best;
}

/* Peak marker agora e um LABEL no canto (sem dot a flutuar no meio do grafico). */
function showPeakMarker(peakHp) {
    if (!ChartData.hp || !ChartData.hp.length) return;
    const peak = findPeak(ChartData.hp);
    if (!peak) return;
    // Calcula RPM correspondente a posicao X do peak (considera padding do bell curve)
    const W = 380, padLeft = 6, padRight = 10, usableW = W - padLeft - padRight;
    const ratio = Math.max(0, Math.min(1, (peak.x - padLeft) / usableW));
    const rpm = Math.round(1000 + ratio * 6000);
    setText('#cpl-hp', Math.round(peakHp));
    setText('#cpl-rpm', rpm.toLocaleString() + ' RPM');
    setStyle('#chart-peak-label', 'display', 'flex');
}
function hidePeakMarker() {
    setStyle('#chart-peak-label', 'display', 'none');
}

function bindChartHover() {
    const svg = $('#curve-svg');
    const wrap = $('.dyno-chart-wrap');
    const tooltip = $('#chart-tooltip');
    if (!svg || !wrap) return;
    if (svg._bound) return;
    svg._bound = true;

    const crosshair = $('#chart-crosshair');
    const markerHp = $('#chart-marker-hp');
    const markerTq = $('#chart-marker-tq');

    svg.addEventListener('mousemove', (e) => {
        if (!ChartData.hp || !ChartData.hp.length) return;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = clamp(x / rect.width, 0, 1);
        const vbX = ratio * 380;
        // RPM 1000..7000 mapped from 0..380
        const rpm = Math.round(1000 + ratio * 6000);

        // Interpola Y das curvas
        const hpY = interpolateYAtX(ChartData.hp, vbX);
        const tqY = interpolateYAtX(ChartData.tq, vbX);
        const hpVal = hpY != null ? yToHp(hpY, ChartData.maxHp) : 0;
        const tqVal = tqY != null ? yToHp(tqY, ChartData.maxHp) : 0;

        // Crosshair
        if (crosshair) {
            crosshair.setAttribute('x1', vbX.toFixed(1));
            crosshair.setAttribute('x2', vbX.toFixed(1));
            crosshair.style.display = '';
        }
        // Marker HP
        if (markerHp && hpY != null) {
            markerHp.setAttribute('cx', vbX.toFixed(1));
            markerHp.setAttribute('cy', hpY.toFixed(1));
            markerHp.style.display = '';
        }
        // Marker Nm
        if (markerTq && tqY != null) {
            markerTq.setAttribute('cx', vbX.toFixed(1));
            markerTq.setAttribute('cy', tqY.toFixed(1));
            markerTq.style.display = '';
        }

        // Tooltip
        if (tooltip) {
            setText('#tt-rpm', rpm.toLocaleString() + ' RPM');
            setText('#tt-hp', Math.round(hpVal));
            setText('#tt-tq', Math.round(tqVal));
            tooltip.classList.add('show');
            // posicao: relativa ao wrap
            const wrect = wrap.getBoundingClientRect();
            const px = e.clientX - wrect.left;
            const py = e.clientY - wrect.top;
            // Ajusta para nao sair do container
            let leftPx = px + 14;
            if (leftPx + 160 > wrect.width) leftPx = px - 160 - 8;
            let topPx = py - 50;
            if (topPx < 4) topPx = py + 14;
            tooltip.style.left = leftPx + 'px';
            tooltip.style.top  = topPx + 'px';
        }
    });

    svg.addEventListener('mouseleave', () => {
        if (crosshair) crosshair.style.display = 'none';
        if (markerHp)  markerHp.style.display = 'none';
        if (markerTq)  markerTq.style.display = 'none';
        if (tooltip)   tooltip.classList.remove('show');
    });
}

/* Curva suave (cubic Bezier / Catmull-Rom) - sem jitter
   Control points sao clampados ao viewBox util para evitar overshoot. */
function smoothPath(pts) {
    if (!pts || pts.length < 2) return '';
    const Y_MIN = 4, Y_MAX = 146;   // limites duros para control points
    const cly = (y) => Math.max(Y_MIN, Math.min(Y_MAX, y));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i-1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i+1];
        const p3 = i < pts.length - 2 ? pts[i+2] : pts[i+1];
        const t = 0.15;             // tensao mais baixa = menos overshoot
        const cp1x = p1.x + (p2.x - p0.x) * t;
        const cp1y = cly(p1.y + (p2.y - p0.y) * t);
        const cp2x = p2.x - (p3.x - p1.x) * t;
        const cp2y = cly(p2.y - (p3.y - p1.y) * t);
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
}

/* Live progressive draw - revela a curva ate ao indice "cutoff" */
function drawProgressiveCurves(fullStock, fullCurrent, fullTorque, progress) {
    const H = 150;
    const N = (fullCurrent && fullCurrent.length) || 0;
    if (N < 2) return;
    const cutoff = Math.max(2, Math.ceil(progress * N));
    const stockPartial   = fullStock   ? fullStock.slice(0, cutoff)   : null;
    const currentPartial = fullCurrent.slice(0, cutoff);
    const torquePartial  = fullTorque  ? fullTorque.slice(0, cutoff)  : null;

    const fillFrom = (pts) => {
        if (!pts || pts.length < 2) return '';
        const stroke = smoothPath(pts);
        return stroke + ` L ${pts[pts.length-1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
    };

    setAttr('#curve-stock',         'd', stockPartial   ? smoothPath(stockPartial)   : '');
    setAttr('#curve-current',       'd', smoothPath(currentPartial));
    setAttr('#curve-current-fill',  'd', fillFrom(currentPartial));
    setAttr('#curve-torque',        'd', torquePartial  ? smoothPath(torquePartial)  : '');
    setAttr('#curve-torque-fill',   'd', torquePartial  ? fillFrom(torquePartial)    : '');

    // Atualiza data para tooltip funcionar mid-pull
    ChartData.hp = currentPartial;
    ChartData.tq = torquePartial;
    ChartData.stock = stockPartial;

    // Drawing head: dot na ponta da curva atual
    const last = currentPartial[currentPartial.length - 1];
    const lastTq = torquePartial && torquePartial[torquePartial.length - 1];
    const head = $('#chart-draw-head');
    const headTq = $('#chart-draw-head-tq');
    if (head && last) {
        head.setAttribute('cx', last.x.toFixed(1));
        head.setAttribute('cy', last.y.toFixed(1));
        head.style.display = '';
    }
    if (headTq && lastTq) {
        headTq.setAttribute('cx', lastTq.x.toFixed(1));
        headTq.setAttribute('cy', lastTq.y.toFixed(1));
        headTq.style.display = '';
    }
}
function hideDrawingHeads() {
    setStyle('#chart-draw-head',    'display', 'none');
    setStyle('#chart-draw-head-tq', 'display', 'none');
}

/* setCurves: recebe os pontos JA construidos, ou rebuild com escala dinamica */
function setCurves(stockPts, currentPts, opts) {
    const H = 150;
    const fillFrom = (pts) => {
        if (!pts || pts.length < 2) return '';
        const stroke = smoothPath(pts);
        return stroke + ` L ${pts[pts.length-1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
    };

    // Se foram passados raw values (HP peak), reconstroi com escala consistente
    if (opts && opts.peakStockHp != null && opts.peakCurrentHp != null) {
        const peakHp = Math.max(opts.peakStockHp, opts.peakCurrentHp);
        const peakTq = peakHp * 1.30;
        const scale  = computeMaxScale(peakHp, peakTq);
        stockPts   = buildCurve(opts.peakStockHp,   scale);
        currentPts = buildCurve(opts.peakCurrentHp, scale);
        ChartData.maxHp = scale;
        updateYAxisLabels(scale);
    }

    setAttr('#curve-stock',        'd', stockPts   ? smoothPath(stockPts)   : '');
    setAttr('#curve-current',      'd', currentPts ? smoothPath(currentPts) : '');
    setAttr('#curve-current-fill', 'd', currentPts ? fillFrom(currentPts)   : '');

    ChartData.hp = currentPts || null;
    ChartData.stock = stockPts || null;

    // Torque: usa a mesma escala dos HP para coerencia visual
    let tqPts = null;
    if (currentPts && currentPts.length) {
        const minY = Math.min.apply(null, currentPts.map(p => p.y));
        const peakHpVal = yToHp(minY, ChartData.maxHp);
        const torquePeak = peakHpVal * 1.30;
        tqPts = buildTorqueCurve(torquePeak, ChartData.maxHp);
    }
    ChartData.tq = tqPts;
    const tqEl = $('#curve-torque');
    const tqFill = $('#curve-torque-fill');
    if (tqEl)   tqEl.setAttribute('d',   tqPts ? smoothPath(tqPts) : '');
    if (tqFill) tqFill.setAttribute('d', tqPts ? fillFrom(tqPts)   : '');

    bindChartHover();
}

/* Bell curve simetrica com pico configuravel (sem ruido + clamp ao viewBox)
   Padding generoso em X e Y para evitar que as linhas (com stroke-width)
   ultrapassem as bordas da UI quando o gauge atinge o pico ou o fim. */
function bellCurve(peakValue, peakPos, width, count, maxScale) {
    const pts = [], W = 380, H = 150;
    const MAX = maxScale || 700;
    const padTop = 14, padBot = 10;
    const padLeft = 6, padRight = 10;   // margem horizontal: evita stroke sair pelas bordas
    const usableH = H - padTop - padBot;
    const usableW = W - padLeft - padRight;
    for (let i = 0; i < count; i++) {
        const tt = i / (count - 1);
        const offset = (tt - peakPos) / width;
        const bell = Math.exp(-offset * offset);
        const val = Math.max(0, peakValue * bell);
        let y = H - padBot - (val / MAX) * usableH;
        if (y < padTop)         y = padTop;
        if (y > H - padBot)     y = H - padBot;
        pts.push({ x: padLeft + tt * usableW, y });
    }
    return pts;
}

/* Calcula uma escala "limpa" (multiplo de 100) com headroom acima do peak */
function computeMaxScale(peakHp, peakTorque) {
    const need = Math.max(peakHp * 1.10, (peakTorque || 0) * 1.05, 400);
    // Arredonda para o multiplo de 100 acima
    return Math.ceil(need / 100) * 100;
}

function buildCurve(peakHp, maxScale) {
    return bellCurve(peakHp, 0.72, 0.45, 24, maxScale || computeMaxScale(peakHp));
}
function buildTorqueCurve(peakTorque, maxScale) {
    return bellCurve(peakTorque, 0.40, 0.50, 24, maxScale || computeMaxScale(peakTorque));
}

/* Atualiza os labels do eixo Y dinamicamente */
function updateYAxisLabels(maxScale) {
    const yAxis = $('.curve-y-axis');
    if (!yAxis) return;
    const spans = yAxis.querySelectorAll('span');
    // 4 labels distribuidos: top = ~95%, depois 70%, 45%, 20%
    const levels = [0.95, 0.70, 0.45, 0.20];
    const round = v => Math.round(v / 25) * 25;
    spans.forEach((sp, i) => {
        if (levels[i] != null) sp.textContent = round(maxScale * levels[i]);
    });
}

on('#btn-dyno-run', 'click', async () => {
    if (!state.connected || state.dynoRunning) return;
    state.dynoRunning = true;
    setText('#dyno-status', t('dyno_running'));
    const btn = $('#btn-dyno-run'); if (btn) btn.disabled = true;
    setStyle('#dyno-empty-hint', 'display', 'none');
    // Classes para activar efeitos visuais durante o pull
    addClass('.dyno-gauge-box', 'running');
    addClass('.rpm-bar', 'running');
    const meas = await postNUI('dynoMeasure');
    if (!meas || !meas.ok) {
        state.dynoRunning = false;
        if (btn) btn.disabled = false;
        notify(tReason(meas && meas.reason, 'error_generic'), 'error');
        return;
    }
    const { stockHp, currentHp, gainHp, torque, peakRpm, mapId } = meas;
    state.lastDyno = { stockHp, currentHp, gainHp, torque, peakRpm, mapId };
    state.lastDynoPlate = state.vehicle ? state.vehicle.plate : null;
    const duration = 2400;   // pull mais rapido (era 3200ms)
    const start = performance.now();
    const rpmFillEl = $('#rpm-bar-fill');
    const rpmLiveEl = $('#rpm-live');

    // PRE-CONSTRUI as curvas COMPLETAS com escala dinamica (uma vez)
    const peakHpForChart = Math.max(stockHp, currentHp);
    const peakTqForChart = peakHpForChart * 1.30;
    const chartScale = computeMaxScale(peakHpForChart, peakTqForChart);
    const fullStockCurve   = buildCurve(stockHp,   chartScale);
    const fullCurrentCurve = buildCurve(currentHp, chartScale);
    const fullTorqueCurve  = buildTorqueCurve(currentHp * 1.30, chartScale);
    ChartData.maxHp = chartScale;
    updateYAxisLabels(chartScale);
    hidePeakMarker();
    hideDrawingHeads();

    function animate(now) {
        const tt = Math.min(1, (now - start) / duration);
        const e = 1 - Math.pow(1 - tt, 3);
        const cur = currentHp * e;
        setGaugeHp(cur, Math.max(600, currentHp * 1.2));
        if (rpmFillEl) rpmFillEl.style.width = clamp((e * 0.92 + Math.random() * 0.025) * 100, 0, 100).toFixed(1) + '%';
        if (rpmLiveEl) rpmLiveEl.textContent = Math.round(800 + e * (peakRpm - 800));

        // LIVE: desenha as curvas progressivamente acompanhando o pull
        drawProgressiveCurves(fullStockCurve, fullCurrentCurve, fullTorqueCurve, e);

        if (tt < 1) requestAnimationFrame(animate);
        else {
            // Renderiza curvas finais via setCurves (consistente com renderDyno)
            setCurves(null, null, { peakStockHp: stockHp, peakCurrentHp: currentHp });
            renderDynoStats(state.lastDyno);
            state.dynoRunning = false;
            setText('#dyno-status', t('dyno_done'));
            if (btn) btn.disabled = false;
            notify(t('dyno_done'), 'success');
            rmClass('.dyno-gauge-box', 'running');
            rmClass('.rpm-bar', 'running');
            if (rpmFillEl) rpmFillEl.style.width = '92%';
            if (rpmLiveEl) rpmLiveEl.textContent = peakRpm;
            hideDrawingHeads();
            showPeakMarker(currentHp);
        }
    }
    requestAnimationFrame(animate);
});

/* ---------------- HISTORY ---------------- */
$$('.hdr-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.hdr-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.historyTab = tab.getAttribute('data-tab');
        loadHistory();
    });
});

async function loadHistory() {
    const body = $('#hist-body');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(t('history_empty'))}</td></tr>`;
    let plate = null;
    if (state.historyTab === 'this') {
        plate = state.vehicle && state.vehicle.plate ? state.vehicle.plate : null;
        if (!plate) {
            body.innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(t('not_in_vehicle'))}</td></tr>`;
            return;
        }
    }
    const res = await postNUI('history', { plate });
    if (!res || !res.ok || !res.rows || res.rows.length === 0) return;
    body.innerHTML = res.rows.map(row => {
        let when = (row.at_time || '').toString();
        if (when.includes('T')) when = when.replace('T', ' ').replace(/\..*$/, '');
        when = when.substring(0, 16);
        const actionLabel = row.action === 'reset' ? t('history_reset') : t('history_apply');
        const actionCls   = row.action === 'reset' ? 'action-reset' : 'action-apply';
        const reproName   = row.reprogram === 'stock' ? 'OEM' : t('repro_' + row.reprogram, row.reprogram || '-');
        return `<tr>
            <td>${escapeHtml(when)}</td>
            <td class="plate">${escapeHtml(row.plate || '')}</td>
            <td class="${actionCls}">${escapeHtml(actionLabel)}</td>
            <td class="repro">${escapeHtml(reproName)}</td>
            <td>${escapeHtml(row.by_name || '-')}</td>
        </tr>`;
    }).join('');
}

/* ---------------- SETTINGS (info only) ---------------- */
function renderSettings() {
    setText('#settings-locale', (state.localeCode || 'pt').toUpperCase());
}

/* ---------------- GAUGE TICKS ---------------- */
function buildGaugeTicks() {
    const g = $('#gauge-ticks');
    if (!g || g.children.length > 0) return;
    const rOuter = 90, rInner = 70;
    for (let i = 0; i <= 10; i++) {
        const tt = i / 10;
        const ang = (180 + tt * 180) * Math.PI / 180;
        const x1 = ARC_CX + rInner * Math.cos(ang);
        const y1 = ARC_CY + rInner * Math.sin(ang);
        const x2 = ARC_CX + rOuter * Math.cos(ang);
        const y2 = ARC_CY + rOuter * Math.sin(ang);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1.toFixed(1));
        line.setAttribute('y1', y1.toFixed(1));
        line.setAttribute('x2', x2.toFixed(1));
        line.setAttribute('y2', y2.toFixed(1));
        line.setAttribute('stroke-width', (i % 5 === 0) ? '2' : '1');
        g.appendChild(line);
    }
}

/* ---------------- MESSAGES ---------------- */
window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.action) return;
    if (d.action === 'open') {
        state.locale     = Object.assign({}, LOCALE_DEFAULTS, d.locale || {});
        state.localeCode = d.localeCode || 'pt';
        state.reprograms = d.reprograms || [];
        state.config     = d.config || {};
        state.branding   = d.branding || {};
        state.connected = false;
        state.connecting = false;
        state.cable.phase = 'idle';
        state.cable.dragging = false;
        state.flashInProgress = false;
        state.vehicle = null;
        state.currentMap = 'stock';
        state.missCount = 0;
        state.lastDyno = null;
        state.lastDynoPlate = null;
        applyLocale();
        applyBranding();
        root.classList.remove('hidden');
        buildGaugeTicks();
        initCableMinigame();
        if (!CM.rafId) CM.rafId = requestAnimationFrame(cableLoop);
        boot();
    } else if (d.action === 'close') {
        root.classList.add('hidden');
        stopStatusPoll();
        state.connecting = false;
        state.flashInProgress = false;
        state.cable.phase = 'idle';
        state.cable.dragging = false;
    } else if (d.action === 'notify') {
        notify(d.message, d.ntype || 'info');
    }
});

updateClock();
