/* ==========================================================================
 *  OXLYN-MDT | Website Live-Preview bridge
 * ==========================================================================
 *  In the real resource the NUI ("MDT & Dispatch System") is driven by:
 *    1. the FiveM game client — client/main.lua posts
 *         SendNUIMessage({ action:'open', meta, config, locale, locales, localeCode })
 *       on the configured keybind, after a SetNuiFocus + canOpen check.
 *    2. the Lua server — every UI action is a NUI callback that fetches
 *         https://oxlyn-mdt/<name>  (POST, JSON body)  and the matching
 *       client RegisterNUICallback answers with cb(<json>). The shape of
 *       each cb(...) is what this bridge mirrors below.
 *
 *  Neither exists in a browser. This bridge plays BOTH roles so the exact
 *  same html/css/js runs, interactively, on the sales website:
 *    - overrides window.fetch to intercept every NUI callback and serve
 *      in-memory mock data shaped exactly like the Lua cb(...) responses
 *      (derived from client/*.lua + server/*.lua + install.sql + config.lua);
 *    - posts the boot {action:'open'} message with a config payload that
 *      mirrors client/main.lua openTablet(), then auto-passes the lock
 *      screen (clicks #lock-start, the element app.js binds loginToSession
 *      to) so the preview lands on a populated dashboard.
 *
 *  app.js resolves the resource name as:
 *     RESOURCE_NAME = typeof GetParentResourceName==='function'
 *                       ? GetParentResourceName() : 'oxlyn-mdt';
 *  In a browser GetParentResourceName is undefined, so every callback hits
 *  https://oxlyn-mdt/<name> — which is what NUI_RE matches.
 *
 *  In-memory, reset on reload.
 * ========================================================================== */
