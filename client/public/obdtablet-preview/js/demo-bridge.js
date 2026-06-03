/* ==========================================================================
 *  OXLYN-OBDTABLET | Website Live-Preview bridge  ("OBD-OS" / ECU Tuning System)
 * ==========================================================================
 *  In the real resource, the NUI is driven by:
 *    1. the FiveM game client, which posts the boot message
 *         { action:'open', locale, localeCode, reprograms, branding, config }
 *       (see client/nui.lua -> ShowUI).
 *    2. the Lua client, which answers NUI callbacks the UI makes via
 *         fetch('https://oxlyn-obdtablet/<name>')   (RegisterNUICallback).
 *
 *  Neither exists in a browser. This bridge plays BOTH roles so the exact same
 *  html/css/js can run, fully interactive, on the website:
 *    - builds a mock boot payload (mirrors client/nui.lua ShowUI +
 *      shared/reprograms.lua ListReprograms + config.lua) and posts it,
 *    - overrides window.fetch to intercept every NUI callback and serve
 *      in-memory mock data ported from client/nui.lua / vehicle.lua.
 *
 *  The preview auto-connects to a fictitious vehicle so the tablet lands on the
 *  interactive Home screen (the real flow would require the cable minigame).
 *  Reset on reload.
 * ========================================================================== */
