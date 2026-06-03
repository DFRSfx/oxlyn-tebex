// ==========================================
//  OXLYN-BOSSMENU | Gestão de Empresa (ESX real)
//  Tudo aqui chama o servidor — saldo, empregados,
//  contratar, despedir, promover, despromover, salários
//  são lidos/atualizados na DB via ESX.
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.companyManagement = (function () {

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('company');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(135deg,#4ade80,#198a3d);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;';
        d.textContent = '🏢';
        return d;
    }

    // ==========================================
    // Helpers
    // ==========================================
    function fmtMoney(v) {
        const n = Number(v) || 0;
        try {
            return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
        } catch (_) { return n.toLocaleString('pt-PT') + ' €'; }
    }
    function fmtRelative(iso) {
        const OS = window.OS;
        try {
            const t = new Date(iso).getTime();
            const diff = (Date.now() - t) / 1000;
            if (diff < 60) return OS.t('cm_time_just_now', { _d: 'agora mesmo' });
            if (diff < 3600) { const n = Math.floor(diff/60); return OS.t('cm_time_min_ago', { n, _d: `há ${n} min` }); }
            if (diff < 86400) { const n = Math.floor(diff/3600); return OS.t('cm_time_h_ago', { n, _d: `há ${n} h` }); }
            if (diff < 86400*7) { const n = Math.floor(diff/86400); return OS.t('cm_time_days_ago', { n, _d: `há ${n} dias` }); }
            const d = new Date(iso);
            return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        } catch (_) { return iso; }
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function svg(path, size) {
        const s = size || 14;
        return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }
    const ICONS = {
        plus:     svg('<path d="M12 5v14M5 12h14"/>'),
        edit:     svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
        trash:    svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>'),
        deposit:  svg('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
        withdraw: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
        up:       svg('<polyline points="18 15 12 9 6 15"/>'),
        down:     svg('<polyline points="6 9 12 15 18 9"/>'),
        history:  svg('<path d="M3 12a9 9 0 1015.5-6.2L23 9"/><polyline points="22 4 22 9 17 9"/><polyline points="12 7 12 12 16 14"/>'),
        refresh:  svg('<path d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M20.49 15A9 9 0 015.64 18.36L1 14"/>'),
        // h2 / stat icons
        building: svg('<path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 12h.01M12 12h.01M15 12h.01"/>'),
        users:    svg('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
        wallet:   svg('<path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-1"/><path d="M16 12h5v4h-5a2 2 0 010-4z"/>'),
        wifi:     svg('<path d="M5 12.55a11 11 0 0114 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>'),
        chart:    svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
        tree:     svg('<path d="M12 3v18M5 21h14M5 8h14M9 14h6"/>'),
        cog:      svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
        money:    svg('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'),
    };

    // Extrai a primeira cor de um gradient CSS (#hex, rgb, etc)
    function extractColor(value, fallback) {
        const s = String(value || '');
        const m = s.match(/#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/i);
        return m ? m[0] : (fallback || '#0ea5e9');
    }
    function hexToRgba(hex, a) {
        const h = hex.replace('#', '');
        const v = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
        const r = parseInt(v.substr(0,2), 16) || 0;
        const g = parseInt(v.substr(2,2), 16) || 0;
        const b = parseInt(v.substr(4,2), 16) || 0;
        return `rgba(${r},${g},${b},${a})`;
    }

    function hashStr(s) { s = String(s||''); let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return Math.abs(h); }
    const PED_COLORS = [
        ['#0ea5e9','#1e40af'], ['#a855f7','#6d28d9'], ['#10b981','#047857'],
        ['#f59e0b','#b45309'], ['#ec4899','#9f1239'], ['#06b6d4','#0e7490'],
        ['#ef4444','#7f1d1d'], ['#84cc16','#3f6212'], ['#8b5cf6','#5b21b6'],
        ['#f97316','#9a3412'], ['#14b8a6','#115e59'], ['#3b82f6','#1e3a8a'],
    ];
    function buildPedAvatar(name, size) {
        size = size || 36;
        const h = hashStr(name);
        const [c1, c2] = PED_COLORS[h % PED_COLORS.length];
        const div = document.createElement('div');
        div.className = 'ped-avatar';
        div.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${Math.max(11, size*0.42)}px;flex:0 0 ${size}px;text-shadow:0 1px 3px rgba(0,0,0,.35);box-shadow:0 2px 6px rgba(0,0,0,.3),inset 0 0 0 1px rgba(255,255,255,.1);position:relative;overflow:hidden;`;
        div.innerHTML = `<svg viewBox="0 0 24 24" width="${Math.floor(size*0.55)}" height="${Math.floor(size*0.55)}" fill="rgba(255,255,255,.92)" style="position:absolute"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v3h16v-3c0-3.3-4.7-5-8-5z"/></svg>`;
        return div;
    }

    // NUI bridge helper
    function nuiCall(name, payload) {
        return fetch(`https://oxlyn-bossmenu/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(payload || {}),
        }).then(r => r.json()).catch(() => null);
    }

    // ==========================================
    // Histórico local (apenas as nossas ações)
    // ==========================================
    function historyKey(id) { return `oxlyn_bm_company_history_${id || 'default'}`; }
    function loadHistory(id) { try { return JSON.parse(localStorage.getItem(historyKey(id))) || []; } catch (_) { return []; } }
    function saveHistory(id, h) { try { localStorage.setItem(historyKey(id), JSON.stringify(h.slice(0, 200))); } catch (_) {} }

    // ==========================================
    // Folha de Ponto helpers (formatadores e cálculos)
    // O storage agora é SERVER-SIDE — `state.timesheet` é uma lista
    // achatada de shifts: [{ id, identifier, name, grade, in_time, out_time, secs }]
    // ==========================================
    function fmtDuration(secs) {
        const OS = window.OS;
        if (!secs || secs < 0) return OS.t('cm_dur_zero', { _d: '0min' });
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        if (h && m) return OS.t('cm_dur_hm', { h, m, _d: `${h}h ${m}min` });
        if (h) return OS.t('cm_dur_h', { h, _d: `${h}h` });
        return OS.t('cm_dur_m', { m, _d: `${m}min` });
    }
    // Parser robusto de timestamps que podem vir em vários formatos:
    //   - "YYYY-MM-DDTHH:MM:SS" (ISO, formato preferido — vem do server com DATE_FORMAT)
    //   - "YYYY-MM-DD HH:MM:SS" (MySQL clássico)
    //   - número (epoch ms)
    //   - Date / objeto JSON serializado
    function parseTs(raw) {
        if (raw == null || raw === '') return null;
        if (raw instanceof Date) return raw;
        if (typeof raw === 'number') return new Date(raw);
        if (typeof raw === 'string') {
            // Substitui espaço por T para ISO se preciso
            const s = raw.includes('T') ? raw : raw.replace(' ', 'T');
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
            return null;
        }
        // Objeto (ex: oxmysql DateTime obj { year, month, day, ... })
        if (typeof raw === 'object') {
            if (raw.year && raw.month) {
                return new Date(raw.year, (raw.month||1) - 1, raw.day||1, raw.hour||0, raw.minute||0, raw.second||0);
            }
        }
        return null;
    }
    function fmtTime(iso) {
        const d = parseTs(iso);
        if (!d) return '--:--';
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    function fmtDay(iso) {
        const OS = window.OS;
        const d = parseTs(iso);
        if (!d) return '—';
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        const isYest = d.toDateString() === yest.toDateString();
        if (isToday) return OS.t('cm_day_today', { _d: 'Hoje' });
        if (isYest) return OS.t('cm_day_yesterday', { _d: 'Ontem' });
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }
    function shiftInTimeMs(s) {
        const d = parseTs(s.in_time);
        return d ? d.getTime() : Date.now();
    }
    function shiftOutTimeMs(s) {
        if (!s.out_time) return Date.now();
        const d = parseTs(s.out_time);
        return d ? d.getTime() : Date.now();
    }
    function shiftElapsedSecs(s) {
        // O server agora calcula `secs` em real-time mesmo para turnos abertos
        // (CASE WHEN out_time IS NULL THEN TIMESTAMPDIFF...). Confiamos nesse valor.
        // Como fallback, calculamos no client a partir do in_time.
        const fromServer = Number(s.secs) || 0;
        if (fromServer > 0) return fromServer;
        const inMs = shiftInTimeMs(s);
        if (!inMs || inMs >= Date.now()) return 0;
        return Math.max(0, Math.round((Date.now() - inMs) / 1000));
    }
    function getOpenShiftFor(shifts, identifier) {
        // O server devolve em ordem desc — basta o primeiro do identifier sem out_time
        for (const s of shifts) {
            if (s.identifier === identifier && !s.out_time) return s;
        }
        return null;
    }
    function workedSecsLastHours(shifts, hours) {
        const cutoff = Date.now() - (hours * 3600 * 1000);
        let total = 0;
        shifts.forEach(s => {
            const inT = shiftInTimeMs(s);
            const outT = shiftOutTimeMs(s);
            const start = Math.max(inT, cutoff);
            const end   = outT;
            if (end > start) total += Math.round((end - start) / 1000);
        });
        return total;
    }
    function uniqueWorkersLastHours(shifts, hours) {
        const cutoff = Date.now() - (hours * 3600 * 1000);
        const set = new Set();
        shifts.forEach(s => {
            if (shiftInTimeMs(s) >= cutoff) set.add(s.identifier);
        });
        return set.size;
    }

    function rankByGrade(ranks, grade) {
        const OS = window.OS;
        const fb = OS.t('cm_label_grade_n', { grade, _d: `Grade ${grade}` });
        const r = (ranks || []).find(x => Number(x.grade) === Number(grade));
        return r ? (r.label || r.name || fb) : fb;
    }
    function rankSalary(ranks, grade) {
        const r = (ranks || []).find(x => Number(x.grade) === Number(grade));
        return r ? r.salary : 0;
    }

    // ==========================================
    // App principal
    // ==========================================
    function buildContent(win, cfg, locale) {
        const config = window.OS.api.getConfig();
        const companyInfo = (config && config.company) || null;

        const root = document.createElement('div');
        root.className = 'sidebar-app company-app';

        // Aplica a cor da marca como variável CSS para tudo na app usar
        const accentHex = extractColor(companyInfo && companyInfo.color, '#0ea5e9');
        root.style.setProperty('--company-accent', accentHex);
        root.style.setProperty('--company-accent-soft', hexToRgba(accentHex, 0.16));

        // helper para notificar com app="Gestão de Empresa"
        const OS = window.OS;
        const notify = (opts) => {
            if (!window.OS || !window.OS.api || !window.OS.api.notify) return;
            window.OS.api.notify({ ...opts, app: OS.t('cm_app_name', { _d: 'Gestão de Empresa' }) });
        };

        // ---------- Estado ----------
        const state = {
            companyId:    companyInfo && companyInfo.id || 'default',
            companyName:  companyInfo && companyInfo.name || OS.t('cm_default_company', { _d: 'Empresa' }),
            balance:      0,
            employees:    [],
            ranks:        (companyInfo && companyInfo.ranks) || [],
            history:      loadHistory(companyInfo && companyInfo.id),
            // Timesheet agora vem do server (achatado: lista de shifts)
            timesheet:    [],
            myIdentifier: null,
            // Quem sou eu nesta empresa (vindo do payload init)
            isBoss:       cfg && cfg.isBoss === true,
            myAccess:     (cfg && cfg.myAccess) || 'limited',
            myGrade:      cfg && typeof cfg.myGrade === 'number' ? cfg.myGrade : 0,
            myName:       (cfg && cfg.playerName) || (cfg && cfg.firstName) || '',
            // Settings (só boss tem acesso)
            settings:     (cfg && cfg.settings) || { allowedGrades: {}, tabAccess: {} },
            currentTab:   'overview',
            loading:      true,
        };
        // Re-render automático a cada 30s para manter o "tempo decorrido"
        // dos turnos abertos atualizado na overview e na folha de ponto
        const tickInterval = setInterval(() => {
            if (state.currentTab === 'overview' || state.currentTab === 'timesheet') {
                rerender();
            }
        }, 30000);
        function cleanup() { clearInterval(tickInterval); }

        function logEvent(type, text) {
            state.history.unshift({ id: Date.now(), ts: new Date().toISOString(), type, text });
            saveHistory(state.companyId, state.history);
        }

        // ---------- Sidebar ----------
        const side = document.createElement('div');
        side.className = 'sidebar';
        // Tabs disponíveis. Cada tab declara quem a vê:
        //   bossOnly: só boss (Equipa, Salários, Contratar, Patentes, Definições)
        //   limitedOk: empregado também vê (Visão Geral, Folha de Ponto, Anúncios)
        const ALL_TABS = [
            { id: 'overview',  label: OS.t('cm_tab_overview',  { _d: 'Visão Geral' }),      icon: ICONS.chart,   limitedOk: true  },
            { id: 'employees', label: OS.t('cm_tab_team',      { _d: 'Equipa' }),           icon: ICONS.users,   bossOnly:  true  },
            { id: 'timesheet', label: OS.t('cm_tab_timesheet', { _d: 'Folha de Ponto' }),   icon: svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'), limitedOk: true },
            { id: 'salaries',  label: OS.t('cm_tab_salaries',  { _d: 'Salários & Bónus' }), icon: ICONS.wallet,  bossOnly:  true  },
            { id: 'ranks',     label: OS.t('cm_tab_ranks',     { _d: 'Patentes' }),         icon: ICONS.tree,    bossOnly:  true  },
            { id: 'finance',   label: OS.t('cm_tab_finance',   { _d: 'Finanças' }),         icon: ICONS.money,   bossOnly:  true  },
            { id: 'announce',  label: OS.t('cm_tab_announce',  { _d: 'Anúncios' }),         icon: svg('<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/>'), limitedOk: true },
            { id: 'history',   label: OS.t('cm_tab_history',   { _d: 'Histórico' }),        icon: ICONS.history, bossOnly:  true  },
            { id: 'settings',  label: OS.t('cm_tab_settings',  { _d: 'Definições' }),       icon: ICONS.cog,     bossOnly:  true  },
        ];
        const tabs = ALL_TABS.filter(t => state.isBoss || t.limitedOk);

        const brand = document.createElement('div');
        brand.className = 'company-brand';
        brand.style.background = (companyInfo && companyInfo.color) || 'linear-gradient(135deg,#4ade80,#198a3d)';
        brand.innerHTML = `
            <div class="brand-short">${escapeHtml((companyInfo && companyInfo.shortName) || 'CO')}</div>
            <div class="brand-text">
                <div class="brand-name">${escapeHtml(state.companyName)}</div>
                <div class="brand-sub" id="brand-sub">${escapeHtml(OS.t('cm_msg_loading', { _d: 'A carregar...' }))}</div>
            </div>`;
        side.appendChild(brand);

        tabs.forEach((t, i) => {
            const it = document.createElement('div');
            it.className = 'sidebar-item' + (i === 0 ? ' active' : '');
            it.dataset.tab = t.id;
            it.innerHTML = `<span class="si-icon-w">${t.icon || ''}</span><span>${escapeHtml(t.label)}</span>`;
            side.appendChild(it);
        });

        const main = document.createElement('div');
        main.className = 'main';

        // ---------- Renderers ----------
        const renderers = {
            overview:  renderOverview,
            employees: renderEmployees,
            timesheet: renderTimesheet,
            salaries:  renderSalaries,
            ranks:     renderRanks,
            finance:   renderFinance,
            announce:  renderAnnounce,
            history:   renderHistory,
            settings:  renderSettings,
        };

        function rerender() {
            const r = renderers[state.currentTab];
            if (r) {
                r();
                // Re-disparar animação de page transition ao trocar de tab
                main.classList.remove('cm-tab-page');
                void main.offsetWidth;
                main.classList.add('cm-tab-page');
            }
            // Atualiza brand sub
            const sub = side.querySelector('#brand-sub');
            if (sub) {
                const count = state.employees.length;
                const empTxt = OS.t('cm_count_employees', { count, _d: `${count} empregados` });
                sub.textContent = `${empTxt} · ${fmtMoney(state.balance)}`;
            }
        }

        // ===== Helpers UI reutilizáveis =====
        function filterChips(options, selected, onChange) {
            const wrap = document.createElement('div');
            wrap.className = 'cm-filter-chips';
            options.forEach(opt => {
                const chip = document.createElement('button');
                chip.className = 'cm-filter-chip' + (opt.value === selected ? ' active' : '');
                chip.innerHTML = escapeHtml(opt.label) +
                    (opt.count !== undefined ? ` <span class="cm-filter-chip-count">${opt.count}</span>` : '');
                chip.addEventListener('click', () => {
                    wrap.querySelectorAll('.cm-filter-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    onChange(opt.value);
                });
                wrap.appendChild(chip);
            });
            return wrap;
        }

        function searchInput(placeholder, onInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'cm-search-input';
            input.placeholder = placeholder || OS.t('cm_placeholder_search', { _d: 'Procurar...' });
            input.spellcheck = false;
            input.addEventListener('input', () => onInput(input.value));
            return input;
        }

        // Helpers para campos em modais (field + getField)
        function field(label, name, opts) {
            opts = opts || {};
            const wrap = document.createElement('div');
            wrap.className = 'field';
            const lbl = document.createElement('label'); lbl.textContent = label;
            wrap.appendChild(lbl);
            let inp;
            if (opts.select) {
                inp = document.createElement('select');
                opts.select.forEach(o => {
                    const op = document.createElement('option');
                    op.value = typeof o === 'object' ? o.value : o;
                    op.textContent = typeof o === 'object' ? o.label : o;
                    if (opts.value === op.value) op.selected = true;
                    inp.appendChild(op);
                });
            } else {
                inp = document.createElement('input');
                inp.type = opts.type || 'text';
                if (opts.value !== undefined) inp.value = opts.value;
                if (opts.min !== undefined) inp.min = opts.min;
                if (opts.placeholder) inp.placeholder = opts.placeholder;
                if (opts.disabled) inp.disabled = true;
            }
            inp.dataset.field = name;
            wrap.appendChild(inp);
            return wrap;
        }
        function getField(body, name) {
            const el = body.querySelector(`[data-field="${name}"]`);
            return el ? el.value : '';
        }

        function showLoading(msg) {
            main.innerHTML = `<div class="company-loading"><div class="company-spinner"></div><div>${escapeHtml(msg || OS.t('cm_msg_loading', { _d: 'A carregar...' }))}</div></div>`;
        }

        // ---------- Refresh do server ----------
        async function refresh() {
            state.loading = true;
            // Paraleliza company data + timesheet (e settings se for boss)
            const calls = [ nuiCall('getCompanyData'), nuiCall('getTimesheet') ];
            if (state.isBoss) calls.push(nuiCall('getCompanySettings'));

            const [data, ts, settings] = await Promise.all(calls);
            state.loading = false;
            if (data) {
                state.balance   = Number(data.balance) || 0;
                state.employees = Array.isArray(data.employees) ? data.employees : [];
                if (Array.isArray(data.ranks) && data.ranks.length > 0) state.ranks = data.ranks;
            }
            if (ts) {
                state.timesheet    = Array.isArray(ts.shifts) ? ts.shifts : [];
                state.myIdentifier = ts.myIdentifier || null;
                // Confirma o isBoss vindo do server (autoritativo)
                if (typeof ts.isBoss === 'boolean') state.isBoss = ts.isBoss;
            }
            if (settings) {
                state.settings = {
                    allowedGrades: settings.allowedGrades || {},
                    tabAccess:     settings.tabAccess || {},
                };
            }
            rerender();
        }

        // ---------- Clock-in / out (chama server) ----------
        async function doClockIn(targetIdentifier) {
            // Empregado normal só pode clockear a si mesmo — server enforça
            const res = await nuiCall('clockIn', { identifier: targetIdentifier || '' });
            if (res && res.ok) {
                const tName = (state.employees.find(e => e.identifier === targetIdentifier) || {}).name
                              || (targetIdentifier === state.myIdentifier ? state.myName : OS.t('cm_label_employee', { _d: 'Empregado' }));
                logEvent('clockin', OS.t('cm_log_clockin', { name: tName, _d: `Entrada — ${tName}` }));
                notify({ type: 'success', title: OS.t('cm_notify_shift_started_title', { _d: 'Turno iniciado' }), message: OS.t('cm_notify_shift_started_msg', { name: tName, _d: `${tName} entrou em serviço.` }) });
                refresh();
            } else {
                const err = (res && res.error) || 'unknown';
                const msg = err === 'already_open' ? OS.t('cm_err_shift_already_open', { _d: 'Já tem um turno aberto.' }) :
                            err === 'no_company'   ? OS.t('cm_err_no_company', { _d: 'Sem permissão para esta empresa.' }) :
                            OS.t('cm_err_shift_start_failed', { _d: 'Não foi possível iniciar o turno.' });
                notify({ type: 'error', title: OS.t('cm_notify_error', { _d: 'Erro' }), message: msg });
            }
        }
        async function doClockOut(shift) {
            const res = await nuiCall('clockOut', { shiftId: shift.id });
            if (res && res.ok) {
                logEvent('clockout', OS.t('cm_log_clockout', { name: shift.name, _d: `Saída — ${shift.name}` }));
                notify({ type: 'info', title: OS.t('cm_notify_shift_ended_title', { _d: 'Turno terminado' }), message: OS.t('cm_notify_shift_ended_msg', { name: shift.name, _d: `${shift.name} terminou o turno.` }) });
                refresh();
            } else {
                notify({ type: 'error', title: OS.t('cm_notify_error', { _d: 'Erro' }), message: OS.t('cm_err_shift_end_failed', { _d: 'Não foi possível terminar o turno.' }) });
            }
        }

        // ---------- Helpers de UI ----------
        function h1(text, iconSvg) {
            const el = document.createElement('h1');
            if (iconSvg) {
                const ic = document.createElement('div');
                ic.className = 'h2-icon';
                ic.style.cssText = 'width:32px;height:32px;border-radius:8px;background:var(--company-accent-soft);color:var(--company-accent);display:inline-flex;align-items:center;justify-content:center;';
                ic.innerHTML = iconSvg.replace('width="14"', 'width="18"').replace('height="14"', 'height="18"');
                el.appendChild(ic);
            }
            el.appendChild(document.createTextNode(text));
            return el;
        }
        function h2(text, iconSvg) {
            const el = document.createElement('h2');
            if (iconSvg) {
                const ic = document.createElement('span');
                ic.className = 'h2-icon';
                ic.innerHTML = iconSvg;
                el.appendChild(ic);
            }
            el.appendChild(document.createTextNode(text));
            return el;
        }
        function muted(text) { const el = document.createElement('p'); el.className = 'muted'; el.textContent = text; return el; }
        function statCard(label, value, opts) {
            opts = opts || {};
            const card = document.createElement('div');
            card.className = 'stat-card' + (opts.variant ? ' ' + opts.variant : '');
            card.innerHTML = `
                <div class="stat-label">${escapeHtml(label)}</div>
                <div class="stat-value" ${opts.valueColor ? `style="color:${opts.valueColor}"` : ''}>${value}</div>
                ${opts.icon ? `<div class="stat-icon">${opts.icon}</div>` : ''}`;
            return card;
        }
        function emptyState(title, message, iconSvg) {
            const wrap = document.createElement('div');
            wrap.className = 'company-empty';
            wrap.innerHTML = `
                <div class="empty-icon">${iconSvg || ICONS.users}</div>
                <div class="empty-title">${escapeHtml(title)}</div>
                <div class="empty-msg">${escapeHtml(message)}</div>`;
            return wrap;
        }
        function toolbarBtn(label, iconKey, onClick, style) {
            const b = document.createElement('button');
            b.className = 'toolbar-btn ' + (style || '');
            b.innerHTML = (ICONS[iconKey] || '') + ' <span>'+escapeHtml(label)+'</span>';
            b.addEventListener('click', onClick);
            return b;
        }

        // ==========================================
        // VIEWS
        // ==========================================
        function renderOverview() {
            main.innerHTML = '';

            const onlineCount   = state.employees.filter(e => e.online).length;
            const totalSalaries = state.employees.reduce((s, e) => s + rankSalary(state.ranks, e.grade), 0);
            const avgSalary     = state.employees.length ? Math.round(totalSalaries / state.employees.length) : 0;

            // KPIs reais da Folha de Ponto (semana = 7 dias = 168h)
            const hoursThisWeek   = workedSecsLastHours(state.timesheet, 168) / 3600;
            const hoursToday      = workedSecsLastHours(state.timesheet, 24)  / 3600;
            const workersThisWeek = uniqueWorkersLastHours(state.timesheet, 168);
            const engagementPct = state.employees.length
                ? Math.min(100, Math.round((workersThisWeek / state.employees.length) * 100))
                : 0;

            // Turnos abertos AGORA (lista achatada server-side)
            const openShifts = state.timesheet.filter(s => !s.out_time);

            // ===== Header — limpo, profissional, sem texto sem sentido =====
            const header = document.createElement('div');
            header.className = 'cm-header-strip';
            const subtitle = state.isBoss
                ? (onlineCount > 0
                    ? OS.t('cm_overview_online_count', { count: onlineCount, _d: `${onlineCount} ${onlineCount === 1 ? 'empregado' : 'empregados'} em serviço` })
                    : (state.employees.length === 0 ? OS.t('cm_overview_no_employees', { _d: 'Sem empregados registados' }) : OS.t('cm_overview_team_offline', { _d: 'Equipa offline' })))
                : OS.t('cm_overview_welcome', { name: escapeHtml(state.myName || OS.t('cm_label_employee', { _d: 'Empregado' })), _d: `Bem-vindo, ${escapeHtml(state.myName || 'Empregado')}` });
            header.innerHTML = `
                <div class="cm-header-info">
                    <div class="cm-header-badge">${escapeHtml((companyInfo && companyInfo.shortName) || 'CO')}</div>
                    <div class="cm-header-text">
                        <h1>${escapeHtml(state.companyName)}</h1>
                        <div class="cm-header-meta">
                            <span class="live-dot"></span>
                            <span>${subtitle}</span>
                        </div>
                    </div>
                </div>`;
            const headerActions = document.createElement('div');
            headerActions.className = 'cm-header-actions';
            // Ações de boss apenas
            if (state.isBoss) {
                headerActions.appendChild(toolbarBtn(OS.t('cm_btn_deposit',  { _d: 'Depositar' }),  'deposit',  () => openMoneyModal('deposit')));
                headerActions.appendChild(toolbarBtn(OS.t('cm_btn_withdraw', { _d: 'Levantar' }),   'withdraw', () => openMoneyModal('withdraw'), 'secondary'));
                headerActions.appendChild(toolbarBtn(OS.t('cm_btn_hire',     { _d: 'Contratar' }),  'plus',     openHireModal, 'secondary'));
            }
            headerActions.appendChild(toolbarBtn(OS.t('cm_btn_refresh', { _d: 'Atualizar' }),  'refresh',  refresh, 'secondary'));
            header.appendChild(headerActions);
            main.appendChild(header);

            // ===== 4 KPI cards — métricas que importam =====
            const statsRow = document.createElement('div');
            statsRow.className = 'cm-stats-row';

            statsRow.appendChild(buildStatCard({
                icon: ICONS.wallet, iconClass: 'blue',
                label: OS.t('cm_kpi_society_balance', { _d: 'Saldo da Sociedade' }),
                value: fmtMoney(state.balance),
                sub: OS.t('cm_kpi_business_account', { _d: 'Conta empresarial' }),
                spark: 'up', sparkColor: '#0ea5e9',
            }));
            statsRow.appendChild(buildStatCard({
                icon: ICONS.users, iconClass: 'purple',
                label: OS.t('cm_kpi_team', { _d: 'Equipa' }),
                value: state.employees.length,
                sub: state.employees.length === 1
                    ? OS.t('cm_count_employees_registered_one', { _d: '1 empregado registado' })
                    : OS.t('cm_count_employees_registered', { count: state.employees.length, _d: `${state.employees.length} empregados registados` }),
                spark: 'flat', sparkColor: '#a855f7',
            }));
            statsRow.appendChild(buildStatCard({
                icon: svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'),
                iconClass: 'green',
                label: OS.t('cm_kpi_hours_this_week', { _d: 'Horas Esta Semana' }),
                value: hoursThisWeek.toFixed(1) + 'h',
                sub: hoursToday > 0
                    ? OS.t('cm_kpi_hours_today', { hours: hoursToday.toFixed(1), _d: `${hoursToday.toFixed(1)}h hoje` })
                    : OS.t('cm_kpi_no_shifts_today', { _d: 'Sem turnos hoje' }),
                spark: 'wave', sparkColor: '#34c759',
            }));
            statsRow.appendChild(buildStatCard({
                icon: ICONS.money, iconClass: 'orange',
                label: OS.t('cm_kpi_payroll', { _d: 'Folha Salarial' }),
                value: fmtMoney(totalSalaries),
                sub: avgSalary > 0
                    ? OS.t('cm_kpi_avg_per_person', { amount: fmtMoney(avgSalary), _d: `Média ${fmtMoney(avgSalary)} / pessoa` })
                    : OS.t('cm_kpi_no_salaries', { _d: 'Sem salários definidos' }),
                spark: 'down', sparkColor: '#ff9f0a',
            }));
            main.appendChild(statsRow);

            // ===== Main grid: Folha do Dia (2/3) + Atividade Recente (1/3) =====
            const mainGrid = document.createElement('div');
            mainGrid.className = 'cm-main-grid';

            // PANEL A: Folha do Dia (clock-in/out)
            const shiftPanel = document.createElement('div');
            shiftPanel.className = 'cm-panel';
            const headHtml = `
                <div class="cm-panel-head">
                    <div class="cm-panel-title">
                        <span class="cm-panel-title-icon">${svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>')}</span>
                        ${escapeHtml(OS.t('cm_panel_today_sheet', { _d: 'Folha do Dia' }))}
                    </div>
                    <div class="cm-panel-action">${escapeHtml(OS.t('cm_count_on_shift', { count: openShifts.length, _d: `${openShifts.length} em turno` }))}</div>
                </div>`;
            shiftPanel.innerHTML = headHtml;

            // Mostra os turnos abertos com tempo decorrido + botão para terminar
            if (openShifts.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'cm-shift-empty';
                empty.innerHTML = `
                    <div class="cm-shift-empty-icon">${svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', 28)}</div>
                    <div class="cm-shift-empty-title">${escapeHtml(OS.t('cm_empty_nobody_on_shift', { _d: 'Ninguém em turno' }))}</div>
                    <div class="cm-shift-empty-sub">${state.isBoss
                        ? OS.t('cm_empty_shifts_hint_boss', { _d: 'Vai à <strong>Folha de Ponto</strong> para iniciar turnos.' })
                        : OS.t('cm_empty_shifts_hint_emp', { _d: 'Vai à <strong>Folha de Ponto</strong> para iniciares o teu turno.' })}</div>`;
                shiftPanel.appendChild(empty);
            } else {
                const list = document.createElement('div');
                list.className = 'cm-shift-list';
                openShifts.forEach(s => {
                    const elapsed = shiftElapsedSecs(s);
                    const emp = state.employees.find(e => e.identifier === s.identifier);
                    const rank = emp ? rankByGrade(state.ranks, emp.grade) : rankByGrade(state.ranks, s.grade);
                    const isMine = s.identifier === state.myIdentifier;

                    const row = document.createElement('div');
                    row.className = 'cm-shift-row' + (isMine ? ' is-mine' : '');
                    row.appendChild(buildPedAvatar(s.name, 36));
                    const info = document.createElement('div');
                    info.className = 'cm-shift-row-info';
                    info.innerHTML = `
                        <div class="cm-shift-row-name">${escapeHtml(s.name)}${isMine ? ' <span class="cm-pill-me">' + escapeHtml(OS.t('cm_pill_me', { _d: 'EU' })) + '</span>' : ''}</div>
                        <div class="cm-shift-row-meta">
                            <span>${escapeHtml(rank)}</span> · <span>${escapeHtml(OS.t('cm_label_entered_at', { time: fmtTime(s.in_time), _d: `Entrou às ${fmtTime(s.in_time)}` }))}</span>
                        </div>`;
                    row.appendChild(info);
                    const dur = document.createElement('div');
                    dur.className = 'cm-shift-row-dur';
                    dur.innerHTML = `<div class="cm-shift-row-dur-val">${fmtDuration(elapsed)}</div><div class="cm-shift-row-dur-lbl">${escapeHtml(OS.t('cm_label_elapsed', { _d: 'decorrido' }))}</div>`;
                    row.appendChild(dur);
                    // Botão Terminar: boss pode terminar qualquer um, empregado só o seu próprio
                    if (state.isBoss || isMine) {
                        const endBtn = document.createElement('button');
                        endBtn.className = 'cm-shift-end-btn';
                        endBtn.innerHTML = `${svg('<rect x="6" y="6" width="12" height="12" rx="1"/>', 12)} <span>${escapeHtml(OS.t('cm_btn_end', { _d: 'Terminar' }))}</span>`;
                        endBtn.addEventListener('click', () => doClockOut(s));
                        row.appendChild(endBtn);
                    }
                    list.appendChild(row);
                });
                shiftPanel.appendChild(list);
            }
            mainGrid.appendChild(shiftPanel);

            // PANEL B: Atividade Recente
            const feedPanel = document.createElement('div');
            feedPanel.className = 'cm-panel';
            feedPanel.innerHTML = `
                <div class="cm-panel-head">
                    <div class="cm-panel-title">
                        <span class="cm-panel-title-icon">${ICONS.history}</span>
                        ${escapeHtml(OS.t('cm_panel_recent_activity', { _d: 'Atividade Recente' }))}
                    </div>
                    <div class="cm-panel-action">${escapeHtml(OS.t('cm_count_events', { count: state.history.length, _d: `${state.history.length} eventos` }))}</div>
                </div>`;
            feedPanel.appendChild(buildActivityFeed(state.history.slice(0, 10)));
            mainGrid.appendChild(feedPanel);

            main.appendChild(mainGrid);

            // ===== Painel de baixo: Engajamento da equipa esta semana =====
            const engagePanel = document.createElement('div');
            engagePanel.className = 'cm-panel cm-panel-wide';
            engagePanel.innerHTML = `
                <div class="cm-panel-head">
                    <div class="cm-panel-title">
                        <span class="cm-panel-title-icon">${ICONS.chart}</span>
                        ${escapeHtml(OS.t('cm_panel_team_activity_7d', { _d: 'Atividade da Equipa (últimos 7 dias)' }))}
                    </div>
                    <div class="cm-panel-action">${escapeHtml(OS.t('cm_count_active_employees', { active: workersThisWeek, total: state.employees.length || 0, _d: `${workersThisWeek}/${state.employees.length || 0} empregados ativos` }))}</div>
                </div>`;
            const engageBody = document.createElement('div');
            engageBody.className = 'cm-engage-body';
            engageBody.innerHTML = `
                <div class="cm-engage-bar-wrap">
                    <div class="cm-engage-bar"><div class="cm-engage-bar-fill" style="width:${engagementPct}%"></div></div>
                    <div class="cm-engage-bar-meta">
                        <span class="cm-engage-bar-pct">${engagementPct}%</span>
                        <span class="cm-engage-bar-lbl">${escapeHtml(OS.t('cm_label_engagement', { _d: 'de engajamento' }))}</span>
                    </div>
                </div>
                <div class="cm-engage-stats">
                    <div class="cm-engage-stat">
                        <div class="cm-engage-stat-val">${hoursThisWeek.toFixed(0)}h</div>
                        <div class="cm-engage-stat-lbl">${escapeHtml(OS.t('cm_label_worked', { _d: 'trabalhadas' }))}</div>
                    </div>
                    <div class="cm-engage-stat">
                        <div class="cm-engage-stat-val">${workersThisWeek}</div>
                        <div class="cm-engage-stat-lbl">${escapeHtml(OS.t('cm_label_with_shifts', { _d: 'com turnos' }))}</div>
                    </div>
                    <div class="cm-engage-stat">
                        <div class="cm-engage-stat-val">${state.employees.length ? (hoursThisWeek / state.employees.length).toFixed(1) + 'h' : '0h'}</div>
                        <div class="cm-engage-stat-lbl">${escapeHtml(OS.t('cm_label_avg_per_person', { _d: 'média/pessoa' }))}</div>
                    </div>
                </div>`;
            engagePanel.appendChild(engageBody);
            main.appendChild(engagePanel);
        }

        // ===== Helpers de UI dashboard =====
        function buildStatCard({ icon, iconClass, label, value, trend, sub, spark, sparkColor }) {
            const card = document.createElement('div');
            card.className = 'cm-stat';
            const trendIcon = trend && trend.dir === 'up' ? ICONS.up :
                              trend && trend.dir === 'down' ? ICONS.down : '';
            card.innerHTML = `
                <div class="cm-stat-top">
                    <div class="cm-stat-icon-box ${iconClass}">${icon}</div>
                    ${trend ? `<span class="cm-stat-trend ${trend.dir}">${trendIcon}${trend.pct}</span>` : ''}
                </div>
                <div class="cm-stat-label">${escapeHtml(label)}</div>
                <div class="cm-stat-value">${value}</div>
                ${sub ? `<div class="cm-stat-sub">${escapeHtml(sub)}</div>` : ''}
                <div class="cm-stat-spark">${buildSparkline(spark, sparkColor)}</div>`;
            return card;
        }

        function buildSparkline(type, color) {
            // Pontos pseudo-aleatórios mas determinísticos por tipo
            const patterns = {
                up:    [22, 18, 19, 14, 13, 9,  10, 6,  7,  3],
                down:  [4,  6,  3,  8,  10, 14, 12, 18, 16, 22],
                wave:  [12, 8,  16, 10, 18, 6,  20, 14, 8,  12],
                flat:  [12, 14, 10, 13, 11, 14, 12, 13, 11, 12],
            };
            const pts = patterns[type] || patterns.flat;
            const w = 100, h = 24;
            const stepX = w / (pts.length - 1);
            const path = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${y}`).join(' ');
            const area = path + ` L${w},${h} L0,${h} Z`;
            const id = 'sg' + Math.random().toString(36).substr(2, 6);
            return `<svg viewBox="0 0 ${w} ${h+12}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="${color}" stop-opacity=".35"/>
                        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="${area}" fill="url(#${id})"/>
                <path d="${path}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }

        function buildBigDonut(employees, ranks) {
            const wrap = document.createElement('div');
            wrap.className = 'cm-donut-block';

            const total = employees.length;
            const ranksDesc = [...ranks].sort((a, b) => b.grade - a.grade);

            // Paleta vibrante (cor da empresa + variações)
            const baseColors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#34c759', '#ef4444'];

            const segments = [];
            let acc = 0;
            const items = [];
            ranksDesc.forEach((r, i) => {
                const count = employees.filter(e => Number(e.grade) === Number(r.grade)).length;
                if (count === 0) return;
                const pct = (count / total) * 100;
                const color = baseColors[i % baseColors.length];
                segments.push(`${color} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
                items.push({ rank: r, count, pct, color });
                acc += pct;
            });
            if (segments.length === 0) segments.push('rgba(255,255,255,.06) 0% 100%');

            const donut = document.createElement('div');
            donut.className = 'cm-donut-big';
            donut.style.background = `conic-gradient(${segments.join(', ')})`;
            donut.innerHTML = `<div class="cm-donut-center"><div class="cm-donut-num">${total}</div><div class="cm-donut-sub">${escapeHtml(OS.t('cm_label_employees', { _d: 'Empregados' }))}</div></div>`;
            wrap.appendChild(donut);

            const leg = document.createElement('div');
            leg.className = 'cm-donut-leg';
            items.forEach(it => {
                const row = document.createElement('div');
                row.className = 'cm-donut-leg-item';
                row.innerHTML = `
                    <span class="cm-donut-leg-dot" style="background:${it.color}"></span>
                    <span class="cm-donut-leg-name">${escapeHtml(it.rank.label || it.rank.name)}</span>
                    <span class="cm-donut-leg-bar"><span class="cm-donut-leg-bar-fill" style="width:${it.pct}%;background:${it.color}"></span></span>
                    <span class="cm-donut-leg-value">${it.count}</span>`;
                leg.appendChild(row);
            });
            wrap.appendChild(leg);
            return wrap;
        }

        function buildActivityFeed(events) {
            const wrap = document.createElement('div');
            wrap.className = 'cm-feed';
            if (!events || !events.length) {
                wrap.innerHTML = `<div class="cm-feed-empty">${escapeHtml(OS.t('cm_empty_no_recent_activity_l1', { _d: 'Sem atividade recente.' }))}<br>${escapeHtml(OS.t('cm_empty_no_recent_activity_l2', { _d: 'As tuas ações vão aparecer aqui.' }))}</div>`;
                return wrap;
            }
            const meta = {
                hire:     { color: 'green',  icon: ICONS.plus },
                fire:     { color: 'red',    icon: ICONS.trash },
                promote:  { color: 'blue',   icon: ICONS.up },
                demote:   { color: 'orange', icon: ICONS.down },
                deposit:  { color: 'green',  icon: ICONS.deposit },
                withdraw: { color: 'red',    icon: ICONS.withdraw },
                salary:   { color: 'purple', icon: ICONS.edit },
                clockin:  { color: 'green',  icon: svg('<polygon points="5 3 19 12 5 21 5 3"/>') },
                clockout: { color: 'orange', icon: svg('<rect x="6" y="6" width="12" height="12" rx="1"/>') },
                reset:    { color: 'red',    icon: ICONS.refresh },
            };
            events.forEach(ev => {
                const m = meta[ev.type] || { color: 'blue', icon: ICONS.history };
                const item = document.createElement('div');
                item.className = 'cm-feed-item';
                item.innerHTML = `
                    <div class="cm-feed-icon ${m.color}">${m.icon}</div>
                    <div class="cm-feed-info">
                        <div class="cm-feed-text">${escapeHtml(ev.text)}</div>
                        <div class="cm-feed-time">${escapeHtml(fmtRelative(ev.ts))}</div>
                    </div>`;
                wrap.appendChild(item);
            });
            return wrap;
        }

        // ===== Donut chart (conic-gradient) =====
        function buildDonut(employees, ranks) {
            const wrap = document.createElement('div');
            wrap.className = 'donut-wrap';

            const total = employees.length;
            const ranksDesc = [...ranks].sort((a, b) => b.grade - a.grade);

            // Paleta partindo da cor da empresa (variações de luminosidade)
            const palette = ranksDesc.map((_, i) => {
                const opacity = 1 - (i * 0.12);
                return `color-mix(in srgb, var(--company-accent) ${Math.max(30, opacity*100)}%, transparent)`;
            });

            // Construir conic-gradient
            const segments = [];
            let acc = 0;
            ranksDesc.forEach((r, i) => {
                const count = employees.filter(e => Number(e.grade) === Number(r.grade)).length;
                const pct = (count / total) * 100;
                if (pct > 0) {
                    segments.push(`${palette[i]} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
                    acc += pct;
                }
            });
            if (segments.length === 0) {
                segments.push('rgba(255,255,255,.06) 0% 100%');
            }

            const donut = document.createElement('div');
            donut.className = 'donut';
            donut.style.background = `conic-gradient(${segments.join(', ')})`;
            const center = document.createElement('div');
            center.className = 'donut-center';
            center.innerHTML = `<div class="donut-center-num">${total}</div><div class="donut-center-label">${escapeHtml(OS.t('cm_label_employees_lc', { _d: 'empregados' }))}</div>`;
            donut.appendChild(center);
            wrap.appendChild(donut);

            // Legenda
            const legend = document.createElement('div');
            legend.className = 'donut-legend';
            ranksDesc.forEach((r, i) => {
                const count = employees.filter(e => Number(e.grade) === Number(r.grade)).length;
                if (count === 0) return;
                const item = document.createElement('div');
                item.className = 'donut-legend-item';
                item.innerHTML = `
                    <span class="donut-legend-dot" style="background:${palette[i]}"></span>
                    <span class="donut-legend-name">${escapeHtml(r.label || r.name)}</span>
                    <span class="donut-legend-count">${count}</span>`;
                legend.appendChild(item);
            });
            wrap.appendChild(legend);

            return wrap;
        }

        function renderEmployees() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_team', { _d: 'Equipa' }), ICONS.users));
            const onlineNow = state.employees.filter(e=>e.online).length;
            main.appendChild(muted(OS.t('cm_subtitle_team', { total: state.employees.length, online: onlineNow, _d: `${state.employees.length} colaboradores na DB · ${onlineNow} online agora` })));

            // Toolbar (apenas ações + view toggle)
            const tb = document.createElement('div');
            tb.className = 'toolbar';
            tb.appendChild(toolbarBtn(OS.t('cm_btn_hire_employee', { _d: 'Contratar Empregado' }), 'plus', openHireModal));
            tb.appendChild(toolbarBtn(OS.t('cm_btn_refresh', { _d: 'Atualizar' }), 'refresh', refresh, 'secondary'));

            // View toggle (grid / list)
            const toggle = document.createElement('div');
            toggle.className = 'view-toggle';
            const gridBtn = document.createElement('button');
            gridBtn.title = OS.t('cm_tooltip_view_cards', { _d: 'Vista de cartões' });
            gridBtn.innerHTML = svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>');
            const listBtn = document.createElement('button');
            listBtn.title = OS.t('cm_tooltip_view_table', { _d: 'Vista de tabela' });
            listBtn.innerHTML = svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>');
            toggle.appendChild(gridBtn);
            toggle.appendChild(listBtn);
            tb.appendChild(toggle);
            main.appendChild(tb);

            // Filter bar: chips de status + search polido
            let filterStatus = 'all';
            let searchVal = '';

            const filterBar = document.createElement('div');
            filterBar.className = 'cm-filter-bar';
            const onlineCount = state.employees.filter(e => e.online).length;
            const offlineCount = state.employees.length - onlineCount;
            filterBar.appendChild(filterChips([
                { value: 'all',     label: OS.t('cm_filter_all',     { _d: 'Todos' }),   count: state.employees.length },
                { value: 'online',  label: OS.t('cm_filter_online',  { _d: 'Online' }),  count: onlineCount },
                { value: 'offline', label: OS.t('cm_filter_offline', { _d: 'Offline' }), count: offlineCount },
            ], filterStatus, val => { filterStatus = val; draw(); }));

            const searchEl = searchInput(OS.t('cm_placeholder_search_name', { _d: 'Procurar por nome...' }), val => { searchVal = val; draw(); });
            filterBar.appendChild(searchEl);
            main.appendChild(filterBar);

            const wrap = document.createElement('div');
            main.appendChild(wrap);

            // Persistir preferência de vista
            const VIEW_KEY = 'oxlyn_bm_company_emp_view';
            let currentView = (() => { try { return localStorage.getItem(VIEW_KEY) || 'grid'; } catch (_) { return 'grid'; } })();

            function setView(v) {
                currentView = v;
                try { localStorage.setItem(VIEW_KEY, v); } catch (_) {}
                gridBtn.classList.toggle('active', v === 'grid');
                listBtn.classList.toggle('active', v === 'list');
                draw();
            }
            gridBtn.addEventListener('click', () => setView('grid'));
            listBtn.addEventListener('click', () => setView('list'));

            function draw() {
                const f = (searchVal || '').toLowerCase();
                let list = state.employees;
                if (filterStatus === 'online')  list = list.filter(e => e.online);
                if (filterStatus === 'offline') list = list.filter(e => !e.online);
                if (f) list = list.filter(e => (e.name || '').toLowerCase().includes(f));

                wrap.innerHTML = '';
                if (!list.length) {
                    wrap.appendChild(emptyState(
                        OS.t('cm_empty_no_results', { _d: 'Sem resultados' }),
                        searchVal ? OS.t('cm_empty_no_match_search', { _d: 'Nenhum empregado corresponde à pesquisa.' }) :
                        filterStatus === 'online' ? OS.t('cm_empty_no_online', { _d: 'Não há empregados online.' }) :
                        filterStatus === 'offline' ? OS.t('cm_empty_all_online', { _d: 'Todos estão online! 🎉' }) :
                        OS.t('cm_empty_no_team_yet', { _d: 'Ainda não tens ninguém na equipa. Contrata o primeiro!' }),
                        ICONS.users
                    ));
                    return;
                }
                if (currentView === 'grid') drawGrid(list);
                else drawList(list);
            }

            function drawGrid(list) {
                const maxGrade = Math.max(...state.ranks.map(r => r.grade), 0);
                const grid = document.createElement('div');
                grid.className = 'emp-grid';
                list.forEach(e => {
                    const isBoss = Number(e.grade) === maxGrade;
                    const card = document.createElement('div');
                    card.className = 'emp-card';
                    const head = document.createElement('div');
                    head.className = 'emp-card-head';
                    head.appendChild(buildPedAvatar(e.name || '?', 48));
                    const info = document.createElement('div');
                    info.className = 'emp-card-info';
                    info.innerHTML = `
                        <div class="emp-card-name">${escapeHtml(e.name || '?')}${isBoss ? ' <span class="chip boss" style="font-size:9px;padding:1px 6px">' + escapeHtml(OS.t('cm_chip_boss', { _d: 'BOSS' })) + '</span>' : ''}</div>
                        <div class="emp-card-rank">${escapeHtml(rankByGrade(state.ranks, e.grade))} ${e.online ? '<span class="chip online" style="font-size:10px;padding:1px 7px">' + escapeHtml(OS.t('cm_chip_online', { _d: 'online' })) + '</span>' : '<span class="chip offline" style="font-size:10px;padding:1px 7px">' + escapeHtml(OS.t('cm_chip_offline', { _d: 'offline' })) + '</span>'}</div>`;
                    head.appendChild(info);
                    card.appendChild(head);

                    const stats = document.createElement('div');
                    stats.className = 'emp-card-stats';
                    stats.innerHTML = `
                        <div class="emp-card-stat">
                            <div class="emp-card-stat-label">${escapeHtml(OS.t('cm_label_rank', { _d: 'Patente' }))}</div>
                            <div class="emp-card-stat-value">G${e.grade}</div>
                        </div>
                        <div class="emp-card-stat">
                            <div class="emp-card-stat-label">${escapeHtml(OS.t('cm_label_salary', { _d: 'Salário' }))}</div>
                            <div class="emp-card-stat-value">${fmtMoney(rankSalary(state.ranks, e.grade))}</div>
                        </div>`;
                    card.appendChild(stats);

                    // Action buttons (top-right)
                    const actions = document.createElement('div');
                    actions.className = 'emp-card-actions';
                    const upBtn = document.createElement('button');
                    upBtn.className = 'emp-card-action';
                    upBtn.title = OS.t('cm_btn_promote', { _d: 'Promover' });
                    upBtn.innerHTML = ICONS.up;
                    upBtn.disabled = isBoss;
                    upBtn.addEventListener('click', () => doPromote(e));
                    const downBtn = document.createElement('button');
                    downBtn.className = 'emp-card-action';
                    downBtn.title = OS.t('cm_btn_demote', { _d: 'Despromover' });
                    downBtn.innerHTML = ICONS.down;
                    downBtn.disabled = e.grade === 0 || isBoss;
                    downBtn.addEventListener('click', () => doDemote(e));
                    const fireBtn = document.createElement('button');
                    fireBtn.className = 'emp-card-action danger';
                    fireBtn.title = OS.t('cm_btn_fire', { _d: 'Despedir' });
                    fireBtn.innerHTML = ICONS.trash;
                    fireBtn.disabled = isBoss;
                    fireBtn.addEventListener('click', () => openFireConfirm(e));
                    actions.appendChild(upBtn);
                    actions.appendChild(downBtn);
                    actions.appendChild(fireBtn);
                    card.appendChild(actions);

                    grid.appendChild(card);
                });
                wrap.appendChild(grid);
            }

            function drawList(list) {
                const maxGrade = Math.max(...state.ranks.map(r => r.grade), 0);
                const tbl = document.createElement('table');
                tbl.className = 'company-table';
                tbl.innerHTML = `
                    <thead><tr><th></th><th>${escapeHtml(OS.t('cm_th_name', { _d: 'Nome' }))}</th><th>${escapeHtml(OS.t('cm_th_rank', { _d: 'Patente' }))}</th><th>${escapeHtml(OS.t('cm_th_salary', { _d: 'Salário' }))}</th><th>${escapeHtml(OS.t('cm_th_status', { _d: 'Estado' }))}</th><th style="text-align:right">${escapeHtml(OS.t('cm_th_actions', { _d: 'Ações' }))}</th></tr></thead>
                    <tbody></tbody>`;
                const tbody = tbl.querySelector('tbody');
                list.forEach(e => {
                    const tr = document.createElement('tr');
                    tr.dataset.identifier = e.identifier;
                    const isBoss = Number(e.grade) === maxGrade;
                    tr.innerHTML = `
                        <td style="width:48px"></td>
                        <td>
                            <strong>${escapeHtml(e.name || '?')}</strong>
                            ${isBoss ? ' <span class="chip boss" style="margin-left:6px">' + escapeHtml(OS.t('cm_chip_boss', { _d: 'BOSS' })) + '</span>' : ''}
                        </td>
                        <td>${escapeHtml(rankByGrade(state.ranks, e.grade))} <span style="color:var(--text-3)">· G${e.grade}</span></td>
                        <td>${fmtMoney(rankSalary(state.ranks, e.grade))}</td>
                        <td>${e.online ? '<span class="chip online">' + escapeHtml(OS.t('cm_chip_online', { _d: 'online' })) + '</span>' : '<span class="chip offline">' + escapeHtml(OS.t('cm_chip_offline', { _d: 'offline' })) + '</span>'}</td>
                        <td style="text-align:right">
                            <span class="row-actions">
                                <button class="row-action" data-action="up"   title="${escapeHtml(OS.t('cm_btn_promote', { _d: 'Promover' }))}"    ${isBoss ? 'disabled style="opacity:.3"' : ''}>${ICONS.up}</button>
                                <button class="row-action" data-action="down" title="${escapeHtml(OS.t('cm_btn_demote', { _d: 'Despromover' }))}" ${e.grade === 0 || isBoss ? 'disabled style="opacity:.3"' : ''}>${ICONS.down}</button>
                                <button class="row-action danger" data-action="fire" title="${escapeHtml(OS.t('cm_btn_fire', { _d: 'Despedir' }))}" ${isBoss ? 'disabled style="opacity:.3"' : ''}>${ICONS.trash}</button>
                            </span>
                        </td>`;
                    tr.firstElementChild.appendChild(buildPedAvatar(e.name || '?', 36));
                    tbody.appendChild(tr);
                });
                wrap.appendChild(tbl);

                tbl.addEventListener('click', e => {
                    const btn = e.target.closest('[data-action]');
                    if (!btn || btn.disabled) return;
                    const tr = btn.closest('tr');
                    const emp = state.employees.find(x => x.identifier === tr.dataset.identifier);
                    if (!emp) return;
                    if (btn.dataset.action === 'up')   doPromote(emp);
                    if (btn.dataset.action === 'down') doDemote(emp);
                    if (btn.dataset.action === 'fire') openFireConfirm(emp);
                });
            }

            setView(currentView);
        }

        // ==========================================
        // FOLHA DE PONTO — Clock-In / Out (server-side, com permissões)
        // Boss vê todos. Empregado vê e mexe APENAS no seu próprio turno.
        // ==========================================
        function renderTimesheet() {
            main.innerHTML = '';
            const clockIcon = svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>');
            main.appendChild(h1(OS.t('cm_title_timesheet', { _d: 'Folha de Ponto' }), clockIcon));
            main.appendChild(muted(state.isBoss
                ? OS.t('cm_subtitle_timesheet_boss', { _d: 'Vê e gere os turnos de toda a equipa. Os turnos são partilhados em todos os PCs da empresa.' })
                : OS.t('cm_subtitle_timesheet_emp', { _d: 'Aqui podes registar a tua entrada e saída do turno. Só vês os teus próprios turnos.' })));

            // Toolbar — só boss vê exportar/limpar
            const tb = document.createElement('div');
            tb.className = 'toolbar';
            tb.appendChild(toolbarBtn(OS.t('cm_btn_refresh', { _d: 'Atualizar' }), 'refresh', refresh, 'secondary'));
            if (state.isBoss) {
                const exportBtn = document.createElement('button');
                exportBtn.className = 'toolbar-btn secondary';
                exportBtn.innerHTML = svg('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>') + ' <span>' + escapeHtml(OS.t('cm_btn_export_csv', { _d: 'Exportar CSV' })) + '</span>';
                exportBtn.addEventListener('click', exportTimesheet);
                tb.appendChild(exportBtn);
                const clearBtn = document.createElement('button');
                clearBtn.className = 'toolbar-btn secondary';
                clearBtn.style.marginLeft = 'auto';
                clearBtn.innerHTML = ICONS.trash + ' <span>' + escapeHtml(OS.t('cm_btn_clear_history', { _d: 'Limpar Histórico' })) + '</span>';
                clearBtn.addEventListener('click', confirmClearTimesheet);
                tb.appendChild(clearBtn);
            }
            main.appendChild(tb);

            // KPIs — boss vê totais da empresa, empregado vê os seus
            const totalSecsToday = workedSecsLastHours(state.timesheet, 24);
            const totalSecsWeek  = workedSecsLastHours(state.timesheet, 168);
            const totalShifts    = state.timesheet.length;
            const onShift = state.timesheet.filter(s => !s.out_time).length;

            const kpis = document.createElement('div');
            kpis.className = 'cm-payroll-stats';
            kpis.innerHTML = `
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(state.isBoss ? OS.t('cm_kpi_on_shift_now', { _d: 'Em Turno Agora' }) : OS.t('cm_kpi_status', { _d: 'Estado' }))}</div>
                    <div class="cm-payroll-card-value" style="color:${onShift>0?'#34c759':'var(--text-3)'}">
                        ${state.isBoss ? onShift : escapeHtml(onShift > 0 ? OS.t('cm_label_on_duty', { _d: 'Em Serviço' }) : OS.t('cm_label_off_duty', { _d: 'Fora' }))}
                    </div>
                    <div class="cm-payroll-card-sub">${escapeHtml(state.isBoss ? (onShift === 1 ? OS.t('cm_label_person', { _d: 'pessoa' }) : OS.t('cm_label_people', { _d: 'pessoas' })) : OS.t('cm_label_current_shift', { _d: 'turno atual' }))}</div>
                </div>
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(OS.t('cm_kpi_today', { _d: 'Hoje' }))}</div>
                    <div class="cm-payroll-card-value">${(totalSecsToday/3600).toFixed(1)}h</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(state.isBoss ? OS.t('cm_label_total_worked', { _d: 'total trabalhado' }) : OS.t('cm_label_you_worked', { _d: 'tu trabalhaste' }))}</div>
                </div>
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(OS.t('cm_kpi_this_week', { _d: 'Esta Semana' }))}</div>
                    <div class="cm-payroll-card-value">${(totalSecsWeek/3600).toFixed(1)}h</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(OS.t('cm_label_last_7_days', { _d: 'últimos 7 dias' }))}</div>
                </div>
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(state.isBoss ? OS.t('cm_kpi_total_shifts', { _d: 'Turnos Totais' }) : OS.t('cm_kpi_my_shifts', { _d: 'Os Meus Turnos' }))}</div>
                    <div class="cm-payroll-card-value">${totalShifts}</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(OS.t('cm_label_in_history', { _d: 'no histórico' }))}</div>
                </div>`;
            main.appendChild(kpis);

            // ====== Iniciar Turno ======
            // Empregado: cartão grande "Iniciar/Terminar Meu Turno"
            // Boss: picker com todos os empregados
            const startPanel = document.createElement('div');
            startPanel.className = 'cm-panel';
            startPanel.innerHTML = `
                <div class="cm-panel-head">
                    <div class="cm-panel-title">
                        <span class="cm-panel-title-icon">${svg('<path d="M5 3l14 9-14 9V3z"/>')}</span>
                        ${escapeHtml(state.isBoss ? OS.t('cm_panel_start_end_shift', { _d: 'Iniciar/Terminar Turno' }) : OS.t('cm_panel_clock_punch', { _d: 'Marcar Ponto' }))}
                    </div>
                </div>`;

            if (!state.isBoss) {
                // Vista do empregado: card grande com toggle do seu próprio turno
                const myOpen = getOpenShiftFor(state.timesheet, state.myIdentifier);
                const big = document.createElement('div');
                big.className = 'cm-clock-bigcard ' + (myOpen ? 'on-shift' : 'off-shift');
                if (myOpen) {
                    const elapsed = shiftElapsedSecs(myOpen);
                    big.innerHTML = `
                        <div class="cm-clock-bigcard-state">
                            <div class="cm-clock-bigcard-dot"></div>
                            <span>${escapeHtml(OS.t('cm_label_on_duty_for', { _d: 'Em serviço há' }))}</span>
                        </div>
                        <div class="cm-clock-bigcard-time">${fmtDuration(elapsed)}</div>
                        <div class="cm-clock-bigcard-meta">${escapeHtml(OS.t('cm_label_you_entered_at', { time: fmtTime(myOpen.in_time), _d: `Entraste às ${fmtTime(myOpen.in_time)}` }))}</div>
                        <button class="cm-clock-bigcard-btn end">
                            ${svg('<rect x="6" y="6" width="12" height="12" rx="1"/>', 16)}
                            <span>${escapeHtml(OS.t('cm_btn_end_shift', { _d: 'Terminar Turno' }))}</span>
                        </button>`;
                    big.querySelector('button').addEventListener('click', () => doClockOut(myOpen));
                } else {
                    big.innerHTML = `
                        <div class="cm-clock-bigcard-state">
                            <div class="cm-clock-bigcard-dot off"></div>
                            <span>${escapeHtml(OS.t('cm_label_off_duty_full', { _d: 'Fora de serviço' }))}</span>
                        </div>
                        <div class="cm-clock-bigcard-time">--:--</div>
                        <div class="cm-clock-bigcard-meta">${escapeHtml(OS.t('cm_label_no_open_shift', { _d: 'Sem turno aberto' }))}</div>
                        <button class="cm-clock-bigcard-btn start">
                            ${svg('<polygon points="5 3 19 12 5 21 5 3"/>', 16)}
                            <span>${escapeHtml(OS.t('cm_btn_start_shift', { _d: 'Iniciar Turno' }))}</span>
                        </button>`;
                    big.querySelector('button').addEventListener('click', () => doClockIn(state.myIdentifier));
                }
                startPanel.appendChild(big);
            } else {
                // Vista boss: picker com todos
                const startBody = document.createElement('div');
                startBody.className = 'cm-clock-picker';
                if (!state.employees.length) {
                    startBody.innerHTML = `<p class="muted" style="margin:14px 0 4px">${escapeHtml(OS.t('cm_empty_no_team_members', { _d: 'Sem empregados na equipa.' }))}</p>`;
                } else {
                    state.employees.forEach(emp => {
                        const open = getOpenShiftFor(state.timesheet, emp.identifier);
                        const tile = document.createElement('button');
                        tile.className = 'cm-clock-tile' + (open ? ' on-shift' : '');
                        tile.appendChild(buildPedAvatar(emp.name, 32));
                        const txt = document.createElement('div');
                        txt.className = 'cm-clock-tile-info';
                        if (open) {
                            const elapsed = shiftElapsedSecs(open);
                            txt.innerHTML = `
                                <div class="cm-clock-tile-name">${escapeHtml(emp.name)}</div>
                                <div class="cm-clock-tile-meta">${escapeHtml(OS.t('cm_label_on_shift', { _d: 'Em turno' }))} · ${fmtDuration(elapsed)}</div>`;
                        } else {
                            txt.innerHTML = `
                                <div class="cm-clock-tile-name">${escapeHtml(emp.name)}</div>
                                <div class="cm-clock-tile-meta">${escapeHtml(rankByGrade(state.ranks, emp.grade))}</div>`;
                        }
                        tile.appendChild(txt);
                        const action = document.createElement('span');
                        action.className = 'cm-clock-tile-action';
                        action.innerHTML = open
                            ? svg('<rect x="6" y="6" width="12" height="12" rx="1"/>', 14)
                            : svg('<polygon points="5 3 19 12 5 21 5 3"/>', 14);
                        tile.appendChild(action);
                        tile.addEventListener('click', () => {
                            if (open) doClockOut(open);
                            else      doClockIn(emp.identifier);
                        });
                        startBody.appendChild(tile);
                    });
                }
                startPanel.appendChild(startBody);
            }
            main.appendChild(startPanel);

            // ====== Histórico ======
            const hist = document.createElement('div');
            hist.className = 'cm-panel';
            hist.innerHTML = `
                <div class="cm-panel-head">
                    <div class="cm-panel-title">
                        <span class="cm-panel-title-icon">${ICONS.history}</span>
                        ${escapeHtml(state.isBoss ? OS.t('cm_panel_shift_history', { _d: 'Histórico de Turnos' }) : OS.t('cm_panel_my_shifts', { _d: 'Os Meus Turnos' }))}
                    </div>
                    <div class="cm-panel-action">${escapeHtml(OS.t('cm_count_shifts', { count: totalShifts, _d: `${totalShifts} ${totalShifts === 1 ? 'turno' : 'turnos'}` }))}</div>
                </div>`;

            const allShifts = [...state.timesheet].sort((a, b) => shiftInTimeMs(b) - shiftInTimeMs(a));

            if (allShifts.length === 0) {
                hist.appendChild(emptyState(
                    OS.t('cm_empty_no_shifts', { _d: 'Sem turnos registados' }),
                    state.isBoss
                        ? OS.t('cm_empty_no_shifts_boss', { _d: 'Quando os empregados começarem a registar entradas, aparecem aqui.' })
                        : OS.t('cm_empty_no_shifts_emp', { _d: 'Marca o teu primeiro ponto acima e o histórico começa a ficar visível aqui.' }),
                    clockIcon
                ));
            } else {
                const tbl = document.createElement('table');
                tbl.className = 'company-table';
                const cols = state.isBoss
                    ? `<th>${escapeHtml(OS.t('cm_th_employee', { _d: 'Empregado' }))}</th><th>${escapeHtml(OS.t('cm_th_rank', { _d: 'Patente' }))}</th><th>${escapeHtml(OS.t('cm_th_day', { _d: 'Dia' }))}</th><th>${escapeHtml(OS.t('cm_th_in', { _d: 'Entrada' }))}</th><th>${escapeHtml(OS.t('cm_th_out', { _d: 'Saída' }))}</th><th>${escapeHtml(OS.t('cm_th_duration', { _d: 'Duração' }))}</th><th></th>`
                    : `<th>${escapeHtml(OS.t('cm_th_day', { _d: 'Dia' }))}</th><th>${escapeHtml(OS.t('cm_th_in', { _d: 'Entrada' }))}</th><th>${escapeHtml(OS.t('cm_th_out', { _d: 'Saída' }))}</th><th>${escapeHtml(OS.t('cm_th_duration', { _d: 'Duração' }))}</th><th></th>`;
                tbl.innerHTML = `<thead><tr>${cols}</tr></thead><tbody></tbody>`;
                const tb = tbl.querySelector('tbody');
                allShifts.slice(0, 100).forEach(s => {
                    const isOpen = !s.out_time;
                    const elapsed = shiftElapsedSecs(s);
                    const isMine = s.identifier === state.myIdentifier;
                    const canEnd = isOpen && (state.isBoss || isMine);
                    const tr = document.createElement('tr');
                    const cells = [];
                    if (state.isBoss) {
                        cells.push(`<td><strong>${escapeHtml(s.name)}</strong>${isMine ? ' <span class="cm-pill-me">' + escapeHtml(OS.t('cm_pill_me', { _d: 'EU' })) + '</span>' : ''}</td>`);
                        cells.push(`<td><span style="color:var(--text-3)">${escapeHtml(rankByGrade(state.ranks, s.grade))}</span></td>`);
                    }
                    cells.push(`<td><span style="color:var(--text-2)">${fmtDay(s.in_time)}</span></td>`);
                    cells.push(`<td><span style="font-feature-settings:'tnum' 1">${fmtTime(s.in_time)}</span></td>`);
                    cells.push(`<td>${isOpen ? `<span class="chip success" style="font-size:10px">${escapeHtml(OS.t('cm_chip_in_progress', { _d: 'EM CURSO' }))}</span>` : `<span style="font-feature-settings:'tnum' 1">${fmtTime(s.out_time)}</span>`}</td>`);
                    cells.push(`<td><strong>${fmtDuration(elapsed)}</strong></td>`);
                    cells.push(`<td style="text-align:right">${canEnd ? `<button class="row-action danger" data-shift-id="${s.id}" title="${escapeHtml(OS.t('cm_tooltip_end_shift', { _d: 'Terminar turno' }))}">${svg('<rect x="6" y="6" width="12" height="12" rx="1"/>')}</button>` : ''}</td>`);
                    tr.innerHTML = cells.join('');
                    tb.appendChild(tr);
                });
                hist.appendChild(tbl);

                hist.addEventListener('click', e => {
                    const btn = e.target.closest('[data-shift-id]');
                    if (!btn) return;
                    const id = Number(btn.dataset.shiftId);
                    const s = state.timesheet.find(x => x.id === id);
                    if (s) doClockOut(s);
                });
            }
            main.appendChild(hist);
        }

        function exportTimesheet() {
            const rows = [[
                OS.t('cm_csv_employee',   { _d: 'Empregado' }),
                OS.t('cm_csv_identifier', { _d: 'Identifier' }),
                OS.t('cm_csv_grade',      { _d: 'Grade' }),
                OS.t('cm_csv_date',       { _d: 'Data' }),
                OS.t('cm_csv_in',         { _d: 'Entrada' }),
                OS.t('cm_csv_out',        { _d: 'Saida' }),
                OS.t('cm_csv_duration_s', { _d: 'Duracao (s)' }),
                OS.t('cm_csv_duration',   { _d: 'Duracao' }),
            ]];
            state.timesheet.forEach(s => {
                const inDate = new Date(String(s.in_time).replace(' ', 'T'));
                rows.push([
                    s.name,
                    s.identifier,
                    s.grade,
                    inDate.toISOString().split('T')[0],
                    fmtTime(s.in_time),
                    s.out_time ? fmtTime(s.out_time) : '',
                    s.secs || '',
                    s.secs ? fmtDuration(s.secs) : OS.t('cm_label_in_progress_lc', { _d: 'em curso' }),
                ]);
            });
            const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `folha-de-ponto-${state.companyId}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
            notify({ type: 'success', title: OS.t('cm_notify_export_done_title', { _d: 'Exportação concluída' }), message: OS.t('cm_notify_export_done_msg', { _d: 'Folha de Ponto descarregada em CSV.' }) });
        }

        function confirmClearTimesheet() {
            if (!window.OS || !window.OS.api || !window.OS.api.showModal) return;
            window.OS.api.showModal({
                title: OS.t('cm_modal_clear_history_title', { _d: 'Limpar Histórico de Turnos?' }),
                subtitle: OS.t('cm_modal_clear_history_sub', { _d: 'Esta ação remove TODOS os turnos registados na DB desta empresa. Não é reversível.' }),
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_clear', { _d: 'Limpar' }), style: 'danger', onClick: async () => {
                        const res = await nuiCall('clearTimesheet');
                        if (res && res.ok) {
                            logEvent('reset', OS.t('cm_log_timesheet_cleared', { _d: 'Folha de Ponto limpa' }));
                            notify({ type: 'info', title: OS.t('cm_notify_history_cleared_title', { _d: 'Histórico limpo' }), message: OS.t('cm_notify_history_cleared_msg', { _d: 'Todos os turnos foram removidos.' }) });
                            refresh();
                        } else {
                            notify({ type: 'error', title: OS.t('cm_notify_error', { _d: 'Erro' }), message: OS.t('cm_err_clear_failed', { _d: 'Não foi possível limpar.' }) });
                        }
                    }},
                ],
            });
        }

        // Guarda as permissões da empresa no servidor
        async function savePermissions(newSettings) {
            state.settings = newSettings;
            const res = await nuiCall('setCompanySettings', { settings: newSettings });
            if (res && res.ok) {
                notify({ type: 'success', title: OS.t('cm_notify_perms_updated_title', { _d: 'Permissões atualizadas' }), message: OS.t('cm_notify_perms_updated_msg', { _d: 'Os empregados autorizados podem agora abrir o PC.' }) });
            } else {
                notify({ type: 'error', title: OS.t('cm_notify_error', { _d: 'Erro' }), message: OS.t('cm_err_save_failed', { _d: 'Não foi possível guardar.' }) });
                // Recarrega settings do server para reverter UI
                refresh();
            }
        }

        // ===== PATENTES — Organograma + gestão completa (CRUD) =====
        function renderRanks() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_ranks', { _d: 'Patentes' }), ICONS.tree));
            main.appendChild(muted(OS.t('cm_subtitle_ranks', { _d: 'Estrutura organizacional sincronizada com job_grades. Cria, edita ou elimina patentes — afeta todos os empregados desta empresa.' })));

            // Toolbar com Adicionar Patente
            const tb = document.createElement('div');
            tb.className = 'toolbar';
            tb.appendChild(toolbarBtn(OS.t('cm_btn_add_rank', { _d: 'Adicionar Patente' }), 'plus', openAddRankModal));
            tb.appendChild(toolbarBtn(OS.t('cm_btn_refresh', { _d: 'Atualizar' }), 'refresh', refresh, 'secondary'));
            main.appendChild(tb);

            const ranksDesc = [...state.ranks].sort((a, b) => b.grade - a.grade);

            // Organograma piramidal
            const pyramid = document.createElement('div');
            pyramid.className = 'cm-pyramid';
            ranksDesc.forEach((r, idx) => {
                const members = state.employees.filter(e => Number(e.grade) === Number(r.grade));
                const isBoss = idx === 0;
                const row = document.createElement('div');
                row.className = 'cm-pyramid-row' + (isBoss ? ' boss' : '');
                row.dataset.level = String(idx);
                row.innerHTML = `
                    <div class="cm-pyramid-rank-num">${r.grade}</div>
                    <div class="cm-pyramid-rank-info">
                        <div class="cm-pyramid-rank-name">${escapeHtml(r.label || r.name)}</div>
                        <div class="cm-pyramid-rank-meta">${escapeHtml(OS.t('cm_count_members', { count: members.length, _d: `${members.length} ${members.length === 1 ? 'membro' : 'membros'}` }))} · ${fmtMoney(r.salary)}</div>
                    </div>
                    <div class="cm-pyramid-rank-members"></div>`;
                const memWrap = row.querySelector('.cm-pyramid-rank-members');
                if (!members.length) {
                    memWrap.innerHTML = '<span class="cm-pyramid-rank-empty">' + escapeHtml(OS.t('cm_empty_rank_empty', { _d: 'vazio' })) + '</span>';
                } else {
                    members.slice(0, 5).forEach(m => memWrap.appendChild(buildPedAvatar(m.name || '?', 28)));
                    if (members.length > 5) {
                        const more = document.createElement('div');
                        more.style.cssText = 'width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-left:-8px;border:2px solid #1c1c20;color:var(--text-2)';
                        more.textContent = '+' + (members.length - 5);
                        memWrap.appendChild(more);
                    }
                }
                pyramid.appendChild(row);
            });
            main.appendChild(pyramid);

            // Tabela editável de patentes
            main.appendChild(h2(OS.t('cm_title_edit_ranks', { _d: 'Editar Patentes' }), ICONS.cog));
            const sub = muted(OS.t('cm_subtitle_edit_ranks', { _d: 'Clica no ícone de edição para alterar o salário da patente (atualiza job_grades).' }));
            sub.style.fontSize = '12px';
            main.appendChild(sub);

            const tbl = document.createElement('div');
            tbl.style.marginTop = '10px';
            const bossGrades = (companyInfo && companyInfo.bossGrades || []).map(Number);
            const maxGrade = Math.max(...ranksDesc.map(r => r.grade), 0);

            ranksDesc.forEach((r, idx) => {
                const members  = state.employees.filter(e => Number(e.grade) === Number(r.grade));
                const isBoss   = bossGrades.includes(Number(r.grade)) || Number(r.grade) === maxGrade;
                const canDelete = !isBoss && members.length === 0;

                const row = document.createElement('div');
                row.className = 'cm-rank-row';
                const delTitle = canDelete
                    ? OS.t('cm_tooltip_delete_rank', { _d: 'Eliminar patente' })
                    : (isBoss
                        ? OS.t('cm_tooltip_cant_delete_boss', { _d: 'Não é possível eliminar patente Boss' })
                        : OS.t('cm_tooltip_rank_has_members', { count: members.length, _d: `${members.length} ${members.length === 1 ? 'membro' : 'membros'} — despede primeiro` }));
                row.innerHTML = `
                    <div class="cm-rank-row-grade">${r.grade}</div>
                    <div>
                        <div class="cm-rank-row-name">${escapeHtml(r.label || r.name)}${isBoss ? ' <span class="chip boss" style="margin-left:6px;font-size:9px;padding:1px 6px">' + escapeHtml(OS.t('cm_chip_boss', { _d: 'BOSS' })) + '</span>' : ''}</div>
                        <div class="cm-rank-row-name-sub">${escapeHtml(r.name)}</div>
                    </div>
                    <div>
                        <div class="cm-rank-row-salary">${fmtMoney(r.salary)}</div>
                        <div class="cm-rank-row-salary-sub">${escapeHtml(OS.t('cm_label_per_payment', { _d: 'por pagamento' }))}</div>
                    </div>
                    <div>
                        <div class="cm-rank-row-members">${members.length}</div>
                        <div class="cm-rank-row-members-sub">${escapeHtml(OS.t('cm_label_members', { _d: 'membros' }))}</div>
                    </div>
                    <div class="cm-rank-row-actions">
                        <button class="row-action" data-act="rename" title="${escapeHtml(OS.t('cm_tooltip_rename_rank', { _d: 'Renomear patente' }))}">${svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>')}</button>
                        <button class="row-action" data-act="salary" title="${escapeHtml(OS.t('cm_tooltip_edit_salary', { _d: 'Editar salário' }))}">${ICONS.money}</button>
                        <button class="row-action danger" data-act="delete" title="${escapeHtml(delTitle)}" ${canDelete ? '' : 'disabled style="opacity:.3"'}>${ICONS.trash}</button>
                    </div>`;
                row.querySelector('[data-act="rename"]').addEventListener('click', () => openRenameRankModal(r));
                row.querySelector('[data-act="salary"]').addEventListener('click', () => openSalaryModal(r));
                if (canDelete) {
                    row.querySelector('[data-act="delete"]').addEventListener('click', () => confirmDeleteRank(r));
                }
                tbl.appendChild(row);
            });
            main.appendChild(tbl);
        }

        // ---------- Modais de gestão de patentes ----------
        function openAddRankModal() {
            // Sugere próximo grade livre
            const usedGrades = new Set(state.ranks.map(r => Number(r.grade)));
            let suggested = 0;
            while (usedGrades.has(suggested)) suggested++;

            const body = document.createElement('div');
            body.className = 'modal-form';
            body.appendChild(field(OS.t('cm_label_rank_name', { _d: 'Nome da Patente' }), 'label', { placeholder: OS.t('cm_placeholder_rank_name', { _d: 'Ex: Officer, Manager, Stagiaire...' }) }));
            body.appendChild(field(OS.t('cm_label_grade_number', { _d: 'Grade (número)' }), 'grade', { type: 'number', value: String(suggested), min: 0 }));
            body.appendChild(field(OS.t('cm_label_salary_per_payment', { _d: 'Salário (€ por pagamento)' }), 'salary', { type: 'number', value: '0', min: 0 }));

            window.OS.api.showModal({
                title: OS.t('cm_modal_add_rank_title', { _d: 'Adicionar Patente' }),
                subtitle: OS.t('cm_modal_add_rank_sub', { _d: 'Cria uma nova patente para esta empresa. Sincroniza com job_grades.' }),
                body,
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_create', { _d: 'Criar' }), style: 'primary', onClick: async ({ body }) => {
                        const label  = (getField(body, 'label') || '').trim();
                        const grade  = parseInt(getField(body, 'grade'), 10);
                        const salary = parseInt(getField(body, 'salary'), 10);
                        if (!label) { notify({ type: 'warning', title: OS.t('cm_notify_name_required_title', { _d: 'Nome obrigatório' }), message: OS.t('cm_notify_name_required_msg', { _d: 'Indica um nome para a patente.' }) }); return false; }
                        if (isNaN(grade) || grade < 0) { notify({ type: 'warning', title: OS.t('cm_notify_invalid_grade_title', { _d: 'Grade inválido' }), message: OS.t('cm_notify_invalid_grade_msg', { _d: 'Tem de ser um número ≥ 0.' }) }); return false; }
                        if (isNaN(salary) || salary < 0) { notify({ type: 'warning', title: OS.t('cm_notify_invalid_salary_title', { _d: 'Salário inválido' }), message: OS.t('cm_notify_invalid_salary_msg', { _d: 'Tem de ser um número ≥ 0.' }) }); return false; }
                        if (state.ranks.some(r => Number(r.grade) === grade)) {
                            notify({ type: 'error', title: OS.t('cm_notify_grade_exists_title', { _d: 'Grade já existe' }), message: OS.t('cm_notify_grade_exists_msg', { grade, _d: `Já existe uma patente com grade ${grade}.` }) });
                            return false;
                        }
                        const res = await nuiCall('addRank', { label, grade, salary });
                        if (res && res.ok) {
                            logEvent('hire', OS.t('cm_log_rank_created', { label, grade, salary: fmtMoney(salary), _d: `Nova patente "${label}" (G${grade}) criada com salário ${fmtMoney(salary)}` }));
                            notify({ type: 'success', title: OS.t('cm_notify_rank_created_title', { _d: 'Patente criada' }), message: `${label} (G${grade}) — ${fmtMoney(salary)}` });
                            await refresh();
                        } else {
                            const errMap = {
                                grade_exists: OS.t('cm_err_grade_exists', { _d: 'Já existe uma patente com esse grade.' }),
                                invalid:      OS.t('cm_err_invalid_data', { _d: 'Dados inválidos.' }),
                            };
                            notify({ type: 'error', title: OS.t('cm_notify_error', { _d: 'Erro' }), message: errMap[res && res.error] || OS.t('cm_err_create_rank_failed', { _d: 'Não foi possível criar a patente.' }) });
                        }
                    }},
                ],
            });
        }

        function openRenameRankModal(rank) {
            const body = document.createElement('div');
            body.className = 'modal-form';
            body.appendChild(field(OS.t('cm_label_new_name', { _d: 'Novo nome' }), 'label', { value: rank.label || rank.name }));

            window.OS.api.showModal({
                title: OS.t('cm_modal_rename_rank_title', { name: rank.label || rank.name, _d: `Renomear "${rank.label || rank.name}"` }),
                subtitle: OS.t('cm_modal_rename_rank_sub', { grade: rank.grade, _d: `Altera o nome visível da patente G${rank.grade}. O ID interno mantém-se.` }),
                body,
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_save', { _d: 'Guardar' }), style: 'primary', onClick: async ({ body }) => {
                        const newLabel = (getField(body, 'label') || '').trim();
                        if (!newLabel) { notify({ type: 'warning', title: OS.t('cm_notify_empty_name_title', { _d: 'Nome vazio' }), message: OS.t('cm_notify_empty_name_msg', { _d: 'Indica um nome.' }) }); return false; }
                        if (newLabel === (rank.label || rank.name)) return; // sem mudança
                        const res = await nuiCall('updateRankLabel', { grade: rank.grade, label: newLabel });
                        if (res && res.ok) {
                            logEvent('promote', OS.t('cm_log_rank_renamed', { from: rank.label || rank.name, to: newLabel, _d: `Patente "${rank.label || rank.name}" renomeada para "${newLabel}"` }));
                            notify({ type: 'success', title: OS.t('cm_notify_rank_renamed_title', { _d: 'Patente renomeada' }), message: `${rank.label || rank.name} → ${newLabel}` });
                            await refresh();
                        } else {
                            notify({ type: 'error', title: OS.t('cm_notify_error', { _d: 'Erro' }), message: OS.t('cm_err_rename_failed', { _d: 'Não foi possível renomear.' }) });
                        }
                    }},
                ],
            });
        }

        function confirmDeleteRank(rank) {
            window.OS.api.showModal({
                title: OS.t('cm_modal_delete_rank_title', { name: rank.label || rank.name, _d: `Eliminar "${rank.label || rank.name}"?` }),
                subtitle: OS.t('cm_modal_delete_rank_sub', { grade: rank.grade, _d: `A patente G${rank.grade} será removida da empresa. Esta acção não é reversível.` }),
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_delete', { _d: 'Eliminar' }), style: 'danger', onClick: async () => {
                        const res = await nuiCall('deleteRank', { grade: rank.grade });
                        if (res && res.ok) {
                            logEvent('fire', OS.t('cm_log_rank_deleted', { name: rank.label || rank.name, grade: rank.grade, _d: `Patente "${rank.label || rank.name}" (G${rank.grade}) eliminada` }));
                            notify({ type: 'info', title: OS.t('cm_notify_rank_deleted_title', { _d: 'Patente eliminada' }), message: rank.label || rank.name });
                            await refresh();
                        } else {
                            const count = res && res.count || '?';
                            const errMap = {
                                is_boss_grade: OS.t('cm_err_cant_delete_boss', { _d: 'Não podes eliminar a patente Boss.' }),
                                has_members:   OS.t('cm_err_rank_has_members', { count, _d: `Esta patente ainda tem ${count} empregados. Despede-os primeiro.` }),
                                invalid:       OS.t('cm_err_invalid_data', { _d: 'Dados inválidos.' }),
                            };
                            notify({ type: 'error', title: OS.t('cm_notify_delete_failed_title', { _d: 'Não foi possível eliminar' }), message: errMap[res && res.error] || OS.t('cm_err_unknown', { _d: 'Erro desconhecido.' }) });
                        }
                    }},
                ],
            });
        }

        // ===== SALÁRIOS — Payroll dashboard + bónus =====
        function renderSalaries() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_salaries', { _d: 'Salários & Bónus' }), ICONS.wallet));
            main.appendChild(muted(OS.t('cm_subtitle_salaries', { _d: 'Gere a folha salarial e atribui bónus únicos. Bónus saem do saldo da empresa.' })));

            const totalPayroll = state.employees.reduce((s, e) => s + rankSalary(state.ranks, e.grade), 0);
            const avgSalary = state.employees.length ? Math.round(totalPayroll / state.employees.length) : 0;
            const salaries = state.employees.map(e => rankSalary(state.ranks, e.grade));
            const maxSal = salaries.length ? Math.max(...salaries) : 0;
            const minSal = salaries.length ? Math.min(...salaries) : 0;

            // 4 stat cards
            const stats = document.createElement('div');
            stats.className = 'cm-payroll-stats';
            stats.innerHTML = `
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(OS.t('cm_kpi_monthly_payroll', { _d: 'Folha Mensal' }))}</div>
                    <div class="cm-payroll-card-value">${fmtMoney(totalPayroll * 4)}</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(OS.t('cm_kpi_monthly_payroll_sub', { _d: 'Estimativa (4 pagamentos/mês)' }))}</div>
                </div>
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(OS.t('cm_kpi_avg_salary', { _d: 'Salário Médio' }))}</div>
                    <div class="cm-payroll-card-value">${fmtMoney(avgSalary)}</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(OS.t('cm_kpi_per_payment', { _d: 'Por pagamento' }))}</div>
                </div>
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(OS.t('cm_kpi_highest', { _d: 'Mais Alto' }))}</div>
                    <div class="cm-payroll-card-value" style="color:#34c759">${fmtMoney(maxSal)}</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(OS.t('cm_kpi_top_rank', { _d: 'Patente do topo' }))}</div>
                </div>
                <div class="cm-payroll-card">
                    <div class="cm-payroll-card-label">${escapeHtml(OS.t('cm_kpi_lowest', { _d: 'Mais Baixo' }))}</div>
                    <div class="cm-payroll-card-value" style="color:#ff9f0a">${fmtMoney(minSal)}</div>
                    <div class="cm-payroll-card-sub">${escapeHtml(OS.t('cm_kpi_base_rank', { _d: 'Patente da base' }))}</div>
                </div>`;
            main.appendChild(stats);

            // Distribuição salarial por patente (bars)
            main.appendChild(h2(OS.t('cm_title_distribution_by_rank', { _d: 'Distribuição por Patente' }), ICONS.chart));
            const ranksDesc = [...state.ranks].sort((a, b) => b.grade - a.grade);
            const maxRankSal = Math.max(...state.ranks.map(r => r.salary), 1);
            const bars = document.createElement('div');
            bars.className = 'cm-salary-bars';
            bars.style.cssText = 'background:rgba(255,255,255,.04);border-radius:14px;padding:18px 22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);margin-bottom:18px';
            ranksDesc.forEach(r => {
                const row = document.createElement('div');
                row.className = 'cm-salary-bar-row';
                row.innerHTML = `
                    <div class="cm-salary-bar-name">${escapeHtml(r.label || r.name)}</div>
                    <div class="cm-salary-bar-track"><div class="cm-salary-bar-fill" style="width:${(r.salary/maxRankSal)*100}%"></div></div>
                    <div class="cm-salary-bar-value">${fmtMoney(r.salary)}</div>`;
                bars.appendChild(row);
            });
            main.appendChild(bars);

            // Tabela de empregados com bónus
            main.appendChild(h2(OS.t('cm_label_employees', { _d: 'Empregados' }), ICONS.users));
            if (!state.employees.length) {
                main.appendChild(emptyState(OS.t('cm_empty_no_employees', { _d: 'Sem empregados' }), OS.t('cm_empty_no_employees_payroll', { _d: 'Contrata empregados para gerir os seus pagamentos.' }), ICONS.users));
                return;
            }

            const tbl = document.createElement('table');
            tbl.className = 'cm-payroll-table';
            tbl.innerHTML = `
                <thead>
                    <tr><th>${escapeHtml(OS.t('cm_th_employee', { _d: 'Empregado' }))}</th><th>${escapeHtml(OS.t('cm_th_rank', { _d: 'Patente' }))}</th><th>${escapeHtml(OS.t('cm_th_salary', { _d: 'Salário' }))}</th><th></th></tr>
                </thead>
                <tbody></tbody>`;
            const tbody = tbl.querySelector('tbody');
            state.employees.forEach(e => {
                const tr = document.createElement('tr');
                const salary = rankSalary(state.ranks, e.grade);
                tr.innerHTML = `
                    <td>
                        <div class="cm-payroll-emp-info">
                            <div></div>
                            <div class="cm-payroll-emp-info-text">
                                <div class="cm-payroll-emp-info-name">${escapeHtml(e.name || '?')}${e.online ? ' <span class="chip online" style="font-size:9px;padding:1px 6px;margin-left:4px">' + escapeHtml(OS.t('cm_chip_online', { _d: 'online' })) + '</span>' : ''}</div>
                                <div class="cm-payroll-emp-info-rank">G${e.grade}</div>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(rankByGrade(state.ranks, e.grade))}</td>
                    <td><strong>${fmtMoney(salary)}</strong></td>
                    <td></td>`;
                // Avatar
                tr.querySelector('.cm-payroll-emp-info > div:first-child').appendChild(buildPedAvatar(e.name || '?', 36));
                // Botão bónus
                const td = tr.querySelector('td:last-child');
                const btn = document.createElement('button');
                btn.className = 'cm-bonus-btn';
                btn.innerHTML = ICONS.plus + ' ' + escapeHtml(OS.t('cm_btn_bonus', { _d: 'Bónus' }));
                btn.addEventListener('click', () => openBonusModal(e));
                td.appendChild(btn);

                tbody.appendChild(tr);
            });
            main.appendChild(tbl);
        }

        function openBonusModal(emp) {
            const body = document.createElement('div');
            body.appendChild(field(OS.t('cm_label_employee', { _d: 'Empregado' }), 'who', { value: emp.name + ' · ' + rankByGrade(state.ranks, emp.grade), disabled: true }));
            body.appendChild(field(OS.t('cm_label_bonus_amount', { _d: 'Montante do Bónus (€)' }), 'amount', { type: 'number', value: 500, min: 1 }));
            body.appendChild(field(OS.t('cm_label_reason_optional', { _d: 'Razão (opcional)' }), 'reason', { placeholder: OS.t('cm_placeholder_bonus_reason', { _d: 'Ex: bom desempenho' }) }));
            const note = document.createElement('p');
            note.className = 'muted';
            note.style.cssText = 'font-size:11.5px;margin-top:6px';
            note.textContent = OS.t('cm_note_bonus', { balance: fmtMoney(state.balance), _d: `Saldo da empresa atual: ${fmtMoney(state.balance)}. O valor sai do society e entra no banco do jogador.` });
            body.appendChild(note);

            window.OS.api.showModal({
                title: OS.t('cm_modal_pay_bonus_title', { _d: 'Pagar Bónus' }),
                subtitle: OS.t('cm_modal_pay_bonus_sub', { name: emp.name, _d: `${emp.name} vai receber este montante do saldo da empresa.` }),
                body,
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_pay_bonus', { _d: 'Pagar Bónus' }), style: 'primary', onClick: async ({ body }) => {
                        const amount = parseInt(getField(body, 'amount'), 10) || 0;
                        const reason = getField(body, 'reason').trim();
                        if (amount <= 0) return false;
                        const res = await nuiCall('payBonus', { identifier: emp.identifier, amount });
                        if (res && res.ok) {
                            const txt = reason
                                ? OS.t('cm_log_bonus_with_reason', { amount: fmtMoney(amount), name: emp.name, reason, _d: `Bónus de ${fmtMoney(amount)} pago a ${emp.name} (${reason})` })
                                : OS.t('cm_log_bonus', { amount: fmtMoney(amount), name: emp.name, _d: `Bónus de ${fmtMoney(amount)} pago a ${emp.name}` });
                            logEvent('salary', txt);
                            notify({ type: 'success', title: OS.t('cm_notify_bonus_paid_title', { _d: 'Bónus pago' }), message: OS.t('cm_notify_bonus_paid_msg', { name: emp.name, amount: fmtMoney(amount), _d: `${emp.name} recebeu ${fmtMoney(amount)}.` }) });
                            await refresh();
                        } else {
                            const map = {
                                insufficient_society: OS.t('cm_err_insufficient_society', { _d: 'A empresa não tem fundos suficientes.' }),
                                invalid_amount:       OS.t('cm_err_invalid_amount', { _d: 'Montante inválido.' }),
                                not_member:           OS.t('cm_err_not_member', { _d: 'Este jogador já não é da empresa.' }),
                                no_access:            OS.t('cm_err_no_access', { _d: 'Sem permissão.' }),
                            };
                            notify({ type: 'error', title: OS.t('cm_notify_bonus_failed_title', { _d: 'Bónus falhou' }), message: (res && map[res.error]) || OS.t('cm_err_bonus_failed', { _d: 'Não foi possível pagar o bónus.' }) });
                            return false;
                        }
                    }},
                ],
            });
        }

        // ===== ANÚNCIOS — Comunicar com a equipa =====
        function renderAnnounce() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_announce', { _d: 'Anúncios' }), svg('<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/>')));
            main.appendChild(muted(OS.t('cm_subtitle_announce', { _d: 'Envia mensagens à tua equipa. Os anúncios ficam guardados aqui no sistema.' })));

            // Compose
            const compose = document.createElement('div');
            compose.className = 'cm-announce-compose';
            const ta = document.createElement('textarea');
            ta.className = 'cm-announce-textarea';
            ta.placeholder = OS.t('cm_placeholder_announce', { _d: 'Escreve um anúncio para a tua equipa...' });
            compose.appendChild(ta);

            const actions = document.createElement('div');
            actions.className = 'cm-announce-actions';

            // Dropdown custom estilizado (em vez do <select> nativo branco)
            const targetIcons = {
                all:    svg('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
                online: svg('<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>'),
                rank:   svg('<path d="M12 3v18M5 21h14M5 8h14M9 14h6"/>'),
            };
            const targetOptions = [
                { value: 'all',    label: OS.t('cm_target_whole_team',   { _d: 'Toda a Equipa' }),  icon: targetIcons.all    },
                { value: 'online', label: OS.t('cm_target_online_only',  { _d: 'Apenas Online' }),  icon: targetIcons.online },
                ...state.ranks.map(r => ({
                    value: 'grade:' + r.grade,
                    label: r.label || r.name,
                    sub:   OS.t('cm_label_rank_grade_n', { grade: r.grade, _d: `Patente G${r.grade}` }),
                    icon:  targetIcons.rank,
                })),
            ];
            let selectedTarget = targetOptions[0];

            const targetBtn = document.createElement('button');
            targetBtn.className = 'cm-announce-target-btn';
            function renderTargetBtn() {
                targetBtn.innerHTML = `
                    <span class="cm-announce-target-icon">${selectedTarget.icon}</span>
                    <span class="cm-announce-target-label">
                        <span class="cm-announce-target-cap">${escapeHtml(OS.t('cm_label_audience', { _d: 'Audiência' }))}</span>
                        <span class="cm-announce-target-val">${escapeHtml(selectedTarget.label)}</span>
                    </span>
                    <span class="cm-announce-target-chev">${svg('<polyline points="6 9 12 15 18 9"/>', 12)}</span>`;
            }
            renderTargetBtn();
            targetBtn.addEventListener('click', () => {
                if (!window.OS || !window.OS.api || !window.OS.api.showFloatingMenu) return;
                const items = targetOptions.map(opt => ({
                    label: opt.label,
                    icon:  opt.icon,
                    onClick: () => {
                        selectedTarget = opt;
                        renderTargetBtn();
                    },
                }));
                window.OS.api.showFloatingMenu(targetBtn, items);
            });
            actions.appendChild(targetBtn);

            const sendBtn = document.createElement('button');
            sendBtn.className = 'toolbar-btn';
            sendBtn.innerHTML = ICONS.plus + ' <span>' + escapeHtml(OS.t('cm_btn_publish_announcement', { _d: 'Publicar Anúncio' })) + '</span>';
            sendBtn.addEventListener('click', () => {
                const text = ta.value.trim();
                if (!text) {
                    notify({ type: 'warning', title: OS.t('cm_notify_empty_announce_title', { _d: 'Anúncio vazio' }), message: OS.t('cm_notify_empty_announce_msg', { _d: 'Escreve algo antes de publicar.' }) });
                    return;
                }
                const targetVal = selectedTarget.value;
                const targetLabel = selectedTarget.label;
                const ann = {
                    id: Date.now(),
                    ts: new Date().toISOString(),
                    author: (config.playerName || OS.t('cm_label_boss', { _d: 'Patrão' })),
                    text,
                    target: targetVal,
                    targetLabel,
                };
                const key = 'oxlyn_bm_announce_' + state.companyId;
                let list = [];
                try { list = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
                list.unshift(ann);
                try { localStorage.setItem(key, JSON.stringify(list.slice(0, 50))); } catch (_) {}
                ta.value = '';
                notify({ type: 'success', title: OS.t('cm_notify_announce_published_title', { _d: 'Anúncio publicado' }), message: OS.t('cm_notify_announce_published_msg', { target: targetLabel, _d: `Enviado para: ${targetLabel}` }) });
                renderAnnounce();
            });
            actions.appendChild(sendBtn);
            compose.appendChild(actions);
            main.appendChild(compose);

            // Lista
            main.appendChild(h2(OS.t('cm_title_announce_history', { _d: 'Histórico de Anúncios' }), ICONS.history));
            let list = [];
            try { list = JSON.parse(localStorage.getItem('oxlyn_bm_announce_' + state.companyId)) || []; } catch (_) {}
            if (!list.length) {
                main.appendChild(emptyState(OS.t('cm_empty_no_announce', { _d: 'Sem anúncios' }), OS.t('cm_empty_no_announce_msg', { _d: 'Publica o primeiro anúncio para a tua equipa.' }), svg('<path d="M3 11l18-5v12L3 14v-3z"/>')));
                return;
            }
            const wrap = document.createElement('div');
            wrap.className = 'cm-announce-list';
            list.forEach(ann => {
                const item = document.createElement('div');
                item.className = 'cm-announce-item';
                item.innerHTML = `
                    <div class="cm-announce-head">
                        <span class="cm-announce-author">${escapeHtml(ann.author)}</span>
                        <span class="cm-announce-time">${escapeHtml(fmtRelative(ann.ts))}</span>
                    </div>
                    <div class="cm-announce-body">${escapeHtml(ann.text)}</div>
                    <span class="cm-announce-target-badge">${escapeHtml(ann.targetLabel)}</span>`;
                wrap.appendChild(item);
            });
            main.appendChild(wrap);
        }

        function renderFinance() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_finance', { _d: 'Finanças' }), ICONS.money));
            main.appendChild(muted(OS.t('cm_subtitle_finance', { _d: 'Saldo da empresa, estimativa de gastos mensais e movimentos registados.' })));

            // Toolbar
            const tb = document.createElement('div');
            tb.className = 'toolbar';
            tb.appendChild(toolbarBtn(OS.t('cm_btn_deposit', { _d: 'Depositar' }),  'deposit',  () => openMoneyModal('deposit')));
            tb.appendChild(toolbarBtn(OS.t('cm_btn_withdraw', { _d: 'Levantar' }),  'withdraw', () => openMoneyModal('withdraw'), 'secondary'));
            tb.appendChild(toolbarBtn(OS.t('cm_btn_refresh', { _d: 'Atualizar' }),  'refresh',  refresh, 'secondary'));
            main.appendChild(tb);

            // ===== Cálculos =====
            const moneyEvents = state.history.filter(h =>
                h.type === 'deposit' || h.type === 'withdraw' || h.type === 'salary');
            const inEvents  = moneyEvents.filter(e => e.type === 'deposit');
            const outEvents = moneyEvents.filter(e => e.type === 'withdraw' || e.type === 'salary');
            const amountFrom = (text) => {
                const m = String(text || '').match(/(\d[\d\s.,]*)/);
                if (!m) return 0;
                return parseInt(String(m[1]).replace(/[^\d]/g, ''), 10) || 0;
            };
            const totalIn  = inEvents.reduce((s, e) => s + amountFrom(e.text), 0);
            const totalOut = outEvents.reduce((s, e) => s + amountFrom(e.text), 0);
            const net = totalIn - totalOut;

            // Salários
            const weeklyPayroll  = state.employees.reduce((s, e) => s + rankSalary(state.ranks, e.grade), 0);
            // ESX por defeito paga semanalmente — o mensal é ~4.33 semanas
            const monthlyPayroll = Math.round(weeklyPayroll * 4.33);
            const yearlyPayroll  = weeklyPayroll * 52;

            // Runway (em meses) = saldo / gasto mensal
            const runwayMonths = monthlyPayroll > 0 ? state.balance / monthlyPayroll : Infinity;
            const runwayLabel = !isFinite(runwayMonths) ? '∞' :
                                runwayMonths < 1 ? OS.t('cm_runway_days', { n: (runwayMonths * 30).toFixed(0), _d: `${(runwayMonths * 30).toFixed(0)} dias` }) :
                                runwayMonths < 12 ? OS.t('cm_runway_months', { n: runwayMonths.toFixed(1), _d: `${runwayMonths.toFixed(1)} meses` }) :
                                OS.t('cm_runway_years', { n: (runwayMonths / 12).toFixed(1), _d: `${(runwayMonths / 12).toFixed(1)} anos` });
            const runwayColor = !isFinite(runwayMonths) ? '#34c759' :
                                runwayMonths < 1 ? '#ff453a' :
                                runwayMonths < 3 ? '#ff9f0a' : '#34c759';

            // ===== HERO único: saldo + 4 KPIs integrados (compacto) =====
            const hero = document.createElement('div');
            hero.className = 'cm-finance-hero-v2';
            const trendTxt = OS.t('cm_label_balance_recorded_trend', { _d: 'de saldo registado' });
            hero.innerHTML = `
                <div class="cm-finance-balance">
                    <div class="cm-finance-balance-label">${escapeHtml(OS.t('cm_label_company_balance', { _d: 'Saldo da Empresa' }))}</div>
                    <div class="cm-finance-balance-value">${fmtMoney(state.balance)}</div>
                    <div class="cm-finance-balance-meta">
                        <span class="cm-finance-balance-trend">
                            ${net >= 0
                                ? `<span style="color:#34c759">↑ +${fmtMoney(Math.abs(net))}</span> ${escapeHtml(trendTxt)}`
                                : `<span style="color:#ff453a">↓ -${fmtMoney(Math.abs(net))}</span> ${escapeHtml(trendTxt)}`}
                        </span>
                    </div>
                </div>
                <div class="cm-finance-kpis">
                    <div class="cm-finance-kpi">
                        <div class="cm-finance-kpi-icon" style="background:rgba(14,165,233,.16);color:#0ea5e9">${svg('<path d="M3 12l2-2 4 4 8-8 4 4"/>', 16)}</div>
                        <div class="cm-finance-kpi-val">${fmtMoney(weeklyPayroll)}</div>
                        <div class="cm-finance-kpi-lbl">${escapeHtml(OS.t('cm_kpi_weekly_payroll', { _d: 'Folha Semanal' }))}</div>
                    </div>
                    <div class="cm-finance-kpi highlight">
                        <div class="cm-finance-kpi-icon" style="background:rgba(255,159,10,.18);color:#ff9f0a">${ICONS.money}</div>
                        <div class="cm-finance-kpi-val" style="color:#ff9f0a">${fmtMoney(monthlyPayroll)}</div>
                        <div class="cm-finance-kpi-lbl">${escapeHtml(OS.t('cm_kpi_monthly_payroll_est', { _d: 'Folha Mensal estimada' }))}</div>
                    </div>
                    <div class="cm-finance-kpi">
                        <div class="cm-finance-kpi-icon" style="background:rgba(168,85,247,.16);color:#a855f7">${svg('<path d="M21 21H3M3 21V3M7 17l4-4 4 4 6-6"/>', 16)}</div>
                        <div class="cm-finance-kpi-val">${fmtMoney(yearlyPayroll)}</div>
                        <div class="cm-finance-kpi-lbl">${escapeHtml(OS.t('cm_kpi_yearly_payroll', { _d: 'Folha Anual' }))}</div>
                    </div>
                    <div class="cm-finance-kpi">
                        <div class="cm-finance-kpi-icon" style="background:color-mix(in srgb, ${runwayColor} 18%, transparent);color:${runwayColor}">${svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', 16)}</div>
                        <div class="cm-finance-kpi-val" style="color:${runwayColor}">${runwayLabel}</div>
                        <div class="cm-finance-kpi-lbl">${escapeHtml(OS.t('cm_kpi_runway', { _d: 'Runway com saldo atual' }))}</div>
                    </div>
                </div>`;
            main.appendChild(hero);

            // ===== Painel único: Evolução do Saldo (full width) =====
            const chartPanel = document.createElement('div');
            chartPanel.className = 'cm-panel';
            chartPanel.innerHTML = `
                <div class="cm-panel-head">
                    <div class="cm-panel-title">
                        <span class="cm-panel-title-icon">${ICONS.chart}</span>
                        ${escapeHtml(OS.t('cm_panel_balance_evolution', { _d: 'Evolução do Saldo' }))}
                    </div>
                    <div class="cm-finance-mini-stats">
                        <span class="cm-mini-pill in">↓ ${fmtMoney(totalIn)} ${escapeHtml(OS.t('cm_label_inflow', { _d: 'entradas' }))}</span>
                        <span class="cm-mini-pill out">↑ ${fmtMoney(totalOut)} ${escapeHtml(OS.t('cm_label_outflow', { _d: 'saídas' }))}</span>
                        <span class="cm-mini-pill net" style="color:${net >= 0 ? '#34c759' : '#ff453a'}">${net >= 0 ? '+' : ''}${fmtMoney(net)} ${escapeHtml(OS.t('cm_label_net', { _d: 'líquido' }))}</span>
                    </div>
                </div>`;
            chartPanel.appendChild(buildBalanceLineChart(moneyEvents, state.balance));
            main.appendChild(chartPanel);

            // Filtros + tabela de movimentos
            main.appendChild(h2(OS.t('cm_title_movement_history', { _d: 'Histórico de Movimentos' }), ICONS.history));

            let filterCat = 'all';
            const filterBar = document.createElement('div');
            filterBar.className = 'cm-filter-bar';
            const counts = moneyEvents.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {});
            const opts = [
                { value: 'all',      label: OS.t('cm_filter_all_things',  { _d: 'Tudo' }),          count: moneyEvents.length },
                { value: 'deposit',  label: OS.t('cm_filter_deposits',    { _d: 'Depósitos' }),     count: counts.deposit || 0 },
                { value: 'withdraw', label: OS.t('cm_filter_withdrawals', { _d: 'Levantamentos' }), count: counts.withdraw || 0 },
                { value: 'salary',   label: OS.t('cm_filter_salaries',    { _d: 'Salários' }),      count: counts.salary || 0 },
            ];
            filterBar.appendChild(filterChips(opts, filterCat, val => {
                filterCat = val;
                drawTable();
            }));
            main.appendChild(filterBar);

            const tableWrap = document.createElement('div');
            main.appendChild(tableWrap);

            function drawTable() {
                const list = moneyEvents.filter(e => filterCat === 'all' || e.type === filterCat);
                tableWrap.innerHTML = '';
                if (!list.length) {
                    tableWrap.appendChild(emptyState(
                        OS.t('cm_empty_no_movements', { _d: 'Sem movimentos' }),
                        OS.t('cm_empty_no_movements_msg', { _d: 'Faz um depósito ou levantamento para registar atividade.' }),
                        ICONS.money
                    ));
                    return;
                }
                const labelMap = {
                    deposit:  OS.t('cm_type_deposit',         { _d: 'Depósito' }),
                    withdraw: OS.t('cm_type_withdrawal',      { _d: 'Levantamento' }),
                    salary:   OS.t('cm_type_salary_or_bonus', { _d: 'Salário/Bónus' }),
                };
                const tbl = document.createElement('table');
                tbl.className = 'company-table';
                tbl.innerHTML = `
                    <thead><tr><th>${escapeHtml(OS.t('cm_th_when', { _d: 'Quando' }))}</th><th>${escapeHtml(OS.t('cm_th_type', { _d: 'Tipo' }))}</th><th>${escapeHtml(OS.t('cm_th_description', { _d: 'Descrição' }))}</th><th style="text-align:right">${escapeHtml(OS.t('cm_th_amount', { _d: 'Montante' }))}</th></tr></thead>
                    <tbody>
                        ${list.slice(0, 50).map(m => {
                            const amt = amountFrom(m.text);
                            const isIn = m.type === 'deposit';
                            const chipClass = isIn ? 'success' : (m.type === 'salary' ? 'warning' : 'danger');
                            return `
                                <tr>
                                    <td>${escapeHtml(fmtRelative(m.ts))}</td>
                                    <td><span class="chip ${chipClass}">${labelMap[m.type] || m.type}</span></td>
                                    <td>${escapeHtml(m.text)}</td>
                                    <td style="text-align:right;color:${isIn ? '#34c759' : '#ff453a'};font-weight:700;font-feature-settings:'tnum' 1">
                                        ${isIn ? '+' : '-'}${fmtMoney(amt)}
                                    </td>
                                </tr>`;
                        }).join('')}
                    </tbody>`;
                tableWrap.appendChild(tbl);
            }
            drawTable();
        }

        // Line chart de evolução do saldo (SVG simples)
        function buildBalanceLineChart(events, currentBalance) {
            const wrap = document.createElement('div');
            wrap.className = 'cm-line-chart';

            // Reconstruir histórico de saldo a partir dos eventos (do mais antigo para o mais recente)
            const sorted = [...events].sort((a, b) => new Date(a.ts) - new Date(b.ts));
            const amountFrom = (text) => {
                const m = String(text || '').match(/(\d[\d\s.,]*)/);
                if (!m) return 0;
                return parseInt(String(m[1]).replace(/[^\d]/g, ''), 10) || 0;
            };
            // Calcular saldo "antes" de cada evento, partindo do atual e indo para trás
            let bal = currentBalance;
            const points = [{ ts: Date.now(), bal }];
            for (let i = sorted.length - 1; i >= 0; i--) {
                const ev = sorted[i];
                const amt = amountFrom(ev.text);
                if (ev.type === 'deposit')      bal -= amt;
                else if (ev.type === 'withdraw' || ev.type === 'salary') bal += amt;
                points.unshift({ ts: new Date(ev.ts).getTime(), bal });
            }
            // Limitar aos últimos 30 pontos para não ficar denso
            const pts = points.slice(-30);
            if (pts.length < 2) {
                pts.unshift({ ts: pts[0].ts - 86400000, bal: pts[0].bal });
            }

            const w = 600, h = 200, padX = 10, padY = 20;
            const minBal = Math.min(...pts.map(p => p.bal));
            const maxBal = Math.max(...pts.map(p => p.bal));
            const range = Math.max(1, maxBal - minBal);
            const stepX = (w - padX*2) / (pts.length - 1);

            const coords = pts.map((p, i) => ({
                x: padX + i * stepX,
                y: padY + (h - padY*2) * (1 - (p.bal - minBal) / range),
                bal: p.bal,
            }));

            // Path com curvas suaves (Catmull-Rom-ish via Bezier simples)
            const linePath = coords.reduce((acc, c, i) => {
                if (i === 0) return `M${c.x.toFixed(1)},${c.y.toFixed(1)}`;
                const prev = coords[i-1];
                const cx1 = prev.x + (c.x - prev.x) / 2;
                const cx2 = c.x - (c.x - prev.x) / 2;
                return `${acc} C${cx1.toFixed(1)},${prev.y.toFixed(1)} ${cx2.toFixed(1)},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
            }, '');
            const areaPath = linePath + ` L${coords[coords.length-1].x.toFixed(1)},${h} L${coords[0].x.toFixed(1)},${h} Z`;

            const accent = window.getComputedStyle(wrap).getPropertyValue('--company-accent').trim() || '#0ea5e9';
            const id = 'lc' + Math.random().toString(36).substr(2, 6);

            wrap.innerHTML = `
                <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="${id}-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stop-color="${accent}" stop-opacity=".40"/>
                            <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    <!-- Grid horizontal -->
                    ${[0.25, 0.5, 0.75].map(p => `<line x1="${padX}" y1="${(padY + (h - padY*2)*p).toFixed(1)}" x2="${w - padX}" y2="${(padY + (h - padY*2)*p).toFixed(1)}" stroke="rgba(255,255,255,.04)" stroke-width="1" stroke-dasharray="2 4"/>`).join('')}
                    <!-- Área preenchida -->
                    <path d="${areaPath}" fill="url(#${id}-area)"/>
                    <!-- Linha -->
                    <path d="${linePath}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <!-- Ponto final destacado -->
                    <circle cx="${coords[coords.length-1].x.toFixed(1)}" cy="${coords[coords.length-1].y.toFixed(1)}" r="5" fill="${accent}"/>
                    <circle cx="${coords[coords.length-1].x.toFixed(1)}" cy="${coords[coords.length-1].y.toFixed(1)}" r="9" fill="${accent}" opacity=".25"/>
                </svg>`;
            return wrap;
        }

        function renderHistory() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_history', { _d: 'Histórico' }), ICONS.history));
            main.appendChild(muted(OS.t('cm_subtitle_history', { _d: 'Linha cronológica das tuas ações. Filtra por categoria ou pesquisa.' })));

            if (!state.history.length) {
                main.appendChild(emptyState(
                    OS.t('cm_empty_no_events', { _d: 'Sem eventos registados' }),
                    OS.t('cm_empty_no_events_msg', { _d: 'Contrata, despede, promove ou movimenta dinheiro para começares a ver atividade aqui.' }),
                    ICONS.history
                ));
                return;
            }

            // ===== Filter bar =====
            const filterBar = document.createElement('div');
            filterBar.className = 'cm-filter-bar';

            // State local de filtros
            let activeType = 'all';
            let searchQuery = '';

            const counts = state.history.reduce((acc, ev) => {
                acc[ev.type] = (acc[ev.type] || 0) + 1;
                return acc;
            }, {});
            const filterOpts = [
                { value: 'all',     label: OS.t('cm_filter_all_things',  { _d: 'Tudo' }),         count: state.history.length },
                { value: 'hire',    label: OS.t('cm_filter_hires',       { _d: 'Contratações' }), count: counts.hire || 0 },
                { value: 'fire',    label: OS.t('cm_filter_fires',       { _d: 'Despedimentos' }),count: counts.fire || 0 },
                { value: 'promote', label: OS.t('cm_filter_promotions',  { _d: 'Promoções' }),    count: counts.promote || 0 },
                { value: 'demote',  label: OS.t('cm_filter_demotions',   { _d: 'Despromoções' }), count: counts.demote || 0 },
                { value: 'money',   label: OS.t('cm_filter_money',       { _d: 'Dinheiro' }),     count: (counts.deposit||0) + (counts.withdraw||0) + (counts.salary||0) },
            ].filter(o => o.value === 'all' || o.count > 0);

            const chips = filterChips(filterOpts, activeType, val => {
                activeType = val;
                draw();
            });
            filterBar.appendChild(chips);

            const search = searchInput(OS.t('cm_placeholder_search_history', { _d: 'Procurar no histórico...' }), val => {
                searchQuery = val.toLowerCase().trim();
                draw();
            });
            filterBar.appendChild(search);
            main.appendChild(filterBar);

            // Container que vai re-renderizar
            const wrap = document.createElement('div');
            wrap.className = 'cm-history-wrap';
            main.appendChild(wrap);

            const typeMeta = {
                hire:    { color: 'green',  icon: ICONS.plus,     label: OS.t('cm_type_hire',       { _d: 'Contratação' }) },
                fire:    { color: 'red',    icon: ICONS.trash,    label: OS.t('cm_type_fire',       { _d: 'Despedimento' }) },
                promote: { color: 'blue',   icon: ICONS.up,       label: OS.t('cm_type_promote',    { _d: 'Promoção' }) },
                demote:  { color: 'orange', icon: ICONS.down,     label: OS.t('cm_type_demote',     { _d: 'Despromoção' }) },
                deposit: { color: 'green',  icon: ICONS.deposit,  label: OS.t('cm_type_deposit',    { _d: 'Depósito' }) },
                withdraw:{ color: 'red',    icon: ICONS.withdraw, label: OS.t('cm_type_withdrawal', { _d: 'Levantamento' }) },
                salary:  { color: 'purple', icon: ICONS.edit,     label: OS.t('cm_type_salary',     { _d: 'Salário' }) },
            };

            function draw() {
                wrap.innerHTML = '';
                const filtered = state.history.filter(ev => {
                    if (activeType !== 'all') {
                        if (activeType === 'money') {
                            if (!['deposit','withdraw','salary'].includes(ev.type)) return false;
                        } else if (ev.type !== activeType) return false;
                    }
                    if (searchQuery && !ev.text.toLowerCase().includes(searchQuery)) return false;
                    return true;
                });

                if (!filtered.length) {
                    wrap.appendChild(emptyState(OS.t('cm_empty_no_results', { _d: 'Sem resultados' }), OS.t('cm_empty_no_results_filter', { _d: 'Ajusta os filtros para ver mais eventos.' }), ICONS.history));
                    return;
                }

                // Agrupar por dia
                const groups = {};
                filtered.forEach(ev => {
                    const d = new Date(ev.ts);
                    const key = d.toDateString();
                    (groups[key] = groups[key] || []).push(ev);
                });

                Object.entries(groups).forEach(([key, evs]) => {
                    const day = document.createElement('div');
                    day.className = 'cm-history-day';
                    const d = new Date(key);
                    const today = new Date();
                    const isToday = d.toDateString() === today.toDateString();
                    const isYesterday = d.toDateString() === new Date(today.getTime() - 86400000).toDateString();
                    const label = isToday ? OS.t('cm_day_today_uc', { _d: 'HOJE' }) : isYesterday ? OS.t('cm_day_yesterday_uc', { _d: 'ONTEM' }) :
                        d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

                    day.innerHTML = `
                        <div class="cm-history-day-header">
                            <span class="cm-history-day-label">${label}</span>
                            <span class="cm-history-day-count">${escapeHtml(OS.t('cm_count_events_pl', { count: evs.length, _d: `${evs.length} ${evs.length === 1 ? 'evento' : 'eventos'}` }))}</span>
                        </div>
                        <div class="cm-history-events"></div>`;
                    const events = day.querySelector('.cm-history-events');
                    evs.forEach(ev => {
                        const meta = typeMeta[ev.type] || { color: 'blue', icon: ICONS.history };
                        const item = document.createElement('div');
                        item.className = 'cm-history-event';
                        item.innerHTML = `
                            <div class="cm-history-event-icon cm-feed-icon ${meta.color}">${meta.icon}</div>
                            <div class="cm-history-event-info">
                                <div class="cm-history-event-text">${escapeHtml(ev.text)}</div>
                                <div class="cm-history-event-time">${fmtRelative(ev.ts)}</div>
                            </div>`;
                        events.appendChild(item);
                    });
                    wrap.appendChild(day);
                });
            }
            draw();
        }

        function renderSettings() {
            main.innerHTML = '';
            main.appendChild(h1(OS.t('cm_title_settings', { _d: 'Definições' }), ICONS.cog));
            main.appendChild(muted(OS.t('cm_subtitle_settings', { _d: 'Configuração e personalização da empresa.' })));

            const grid = document.createElement('div');
            grid.className = 'cm-settings-grid';

            // ===== Card 1: Identidade =====
            const cardId = settingsCard(OS.t('cm_card_identity', { _d: 'Identidade' }), OS.t('cm_card_identity_sub', { _d: 'Informação da empresa' }), ICONS.building);
            const idRows = document.createElement('div');
            idRows.className = 'cm-settings-card-body';
            [
                { label: OS.t('cm_label_name',         { _d: 'Nome' }),         value: state.companyName, edit: true, action: () => openEditNameModal && openEditNameModal() },
                { label: OS.t('cm_label_short_name',   { _d: 'Sigla' }),        value: (companyInfo && companyInfo.shortName) || '—' },
                { label: OS.t('cm_label_brand_color',  { _d: 'Cor da Marca' }), value: '', custom: () => {
                    const sw = document.createElement('div');
                    sw.style.cssText = `width:60px;height:22px;border-radius:5px;background:${(companyInfo && companyInfo.color) || 'transparent'};box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)`;
                    return sw;
                }},
            ].forEach(r => idRows.appendChild(buildSettingsRow(r)));
            cardId.appendChild(idRows);
            grid.appendChild(cardId);

            // ===== Card 2: Integração ESX =====
            const cardESX = settingsCard(OS.t('cm_card_esx_integration', { _d: 'Integração ESX' }), OS.t('cm_card_esx_integration_sub', { _d: 'Configuração técnica do framework' }), svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'));
            const esxRows = document.createElement('div');
            esxRows.className = 'cm-settings-card-body';
            [
                { label: 'Job',         mono: true, value: companyInfo ? companyInfo.job : '—' },
                { label: OS.t('cm_label_boss_grade', { _d: 'Boss Grade' }),  value: companyInfo && companyInfo.bossGrades ? companyInfo.bossGrades.join(', ') : '—' },
                { label: 'Society',     mono: true, value: 'society_' + (companyInfo ? companyInfo.job : '—') },
                { label: OS.t('cm_label_ranks', { _d: 'Patentes' }),    value: OS.t('cm_count_ranks_defined', { count: state.ranks.length, _d: `${state.ranks.length} definidas` }) },
            ].forEach(r => esxRows.appendChild(buildSettingsRow(r)));
            cardESX.appendChild(esxRows);
            grid.appendChild(cardESX);

            // ===== Card 3: Estatísticas =====
            const cardStats = settingsCard(OS.t('cm_card_statistics', { _d: 'Estatísticas' }), OS.t('cm_card_statistics_sub', { _d: 'Resumo da empresa' }), ICONS.chart);
            const stRows = document.createElement('div');
            stRows.className = 'cm-settings-card-body';
            const totalSal = state.employees.reduce((s, e) => s + rankSalary(state.ranks, e.grade), 0);
            [
                { label: OS.t('cm_label_employees',         { _d: 'Empregados' }),     value: state.employees.length },
                { label: OS.t('cm_label_online_now',        { _d: 'Online agora' }),   value: state.employees.filter(e => e.online).length, valueColor: '#34c759' },
                { label: OS.t('cm_label_payroll_per_pay',   { _d: 'Folha por pgto' }), value: fmtMoney(totalSal) },
                { label: OS.t('cm_label_society_balance',   { _d: 'Saldo society' }),  value: fmtMoney(state.balance), valueColor: state.balance > 0 ? '#34c759' : '#ff453a' },
            ].forEach(r => stRows.appendChild(buildSettingsRow(r)));
            cardStats.appendChild(stRows);
            grid.appendChild(cardStats);

            // ===== Card 4: Permissões (informativo) =====
            const cardPerm = settingsCard(OS.t('cm_card_boss_perms', { _d: 'Permissões de Boss' }), OS.t('cm_card_boss_perms_sub', { _d: 'Ações restritas à patente de Boss' }), svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'));
            const permRows = document.createElement('div');
            permRows.className = 'cm-settings-card-body';
            [
                { label: OS.t('cm_btn_hire',          { _d: 'Contratar' }),           toggleStatic: true, on: true,  badge: 'Boss' },
                { label: OS.t('cm_btn_fire',          { _d: 'Despedir' }),            toggleStatic: true, on: true,  badge: 'Boss' },
                { label: OS.t('cm_perm_promote_demote', { _d: 'Promover/Despromover' }), toggleStatic: true, on: true,  badge: 'Boss' },
                { label: OS.t('cm_perm_edit_salaries', { _d: 'Editar salários' }),     toggleStatic: true, on: true,  badge: 'Boss' },
                { label: OS.t('cm_perm_pay_bonus',    { _d: 'Pagar bónus' }),         toggleStatic: true, on: true,  badge: 'Boss' },
                { label: OS.t('cm_perm_move_money',   { _d: 'Movimentar dinheiro' }), toggleStatic: true, on: true,  badge: 'Boss' },
            ].forEach(r => permRows.appendChild(buildSettingsRow(r)));
            cardPerm.appendChild(permRows);
            grid.appendChild(cardPerm);

            main.appendChild(grid);

            // ===== Acesso ao Computador (configurável) =====
            main.appendChild(h2(OS.t('cm_title_computer_access', { _d: 'Acesso ao Computador' }), svg('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>')));
            main.appendChild(muted(OS.t('cm_subtitle_computer_access', { _d: 'Escolhe quais patentes podem abrir este computador. Por defeito só o Boss tem acesso. Empregados autorizados vêem uma versão limitada com Visão Geral, Folha de Ponto e Anúncios.' })));

            const accessGrid = document.createElement('div');
            accessGrid.className = 'cm-perm-grid';
            const ranksAsc = [...state.ranks].sort((a, b) => a.grade - b.grade);
            const maxGrade = Math.max(...ranksAsc.map(r => r.grade), 0);

            ranksAsc.forEach(r => {
                const isBossGrade = (companyInfo && companyInfo.bossGrades || []).map(Number).includes(Number(r.grade)) || r.grade === maxGrade;
                const gKey = String(r.grade);
                const allowed = isBossGrade ? true : !!(state.settings.allowedGrades && state.settings.allowedGrades[gKey]);

                const row = document.createElement('div');
                row.className = 'cm-perm-row' + (isBossGrade ? ' is-boss' : '');
                const memberCount = state.employees.filter(e => Number(e.grade) === Number(r.grade)).length;
                row.innerHTML = `
                    <div class="cm-perm-row-left">
                        <div class="cm-perm-grade">G${r.grade}</div>
                        <div class="cm-perm-info">
                            <div class="cm-perm-name">${escapeHtml(r.label || r.name)}${isBossGrade ? ' <span class="chip boss" style="font-size:9px;padding:1px 6px">' + escapeHtml(OS.t('cm_chip_boss', { _d: 'BOSS' })) + '</span>' : ''}</div>
                            <div class="cm-perm-meta">${escapeHtml(OS.t('cm_count_members_and_salary', { count: memberCount, salary: fmtMoney(r.salary), _d: `${memberCount} membros · Salário ${fmtMoney(r.salary)}` }))}</div>
                        </div>
                    </div>
                    <div class="cm-perm-actions"></div>`;

                const actions = row.querySelector('.cm-perm-actions');
                if (isBossGrade) {
                    const lock = document.createElement('span');
                    lock.className = 'cm-perm-lock';
                    lock.innerHTML = svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>') + '<span>' + escapeHtml(OS.t('cm_label_always_full_access', { _d: 'Sempre acesso total' })) + '</span>';
                    actions.appendChild(lock);
                } else {
                    const t = document.createElement('div');
                    t.className = 'toggle' + (allowed ? ' on' : '');
                    t.title = allowed ? OS.t('cm_tooltip_can_open_pc', { _d: 'Pode abrir o PC' }) : OS.t('cm_tooltip_no_pc_access', { _d: 'Sem acesso ao PC' });
                    t.addEventListener('click', () => {
                        t.classList.toggle('on');
                        const on = t.classList.contains('on');
                        const next = { ...state.settings };
                        next.allowedGrades = { ...(next.allowedGrades || {}) };
                        if (on) next.allowedGrades[gKey] = true;
                        else    delete next.allowedGrades[gKey];
                        savePermissions(next);
                    });
                    actions.appendChild(t);
                }
                accessGrid.appendChild(row);
            });
            main.appendChild(accessGrid);

            // ===== Patentes & Salários (full width abaixo) =====
            main.appendChild(h2(OS.t('cm_title_ranks_salaries', { _d: 'Patentes & Salários' }), ICONS.tree));
            main.appendChild(muted(OS.t('cm_subtitle_ranks_salaries', { _d: 'Clica no ícone de edição para alterar o salário (atualiza job_grades).' })));

            const ranksGrid = document.createElement('div');
            ranksGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-top:10px';
            [...state.ranks].sort((a, b) => b.grade - a.grade).forEach((r, idx) => {
                const isBoss = idx === 0;
                const members = state.employees.filter(e => Number(e.grade) === Number(r.grade));
                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(255,255,255,.04);border-radius:12px;padding:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);transition:background .12s;display:flex;align-items:center;gap:12px';
                card.onmouseenter = () => card.style.background = 'var(--company-accent-soft)';
                card.onmouseleave = () => card.style.background = 'rgba(255,255,255,.04)';
                card.innerHTML = `
                    <div style="width:36px;height:36px;border-radius:9px;background:${isBoss ? 'rgba(255,159,10,.20)' : 'var(--company-accent-soft)'};color:${isBoss ? '#ff9f0a' : 'var(--company-accent)'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:0 0 36px">${r.grade}</div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px">${escapeHtml(r.label || r.name)}${isBoss ? '<span class="chip boss" style="font-size:9px;padding:1px 6px">' + escapeHtml(OS.t('cm_chip_boss', { _d: 'BOSS' })) + '</span>' : ''}</div>
                        <div style="font-size:11px;color:var(--text-3);margin-top:2px">${escapeHtml(OS.t('cm_count_members', { count: members.length, _d: `${members.length} ${members.length === 1 ? 'membro' : 'membros'}` }))} · ${fmtMoney(r.salary)}</div>
                    </div>
                    <button class="row-action" title="${escapeHtml(OS.t('cm_tooltip_edit_salary', { _d: 'Editar salário' }))}">${ICONS.edit}</button>`;
                card.querySelector('.row-action').addEventListener('click', () => openSalaryModal(r));
                ranksGrid.appendChild(card);
            });
            main.appendChild(ranksGrid);
        }

        // Helper: card de definições
        function settingsCard(title, sub, icon) {
            const card = document.createElement('div');
            card.className = 'cm-settings-card';
            const head = document.createElement('div');
            head.className = 'cm-settings-card-head';
            head.innerHTML = `
                <div class="cm-settings-card-icon">${icon || ''}</div>
                <div>
                    <div class="cm-settings-card-title">${escapeHtml(title)}</div>
                    <div class="cm-settings-card-sub">${escapeHtml(sub)}</div>
                </div>`;
            card.appendChild(head);
            return card;
        }

        // Helper: linha de definição (suporta value, mono, custom, action, toggleStatic+badge)
        function buildSettingsRow(opts) {
            const row = document.createElement('div');
            row.className = 'settings-row';
            const lbl = document.createElement('div');
            lbl.className = 'label';
            lbl.textContent = opts.label;
            row.appendChild(lbl);

            if (opts.toggleStatic !== undefined) {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;align-items:center;gap:8px';
                if (opts.badge) {
                    const b = document.createElement('span');
                    b.className = 'chip';
                    b.style.cssText = 'background:var(--company-accent-soft);color:var(--company-accent);font-size:10px;padding:2px 8px';
                    b.textContent = opts.badge;
                    wrap.appendChild(b);
                }
                const t = document.createElement('div');
                t.className = 'toggle' + (opts.on ? ' on' : '');
                t.style.opacity = '.6';
                t.style.pointerEvents = 'none';
                wrap.appendChild(t);
                row.appendChild(wrap);
            } else if (opts.custom) {
                row.appendChild(opts.custom());
            } else {
                const v = document.createElement('div');
                v.className = 'value';
                if (opts.mono) v.style.fontFamily = 'monospace';
                if (opts.valueColor) v.style.color = opts.valueColor;
                v.textContent = opts.value;
                row.appendChild(v);
            }
            if (opts.edit && opts.action) {
                const editBtn = document.createElement('button');
                editBtn.className = 'row-action';
                editBtn.style.marginLeft = '8px';
                editBtn.innerHTML = ICONS.edit;
                editBtn.title = OS.t('cm_btn_edit', { _d: 'Editar' });
                editBtn.addEventListener('click', opts.action);
                row.appendChild(editBtn);
            }
            return row;
        }

        function openEditNameModal() {
            const body = document.createElement('div');
            body.appendChild(field(OS.t('cm_label_new_name', { _d: 'Novo nome' }), 'name', { value: state.companyName, placeholder: OS.t('cm_placeholder_company_name', { _d: 'Nome da empresa' }) }));
            const note = document.createElement('p');
            note.className = 'muted';
            note.style.cssText = 'font-size:11px;margin-top:6px';
            const job = companyInfo ? companyInfo.job : '?';
            note.textContent = OS.t('cm_note_local_name_only', { job, _d: `Apenas altera localmente — o nome real do job ESX (${job}) não muda.` });
            body.appendChild(note);

            window.OS.api.showModal({
                title: OS.t('cm_modal_edit_company_name_title', { _d: 'Editar Nome da Empresa' }),
                body,
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_save', { _d: 'Guardar' }), style: 'primary', onClick: ({ body }) => {
                        const name = getField(body, 'name').trim();
                        if (!name) return false;
                        state.companyName = name;
                        const bn = side.querySelector('.brand-name'); if (bn) bn.textContent = name;
                        notify({ type: 'success', title: OS.t('cm_notify_name_changed_title', { _d: 'Nome alterado' }), message: name });
                        renderSettings();
                    }},
                ],
            });
        }

        // ==========================================
        // Ações
        // ==========================================
        async function doPromote(emp) {
            const sortedRanks = [...state.ranks].sort((a, b) => a.grade - b.grade);
            const idx = sortedRanks.findIndex(r => Number(r.grade) === Number(emp.grade));
            if (idx < 0 || idx === sortedRanks.length - 1) return;
            const newRank = sortedRanks[idx + 1];
            const res = await nuiCall('setGrade', { identifier: emp.identifier, grade: newRank.grade });
            if (res && res.ok) {
                const rankLabel = newRank.label || newRank.name;
                logEvent('promote', OS.t('cm_log_promoted', { name: emp.name, rank: rankLabel, _d: `${emp.name} foi promovido(a) a ${rankLabel}` }));
                notify({ type: 'success', title: OS.t('cm_notify_promoted_title', { _d: 'Promovido' }), message: OS.t('cm_notify_promoted_msg', { name: emp.name, rank: rankLabel, _d: `${emp.name} é agora ${rankLabel}` }) });
                await refresh();
            } else {
                notify({ type: 'error', title: OS.t('cm_notify_promote_failed_title', { _d: 'Promoção falhou' }), message: OS.t('cm_notify_promote_failed_msg', { _d: 'Não foi possível promover este empregado.' }) });
            }
        }
        async function doDemote(emp) {
            const sortedRanks = [...state.ranks].sort((a, b) => a.grade - b.grade);
            const idx = sortedRanks.findIndex(r => Number(r.grade) === Number(emp.grade));
            if (idx <= 0) return;
            const newRank = sortedRanks[idx - 1];
            const res = await nuiCall('setGrade', { identifier: emp.identifier, grade: newRank.grade });
            if (res && res.ok) {
                const rankLabel = newRank.label || newRank.name;
                logEvent('demote', OS.t('cm_log_demoted', { name: emp.name, rank: rankLabel, _d: `${emp.name} foi despromovido(a) a ${rankLabel}` }));
                notify({ type: 'warning', title: OS.t('cm_notify_demoted_title', { _d: 'Despromovido' }), message: OS.t('cm_notify_demoted_msg', { name: emp.name, rank: rankLabel, _d: `${emp.name} desceu para ${rankLabel}` }) });
                await refresh();
            } else {
                notify({ type: 'error', title: OS.t('cm_notify_demote_failed_title', { _d: 'Despromoção falhou' }), message: OS.t('cm_notify_demote_failed_msg', { _d: 'Não foi possível despromover este empregado.' }) });
            }
        }

        function openFireConfirm(emp) {
            window.OS.api.showModal({
                title: OS.t('cm_modal_fire_title', { name: emp.name, _d: `Despedir ${emp.name}?` }),
                subtitle: emp.online
                    ? OS.t('cm_modal_fire_sub_online', { _d: 'O job no jogo será reposto para "unemployed" imediatamente.' })
                    : OS.t('cm_modal_fire_sub_offline', { _d: 'O job na DB será reposto. O jogador será notificado quando entrar.' }),
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_fire', { _d: 'Despedir' }), style: 'danger', onClick: async () => {
                        const res = await nuiCall('firePlayer', { identifier: emp.identifier });
                        if (res && res.ok) {
                            logEvent('fire', OS.t('cm_log_fired', { name: emp.name, _d: `${emp.name} foi despedido(a) da empresa` }));
                            notify({ type: 'success', title: OS.t('cm_notify_fired_title', { _d: 'Empregado despedido' }), message: OS.t('cm_notify_fired_msg', { name: emp.name, _d: `${emp.name} foi removido(a) da empresa.` }) });
                            await refresh();
                        } else {
                            notify({ type: 'error', title: OS.t('cm_notify_fire_failed_title', { _d: 'Falha ao despedir' }), message: OS.t('cm_notify_fire_failed_msg', { _d: 'Não foi possível concluir a operação.' }) });
                        }
                    }},
                ],
            });
        }

        function openMoneyModal(mode) {
            const isDeposit = mode === 'deposit';
            const body = document.createElement('div');
            const f = document.createElement('div');
            f.className = 'field';
            f.innerHTML = `<label>${escapeHtml(OS.t('cm_label_amount', { _d: 'Montante (€)' }))}</label><input type="number" min="1" value="100" data-field="amount" />`;
            body.appendChild(f);

            const f2 = document.createElement('div');
            f2.className = 'field';
            const descPh = isDeposit ? OS.t('cm_type_deposit', { _d: 'Depósito' }) : OS.t('cm_type_withdrawal', { _d: 'Levantamento' });
            f2.innerHTML = `<label>${escapeHtml(OS.t('cm_label_description_optional', { _d: 'Descrição (opcional)' }))}</label><input type="text" data-field="desc" placeholder="${escapeHtml(descPh)}" />`;
            body.appendChild(f2);

            const errBox = document.createElement('div');
            errBox.style.cssText = 'color:#ff453a;font-size:12px;margin-top:8px;display:none';
            body.appendChild(errBox);

            window.OS.api.showModal({
                title: isDeposit ? OS.t('cm_modal_deposit_title', { _d: 'Depositar na Empresa' }) : OS.t('cm_modal_withdraw_title', { _d: 'Levantar da Empresa' }),
                subtitle: OS.t('cm_modal_money_sub_balance', { balance: fmtMoney(state.balance), _d: `Saldo da sociedade: ${fmtMoney(state.balance)}` }),
                body,
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: isDeposit ? OS.t('cm_btn_deposit', { _d: 'Depositar' }) : OS.t('cm_btn_withdraw', { _d: 'Levantar' }), style: isDeposit ? 'primary' : 'danger', onClick: async ({ body }) => {
                        const amount = parseInt(body.querySelector('[data-field="amount"]').value, 10) || 0;
                        const desc = body.querySelector('[data-field="desc"]').value.trim() || (isDeposit ? OS.t('cm_type_deposit', { _d: 'Depósito' }) : OS.t('cm_type_withdrawal', { _d: 'Levantamento' }));
                        if (amount <= 0) {
                            errBox.textContent = OS.t('cm_err_invalid_amount', { _d: 'Montante inválido.' });
                            errBox.style.display = '';
                            return false;
                        }
                        const res = await nuiCall(isDeposit ? 'depositMoney' : 'withdrawMoney', { amount });
                        if (!res || !res.ok) {
                            const map = {
                                insufficient_player:  { msg: OS.t('cm_err_insufficient_player_short', { _d: 'Saldo pessoal insuficiente.' }),       notif: OS.t('cm_err_insufficient_player_long',  { _d: 'Não tens dinheiro suficiente na carteira.' }) },
                                insufficient_society: { msg: OS.t('cm_err_insufficient_society_short', { _d: 'Saldo da empresa insuficiente.' }),    notif: OS.t('cm_err_insufficient_society',      { _d: 'A empresa não tem fundos suficientes.' }) },
                                invalid_amount:       { msg: OS.t('cm_err_invalid_amount',             { _d: 'Montante inválido.' }),                notif: OS.t('cm_err_invalid_amount_long',       { _d: 'O montante introduzido é inválido.' }) },
                                no_access:            { msg: OS.t('cm_err_no_access',                  { _d: 'Sem permissão.' }),                    notif: OS.t('cm_err_no_access_long',            { _d: 'Não tens permissão para esta operação.' }) },
                                society_failed:       { msg: OS.t('cm_err_society_failed_short',       { _d: 'Falha ao atualizar conta da empresa.' }), notif: OS.t('cm_err_society_failed_long',     { _d: 'Erro a comunicar com a conta da empresa.' }) },
                            };
                            const m = res && map[res.error];
                            errBox.textContent = (m && m.msg) || OS.t('cm_err_op_failed', { _d: 'Operação falhou.' });
                            errBox.style.display = '';
                            // Notificação macOS-style
                            notify({
                                type: 'error',
                                title: isDeposit ? OS.t('cm_notify_deposit_failed_title', { _d: 'Depósito falhou' }) : OS.t('cm_notify_withdraw_failed_title', { _d: 'Levantamento falhou' }),
                                message: (m && m.notif) || OS.t('cm_err_op_could_not_complete', { _d: 'Não foi possível completar a operação.' }),
                            });
                            return false;
                        }
                        const verb = isDeposit ? OS.t('cm_log_deposited', { _d: 'Depositado' }) : OS.t('cm_log_withdrawn', { _d: 'Levantado' });
                        logEvent(isDeposit ? 'deposit' : 'withdraw',
                                 OS.t('cm_log_money_movement', { verb, amount: fmtMoney(amount), desc, _d: `${verb} ${fmtMoney(amount)} — ${desc}` }));
                        notify({
                            type: 'success',
                            title: isDeposit ? OS.t('cm_notify_deposit_done_title', { _d: 'Depósito efetuado' }) : OS.t('cm_notify_withdraw_done_title', { _d: 'Levantamento efetuado' }),
                            message: isDeposit
                                ? OS.t('cm_notify_deposit_done_msg', { amount: fmtMoney(amount), _d: `${fmtMoney(amount)} creditado na conta da empresa.` })
                                : OS.t('cm_notify_withdraw_done_msg', { amount: fmtMoney(amount), _d: `${fmtMoney(amount)} transferido para ti.` }),
                        });
                        await refresh();
                    }},
                ],
            });
        }

        function openHireModal() {
            const body = document.createElement('div');
            const loading = document.createElement('p');
            loading.className = 'muted';
            loading.style.cssText = 'text-align:center;padding:18px';
            loading.textContent = OS.t('cm_msg_loading_players', { _d: 'A carregar jogadores online...' });
            body.appendChild(loading);

            const ctl = window.OS.api.showModal({
                title: OS.t('cm_modal_hire_title', { _d: 'Contratar Empregado' }),
                subtitle: OS.t('cm_modal_hire_sub', { _d: 'Escolhe um jogador online para entrar na tua equipa.' }),
                body,
                actions: [{ label: OS.t('cm_btn_close', { _d: 'Fechar' }) }],
            });

            nuiCall('listPlayers').then(d => {
                body.innerHTML = '';
                const players = (d && d.players) || [];
                if (!players.length) {
                    body.innerHTML = `<p class="muted" style="text-align:center;padding:24px">${escapeHtml(OS.t('cm_empty_no_players_online', { _d: 'Não há jogadores online disponíveis.' }))}</p>`;
                    return;
                }
                const list = document.createElement('div');
                list.className = 'hire-list';
                players.forEach(p => {
                    const it = document.createElement('div');
                    it.className = 'hire-item';
                    it.appendChild(buildPedAvatar(p.name, 40));
                    const info = document.createElement('div');
                    info.className = 'hire-info';
                    info.innerHTML = `
                        <div class="hire-name">${escapeHtml(p.name)}</div>
                        <div class="hire-sub">${escapeHtml(OS.t('cm_label_current_job', { job: p.jobLabel || p.job, _d: `Job atual: ${p.jobLabel || p.job}` }))}</div>`;
                    it.appendChild(info);
                    const btn = document.createElement('button');
                    btn.className = 'modal-btn primary';
                    btn.textContent = OS.t('cm_btn_hire', { _d: 'Contratar' });
                    btn.addEventListener('click', async () => {
                        btn.disabled = true; btn.textContent = '...';
                        const lowest = [...state.ranks].sort((a, b) => a.grade - b.grade)[0];
                        const grade = lowest ? lowest.grade : 0;
                        const res = await nuiCall('hirePlayer', { source: p.source, grade });
                        if (res && res.ok) {
                            logEvent('hire', OS.t('cm_log_hired', { name: p.name, _d: `${p.name} foi contratado(a)` }));
                            const rankLabel = lowest.label || lowest.name;
                            notify({ type: 'success', title: OS.t('cm_notify_hired_title', { _d: 'Empregado contratado' }), message: OS.t('cm_notify_hired_msg', { name: p.name, rank: rankLabel, _d: `${p.name} entrou para a empresa como ${rankLabel}.` }) });
                            ctl.close();
                            await refresh();
                        } else {
                            btn.disabled = false; btn.textContent = OS.t('cm_btn_try_again', { _d: 'Tentar de novo' });
                            notify({ type: 'error', title: OS.t('cm_notify_hire_failed_title', { _d: 'Falha ao contratar' }), message: OS.t('cm_notify_hire_failed_msg', { _d: 'Não foi possível contratar este jogador.' }) });
                        }
                    });
                    it.appendChild(btn);
                    list.appendChild(it);
                });
                body.appendChild(list);
            });
        }

        function openSalaryModal(rank) {
            const body = document.createElement('div');
            const cur = document.createElement('div');
            cur.className = 'field';
            cur.innerHTML = `<label>${escapeHtml(OS.t('cm_label_current_salary', { _d: 'Salário atual' }))}</label><input type="text" disabled value="${fmtMoney(rank.salary)}" />`;
            body.appendChild(cur);
            const f = document.createElement('div');
            f.className = 'field';
            f.innerHTML = `<label>${escapeHtml(OS.t('cm_label_new_salary', { _d: 'Novo salário (€)' }))}</label><input type="number" min="0" value="${rank.salary}" data-field="salary" />`;
            body.appendChild(f);
            const note = document.createElement('p');
            note.className = 'muted';
            note.style.cssText = 'font-size:11.5px;margin-top:6px';
            note.textContent = OS.t('cm_note_salary_update', { _d: 'Atualiza a coluna "salary" da tabela job_grades. Aplica-se a todos os empregados desta patente.' });
            body.appendChild(note);

            const rankLabel = rank.label || rank.name;
            window.OS.api.showModal({
                title: OS.t('cm_modal_edit_salary_title', { rank: rankLabel, _d: `Editar salário — ${rankLabel}` }),
                subtitle: OS.t('cm_modal_edit_salary_sub', { name: rank.name, grade: rank.grade, _d: `Patente "${rank.name}" · Grade ${rank.grade}` }),
                body,
                actions: [
                    { label: OS.t('cm_btn_cancel', { _d: 'Cancelar' }) },
                    { label: OS.t('cm_btn_apply', { _d: 'Aplicar' }), style: 'primary', onClick: async ({ body }) => {
                        const newSal = parseInt(body.querySelector('[data-field="salary"]').value, 10);
                        if (isNaN(newSal) || newSal < 0) return false;
                        const res = await nuiCall('setGradeSalary', { grade: rank.grade, salary: newSal });
                        if (res && res.ok) {
                            logEvent('salary', OS.t('cm_log_salary_changed', { rank: rankLabel, from: fmtMoney(rank.salary), to: fmtMoney(newSal), _d: `Salário da patente "${rankLabel}" alterado de ${fmtMoney(rank.salary)} para ${fmtMoney(newSal)}` }));
                            notify({ type: 'success', title: OS.t('cm_notify_salary_updated_title', { _d: 'Salário atualizado' }), message: `${rankLabel}: ${fmtMoney(rank.salary)} → ${fmtMoney(newSal)}` });
                            await refresh();
                        } else {
                            notify({ type: 'error', title: OS.t('cm_notify_salary_update_failed_title', { _d: 'Atualização falhou' }), message: OS.t('cm_notify_salary_update_failed_msg', { _d: 'Não foi possível atualizar o salário desta patente.' }) });
                        }
                    }},
                ],
            });
        }

        // ---------- Sidebar interactions ----------
        side.querySelectorAll('.sidebar-item').forEach(it => {
            it.addEventListener('click', () => {
                side.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
                it.classList.add('active');
                state.currentTab = it.dataset.tab;
                rerender();
            });
        });

        root.appendChild(side);
        root.appendChild(main);

        // Carga inicial
        showLoading(OS.t('cm_msg_connecting', { _d: 'A ligar à empresa...' }));
        refresh();

        return root;
    }

    return {
        id: 'companyManagement',
        defaultName: (window.OS && window.OS.t) ? window.OS.t('cm_app_name', { _d: 'Gestão de Empresa' }) : 'Gestão de Empresa',
        defaultSize: { w: 1180, h: 760 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