(function () {
  'use strict';

  // ====================================================================
  //  Small helpers
  // ====================================================================
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function sqlTime(epochSecs) {
    var d = new Date(epochSecs * 1000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function nowSecs() { return Math.floor(Date.now() / 1000); }
  function ago(secs) { return sqlTime(nowSecs() - secs); }
  var H = 3600, D = 86400, M = 60;
  function nextId(arr) { var m = 0; arr.forEach(function (r) { if ((r.id || 0) > m) m = r.id; }); return m + 1; }

  // ====================================================================
  //  Signed-in officer (mirrors server canOpen cb meta)
  // ====================================================================
  var ME = {
    firstname: 'Alex',
    lastname: 'Carter',
    job: 'police',
    jobLabel: 'Police',
    grade: 4,
    gradeLabel: 'Chief',
    identifier: 'char1:demo_alex',
    serverId: 1,
    headshot: null
  };

  // ====================================================================
  //  Citizens (toLegacyShape + getCitizen full profile)
  //   list rows:   identifier, firstname, lastname, dateofbirth, sex,
  //                height, phone_number, job, job_grade, serverId,
  //                records_count, fines_pending_count
  //   full profile (getCitizen cb): identifier, firstname, lastname, dob,
  //                sex, height, phone, job, jobGrade, bank, records[],
  //                vehicles[], fines[], serverId
  // ====================================================================
  var CITIZENS = [
    {
      identifier: 'char1:marcus_reed', firstname: 'Marcus', lastname: 'Reed',
      dob: '1991-03-14', sex: 'M', height: 182, phone: '555-0192',
      job: 'unemployed', jobGrade: 0, bank: 12450, serverId: 14,
      records: [
        { id: 5101, crime: 'Drug trafficking', fine: 8000, jail: 60, notes: 'Caught with 2kg in Grove St.', officer: 'Officer J. Wilson', created_at: ago(2 * D + 4 * H) },
        { id: 5102, crime: 'Resisting arrest', fine: 1500, jail: 15, notes: '', officer: 'Sgt. M. Brown', created_at: ago(2 * D + 4 * H) },
        { id: 5103, crime: 'Illegal firearm', fine: 3500, jail: 30, notes: 'Unregistered SMG.', officer: 'Officer A. Carter', created_at: ago(40 * D) }
      ],
      fines: [
        { id: 7201, amount: 250, reason: 'Speeding (Route 1)', officer: 'Officer E. Davis', paid: 0, created_at: ago(6 * H) },
        { id: 7202, amount: 800, reason: 'Driving under influence', officer: 'Officer A. Carter', paid: 1, created_at: ago(9 * D) }
      ],
      vehicles: [
        { plate: '88KQR210', model: 'Sultan RS', stored: 0, stolen: 0 },
        { plate: '47ABZ995', model: 'Buffalo STX', stored: 1, stolen: 0 }
      ]
    },
    {
      identifier: 'char1:sofia_mendez', firstname: 'Sofia', lastname: 'Mendez',
      dob: '1996-09-02', sex: 'F', height: 168, phone: '555-0145',
      job: 'mechanic', jobGrade: 2, bank: 38900, serverId: 22,
      records: [
        { id: 5110, crime: 'Receiving stolen goods', fine: 1500, jail: 60, notes: 'Chop-shop parts.', officer: 'Det. R. Garcia', created_at: ago(11 * D) }
      ],
      fines: [
        { id: 7210, amount: 80, reason: 'Illegal parking', officer: 'Officer O. Martinez', paid: 0, created_at: ago(20 * H) }
      ],
      vehicles: [
        { plate: 'MEND001', model: 'Asea', stored: 0, stolen: 0 }
      ]
    },
    {
      identifier: 'char1:darnell_cole', firstname: 'Darnell', lastname: 'Cole',
      dob: '1988-12-21', sex: 'M', height: 190, phone: '555-0178',
      job: 'unemployed', jobGrade: 0, bank: 540, serverId: null,
      records: [
        { id: 5120, crime: 'Robbery', fine: 3500, jail: 120, notes: 'Armed, Fleeca Bank.', officer: 'Officer A. Carter', created_at: ago(1 * D + 2 * H) },
        { id: 5121, crime: 'Attempted murder', fine: 15000, jail: 360, notes: 'Shots at responding units.', officer: 'Lt. S. Mitchell', created_at: ago(1 * D + 2 * H) }
      ],
      fines: [],
      vehicles: [
        { plate: 'COLE777', model: 'Dominator', stored: 0, stolen: 1 }
      ]
    },
    {
      identifier: 'char1:emily_nguyen', firstname: 'Emily', lastname: 'Nguyen',
      dob: '2000-06-30', sex: 'F', height: 165, phone: '555-0133',
      job: 'taxi', jobGrade: 1, bank: 9210, serverId: 31,
      records: [],
      fines: [
        { id: 7230, amount: 150, reason: 'Public intoxication', officer: 'Officer D. Thompson', paid: 0, created_at: ago(3 * D) }
      ],
      vehicles: [
        { plate: 'TAXI042', model: 'Taxi', stored: 0, stolen: 0 }
      ]
    },
    {
      identifier: 'char1:viktor_petrov', firstname: 'Viktor', lastname: 'Petrov',
      dob: '1983-01-09', sex: 'M', height: 188, phone: '555-0210',
      job: 'unemployed', jobGrade: 0, bank: 204500, serverId: null,
      records: [
        { id: 5130, crime: 'Money laundering', fine: 8000, jail: 180, notes: 'Front: car wash on Elgin Ave.', officer: 'Det. R. Garcia', created_at: ago(30 * D) },
        { id: 5131, crime: 'Illegal firearm', fine: 3500, jail: 30, notes: '', officer: 'Sgt. M. Brown', created_at: ago(60 * D) }
      ],
      fines: [],
      vehicles: [
        { plate: 'PTRV001', model: 'Cognoscenti', stored: 1, stolen: 0 },
        { plate: 'PTRV002', model: 'Schafter LWB', stored: 0, stolen: 0 }
      ]
    },
    {
      identifier: 'char1:hannah_brooks', firstname: 'Hannah', lastname: 'Brooks',
      dob: '1994-11-18', sex: 'F', height: 171, phone: '555-0166',
      job: 'ambulance', jobGrade: 3, bank: 51200, serverId: 18,
      records: [],
      fines: [],
      vehicles: [
        { plate: 'BRKS220', model: 'Issi', stored: 0, stolen: 0 }
      ]
    }
  ];

  function legacyRow(c) {
    return {
      identifier: c.identifier,
      firstname: c.firstname, lastname: c.lastname,
      dateofbirth: c.dob, sex: c.sex, height: c.height,
      phone_number: c.phone, job: c.job, job_grade: c.jobGrade,
      serverId: c.serverId || undefined,
      records_count: (c.records || []).length,
      fines_pending_count: (c.fines || []).filter(function (f) { return !f.paid; }).length
    };
  }
  function findCitizen(ident) {
    for (var i = 0; i < CITIZENS.length; i++) if (CITIZENS[i].identifier === ident) return CITIZENS[i];
    return null;
  }

  // ====================================================================
  //  Vehicles (searchVehicle result rows + getVehicleDetail bolos)
  // ====================================================================
  var VEHICLES = [
    { plate: '88KQR210', model: 'Sultan RS', make: 'Karin', stored: 0, stolen: 0, ownerId: 'char1:marcus_reed', ownerName: 'Marcus Reed', ownerDob: '1991-03-14', ownerSex: 'M', warrantCount: 1, unpaidFines: 1, recordCount: 3, boloMatch: 0 },
    { plate: 'COLE777', model: 'Dominator', make: 'Vapid', stored: 0, stolen: 1, ownerId: 'char1:darnell_cole', ownerName: 'Darnell Cole', ownerDob: '1988-12-21', ownerSex: 'M', warrantCount: 2, unpaidFines: 0, recordCount: 2, boloMatch: 1 },
    { plate: 'PTRV001', model: 'Cognoscenti', make: 'Enus', stored: 1, stolen: 0, ownerId: 'char1:viktor_petrov', ownerName: 'Viktor Petrov', ownerDob: '1983-01-09', ownerSex: 'M', warrantCount: 0, unpaidFines: 0, recordCount: 2, boloMatch: 0 },
    { plate: 'MEND001', model: 'Asea', make: 'Declasse', stored: 0, stolen: 0, ownerId: 'char1:sofia_mendez', ownerName: 'Sofia Mendez', ownerDob: '1996-09-02', ownerSex: 'F', warrantCount: 0, unpaidFines: 1, recordCount: 1, boloMatch: 0 },
    { plate: 'TAXI042', model: 'Taxi', make: 'Vapid', stored: 0, stolen: 0, ownerId: 'char1:emily_nguyen', ownerName: 'Emily Nguyen', ownerDob: '2000-06-30', ownerSex: 'F', warrantCount: 0, unpaidFines: 1, recordCount: 0, boloMatch: 0 }
  ];
  function normPlate(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  // ====================================================================
  //  Reports (listReports rows)
  // ====================================================================
  var REPORTS = [
    { id: 301, title: 'Bank robbery — Fleeca Legion Sq.', category: 'Investigation', content: 'Two masked suspects fled north on bikes after taking ~$45,000. One unit in pursuit, shots exchanged. Suspect vehicle plate COLE777 confirmed stolen.', involved: 'Darnell Cole, unidentified male', officer: 'Officer A. Carter', created_at: ago(1 * D + 1 * H) },
    { id: 302, title: 'Traffic collision — Route 68', category: 'Traffic Accident', content: 'Single vehicle rollover, driver intoxicated. EMS on scene. Vehicle towed, driver cited for DUI.', involved: 'Emily Nguyen', officer: 'Officer D. Thompson', created_at: ago(2 * D + 5 * H) },
    { id: 303, title: 'Narcotics surveillance — Grove Street', category: 'Seizure', content: 'Observed repeated short visits consistent with distribution. Seized 2kg of suspected product and an unregistered SMG.', involved: 'Marcus Reed', officer: 'Det. R. Garcia', created_at: ago(4 * D) },
    { id: 304, title: 'Routine patrol — Vespucci Beach', category: 'Patrol', content: 'Nothing significant to report. Two verbal warnings issued for noise complaints.', involved: '', officer: 'Officer J. Wilson', created_at: ago(8 * H) }
  ];

  // ====================================================================
  //  Incidents (listIncidents rows; getIncident adds photos[])
  //   list: id,title,type,location,suspects,description,weapons,officer,
  //         created_at,hero_b64,hero_mime,photo_count
  // ====================================================================
  var INCIDENTS = [
    { id: 401, title: 'Warehouse raid — La Mesa', type: 'apreensao', location: 'La Mesa Industrial', suspects: 'Viktor Petrov', description: 'Coordinated raid recovered laundered cash and multiple firearms. Two arrests made.', weapons: JSON.stringify(['WEAPON_ASSAULTRIFLE', 'WEAPON_PISTOL50']), officer: 'Lt. S. Mitchell', created_at: ago(3 * D), hero_b64: null, hero_mime: null, photo_count: 0 },
    { id: 402, title: 'Pursuit & arrest — Mirror Park', type: 'detencao', location: 'Mirror Park Blvd', suspects: 'Darnell Cole', description: 'High-speed pursuit ended in spike strip deployment. Suspect taken into custody without injury.', weapons: JSON.stringify(['WEAPON_COMBATPISTOL']), officer: 'Officer A. Carter', created_at: ago(1 * D + 3 * H), hero_b64: null, hero_mime: null, photo_count: 0 },
    { id: 403, title: 'Traffic surveillance — Del Perro', type: 'vigilancia', location: 'Del Perro Fwy', suspects: '', description: 'Monitoring recurring street-racing activity reported by citizens.', weapons: null, officer: 'Officer O. Martinez', created_at: ago(12 * H), hero_b64: null, hero_mime: null, photo_count: 0 }
  ];

  // ====================================================================
  //  Properties (listProperties rows; getProperty adds photos[])
  // ====================================================================
  var PROPERTIES = [
    { id: 501, address: '14 Grove Street', district: 'Davis', type: 'esconderijo', status: 'sob_vigilancia', suspects: 'Marcus Reed', tags: 'trafficking,gang_families', description: 'Suspected stash house, heavy foot traffic at night.', image_url: '', gps_x: 120.5, gps_y: -1920.0, officer: 'Det. R. Garcia', created_at: ago(6 * D), updated_at: ago(1 * D), hero_b64: null, hero_mime: null, photo_count: 0 },
    { id: 502, address: 'Elgin Ave Car Wash', district: 'Strawberry', type: 'comercial', status: 'suspeita', suspects: 'Viktor Petrov', tags: 'laundering,cartel', description: 'Front business, cash volume inconsistent with traffic.', image_url: '', gps_x: 64.0, gps_y: -1390.0, officer: 'Lt. S. Mitchell', created_at: ago(10 * D), updated_at: ago(3 * D), hero_b64: null, hero_mime: null, photo_count: 0 },
    { id: 503, address: 'Unit 7, La Mesa Storage', district: 'La Mesa', type: 'armazem', status: 'raid_concluido', suspects: 'Viktor Petrov', tags: 'weapons,vault', description: 'Raided. Firearms and laundered cash seized. See incident #401.', image_url: '', gps_x: 820.0, gps_y: -1290.0, officer: 'Lt. S. Mitchell', created_at: ago(20 * D), updated_at: ago(3 * D), hero_b64: null, hero_mime: null, photo_count: 0 }
  ];

  // ====================================================================
  //  Warrants (listWarrants / getWarrant rows)
  // ====================================================================
  var WARRANTS = [
    { id: 601, citizen_identifier: 'char1:darnell_cole', citizen_name: 'Darnell Cole', type: 'arrest', status: 'active', charges: 'Robbery; Attempted murder; Vehicle theft', description: 'Armed and dangerous. Last seen fleeing on a Dominator (plate COLE777).', reward: 25000, expires_at: ago(-7 * D), image_url: '', issued_by: 'Lt. S. Mitchell', issued_by_id: 'char1:demo_mitchell', executed_by: null, executed_by_id: null, executed_at: null, notes: 'Approach with caution.', created_at: ago(1 * D), updated_at: ago(1 * D) },
    { id: 602, citizen_identifier: 'char1:viktor_petrov', citizen_name: 'Viktor Petrov', type: 'search', status: 'active', charges: 'Money laundering; Illegal firearm possession', description: 'Search warrant for Elgin Ave car wash and connected storage units.', reward: 0, expires_at: ago(-14 * D), image_url: '', issued_by: 'Chief A. Carter', issued_by_id: 'char1:demo_alex', executed_by: null, executed_by_id: null, executed_at: null, notes: '', created_at: ago(3 * D), updated_at: ago(3 * D) },
    { id: 603, citizen_identifier: 'char1:marcus_reed', citizen_name: 'Marcus Reed', type: 'arrest', status: 'executed', charges: 'Drug trafficking; Resisting arrest', description: '', reward: 8000, expires_at: null, image_url: '', issued_by: 'Sgt. M. Brown', issued_by_id: 'char1:demo_brown', executed_by: 'Officer A. Carter', executed_by_id: 'char1:demo_alex', executed_at: ago(2 * D + 4 * H), notes: 'Taken into custody at Grove St.', created_at: ago(5 * D), updated_at: ago(2 * D) }
  ];

  // ====================================================================
  //  Offences catalog (listOffences / listAllOffences) — from install.sql
  // ====================================================================
  var OFFENCES = [
    ['traffic', 'T-001', 'Minor speeding', 'Up to 20 km/h above the posted limit.', 150, 0, 'minor'],
    ['traffic', 'T-002', 'Excessive speeding', 'More than 40 km/h above the limit or in a school zone.', 500, 5, 'moderate'],
    ['traffic', 'T-004', 'Driving under the influence', 'Blood alcohol level above the legal limit.', 900, 15, 'serious'],
    ['traffic', 'T-008', 'Hit and run', 'Collision with a pedestrian resulting in injury.', 2500, 60, 'severe'],
    ['traffic', 'T-009', 'Fleeing from police', 'Failure to stop the vehicle when ordered by an officer.', 1500, 20, 'serious'],
    ['property', 'P-003', 'Robbery', 'Taking property by force, violence or threat.', 3500, 120, 'serious'],
    ['property', 'P-005', 'Vehicle theft', 'Unlawful taking of a motor vehicle.', 3000, 120, 'serious'],
    ['violent', 'V-002', 'Aggravated assault', 'Assault causing serious injury or involving a weapon.', 2500, 120, 'serious'],
    ['violent', 'V-005', 'Attempted murder', 'Acting with intent to kill, where death did not occur.', 15000, 360, 'critical'],
    ['violent', 'V-006', 'Murder', 'Intentionally causing the death of another person.', 25000, 480, 'critical'],
    ['violent', 'V-007', 'Resisting arrest', 'Active opposition to a lawful order from an officer.', 1500, 15, 'moderate'],
    ['drug', 'D-002', 'Drug possession (intent to sell)', 'Possession with indication of distribution or sale.', 3000, 120, 'serious'],
    ['drug', 'D-003', 'Drug trafficking', 'Sale, transport or production of illicit substances.', 8000, 180, 'severe'],
    ['order', 'O-003', 'Illegal firearm possession', 'Possession of an unlicensed or unregistered firearm.', 2500, 90, 'serious'],
    ['white_collar', 'W-003', 'Money laundering', 'Concealing the illicit origin of funds.', 8000, 180, 'severe'],
    ['cyber', 'C-002', 'Identity theft', "Use of another person's identity in digital media.", 3500, 90, 'serious']
  ].map(function (r, i) {
    return { id: 900 + i, category: r[0], code: r[1], name: r[2], description: r[3], fine: r[4], jail: r[5], severity: r[6], active: 1, updated_at: ago(15 * D) };
  });

  // ====================================================================
  //  BOLOs (listBolos rows) — install.sql shape + image_b64/image_mime
  // ====================================================================
  var BOLOS = [
    { id: 701, title: 'Stolen Dominator — plate COLE777', description: 'Black Dominator linked to the Fleeca robbery. Plate flagged stolen. Considered armed.', priority: 'critical', target: 'COLE777', image_url: '', image_b64: null, image_mime: null, officer: 'Officer A. Carter', created_at: ago(1 * D), expires_at: ago(-6 * D), active: 1 },
    { id: 702, title: 'Wanted — Darnell Cole', description: 'Suspect in armed robbery and attempted murder. Last seen Mirror Park area.', priority: 'high', target: 'Darnell Cole', image_url: '', image_b64: null, image_mime: null, officer: 'Lt. S. Mitchell', created_at: ago(1 * D + 1 * H), expires_at: ago(-6 * D), active: 1 },
    { id: 703, title: 'Person of interest — Viktor Petrov', description: 'Money laundering investigation. Do not approach; surveillance only.', priority: 'medium', target: 'Viktor Petrov', image_url: '', image_b64: null, image_mime: null, officer: 'Det. R. Garcia', created_at: ago(3 * D), expires_at: ago(-4 * D), active: 1 }
  ];

  // ====================================================================
  //  Bulletins (listBulletins rows)
  // ====================================================================
  var BULLETINS = [
    { id: 801, title: 'Mandatory firearms recertification', body: 'All sworn officers must complete range recertification by end of month. Sign-up sheet at the front desk.', pinned: 1, author: 'Chief A. Carter', author_id: 'char1:demo_alex', created_at: ago(2 * D), updated_at: ago(2 * D) },
    { id: 802, title: 'Increased patrols — Vinewood', body: 'Following a string of break-ins, increase visible patrols in the Vinewood Hills district during night shifts.', pinned: 0, author: 'Lt. S. Mitchell', author_id: 'char1:demo_mitchell', created_at: ago(4 * D), updated_at: ago(4 * D) }
  ];

  // ====================================================================
  //  Tactical units (listUnits rows; members[] enriched)
  // ====================================================================
  var UNITS = [
    {
      id: 1001, callsign: 'ADAM-12', name: 'Downtown Patrol', type: 'patrol', status: 'available', notes: '', created_at: ago(3 * H), updated_at: ago(20 * M),
      members: [
        { identifier: 'char1:demo_alex', is_leader: true, joined_at: ago(3 * H), firstname: 'Alex', lastname: 'Carter', online: true, serverId: 1 },
        { identifier: 'char1:demo_davis', is_leader: false, joined_at: ago(2 * H), firstname: 'Emily', lastname: 'Davis', online: true, serverId: 5 }
      ]
    },
    {
      id: 1002, callsign: 'SWAT-1', name: 'Tactical Response', type: 'swat', status: 'responding', notes: 'Staged for warrant #602.', created_at: ago(1 * H), updated_at: ago(5 * M),
      members: [
        { identifier: 'char1:demo_mitchell', is_leader: true, joined_at: ago(1 * H), firstname: 'Sarah', lastname: 'Mitchell', online: true, serverId: 3 }
      ]
    },
    {
      id: 1003, callsign: 'K9-7', name: 'Canine Support', type: 'k9', status: 'busy', notes: '', created_at: ago(5 * H), updated_at: ago(40 * M),
      members: [
        { identifier: 'char1:demo_garcia', is_leader: true, joined_at: ago(5 * H), firstname: 'Robert', lastname: 'Garcia', online: false, serverId: null }
      ]
    }
  ];

  // ====================================================================
  //  Department roster (listDepartment rows) + Live map officers
  // ====================================================================
  function dbAvatar(seed) { return 'https://api.dicebear.com/7.x/personas/svg?seed=' + encodeURIComponent(seed); }
  var DEPARTMENT = [
    { id: 1, firstname: 'Alex', lastname: 'Carter', job: 'police', jobLabel: 'Police', grade: 4, gradeLabel: 'Chief', online: true, headshot: null, callsign: '001', onDuty: true },
    { id: 3, firstname: 'Sarah', lastname: 'Mitchell', job: 'police', jobLabel: 'Police', grade: 3, gradeLabel: 'Lieutenant', online: true, headshot: null, callsign: '003', onDuty: true },
    { id: 5, firstname: 'Emily', lastname: 'Davis', job: 'police', jobLabel: 'Police', grade: 2, gradeLabel: 'Sergeant', online: true, headshot: null, callsign: '012', onDuty: true },
    { id: 7, firstname: 'James', lastname: 'Wilson', job: 'police', jobLabel: 'Police', grade: 1, gradeLabel: 'Officer', online: true, headshot: null, callsign: '027', onDuty: false },
    { id: 9, firstname: 'Olivia', lastname: 'Martinez', job: 'police', jobLabel: 'Police', grade: 1, gradeLabel: 'Officer', online: true, headshot: null, callsign: '031', onDuty: true }
  ];

  // Live-map units (oxlyn-mdt:liveMapUpdate payload shape). LSPD-ish coords.
  var LIVEMAP = [
    { id: 1, identifier: 'char1:demo_alex', firstname: 'Alex', lastname: 'Carter', job: 'police', grade: 4, gradeLabel: 'Chief', x: 425.1, y: -979.5, heading: 90.0, onDuty: true, callsign: '001', vehicle: 'Police Cruiser', speed: 0, zone: 'Mission Row', headshot: null },
    { id: 3, identifier: 'char1:demo_mitchell', firstname: 'Sarah', lastname: 'Mitchell', job: 'police', grade: 3, gradeLabel: 'Lieutenant', x: 820.0, y: -1290.0, heading: 200.0, onDuty: true, callsign: '003', vehicle: 'Riot', speed: 38, zone: 'La Mesa', headshot: null },
    { id: 5, identifier: 'char1:demo_davis', firstname: 'Emily', lastname: 'Davis', job: 'police', grade: 2, gradeLabel: 'Sergeant', x: -1100.0, y: -240.0, heading: 15.0, onDuty: true, callsign: '012', vehicle: 'Police Bike', speed: 52, zone: 'Vinewood', headshot: null },
    { id: 9, identifier: 'char1:demo_martinez', firstname: 'Olivia', lastname: 'Martinez', job: 'police', grade: 1, gradeLabel: 'Officer', x: 120.5, y: -1920.0, heading: 270.0, onDuty: true, callsign: '031', vehicle: null, speed: 0, zone: 'Davis', headshot: null }
  ];

  // ====================================================================
  //  Dispatch calls (listDispatches rows) — server publicDispatch shape
  // ====================================================================
  // NOTE: listDispatches drops any call whose expiresAt has passed (mirrors the
  // Lua cleanup loop). In-game these are short-lived (per-type `expire`), but for
  // a static sales preview we want the Dispatch view to STAY populated for the
  // whole session, so every call uses a comfortably long expiresAt (~30 min out).
  // `ts` stays in the recent past so timeAgo() reads realistically and the list
  // sorts newest-first. Every `type` is a valid key in config.dispatchTypes
  // (shots_fired/robbery/vehicle_chase/traffic_stop/melee/suspicious/backup/citizen_call).
  var DISPATCH = [
    { id: 21, type: 'robbery', x: 240.0, y: 220.0, z: 106.0, zone: 'Legion Square', description: '10-31 — Fleeca Bank robbery in progress. Two masked suspects, one armed with a rifle.', author: 'Citizen Call', authorId: null, ts: nowSecs() - 45, expiresAt: nowSecs() + 30 * M },
    { id: 22, type: 'shots_fired', x: 120.5, y: -1920.0, z: 21.0, zone: 'Davis', description: '10-71 — Multiple shots heard near Grove Street. Caller reports two males fleeing on foot.', author: 'Sistema', authorId: null, ts: nowSecs() - 70, expiresAt: nowSecs() + 30 * M },
    { id: 23, type: 'vehicle_chase', x: 820.0, y: -1290.0, z: 26.0, zone: 'La Mesa', description: '10-80 — Pursuit in progress. Black Dominator, plate COLE777 (flagged stolen), heading east toward the freeway.', author: 'Officer A. Carter', authorId: 'char1:demo_alex', ts: nowSecs() - 110, expiresAt: nowSecs() + 30 * M },
    { id: 24, type: 'backup', x: -1100.0, y: -240.0, z: 37.0, zone: 'Vinewood', description: '10-78 — Officer requesting backup. Foot pursuit of suspect, lost visual near the boulevard.', author: 'Officer E. Davis', authorId: 'char1:demo_davis', ts: nowSecs() - 25, expiresAt: nowSecs() + 30 * M },
    { id: 25, type: 'traffic_stop', x: 425.1, y: -979.5, z: 30.0, zone: 'Mission Row', description: 'Traffic stop — blue Sultan RS, plate 88KQR210. Driver has an outstanding warrant.', author: 'Officer O. Martinez', authorId: 'char1:demo_martinez', ts: nowSecs() - 160, expiresAt: nowSecs() + 30 * M },
    { id: 26, type: 'melee', x: -1280.0, y: -360.0, z: 36.0, zone: 'Del Perro', description: '10-16 — Reported assault outside the boardwalk bar. Possible injuries, EMS requested.', author: 'Citizen Call', authorId: null, ts: nowSecs() - 4 * M, expiresAt: nowSecs() + 30 * M },
    { id: 27, type: 'suspicious', x: 64.0, y: -1390.0, z: 29.0, zone: 'Strawberry', description: 'Suspicious person loitering around the Elgin Ave car wash after hours. Possible link to the laundering case.', author: 'Det. R. Garcia', authorId: 'char1:demo_garcia', ts: nowSecs() - 7 * M, expiresAt: nowSecs() + 30 * M }
  ];

  // ====================================================================
  //  Internal messages by channel (listMessages rows)
  // ====================================================================
  var MESSAGES = {
    general: [
      { id: 1, channel: 'general', author: 'Lt. S. Mitchell', author_id: 'char1:demo_mitchell', message: 'Briefing at 1800. All units acknowledge.', created_at: ago(3 * H) },
      { id: 2, channel: 'general', author: 'Officer J. Wilson', author_id: 'char1:demo_wilson', message: 'Copy that, ADAM-12 en route.', created_at: ago(2 * H + 40 * M) },
      { id: 7, channel: 'general', author: 'Officer O. Martinez', author_id: 'char1:demo_martinez', message: 'Heads up — stolen Dominator (COLE777) tagged in the BOLO list, treat as armed.', created_at: ago(1 * H + 25 * M) },
      { id: 8, channel: 'general', author: 'Sgt. E. Davis', author_id: 'char1:demo_davis', message: 'Need a second unit for the Legion Square call, suspects still on scene.', created_at: ago(55 * M) },
      { id: 3, channel: 'general', author: 'Officer A. Carter', author_id: 'char1:demo_alex', message: 'Reminder: file all reports before end of shift.', created_at: ago(40 * M) },
      { id: 9, channel: 'general', author: 'Lt. S. Mitchell', author_id: 'char1:demo_mitchell', message: 'SWAT-1 is staged for the Petrov search warrant — hold position until my go.', created_at: ago(18 * M) },
      { id: 10, channel: 'general', author: 'Det. R. Garcia', author_id: 'char1:demo_garcia', message: 'Copy. Surveillance confirms the car wash is active again tonight.', created_at: ago(6 * M) }
    ],
    patrol: [
      { id: 4, channel: 'patrol', author: 'Officer E. Davis', author_id: 'char1:demo_davis', message: 'Quiet on the east side so far.', created_at: ago(1 * H) },
      { id: 11, channel: 'patrol', author: 'Officer J. Wilson', author_id: 'char1:demo_wilson', message: 'Running radar on Route 68, two stops so far.', created_at: ago(35 * M) },
      { id: 12, channel: 'patrol', author: 'Officer O. Martinez', author_id: 'char1:demo_martinez', message: 'Heading to Mission Row for the traffic stop, plate 88KQR210.', created_at: ago(8 * M) }
    ],
    detective: [
      { id: 5, channel: 'detective', author: 'Det. R. Garcia', author_id: 'char1:demo_garcia', message: 'Petrov surveillance photos uploaded to incident #401.', created_at: ago(5 * H) }
    ],
    command: [
      { id: 6, channel: 'command', author: 'Chief A. Carter', author_id: 'char1:demo_alex', message: 'Approved overtime for the Cole manhunt.', created_at: ago(6 * H) }
    ]
  };

  // ====================================================================
  //  Audit logs (listLogs rows)
  // ====================================================================
  var LOGS = [
    { id: 1, action: 'execute', target_type: 'warrant', target_id: '603', details: 'Marcus Reed', actor: 'Officer A. Carter', actor_id: 'char1:demo_alex', created_at: ago(2 * D + 4 * H) },
    { id: 2, action: 'create', target_type: 'bolo', target_id: '701', details: 'Stolen Dominator — plate COLE777', actor: 'Officer A. Carter', actor_id: 'char1:demo_alex', created_at: ago(1 * D) },
    { id: 3, action: 'create', target_type: 'warrant', target_id: '601', details: 'Darnell Cole', actor: 'Lt. S. Mitchell', actor_id: 'char1:demo_mitchell', created_at: ago(1 * D) },
    { id: 4, action: 'status_change', target_type: 'property', target_id: '503', details: 'raid_concluido', actor: 'Lt. S. Mitchell', actor_id: 'char1:demo_mitchell', created_at: ago(3 * D) }
  ];

  // ====================================================================
  //  Dashboard (getDashboard cb)
  // ====================================================================
  function buildDashboard() {
    function hourly(seed) { var a = []; for (var i = 0; i < 24; i++) a.push(Math.max(0, Math.round(Math.sin((i + seed) / 3) * 3 + 3 + (Math.random() * 2 - 1)))); return a; }
    var feed = [];
    REPORTS.slice(0, 3).forEach(function (r) { feed.push({ kind: 'record', id: r.id, title: r.title, by: r.officer, created_at: r.created_at }); });
    BOLOS.slice(0, 2).forEach(function (b) { feed.push({ kind: 'bolo', id: b.id, title: b.title, by: b.officer, created_at: b.created_at }); });
    INCIDENTS.slice(0, 2).forEach(function (i) { feed.push({ kind: 'incident', id: i.id, title: i.title, by: i.officer, created_at: i.created_at }); });
    feed.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });

    var recentRecords = [];
    CITIZENS.forEach(function (c) {
      (c.records || []).forEach(function (r) {
        recentRecords.push({ id: r.id, identifier: c.identifier, crime: r.crime, officer: r.officer, created_at: r.created_at });
      });
    });
    recentRecords.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    recentRecords = recentRecords.slice(0, 10);

    var unpaidFines = 0;
    CITIZENS.forEach(function (c) { (c.fines || []).forEach(function (f) { if (!f.paid) unpaidFines++; }); });

    var hk = { records: hourly(0), bolos: hourly(5), incidents: hourly(9), dispatches: hourly(13) };
    return {
      officers: DEPARTMENT.filter(function (d) { return d.onDuty; }).length,
      bolos: BOLOS.filter(function (b) { return b.active; }).length,
      fines: unpaidFines,
      recentRecords: recentRecords,
      recentActivity: feed.slice(0, 8),
      hourly: hk.records,
      hourlyByKind: hk
    };
  }

  // ====================================================================
  //  NUI callback handlers — keyed by callback name. Return value is
  //  exactly what the Lua RegisterNUICallback cb(...) would send.
  // ====================================================================
  var handlers = {
    // --- lifecycle ---
    close: function () { return { ok: true }; },

    // --- dashboard / status ---
    getDashboard: function () { return buildDashboard(); },
    getMyStatus: function () {
      return { callsign: '001', onDuty: true, firstname: ME.firstname, lastname: ME.lastname, grade: ME.grade, gradeLabel: ME.gradeLabel };
    },
    setMyDuty: function () { return { ok: true }; },
    setMyCallsign: function () { return { ok: true }; },

    // --- citizens ---
    searchCitizens: function (d) {
      var q = String((d && d.query) || '').trim().toLowerCase();
      if (q === '') return [];
      // numeric → server id
      if (/^\d+$/.test(q)) {
        var byId = CITIZENS.filter(function (c) { return String(c.serverId) === q; });
        return byId.map(legacyRow);
      }
      if (q.length < 2) return [];
      var rows = CITIZENS.filter(function (c) {
        return (c.firstname + ' ' + c.lastname).toLowerCase().indexOf(q) !== -1;
      });
      return rows.map(legacyRow);
    },
    getCitizen: function (d) {
      var c = findCitizen((d && d.identifier) || '');
      if (!c) return {};
      return {
        identifier: c.identifier, firstname: c.firstname, lastname: c.lastname,
        dob: c.dob, sex: c.sex, height: c.height, phone: c.phone,
        job: c.job, jobGrade: c.jobGrade, bank: c.bank,
        records: clone(c.records || []), vehicles: clone(c.vehicles || []),
        fines: clone(c.fines || []), serverId: c.serverId
      };
    },

    // --- vehicles ---
    searchVehicle: function (d) {
      var clean = normPlate((d && d.plate) || '');
      if (clean === '') return [];
      return VEHICLES.filter(function (v) { return normPlate(v.plate).indexOf(clean) !== -1; })
        .map(function (v) {
          var r = clone(v); r.plateClean = normPlate(v.plate); r.modelHash = v.model; return r;
        });
    },
    getVehicleDetail: function (d) {
      var clean = normPlate((d && d.plate) || '');
      var bolos = BOLOS.filter(function (b) { return b.active && normPlate(b.target).length && normPlate(b.target).indexOf(clean) !== -1; })
        .map(function (b) { return { id: b.id, title: b.title, priority: b.priority, target: b.target, description: b.description, officer: b.officer, created_at: b.created_at, expires_at: b.expires_at, active: b.active }; });
      return { bolos: bolos };
    },
    setVehicleStolen: function (d) {
      var clean = normPlate((d && d.plate) || '');
      VEHICLES.forEach(function (v) { if (normPlate(v.plate) === clean) v.stolen = d && d.stolen ? 1 : 0; });
      return { ok: true };
    },

    // --- records ---
    addRecord: function (d) {
      var c = findCitizen((d && d.identifier) || '');
      if (c) {
        c.records.unshift({ id: nextId(c.records.length ? c.records : [{ id: 5200 }]), crime: (d && d.crime) || 'Record', fine: (d && +d.fine) || 0, jail: (d && +d.jail) || 0, notes: (d && d.notes) || '', officer: 'Officer ' + ME.firstname + ' ' + ME.lastname, created_at: ago(0) });
      }
      return { ok: true };
    },
    removeRecord: function (d) {
      var id = d && +d.id;
      CITIZENS.forEach(function (c) { c.records = (c.records || []).filter(function (r) { return r.id !== id; }); });
      return { ok: true };
    },

    // --- fines ---
    issueFine: function () { return { ok: true }; },
    cancelFine: function (d) {
      var id = d && +d.id;
      CITIZENS.forEach(function (c) { c.fines = (c.fines || []).filter(function (f) { return f.id !== id; }); });
      return { ok: true };
    },

    // --- reports ---
    listReports: function () { return clone(REPORTS); },
    createReport: function (d) {
      d = d || {};
      REPORTS.unshift({ id: nextId(REPORTS), title: d.title || 'Report', category: d.category || 'Other', content: d.content || '', involved: d.involved || '', officer: 'Officer ' + ME.firstname + ' ' + ME.lastname, created_at: ago(0) });
      return { ok: true };
    },
    deleteReport: function (d) { var id = d && +d.id; REPORTS = REPORTS.filter(function (r) { return r.id !== id; }); return { ok: true }; },

    // --- incidents ---
    listIncidents: function () { return clone(INCIDENTS); },
    getIncident: function (d) {
      var id = d && +d.id;
      var inc = INCIDENTS.filter(function (i) { return i.id === id; })[0];
      if (!inc) return {};
      var r = clone(inc); r.officer_id = 'char1:demo_alex'; r.photos = []; return r;
    },
    createIncident: function (d) {
      d = d || {}; var id = nextId(INCIDENTS);
      INCIDENTS.unshift({ id: id, title: d.title || 'Incident', type: d.type || 'outros', location: d.location || '', suspects: d.suspects || '', description: d.description || '', weapons: d.weapons || null, officer: 'Officer ' + ME.firstname + ' ' + ME.lastname, created_at: ago(0), hero_b64: null, hero_mime: null, photo_count: 0 });
      return { ok: true, id: id };
    },
    updateIncident: function () { return { ok: true }; },
    deleteIncident: function (d) { var id = d && +d.id; INCIDENTS = INCIDENTS.filter(function (i) { return i.id !== id; }); return { ok: true }; },
    addIncidentPhoto: function () { return { ok: false, error: 'camera_unavailable' }; }, // no in-game camera on web
    deleteIncidentPhoto: function () { return { ok: true }; },

    // --- properties ---
    listProperties: function () { return clone(PROPERTIES); },
    getProperty: function (d) {
      var id = d && +d.id;
      var p = PROPERTIES.filter(function (x) { return x.id === id; })[0];
      if (!p) return {};
      var r = clone(p); r.photos = []; return r;
    },
    createProperty: function (d) {
      d = d || {}; var id = nextId(PROPERTIES);
      PROPERTIES.unshift({ id: id, address: d.address || 'Address', district: d.district || '', type: d.type || 'outros', status: d.status || 'suspeita', suspects: d.suspects || '', tags: (d.tags && (Array.isArray(d.tags) ? d.tags.join(',') : d.tags)) || '', description: d.description || '', image_url: '', gps_x: d.gps_x || null, gps_y: d.gps_y || null, officer: 'Officer ' + ME.firstname + ' ' + ME.lastname, created_at: ago(0), updated_at: ago(0), hero_b64: null, hero_mime: null, photo_count: 0 });
      return { ok: true, id: id };
    },
    updateProperty: function () { return { ok: true }; },
    deleteProperty: function (d) { var id = d && +d.id; PROPERTIES = PROPERTIES.filter(function (p) { return p.id !== id; }); return { ok: true }; },
    setPropertyStatus: function (d) {
      var id = d && +d.id;
      PROPERTIES.forEach(function (p) { if (p.id === id) p.status = (d && d.status) || p.status; });
      return { ok: true };
    },
    listAllPropertyPhotos: function () { return []; },
    addPropertyPhoto: function () { return { ok: false, error: 'camera_unavailable' }; },
    deletePropertyPhoto: function () { return { ok: true }; },

    // --- offences ---
    listOffences: function () { return clone(OFFENCES); },
    listAllOffences: function () { return clone(OFFENCES); },
    createOffence: function (d) {
      d = d || {}; var id = nextId(OFFENCES);
      OFFENCES.push({ id: id, category: d.category || 'traffic', code: d.code || '', name: d.name || 'Offence', description: d.description || '', fine: +d.fine || 0, jail: +d.jail || 0, severity: d.severity || 'minor', active: 1, updated_at: ago(0) });
      return { ok: true, id: id };
    },
    updateOffence: function () { return { ok: true }; },
    deleteOffence: function (d) { var id = d && +d.id; OFFENCES = OFFENCES.filter(function (o) { return o.id !== id; }); return { ok: true }; },

    // --- bolos ---
    listBolos: function () { return clone(BOLOS); },
    createBolo: function (d) {
      d = d || {}; var id = nextId(BOLOS);
      BOLOS.unshift({ id: id, title: d.title || 'BOLO', description: d.description || '', priority: d.priority || 'medium', target: d.target || '', image_url: d.image_url || '', image_b64: null, image_mime: null, officer: 'Officer ' + ME.firstname + ' ' + ME.lastname, created_at: ago(0), expires_at: ago(-7 * D), active: 1 });
      return { id: id };
    },
    deleteBolo: function (d) { var id = d && +d.id; BOLOS = BOLOS.filter(function (b) { return b.id !== id; }); return { ok: true }; },
    setBoloImageChunk: function () { return { ok: true }; },

    // --- bulletins ---
    listBulletins: function () { return clone(BULLETINS); },
    createBulletin: function (d) {
      d = d || {}; var id = nextId(BULLETINS);
      BULLETINS.unshift({ id: id, title: d.title || 'Bulletin', body: d.body || '', pinned: d.pinned ? 1 : 0, author: ME.firstname + ' ' + ME.lastname, author_id: ME.identifier, created_at: ago(0), updated_at: ago(0) });
      return { id: id };
    },
    updateBulletin: function (d) {
      d = d || {}; var id = +d.id;
      BULLETINS.forEach(function (b) { if (b.id === id) { b.title = d.title || b.title; b.body = d.body || b.body; b.pinned = d.pinned ? 1 : 0; } });
      return { ok: true };
    },
    deleteBulletin: function (d) { var id = d && +d.id; BULLETINS = BULLETINS.filter(function (b) { return b.id !== id; }); return { ok: true }; },
    toggleBulletinPin: function (d) {
      var id = d && +d.id;
      BULLETINS.forEach(function (b) { if (b.id === id) b.pinned = b.pinned ? 0 : 1; });
      return { ok: true };
    },

    // --- warrants ---
    listWarrants: function () { return clone(WARRANTS); },
    getWarrant: function (d) {
      var id = d && +d.id;
      var w = WARRANTS.filter(function (x) { return x.id === id; })[0];
      return w ? clone(w) : {};
    },
    createWarrant: function (d) {
      d = d || {}; var id = nextId(WARRANTS);
      WARRANTS.unshift({ id: id, citizen_identifier: d.citizen_identifier || '', citizen_name: d.citizen_name || 'Citizen', type: d.type || 'arrest', status: 'active', charges: d.charges || '', description: d.description || '', reward: +d.reward || 0, expires_at: ago(-7 * D), image_url: d.image_url || '', issued_by: ME.firstname + ' ' + ME.lastname, issued_by_id: ME.identifier, executed_by: null, executed_by_id: null, executed_at: null, notes: d.notes || '', created_at: ago(0), updated_at: ago(0) });
      return { ok: true, id: id };
    },
    updateWarrant: function () { return { ok: true }; },
    executeWarrant: function (d) {
      var id = d && +d.id;
      WARRANTS.forEach(function (w) { if (w.id === id && w.status === 'active') { w.status = 'executed'; w.executed_by = ME.firstname + ' ' + ME.lastname; w.executed_at = ago(0); } });
      return { ok: true };
    },
    cancelWarrant: function (d) { var id = d && +d.id; WARRANTS.forEach(function (w) { if (w.id === id && w.status === 'active') w.status = 'cancelled'; }); return { ok: true }; },
    deleteWarrant: function (d) { var id = d && +d.id; WARRANTS = WARRANTS.filter(function (w) { return w.id !== id; }); return { ok: true }; },

    // --- units ---
    listUnits: function () { return clone(UNITS); },
    createUnit: function (d) {
      d = d || {}; var id = nextId(UNITS);
      UNITS.push({ id: id, callsign: (d.callsign || 'UNIT').toUpperCase(), name: d.name || 'New Unit', type: d.type || 'patrol', status: 'available', notes: d.notes || '', created_at: ago(0), updated_at: ago(0), members: [] });
      return { ok: true, id: id };
    },
    updateUnit: function () { return { ok: true }; },
    deleteUnit: function (d) { var id = d && +d.id; UNITS = UNITS.filter(function (u) { return u.id !== id; }); return { ok: true }; },
    setUnitStatus: function (d) {
      var id = d && +d.id;
      UNITS.forEach(function (u) { if (u.id === id) u.status = (d && d.status) || u.status; });
      return { ok: true };
    },
    addUnitMember: function () { return { ok: true }; },
    removeUnitMember: function () { return { ok: true }; },
    setUnitLeader: function () { return { ok: true }; },

    // --- department / messages ---
    listDepartment: function () { return clone(DEPARTMENT); },
    listMessages: function (d) {
      var ch = (d && d.channel) || 'general';
      return clone(MESSAGES[ch] || []);
    },
    sendMessage: function (d) {
      d = d || {}; var ch = d.channel || 'general';
      if (!MESSAGES[ch]) MESSAGES[ch] = [];
      var msg = { id: Date.now(), channel: ch, author: ME.firstname + ' ' + ME.lastname, author_id: ME.identifier, message: d.message || '', created_at: ago(0) };
      MESSAGES[ch].push(msg);
      // mirror the server broadcast so the open channel updates live
      setTimeout(function () { post({ action: 'newMessage', message: msg }); }, 60);
      return { ok: true };
    },

    // --- dispatch ---
    listDispatches: function () {
      var now = nowSecs();
      DISPATCH = DISPATCH.filter(function (x) { return !x.expiresAt || x.expiresAt > now; });
      return clone(DISPATCH).sort(function (a, b) { return b.ts - a.ts; });
    },
    quickDispatch: function () { return { ok: true }; },
    clearDispatch: function (d) { var id = d && +d.id; DISPATCH = DISPATCH.filter(function (x) { return x.id !== id; }); return { ok: true }; },
    setWaypoint: function () { return { ok: true }; },

    // --- logs ---
    listLogs: function () { return clone(LOGS); },

    // --- geolocation (current player position) ---
    getMyCoords: function () { return { x: 425.1, y: -979.5, z: 30.7, zone: 'Mission Row', street: 'Vespucci Blvd' }; },

    // --- camera (no game world in browser) ---
    enterCameraMode: function () { setTimeout(function () { post({ action: 'cameraError', error: 'disabled' }); }, 40); return { ok: true }; },
    cameraAccept: function () { return { ok: true }; },
    cameraRetake: function () { return { ok: true }; },
    cameraCancel: function () { return { ok: true }; }
  };

  // ====================================================================
  //  fetch override — intercept ONLY NUI callbacks; everything else
  //  (locales JSON, dicebear avatars, fonts, ...) passes through.
  // ====================================================================
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  var NUI_RE = /^https?:\/\/(?:cfx-nui-)?oxlyn-mdt\/(.+)$/i;

  window.fetch = function (url, opts) {
    var u = (typeof url === 'string') ? url : (url && url.url) || '';
    var m = NUI_RE.exec(u);
    if (!m) {
      if (realFetch) return realFetch(url, opts);
      return Promise.reject(new Error('fetch unavailable'));
    }
    var name = m[1].split('?')[0];
    var body = {};
    try { if (opts && opts.body) body = JSON.parse(opts.body); } catch (_) {}

    var result;
    try {
      result = handlers[name] ? handlers[name](body) : { ok: true };
    } catch (err) {
      console.error('[mdt-preview] handler error for "' + name + '":', err);
      result = { ok: true };
    }
    if (result == null) result = {};

    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }, 70);
    });
  };

  // ====================================================================
  //  Boot payload — mirrors client/main.lua openTablet() SendNUIMessage.
  //  Labels are localized server-side in the real resource; here we use
  //  the EN fallbacks straight from config.lua (the UI also resolves keys
  //  against the locales we ship below, so labels render either way).
  // ====================================================================
  function buildConfig() {
    return {
      agencyName: 'Los Santos Police Dept.',
      agencyShort: 'LSPD',
      agencyCity: 'Los Santos',
      theme: {
        primary: '#1a3a6e', secondary: '#2d5aa0', accent: '#f1c40f',
        success: '#27ae60', danger: '#c0392b', warning: '#e67e22',
        background: '#0f1d33', panel: '#ffffff', text: '#1c2a3a'
      },
      crimes: [
        { label: 'Speeding', fine: 250, jail: 0 },
        { label: 'Driving under influence', fine: 800, jail: 5 },
        { label: 'Driving without license', fine: 600, jail: 0 },
        { label: 'Resisting arrest', fine: 1500, jail: 15 },
        { label: 'Illegal firearm', fine: 3500, jail: 30 },
        { label: 'Drug trafficking', fine: 8000, jail: 60 },
        { label: 'Drug possession', fine: 1200, jail: 10 },
        { label: 'Robbery', fine: 2500, jail: 25 },
        { label: 'Aggravated robbery', fine: 6000, jail: 45 },
        { label: 'Vehicle theft', fine: 3000, jail: 30 },
        { label: 'Assault', fine: 2000, jail: 20 },
        { label: 'Murder', fine: 25000, jail: 120 },
        { label: 'Attempted murder', fine: 15000, jail: 90 },
        { label: 'Kidnapping', fine: 12000, jail: 80 },
        { label: 'Fleeing from police', fine: 1800, jail: 12 },
        { label: 'Hit and run', fine: 4000, jail: 25 },
        { label: 'Vandalism', fine: 750, jail: 5 },
        { label: 'Disturbing the peace', fine: 400, jail: 2 }
      ],
      priorities: [
        { id: 'low', label: 'Low', color: '#95a5a6' },
        { id: 'medium', label: 'Medium', color: '#f39c12' },
        { id: 'high', label: 'High', color: '#e74c3c' },
        { id: 'critical', label: 'Critical', color: '#8e44ad' }
      ],
      channels: [
        { id: 'general', label: 'General' },
        { id: 'patrol', label: 'Patrol' },
        { id: 'detective', label: 'Investigation' },
        { id: 'command', label: 'Command' }
      ],
      categories: ['Patrol', 'Traffic Accident', 'Arrest', 'Investigation', 'Seizure', 'Citizen Assistance', 'Other'],
      mapBounds: { minX: -5759.0, maxX: 6782.0, minY: -4064.0, maxY: 8417.0 },
      mapRatio: { w: 738, h: 1098 },
      mapShowCalibrate: false,
      mapZoomScale: 4.0,
      dispatchTypes: {
        shots_fired: { label: 'Shots Fired', icon: 'fa-burst', color: '#dc2626', priority: 'high', expire: 60 },
        robbery: { label: 'Robbery in Progress', icon: 'fa-mask', color: '#a855f7', priority: 'high', expire: 240 },
        vehicle_chase: { label: 'Vehicle Pursuit', icon: 'fa-car-burst', color: '#f59e0b', priority: 'high', expire: 180 },
        traffic_stop: { label: 'Traffic Stop', icon: 'fa-traffic-light', color: '#3b82f6', priority: 'medium', expire: 120 },
        melee: { label: 'Assault', icon: 'fa-hand-fist', color: '#dc2626', priority: 'medium', expire: 90 },
        suspicious: { label: 'Suspicious Person', icon: 'fa-user-secret', color: '#6b7280', priority: 'low', expire: 60 },
        backup: { label: 'Backup Request', icon: 'fa-walkie-talkie', color: '#10b981', priority: 'high', expire: 120 },
        citizen_call: { label: 'Citizen Call', icon: 'fa-phone-volume', color: '#3b82f6', priority: 'low', expire: 90 }
      },
      dispatchInGameAlerts: true,
      dispatchOverlayDuration: 8,
      weapons: [
        { id: 'WEAPON_KNIFE', label: 'Knife' }, { id: 'WEAPON_BAT', label: 'Bat' }, { id: 'WEAPON_MACHETE', label: 'Machete' },
        { id: 'WEAPON_CROWBAR', label: 'Crowbar' }, { id: 'WEAPON_KNUCKLE', label: 'Knuckle Duster' },
        { id: 'WEAPON_PISTOL', label: 'Pistol' }, { id: 'WEAPON_COMBATPISTOL', label: 'Combat Pistol' }, { id: 'WEAPON_PISTOL50', label: 'Pistol .50' },
        { id: 'WEAPON_REVOLVER', label: 'Revolver' }, { id: 'WEAPON_MICROSMG', label: 'Micro SMG' }, { id: 'WEAPON_SMG', label: 'SMG' },
        { id: 'WEAPON_ASSAULTSMG', label: 'Assault SMG' }, { id: 'WEAPON_PUMPSHOTGUN', label: 'Pump Shotgun' },
        { id: 'WEAPON_SAWNOFFSHOTGUN', label: 'Sawn-Off Shotgun' }, { id: 'WEAPON_BULLPUPSHOTGUN', label: 'Bullpup Shotgun' },
        { id: 'WEAPON_ASSAULTRIFLE', label: 'Assault Rifle' }, { id: 'WEAPON_CARBINERIFLE', label: 'Carbine Rifle' },
        { id: 'WEAPON_ADVANCEDRIFLE', label: 'Advanced Rifle' }, { id: 'WEAPON_SPECIALCARBINE', label: 'Special Carbine' },
        { id: 'WEAPON_BULLPUPRIFLE', label: 'Bullpup Rifle' }, { id: 'WEAPON_SNIPERRIFLE', label: 'Sniper Rifle' },
        { id: 'WEAPON_HEAVYSNIPER', label: 'Heavy Sniper' }, { id: 'WEAPON_MG', label: 'Machine Gun' },
        { id: 'WEAPON_COMBATMG', label: 'Combat MG' }, { id: 'WEAPON_RPG', label: 'RPG' }
      ],
      incidentTypes: {
        apreensao: { label: 'Seizure', color: '#7a4998' },
        investigacao: { label: 'Investigation', color: '#5d7a99' },
        detencao: { label: 'Arrest', color: '#c0392b' },
        acidente: { label: 'Accident', color: '#b89030' },
        vigilancia: { label: 'Surveillance', color: '#16a374' },
        outros: { label: 'Other', color: '#7f8c8d' }
      },
      propertyTypes: {
        residencial: { label: 'Residential', icon: 'fa-house', color: '#5d7a99' },
        comercial: { label: 'Commercial', icon: 'fa-shop', color: '#16a374' },
        armazem: { label: 'Warehouse', icon: 'fa-warehouse', color: '#b89030' },
        esconderijo: { label: 'Hideout', icon: 'fa-user-secret', color: '#7a4998' },
        outros: { label: 'Other', icon: 'fa-location-dot', color: '#7f8c8d' }
      },
      propertyStatuses: {
        suspeita: { label: 'Suspect', color: '#c0392b', icon: 'fa-magnifying-glass' },
        sob_vigilancia: { label: 'Under Surveillance', color: '#e67e22', icon: 'fa-binoculars' },
        raid_concluido: { label: 'Raid Completed', color: '#7a4998', icon: 'fa-shield-check' },
        arquivada: { label: 'Archived', color: '#7f8c8d', icon: 'fa-box-archive' }
      },
      propertySuggestedTags: ['trafficking', 'weapons', 'laundering', 'kidnapping', 'gang_ballas', 'gang_families', 'cartel', 'robbery', 'smuggling', 'vault', 'safe_house', 'cultivation'],
      cameraEnabled: false, // no game world in the browser; the in-tablet camera button shows a graceful "disabled" toast
      photosPerProperty: 12,
      warrantTypes: {
        arrest: { label: 'Arrest', icon: 'fa-handcuffs', color: '#dc2626' },
        search: { label: 'Search', icon: 'fa-magnifying-glass', color: '#3b82f6' },
        bench: { label: 'Bench', icon: 'fa-gavel', color: '#a855f7' }
      },
      warrantStatuses: {
        active: { label: 'ACTIVE', color: '#dc2626' },
        executed: { label: 'EXECUTED', color: '#22c55e' },
        cancelled: { label: 'CANCELLED', color: '#6b7280' },
        expired: { label: 'EXPIRED', color: '#475569' }
      },
      unitTypes: {
        patrol: { label: 'Patrol', icon: 'fa-car-side', color: '#3b82f6' },
        traffic: { label: 'Traffic', icon: 'fa-traffic-light', color: '#f59e0b' },
        swat: { label: 'SWAT', icon: 'fa-mask', color: '#dc2626' },
        k9: { label: 'K-9', icon: 'fa-paw', color: '#22c55e' },
        detective: { label: 'Detective', icon: 'fa-magnifying-glass', color: '#a855f7' },
        air: { label: 'Air', icon: 'fa-helicopter', color: '#06b6d4' }
      },
      unitStatuses: {
        available: { label: 'Available', color: '#22c55e', icon: 'fa-circle-check' },
        responding: { label: 'Responding', color: '#3b82f6', icon: 'fa-bolt' },
        busy: { label: 'Busy', color: '#f59e0b', icon: 'fa-circle-half-stroke' },
        unavailable: { label: 'Unavailable', color: '#6b7280', icon: 'fa-circle-xmark' }
      },
      dispatchKeybinds: [
        { key: 'F6', type: 'backup', label: 'Backup Request' },
        { key: 'F7', type: 'suspicious', label: 'Suspicious Person' },
        { key: 'F8', type: 'vehicle_chase', label: 'Vehicle Pursuit' }
      ],
      version: '1.0.0',
      permissions: {
        manageBolos: 2, addRecords: 2, removeRecords: 4, issueFines: 1, cancelFines: 4,
        createReports: 1, deleteReports: 5, manageDepartment: 5, manageProperties: 2,
        deleteProperties: 4, manageOffences: 5, manageWarrants: 4, executeWarrants: 1,
        manageUnits: 4, joinUnits: 1, manageBulletins: 3, viewLogs: 5
      },
      defaultLocale: 'en',
      availableLocales: ['pt', 'en']
    };
  }

  function buildMeta() {
    return {
      firstname: ME.firstname, lastname: ME.lastname, job: ME.job, jobLabel: ME.jobLabel,
      grade: ME.grade, gradeLabel: ME.gradeLabel, identifier: ME.identifier, serverId: ME.serverId, headshot: null
    };
  }

  var LOCALES = { en: {}, pt: {} };

  function post(msg) { window.postMessage(msg, '*'); }

  function bootOpen() {
    post({
      action: 'open',
      meta: buildMeta(),
      config: buildConfig(),
      locale: LOCALES.en || {},
      locales: LOCALES,
      localeCode: 'en'
    });
  }

  // ====================================================================
  //  Auto-unlock: the MDT lock screen is a slider. app.js binds a
  //  `mousedown` listener on #lock-start, then `mousemove`/`mouseup` on
  //  document; on release it calls loginToSession() if the drag moved
  //  more than ~5px. A plain click does NOT trigger it, so we synthesise
  //  a real drag gesture: mousedown on the handle, a mousemove on
  //  document past the 5px threshold, then mouseup. The lock markup is
  //  injected by app.js at runtime, so we poll until #lock-start exists.
  // ====================================================================
  function fireMouse(target, type, x, y) {
    var ev;
    try {
      ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window, button: 0 });
    } catch (_) {
      ev = document.createEvent('MouseEvents');
      ev.initMouseEvent(type, true, true, window, 0, 0, 0, x, y, false, false, false, false, 0, null);
    }
    target.dispatchEvent(ev);
  }

  function dragUnlock(handle) {
    var r = handle.getBoundingClientRect();
    var x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    // Press on the handle, drag well past the 5px threshold, release.
    fireMouse(handle, 'mousedown', x0, y0);
    fireMouse(document, 'mousemove', x0 + 60, y0);
    fireMouse(document, 'mousemove', x0 + 160, y0);
    fireMouse(document, 'mouseup', x0 + 160, y0);
    // Belt-and-braces: some builds also accept a plain click.
    fireMouse(handle, 'click', x0, y0);
  }

  function tryUnlock(attempt) {
    attempt = attempt || 0;
    // Already unlocked? (dashboard/root visible) → stop.
    var root = document.querySelector('#root');
    if (root && root.classList && !root.classList.contains('hidden')) {
      var lock = document.querySelector('#lock-screen');
      if (!lock || lock.classList.contains('hidden') || lock.offsetParent === null) return;
    }
    var handle = document.querySelector('#lock-start');
    if (handle) {
      try { dragUnlock(handle); } catch (_) {}
    }
    // Re-attempt a few times: the handle may not be bound on the first
    // frame, and a single gesture can be swallowed during boot animation.
    if (attempt < 40) setTimeout(function () { tryUnlock(attempt + 1); }, 200);
  }

  // ====================================================================
  //  Boot sequence: wait until app.js has registered its message
  //  listener (State exists / openMdt defined), boot, then unlock.
  // ====================================================================
  function appReady() {
    // app.js logs and sets up a window 'message' listener synchronously
    // once it loads. We can't read its obfuscated internals, so we just
    // detect that the lock/root containers have been injected.
    return !!(document.querySelector('#root') || document.querySelector('#lock-inner') || document.querySelector('#lock-screen'));
  }

  function start() {
    var booted = false;
    function go() {
      if (booted) return;
      booted = true;
      bootOpen();
      // NOTE: auto-unlock intentionally disabled — let the visitor slide the
      // lock screen themselves (more authentic). `tryUnlock`/`dragUnlock`
      // remain defined above but are no longer called.
    }
    function waitApp(n) {
      n = n || 0;
      if (appReady()) {
        // give app.js a tick to attach its message listener, then boot
        setTimeout(go, 80);
        return;
      }
      if (n < 120) { setTimeout(function () { waitApp(n + 1); }, 100); return; }
      go(); // boot anyway after ~12s as a last resort
    }

    if (realFetch) {
      realFetch('js/_locales.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) LOCALES = j; })
        .catch(function () {})
        .then(function () { waitApp(0); });
    } else {
      waitApp(0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