(function () {
  'use strict';

  var RESOURCE = 'oxlyn-obdtablet';

  // ------------------------------------------------------------------
  //  Fictitious connected vehicle (shape: client/vehicle.lua Vehicle.GetData)
  // ------------------------------------------------------------------
  var VEHICLE = {
    plate: 'OXLYN07',
    model: 'sultanrs',
    modelHash: 970598228,
    class: 7,
    className: 'Super',
    engine: 96,      // 0..100
    body: 91,        // 0..100
    fuel: 74,        // 0..100
    kms: 18452,
    rpm: 0,          // engine off while parked on the bench
    gear: 0,
    speed: 0,
    engineOn: false,
    vin: 'OBD7K2X9P4ZR1M8AC',
    fw: 'ECM-X4.2.7',
  };

  // ------------------------------------------------------------------
  //  In-memory state
  // ------------------------------------------------------------------
  var state = {
    // Boot DISCONNECTED (in-vehicle) so the visitor sees & plays the OBD-II
    // cable connection flow first, then connects and lands on Home.
    connected: false,
    currentMap: 'stock',
    // Fictitious flash history (shape consumed by script.js loadHistory)
    history: [
      { at_time: isoDaysAgo(0, 10), plate: 'OXLYN07', action: 'apply', reprogram: 'sport',   by_name: 'M. Reyes' },
      { at_time: isoDaysAgo(1, 130), plate: 'OXLYN07', action: 'reset', reprogram: 'stock',   by_name: 'M. Reyes' },
      { at_time: isoDaysAgo(2, 45),  plate: 'OXLYN07', action: 'apply', reprogram: 'drift',   by_name: 'J. Okafor' },
      { at_time: isoDaysAgo(3, 320), plate: 'OXLYN07', action: 'apply', reprogram: 'eco',     by_name: 'M. Reyes' },
      { at_time: isoDaysAgo(5, 200), plate: 'KRUZ44',  plate2: true, action: 'apply', reprogram: 'drag', by_name: 'A. Sokolov' },
      { at_time: isoDaysAgo(6, 90),  plate: 'KRUZ44',  action: 'apply', reprogram: 'custom1', by_name: 'J. Okafor' },
      { at_time: isoDaysAgo(8, 15),  plate: 'NOVA21',  action: 'reset', reprogram: 'stock',   by_name: 'A. Sokolov' },
    ],
    // tunable maps inject a per-session config + cost; mirror cb({cost})
    customCost: 5000,
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDaysAgo(days, minutes) {
    var d = new Date(Date.now() - days * 86400000 - (minutes || 0) * 60000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // Power estimate (mirrors client/vehicle.lua Vehicle.EstimateHP heuristic).
  // class 7 (Super) => classMult 1.35. stock fInitialDriveForce ~0.34 baseline.
  function estimateHp(mapId) {
    var classMult = 1.35;
    var stockForce = 0.345;
    // forceMult per active map = repro.handling.float.fInitialDriveForce
    var forceMult = ({
      stock: 1.0, sport: 1.60, drag: 2.20, drift: 1.15, eco: 0.42, custom1: 2.50,
    })[mapId];
    if (forceMult == null) forceMult = 1.0;
    var stockHp = Math.round(stockForce * 1000 * classMult);
    var currentHp = Math.round(stockForce * forceMult * 1000 * classMult);
    var torque = Math.round(currentHp * 1.35);
    return { stockHp: stockHp, currentHp: currentHp, torque: torque };
  }

  // ------------------------------------------------------------------
  //  NUI callback handlers — keyed by the name script.js postNUI()s.
  //  Each returns the SHAPE script.js expects (i.e. the value the Lua
  //  RegisterNUICallback cb(...) would send — see client/nui.lua).
  // ------------------------------------------------------------------
  var handlers = {
    // client/nui.lua: status poll (every 800ms). connected+inVehicle -> Home.
    status: function () {
      return {
        inVehicle: true,
        vehicle: VEHICLE,
        currentMap: state.currentMap,
        connected: state.connected,
      };
    },

    // client/nui.lua: cb({ ok=true, vehicle=data })
    canConnect: function () {
      return { ok: true, vehicle: VEHICLE };
    },

    // client/nui.lua: cb({ ok=true, vehicle=data, currentMap=mapId })
    connect: function () {
      state.connected = true;
      return { ok: true, vehicle: VEHICLE, currentMap: state.currentMap };
    },

    // client/nui.lua: cb({ ok=true })
    disconnect: function () {
      state.connected = false;
      return { ok: true };
    },

    // client/nui.lua: cb({ ok=true }) — script.js updates currentMap optimistically
    applyReprogram: function (d) {
      if (!d || !d.reprogram) return { ok: false, reason: 'error_generic' };
      state.connected = true;
      state.currentMap = (d.reprogram === 'stock') ? 'stock' : d.reprogram;
      // record a fictitious history entry
      state.history.unshift({
        at_time: isoDaysAgo(0, 0),
        plate: VEHICLE.plate,
        action: d.reprogram === 'stock' ? 'reset' : 'apply',
        reprogram: d.reprogram,
        by_name: 'You (Demo)',
      });
      return { ok: true };
    },

    // client/nui.lua: tunable slider config -> cb({ ok=true, cost=... })
    setCustomReprogramConfig: function (d) {
      if (!d || !d.config) return { ok: false, reason: 'invalid_data' };
      return { ok: true, cost: state.customCost };
    },

    // client/nui.lua: dyno measurement
    dynoMeasure: function () {
      var hp = estimateHp(state.currentMap);
      // peakRpm: class 7 -> 8500 (see client/nui.lua dynoMeasure)
      return {
        ok: true,
        stockHp: hp.stockHp,
        currentHp: hp.currentHp,
        gainHp: hp.currentHp - hp.stockHp,
        torque: hp.torque,
        peakRpm: 8500,
        mapId: state.currentMap,
      };
    },

    // client/nui.lua: cb({ ok=true, rows=... }). payload.plate filters "this vehicle".
    history: function (d) {
      var rows = state.history;
      if (d && d.plate) {
        rows = rows.filter(function (r) { return r.plate === d.plate; });
      }
      return { ok: true, rows: rows };
    },

    // client/main.lua CloseTablet sends {action:'close'}; here we re-open after
    // the close animation so the preview is never left blank (soft reset).
    close: function () {
      setTimeout(boot, 400);
      return { ok: true };
    },
  };

  // ------------------------------------------------------------------
  //  fetch override — intercept ONLY the NUI callbacks; everything else
  //  (fonts, FA css, assets) passes straight through.
  // ------------------------------------------------------------------
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  var NUI_RE = new RegExp('^https?://(?:' + RESOURCE + '|cfx-nui-' + RESOURCE + ')/(.+)$', 'i');

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
      console.error('[obdtablet-preview] handler error for "' + name + '":', err);
      result = {};
    }

    // Small artificial latency so spinners / sequenced consoles read naturally.
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(new Response(JSON.stringify(result == null ? {} : result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }, 70);
    });
  };

  // ------------------------------------------------------------------
  //  Reprograms list (mirrors shared/reprograms.lua ListReprograms ordered by
  //  Config.Reprograms.Order = { 'sport','drag','custom1','drift','eco' }).
  //  'stock' is injected by script.js itself, so it is NOT in this list.
  // ------------------------------------------------------------------
  function buildReprograms() {
    return [
      { id: 'sport', label: 'repro_sport', description: 'repro_sport_desc',
        color: '#ff6240', cost: 2500, tunable: false,
        highlights: ['hl_sport_1', 'hl_sport_2', 'hl_sport_3', 'hl_sport_4'],
        flashLines: [
          '[ECM] Stage 1 SPORT calibration loading...',
          '[ECM] Raising redline 6800 -> 7400 RPM',
          '[ECM] Ignition advance +4 deg BTDC',
          '[ECM] Target AFR 12.8:1 under load',
          '[VVT] Cam advance +6 deg low / +12 deg high',
          '[TURBO] Wastegate duty +18%',
          '[BCM] Exhaust valve programming: AGGRESSIVE',
        ] },
      { id: 'drag', label: 'repro_drag', description: 'repro_drag_desc',
        color: '#fbbf24', cost: 3500, tunable: false,
        highlights: ['hl_drag_1', 'hl_drag_2', 'hl_drag_3', 'hl_drag_4'],
        flashLines: [
          '[ECM] Stage 3 DRAGSTRIP calibration loading...',
          '[ECM] Removing rev limiter in 4-6 gear',
          '[ECM] Full timing advance during launch',
          '[TCM] 2-step launch RPM = 5200',
          '[TCM] Flat-shift enabled, no-lift mode',
          '[TURBO] Anti-lag fuel cut programmed',
          '[ABS] Traction control disabled (open diff)',
        ] },
      { id: 'custom1', label: 'repro_custom1', description: 'repro_custom1_desc',
        color: '#a78bfa', cost: 5000, tunable: true,
        highlights: ['hl_custom1_1', 'hl_custom1_2', 'hl_custom1_3'],
        flashLines: [
          '[ECM] CUSTOM tuner map loading...',
          '[ECM] User-defined calibration table',
          '[ECM] Verifying client parameters',
          '[ECM] Open EFI mode',
          '[ECM] WARNING: Race fuel recommended',
        ] },
      { id: 'drift', label: 'repro_drift', description: 'repro_drift_desc',
        color: '#38bdf8', cost: 3000, tunable: false,
        highlights: ['hl_drift_1', 'hl_drift_2', 'hl_drift_3', 'hl_drift_4'],
        flashLines: [
          '[ECM] DRIFT calibration loading...',
          '[ECM] Throttle butterfly response x1.45',
          '[ABS] Disabling rear wheel ABS',
          '[ESP] Stability control: OFF',
          '[STR] Steering ratio reduced to 12:1',
          '[VVT] Cam at +18 deg for low-end snap',
          '[DIFF] LSD lockup 90% (loose rear)',
        ] },
      { id: 'eco', label: 'repro_eco', description: 'repro_eco_desc',
        color: '#4ade80', cost: 1200, tunable: false,
        highlights: ['hl_eco_1', 'hl_eco_2', 'hl_eco_3', 'hl_eco_4'],
        flashLines: [
          '[ECM] ECO calibration loading...',
          '[ECM] Target AFR 15.4:1 (lean burn)',
          '[ECM] Throttle authority capped at 65%',
          '[ECM] Cylinder deactivation at cruise',
          '[VVT] Atkinson cycle on light load',
          '[ECM] Idle RPM 800 -> 680',
          '[TCM] Earlier upshifts at low load',
        ] },
    ];
  }

  // ------------------------------------------------------------------
  //  Branding + config (mirrors config.lua Config.Branding / Config.Tablet).
  // ------------------------------------------------------------------
  var BRANDING = {
    name: 'OXLYN',
    subtitle: 'DIAGNOSTICS',
    osName: 'OBD-OS',
    appTitle: 'OBD Tablet II',
    appSub: 'OXLYN DIAGNOSTICS · ISO 15765-4 CAN',
    aboutDeveloper: 'OXLYN Diagnostics',
    aboutLicense: 'Proprietary © OXLYN',
    consoleHost: 'root@obd-flasher',
  };

  var CONFIG = {
    costAccount: 'money',
    bootSound: 'boot.wav',
    cableMinigame: true,
    cableLockHoldMs: 800,
  };

  // English locale ported from locales/en.lua. script.js merges this over its
  // built-in LOCALE_DEFAULTS, so even missing keys fall back gracefully.
  var LOCALE = {
    no_permission: 'You do not have permission to use this tablet.',
    not_in_vehicle: 'You must be in the vehicle to use the OBD-II port.',
    no_vehicle: 'No vehicle detected.',
    no_player: 'Player not found.',
    engine_running: 'Turn off the engine before reprogramming.',
    not_enough_money: 'Not enough money.',
    item_required: 'You need an OBD Tablet to use this.',
    error_generic: 'An unexpected error occurred.',
    invalid_data: 'Invalid data sent to ECU.',
    invalid_reprogram: 'Unknown reprogramming map.',
    disconnected: 'OBD-II cable disconnected.',
    lost_connection: 'Connection to ECU lost.',
    ignition_off: 'Turn the ignition ON to start the session.',
    notify_need_connect: 'Connect the OBD-II cable first.',
    cable_align_hint: 'Drag the connector to the OBD-II port below the steering wheel.',
    cable_align_ok: 'Pins aligned',
    cable_align_bad: 'Pins misaligned',
    cable_locked: 'Connector locked',
    cable_pick_up: 'Grab the connector',
    cable_hold_lock: 'Hold to lock...',
    cable_locking: 'Locking...',
    cable_pins_label: 'PINS · SAE J1962',
    cable_hint_banner: 'Grab the OBD-II connector and drag it to the port under the steering wheel.',
    ws_stencil: 'DASH HARNESS · J1962',
    btn_close_tablet: 'Close Tablet',
    reprogram_applied: 'Reprogram flashed to ECU successfully.',
    reprogram_removed: 'ECU restored to factory parameters.',
    scan_complete: 'Diagnostic complete.',
    dyno_done: 'Dyno pull complete.',
    connected_ecu: 'Connected to ECU.',
    boot_init: 'INIT OBD-OS',
    boot_kernel: 'kernel v3.4.1 ... OK',
    boot_modules: 'loading modules: can_bus uds_iso14229 kwp2000 j2534 ... OK',
    boot_ready: 'system ready',
    hero_title: 'OBD Tablet II',
    hero_subtitle: 'OXLYN DIAGNOSTICS · ISO 15765-4 CAN',
    home_search: 'Search functions, modules...',
    home_filters: 'Filters',
    home_section_main: 'Main functions',
    app_scanner: 'Scanner',
    app_scanner_desc: 'Read fault codes across all modules.',
    app_reprograms: 'Reprogram',
    app_reprograms_desc: 'ECU and module reprogramming.',
    app_dyno: 'Dyno',
    app_dyno_desc: 'Vehicle performance testing.',
    app_history: 'History',
    app_history_desc: 'View past records.',
    app_about: 'About',
    app_about_desc: 'System information and support.',
    vc_status_online: 'OBD-II ONLINE',
    vc_status_offline: 'OBD-II OFFLINE',
    vc_view_details: 'View details',
    sys_panel_title: 'Vehicle system',
    sys_voltage: 'Battery voltage',
    sys_temperature: 'Engine temperature',
    sys_rpm: 'Engine RPM',
    sys_speed: 'Speed',
    sys_fuel: 'Fuel',
    sys_state: 'Status',
    sys_state_ok: 'No errors',
    sys_state_warn: 'Warnings',
    sys_state_crit: 'Critical',
    sys_state_offline: 'Offline',
    dock_home: 'Home',
    dock_scanner: 'Scanner',
    dock_reprograms: 'Reprogram',
    dock_dyno: 'Dyno',
    dock_history: 'History',
    dock_settings: 'Settings',
    conn_title: 'OBD-II Connection',
    conn_required: 'OBD-II connector not detected',
    conn_required_sub: 'Sit in the driver seat and plug the OBD-II cable into the port below the steering wheel.',
    conn_action: 'Start Connection',
    conn_plug_in: 'Plug Cable',
    conn_unplug: 'Unplug Cable',
    conn_release: 'Release to lock',
    conn_keep_dragging: 'Keep dragging',
    conn_attempt: 'Locking attempt',
    conn_misaligned: 'Connector misaligned, try again.',
    conn_connecting: 'Connecting to ECU...',
    conn_handshake: 'Handshake ISO 15765-4 (CAN)',
    conn_baud: 'Baud rate: 500 kbps',
    conn_ecu_id: 'Identifying ECU',
    conn_vin_read: 'Reading VIN',
    conn_protocol: 'Selected protocol',
    conn_connected: 'CONNECTED',
    conn_active_session: 'Session active',
    conn_disconnect: 'End Session',
    conn_ecu_name: 'Engine Control Module (ECM)',
    conn_usb_detect: 'USB-C OBD-II cable detected',
    conn_voltage: 'Battery voltage',
    conn_protocol_scan: 'Probing supported protocol',
    conn_protocol_found: 'Protocol found',
    conn_iso9141: 'ISO 9141-2: not supported',
    conn_kwp2000: 'KWP2000 (ISO 14230): not supported',
    conn_can_test: 'Testing CAN-H/CAN-L lines',
    conn_can_ok: 'CAN-BUS stabilized',
    conn_ecu_handshake: 'Handshaking main ECU',
    conn_ecu_resp: 'ECU responded',
    conn_session_open: 'Opening diagnostic session',
    conn_reading_vin: 'Reading VIN from module',
    conn_reading_dtc: 'Scanning DTC codes',
    conn_dtc_count: 'codes found',
    conn_ready: 'System ready to receive commands',
    conn_label_vin: 'VIN',
    conn_label_fw: 'ECU FW',
    conn_label_map: 'MAP',
    conn_offline_short: 'OFFLINE',
    conn_off: 'OFF',
    conn_ecu_short: 'ECU',
    sp_modules_title: 'OBD-II Modules',
    sp_full_scan_btn: 'Full Diagnostic',
    sp_scan_idle: 'Awaiting diagnostic',
    sp_scan_start: 'Starting scan...',
    sp_scan_done: 'Diagnostic complete',
    sp_scan_progress: 'Scanning %s...',
    sp_scan_no_codes: 'Diagnostic OK - no codes',
    sp_scan_codes_found: '%d DTC codes found',
    sp_live_title: 'Live Sensors',
    ld_rpm: 'RPM',
    ld_speed: 'Speed',
    ld_coolant: 'Coolant',
    ld_battery: 'Battery',
    ld_fuel: 'Fuel',
    ld_maf: 'MAF',
    ld_throttle: 'Throttle',
    ld_engine_health: 'Engine Health',
    sp_dtc_title: 'DTC Codes',
    sp_dtc_active: 'active',
    sp_dtc_empty: 'No active codes',
    dtc_unknown: 'Unknown code',
    dtc_sev_critical: 'critical',
    dtc_sev_warning: 'warning',
    mod_ecm: 'Engine Control Module',
    mod_tcm: 'Transmission Control',
    mod_abs: 'Anti-lock Braking',
    mod_esp: 'Stability Control',
    mod_bcm: 'Body Control Module',
    mod_srs: 'Supplemental Restraint',
    mod_ipc: 'Instrument Cluster',
    mod_hvac: 'Climate Control',
    dtc_p0171_desc: 'Fuel system lean (Bank 1)',
    dtc_p0301_desc: 'Cylinder 1 misfire',
    dtc_p0420_desc: 'Catalyst efficiency below threshold',
    dtc_p0463_desc: 'Fuel level sensor erratic',
    dtc_p0700_desc: 'Transmission system fault',
    dtc_u0100_desc: 'Lost communication with ECM',
    dtc_b1342_desc: 'Body module fault (BCM)',
    dtc_c1234_desc: 'Front-left wheel sensor',
    sp_btn_reprogram: 'Reprogram ECU',
    sp_btn_dyno: 'Open Dyno',
    vin: 'VIN',
    ecu_version: 'ECU FW',
    scan_plate: 'Plate',
    scan_model: 'Model',
    scan_class: 'Class',
    scan_engine: 'Engine',
    scan_fuel: 'Fuel',
    scan_body: 'Body',
    scan_kms: 'Mileage',
    scan_lock: 'Locks',
    scan_dtc: 'DTC Codes',
    scan_dtc_none: 'No active codes',
    scan_btn_reprog: 'Reprogram ECU',
    scan_btn_dyno: 'Open Dynamometer',
    repro_title: 'ECU Reprograms',
    repro_current: 'Active map',
    repro_none: 'Stock (OEM)',
    repro_apply: 'Apply',
    repro_remove: 'Restore OEM',
    repro_cost: 'Cost',
    repro_free: 'Free',
    repro_already: 'This map is already flashed on this ECU.',
    repro_warning: 'Reprogramming alters vehicle handling/power. The operation takes up to 12 seconds.',
    repro_confirm: 'Confirm flashing',
    repro_tunable: 'Configurable',
    repro_needs_conn: 'Connect the tablet to an ECU first.',
    repro_stock: 'OEM',
    repro_stock_desc: 'Restore the ECU to original manufacturer maps.',
    repro_sport: 'Sport',
    repro_sport_desc: 'Stage 1: +power, aggressive ignition map, exhaust pops.',
    repro_drag: 'Drag',
    repro_drag_desc: 'Stage 3 dragstrip: limiter removed, full torque in straight line.',
    repro_drift: 'Drift',
    repro_drift_desc: 'Drift map: handbrake mapping, aggressive throttle response.',
    repro_eco: 'Eco',
    repro_eco_desc: 'Efficient map: limits injection to reduce consumption.',
    repro_track: 'Track',
    repro_track_desc: 'Stage 2 circuit: optimized power/braking/grip balance.',
    repro_rally: 'Rally',
    repro_rally_desc: 'Rally map: anti-lag, raised suspension, all-surface.',
    repro_valet: 'Valet',
    repro_valet_desc: 'Valet mode: limited power, anti-theft.',
    repro_custom1: 'Tuner Custom',
    repro_custom1_desc: 'Custom tuner map: extreme, requires high-octane fuel.',
    repro_highlights: 'Effects',
    repro_filter_all: 'All',
    repro_filter_perf: 'Performance',
    repro_filter_eco: 'Efficiency',
    repro_filter_track: 'Track',
    repro_filter_util: 'Utility',
    hl_sport_1: '+60% peak power',
    hl_sport_2: '+35% top speed',
    hl_sport_3: 'Aggressive ignition map',
    hl_sport_4: 'Exhaust pops',
    hl_drag_1: '+120% drive force',
    hl_drag_2: '+70% top speed',
    hl_drag_3: 'Launch control mapping',
    hl_drag_4: 'Rev limiter removed',
    hl_drift_1: '+15% power (slide control focus)',
    hl_drift_2: '+30% steering lock',
    hl_drift_3: 'Slippery rear (low grip)',
    hl_drift_4: 'Handbrake mapping + aggressive throttle',
    hl_eco_1: '-58% power',
    hl_eco_2: '-32% top speed',
    hl_eco_3: 'Smooth throttle response',
    hl_eco_4: 'Reduces consumption ~22%',
    hl_custom1_1: 'Client-configurable',
    hl_custom1_2: 'Power, speed, grip sliders',
    hl_custom1_3: 'Unique map per session',
    hl_stock_1: 'Restore factory calibration',
    hl_stock_2: 'Removes all aftermarket maps',
    hl_stock_3: 'OEM warranty compliant',
    hl_custom_power: '+%s%% power',
    hl_custom_speed: '+%s%% top speed',
    hl_custom_brakes: '+%s%% braking',
    hl_custom_unique: 'User-tuned map',
    modal_title_repro: 'Confirm Flash',
    modal_duration: 'Duration',
    modal_warranty: 'Warranty',
    modal_warranty_void: 'Voided',
    modal_warranty_kept: 'Kept',
    modal_fuel: 'Fuel',
    modal_warning_msg: 'Flashing alters the vehicle handling/power. Engine off is recommended.',
    modal_cost_total: 'Total cost',
    btn_confirm_flash: 'Confirm Flash',
    effect_stock_1: 'Restore factory parameters',
    effect_stock_2: 'Original OEM calibration',
    custom_title: 'Custom Tuner',
    custom_subtitle: 'Adjust your custom map parameters',
    custom_label_hp: 'Power (HP)',
    custom_label_topspeed: 'Top Speed',
    custom_label_accel: 'Acceleration',
    custom_label_brakes: 'Braking',
    custom_label_grip: 'Grip',
    custom_label_susp: 'Suspension',
    custom_cost: 'Cost:',
    custom_reset: 'Reset',
    custom_apply: 'Save Map',
    custom_applied_desc: 'User-configured map',
    c_session_open: '[UDS] Diagnostic session opened (0x10 0x03 Programming)',
    c_sec_seed: '[UDS] Security Access seed request (0x27 0x01)',
    c_sec_key: '[UDS] Computing seed/key response... OK',
    c_sec_unlock: '[UDS] Security unlocked (Level 2)',
    c_routine_start: '[UDS] Routine 0xFF00 startRoutine: erase memory',
    c_erase_block: '[FLASH] Erasing block 0x%s ... OK',
    c_write_block: '[FLASH] Writing block 0x%s (%d bytes)',
    c_checksum: '[FLASH] Checksum CRC32: %s',
    c_verify: '[UDS] Routine 0xFF01 checkProgrammingDependencies',
    c_ecu_reset: '[UDS] ECUReset (0x11 0x01)',
    c_session_close: '[UDS] Returning to default session (0x10 0x01)',
    c_done: '[OK] Reprogramming complete. Calibration: %s',
    c_error: '[ERR] %s',
    dyno_title: 'Dynamometer Bench',
    dyno_subtitle: 'Power bench simulation',
    dyno_run: 'Start Pull',
    dyno_running: 'Pull in progress...',
    dyno_idle: 'Standby',
    dyno_done: 'Measurement complete',
    dyno_stock_hp: 'OEM',
    dyno_current_hp: 'Current',
    dyno_gain: 'Gain',
    dyno_hp: 'hp',
    dyno_torque: 'Torque',
    dyno_nm: 'Nm',
    dyno_peak_rpm: 'Peak RPM',
    dyno_map: 'Current map',
    dyno_needs_conn: 'Connect the tablet to an ECU first.',
    dyno_afr: 'AFR',
    dyno_boost: 'Boost',
    dyno_bar: 'bar',
    dyno_temp: 'Coolant temp',
    dyno_celsius: '°C',
    dyno_speed: 'Speed',
    dyno_kmh: 'km/h',
    dyno_runtime: 'Runtime',
    dyno_sec: 's',
    dyno_vehicle: 'Vehicle',
    dyno_session: 'Session',
    dyno_no_data: 'No data. Start a pull to measure.',
    dyno_progress: 'Progress',
    dyno_power_band: 'Power band',
    dyno_peak_label: 'Peak',
    history_title: 'Reprogramming History',
    history_tab_this: 'This vehicle',
    history_tab_all: 'All',
    history_empty: 'No records.',
    history_when: 'Date/Time',
    history_who: 'Technician',
    history_what: 'Map',
    history_action: 'Operation',
    history_plate: 'Plate',
    history_apply: 'Flash',
    history_reset: 'OEM Reset',
    about_title: 'OBD-OS',
    about_version: 'Version',
    about_protocol: 'Protocol',
    about_cable: 'Cable',
    about_developer: 'Manufacturer',
    about_license: 'License',
    settings_title: 'Settings',
    settings_system: 'System',
    settings_version: 'Version',
    settings_protocol: 'Protocol',
    settings_cable: 'Cable',
    settings_kernel: 'Kernel',
    settings_manufacturer: 'Manufacturer',
    settings_config: 'Configuration',
    settings_config_note: 'All settings (language, costs, job restrictions, custom reprograms) are managed in <code>config.lua</code>. Ask your administrator to change them.',
    btn_apply: 'Apply',
    btn_cancel: 'Cancel',
    btn_close: 'Close',
    btn_confirm: 'Confirm',
    btn_back: 'Back',
    btn_refresh: 'Refresh',
  };

  // ------------------------------------------------------------------
  //  Boot — post the {action:'open'} message (mirrors client/nui.lua ShowUI).
  // ------------------------------------------------------------------
  function boot() {
    window.postMessage({
      action: 'open',
      locale: LOCALE,
      localeCode: 'en',
      reprograms: buildReprograms(),
      branding: BRANDING,
      config: CONFIG,
    }, '*');
  }

  function start() {
    var booted = false;
    function go() {
      if (booted) return;
      booted = true;
      boot();
    }
    // Wait for the website overlay's "start" signal so the OBD boot/loading
    // sequence plays WHEN the visitor clicks "Click to interact", not silently
    // behind the overlay. Fallback: boot anyway after a few seconds (covers the
    // demo being opened directly, outside the site).
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d && d.type === 'oxlyn-live-preview:start') go();
    });
    setTimeout(go, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
