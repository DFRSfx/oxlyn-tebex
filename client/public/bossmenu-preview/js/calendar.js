// ==========================================
//  OXLYN-BOSSMENU | App: Calendário
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.calendar = (function () {
    function t(key, vars) {
        if (window.OS && typeof window.OS.t === 'function') return window.OS.t(key, vars);
        return (vars && vars._d) ? vars._d : key;
    }

    const MONTH_KEYS = [
        { key: 'cal_month_jan', _d: 'Janeiro' },
        { key: 'cal_month_feb', _d: 'Fevereiro' },
        { key: 'cal_month_mar', _d: 'Março' },
        { key: 'cal_month_apr', _d: 'Abril' },
        { key: 'cal_month_may', _d: 'Maio' },
        { key: 'cal_month_jun', _d: 'Junho' },
        { key: 'cal_month_jul', _d: 'Julho' },
        { key: 'cal_month_aug', _d: 'Agosto' },
        { key: 'cal_month_sep', _d: 'Setembro' },
        { key: 'cal_month_oct', _d: 'Outubro' },
        { key: 'cal_month_nov', _d: 'Novembro' },
        { key: 'cal_month_dec', _d: 'Dezembro' },
    ];
    const WEEKDAY_SHORT_KEYS = [
        { key: 'cal_day_short_mon', _d: 'Seg' },
        { key: 'cal_day_short_tue', _d: 'Ter' },
        { key: 'cal_day_short_wed', _d: 'Qua' },
        { key: 'cal_day_short_thu', _d: 'Qui' },
        { key: 'cal_day_short_fri', _d: 'Sex' },
        { key: 'cal_day_short_sat', _d: 'Sáb' },
        { key: 'cal_day_short_sun', _d: 'Dom' },
    ];
    function getMonths()      { return MONTH_KEYS.map(m => t(m.key, { _d: m._d })); }
    function getWeekdayShort() { return WEEKDAY_SHORT_KEYS.map(d => t(d.key, { _d: d._d })); }

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('calendar');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:#fff;width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#1d1d1f;font-size:32px;font-weight:300;border-top:14px solid #d62b1d;';
        d.textContent = String(new Date().getDate());
        return d;
    }

    function buildContent(win, cfg, locale) {
        const root = document.createElement('div');
        root.className = 'cal-app';

        const today = new Date();
        let viewYear = today.getFullYear();
        let viewMonth = today.getMonth();

        // Header
        const header = document.createElement('div');
        header.className = 'cal-header';

        const title = document.createElement('div');
        title.className = 'month-title';

        const nav = document.createElement('div');
        nav.className = 'nav';
        const prev = document.createElement('button');
        prev.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>`;
        const todayBtn = document.createElement('button');
        todayBtn.className = 'today';
        todayBtn.textContent = t('cal_btn_today', { _d: 'Hoje' });
        const next = document.createElement('button');
        next.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>`;
        nav.appendChild(prev);
        nav.appendChild(todayBtn);
        nav.appendChild(next);

        header.appendChild(title);
        header.appendChild(nav);

        // Weekdays
        const wd = document.createElement('div');
        wd.className = 'cal-weekdays';
        getWeekdayShort().forEach(d => {
            const c = document.createElement('div');
            c.textContent = d;
            wd.appendChild(c);
        });

        // Grid
        const grid = document.createElement('div');
        grid.className = 'cal-grid';

        function render() {
            title.textContent = `${getMonths()[viewMonth]} ${viewYear}`;
            grid.innerHTML = '';

            // Calcular primeiro dia do mês (0 = Dom em JS, queremos Seg=0)
            const firstDay = new Date(viewYear, viewMonth, 1);
            const startWeekday = (firstDay.getDay() + 6) % 7;  // Mon=0
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

            // 42 células (6 semanas)
            for (let i = 0; i < 42; i++) {
                const cell = document.createElement('div');
                cell.className = 'cal-day';

                let dayNum, isMuted = false;
                let cellYear = viewYear, cellMonth = viewMonth;

                if (i < startWeekday) {
                    dayNum = daysInPrev - (startWeekday - i - 1);
                    isMuted = true;
                    cellMonth -= 1;
                    if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
                } else if (i >= startWeekday + daysInMonth) {
                    dayNum = i - startWeekday - daysInMonth + 1;
                    isMuted = true;
                    cellMonth += 1;
                    if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
                } else {
                    dayNum = i - startWeekday + 1;
                }

                cell.textContent = dayNum;
                if (isMuted) cell.classList.add('muted');

                if (cellYear === today.getFullYear()
                    && cellMonth === today.getMonth()
                    && dayNum === today.getDate()
                    && !isMuted) {
                    cell.classList.add('today');
                }

                grid.appendChild(cell);
            }
        }

        prev.addEventListener('click', () => {
            viewMonth -= 1;
            if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
            render();
        });
        next.addEventListener('click', () => {
            viewMonth += 1;
            if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
            render();
        });
        todayBtn.addEventListener('click', () => {
            viewYear = today.getFullYear();
            viewMonth = today.getMonth();
            render();
        });

        root.appendChild(header);
        root.appendChild(wd);
        root.appendChild(grid);

        render();
        return root;
    }

    return {
        id: 'calendar',
        get defaultName() { return t('cal_title_main', { _d: 'Calendário' }); },
        defaultSize: { w: 600, h: 660 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
