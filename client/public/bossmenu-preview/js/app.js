// ==========================================
//  OXLYN-BOSSMENU | Core (Boot, Login, Desktop, WM)
// ==========================================
(function () {
    'use strict';

    const RESOURCE = (typeof GetParentResourceName === 'function')
        ? GetParentResourceName()
        : 'oxlyn-bossmenu';

    const $  = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    // ------------------------------------------------
    // State
    // ------------------------------------------------
    const State = {
        config: null,
        locale: {},
        windows: new Map(),     // id -> instance
        appsById: {},
        nextZ: 100,
        focused: null,
        opened: false,
        installed: new Set(),   // ids de apps instaladas
        wallpaper: null,        // override do wallpaper escolhido em Definições
    };

    const STORAGE = {
        installed: 'oxlyn_bm_installed',
        wallpaper: 'oxlyn_bm_wallpaper',
        iconPositions: 'oxlyn_bm_icon_pos',
        dockOrder: 'oxlyn_bm_dock_order',
        dockAdded: 'oxlyn_bm_dock_added',     // apps no dock por drag (override config)
        dockRemoved: 'oxlyn_bm_dock_removed', // apps removidas do dock pelo user
        perfLow: 'oxlyn_bm_perf_low',         // user enabled "reduzir efeitos visuais"
        brightness: 'oxlyn_bm_brightness',    // 0-100 (default 100)
        theme: 'oxlyn_bm_theme',              // 'dark' | 'light' | 'auto'
        soundEnabled: 'oxlyn_bm_sound',       // bool
        volume: 'oxlyn_bm_volume',            // 0-100
    };

    function safeLoad(key, def) {
        try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch (_) { return def; }
    }
    function safeSave(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
    }

    // ------------------------------------------------
    // System chrome controls (perf, brightness, theme)
    // ------------------------------------------------

    // Perf mode: toggla body.perf-low e persiste. CSS faz o resto.
    function setPerfLow(on) {
        document.body.classList.toggle('perf-low', !!on);
        safeSave(STORAGE.perfLow, !!on);
    }
    function isPerfLow() { return !!safeLoad(STORAGE.perfLow, false); }
    if (isPerfLow()) document.body.classList.add('perf-low');

    // Brilho: aplica filter brightness ao #screen. 0=preto, 100=normal, 130=brilhante.
    // Range exposto: 20–100 (mapeado para .35–1.0 via slider 0–100).
    function setBrightness(pct) {
        const v = Math.max(0, Math.min(100, Number(pct) || 100));
        const screen = document.getElementById('screen');
        if (screen) {
            // 100 → 1.0 (sem filtro), 0 → 0.35 (escuro mas legível)
            const amt = 0.35 + (v / 100) * 0.65;
            screen.style.filter = `brightness(${amt.toFixed(3)})`;
        }
        safeSave(STORAGE.brightness, v);
    }
    function getBrightness() { return Number(safeLoad(STORAGE.brightness, 100)); }
    // Aplica no boot
    requestAnimationFrame(() => setBrightness(getBrightness()));

    // Tema: 'dark' (default), 'light', 'auto' (segue o tema do sistema)
    function setTheme(theme) {
        const t = (theme === 'light' || theme === 'auto') ? theme : 'dark';
        document.body.classList.remove('theme-dark', 'theme-light');
        if (t === 'auto') {
            const prefersLight = window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: light)').matches;
            document.body.classList.add(prefersLight ? 'theme-light' : 'theme-dark');
        } else {
            document.body.classList.add('theme-' + t);
        }
        safeSave(STORAGE.theme, t);
    }
    function getTheme() { return safeLoad(STORAGE.theme, 'dark'); }
    setTheme(getTheme());

    // ------------------------------------------------
    // Sounds (Web Audio — gera tons curtos no momento, sem ficheiros)
    // ------------------------------------------------
    const Sound = (function () {
        let ctx = null;
        function getCtx() {
            if (!ctx) {
                try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
                catch (_) { ctx = null; }
            }
            return ctx;
        }
        function enabled() { return safeLoad(STORAGE.soundEnabled, true) !== false; }
        function volume() {
            const v = Number(safeLoad(STORAGE.volume, 50));
            return Math.max(0, Math.min(100, isNaN(v) ? 50 : v)) / 100;
        }
        // tone(freq Hz, duration s, type, attack, decay)
        function tone(freq, dur, type, atk, dec) {
            if (!enabled()) return;
            const c = getCtx(); if (!c) return;
            const t0 = c.currentTime;
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type || 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(c.destination);
            const peak = volume() * 0.18;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(peak, t0 + (atk || 0.005));
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.12));
            osc.start(t0);
            osc.stop(t0 + (dur || 0.12) + 0.02);
        }
        return {
            enabled, setEnabled(on) { safeSave(STORAGE.soundEnabled, !!on); },
            volume, setVolume(v) { safeSave(STORAGE.volume, Number(v) || 0); },
            click()       { tone(880, 0.04, 'sine', 0.001, 0.04); },
            tap()         { tone(660, 0.05, 'triangle', 0.001, 0.05); },
            open()        { tone(523.25, 0.10, 'sine'); setTimeout(() => tone(783.99, 0.10, 'sine'), 60); },
            close()       { tone(523.25, 0.08, 'sine'); setTimeout(() => tone(392.00, 0.10, 'sine'), 50); },
            notification(){ tone(880, 0.07, 'sine'); setTimeout(() => tone(1318, 0.12, 'sine'), 80); },
            success()     { tone(659, 0.08, 'sine'); setTimeout(() => tone(880, 0.08, 'sine'), 70); setTimeout(() => tone(1175, 0.14, 'sine'), 140); },
            error()       { tone(220, 0.10, 'square'); setTimeout(() => tone(180, 0.18, 'square'), 90); },
            lock()        { tone(440, 0.06, 'triangle'); setTimeout(() => tone(220, 0.12, 'triangle'), 60); },
            unlock()      { tone(440, 0.06, 'triangle'); setTimeout(() => tone(880, 0.10, 'triangle'), 60); },
            boot()        { tone(261.63, 0.18, 'sine'); setTimeout(() => tone(392.00, 0.18, 'sine'), 120); setTimeout(() => tone(523.25, 0.32, 'sine'), 240); },
        };
    })();

    // Click sound em todos os elementos clicáveis (evento delegado)
    document.addEventListener('click', (e) => {
        if (!Sound.enabled()) return;
        const t = e.target && e.target.closest && e.target.closest(
            'button, .menu-item, .menu-icon, .traffic-light, .dock-item, ' +
            '.desktop-icon, .dropdown-item, .sidebar-item, .pill-btn, ' +
            '.calc-btn, .modal-btn, .panel-tile, .toggle, .clock-tab, ' +
            '.cal-day, .row-action, .toolbar-btn, .panel-row, .browser-bookmark, ' +
            '.settings-segmented button, .login-arrow, .browser-suggestion'
        );
        if (t) Sound.click();
    }, true);

    // ------------------------------------------------
    // NUI bridge
    // ------------------------------------------------
    function postNUI(name, data) {
        return fetch(`https://${RESOURCE}/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data || {}),
        }).catch(() => {});
    }

    // Translation helper. Suporta substituição de placeholders {var}.
    //   t('cm_employees_count', { count: 5 }) → 'X empregados' / 'X employees'
    // Se a chave não existir no locale, devolve o fallback (passado em vars._d) ou a key.
    function L(key, vars) {
        let str = State.locale[key];
        if (str == null) {
            str = (vars && vars._d) || key;
        }
        if (vars) {
            for (const k of Object.keys(vars)) {
                if (k === '_d') continue;
                str = str.split('{' + k + '}').join(String(vars[k]));
            }
        }
        return str;
    }

    // ------------------------------------------------
    // Cursor — agora 100% nativo (CSS url). Sem listeners,
    // sem div, sem JS. Renderizado pelo compositor do SO.
    // Mantemos esta API (Cursor.init) só para compatibilidade.
    // ------------------------------------------------
    const Cursor = { init() { /* no-op */ } };

    // Listener leve só para tracking de drag-state (CSS troca o cursor
    // automaticamente para "grabbing" via classes .dragging e .body-dragging).
    document.addEventListener('mousedown', e => {
        // Se o utilizador iniciou drag num elemento "grab", marca o body
        // para o cursor mudar para grabbing globalmente até soltar.
        if (e.target && e.target.closest && e.target.closest('.window-titlebar, .dock-item:not(.dock-trash), .desktop-icon')) {
            document.body.classList.add('body-dragging');
        }
    });
    document.addEventListener('mouseup', () => {
        document.body.classList.remove('body-dragging');
    });

    // ------------------------------------------------
    // Clock helpers
    // ------------------------------------------------
    const WEEKDAY_KEYS = [
        { key: 'app_day_sun',   _d: 'domingo' },
        { key: 'app_day_mon',   _d: 'segunda-feira' },
        { key: 'app_day_tue',   _d: 'terça-feira' },
        { key: 'app_day_wed',   _d: 'quarta-feira' },
        { key: 'app_day_thu',   _d: 'quinta-feira' },
        { key: 'app_day_fri',   _d: 'sexta-feira' },
        { key: 'app_day_sat',   _d: 'sábado' },
    ];
    const WEEKDAY_SHORT_KEYS = [
        { key: 'app_day_short_sun', _d: 'Dom' },
        { key: 'app_day_short_mon', _d: 'Seg' },
        { key: 'app_day_short_tue', _d: 'Ter' },
        { key: 'app_day_short_wed', _d: 'Qua' },
        { key: 'app_day_short_thu', _d: 'Qui' },
        { key: 'app_day_short_fri', _d: 'Sex' },
        { key: 'app_day_short_sat', _d: 'Sáb' },
    ];
    const MONTH_KEYS = [
        { key: 'app_month_jan', _d: 'janeiro' },
        { key: 'app_month_feb', _d: 'fevereiro' },
        { key: 'app_month_mar', _d: 'março' },
        { key: 'app_month_apr', _d: 'abril' },
        { key: 'app_month_may', _d: 'maio' },
        { key: 'app_month_jun', _d: 'junho' },
        { key: 'app_month_jul', _d: 'julho' },
        { key: 'app_month_aug', _d: 'agosto' },
        { key: 'app_month_sep', _d: 'setembro' },
        { key: 'app_month_oct', _d: 'outubro' },
        { key: 'app_month_nov', _d: 'novembro' },
        { key: 'app_month_dec', _d: 'dezembro' },
    ];
    const MONTH_SHORT_KEYS = [
        { key: 'app_month_short_jan', _d: 'jan' },
        { key: 'app_month_short_feb', _d: 'fev' },
        { key: 'app_month_short_mar', _d: 'mar' },
        { key: 'app_month_short_apr', _d: 'abr' },
        { key: 'app_month_short_may', _d: 'mai' },
        { key: 'app_month_short_jun', _d: 'jun' },
        { key: 'app_month_short_jul', _d: 'jul' },
        { key: 'app_month_short_aug', _d: 'ago' },
        { key: 'app_month_short_sep', _d: 'set' },
        { key: 'app_month_short_oct', _d: 'out' },
        { key: 'app_month_short_nov', _d: 'nov' },
        { key: 'app_month_short_dec', _d: 'dez' },
    ];

    function weekdayName(i)       { const k = WEEKDAY_KEYS[i];       return L(k.key, { _d: k._d }); }
    function weekdayShortName(i)  { const k = WEEKDAY_SHORT_KEYS[i]; return L(k.key, { _d: k._d }); }
    function monthName(i)         { const k = MONTH_KEYS[i];         return L(k.key, { _d: k._d }); }
    function monthShortName(i)    { const k = MONTH_SHORT_KEYS[i];   return L(k.key, { _d: k._d }); }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function fmtDate(d) {
        return L('app_label_date_long', {
            _d: '{wd}, {day} de {month}',
            wd: weekdayName(d.getDay()),
            day: d.getDate(),
            month: monthName(d.getMonth()),
        });
    }

    function fmtTime(d) {
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function fmtMenuDate(d) {
        const wd = weekdayShortName(d.getDay());
        return L('app_label_date_menu', {
            _d: '{wd}. {day} {month}  {time}',
            wd: wd,
            day: d.getDate(),
            month: monthShortName(d.getMonth()),
            time: fmtTime(d),
        });
    }

    function startClocks() {
        const tick = () => {
            const d = new Date();
            const t = $('#login-time');
            const dy = $('#login-day');
            const md = $('#menu-date');
            if (t)  t.textContent  = fmtTime(d);
            if (dy) dy.textContent = fmtDate(d);
            if (md) md.textContent = fmtMenuDate(d);
        };
        tick();
        setInterval(tick, 1000 * 15);
    }

    // ------------------------------------------------
    // Apps registry
    // ------------------------------------------------
    function registerApps() {
        Object.values(window.OS.apps).forEach(app => {
            State.appsById[app.id] = app;
        });
    }

    // ------------------------------------------------
    // Wallpaper / Install / Uninstall
    // ------------------------------------------------
    function applyWallpaper(value) {
        const desktop = $('#desktop');
        const loginBg = $('#login-bg');
        if (!value) value = State.config.wallpaper;
        State.wallpaper = value;

        // O CSS já tem um gradient base nos elementos #desktop e .login-bg,
        // por isso podemos simplesmente atribuir o que o user escolheu sem
        // medo de "ficar vazio" — se o JS não definir nada, o gradient base aparece.

        const isCss = typeof value === 'string'
            && (value.startsWith('linear-gradient') || value.startsWith('radial-gradient') || value.startsWith('#'));

        if (isCss) {
            // Gradient ou cor: aplicação imediata
            if (value.startsWith('#')) {
                desktop.style.backgroundImage = 'none';
                desktop.style.backgroundColor = value;
                if (loginBg) {
                    loginBg.style.backgroundImage = 'none';
                    loginBg.style.backgroundColor = value;
                }
            } else {
                desktop.style.backgroundColor = '';
                desktop.style.backgroundImage = value;
                if (loginBg) {
                    loginBg.style.backgroundColor = '';
                    loginBg.style.backgroundImage = value;
                }
            }
        } else {
            // Imagem (caminho relativo). Aplica logo, sem esperar pelo onload.
            // Se a imagem falhar a carregar, voltamos ao gradient base do CSS.
            const url = `url('${value}')`;
            desktop.style.backgroundColor = '';
            desktop.style.backgroundImage = url;
            if (loginBg) {
                loginBg.style.backgroundColor = '';
                loginBg.style.backgroundImage = url;
            }

            const w = new Image();
            w.onerror = () => {
                // Limpa o inline para o CSS base voltar a aparecer
                desktop.style.backgroundImage = '';
                if (loginBg) loginBg.style.backgroundImage = '';
            };
            w.src = value;
        }
    }

    // Instala uma app (toca som de sucesso, persiste, rebuild dock+icons)
    function installApp(id, opts) {
        if (State.installed.has(id)) return false;
        State.installed.add(id);
        // persistência
        const list = safeLoad(STORAGE.installed, []) || [];
        if (!list.includes(id)) { list.push(id); safeSave(STORAGE.installed, list); }
        const removed = safeLoad(STORAGE.installed + '_removed', []) || [];
        const idx = removed.indexOf(id);
        if (idx >= 0) { removed.splice(idx, 1); safeSave(STORAGE.installed + '_removed', removed); }

        buildDock();
        buildDesktopIcons();
        return true;
    }

    function uninstallApp(id) {
        if (!State.installed.has(id)) return false;
        State.installed.delete(id);
        if (State.windows.has(id)) WM.close(id);

        // persistência (remove dos instalados, adiciona aos removidos)
        const list = safeLoad(STORAGE.installed, []) || [];
        const i = list.indexOf(id);
        if (i >= 0) { list.splice(i, 1); safeSave(STORAGE.installed, list); }
        const removed = safeLoad(STORAGE.installed + '_removed', []) || [];
        if (!removed.includes(id)) { removed.push(id); safeSave(STORAGE.installed + '_removed', removed); }

        buildDock();
        buildDesktopIcons();
        return true;
    }

    function isInstalled(id) {
        return State.installed.has(id);
    }

    // ------------------------------------------------
    // Window Manager
    // ------------------------------------------------
    let WM = null;
    function createWindowManager() {
        const layer = $('#window-layer');

        function focusWindow(win) {
            if (State.focused && State.focused !== win) {
                State.focused.el.style.zIndex = win.zIndex;
            }
            State.nextZ += 1;
            win.zIndex = State.nextZ;
            win.el.style.zIndex = State.nextZ;
            State.focused = win;
            $('#menu-active-app').textContent = win.title;
        }

        function open(appId) {
            const app = State.appsById[appId];
            if (!app) return;

            // Se já existe — restore (se minimizado) ou focar
            if (State.windows.has(appId)) {
                const existing = State.windows.get(appId);
                if (existing.minimized) {
                    restore(existing);
                    if (Sound) Sound.tap();
                } else {
                    existing.el.classList.remove('hidden');
                    focusWindow(existing);
                }
                return;
            }

            if (Sound) Sound.open();

            const winEl = document.createElement('div');
            winEl.className = 'os-window';
            const size = app.defaultSize || { w: 600, h: 400 };
            winEl.style.width  = size.w + 'px';
            winEl.style.height = size.h + 'px';

            // Centralizar com pequeno offset por janela já aberta
            const parent = layer.getBoundingClientRect();
            const offset = (State.windows.size % 5) * 24;
            winEl.style.left = Math.max(20, (parent.width  - size.w) / 2 + offset) + 'px';
            winEl.style.top  = Math.max(40, (parent.height - size.h) / 2 + offset) + 'px';

            // Title bar
            const bar = document.createElement('div');
            bar.className = 'window-titlebar';

            const lights = document.createElement('div');
            lights.className = 'traffic-lights';

            function makeLight(cls, glyph, action) {
                const b = document.createElement('div');
                b.className = 'traffic-light ' + cls;
                b.innerHTML = `<svg viewBox="0 0 12 12" width="8" height="8"><g fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1.4" stroke-linecap="round">${glyph}</g></svg>`;
                b.addEventListener('click', e => { e.stopPropagation(); action(); });
                return b;
            }

            const closeBtn = makeLight('tl-close', '<path d="M3 3 L9 9 M9 3 L3 9"/>', () => close(appId));
            const minBtn   = makeLight('tl-min',   '<path d="M3 6 L9 6"/>',          () => minimize(win));
            const maxBtn   = makeLight('tl-max',   '<path d="M4 4 L8 4 L8 8 M4 8 L4 4"/>', () => toggleMaximize(win));

            lights.appendChild(closeBtn);
            lights.appendChild(minBtn);
            lights.appendChild(maxBtn);

            const title = document.createElement('div');
            title.className = 'window-title';
            title.textContent = app.defaultName;

            bar.appendChild(lights);
            bar.appendChild(title);
            winEl.appendChild(bar);

            // Content
            const contentWrap = document.createElement('div');
            contentWrap.className = 'window-content';
            winEl.appendChild(contentWrap);

            layer.appendChild(winEl);

            // Window instance
            const closeCallbacks = [];
            const win = {
                id: appId,
                el: winEl,
                title: app.defaultName,
                zIndex: 100,
                onClose(cb) { closeCallbacks.push(cb); },
                isFocused() { return State.focused === win; },
                runClose() { closeCallbacks.forEach(cb => { try { cb(); } catch(_){} }); },
            };

            // Build app content
            try {
                const node = app.build(win, getAppConfig(app.id), State.locale);
                if (node) contentWrap.appendChild(node);
            } catch (err) {
                console.error('[bossmenu] erro a construir app', app.id, err);
            }

            // Drag
            attachDrag(winEl, bar);

            // Focus on click
            winEl.addEventListener('mousedown', () => focusWindow(win));

            // Double-click titlebar maximizes
            bar.addEventListener('dblclick', () => toggleMaximize(win));

            State.windows.set(appId, win);
            updateDockIndicators();
            focusWindow(win);

            // Abre maximizada por defeito (estilo macOS fullscreen).
            // O user pode unmaximizar com o botão verde / duplo-clique no titlebar.
            // Excepção: calculadora (UI compacta) abre no tamanho normal.
            if (app.id !== 'calculator') {
                requestAnimationFrame(() => {
                    if (!win.el.classList.contains('maximized')) {
                        win.el.classList.add('maximized');
                    }
                });
            }
        }

        function close(appId) {
            const win = State.windows.get(appId);
            if (!win) return;
            if (Sound) Sound.close();
            win.el.classList.add('closing');
            win.runClose();
            setTimeout(() => {
                if (win.el.parentElement) win.el.parentElement.removeChild(win.el);
                State.windows.delete(appId);
                if (State.focused === win) {
                    State.focused = null;
                    $('#menu-active-app').textContent = L('app_menu_finder', { _d: 'Ficheiros' });
                }
                updateDockIndicators();
            }, 130);
        }

        function minimize(win) {
            if (win.minimized) return;
            const dockItem = document.querySelector(`.dock-item[data-app-id="${win.id}"]`);

            // Calcular destino da animação (centro do dock item ou fundo do ecrã)
            const winRect = win.el.getBoundingClientRect();
            let tx = 0, ty = window.innerHeight - winRect.top + 60;
            if (dockItem) {
                const dr = dockItem.getBoundingClientRect();
                tx = (dr.left + dr.width/2)  - (winRect.left + winRect.width/2);
                ty = (dr.top  + dr.height/2) - (winRect.top  + winRect.height/2);
            }

            win.el.style.transformOrigin = 'center center';
            win.el.style.transition = 'transform .32s cubic-bezier(.42,0,.58,1), opacity .32s';
            win.el.style.transform  = `translate(${tx}px, ${ty}px) scale(.06)`;
            win.el.style.opacity    = '0';

            setTimeout(() => {
                win.el.style.display = 'none';
                win.minimized = true;
                if (State.focused === win) {
                    State.focused = null;
                    $('#menu-active-app').textContent = L('app_menu_finder', { _d: 'Ficheiros' });
                }
                updateDockIndicators();
            }, 340);
        }

        function restore(win) {
            if (!win.minimized) return;
            win.el.style.display = '';
            // Força reflow para a transição arrancar do estado minimizado
            void win.el.offsetHeight;
            win.el.style.transition = 'transform .28s cubic-bezier(.2,.85,.25,1), opacity .28s';
            win.el.style.transform  = '';
            win.el.style.opacity    = '';
            win.minimized = false;
            updateDockIndicators();
            setTimeout(() => {
                win.el.style.transition = '';
                focusWindow(win);
            }, 300);
        }

        function toggleMaximize(win) {
            if (!win.el.classList.contains('maximized')) {
                // store original
                win._restore = {
                    top: win.el.style.top,
                    left: win.el.style.left,
                    width: win.el.style.width,
                    height: win.el.style.height,
                };
                win.el.classList.add('maximized');
            } else {
                win.el.classList.remove('maximized');
                if (win._restore) {
                    Object.assign(win.el.style, win._restore);
                }
            }
            updateDockIndicators();
        }

        function attachDrag(winEl, handle) {
            let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
            handle.addEventListener('mousedown', e => {
                if (e.target.closest('.traffic-light')) return;
                if (winEl.classList.contains('maximized')) return;
                dragging = true;
                sx = e.clientX; sy = e.clientY;
                const rect = winEl.getBoundingClientRect();
                ox = rect.left; oy = rect.top;
                document.body.style.userSelect = 'none';
            });
            document.addEventListener('mousemove', e => {
                if (!dragging) return;
                const dx = e.clientX - sx;
                const dy = e.clientY - sy;
                let nx = ox + dx;
                let ny = Math.max(26, oy + dy);
                winEl.style.left = nx + 'px';
                winEl.style.top  = ny + 'px';
            });
            document.addEventListener('mouseup', () => {
                dragging = false;
                document.body.style.userSelect = '';
            });
        }

        function getAppConfig(id) {
            if (id === 'browser')     return State.config.browser    || {};
            if (id === 'calculator')  return State.config.calculator || {};
            if (id === 'companyManagement') {
                // Passa info do role do player vinda do server (isBoss, myGrade, etc.)
                return {
                    isBoss:     State.config.isBoss === true,
                    myAccess:   State.config.myAccess || 'limited',
                    myGrade:    State.config.myGrade || 0,
                    playerName: State.config.playerName || '',
                    settings:   State.config.settings || null,
                };
            }
            return {};
        }

        return { open, close, focusWindow, minimize, restore };
    }

    // ------------------------------------------------
    // Dock + Desktop icons
    // ------------------------------------------------
    function buildDock() {
        const dock = $('#dock');
        dock.innerHTML = '';

        const added   = safeLoad(STORAGE.dockAdded,   []) || [];
        const removed = safeLoad(STORAGE.dockRemoved, []) || [];

        // App entra no dock se: (showInDock no config OU foi adicionada via drag)
        // E não foi explicitamente removida pelo user.
        const apps = (State.config.apps || [])
            .filter(a => {
                if (!a.enabled || !State.installed.has(a.id)) return false;
                if (removed.includes(a.id)) return false;
                return a.showInDock || added.includes(a.id);
            });

        // Aplicar ordem persistida (drag-to-reorder)
        const savedOrder = safeLoad(STORAGE.dockOrder, []) || [];
        const ordered = [...apps].sort((a, b) => {
            const ia = savedOrder.indexOf(a.id);
            const ib = savedOrder.indexOf(b.id);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

        ordered.forEach(a => {
            const it = document.createElement('div');
            it.className = 'dock-item';
            it.dataset.appId = a.id;

            let inner;
            try {
                if (State.appsById[a.id] && State.appsById[a.id].buildIcon) {
                    inner = State.appsById[a.id].buildIcon();
                }
            } catch (err) {
                console.error('[oxlyn-bossmenu] erro a construir ícone do dock para', a.id, err);
            }
            if (!inner) {
                inner = document.createElement('div');
                inner.className = 'app-icon-wrap';
                inner.style.cssText = 'background:linear-gradient(135deg,#666,#333);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;';
                inner.textContent = (a.name || '?').charAt(0);
            }
            it.appendChild(inner);

            const tip = document.createElement('div');
            tip.className = 'tooltip';
            tip.textContent = a.name;
            it.appendChild(tip);

            attachDockDrag(it, a.id);
            dock.appendChild(it);
        });

        // Divisor + Reciclagem (decorativa)
        const div = document.createElement('div');
        div.className = 'dock-divider';
        dock.appendChild(div);

        const trash = document.createElement('div');
        trash.className = 'dock-item dock-trash';
        let trashInner;
        try {
            if (window.OS && typeof window.OS.icon === 'function') {
                trashInner = window.OS.icon('trash');
            }
        } catch (_) {}
        if (!trashInner) {
            trashInner = document.createElement('div');
            trashInner.className = 'app-icon-wrap';
            trashInner.style.cssText = 'background:linear-gradient(180deg,#5c5c5e,#3a3a3c);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;';
            trashInner.textContent = '🗑';
        }
        trash.appendChild(trashInner);
        const tip2 = document.createElement('div');
        tip2.className = 'tooltip';
        tip2.textContent = L('app_dock_trash', { _d: 'Reciclagem' });
        trash.appendChild(tip2);
        dock.appendChild(trash);
    }

    function updateDockIndicators() {
        $$('#dock .dock-item').forEach(el => {
            const id = el.dataset.appId;
            const win = id && State.windows.get(id);
            el.classList.toggle('is-open', !!win);
            el.classList.toggle('is-minimized', !!(win && win.minimized));
        });
        // Auto-hide do dock: SÓ esconde se há (pelo menos) uma janela
        // visível em modo MAXIMIZADO. Janelas pequenas/flutuantes não
        // tapam o dock, logo deixa-se ver. Janelas minimizadas também
        // não contam (a janela está escondida).
        let hasMaximized = false;
        for (const win of State.windows.values()) {
            if (!win.minimized && win.el && win.el.classList.contains('maximized')) {
                hasMaximized = true;
                break;
            }
        }
        document.body.classList.toggle('has-maximized', hasMaximized);
        if (hasMaximized && !DockReveal.isHovering) {
            document.body.classList.add('dock-hidden');
        } else {
            document.body.classList.remove('dock-hidden');
        }
    }

    // ------------------------------------------------
    // Dock auto-hide: cria trigger invisível no fundo do screen
    // que reage a mouseenter/mouseleave para mostrar/esconder o dock.
    // ------------------------------------------------
    const DockReveal = { isHovering: false, hideTimer: null };
    function setupDockAutoHide() {
        const screen = $('#screen');
        if (!screen) return;
        // Trigger invisível
        let trigger = screen.querySelector('.dock-trigger');
        if (!trigger) {
            trigger = document.createElement('div');
            trigger.className = 'dock-trigger';
            screen.appendChild(trigger);
        }
        const dock = $('#dock');
        if (!dock) return;
        const reveal = () => {
            DockReveal.isHovering = true;
            if (DockReveal.hideTimer) { clearTimeout(DockReveal.hideTimer); DockReveal.hideTimer = null; }
            document.body.classList.remove('dock-hidden');
        };
        const scheduleHide = () => {
            if (DockReveal.hideTimer) clearTimeout(DockReveal.hideTimer);
            DockReveal.hideTimer = setTimeout(() => {
                DockReveal.isHovering = false;
                if (document.body.classList.contains('has-maximized')) {
                    document.body.classList.add('dock-hidden');
                }
            }, 320);
        };
        trigger.addEventListener('mouseenter', reveal);
        dock.addEventListener('mouseenter', reveal);
        trigger.addEventListener('mouseleave', scheduleHide);
        dock.addEventListener('mouseleave', scheduleHide);
    }

    // Drag-to-reorder dos itens do dock (com swap em tempo real)
    function attachDockDrag(item, appId) {
        let dragging = false, didMove = false;
        let startX = 0;

        item.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            dragging = true;
            didMove  = false;
            startX = e.clientX;
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (!didMove && Math.abs(dx) < 5) return;
            didMove = true;
            item.classList.add('dragging');
            item.style.transform = `translateX(${dx}px) scale(1.16) translateY(-4px)`;

            // Detectar swap com vizinhos do dock (ignora trash e divider)
            const itemRect   = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;

            const dock = item.parentElement;
            const siblings = Array.from(dock.children).filter(c =>
                c !== item
                && c.classList.contains('dock-item')
                && !c.classList.contains('dock-trash')
                && c.dataset.appId
            );

            for (const sib of siblings) {
                const sibRect   = sib.getBoundingClientRect();
                const sibCenter = sibRect.left + sibRect.width / 2;
                const overlap   = Math.abs(itemCenter - sibCenter) < sibRect.width * 0.55;
                if (!overlap) continue;

                const oldLeft = item.getBoundingClientRect().left;
                if (itemCenter < sibCenter) {
                    dock.insertBefore(item, sib);
                } else {
                    dock.insertBefore(item, sib.nextSibling);
                }
                const newLeft = item.getBoundingClientRect().left;
                // Reajustar startX para o item continuar debaixo do cursor
                startX += (newLeft - oldLeft);
                // Reaplicar transform com o novo dx
                const ndx = e.clientX - startX;
                item.style.transform = `translateX(${ndx}px) scale(1.16) translateY(-4px)`;
                break;
            }
        });

        document.addEventListener('mouseup', e => {
            if (!dragging) return;
            dragging = false;
            if (didMove) {
                item.classList.remove('dragging');
                item.style.transform = '';

                // Drag-out: se o item está MUITO longe do dock (verticalmente),
                // o user quer remover do dock.
                const dock = item.parentElement;
                if (dock) {
                    const dr = dock.getBoundingClientRect();
                    const verticalDist = Math.max(0, dr.top - e.clientY, e.clientY - dr.bottom);
                    if (verticalDist > 80) {
                        // Animação "puff" e remoção
                        item.style.transition = 'transform .25s, opacity .25s';
                        item.style.transform = 'scale(1.4)';
                        item.style.opacity = '0';
                        setTimeout(() => removeFromDock(appId), 250);
                        return;
                    }
                }

                // Persistir nova ordem (se não foi removida)
                const order = Array.from(dock.children)
                    .filter(c => c.classList.contains('dock-item') && !c.classList.contains('dock-trash') && c.dataset.appId)
                    .map(c => c.dataset.appId);
                safeSave(STORAGE.dockOrder, order);
                return;
            }
            // Click puro → abrir app
            WM.open(appId);
        });
    }

    // ----- Snap-to-grid e detecção de colisão para ícones do desktop -----
    const ICON_CELL = 100;  // tamanho da célula da grelha (px)

    function findFreeCell(targetX, targetY, excludeIcon, wrap) {
        // Constrói set de células ocupadas (excluindo o próprio ícone)
        const occupied = new Set();
        Array.from(wrap.querySelectorAll('.desktop-icon')).forEach(it => {
            if (it === excludeIcon) return;
            const ix = parseInt(it.style.left, 10) || 0;
            const iy = parseInt(it.style.top, 10) || 0;
            occupied.add(`${Math.round(ix/ICON_CELL)},${Math.round(iy/ICON_CELL)}`);
        });

        const wrapW = wrap.clientWidth, wrapH = wrap.clientHeight;
        const maxCol = Math.max(0, Math.floor((wrapW - ICON_CELL) / ICON_CELL));
        const maxRow = Math.max(0, Math.floor((wrapH - ICON_CELL) / ICON_CELL));

        let col = Math.max(0, Math.min(maxCol, Math.round(targetX / ICON_CELL)));
        let row = Math.max(0, Math.min(maxRow, Math.round(targetY / ICON_CELL)));

        if (!occupied.has(`${col},${row}`)) {
            return { x: col * ICON_CELL, y: row * ICON_CELL };
        }
        // Procura espiral pela célula livre mais próxima
        for (let r = 1; r <= Math.max(maxCol, maxRow) + 1; r++) {
            for (let dr = -r; dr <= r; dr++) {
                for (let dc = -r; dc <= r; dc++) {
                    if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
                    const nc = col + dc, nr = row + dr;
                    if (nc < 0 || nr < 0 || nc > maxCol || nr > maxRow) continue;
                    if (!occupied.has(`${nc},${nr}`)) {
                        return { x: nc * ICON_CELL, y: nr * ICON_CELL };
                    }
                }
            }
        }
        // Sem célula livre — devolve original
        return { x: col * ICON_CELL, y: row * ICON_CELL };
    }

    function buildDesktopIcons() {
        const wrap = $('#desktop-icons');
        wrap.innerHTML = '';
        const apps = (State.config.apps || [])
            .filter(a => a.enabled && a.showOnDesktop && State.installed.has(a.id));
        const positions = safeLoad(STORAGE.iconPositions, {}) || {};

        const colWidth   = 100;
        const rowHeight  = 100;
        const wrapRect   = wrap.getBoundingClientRect();
        const startRight = 14;        // distância à direita
        const startTop   = 14;

        apps.forEach((a, idx) => {
            const it = document.createElement('div');
            it.className = 'desktop-icon';
            it.dataset.appId = a.id;
            it.dataset.appName = a.name;

            // posição: persistida ou padrão (coluna à direita)
            const saved = positions[a.id];
            const defaultX = wrapRect.width - startRight - colWidth + 16;
            const defaultY = startTop + idx * rowHeight;
            const wantedX = saved ? saved.x : defaultX;
            const wantedY = saved ? saved.y : defaultY;
            // Adiciona temporariamente para depois encontrar célula livre
            it.style.left = wantedX + 'px';
            it.style.top  = wantedY + 'px';
            // Snap + colisão (importante na inicialização para nunca haver overlap)
            const free = findFreeCell(wantedX, wantedY, it, wrap);
            it.style.left = free.x + 'px';
            it.style.top  = free.y + 'px';

            const img = document.createElement('div');
            img.className = 'desktop-icon-img';
            let inner = null;
            try {
                if (State.appsById[a.id] && State.appsById[a.id].buildIcon) {
                    inner = State.appsById[a.id].buildIcon();
                }
            } catch (err) {
                console.error('[oxlyn-bossmenu] erro a construir ícone de desktop para', a.id, err);
            }
            if (!inner) {
                inner = document.createElement('div');
                inner.className = 'app-icon-wrap';
                inner.style.cssText = 'background:linear-gradient(135deg,#666,#333);width:100%;height:100%;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:24px;';
                inner.textContent = (a.name || '?').charAt(0);
            }
            img.appendChild(inner);
            it.appendChild(img);

            const lbl = document.createElement('div');
            lbl.className = 'desktop-icon-label';
            lbl.textContent = a.name;
            it.appendChild(lbl);

            attachIconDrag(it, a.id);

            wrap.appendChild(it);
        });
    }

    // Drag de ícones do desktop com distinção drag vs click
    function attachIconDrag(icon, appId) {
        let dragging = false, didMove = false;
        let startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
        let lastClick = 0;

        icon.addEventListener('mousedown', e => {
            if (e.button !== 0) return;  // só botão esquerdo
            dragging = true;
            didMove  = false;
            startX = e.clientX; startY = e.clientY;
            baseLeft = parseInt(icon.style.left, 10) || 0;
            baseTop  = parseInt(icon.style.top, 10)  || 0;

            $$('.desktop-icon').forEach(d => d.classList.remove('selected'));
            icon.classList.add('selected');
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!didMove && Math.hypot(dx, dy) < 4) return;  // threshold
            didMove = true;
            icon.classList.add('dragging');

            const wrap = icon.parentElement;
            const wr = wrap.getBoundingClientRect();
            let nx = baseLeft + dx;
            let ny = baseTop  + dy;
            // bounds
            nx = Math.max(0, Math.min(wr.width  - icon.offsetWidth,  nx));
            ny = Math.max(0, Math.min(wr.height - icon.offsetHeight, ny));
            icon.style.left = nx + 'px';
            icon.style.top  = ny + 'px';
        });

        document.addEventListener('mouseup', e => {
            if (!dragging) return;
            dragging = false;
            if (didMove) {
                icon.classList.remove('dragging');

                // Verificar se o ícone foi largado perto do dock → adicionar.
                // Drop zone alargada: qualquer ponto nos últimos 90px do
                // #screen conta como "sobre o dock", porque o container
                // dos ícones do desktop bloqueia o ícone visualmente
                // antes de chegar ao dock.
                const dock = $('#dock');
                const screen = $('#screen') || document.body;
                if (dock) {
                    const sr = screen.getBoundingClientRect();
                    const dr = dock.getBoundingClientRect();
                    const overDock =
                        // Diretamente sobre o dock
                        (e.clientX >= dr.left  && e.clientX <= dr.right
                      && e.clientY >= dr.top   && e.clientY <= dr.bottom)
                        ||
                        // Ou nos últimos 90px do ecrã (zona ampla)
                        (e.clientY >= sr.bottom - 90 && e.clientY <= sr.bottom);
                    if (overDock) {
                        addToDock(appId);
                        return;
                    }
                }

                // Snap-to-grid + colisão (não permite sobrepor outros ícones)
                const wrap = icon.parentElement;
                const cx = parseInt(icon.style.left, 10) || 0;
                const cy = parseInt(icon.style.top, 10)  || 0;
                const free = findFreeCell(cx, cy, icon, wrap);
                icon.style.transition = 'left .15s ease-out, top .15s ease-out';
                icon.style.left = free.x + 'px';
                icon.style.top  = free.y + 'px';
                setTimeout(() => { icon.style.transition = ''; }, 170);

                // Persistir posição (já snapped)
                const positions = safeLoad(STORAGE.iconPositions, {}) || {};
                positions[appId] = { x: free.x, y: free.y };
                safeSave(STORAGE.iconPositions, positions);
                return;
            }
            const now = Date.now();
            if (now - lastClick < 350) WM.open(appId);
            lastClick = now;
        });
    }

    function addToDock(appId) {
        const added   = safeLoad(STORAGE.dockAdded,   []) || [];
        const removed = safeLoad(STORAGE.dockRemoved, []) || [];
        if (!added.includes(appId)) {
            added.push(appId);
            safeSave(STORAGE.dockAdded, added);
        }
        const idx = removed.indexOf(appId);
        if (idx >= 0) {
            removed.splice(idx, 1);
            safeSave(STORAGE.dockRemoved, removed);
        }
        buildDock();
        // pequeno feedback visual
        flashDock();
    }

    function removeFromDock(appId) {
        const added   = safeLoad(STORAGE.dockAdded,   []) || [];
        const removed = safeLoad(STORAGE.dockRemoved, []) || [];
        const idx = added.indexOf(appId);
        if (idx >= 0) { added.splice(idx, 1); safeSave(STORAGE.dockAdded, added); }
        if (!removed.includes(appId)) {
            removed.push(appId);
            safeSave(STORAGE.dockRemoved, removed);
        }
        buildDock();
    }

    function flashDock() {
        const dock = $('#dock');
        if (!dock) return;
        dock.style.transition = 'box-shadow .2s';
        dock.style.boxShadow = '0 0 0 2px rgba(0,122,255,.6), 0 10px 32px rgba(0,0,0,.4)';
        setTimeout(() => {
            dock.style.boxShadow = '';
            setTimeout(() => { dock.style.transition = ''; }, 220);
        }, 220);
    }

    // ------------------------------------------------
    // Context menu (botão direito)
    // ------------------------------------------------
    function showContextMenu(x, y, items) {
        const menu = $('#context-menu');
        menu.innerHTML = '';
        items.forEach(it => {
            if (it === '---') {
                const sep = document.createElement('div');
                sep.className = 'dropdown-sep';
                menu.appendChild(sep);
                return;
            }
            const el = document.createElement('div');
            el.className = 'dropdown-item' + (it.disabled ? ' disabled' : '');
            el.innerHTML = it.shortcut
                ? `${it.label}<span class="dropdown-shortcut">${it.shortcut}</span>`
                : it.label;
            if (!it.disabled && it.onClick) {
                el.addEventListener('click', () => {
                    menu.classList.add('hidden');
                    it.onClick();
                });
            }
            menu.appendChild(el);
        });

        // O menu é position:absolute dentro do parent (#desktop, dentro do
        // #screen do monitor). x/y vêm do viewport (e.clientX/Y), por isso
        // temos de converter para coords locais ao parent — caso contrário
        // o menu aparece deslocado do cursor.
        menu.classList.remove('hidden');
        const parent = menu.offsetParent || menu.parentElement;
        const parentRect = parent.getBoundingClientRect();
        const mRect = menu.getBoundingClientRect();

        let nx = x - parentRect.left;
        let ny = y - parentRect.top;
        // Clamp dentro do parent (não escapar para fora do ecrã do monitor)
        if (nx + mRect.width  > parent.clientWidth  - 4) nx = parent.clientWidth  - mRect.width  - 4;
        if (ny + mRect.height > parent.clientHeight - 4) ny = parent.clientHeight - mRect.height - 4;
        if (nx < 4) nx = 4;
        if (ny < 4) ny = 4;
        menu.style.left = nx + 'px';
        menu.style.top  = ny + 'px';
    }

    function hideContextMenu() {
        const menu = $('#context-menu');
        if (menu) menu.classList.add('hidden');
    }

    function setupContextMenus() {
        // Right-click no desktop (área vazia)
        const desktop = $('#desktop');
        desktop.addEventListener('contextmenu', e => {
            // se o alvo é uma janela ou um item interno, deixar passar (só ataca o desktop e os icons wrap)
            if (e.target.closest('.os-window')) return;
            if (e.target.closest('#dock')) return;
            if (e.target.closest('#menu-bar')) return;

            e.preventDefault();

            // Se for ícone, menu específico
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                const appId   = icon.dataset.appId;
                const appName = icon.dataset.appName;
                showContextMenu(e.clientX, e.clientY, [
                    { label: L('app_menu_open_app', { _d: 'Abrir "{name}"', name: appName }), onClick: () => WM.open(appId) },
                    { label: L('app_menu_show_in_explorer', { _d: 'Mostrar no Explorador' }), disabled: true },
                    '---',
                    { label: L('app_menu_copy', { _d: 'Copiar' }), shortcut: 'Ctrl+C', disabled: true },
                    { label: L('app_menu_duplicate', { _d: 'Duplicar' }), shortcut: 'Ctrl+D', disabled: true },
                    { label: L('app_menu_rename', { _d: 'Renomear' }), disabled: true },
                    '---',
                    { label: L('app_menu_move_to_trash', { _d: 'Mover para a Reciclagem' }), disabled: true },
                    { label: L('app_menu_get_info', { _d: 'Obter Informação' }), disabled: true },
                ]);
                return;
            }

            // Menu vazio do desktop
            showContextMenu(e.clientX, e.clientY, [
                { label: L('app_menu_new_folder', { _d: 'Nova Pasta' }), shortcut: 'Ctrl+N', disabled: true },
                '---',
                { label: L('app_menu_refresh', { _d: 'Atualizar' }), shortcut: 'F5', onClick: () => {
                    // pequena animação para feedback
                    const d = $('#desktop');
                    d.style.transition = 'opacity .15s';
                    d.style.opacity = '.6';
                    setTimeout(() => { d.style.opacity = ''; d.style.transition = ''; }, 200);
                }},
                { label: L('app_menu_change_wallpaper', { _d: 'Mudar Fundo do Ecrã...' }), disabled: true },
                '---',
                { label: L('app_menu_system_settings', { _d: 'Definições do Sistema...' }), disabled: true },
            ]);
        });

        // Right-click numa janela: menu de janela
        document.addEventListener('contextmenu', e => {
            const win = e.target.closest('.os-window');
            if (!win) return;
            // se for input/textarea, deixar o menu nativo (copiar/colar)
            if (e.target.matches('input, textarea, [contenteditable="true"]')) return;
            e.preventDefault();
            const id = State.windows.size > 0 ? State.focused && State.focused.id : null;
            showContextMenu(e.clientX, e.clientY, [
                { label: L('app_menu_close_window', { _d: 'Fechar Janela' }), shortcut: 'Esc', onClick: () => id && WM.close(id) },
                { label: L('app_menu_maximize_restore', { _d: 'Maximizar / Restaurar' }), onClick: () => {
                    if (State.focused) {
                        State.focused.el.classList.toggle('maximized');
                    }
                }},
            ]);
        });

        // Fechar menu quando clica fora
        document.addEventListener('mousedown', e => {
            const menu = $('#context-menu');
            if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // Clique na área vazia do desktop limpa seleção
        desktop.addEventListener('mousedown', e => {
            if (e.target.closest('.desktop-icon')) return;
            if (e.target.closest('.os-window')) return;
            if (e.target.closest('#dock')) return;
            if (e.target.closest('#menu-bar')) return;
            $$('.desktop-icon').forEach(d => d.classList.remove('selected'));
            hideContextMenu();
        });
    }

    // ------------------------------------------------
    // Menu Bar Panels (Wi-Fi, Bateria, Volume, Controlo)
    // ------------------------------------------------
    function svgEl(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

    const PANEL_STATE = {
        wifi: { on: true, network: 'OxlynNet 5G' },
        bluetooth: { on: false },
        airdrop: { on: false },
        focus: { on: false },
        battery: 87,
        volume: 60,
        brightness: 75,
    };

    function buildWifiPanel() {
        const p = $('#panel-wifi');
        p.innerHTML = '';
        const networks = [
            { name: 'OxlynNet 5G',     locked: true,  bars: 4 },
            { name: 'OxlynNet',        locked: true,  bars: 3 },
            { name: 'LSC-Public',      locked: false, bars: 3 },
            { name: 'WeazelNews-WiFi', locked: true,  bars: 2 },
            { name: 'BeanMachineGuest',locked: false, bars: 1 },
        ];
        const head = document.createElement('div');
        head.className = 'panel-row';
        const wifiSubtitle = PANEL_STATE.wifi.on
            ? L('app_panel_wifi_on', { _d: 'Ativado · {network}', network: PANEL_STATE.wifi.network })
            : L('app_panel_wifi_off', { _d: 'Desativado' });
        head.innerHTML = `
            <div class="row-left">
                <div class="row-icon">${wifiSvg(4)}</div>
                <div>
                    <div class="row-name">${escapeHtml(L('app_panel_wifi', { _d: 'Wi-Fi' }))}</div>
                    <div class="row-sub">${escapeHtml(wifiSubtitle)}</div>
                </div>
            </div>`;
        const tg = document.createElement('div');
        tg.className = 'toggle' + (PANEL_STATE.wifi.on ? ' on' : '');
        tg.addEventListener('click', () => {
            PANEL_STATE.wifi.on = !PANEL_STATE.wifi.on;
            buildWifiPanel();
        });
        head.appendChild(tg);
        p.appendChild(head);

        if (PANEL_STATE.wifi.on) {
            const sep = document.createElement('div'); sep.className = 'panel-sep'; p.appendChild(sep);
            const t = document.createElement('div'); t.className = 'panel-title';
            t.textContent = L('app_panel_known_networks', { _d: 'Redes Conhecidas' }); p.appendChild(t);
            networks.forEach(n => {
                const row = document.createElement('div');
                row.className = 'panel-row' + (n.name === PANEL_STATE.wifi.network ? ' active' : '');
                row.innerHTML = `
                    <div class="row-left">
                        <div class="row-icon">${wifiSvg(n.bars)}</div>
                        <div class="row-name">${n.name}</div>
                    </div>
                    <div class="row-meta">${n.locked ? '🔒' : ''}</div>`;
                row.addEventListener('click', () => {
                    PANEL_STATE.wifi.network = n.name;
                    buildWifiPanel();
                });
                p.appendChild(row);
            });
        }
    }

    function wifiSvg(bars) {
        const op = b => bars >= b ? 1 : .25;
        return `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" opacity="${op(1)}" d="M11 17a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/><path fill="currentColor" opacity="${op(2)}" d="M12 12a8 8 0 015.66 2.34l-1.42 1.42A6 6 0 0012 14a6 6 0 00-4.24 1.76l-1.42-1.42A8 8 0 0112 12z"/><path fill="currentColor" opacity="${op(3)}" d="M12 8a12 12 0 018.49 3.51l-1.42 1.42A10 10 0 0012 10a10 10 0 00-7.07 2.93l-1.42-1.42A12 12 0 0112 8z"/><path fill="currentColor" opacity="${op(4)}" d="M12 4a16 16 0 0111.31 4.69l-1.41 1.41A14 14 0 0012 6a14 14 0 00-9.9 4.1L.69 8.69A16 16 0 0112 4z"/></svg>`;
    }

    function buildBatteryPanel() {
        const p = $('#panel-battery');
        const lvl = PANEL_STATE.battery;
        p.innerHTML = '';
        const head = document.createElement('div');
        head.className = 'panel-title';
        head.textContent = L('app_panel_battery', { _d: 'Bateria' });
        p.appendChild(head);

        const big = document.createElement('div');
        big.style.cssText = 'padding: 4px 12px 14px; display: flex; align-items: baseline; gap: 6px;';
        big.innerHTML = `<span style="font-size:32px;font-weight:200;letter-spacing:-1px">${lvl}</span><span style="font-size:14px;color:var(--text-3)">%</span>`;
        p.appendChild(big);

        const status = document.createElement('div');
        status.className = 'panel-row';
        status.innerHTML = `
            <div class="row-left">
                <div class="row-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 2H10a1 1 0 00-1 1v1H7a3 3 0 00-3 3v13a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3h-2V3a1 1 0 00-1-1z"/></svg></div>
                <div>
                    <div class="row-name">${escapeHtml(L('app_panel_battery_discharging', { _d: 'A descarregar' }))}</div>
                    <div class="row-sub">${escapeHtml(L('app_panel_battery_remaining', { _d: '~ 5h 30m restantes' }))}</div>
                </div>
            </div>`;
        p.appendChild(status);

        const sep = document.createElement('div'); sep.className = 'panel-sep'; p.appendChild(sep);
        const tip = document.createElement('div'); tip.className = 'panel-title';
        tip.textContent = L('app_panel_battery_apps', { _d: 'Apps a Consumir Energia' });
        p.appendChild(tip);
        const batteryApps = [
            L('app_panel_battery_app_browser', { _d: 'Navegador' }),
            L('app_panel_battery_app_company', { _d: 'Gestão de Empresa' }),
            L('app_panel_battery_app_system',  { _d: 'Sistema' }),
        ];
        batteryApps.forEach(name => {
            const r = document.createElement('div');
            r.className = 'panel-row';
            r.innerHTML = `
                <div class="row-left">
                    <div class="row-name">${escapeHtml(name)}</div>
                </div>
                <div class="row-meta">${Math.floor(Math.random()*40)+10}%</div>`;
            p.appendChild(r);
        });
    }

    function buildVolumePanel() {
        const p = $('#panel-volume');
        p.innerHTML = '';
        const t = document.createElement('div'); t.className = 'panel-title'; t.textContent = L('app_panel_sound', { _d: 'Som' }); p.appendChild(t);

        const sliderRow = document.createElement('div');
        sliderRow.className = 'panel-slider-row';
        sliderRow.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/></svg>`;
        const s = document.createElement('input');
        s.type = 'range'; s.min = 0; s.max = 100; s.value = PANEL_STATE.volume;
        s.className = 'panel-slider';
        const val = document.createElement('span');
        val.style.cssText = 'min-width:32px;text-align:right;font-size:12px;color:var(--text-3)';
        val.textContent = PANEL_STATE.volume + '%';
        s.addEventListener('input', () => {
            PANEL_STATE.volume = parseInt(s.value, 10);
            val.textContent = PANEL_STATE.volume + '%';
        });
        sliderRow.appendChild(s);
        sliderRow.appendChild(val);
        p.appendChild(sliderRow);

        const sep1 = document.createElement('div'); sep1.className = 'panel-sep'; p.appendChild(sep1);
        const t2 = document.createElement('div'); t2.className = 'panel-title'; t2.textContent = L('app_panel_brightness', { _d: 'Brilho' }); p.appendChild(t2);

        const bRow = document.createElement('div');
        bRow.className = 'panel-slider-row';
        bRow.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
        const b = document.createElement('input');
        b.type = 'range'; b.min = 0; b.max = 100; b.value = PANEL_STATE.brightness;
        b.className = 'panel-slider';
        const bVal = document.createElement('span');
        bVal.style.cssText = 'min-width:32px;text-align:right;font-size:12px;color:var(--text-3)';
        bVal.textContent = PANEL_STATE.brightness + '%';
        b.addEventListener('input', () => {
            PANEL_STATE.brightness = parseInt(b.value, 10);
            bVal.textContent = PANEL_STATE.brightness + '%';
            // Aplicar brightness real ao desktop
            $('#desktop').style.filter = `brightness(${0.4 + PANEL_STATE.brightness/100 * 0.8})`;
        });
        bRow.appendChild(b);
        bRow.appendChild(bVal);
        p.appendChild(bRow);

        const sep2 = document.createElement('div'); sep2.className = 'panel-sep'; p.appendChild(sep2);
        const t3 = document.createElement('div'); t3.className = 'panel-title'; t3.textContent = L('app_panel_output', { _d: 'Saída' }); p.appendChild(t3);
        const outputs = [
            L('app_panel_output_internal', { _d: 'Colunas Internas' }),
            L('app_panel_output_airpods',  { _d: 'AirPods Pro' }),
            L('app_panel_output_soundbar', { _d: 'Soundbar Sala' }),
        ];
        outputs.forEach((name, i) => {
            const r = document.createElement('div');
            r.className = 'panel-row' + (i === 0 ? ' active' : '');
            r.innerHTML = `<div class="row-left"><div class="row-name">${escapeHtml(name)}</div></div>`;
            p.appendChild(r);
        });
    }

    function buildControlPanel() {
        const p = $('#panel-control');
        p.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'panel-tile-grid';
        const tiles = [
            {
                key: 'wifi',
                title: L('app_panel_wifi', { _d: 'Wi-Fi' }),
                value: PANEL_STATE.wifi.on
                    ? PANEL_STATE.wifi.network
                    : L('app_panel_state_off', { _d: 'Desligado' }),
                on: PANEL_STATE.wifi.on,
            },
            {
                key: 'bluetooth',
                title: L('app_panel_bluetooth', { _d: 'Bluetooth' }),
                value: PANEL_STATE.bluetooth.on
                    ? L('app_panel_state_on',  { _d: 'Ligado' })
                    : L('app_panel_state_off', { _d: 'Desligado' }),
                on: PANEL_STATE.bluetooth.on,
            },
            {
                key: 'airdrop',
                title: L('app_panel_airdrop', { _d: 'AirDrop' }),
                value: PANEL_STATE.airdrop.on
                    ? L('app_panel_airdrop_everyone', { _d: 'Toda a gente' })
                    : L('app_panel_airdrop_contacts', { _d: 'Só contactos' }),
                on: PANEL_STATE.airdrop.on,
            },
            {
                key: 'focus',
                title: L('app_panel_focus', { _d: 'Foco' }),
                value: PANEL_STATE.focus.on
                    ? L('app_panel_focus_dnd', { _d: 'Não Incomodar' })
                    : L('app_panel_state_off', { _d: 'Desligado' }),
                on: PANEL_STATE.focus.on,
            },
        ];
        tiles.forEach(t => {
            const tile = document.createElement('div');
            tile.className = 'panel-tile' + (t.on ? ' on' : '');
            tile.innerHTML = `<div class="panel-tile-title">${escapeHtml(t.title)}</div><div class="panel-tile-value">${escapeHtml(t.value)}</div>`;
            tile.addEventListener('click', () => {
                if (t.key === 'wifi') PANEL_STATE.wifi.on = !PANEL_STATE.wifi.on;
                else PANEL_STATE[t.key].on = !PANEL_STATE[t.key].on;
                buildControlPanel();
            });
            grid.appendChild(tile);
        });
        p.appendChild(grid);
    }

    function setupMenuBarPanels() {
        const panels = {
            wifi:    { btn: $('#menu-wifi'),    panel: $('#panel-wifi'),    build: buildWifiPanel },
            battery: { btn: $('#menu-battery'), panel: $('#panel-battery'), build: buildBatteryPanel },
            volume:  { btn: $('#menu-volume'),  panel: $('#panel-volume'),  build: buildVolumePanel },
            control: { btn: $('#menu-control'), panel: $('#panel-control'), build: buildControlPanel },
        };

        function closeAll(except) {
            Object.entries(panels).forEach(([k, v]) => {
                if (k !== except) {
                    v.panel.classList.add('hidden');
                    v.btn.classList.remove('active');
                }
            });
        }

        Object.entries(panels).forEach(([k, v]) => {
            v.btn.addEventListener('click', e => {
                e.stopPropagation();
                const isOpen = !v.panel.classList.contains('hidden');
                closeAll(k);
                if (isOpen) {
                    v.panel.classList.add('hidden');
                    v.btn.classList.remove('active');
                } else {
                    v.build();
                    // Coords locais ao parent (panel está dentro do #desktop
                    // do monitor — não usar coords do viewport).
                    const parent = v.panel.offsetParent || v.panel.parentElement;
                    const parentRect = parent.getBoundingClientRect();
                    const r = v.btn.getBoundingClientRect();
                    const pw = 290;
                    let left = (r.left + r.width/2 - pw/2) - parentRect.left;
                    if (left + pw > parent.clientWidth - 6) left = parent.clientWidth - pw - 6;
                    if (left < 6) left = 6;
                    v.panel.style.left = left + 'px';
                    v.panel.classList.remove('hidden');
                    v.btn.classList.add('active');
                }
            });
        });

        document.addEventListener('mousedown', e => {
            const inPanel = e.target.closest('.menu-panel');
            const inBtn   = e.target.closest('#menu-wifi, #menu-battery, #menu-volume, #menu-control');
            if (!inPanel && !inBtn) closeAll();
        });
    }

    // ------------------------------------------------
    // Floating menu (portal-based) — usado por kebabs e dropdowns
    // que vivem dentro de janelas com overflow:hidden. O menu é
    // renderizado fora da janela (em #screen) para nunca ser cortado.
    // ------------------------------------------------
    function showFloatingMenu(anchor, items) {
        // Fecha qualquer floating menu aberto
        document.querySelectorAll('.floating-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'floating-menu kebab-dropdown';

        items.forEach(it => {
            if (it === '---') {
                const sep = document.createElement('div');
                sep.className = 'kebab-sep';
                menu.appendChild(sep);
                return;
            }
            const el = document.createElement('div');
            el.className = 'kebab-item' + (it.danger ? ' kebab-danger' : '') + (it.disabled ? ' disabled' : '');
            // Suporta ícone SVG opcional + label
            if (it.icon) {
                const ic = document.createElement('span');
                ic.className = 'kebab-item-icon';
                ic.innerHTML = it.icon;
                el.appendChild(ic);
                const lbl = document.createElement('span');
                lbl.textContent = it.label;
                el.appendChild(lbl);
            } else {
                el.textContent = it.label;
            }
            if (!it.disabled && it.onClick) {
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    menu.remove();
                    try { it.onClick(); } catch (err) { console.error(err); }
                });
            }
            menu.appendChild(el);
        });

        // Render em #screen (dentro do monitor, fora das janelas)
        const screen = document.getElementById('screen') || document.body;
        // Limpa as âncoras herdadas de .kebab-dropdown (top/right CSS) —
        // sem isto o menu estica até ao right do parent.
        menu.style.cssText = 'position:absolute; top:0; left:0; right:auto; bottom:auto; z-index:99500;';
        screen.appendChild(menu);

        // Posicionar relativamente ao anchor (botão), com flip se necessário
        const aR = anchor.getBoundingClientRect();
        const sR = screen.getBoundingClientRect();
        const mR = menu.getBoundingClientRect();

        // mR.width pode ainda estar a 0 antes de paint — usa offsetWidth
        const mw = menu.offsetWidth || mR.width || 200;
        const mh = menu.offsetHeight || mR.height || 100;

        // Default: por baixo do anchor, alinhado à direita
        let left = (aR.right - mw) - sR.left;
        let top  = (aR.bottom + 6) - sR.top;

        // Se overflow horizontal à esquerda, alinhar à esquerda do anchor
        if (left < 4) {
            left = aR.left - sR.left;
            if (left + mw > screen.clientWidth - 4) {
                left = screen.clientWidth - mw - 4;
            }
        }
        // Se overflow vertical em baixo, abrir POR CIMA
        if (top + mh > screen.clientHeight - 4) {
            top = (aR.top - 6) - sR.top - mh;
        }
        // Clamp final
        if (top < 4) top = 4;
        if (left < 4) left = 4;

        menu.style.left = left + 'px';
        menu.style.top  = top  + 'px';

        // Fecha ao clicar fora
        const closeOut = e => {
            if (!menu.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeOut);
            }
        };
        // Adiar para não capturar o próprio clique de abertura
        setTimeout(() => document.addEventListener('mousedown', closeOut), 0);

        return menu;
    }

    // ------------------------------------------------
    // Notification Center (estilo macOS) — top-right, slide-in
    // ------------------------------------------------
    const NOTIF_ICONS = {
        info:    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        success: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        error:   `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    };

    let notifStackEl = null;
    function ensureNotifStack() {
        if (notifStackEl && notifStackEl.parentElement) return notifStackEl;
        notifStackEl = document.createElement('div');
        notifStackEl.id = 'notification-stack';
        const screen = document.getElementById('screen') || document.body;
        screen.appendChild(notifStackEl);
        return notifStackEl;
    }

    function notify(opts) {
        opts = opts || {};
        const stack = ensureNotifStack();

        const type = opts.type || 'info';
        const node = document.createElement('div');
        node.className = 'notification notif-' + type;
        node.innerHTML = `
            <div class="notif-icon notif-${type}">${opts.icon || NOTIF_ICONS[type] || NOTIF_ICONS.info}</div>
            <div class="notif-body">
                ${opts.app ? `<div class="notif-app">${escapeHtml(opts.app)}</div>` : ''}
                ${opts.title ? `<div class="notif-title">${escapeHtml(opts.title)}</div>` : ''}
                ${opts.message ? `<div class="notif-message">${escapeHtml(opts.message)}</div>` : ''}
            </div>
            <button class="notif-close" title="${escapeHtml(L('app_notify_close', { _d: 'Fechar' }))}">×</button>`;

        stack.appendChild(node);

        // Som por tipo
        if (Sound) {
            if      (type === 'success') Sound.success();
            else if (type === 'error')   Sound.error();
            else if (type === 'warning') Sound.error();
            else                          Sound.notification();
        }

        // Remoção (com animação)
        let dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            node.classList.add('removing');
            setTimeout(() => { if (node.parentElement) node.remove(); }, 220);
        }
        node.querySelector('.notif-close').addEventListener('click', dismiss);
        node.addEventListener('click', e => {
            if (e.target.closest('.notif-close')) return;
            if (opts.onClick) opts.onClick();
            if (opts.dismissOnClick !== false) dismiss();
        });

        const duration = opts.duration === undefined ? 4500 : opts.duration;
        if (duration > 0) setTimeout(dismiss, duration);

        return { dismiss };
    }
    // Conveniência
    notify.success = (title, message, opts) => notify({ ...(opts||{}), type: 'success', title, message });
    notify.error   = (title, message, opts) => notify({ ...(opts||{}), type: 'error',   title, message });
    notify.warning = (title, message, opts) => notify({ ...(opts||{}), type: 'warning', title, message });
    notify.info    = (title, message, opts) => notify({ ...(opts||{}), type: 'info',    title, message });

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ------------------------------------------------
    // Sistema de modais (reutilizável - usado por apps)
    // ------------------------------------------------
    function showModal(opts) {
        const root = $('#modal-root');
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const card = document.createElement('div');
        card.className = 'modal-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <div class="modal-title">${opts.title || ''}</div>
            ${opts.subtitle ? `<div class="modal-subtitle">${opts.subtitle}</div>` : ''}`;
        card.appendChild(header);

        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof opts.body === 'string') body.innerHTML = opts.body;
        else if (opts.body) body.appendChild(opts.body);
        card.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        (opts.actions || []).forEach(act => {
            const b = document.createElement('button');
            b.className = 'modal-btn ' + (act.style || '');
            b.textContent = act.label;
            b.addEventListener('click', () => {
                const result = act.onClick ? act.onClick({ body }) : true;
                if (result !== false) close();
            });
            actions.appendChild(b);
        });
        card.appendChild(actions);

        overlay.appendChild(card);
        root.appendChild(overlay);

        function close() {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity .12s';
            setTimeout(() => overlay.remove(), 130);
            if (opts.onClose) opts.onClose();
        }

        overlay.addEventListener('click', e => {
            if (e.target === overlay && opts.dismissOnOverlay !== false) close();
        });

        return { close, body, card };
    }

    // ------------------------------------------------
    // Apple dropdown
    // ------------------------------------------------
    function setupAppleMenu() {
        const apple = $('#apple-menu');
        const dd    = $('#apple-dropdown');
        apple.addEventListener('click', e => {
            e.stopPropagation();
            dd.classList.toggle('hidden');
        });
        document.addEventListener('click', e => {
            if (!dd.classList.contains('hidden') && !dd.contains(e.target)) {
                dd.classList.add('hidden');
            }
        });
        dd.addEventListener('click', e => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            const action = item.dataset.action;
            dd.classList.add('hidden');
            if (action === 'lock' || action === 'logout') {
                showLogin();
            } else if (action === 'shutdown') {
                shutdown();
            } else if (action === 'settings') {
                if (State.appsById['settings']) WM.open('settings');
            } else if (action === 'store') {
                if (State.appsById['appstore']) WM.open('appstore');
            } else if (action === 'about') {
                showAboutModal();
            }
        });
    }

    // ------------------------------------------------
    // Sobre este PC (modal com info do sistema)
    // ------------------------------------------------
    function showAboutModal() {
        const sys = (State.config && State.config.system) || {};
        const body = document.createElement('div');
        body.style.cssText = 'text-align:center; padding: 4px 0 8px;';
        body.innerHTML = `
            <div style="margin: 6px 0 14px; display:flex; justify-content:center;">
                <svg viewBox="0 0 100 100" width="64" height="64">
                    <defs><linearGradient id="ab-g" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#bfc4ff"/>
                    </linearGradient></defs>
                    <path fill="url(#ab-g)" d="M50 5 L92 28 L92 72 L50 95 L8 72 L8 28 Z" opacity=".95"/>
                    <path fill="#1a1a2e" d="M50 22 L74 36 L74 64 L50 78 L26 64 L26 36 Z"/>
                    <text x="50" y="58" text-anchor="middle" font-family="Helvetica" font-size="28" font-weight="800" fill="#ffffff">O</text>
                </svg>
            </div>
            <div style="font-size: 18px; font-weight: 700; letter-spacing: -.3px; margin-bottom: 2px;">${escapeHtml(sys.name || 'OxlynOS')}</div>
            <div style="font-size: 13px; color: var(--text-3); margin-bottom: 18px;">${escapeHtml(L('app_label_version', { _d: 'Versão {v}', v: sys.version || '15.2' }))}</div>
            <div class="settings-rows-group" style="text-align: left;">
                <div class="settings-row"><div class="label">${escapeHtml(L('app_label_model',         { _d: 'Modelo' }))}</div><div class="value">Oxlyn Studio Pro</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_label_chip',          { _d: 'Chip' }))}</div><div class="value">Oxlyn Silicon X3</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_label_memory',        { _d: 'Memória' }))}</div><div class="value">16 GB</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_label_storage',       { _d: 'Armazenamento' }))}</div><div class="value">512 GB SSD</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_label_serial_number', { _d: 'Número de Série' }))}</div><div class="value">OXLN-${Math.floor(Math.random()*1e8).toString(36).toUpperCase().padStart(6, '0')}</div></div>
            </div>
            <div style="font-size: 11px; color: var(--text-3); margin-top: 18px; line-height: 1.5;">
                ${escapeHtml(L('app_label_copyright', { _d: '© Oxlyn Software, Lda. Todos os direitos reservados.' }))}<br>
                ${escapeHtml(L('app_label_build', { _d: 'Versão TM | Build {y}.{m}', y: (new Date()).getFullYear(), m: (new Date()).getMonth()+1 }))}
            </div>`;

        window.OS.api.showModal({
            title: L('app_modal_about_title', { _d: 'Sobre este PC' }),
            body,
            actions: [
                { label: L('app_btn_more_info', { _d: 'Mais Info...' }), onClick: () => { if (State.appsById['settings']) WM.open('settings'); } },
                { label: L('app_btn_ok',        { _d: 'OK' }), style: 'primary' },
            ],
        });
    }

    // ------------------------------------------------
    // Menu Bar Dropdowns (Ficheiro, Editar, Visualizar, Ir, Janela, Ajuda)
    // ------------------------------------------------
    function getMenuItems(menuId) {
        const focused = State.focused;
        const focusedTitle = focused ? focused.title : L('app_menu_finder', { _d: 'Ficheiros' });
        switch (menuId) {
            case 'ficheiro': return [
                { label: L('app_menu_new_window',     { _d: 'Nova Janela' }),           shortcut: 'Ctrl+N',       onClick: () => focused && WM.open(focused.id), disabled: !focused },
                { label: L('app_menu_open_app_store', { _d: 'Abrir Loja de Apps...' }), shortcut: 'Ctrl+O',       onClick: () => WM.open('appstore') },
                '---',
                { label: L('app_menu_close_window',   { _d: 'Fechar Janela' }),         shortcut: 'Ctrl+W',       onClick: () => focused && WM.close(focused.id), disabled: !focused },
                '---',
                { label: L('app_apple_logout',        { _d: 'Terminar Sessão' }),       shortcut: 'Ctrl+Shift+Q', onClick: () => showLogin() },
                { label: L('app_menu_shutdown',       { _d: 'Desligar...' }),           onClick: () => shutdown() },
            ];
            case 'editar': return [
                { label: L('app_menu_undo',         { _d: 'Desfazer' }),        shortcut: 'Ctrl+Z', onClick: () => document.execCommand && document.execCommand('undo') },
                { label: L('app_menu_redo',         { _d: 'Refazer' }),         shortcut: 'Ctrl+Y', onClick: () => document.execCommand && document.execCommand('redo') },
                '---',
                { label: L('app_menu_cut',          { _d: 'Cortar' }),          shortcut: 'Ctrl+X', onClick: () => document.execCommand && document.execCommand('cut') },
                { label: L('app_menu_copy',         { _d: 'Copiar' }),          shortcut: 'Ctrl+C', onClick: () => document.execCommand && document.execCommand('copy') },
                { label: L('app_menu_paste',        { _d: 'Colar' }),           shortcut: 'Ctrl+V', onClick: () => document.execCommand && document.execCommand('paste') },
                { label: L('app_menu_select_all',   { _d: 'Selecionar Tudo' }), shortcut: 'Ctrl+A', onClick: () => document.execCommand && document.execCommand('selectAll') },
            ];
            case 'visualizar': return [
                { label: L('app_menu_show_dock',     { _d: 'Mostrar Dock' }), shortcut: 'F1', onClick: () => $('#dock').classList.toggle('hidden') },
                { label: L('app_menu_show_menu_bar', { _d: 'Mostrar Menu' }), shortcut: 'F2', onClick: () => $('#menu-bar').classList.toggle('hidden') },
                '---',
                { label: L('app_menu_fullscreen',    { _d: 'Modo Ecrã Inteiro' }), shortcut: 'Ctrl+F', onClick: () => focused && focused.el.classList.toggle('maximized'), disabled: !focused },
                { label: L('app_menu_refresh',       { _d: 'Atualizar' }),         shortcut: 'F5',     onClick: () => {
                    const d = $('#desktop'); d.style.transition = 'opacity .15s'; d.style.opacity = '.5';
                    setTimeout(() => { d.style.opacity = ''; d.style.transition = ''; }, 150);
                }},
            ];
            case 'ir': return [
                { label: L('app_menu_desktop',     { _d: 'Ambiente de Trabalho' }), shortcut: 'Ctrl+D', onClick: () => {
                    Array.from(State.windows.keys()).forEach(id => WM.minimize && WM.minimize(State.windows.get(id)));
                }},
                { label: L('app_menu_applications', { _d: 'Aplicações' }), shortcut: 'Ctrl+A', onClick: () => WM.open('appstore') },
                { label: L('app_menu_settings',     { _d: 'Definições' }), shortcut: 'Ctrl+,', onClick: () => WM.open('settings') },
                '---',
                { label: L('app_menu_calendar', { _d: 'Calendário' }), onClick: () => WM.open('calendar') },
                { label: L('app_menu_clock',    { _d: 'Relógio' }),    onClick: () => WM.open('clock') },
            ];
            case 'janela': {
                const items = [
                    { label: L('app_menu_minimize',          { _d: 'Minimizar' }),        shortcut: 'Ctrl+M', onClick: () => focused && WM.minimize && WM.minimize(focused), disabled: !focused },
                    { label: L('app_menu_zoom',              { _d: 'Zoom (Maximizar)' }), onClick: () => focused && focused.el.classList.toggle('maximized'), disabled: !focused },
                    { label: L('app_menu_close_window',      { _d: 'Fechar Janela' }),    shortcut: 'Ctrl+W', onClick: () => focused && WM.close(focused.id), disabled: !focused },
                    '---',
                    { label: L('app_menu_bring_all_to_front',{ _d: 'Trazer Tudo Para Frente' }), onClick: () => {
                        Array.from(State.windows.values()).forEach(w => {
                            if (w.minimized && WM.restore) WM.restore(w);
                        });
                    }},
                ];
                if (State.windows.size > 0) {
                    items.push('---');
                    Array.from(State.windows.values()).forEach(w => {
                        items.push({
                            label: w.title + (w === State.focused ? ' ✓' : ''),
                            onClick: () => {
                                if (w.minimized && WM.restore) WM.restore(w);
                                else WM.focusWindow(w);
                            },
                        });
                    });
                }
                return items;
            }
            case 'ajuda': return [
                { label: L('app_menu_about_oxlynos',     { _d: 'Sobre OxlynOS' }),      onClick: () => showAboutModal() },
                { label: L('app_menu_system_shortcuts',  { _d: 'Atalhos do Sistema' }), onClick: () => showShortcutsModal() },
                '---',
                { label: L('app_menu_about_app_store',   { _d: 'Acerca da Loja de Apps' }), onClick: () => WM.open('appstore') },
                { label: L('app_menu_report_problem',    { _d: 'Reportar Problema' }),     onClick: () => window.OS.api.showModal({
                    title: L('app_modal_report_problem_title',    { _d: 'Reportar Problema' }),
                    subtitle: L('app_modal_report_problem_sub',   { _d: 'Obrigado por nos ajudar a melhorar o OxlynOS. Esta funcionalidade estará disponível em breve.' }),
                    actions: [{ label: L('app_btn_ok', { _d: 'OK' }), style: 'primary' }],
                })},
            ];
        }
        return [];
    }

    function showShortcutsModal() {
        const body = document.createElement('div');
        body.innerHTML = `
            <div class="settings-rows-group" style="margin-bottom: 0;">
                <div class="settings-row"><div class="label">${escapeHtml(L('app_shortcut_close_pc',     { _d: 'Fechar PC' }))}</div><div class="value" style="font-family: monospace">ESC</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_shortcut_new_window',   { _d: 'Nova Janela / Reabrir' }))}</div><div class="value" style="font-family: monospace">${escapeHtml(L('app_shortcut_click_icon', { _d: 'Click no ícone' }))}</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_shortcut_close_window',{ _d: 'Fechar Janela' }))}</div><div class="value" style="font-family: monospace">Ctrl + W</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_shortcut_minimize',    { _d: 'Minimizar Janela' }))}</div><div class="value" style="font-family: monospace">Ctrl + M</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_apple_lock',           { _d: 'Bloquear Ecrã' }))}</div><div class="value" style="font-family: monospace">Ctrl + Shift + L</div></div>
                <div class="settings-row"><div class="label">${escapeHtml(L('app_menu_refresh',         { _d: 'Atualizar' }))}</div><div class="value" style="font-family: monospace">F5</div></div>
            </div>`;
        window.OS.api.showModal({
            title:    L('app_modal_shortcuts_title', { _d: 'Atalhos do Sistema' }),
            subtitle: L('app_modal_shortcuts_sub',   { _d: 'Atalhos de teclado disponíveis no OxlynOS.' }),
            body,
            actions: [{ label: L('app_btn_ok', { _d: 'OK' }), style: 'primary' }],
        });
    }

    function setupMenuBarDropdowns() {
        const dd = $('#menu-bar-dropdown');
        let activeMenu = null;

        function buildMenuContent(menuId) {
            const items = getMenuItems(menuId);
            dd.innerHTML = '';
            items.forEach(it => {
                if (it === '---') {
                    const sep = document.createElement('div');
                    sep.className = 'dropdown-sep';
                    dd.appendChild(sep);
                    return;
                }
                const el = document.createElement('div');
                el.className = 'dropdown-item' + (it.disabled ? ' disabled' : '');
                el.innerHTML = it.shortcut
                    ? `${it.label}<span class="dropdown-shortcut">${it.shortcut}</span>`
                    : it.label;
                if (!it.disabled && it.onClick) {
                    el.addEventListener('click', () => {
                        closeMenu();
                        try { it.onClick(); } catch(_){}
                    });
                }
                dd.appendChild(el);
            });
        }

        function openMenu(trigger) {
            const menuId = trigger.dataset.menu;
            buildMenuContent(menuId);
            dd.classList.remove('hidden');

            // Posicionamento em coords locais ao parent (#desktop dentro do
            // monitor) e clamp ao parent para não escapar.
            const parent = dd.offsetParent || dd.parentElement;
            const parentRect = parent.getBoundingClientRect();
            const r = trigger.getBoundingClientRect();
            const ddRect = dd.getBoundingClientRect();

            let nx = r.left - parentRect.left;
            let ny = r.bottom - parentRect.top + 2;
            if (nx + ddRect.width  > parent.clientWidth  - 4) nx = parent.clientWidth  - ddRect.width  - 4;
            if (ny + ddRect.height > parent.clientHeight - 4) ny = parent.clientHeight - ddRect.height - 4;
            if (nx < 4) nx = 4;

            dd.style.left = nx + 'px';
            dd.style.top  = ny + 'px';

            activeMenu = trigger;
            trigger.classList.add('menu-active-trigger');
            $$('.menu-bar-trigger').forEach(t => { if (t !== trigger) t.classList.remove('menu-active-trigger'); });
        }

        function closeMenu() {
            dd.classList.add('hidden');
            if (activeMenu) activeMenu.classList.remove('menu-active-trigger');
            activeMenu = null;
        }

        $$('.menu-bar-trigger').forEach(trigger => {
            trigger.addEventListener('click', e => {
                e.stopPropagation();
                if (activeMenu === trigger) closeMenu();
                else openMenu(trigger);
            });
            // hover-switch enquanto outro menu está aberto
            trigger.addEventListener('mouseenter', () => {
                if (activeMenu && activeMenu !== trigger) openMenu(trigger);
            });
        });

        document.addEventListener('mousedown', e => {
            if (activeMenu && !dd.contains(e.target) && !e.target.closest('.menu-bar-trigger')) {
                closeMenu();
            }
        });
    }

    // ------------------------------------------------
    // Login flow (sem boot screen)
    // ------------------------------------------------

    // ------------------------------------------------
    // Multi-utilizador na lock screen
    // ------------------------------------------------
    const USER_COLORS = [
        'linear-gradient(135deg,#4a90e2,#7b61ff)',
        'linear-gradient(135deg,#ec4899,#be123c)',
        'linear-gradient(135deg,#06b6d4,#0e7490)',
        'linear-gradient(135deg,#f59e0b,#b45309)',
        'linear-gradient(135deg,#10b981,#047857)',
        'linear-gradient(135deg,#8b5cf6,#6d28d9)',
        'linear-gradient(135deg,#f43f5e,#9f1239)',
        'linear-gradient(135deg,#0ea5e9,#075985)',
    ];

    function loadUsers() {
        const acc = State.config.account || {};
        const defaultUser = {
            id: 'default',
            name: acc.name || L('app_login_default_user', { _d: 'Patrão' }),
            color: USER_COLORS[0],
            avatar: acc.avatar,
            password: acc.password,
            isDefault: true,
        };
        const custom = safeLoad('oxlyn_bm_users', []) || [];
        return [defaultUser, ...custom];
    }

    function showLogin() {
        // Fechar todas as janelas ao bloquear
        Array.from(State.windows.keys()).forEach(id => WM.close(id));
        if (Sound) Sound.lock();

        const screen = $('#login-screen');
        screen.classList.remove('hidden');
        screen.style.opacity = '';
        screen.style.transition = '';
        $('#desktop').classList.add('hidden');

        const users = loadUsers();
        const lastId = safeLoad('oxlyn_bm_last_user', 'default') || 'default';
        let selected = users.find(u => u.id === lastId) || users[0];

        renderUsersRow(users, selected);
        renderPasswordArea(selected);

        // Limpar erro
        const err = $('#login-error');
        if (err) { err.classList.remove('show'); err.textContent = ''; }
    }

    function renderUsersRow(users, selected) {
        const row = $('#login-users-row');
        row.innerHTML = '';
        users.forEach(u => {
            const tile = createUserTile(u, () => selectUser(u));
            if (u.id === selected.id) tile.classList.add('selected');
            row.appendChild(tile);
        });
        // Tile de adicionar
        const addTile = createAddUserTile();
        row.appendChild(addTile);
    }

    function selectUser(user) {
        const row = $('#login-users-row');
        row.querySelectorAll('.login-user-tile').forEach(t => {
            t.classList.toggle('selected', t.dataset.userId === user.id);
        });
        const err = $('#login-error');
        if (err) { err.classList.remove('show'); err.textContent = ''; }
        renderPasswordArea(user);
    }

    function createUserTile(user, onClick) {
        const tile = document.createElement('div');
        tile.className = 'login-user-tile';
        tile.dataset.userId = user.id;

        const av = document.createElement('div');
        av.className = 'login-user-avatar';
        av.style.background = user.color || USER_COLORS[0];

        // Tenta carregar imagem (apenas para o utilizador default com avatar configurado)
        if (user.avatar && user.avatar.trim() !== '') {
            const img = document.createElement('img');
            img.src = user.avatar;
            img.onerror = () => {
                av.removeChild(img);
                av.textContent = (user.name || '?').charAt(0).toUpperCase();
            };
            av.appendChild(img);
        } else {
            av.textContent = (user.name || '?').charAt(0).toUpperCase();
        }

        const name = document.createElement('div');
        name.className = 'login-user-name';
        name.textContent = user.name;

        tile.appendChild(av);
        tile.appendChild(name);

        // Botão de remover (só aparece em utilizadores custom)
        if (!user.isDefault) {
            const rm = document.createElement('button');
            rm.className = 'login-user-remove';
            rm.title = L('app_login_remove_user', { _d: 'Remover utilizador' });
            rm.innerHTML = '×';
            rm.addEventListener('click', e => {
                e.stopPropagation();
                confirmRemoveUser(user);
            });
            tile.appendChild(rm);
        }

        tile.addEventListener('click', e => {
            if (e.target.closest('.login-user-remove')) return;
            onClick();
        });
        return tile;
    }

    function createAddUserTile() {
        const tile = document.createElement('div');
        tile.className = 'login-user-tile login-user-add';

        const av = document.createElement('div');
        av.className = 'login-user-avatar';
        av.textContent = '+';

        const name = document.createElement('div');
        name.className = 'login-user-name';
        name.textContent = L('app_login_add', { _d: 'Adicionar' });

        tile.appendChild(av);
        tile.appendChild(name);
        tile.addEventListener('click', () => openAddUserModal());
        return tile;
    }

    function renderPasswordArea(user) {
        const area = $('#login-password-area');
        const hint = $('#login-hint');
        area.innerHTML = '';

        const acc = State.config.account || {};
        const userPwd = user.password || '';
        const requiresPassword = !!userPwd && acc.requirePassword !== false;

        if (!requiresPassword) {
            // Sem password: botão "Iniciar Sessão"
            hint.textContent = L('app_login_tap_to_signin', { _d: 'Toca para iniciar sessão' });
            const btn = document.createElement('button');
            btn.className = 'login-arrow';
            btn.style.cssText = 'opacity:1;position:relative;transform:none;width:auto;height:32px;padding:0 22px;border-radius:18px;background:rgba(255,255,255,.92);color:#000;font-weight:600;font-size:13px;font-family:inherit;border:none;';
            btn.textContent = L('app_login_signin', { _d: 'Iniciar Sessão' });
            btn.addEventListener('click', () => doLogin(user));
            area.appendChild(btn);
            return;
        }

        // Com password: input + seta
        hint.textContent = (user.isDefault && acc.testHint) ? acc.testHint : '';

        const wrap = document.createElement('div');
        wrap.className = 'login-input-wrap';

        const input = document.createElement('input');
        input.type = acc.showPasswordText ? 'text' : 'password';
        input.placeholder = L('app_login_password', { _d: 'Palavra-passe' });
        input.id = 'login-password';
        input.autocomplete = 'off';
        input.value = '';

        const arrow = document.createElement('button');
        arrow.className = 'login-arrow';
        arrow.title = L('app_login_signin', { _d: 'Iniciar Sessão' });
        arrow.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>`;

        const tryLogin = () => {
            const err = $('#login-error');
            if (acc.acceptAnyPassword || input.value === userPwd) {
                err.classList.remove('show');
                safeSave('oxlyn_bm_last_user', user.id);
                doLogin(user);
            } else {
                err.textContent = acc.wrongPasswordMsg || L('app_login_wrong', { _d: 'Palavra-passe incorreta' });
                err.classList.add('show');
                input.value = '';
                input.focus();
                input.style.animation = 'none';
                void input.offsetHeight;
                input.style.animation = 'shake .3s';
            }
        };

        arrow.addEventListener('click', e => { e.preventDefault(); tryLogin(); });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); tryLogin(); }
        });

        wrap.appendChild(input);
        wrap.appendChild(arrow);
        area.appendChild(wrap);

        setTimeout(() => input.focus(), 60);
    }

    function openAddUserModal() {
        let selectedColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

        const body = document.createElement('div');

        const nameField = document.createElement('div');
        nameField.className = 'field';
        nameField.innerHTML = `<label>${escapeHtml(L('app_login_field_name', { _d: 'Nome' }))}</label><input type="text" data-field="name" placeholder="${escapeHtml(L('app_login_field_name_ph', { _d: 'Ex: Maria' }))}" maxlength="20" />`;
        body.appendChild(nameField);

        const pwdField = document.createElement('div');
        pwdField.className = 'field';
        pwdField.innerHTML = `<label>${escapeHtml(L('app_login_field_password', { _d: 'Palavra-passe (opcional)' }))}</label><input type="text" data-field="password" placeholder="${escapeHtml(L('app_login_field_password_ph', { _d: 'Deixar em branco para entrar sem password' }))}" maxlength="32" />`;
        body.appendChild(pwdField);

        const colorField = document.createElement('div');
        colorField.className = 'field';
        const lbl = document.createElement('label');
        lbl.textContent = L('app_login_field_avatar_color', { _d: 'Cor do Avatar' });
        colorField.appendChild(lbl);
        const colorGrid = document.createElement('div');
        colorGrid.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;';
        USER_COLORS.forEach(c => {
            const sw = document.createElement('div');
            sw.style.cssText = `width:36px;height:36px;border-radius:50%;background:${c};transition:transform .1s,box-shadow .12s;`;
            if (c === selectedColor) sw.style.boxShadow = '0 0 0 3px rgba(255,255,255,.95)';
            sw.addEventListener('click', () => {
                selectedColor = c;
                Array.from(colorGrid.children).forEach(s => s.style.boxShadow = '');
                sw.style.boxShadow = '0 0 0 3px rgba(255,255,255,.95)';
            });
            colorGrid.appendChild(sw);
        });
        colorField.appendChild(colorGrid);
        body.appendChild(colorField);

        window.OS.api.showModal({
            title:    L('app_modal_add_user_title', { _d: 'Adicionar Utilizador' }),
            subtitle: L('app_modal_add_user_sub',   { _d: 'Cria uma nova conta para acesso ao sistema. Vai aparecer no ecrã de bloqueio.' }),
            body,
            actions: [
                { label: L('app_btn_cancel', { _d: 'Cancelar' }) },
                { label: L('app_btn_create', { _d: 'Criar' }), style: 'primary', onClick: ({ body }) => {
                    const name = body.querySelector('[data-field="name"]').value.trim();
                    const password = body.querySelector('[data-field="password"]').value;
                    if (!name) {
                        const inp = body.querySelector('[data-field="name"]');
                        inp.style.borderColor = 'var(--danger)';
                        inp.focus();
                        return false;
                    }
                    const users = safeLoad('oxlyn_bm_users', []) || [];
                    const newUser = {
                        id: 'u_' + Math.random().toString(36).substr(2, 9),
                        name, password,
                        color: selectedColor,
                    };
                    users.push(newUser);
                    safeSave('oxlyn_bm_users', users);
                    // Re-render lock screen com o novo user já selecionado
                    safeSave('oxlyn_bm_last_user', newUser.id);
                    showLogin();
                }},
            ],
        });
    }

    function confirmRemoveUser(user) {
        window.OS.api.showModal({
            title:    L('app_modal_remove_user_title', { _d: 'Remover "{name}"?', name: user.name }),
            subtitle: L('app_modal_remove_user_sub',   { _d: 'Esta conta será apagada do ecrã de bloqueio. Os dados do sistema (apps instaladas, ficheiros, etc.) não são afetados.' }),
            actions: [
                { label: L('app_btn_cancel', { _d: 'Cancelar' }) },
                { label: L('app_btn_remove', { _d: 'Remover' }), style: 'danger', onClick: () => {
                    const users = safeLoad('oxlyn_bm_users', []) || [];
                    const filtered = users.filter(u => u.id !== user.id);
                    safeSave('oxlyn_bm_users', filtered);
                    // Se era o "last user", limpar
                    if (safeLoad('oxlyn_bm_last_user', null) === user.id) {
                        safeSave('oxlyn_bm_last_user', 'default');
                    }
                    showLogin();
                }},
            ],
        });
    }

    function doLogin(user) {
        // Persiste último utilizador (se passado)
        if (user && user.id) safeSave('oxlyn_bm_last_user', user.id);
        if (Sound) Sound.unlock();
        // Transição instantânea — sem fades para o utilizador não sentir delay
        $('#desktop').classList.remove('hidden');

        // Reconstruir ícones do desktop AGORA que o desktop está visível —
        // antes da remoção do .hidden, getBoundingClientRect() devolve 0×0
        // e os ícones empilham todos no canto.
        requestAnimationFrame(() => {
            try { buildDesktopIcons(); } catch (_) {}
        });

        const screen = $('#login-screen');
        screen.style.transition = '';
        screen.style.opacity = '';
        screen.classList.add('hidden');
    }

    function requestClose() {
        if (!State.opened) return;
        const root = $('#os-root');
        if (!root || root.classList.contains('closing')) return;
        // Toca a animação de zoom-out do monitor antes de fechar o NUI
        root.classList.add('closing');
        setTimeout(() => postNUI('close', {}), 260);
    }

    function shutdown() { requestClose(); }

    // ------------------------------------------------
    // Init / Open / Close
    // ------------------------------------------------
    // Aplica traduções a todos os elementos com [data-i18n] / [data-i18n-title] /
    // [data-i18n-placeholder]. Mantém o texto PT do HTML como fallback (_d).
    function applyI18n(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = L(key, { _d: el.textContent });
        });
        scope.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.setAttribute('title', L(key, { _d: el.getAttribute('title') || '' }));
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.setAttribute('placeholder', L(key, { _d: el.getAttribute('placeholder') || '' }));
        });
    }

    function open(payload) {
        State.config = payload.config;
        State.locale = payload.locales || {};
        State.opened = true;

        // Aplica i18n ao shell (HTML estático com data-i18n) — corre depois do
        // locale ser injectado em State, antes de render dinâmico.
        applyI18n(document);

        // Traduz strings vindas do Config.lua que NÃO passam por locale.
        // Helper trL(): se o valor for uma key conhecida do locale (ex: 'app_name_calculator'),
        // devolve a tradução; se for texto freeform (ex: 'Calculadora'), devolve-o intacto.
        const trL = v => v ? L(v, { _d: v }) : v;
        // Para apps: o `name` (e `category`) podem ser keys do locale OU texto livre.
        // O helper trL trata ambos os casos universalmente.
        if (Array.isArray(State.config.apps)) {
            State.config.apps.forEach(a => {
                if (a) a.name = trL(a.name);
            });
        }
        if (State.config.store && Array.isArray(State.config.store.apps)) {
            State.config.store.apps.forEach(a => {
                if (a) {
                    a.name     = trL(a.name);
                    a.category = trL(a.category);
                }
            });
        }
        if (State.config.account) {
            const acc = State.config.account;
            acc.testHint         = trL(acc.testHint);
            acc.loginButton      = trL(acc.loginButton);
            acc.wrongPasswordMsg = trL(acc.wrongPasswordMsg);
            acc.staticName       = trL(acc.staticName);
        }
        if (State.config.browser) {
            const br = State.config.browser;
            br.searchEngine     = trL(br.searchEngine);
            br.placeholder      = trL(br.placeholder);
            br.fakeMessage      = trL(br.fakeMessage);
            br.homepageTitle    = trL(br.homepageTitle);
            br.homepageSubtitle = trL(br.homepageSubtitle);
        }

        // Construir o conjunto de apps instaladas (config + persistido)
        State.installed = new Set();
        (State.config.apps || []).forEach(a => {
            if (a.installed !== false) State.installed.add(a.id);
        });
        const persistedInstalled = safeLoad(STORAGE.installed, []) || [];
        persistedInstalled.forEach(id => State.installed.add(id));
        // remover apps marcadas como desinstaladas pelo utilizador
        const persistedRemoved = safeLoad(STORAGE.installed + '_removed', []) || [];
        persistedRemoved.forEach(id => State.installed.delete(id));

        // Wallpaper override do utilizador (Definições)
        State.wallpaper = safeLoad(STORAGE.wallpaper, null) || State.config.wallpaper;

        const root = $('#os-root');
        root.classList.remove('hidden');
        root.style.opacity = '';

        // Boot sound (acorda o AudioContext na 1ª gesto/abertura)
        if (Sound) {
            try { Sound.boot(); } catch (_) {}
        }

        // Wallpaper
        applyWallpaper(State.wallpaper);

        // Cursor
        Cursor.init(State.config.cursorStyle || 'macos');

        // System name
        startClocks();
        registerApps();
        WM = createWindowManager();
        try { buildDock(); }           catch (e) { console.error('[oxlyn-bossmenu] buildDock falhou', e); }
        try { setupDockAutoHide(); }   catch (e) { console.error('[oxlyn-bossmenu] setupDockAutoHide falhou', e); }
        try { buildDesktopIcons(); }   catch (e) { console.error('[oxlyn-bossmenu] buildDesktopIcons falhou', e); }
        try { setupAppleMenu(); }       catch (e) { console.error('[oxlyn-bossmenu] setupAppleMenu falhou', e); }
        try { setupContextMenus(); }    catch (e) { console.error('[oxlyn-bossmenu] setupContextMenus falhou', e); }
        try { setupMenuBarPanels(); }   catch (e) { console.error('[oxlyn-bossmenu] setupMenuBarPanels falhou', e); }
        try { setupMenuBarDropdowns(); } catch (e) { console.error('[oxlyn-bossmenu] setupMenuBarDropdowns falhou', e); }

        // Reset menu app text
        $('#menu-active-app').textContent = L('app_menu_finder', { _d: 'Ficheiros' });

        // Sem boot screen — direto para a lock screen
        $('#desktop').classList.add('hidden');
        showLogin();

        postNUI('ready', {});
    }

    function close() {
        State.opened = false;
        const root = $('#os-root');
        root.classList.add('hidden');
        root.classList.remove('closing');  // limpa para a próxima abertura tocar zoom-in
        // Fechar janelas / limpar
        Array.from(State.windows.keys()).forEach(id => {
            const w = State.windows.get(id);
            try { w.runClose(); } catch(_){}
            if (w.el.parentElement) w.el.parentElement.removeChild(w.el);
        });
        State.windows.clear();
        State.focused = null;
    }

    // ------------------------------------------------
    // NUI message handler
    // ------------------------------------------------
    // Reset de fábrica: limpa toda a localStorage com prefixo oxlyn_bm_.
    // Disparado pelo /bossmenu_reset no Lua. Útil antes de gravar vídeos.
    function factoryReset() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.indexOf('oxlyn_bm_') === 0) keysToRemove.push(k);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            // Se o OS estiver aberto, fecha-o para aplicar o estado limpo no próximo open
            if (State.opened) close();
        } catch (_) {}
    }

    window.addEventListener('message', e => {
        const data = e.data || {};
        if (data.action === 'open')          open(data);
        if (data.action === 'close')         close();
        if (data.action === 'factoryReset')  factoryReset();
    });

    // ESC fecha o computador. Quando a NUI está em foco, o teclado é capturado
    // pela CEF e o IsDisabledControlJustReleased do Lua não dispara — temos
    // mesmo de tratar isto aqui no JS.
    document.addEventListener('keydown', e => {
        if (!State.opened) return;
        if (e.key !== 'Escape') return;

        // 1) Se houver menu de contexto, fecha-o
        const ctx = $('#context-menu');
        if (ctx && !ctx.classList.contains('hidden')) {
            ctx.classList.add('hidden');
            e.preventDefault();
            return;
        }

        // 2) Se houver dropdown da maçã/sistema, fecha-o
        const dd = $('#apple-dropdown');
        if (dd && !dd.classList.contains('hidden')) {
            dd.classList.add('hidden');
            e.preventDefault();
            return;
        }

        // 3) Se houver janela com foco, fecha-a
        if (State.focused && State.windows.has(State.focused.id)) {
            WM.close(State.focused.id);
            e.preventDefault();
            return;
        }

        // 4) Caso contrário, fecha o "PC" (com animação zoom-out)
        e.preventDefault();
        requestClose();
    });

    // shake keyframes (injetado por JS para evitar conflitos no CSS)
    (function injectShake() {
        const s = document.createElement('style');
        s.textContent = '@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }';
        document.head.appendChild(s);
    })();

    // ------------------------------------------------
    // API global para apps (instalação, wallpaper, janelas)
    // ------------------------------------------------
    window.OS = window.OS || {};
    // Expor o helper de tradução globalmente para todas as apps.
    window.OS.t = L;
    window.OS.applyI18n = applyI18n;
    window.OS.api = {
        t: L,
        applyI18n: applyI18n,
        installApp: installApp,
        uninstallApp: uninstallApp,
        isInstalled: isInstalled,
        applyWallpaper: applyWallpaper,
        isCurrentWallpaper: v => State.wallpaper === v,
        openApp: id => WM && WM.open(id),
        closeApp: id => WM && WM.close(id),
        getConfig: () => State.config,
        getInstalled: () => Array.from(State.installed),
        rebuildShell: () => { buildDock(); buildDesktopIcons(); },
        showModal: showModal,
        showFloatingMenu: showFloatingMenu,
        notify: notify,
        setPerfLow: setPerfLow,
        isPerfLow: isPerfLow,
        setBrightness: setBrightness,
        getBrightness: getBrightness,
        setTheme: setTheme,
        getTheme: getTheme,
        sound: Sound,
    };

})();
