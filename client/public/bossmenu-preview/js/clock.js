// ==========================================
//  OXLYN-BOSSMENU | App: Relógio
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.clock = (function () {
    function t(key, vars) {
        if (window.OS && typeof window.OS.t === 'function') return window.OS.t(key, vars);
        return (vars && vars._d) ? vars._d : key;
    }

    function pad(n, w) {
        n = String(n);
        while (n.length < (w || 2)) n = '0' + n;
        return n;
    }

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('clock');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(180deg,#2a2a2e,#0e0e10);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;';
        d.textContent = '⏱';
        return d;
    }

    function buildContent(win, cfg, locale) {
        const root = document.createElement('div');
        root.className = 'clock-app';

        // Tabs
        const tabs = document.createElement('div');
        tabs.className = 'clock-tabs';
        const tabDefs = [
            { id: 'world', label: t('clock_tab_world',     { _d: 'Mundo' }) },
            { id: 'sw',    label: t('clock_tab_stopwatch', { _d: 'Cronómetro' }) },
            { id: 'tm',    label: t('clock_tab_timer',     { _d: 'Temporizador' }) },
        ];
        const tabBtns = {};
        tabDefs.forEach((t, i) => {
            const b = document.createElement('button');
            b.className = 'clock-tab' + (i === 0 ? ' active' : '');
            b.textContent = t.label;
            b.addEventListener('click', () => switchTab(t.id));
            tabs.appendChild(b);
            tabBtns[t.id] = b;
        });

        const content = document.createElement('div');
        content.className = 'clock-content';

        const intervals = [];

        function clearIntervals() {
            while (intervals.length) clearInterval(intervals.pop());
        }

        function switchTab(id) {
            Object.keys(tabBtns).forEach(k => tabBtns[k].classList.toggle('active', k === id));
            clearIntervals();
            content.innerHTML = '';
            if (id === 'world') renderWorld();
            if (id === 'sw')    renderStopwatch();
            if (id === 'tm')    renderTimer();
        }

        // ----------------- World Clock -----------------
        const cities = [
            { city: 'Lisboa',       tz: 'Europe/Lisbon',       get label() { return t('clock_label_local', { _d: 'Hora local' }); } },
            { city: 'Los Santos',   tz: 'America/Los_Angeles', label: 'GMT-8' },
            { city: 'Nova Iorque',  tz: 'America/New_York',    label: 'GMT-5' },
            { city: 'Londres',      tz: 'Europe/London',       label: 'GMT+0' },
            { city: 'Tóquio',       tz: 'Asia/Tokyo',          label: 'GMT+9' },
            { city: 'Sydney',       tz: 'Australia/Sydney',    label: 'GMT+10' },
        ];

        function timeIn(tz) {
            try {
                return new Date().toLocaleTimeString('pt-PT', {
                    timeZone: tz,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });
            } catch (_) {
                const d = new Date();
                return pad(d.getHours()) + ':' + pad(d.getMinutes());
            }
        }

        function renderWorld() {
            const list = document.createElement('div');
            list.className = 'world-clock-list';
            cities.forEach(c => {
                const it = document.createElement('div');
                it.className = 'wc-item';
                it.innerHTML = `
                    <div>
                        <div class="wc-city">${c.city}</div>
                        <div class="wc-tz">${c.label}</div>
                    </div>
                    <div class="wc-time" data-tz="${c.tz}">${timeIn(c.tz)}</div>
                `;
                list.appendChild(it);
            });
            content.appendChild(list);

            const tick = () => {
                list.querySelectorAll('.wc-time').forEach(el => {
                    el.textContent = timeIn(el.dataset.tz);
                });
            };
            intervals.push(setInterval(tick, 1000));
        }

        // ----------------- Stopwatch -----------------
        function renderStopwatch() {
            let startTs = null;
            let elapsed = 0;     // ms acumulados quando parado
            let running = false;

            const display = document.createElement('div');
            display.className = 'stopwatch-display';
            display.textContent = '00:00,00';
            content.appendChild(display);

            const ctrls = document.createElement('div');
            ctrls.className = 'stopwatch-controls';

            const btnReset = document.createElement('button');
            btnReset.className = 'sw-btn reset';
            btnReset.textContent = t('clock_btn_reset', { _d: 'Reiniciar' });

            const btnStart = document.createElement('button');
            btnStart.className = 'sw-btn start';
            btnStart.textContent = t('clock_btn_start', { _d: 'Iniciar' });

            ctrls.appendChild(btnReset);
            ctrls.appendChild(btnStart);
            content.appendChild(ctrls);

            function format(ms) {
                const totalCs = Math.floor(ms / 10);
                const cs = totalCs % 100;
                const totalSec = Math.floor(totalCs / 100);
                const sec = totalSec % 60;
                const min = Math.floor(totalSec / 60);
                return pad(min) + ':' + pad(sec) + ',' + pad(cs);
            }

            function update() {
                const now = elapsed + (running ? Date.now() - startTs : 0);
                display.textContent = format(now);
            }

            intervals.push(setInterval(update, 30));

            btnStart.addEventListener('click', () => {
                if (!running) {
                    startTs = Date.now();
                    running = true;
                    btnStart.textContent = t('clock_btn_stop', { _d: 'Parar' });
                    btnStart.classList.remove('start');
                    btnStart.classList.add('stop');
                } else {
                    elapsed += Date.now() - startTs;
                    running = false;
                    btnStart.textContent = t('clock_btn_resume', { _d: 'Continuar' });
                    btnStart.classList.remove('stop');
                    btnStart.classList.add('start');
                }
            });
            btnReset.addEventListener('click', () => {
                running = false;
                elapsed = 0;
                startTs = null;
                btnStart.textContent = t('clock_btn_start', { _d: 'Iniciar' });
                btnStart.classList.remove('stop');
                btnStart.classList.add('start');
                update();
            });
        }

        // ----------------- Timer -----------------
        function renderTimer() {
            let endTs = null;
            let remaining = 0;
            let running = false;

            const display = document.createElement('div');
            display.className = 'stopwatch-display';
            display.textContent = '00:00:00';
            content.appendChild(display);

            const inputs = document.createElement('div');
            inputs.className = 'timer-input-row';
            inputs.innerHTML = `
                <input id="tm-h" type="number" min="0" max="23" value="0" />
                <label>${t('clock_label_hours_short', { _d: 'h' })}</label>
                <input id="tm-m" type="number" min="0" max="59" value="5" />
                <label>${t('clock_label_minutes_short', { _d: 'm' })}</label>
                <input id="tm-s" type="number" min="0" max="59" value="0" />
                <label>${t('clock_label_seconds_short', { _d: 's' })}</label>
            `;
            content.appendChild(inputs);

            const ctrls = document.createElement('div');
            ctrls.className = 'stopwatch-controls';
            const btnReset = document.createElement('button');
            btnReset.className = 'sw-btn reset';
            btnReset.textContent = t('clock_btn_clear', { _d: 'Limpar' });
            const btnStart = document.createElement('button');
            btnStart.className = 'sw-btn start';
            btnStart.textContent = t('clock_btn_start', { _d: 'Iniciar' });
            ctrls.appendChild(btnReset);
            ctrls.appendChild(btnStart);
            content.appendChild(ctrls);

            function format(ms) {
                if (ms < 0) ms = 0;
                const totalSec = Math.ceil(ms / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                return pad(h) + ':' + pad(m) + ':' + pad(s);
            }

            function update() {
                if (running) {
                    const left = endTs - Date.now();
                    display.textContent = format(left);
                    if (left <= 0) {
                        running = false;
                        btnStart.textContent = t('clock_btn_start', { _d: 'Iniciar' });
                        btnStart.classList.remove('stop');
                        btnStart.classList.add('start');
                        // pequena animação de fim
                        display.style.color = '#ff453a';
                        setTimeout(() => { display.style.color = ''; }, 1500);
                    }
                } else {
                    display.textContent = format(remaining);
                }
            }
            intervals.push(setInterval(update, 200));

            btnStart.addEventListener('click', () => {
                if (!running) {
                    const h = parseInt(content.querySelector('#tm-h').value, 10) || 0;
                    const m = parseInt(content.querySelector('#tm-m').value, 10) || 0;
                    const s = parseInt(content.querySelector('#tm-s').value, 10) || 0;
                    remaining = (h * 3600 + m * 60 + s) * 1000;
                    if (remaining <= 0) return;
                    endTs = Date.now() + remaining;
                    running = true;
                    btnStart.textContent = t('clock_btn_pause', { _d: 'Parar' });
                    btnStart.classList.remove('start');
                    btnStart.classList.add('stop');
                } else {
                    running = false;
                    remaining = endTs - Date.now();
                    btnStart.textContent = t('clock_btn_resume', { _d: 'Continuar' });
                    btnStart.classList.remove('stop');
                    btnStart.classList.add('start');
                }
            });
            btnReset.addEventListener('click', () => {
                running = false;
                remaining = 0;
                endTs = null;
                btnStart.textContent = t('clock_btn_start', { _d: 'Iniciar' });
                btnStart.classList.remove('stop');
                btnStart.classList.add('start');
                update();
            });
        }

        win.onClose(() => clearIntervals());

        root.appendChild(tabs);
        root.appendChild(content);
        switchTab('world');
        return root;
    }

    return {
        id: 'clock',
        get defaultName() { return t('clock_title_main', { _d: 'Relógio' }); },
        defaultSize: { w: 580, h: 620 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
