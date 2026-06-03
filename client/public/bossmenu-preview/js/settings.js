// ==========================================
//  OXLYN-BOSSMENU | App: Definições
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.settings = (function () {
    const T = (k, vars) => (window.OS && typeof window.OS.t === 'function') ? window.OS.t(k, vars) : (vars && vars._d) || k;

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('settings');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(180deg,#7d8392,#3a3f4b);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;';
        d.textContent = '⚙';
        return d;
    }

    const SIDEBAR_ICONS = {
        wallpaper: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`,
        display:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
        general:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>`,
        sound:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>`,
        apps:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        about:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    };

    function svgIcon(s) {
        const d = document.createElement('div');
        d.className = 'si-icon';
        d.innerHTML = s;
        return d;
    }

    function rowGroup(rows) {
        const grp = document.createElement('div');
        grp.className = 'settings-rows-group';
        rows.forEach(r => {
            const row = document.createElement('div');
            row.className = 'settings-row';
            const lbl = document.createElement('div');
            lbl.className = 'label';
            if (r.sub) {
                lbl.innerHTML = `${r.label}<span class="sub">${r.sub}</span>`;
            } else {
                lbl.textContent = r.label;
            }
            row.appendChild(lbl);

            if (r.toggle !== undefined) {
                const t = document.createElement('div');
                t.className = 'toggle' + (r.toggle ? ' on' : '');
                t.addEventListener('click', () => {
                    t.classList.toggle('on');
                    if (typeof r.onChange === 'function') r.onChange(t.classList.contains('on'));
                });
                row.appendChild(t);
            } else if (r.slider !== undefined) {
                const wrap = document.createElement('div');
                wrap.className = 'settings-slider-wrap';
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = 0; slider.max = 100; slider.value = r.slider;
                slider.className = 'settings-slider';
                const val = document.createElement('span');
                val.className = 'value';
                val.style.minWidth = '36px';
                val.style.textAlign = 'right';
                val.textContent = r.slider + '%';
                slider.addEventListener('input', () => {
                    val.textContent = slider.value + '%';
                    if (typeof r.onChange === 'function') r.onChange(Number(slider.value));
                });
                wrap.appendChild(slider);
                wrap.appendChild(val);
                row.appendChild(wrap);
            } else if (r.segmented) {
                const seg = document.createElement('div');
                seg.className = 'settings-segmented';
                r.segmented.forEach((opt, i) => {
                    const b = document.createElement('button');
                    b.textContent = opt;
                    if (i === (r.segmentedActive || 0)) b.classList.add('active');
                    b.addEventListener('click', () => {
                        seg.querySelectorAll('button').forEach(x => x.classList.remove('active'));
                        b.classList.add('active');
                        if (typeof r.onChange === 'function') r.onChange(i, opt);
                    });
                    seg.appendChild(b);
                });
                row.appendChild(seg);
            } else {
                const v = document.createElement('div');
                v.className = 'value';
                v.textContent = r.value;
                row.appendChild(v);
            }
            grp.appendChild(row);
        });
        return grp;
    }

    function buildContent(win, cfg, locale) {
        const config = window.OS.api.getConfig();
        const root = document.createElement('div');
        root.className = 'sidebar-app';

        const side = document.createElement('div');
        side.className = 'sidebar';

        const items = [
            { section: T('set_section_appearance', { _d: 'Aspeto' }) },
            { tab: 'wallpaper', label: T('set_tab_wallpaper', { _d: 'Fundo do Ecrã' }), icon: 'wallpaper' },
            { tab: 'display',   label: T('set_tab_display',   { _d: 'Ecrã' }),          icon: 'display' },
            { section: T('set_section_general', { _d: 'Geral' }) },
            { tab: 'general',   label: T('set_tab_general',   { _d: 'Geral' }),         icon: 'general' },
            { tab: 'sound',     label: T('set_tab_sound',     { _d: 'Som' }),           icon: 'sound' },
            { tab: 'apps',      label: T('set_tab_apps',      { _d: 'Aplicações' }),    icon: 'apps' },
            { section: T('set_section_system', { _d: 'Sistema' }) },
            { tab: 'about',     label: T('set_tab_about',     { _d: 'Sobre' }),         icon: 'about' },
        ];
        items.forEach(it => {
            if (it.section) {
                const s = document.createElement('div');
                s.className = 'sidebar-section';
                s.textContent = it.section;
                side.appendChild(s);
                return;
            }
            const el = document.createElement('div');
            el.className = 'sidebar-item';
            el.dataset.tab = it.tab;
            el.appendChild(svgIcon(SIDEBAR_ICONS[it.icon] || ''));
            const lbl = document.createElement('span');
            lbl.textContent = it.label;
            el.appendChild(lbl);
            side.appendChild(el);
        });

        const main = document.createElement('div');
        main.className = 'main';

        function renderWallpaper() {
            main.innerHTML = '';
            const h = document.createElement('h1');
            h.textContent = T('set_title_wallpaper', { _d: 'Fundo do Ecrã' });
            main.appendChild(h);
            const p = document.createElement('p');
            p.className = 'muted';
            p.textContent = T('set_msg_wallpaper_intro', { _d: 'Escolhe a imagem ou padrão a usar como fundo do teu PC.' });
            main.appendChild(p);

            const presets = (config.wallpapers && config.wallpapers.length)
                ? config.wallpapers
                : [];

            const grid = document.createElement('div');
            grid.className = 'settings-grid-wallpapers';
            presets.forEach(wp => {
                const t = document.createElement('div');
                t.className = 'wp-thumb';
                const v = wp.value;
                if (typeof v === 'string' && (v.startsWith('linear-gradient') || v.startsWith('radial-gradient'))) {
                    t.style.background = v;
                } else if (typeof v === 'string' && v.startsWith('#')) {
                    t.style.background = v;
                } else {
                    t.style.backgroundImage = `url('${v}')`;
                }
                if (window.OS.api.isCurrentWallpaper(v)) t.classList.add('selected');

                const name = document.createElement('div');
                name.className = 'wp-thumb-name';
                name.textContent = wp.name;
                t.appendChild(name);

                t.addEventListener('click', () => {
                    grid.querySelectorAll('.wp-thumb').forEach(x => x.classList.remove('selected'));
                    t.classList.add('selected');
                    window.OS.api.applyWallpaper(v);
                    try { localStorage.setItem('oxlyn_bm_wallpaper', JSON.stringify(v)); } catch (_) {}
                });
                grid.appendChild(t);
            });
            main.appendChild(grid);
        }

        function renderGeneral() {
            main.innerHTML = '';
            main.appendChild(Object.assign(document.createElement('h1'), { textContent: T('set_title_general', { _d: 'Geral' }) }));
            main.appendChild(Object.assign(document.createElement('p'), {
                className: 'muted', textContent: T('set_msg_general_intro', { _d: 'Definições gerais do sistema.' })
            }));

            main.appendChild(Object.assign(document.createElement('h2'), { textContent: T('set_section_appearance', { _d: 'Aparência' }) }));
            const themeMap   = ['auto', 'light', 'dark'];
            const currentTheme = (window.OS.api.getTheme && window.OS.api.getTheme()) || 'dark';
            const themeIdx   = themeMap.indexOf(currentTheme);
            main.appendChild(rowGroup([
                {
                    label: T('set_label_appearance',     { _d: 'Aparência' }),
                    sub:   T('set_label_appearance_sub', { _d: 'Modo claro ou escuro do sistema.' }),
                    segmented: [
                        T('set_segmented_auto',  { _d: 'Auto' }),
                        T('set_segmented_light', { _d: 'Claro' }),
                        T('set_segmented_dark',  { _d: 'Escuro' }),
                    ],
                    segmentedActive: themeIdx >= 0 ? themeIdx : 2,
                    onChange: (i) => {
                        if (window.OS.api.setTheme) window.OS.api.setTheme(themeMap[i]);
                        if (window.OS.api.sound)    window.OS.api.sound.tap();
                    },
                },
                { label: T('set_label_accent_color', { _d: 'Cor de destaque' }), value: T('set_value_accent_blue', { _d: 'Azul' }) },
            ]));

            main.appendChild(Object.assign(document.createElement('h2'), { textContent: T('set_section_language_region', { _d: 'Idioma e Região' }) }));
            main.appendChild(rowGroup([
                { label: T('set_label_language',     { _d: 'Idioma' }), value: T('set_value_language_pt', { _d: 'Português (Portugal)' }) },
                { label: T('set_label_region',       { _d: 'Região' }), value: T('set_value_region_pt',  { _d: 'Portugal' }) },
                { label: T('set_label_time_format',  { _d: 'Formato de hora' }), segmented: ['12h', '24h'], segmentedActive: 1 },
            ]));

            main.appendChild(Object.assign(document.createElement('h2'), { textContent: T('set_section_behavior', { _d: 'Comportamento' }) }));
            main.appendChild(rowGroup([
                { label: T('set_label_auto_time',         { _d: 'Hora automática' }), sub: T('set_label_auto_time_sub',     { _d: 'Sincroniza a hora com a internet' }), toggle: true },
                { label: T('set_label_notifications',     { _d: 'Notificações' }),    sub: T('set_label_notifications_sub', { _d: 'Mostra alertas das aplicações' }),     toggle: true },
                { label: T('set_label_focus_mode',        { _d: 'Modo Foco' }),       sub: T('set_label_focus_mode_sub',    { _d: 'Silencia notificações enquanto trabalhas' }), toggle: false },
            ]));
        }

        function renderSound() {
            main.innerHTML = '';
            main.appendChild(Object.assign(document.createElement('h1'), { textContent: T('set_title_sound', { _d: 'Som' }) }));
            main.appendChild(Object.assign(document.createElement('p'), {
                className: 'muted', textContent: T('set_msg_sound_intro', { _d: 'Volume e efeitos sonoros do sistema.' })
            }));

            const snd = window.OS.api.sound;
            const curVol = snd ? Math.round(snd.volume() * 100) : 50;
            const curEnabled = snd ? snd.enabled() : true;

            main.appendChild(rowGroup([
                {
                    label: T('set_label_system_sounds',     { _d: 'Sons do sistema' }),
                    sub:   T('set_label_system_sounds_sub', { _d: 'Cliques, notificações, abrir/fechar de janelas.' }),
                    toggle: curEnabled,
                    onChange: (on) => {
                        if (snd) {
                            snd.setEnabled(on);
                            if (on) snd.success();
                        }
                    },
                },
                {
                    label: T('set_label_main_volume', { _d: 'Volume principal' }),
                    slider: curVol,
                    onChange: (v) => {
                        if (snd) {
                            snd.setVolume(v);
                            snd.tap();
                        }
                    },
                },
            ]));

            main.appendChild(Object.assign(document.createElement('h2'), { textContent: T('set_section_test_sounds', { _d: 'Testar Sons' }) }));
            const testGrid = document.createElement('div');
            testGrid.className = 'settings-rows-group';
            const tests = [
                { label: T('set_label_sound_click',        { _d: 'Clique' }),        play: 'click' },
                { label: T('set_label_sound_notification', { _d: 'Notificação' }),   play: 'notification' },
                { label: T('set_label_sound_success',      { _d: 'Sucesso' }),       play: 'success' },
                { label: T('set_label_sound_error',        { _d: 'Erro' }),          play: 'error' },
                { label: T('set_label_sound_lock',         { _d: 'Bloquear' }),      play: 'lock' },
                { label: T('set_label_sound_boot',         { _d: 'Boot' }),          play: 'boot' },
            ];
            tests.forEach(t => {
                const r = document.createElement('div');
                r.className = 'settings-row';
                const lbl = document.createElement('div');
                lbl.className = 'label';
                lbl.textContent = t.label;
                const btn = document.createElement('button');
                btn.className = 'pill-btn pill-btn-installed';
                btn.style.minWidth = '70px';
                btn.style.height = '24px';
                btn.style.fontSize = '11px';
                btn.style.padding = '0 14px';
                btn.textContent = T('set_btn_test_play', { _d: '▶ Testar' });
                btn.addEventListener('click', () => {
                    if (snd && snd[t.play]) snd[t.play]();
                });
                r.appendChild(lbl);
                r.appendChild(btn);
                testGrid.appendChild(r);
            });
            main.appendChild(testGrid);
        }

        function renderApps() {
            main.innerHTML = '';
            main.appendChild(Object.assign(document.createElement('h1'), { textContent: T('set_title_apps', { _d: 'Aplicações' }) }));
            main.appendChild(Object.assign(document.createElement('p'), {
                className: 'muted', textContent: T('set_msg_apps_intro', { _d: 'Apps disponíveis e instaladas neste sistema.' })
            }));

            const rows = (config.apps || []).filter(a => a.enabled).map(a => ({
                label: a.name,
                sub: window.OS.api.isInstalled(a.id)
                    ? T('set_label_app_installed',     { _d: 'Instalada' })
                    : T('set_label_app_not_installed', { _d: 'Não instalada' }),
                value: window.OS.api.isInstalled(a.id) ? '✓' : '—',
            }));
            main.appendChild(rowGroup(rows));
        }

        function renderDisplay() {
            main.innerHTML = '';
            main.appendChild(Object.assign(document.createElement('h1'), { textContent: T('set_title_display', { _d: 'Ecrã' }) }));
            main.appendChild(Object.assign(document.createElement('p'), {
                className: 'muted', textContent: T('set_msg_display_intro', { _d: 'Resolução, brilho e tema do ecrã.' })
            }));

            main.appendChild(rowGroup([
                { label: T('set_label_resolution', { _d: 'Resolução' }),  value: '1920 × 1080' },
                { label: T('set_label_frequency',  { _d: 'Frequência' }), value: '60 Hz' },
            ]));

            const curBright = (window.OS.api.getBrightness && window.OS.api.getBrightness()) || 100;
            const curThemeDark = (window.OS.api.getTheme && window.OS.api.getTheme()) !== 'light';
            main.appendChild(rowGroup([
                {
                    label: T('set_label_brightness',     { _d: 'Brilho' }),
                    sub:   T('set_label_brightness_sub', { _d: 'Controla a luminosidade do ecrã.' }),
                    slider: curBright,
                    onChange: (v) => {
                        if (window.OS.api.setBrightness) window.OS.api.setBrightness(v);
                    },
                },
                {
                    label: T('set_label_true_tone',     { _d: 'True Tone' }),
                    sub:   T('set_label_true_tone_sub', { _d: 'Ajusta automaticamente as cores ao ambiente' }),
                    toggle: true,
                },
                {
                    label: T('set_label_dark_mode',     { _d: 'Modo escuro' }),
                    sub:   T('set_label_dark_mode_sub', { _d: 'Inverte a paleta para superfícies claras / escuras.' }),
                    toggle: curThemeDark,
                    onChange: (on) => {
                        if (window.OS.api.setTheme) window.OS.api.setTheme(on ? 'dark' : 'light');
                    },
                },
            ]));

            main.appendChild(Object.assign(document.createElement('h2'), { textContent: T('set_section_performance', { _d: 'Performance' }) }));
            const perfNow = !!(window.OS.api.isPerfLow && window.OS.api.isPerfLow());
            main.appendChild(rowGroup([
                {
                    label: T('set_label_reduce_motion_visuals',     { _d: 'Reduzir efeitos visuais' }),
                    sub:   T('set_label_reduce_motion_visuals_sub', { _d: 'Desliga o efeito de vidro (blur) das janelas, dock e notificações. Liga isto se notares o sistema lento ou tiveres uma placa gráfica fraca.' }),
                    toggle: perfNow,
                    onChange: (on) => {
                        if (window.OS.api.setPerfLow) window.OS.api.setPerfLow(on);
                        if (window.OS.api.notify) window.OS.api.notify({
                            type: 'info',
                            app: T('set_app_name', { _d: 'Definições' }),
                            title: on
                                ? T('set_notify_perf_on_title',  { _d: 'Modo de performance ativado' })
                                : T('set_notify_perf_off_title', { _d: 'Liquid Glass restaurado' }),
                            message: on
                                ? T('set_notify_perf_on_msg',  { _d: 'Os efeitos de vidro foram desativados para melhor desempenho.' })
                                : T('set_notify_perf_off_msg', { _d: 'Os efeitos de vidro estão de volta ao normal.' }),
                        });
                    },
                },
                {
                    label: T('set_label_reduce_motion',     { _d: 'Reduzir movimento' }),
                    sub:   T('set_label_reduce_motion_sub', { _d: 'Diminui animações ao abrir, fechar e arrastar janelas.' }),
                    toggle: false,
                },
            ]));
        }

        function renderAbout() {
            main.innerHTML = '';
            main.appendChild(Object.assign(document.createElement('h1'), { textContent: T('set_title_about', { _d: 'Sobre' }) }));
            main.appendChild(Object.assign(document.createElement('p'), {
                className: 'muted', textContent: T('set_msg_about_intro', { _d: 'Detalhes deste computador.' })
            }));

            const sys = config.system || {};
            const serial = 'OXLN-' + Math.floor(Math.random()*1e8).toString(36).toUpperCase().padStart(6, '0');
            main.appendChild(rowGroup([
                { label: T('set_label_system',        { _d: 'Sistema' }),         value: sys.name || 'OxlynOS' },
                { label: T('set_label_version',       { _d: 'Versão' }),          value: sys.version || '1.0' },
                { label: T('set_label_model',         { _d: 'Modelo' }),          value: 'Oxlyn Studio Pro' },
                { label: T('set_label_processor',     { _d: 'Processador' }),     value: 'Oxlyn Silicon X3' },
                { label: T('set_label_memory',        { _d: 'Memória' }),         value: '16 GB' },
                { label: T('set_label_storage',       { _d: 'Armazenamento' }),   value: '512 GB' },
                { label: T('set_label_serial_number', { _d: 'Número de série' }), value: serial },
            ]));
        }

        const renderers = {
            wallpaper: renderWallpaper,
            general:   renderGeneral,
            sound:     renderSound,
            apps:      renderApps,
            display:   renderDisplay,
            about:     renderAbout,
        };

        side.querySelectorAll('.sidebar-item').forEach(it => {
            it.addEventListener('click', () => {
                side.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
                it.classList.add('active');
                const tab = it.dataset.tab;
                if (renderers[tab]) renderers[tab]();
            });
        });
        side.querySelector('.sidebar-item').classList.add('active');

        root.appendChild(side);
        root.appendChild(main);
        renderWallpaper();
        return root;
    }

    return {
        id: 'settings',
        defaultName: 'Definições',
        get name() { return T('set_app_name', { _d: 'Definições' }); },
        defaultSize: { w: 980, h: 700 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
