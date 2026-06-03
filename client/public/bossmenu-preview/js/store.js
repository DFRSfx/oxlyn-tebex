// ==========================================
//  OXLYN-BOSSMENU | App: Loja de Apps (V3 — pro)
//  Hero carousel, "Em Alta", "Novidades", reviews, apps similares
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.appstore = (function () {
    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('appstore');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(135deg,#5fbcff,#6a3ed8);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:800;';
        d.textContent = 'A';
        return d;
    }

    const SIDEBAR_ICONS = {
        featured:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>`,
        work:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
        productivity:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
        fun:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
        utilities:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3l3 3-9.4 9.4-4.3 1.3 1.3-4.3z"/><path d="M14 7l3 3"/></svg>`,
        installed:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        updates:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>`,
        internet:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
        system:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    };

    function svgIcon(s) { const d = document.createElement('div'); d.className = 'si-icon'; d.innerHTML = s; return d; }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    const T = (k, vars) => (window.OS && typeof window.OS.t === 'function') ? window.OS.t(k, vars) : (vars && vars._d) || k;

    // Descrições longas e novidades por app (para a página de detalhe)
    const APP_EXTRAS = {
        companyManagement: {
            get longDesc() { return T('store_app_companyManagement_longDesc', { _d: 'A Gestão de Empresa é a app oficial Oxlyn para gerir todos os aspetos do teu negócio em Los Santos.\n\nGere empregados (contratar, despedir, atribuir cargos e salários), controla as finanças com depósitos e levantamentos, mantém o inventário organizado e personaliza tudo nas Definições.\n\nIncluí ainda relatórios automáticos de receitas e despesas dos últimos 7 dias, vista hierárquica em organograma e centro de comunicação para anúncios à equipa.' }); },
            get whatsNew() { return T('store_app_companyManagement_whatsNew', { _d: 'Versão 2.4.1\n• Novo organograma piramidal das patentes\n• Sistema de bónus por empregado\n• Anúncios para a equipa\n• Frota da empresa' }); },
            version: '2.4.1',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn_lda', { _d: 'Oxlyn Software, Lda.' }); },
        },
        browser: {
            get longDesc() { return T('store_app_browser_longDesc', { _d: 'Navegador rápido, simples e seguro.\n\nPesquisa na intranet de Los Santos, vê notícias e mantém-te atualizado. Suporta múltiplas abas, modo escuro e sites favoritos pré-configurados.' }); },
            get whatsNew() { return T('store_app_browser_whatsNew', { _d: 'Versão 17.4\n• Melhorias de velocidade no arranque\n• Correções de segurança' }); },
            version: '17.4',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
        calculator: {
            get longDesc() { return T('store_app_calculator_longDesc', { _d: 'A calculadora clássica para cálculos básicos do dia a dia. Suporta operações aritméticas, percentagens e atalhos de teclado.' }); },
            get whatsNew() { return T('store_app_calculator_whatsNew', { _d: 'Versão 1.0\n• Lançamento inicial' }); },
            version: '1.0',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
        calendar: {
            get longDesc() { return T('store_app_calendar_longDesc', { _d: 'Vê o mês atual, navega entre datas e mantém-te organizado. Perfeito para acompanhar compromissos e eventos importantes.' }); },
            get whatsNew() { return T('store_app_calendar_whatsNew', { _d: 'Versão 3.2\n• Vista anual\n• Cores personalizáveis' }); },
            version: '3.2',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
        clock: {
            get longDesc() { return T('store_app_clock_longDesc', { _d: 'Hora mundial, cronómetro e temporizador num só sítio. Ideal para acompanhar fusos horários ou cronometrar atividades.' }); },
            get whatsNew() { return T('store_app_clock_whatsNew', { _d: 'Versão 4.0\n• Novo design\n• Cronómetro com voltas' }); },
            version: '4.0',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
        settings: {
            get longDesc() { return T('store_app_settings_longDesc', { _d: 'O painel central do teu sistema. Personaliza fundo, som, idioma e muito mais.' }); },
            get whatsNew() { return T('store_app_settings_whatsNew', { _d: 'Versão 15.2\n• Novo separador de Aparência' }); },
            version: '15.2',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
        notes: {
            get longDesc() { return T('store_app_notes_longDesc', { _d: 'Toma apontamentos rápidos com auto-save, fixa as tuas notas favoritas no topo e pesquisa em todo o histórico.\n\nSuporta editor de texto livre, organização por pastas (em breve) e sincronização entre dispositivos do teu sistema.' }); },
            get whatsNew() { return T('store_app_notes_whatsNew', { _d: 'Versão 1.0\n• Lançamento inicial\n• Editor com auto-save\n• Notas fixadas\n• Pesquisa instantânea' }); },
            version: '1.0',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
        reminders: {
            get longDesc() { return T('store_app_reminders_longDesc', { _d: 'Listas de tarefas com datas, prioridades e múltiplas listas personalizáveis.\n\nCria listas para diferentes áreas da tua vida (Pessoal, Trabalho, Compras), define datas de vencimento e marca prioridades. As tarefas vencidas são destacadas a vermelho.' }); },
            get whatsNew() { return T('store_app_reminders_whatsNew', { _d: 'Versão 1.0\n• Lançamento inicial\n• Smart lists (Hoje, Agendado, Prioritárias)\n• Listas personalizáveis com cores e ícones\n• Sistema de prioridades' }); },
            version: '1.0',
            get languages() { return T('store_lang_pt', { _d: 'Português' }); },
            age: '4+',
            get seller() { return T('store_seller_oxlyn', { _d: 'Oxlyn Software' }); },
        },
    };

    // Reviews fictícias por app
    const REVIEWS = {
        companyManagement: [
            { author: 'Carlos M.', rating: 5, get text() { return T('store_review_cm_1_text', { _d: 'Mudou completamente a forma como gerimos a esquadra. Indispensável.' }); }, get date() { return T('store_date_2_days_ago', { _d: 'há 2 dias' }); } },
            { author: 'Sofia P.',  rating: 5, get text() { return T('store_review_cm_2_text', { _d: 'Os organogramas das patentes ficam lindos e a vista de equipa é super útil.' }); }, get date() { return T('store_date_5_days_ago', { _d: 'há 5 dias' }); } },
            { author: 'Tomás R.',  rating: 4, get text() { return T('store_review_cm_3_text', { _d: 'Bom mas faltava o sistema de anúncios — agora já tem!' }); }, get date() { return T('store_date_1_week_ago', { _d: 'há 1 semana' }); } },
        ],
        browser: [
            { author: 'Ana C.',    rating: 5, get text() { return T('store_review_browser_1_text', { _d: 'Rápido e simples, faz exatamente o que promete.' }); }, get date() { return T('store_date_3_days_ago', { _d: 'há 3 dias' }); } },
            { author: 'Miguel T.', rating: 4, get text() { return T('store_review_browser_2_text', { _d: 'Boa interface, gostava de ver mais sites pré-configurados.' }); }, get date() { return T('store_date_1_week_ago', { _d: 'há 1 semana' }); } },
        ],
        notes: [
            { author: 'Inês M.',   rating: 5, get text() { return T('store_review_notes_1_text', { _d: 'Auto-save é a melhor feature, nunca mais perdi nada.' }); }, get date() { return T('store_date_yesterday', { _d: 'ontem' }); } },
            { author: 'Bruno L.',  rating: 5, get text() { return T('store_review_notes_2_text', { _d: 'Design clean, exatamente o que precisava.' }); }, get date() { return T('store_date_4_days_ago', { _d: 'há 4 dias' }); } },
        ],
        reminders: [
            { author: 'Rita C.',   rating: 5, get text() { return T('store_review_reminders_1_text', { _d: 'Smart lists são geniais, organizam tudo automaticamente.' }); }, get date() { return T('store_date_today', { _d: 'hoje' }); } },
            { author: 'André F.',  rating: 4, get text() { return T('store_review_reminders_2_text', { _d: 'Faltava poder definir horas exatas para os lembretes.' }); }, get date() { return T('store_date_2_days_ago', { _d: 'há 2 dias' }); } },
        ],
    };

    function buildContent(win, cfg, locale) {
        const root = document.createElement('div');
        root.className = 'sidebar-app store-app';

        // ---------- Sidebar ----------
        const side = document.createElement('div');
        side.className = 'sidebar';

        const sidebarItems = [
            { section: T('store_section_discover',     { _d: 'Descobrir' }) },
            { tab: 'featured',     label: T('store_tab_featured',     { _d: 'Destacadas' }),    icon: 'featured' },
            { tab: 'productivity', label: T('store_tab_productivity', { _d: 'Produtividade' }), icon: 'productivity' },
            { tab: 'work',         label: T('store_tab_work',         { _d: 'Trabalho' }),      icon: 'work' },
            { tab: 'utilities',    label: T('store_tab_utilities',    { _d: 'Utilitários' }),   icon: 'utilities' },
            { tab: 'internet',     label: T('store_tab_internet',     { _d: 'Internet' }),      icon: 'internet' },
            { tab: 'system',       label: T('store_tab_system',       { _d: 'Sistema' }),       icon: 'system' },
            { section: T('store_section_library',      { _d: 'Biblioteca' }) },
            { tab: 'installed',    label: T('store_tab_installed',    { _d: 'Instaladas' }),    icon: 'installed' },
            { tab: 'updates',      label: T('store_tab_updates',      { _d: 'Atualizações' }),  icon: 'updates' },
        ];
        sidebarItems.forEach(it => {
            if (it.section) {
                const s = document.createElement('div'); s.className = 'sidebar-section';
                s.textContent = it.section; side.appendChild(s);
                return;
            }
            const el = document.createElement('div');
            el.className = 'sidebar-item';
            el.dataset.tab = it.tab;
            el.appendChild(svgIcon(SIDEBAR_ICONS[it.icon] || ''));
            const lbl = document.createElement('span'); lbl.textContent = it.label;
            el.appendChild(lbl);
            side.appendChild(el);
        });

        // ---------- Main ----------
        const main = document.createElement('div');
        main.className = 'main store-main';

        // ---------- Catálogo ----------
        const config = window.OS.api.getConfig();
        const apps = (config.apps || []).filter(a => a.enabled);
        const storeMeta = (config.store && config.store.apps) || [];
        const catalog = apps.map(a => {
            const meta = storeMeta.find(m => m.id === a.id) || {};
            const extras = APP_EXTRAS[a.id] || {};
            // Mapeia categoria PT (canónico, vem da config) → key de tradução
            const categoryKeyMap = {
                'Produtividade': 'store_category_productivity',
                'Trabalho':      'store_category_work',
                'Utilitários':   'store_category_utilities',
                'Internet':      'store_category_internet',
                'Sistema':       'store_category_system',
            };
            const categoryDefaults = {
                'Produtividade': 'Produtividade',
                'Trabalho':      'Trabalho',
                'Utilitários':   'Utilitários',
                'Internet':      'Internet',
                'Sistema':       'Sistema',
            };
            const rawCategory = meta.category || 'Utilitários';
            const categoryLabel = categoryKeyMap[rawCategory]
                ? T(categoryKeyMap[rawCategory], { _d: categoryDefaults[rawCategory] || rawCategory })
                : rawCategory;
            return {
                id: a.id,
                name: meta.name || a.name,
                developer: meta.developer || T('store_seller_oxlyn', { _d: 'Oxlyn Software' }),
                description: meta.description || T('store_msg_no_description', { _d: 'Sem descrição disponível.' }),
                category: rawCategory,         // canónico (PT) — usado para filtrar
                categoryLabel: categoryLabel,  // traduzido — usado para mostrar
                rating: meta.rating || 4.5,
                ratings: meta.ratings || 0,
                size: meta.size || extras.size || '12 MB',
                version: extras.version || meta.version || '1.0',
                longDesc: extras.longDesc || meta.description || '',
                whatsNew: extras.whatsNew || T('store_msg_default_whats_new', { _d: 'Versão atualizada com melhorias e correções.' }),
                languages: extras.languages || T('store_lang_pt', { _d: 'Português' }),
                age: extras.age || '4+',
                seller: extras.seller || meta.developer || T('store_seller_oxlyn', { _d: 'Oxlyn Software' }),
                hidden: meta.hidden === true,
                featured: meta.featured === true,
                tag: meta.tag,  // 'editor', 'new', 'trending'
            };
        }).filter(a => !a.hidden);

        function categoryFilter(tab) {
            if (tab === 'featured' || tab === 'all' || !tab) return catalog;
            if (tab === 'installed') return catalog.filter(a => window.OS.api.isInstalled(a.id));
            if (tab === 'updates')   return [];
            const map = {
                productivity: 'Produtividade',
                work:         'Trabalho',
                utilities:    'Utilitários',
                internet:     'Internet',
                system:       'Sistema',
            };
            return catalog.filter(a => a.category === map[tab]);
        }

        // ---------- State + navegação ----------
        const navStack = [{ type: 'list', tab: 'featured' }];
        function go(view) { navStack.push(view); render(); }
        function back()    { if (navStack.length > 1) navStack.pop(); render(); }

        // ---------- Render principal ----------
        function render() {
            const view = navStack[navStack.length - 1];
            side.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
            if (view.type === 'list' && view.tab) {
                const sb = side.querySelector(`.sidebar-item[data-tab="${view.tab}"]`);
                if (sb) sb.classList.add('active');
            }

            main.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.className = 'store-page';
            main.appendChild(wrap);

            if (view.type === 'app-detail') renderDetail(wrap, view.appId);
            else renderList(wrap, view.tab || 'featured');
        }

        // ---------- Render: Lista ====
        function renderList(parent, tab) {
            // Search input (sempre presente)
            const search = document.createElement('div');
            search.className = 'store-search';
            search.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"/></svg>
                <input type="text" placeholder="${escapeHtml(T('store_placeholder_search', { _d: 'Procurar na Loja' }))}" />`;
            parent.appendChild(search);
            const searchInput = search.querySelector('input');

            // Container que vai ter o conteúdo (re-renderiza ao pesquisar)
            const content = document.createElement('div');
            parent.appendChild(content);

            function drawTab(filter) {
                content.innerHTML = '';

                // Se está a pesquisar, mostra resultados
                if (filter && filter.trim()) {
                    drawSearchResults(content, filter.trim().toLowerCase());
                    return;
                }

                if (tab === 'featured') drawHomeSections(content);
                else drawCategoryList(content, tab);
            }

            searchInput.addEventListener('input', () => drawTab(searchInput.value));
            drawTab('');
        }

        function drawSearchResults(parent, query) {
            const list = catalog.filter(a =>
                a.name.toLowerCase().includes(query) ||
                a.description.toLowerCase().includes(query) ||
                a.category.toLowerCase().includes(query) ||
                (a.categoryLabel || '').toLowerCase().includes(query)
            );
            const h1 = document.createElement('h1');
            h1.textContent = list.length
                ? T('store_title_search_results', { query: query, _d: `Resultados para "${query}"` })
                : T('store_title_no_results', { _d: 'Sem resultados' });
            parent.appendChild(h1);
            const muted = document.createElement('p');
            muted.className = 'muted';
            muted.textContent = list.length
                ? (list.length === 1
                    ? T('store_msg_results_one', { count: list.length, _d: '1 app encontrada' })
                    : T('store_msg_results_many', { count: list.length, _d: `${list.length} apps encontradas` }))
                : T('store_msg_no_results_match', { _d: 'Nenhuma app corresponde à pesquisa.' });
            parent.appendChild(muted);

            if (!list.length) return;
            const grid = document.createElement('div');
            grid.className = 'store-grid';
            parent.appendChild(grid);
            list.forEach(a => grid.appendChild(buildCard(a)));
        }

        // ===== Home (Destacadas) com várias secções =====
        function drawHomeSections(parent) {
            // 1. Hero carousel
            const featured = catalog.filter(a => a.featured && !window.OS.api.isInstalled(a.id));
            const carousel = featured.length ? buildHeroCarousel(featured) : null;
            if (carousel) parent.appendChild(carousel);

            // 2. "Em Alta" (trending)
            const trending = catalog.filter(a => a.tag === 'trending' || (a.ratings || 0) > 700)
                .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
                .slice(0, 6);
            if (trending.length) {
                parent.appendChild(buildSectionHead(
                    T('store_section_trending_title', { _d: 'Em Alta' }),
                    T('store_section_trending_sub',   { _d: '🔥 As mais procuradas esta semana' })
                ));
                parent.appendChild(buildHorizontalScroll(trending));
            }

            // 3. "Novidades" (apps com tag 'new')
            const news = catalog.filter(a => a.tag === 'new');
            if (news.length) {
                parent.appendChild(buildSectionHead(
                    T('store_section_new_title', { _d: 'Novidades' }),
                    T('store_section_new_sub',   { _d: '✨ Acabadas de chegar à Loja' })
                ));
                parent.appendChild(buildHorizontalScroll(news));
            }

            // 4. "Editor's Picks"
            const picks = catalog.filter(a => a.tag === 'editor');
            if (picks.length) {
                parent.appendChild(buildSectionHead(
                    T('store_section_editor_title', { _d: 'Escolhas Oxlyn' }),
                    T('store_section_editor_sub',   { _d: '⭐ Selecionadas pela equipa' })
                ));
                parent.appendChild(buildHorizontalScroll(picks));
            }

            // 5. Categorias visuais
            parent.appendChild(buildSectionHead(
                T('store_section_explore_title', { _d: 'Explorar Categorias' }),
                T('store_section_explore_sub',   { _d: 'Encontra apps por área' })
            ));
            parent.appendChild(buildCategoryTiles());

            // 6. "Todas as Apps" grid
            parent.appendChild(buildSectionHead(
                T('store_section_all_title', { _d: 'Todas as Apps' }),
                T('store_section_all_sub',   { count: catalog.length, _d: `${catalog.length} disponíveis` })
            ));
            const grid = document.createElement('div');
            grid.className = 'store-grid';
            catalog.forEach(a => grid.appendChild(buildCard(a)));
            parent.appendChild(grid);
        }

        // ===== Lista por categoria =====
        function drawCategoryList(parent, tab) {
            const titles = {
                productivity: [
                    T('store_title_productivity',    { _d: 'Produtividade' }),
                    T('store_subtitle_productivity', { _d: 'Mantém-te organizado e a produzir mais.' })
                ],
                work: [
                    T('store_title_work',    { _d: 'Trabalho' }),
                    T('store_subtitle_work', { _d: 'Apps para gerir o teu negócio.' })
                ],
                utilities: [
                    T('store_title_utilities',    { _d: 'Utilitários' }),
                    T('store_subtitle_utilities', { _d: 'Ferramentas essenciais do sistema.' })
                ],
                internet: [
                    T('store_title_internet',    { _d: 'Internet' }),
                    T('store_subtitle_internet', { _d: 'Apps para te ligares à internet.' })
                ],
                system: [
                    T('store_title_system',    { _d: 'Sistema' }),
                    T('store_subtitle_system', { _d: 'Apps de sistema e configuração.' })
                ],
                installed: [
                    T('store_title_installed',    { _d: 'Apps Instaladas' }),
                    T('store_subtitle_installed', { _d: 'Apps disponíveis no teu sistema.' })
                ],
                updates: [
                    T('store_title_updates',    { _d: 'Atualizações' }),
                    T('store_subtitle_updates', { _d: 'Tudo está atualizado.' })
                ],
            };
            const [title, subtitle] = titles[tab] || [T('store_title_apps', { _d: 'Apps' }), ''];

            const h1 = document.createElement('h1');
            h1.textContent = title;
            parent.appendChild(h1);
            const muted = document.createElement('p');
            muted.className = 'muted';
            muted.textContent = subtitle;
            parent.appendChild(muted);

            const grid = document.createElement('div');
            grid.className = 'store-grid';
            parent.appendChild(grid);

            const list = categoryFilter(tab);
            if (!list.length) {
                grid.style.gridTemplateColumns = '1fr';
                const empty = document.createElement('p');
                empty.className = 'muted';
                empty.style.cssText = 'text-align:center;padding:60px';
                empty.innerHTML = tab === 'updates'
                    ? escapeHtml(T('store_msg_no_updates', { _d: '✨ Não há atualizações disponíveis. Tudo a postos.' })).replace(/\. /, '.<br>')
                    : escapeHtml(T('store_msg_empty_category', { _d: 'Nenhuma app nesta categoria.' }));
                grid.appendChild(empty);
                return;
            }
            list.forEach(a => grid.appendChild(buildCard(a)));
        }

        function buildSectionHead(title, sub) {
            const h = document.createElement('div');
            h.className = 'store-section-head';
            h.innerHTML = `
                <div>
                    <div class="store-section-title">${escapeHtml(title)}</div>
                    <div class="store-section-sub">${escapeHtml(sub)}</div>
                </div>`;
            return h;
        }

        // ===== Hero Carousel (rotativo entre featured) =====
        function buildHeroCarousel(featuredApps) {
            const wrap = document.createElement('div');
            wrap.className = 'store-hero-carousel';

            let activeIdx = 0;
            const slides = featuredApps.map(app => {
                const slide = document.createElement('div');
                slide.className = 'store-hero-slide';
                slide.style.background = heroGradient(app.id);

                slide.innerHTML = `
                    <div class="store-hero-content">
                        <div class="store-hero-tag">${escapeHtml(tagLabel(app.tag) || T('store_tag_featured_app', { _d: 'APP EM DESTAQUE' }))}</div>
                        <h2 class="store-hero-name">${escapeHtml(app.name)}</h2>
                        <div class="store-hero-tagline">${escapeHtml(app.description)}</div>
                        <div class="store-hero-meta">
                            ${ratingStars(app.rating)} <span class="store-hero-meta-rating">${app.rating.toFixed(1)}</span>
                            <span class="store-hero-meta-dot">·</span>
                            <span>${escapeHtml(app.developer)}</span>
                            <span class="store-hero-meta-dot">·</span>
                            <span>${escapeHtml(app.categoryLabel || app.category)}</span>
                        </div>
                    </div>
                    <div class="store-hero-icon"></div>`;

                const iconWrap = slide.querySelector('.store-hero-icon');
                const appDef = window.OS.apps[app.id];
                if (appDef && appDef.buildIcon) iconWrap.appendChild(appDef.buildIcon());

                // Botão action no canto inferior do conteúdo
                const action = document.createElement('div');
                action.className = 'store-hero-actions';
                const installBtn = makeInstallButton(app, () => render());
                action.appendChild(installBtn);
                const detailBtn = document.createElement('button');
                detailBtn.className = 'store-hero-secondary';
                detailBtn.textContent = T('store_btn_learn_more', { _d: 'Saber Mais' });
                detailBtn.addEventListener('click', () => go({ type: 'app-detail', appId: app.id }));
                action.appendChild(detailBtn);
                slide.querySelector('.store-hero-content').appendChild(action);

                return slide;
            });

            const slidesWrap = document.createElement('div');
            slidesWrap.className = 'store-hero-slides';
            slides.forEach(s => slidesWrap.appendChild(s));
            wrap.appendChild(slidesWrap);

            // Pagination dots
            if (featuredApps.length > 1) {
                const dots = document.createElement('div');
                dots.className = 'store-hero-dots';
                featuredApps.forEach((_, idx) => {
                    const dot = document.createElement('button');
                    dot.className = 'store-hero-dot' + (idx === 0 ? ' active' : '');
                    dot.addEventListener('click', () => goTo(idx));
                    dots.appendChild(dot);
                });
                wrap.appendChild(dots);

                function goTo(idx) {
                    activeIdx = idx;
                    slidesWrap.style.transform = `translateX(-${idx * 100}%)`;
                    dots.querySelectorAll('.store-hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
                }

                // Auto-rotate
                let interval = setInterval(() => {
                    activeIdx = (activeIdx + 1) % featuredApps.length;
                    goTo(activeIdx);
                }, 6000);

                // Pausa ao hover
                wrap.addEventListener('mouseenter', () => clearInterval(interval));
                wrap.addEventListener('mouseleave', () => {
                    clearInterval(interval);
                    interval = setInterval(() => {
                        activeIdx = (activeIdx + 1) % featuredApps.length;
                        goTo(activeIdx);
                    }, 6000);
                });
            }

            return wrap;
        }

        function heroGradient(appId) {
            const palette = {
                companyManagement: 'linear-gradient(135deg, #1e40af 0%, #6a3ed8 50%, #af52de 100%)',
                browser:           'linear-gradient(135deg, #0d3a8c 0%, #2470d8 50%, #5fbcff 100%)',
                notes:             'linear-gradient(135deg, #d4a020 0%, #ff9f0a 50%, #ffe57f 100%)',
                reminders:         'linear-gradient(135deg, #c2261c 0%, #ff453a 50%, #ff7066 100%)',
                calendar:          'linear-gradient(135deg, #d62b1d 0%, #ff5b50 50%, #ff9080 100%)',
                clock:             'linear-gradient(135deg, #1c1c20 0%, #3a3a40 50%, #5a5a60 100%)',
                settings:          'linear-gradient(135deg, #3a3f4b 0%, #6e7480 50%, #a5acb8 100%)',
                calculator:        'linear-gradient(135deg, #1c1c1e 0%, #3a3a3e 50%, #5c5c5c 100%)',
            };
            return palette[appId] || 'linear-gradient(135deg,#2470d8,#6a3ed8,#af52de)';
        }

        function tagLabel(tag) {
            return {
                editor:   T('store_tag_editor',   { _d: 'ESCOLHA OXLYN' }),
                new:      T('store_tag_new',      { _d: 'NOVO' }),
                trending: T('store_tag_trending', { _d: 'EM ALTA' }),
            }[tag];
        }

        function ratingStars(rating) {
            const full = Math.floor(rating);
            const half = (rating % 1) >= 0.5 ? 1 : 0;
            const empty = 5 - full - half;
            return '<span class="store-stars">' +
                '★'.repeat(full) +
                (half ? '★' : '') +
                '☆'.repeat(empty) +
                '</span>';
        }

        // ===== Horizontal scroll de apps (cards maiores) =====
        function buildHorizontalScroll(items) {
            const wrap = document.createElement('div');
            wrap.className = 'store-hscroll';
            items.forEach(a => wrap.appendChild(buildBigCard(a)));
            return wrap;
        }

        function buildBigCard(a) {
            const card = document.createElement('div');
            card.className = 'store-bigcard';
            const installed = window.OS.api.isInstalled(a.id);

            const ic = document.createElement('div');
            ic.className = 'store-bigcard-icon';
            const appDef = window.OS.apps[a.id];
            if (appDef && appDef.buildIcon) ic.appendChild(appDef.buildIcon());
            card.appendChild(ic);

            const info = document.createElement('div');
            info.className = 'store-bigcard-info';

            const tagBadge = a.tag ? `<span class="store-tag-badge tag-${a.tag}">${escapeHtml(tagLabel(a.tag))}</span>` : '';
            info.innerHTML = `
                <div class="store-bigcard-cat">${tagBadge}${escapeHtml(a.categoryLabel || a.category)}</div>
                <h3 class="store-bigcard-name">${escapeHtml(a.name)}</h3>
                <div class="store-bigcard-desc">${escapeHtml(a.description)}</div>
                <div class="store-bigcard-meta">
                    ${ratingStars(a.rating)} <span style="color:var(--text-3)">${a.rating.toFixed(1)}</span>
                </div>`;
            card.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'store-bigcard-actions';
            actions.appendChild(makeInstallButton(a, () => render()));
            card.appendChild(actions);

            // Card todo é clicável (exceto botão)
            card.addEventListener('click', e => {
                if (e.target.closest('button, .install-button-wrap, .download-ring, .kebab-menu')) return;
                go({ type: 'app-detail', appId: a.id });
            });

            return card;
        }

        // ===== Tiles de categorias (visual) =====
        function buildCategoryTiles() {
            const cats = [
                { id: 'productivity', name: T('store_category_productivity', { _d: 'Produtividade' }), icon: '⚡', color: '#0ea5e9' },
                { id: 'work',         name: T('store_category_work',         { _d: 'Trabalho' }),      icon: '💼', color: '#a855f7' },
                { id: 'utilities',    name: T('store_category_utilities',    { _d: 'Utilitários' }),   icon: '🛠',  color: '#f59e0b' },
                { id: 'internet',     name: T('store_category_internet',     { _d: 'Internet' }),      icon: '🌐', color: '#06b6d4' },
                { id: 'system',       name: T('store_category_system',       { _d: 'Sistema' }),       icon: '⚙',  color: '#6b7280' },
            ];
            const wrap = document.createElement('div');
            wrap.className = 'store-cat-tiles';
            cats.forEach(c => {
                const count = catalog.filter(a => a.category === { productivity: 'Produtividade', work: 'Trabalho', utilities: 'Utilitários', internet: 'Internet', system: 'Sistema' }[c.id]).length;
                const tile = document.createElement('div');
                tile.className = 'store-cat-tile';
                tile.style.setProperty('--cat-color', c.color);
                const countLabel = count === 1
                    ? T('store_msg_app_count_one',  { count: count, _d: '1 app' })
                    : T('store_msg_app_count_many', { count: count, _d: `${count} apps` });
                tile.innerHTML = `
                    <div class="store-cat-icon">${c.icon}</div>
                    <div class="store-cat-name">${escapeHtml(c.name)}</div>
                    <div class="store-cat-count">${escapeHtml(countLabel)}</div>`;
                tile.addEventListener('click', () => {
                    navStack.length = 0;
                    navStack.push({ type: 'list', tab: c.id });
                    render();
                });
                wrap.appendChild(tile);
            });
            return wrap;
        }

        // ===== Card normal (lista) =====
        function buildCard(a) {
            const card = document.createElement('div');
            card.className = 'store-card';
            card.dataset.cardId = a.id;

            const ic = document.createElement('div');
            ic.className = 'store-card-icon';
            const appDef = window.OS.apps[a.id];
            if (appDef && appDef.buildIcon) ic.appendChild(appDef.buildIcon());

            const info = document.createElement('div');
            info.className = 'store-card-info';
            const tagBadge = a.tag ? `<span class="store-tag-badge tag-${a.tag}" style="margin-right:6px">${escapeHtml(tagLabel(a.tag))}</span>` : '';
            info.innerHTML = `
                <h3>${tagBadge}${escapeHtml(a.name)}</h3>
                <div class="dev">${escapeHtml(a.developer)} · ${escapeHtml(a.categoryLabel || a.category)}</div>
                <div class="desc">${escapeHtml(a.description)}</div>`;

            const actions = document.createElement('div');
            actions.className = 'store-card-actions';
            actions.appendChild(makeInstallButton(a, () => render()));
            if (!window.OS.api.isInstalled(a.id)) {
                const rating = document.createElement('div');
                rating.className = 'store-card-rating';
                rating.innerHTML = `${ratingStars(a.rating)} <span style="color:var(--text-3)">(${a.ratings || 0})</span>`;
                rating.style.fontSize = '11px';
                actions.appendChild(rating);
            }

            card.appendChild(ic);
            card.appendChild(info);
            card.appendChild(actions);

            card.addEventListener('click', e => {
                if (e.target.closest('button, .install-button-wrap, .download-ring, .kebab-menu')) return;
                go({ type: 'app-detail', appId: a.id });
            });

            return card;
        }

        // ===== Botão de instalação (state machine) =====
        function makeInstallButton(app, onAfter) {
            const wrap = document.createElement('div');
            wrap.className = 'install-button-wrap';

            const isInstalled = window.OS.api.isInstalled(app.id);
            if (isInstalled) {
                const openBtn = document.createElement('button');
                openBtn.className = 'pill-btn pill-btn-installed';
                openBtn.textContent = T('store_btn_open', { _d: 'Abrir' });
                openBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    window.OS.api.openApp(app.id);
                });
                wrap.appendChild(openBtn);

                const isCore = (app.id === 'appstore' || app.id === 'settings' || app.id === 'calculator');
                if (!isCore) {
                    wrap.appendChild(makeKebabMenu(app, onAfter));
                }
                return wrap;
            }

            const getBtn = document.createElement('button');
            getBtn.className = 'pill-btn pill-btn-get';
            getBtn.textContent = T('store_btn_get', { _d: 'OBTER' });
            getBtn.addEventListener('click', e => {
                e.stopPropagation();
                startDownload(wrap, app, onAfter);
            });
            wrap.appendChild(getBtn);
            return wrap;
        }

        function startDownload(wrap, app, onAfter) {
            wrap.innerHTML = '';
            const ring = document.createElement('div');
            ring.className = 'download-ring';
            ring.innerHTML = `
                <svg viewBox="0 0 36 36" width="40" height="40">
                    <circle class="ring-track" cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2.5"/>
                    <circle class="ring-fill"  cx="18" cy="18" r="15.5" fill="none" stroke="#0a84ff" stroke-width="2.5"
                            stroke-linecap="round" stroke-dasharray="97.4" stroke-dashoffset="97.4"
                            transform="rotate(-90 18 18)"/>
                </svg>
                <div class="ring-stop"></div>
                <div class="ring-pct">0%</div>`;
            wrap.appendChild(ring);

            const fillCircle = ring.querySelector('.ring-fill');
            const pctEl = ring.querySelector('.ring-pct');
            const C = 2 * Math.PI * 15.5;
            let progress = 0;
            let installing = false;
            let cancelled = false;

            ring.addEventListener('click', e => {
                e.stopPropagation();
                if (installing) return;
                cancelled = true;
                clearInterval(tick);
                renderRevert();
            });

            function renderRevert() {
                wrap.innerHTML = '';
                const getBtn = document.createElement('button');
                getBtn.className = 'pill-btn pill-btn-get';
                getBtn.textContent = T('store_btn_get', { _d: 'OBTER' });
                getBtn.addEventListener('click', e => { e.stopPropagation(); startDownload(wrap, app, onAfter); });
                wrap.appendChild(getBtn);
            }

            const tick = setInterval(() => {
                if (cancelled) return;
                progress += 3 + Math.random() * 7;
                if (progress >= 100) progress = 100;
                fillCircle.style.strokeDashoffset = String(C * (1 - progress/100));
                pctEl.textContent = Math.floor(progress) + '%';

                if (progress >= 100 && !installing) {
                    installing = true;
                    clearInterval(tick);
                    pctEl.textContent = '...';
                    ring.classList.add('installing');
                    setTimeout(() => {
                        if (cancelled) return;
                        ring.classList.add('done');
                        ring.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#34c759" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
                        setTimeout(() => {
                            window.OS.api.installApp(app.id);
                            if (window.OS.api.notify) {
                                window.OS.api.notify({
                                    type: 'success',
                                    app: T('store_title_main', { _d: 'Loja de Apps' }),
                                    title: app.name,
                                    message: T('store_notify_installed_success', { _d: 'Foi instalada com sucesso.' }),
                                });
                            }
                            if (onAfter) onAfter();
                        }, 600);
                    }, 800);
                }
            }, 110);
        }

        function makeKebabMenu(app, onAfter) {
            const wrap = document.createElement('div');
            wrap.className = 'kebab-menu';
            const btn = document.createElement('button');
            btn.className = 'kebab-btn';
            btn.title = T('store_btn_more_options', { _d: 'Mais opções' });
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`;
            wrap.appendChild(btn);

            btn.addEventListener('click', e => {
                e.stopPropagation();
                window.OS.api.showFloatingMenu(btn, [
                    { label: T('store_btn_view_details',     { _d: 'Ver Detalhes' }),           onClick: () => go({ type: 'app-detail', appId: app.id }) },
                    { label: T('store_btn_check_updates',    { _d: 'Verificar Atualizações' }), onClick: () => showUpToDateModal(app) },
                    '---',
                    { label: T('store_btn_uninstall',        { _d: 'Desinstalar' }), danger: true, onClick: () => showUninstallModal(app, onAfter) },
                ]);
            });

            return wrap;
        }

        function showUpToDateModal(app) {
            window.OS.api.showModal({
                title: T('store_modal_uptodate_title',   { name: app.name, _d: `${app.name} está atualizado` }),
                subtitle: T('store_modal_uptodate_subtitle', { version: app.version, _d: `Versão ${app.version} é a mais recente disponível.` }),
                actions: [{ label: T('store_btn_ok', { _d: 'OK' }), style: 'primary' }],
            });
        }

        function showUninstallModal(app, onAfter) {
            window.OS.api.showModal({
                title: T('store_modal_uninstall_title',    { name: app.name, _d: `Desinstalar "${app.name}"?` }),
                subtitle: T('store_modal_uninstall_subtitle', { _d: 'A app será removida do teu sistema. Os dados (notas, lembretes, etc.) NÃO são apagados — podes reinstalar a qualquer momento.' }),
                actions: [
                    { label: T('store_btn_cancel',    { _d: 'Cancelar' }) },
                    { label: T('store_btn_uninstall', { _d: 'Desinstalar' }), style: 'danger', onClick: () => {
                        window.OS.api.uninstallApp(app.id);
                        if (window.OS.api.notify) {
                            window.OS.api.notify({
                                type: 'info',
                                app: T('store_title_main', { _d: 'Loja de Apps' }),
                                title: T('store_notify_uninstalled_title', { _d: 'App desinstalada' }),
                                message: app.name,
                            });
                        }
                        if (onAfter) onAfter();
                    }},
                ],
            });
        }

        // ===== Render: Detalhe da App =====
        function renderDetail(parent, appId) {
            const app = catalog.find(a => a.id === appId);
            if (!app) {
                parent.innerHTML = `<p class="muted">${escapeHtml(T('store_msg_app_not_found', { _d: 'App não encontrada.' }))}</p>`;
                return;
            }

            // Botão back
            const backBar = document.createElement('div');
            backBar.className = 'detail-back';
            backBar.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> <span>${escapeHtml(T('store_btn_back', { _d: 'Voltar' }))}</span>`;
            backBar.addEventListener('click', back);
            parent.appendChild(backBar);

            // Hero
            const hero = document.createElement('div');
            hero.className = 'detail-hero';
            const heroIcon = document.createElement('div');
            heroIcon.className = 'detail-hero-icon';
            const appDef = window.OS.apps[app.id];
            if (appDef && appDef.buildIcon) heroIcon.appendChild(appDef.buildIcon());
            hero.appendChild(heroIcon);

            const heroText = document.createElement('div');
            heroText.className = 'detail-hero-text';
            heroText.innerHTML = `
                <div class="detail-name">${escapeHtml(app.name)}${app.tag ? `<span class="store-tag-badge tag-${app.tag}" style="margin-left:10px;font-size:11px">${escapeHtml(tagLabel(app.tag))}</span>` : ''}</div>
                <div class="detail-dev">${escapeHtml(app.developer)}</div>
                <div class="detail-rating">
                    ${ratingStars(app.rating)}
                    <span style="font-weight:700;font-size:18px;margin-left:6px">${app.rating.toFixed(1)}</span>
                    <span style="color:var(--text-3);margin-left:8px">${escapeHtml(T('store_label_ratings_count', { count: app.ratings, _d: `${app.ratings} avaliações` }))}</span>
                </div>`;

            const heroActions = document.createElement('div');
            heroActions.className = 'detail-hero-actions';
            heroActions.appendChild(makeInstallButton(app, () => render()));
            heroText.appendChild(heroActions);

            const heroMeta = document.createElement('div');
            heroMeta.className = 'detail-meta-inline';
            heroMeta.innerHTML = `<span>${escapeHtml(app.size)}</span> · <span>${escapeHtml(app.categoryLabel || app.category)}</span> · <span>v${escapeHtml(app.version)}</span>`;
            heroText.appendChild(heroMeta);

            hero.appendChild(heroText);
            parent.appendChild(hero);

            // Quick info row
            const quickInfo = document.createElement('div');
            quickInfo.className = 'detail-quick';
            quickInfo.innerHTML = `
                <div class="quick-cell">
                    <div class="quick-label">${escapeHtml(T('store_label_rating',     { _d: 'Avaliação' }))}</div>
                    <div class="quick-value">${app.rating.toFixed(1)}<small> / 5</small></div>
                    <div class="quick-sub" style="color:#ffb340">${ratingStars(app.rating)}</div>
                </div>
                <div class="quick-cell">
                    <div class="quick-label">${escapeHtml(T('store_label_age',        { _d: 'Idade' }))}</div>
                    <div class="quick-value">${escapeHtml(app.age)}</div>
                    <div class="quick-sub">${escapeHtml(T('store_label_age_years',    { _d: 'Anos' }))}</div>
                </div>
                <div class="quick-cell">
                    <div class="quick-label">${escapeHtml(T('store_label_category',   { _d: 'Categoria' }))}</div>
                    <div class="quick-value-sm">${escapeHtml(app.categoryLabel || app.category)}</div>
                    <div class="quick-sub"></div>
                </div>
                <div class="quick-cell">
                    <div class="quick-label">${escapeHtml(T('store_label_developer', { _d: 'Programador' }))}</div>
                    <div class="quick-value-sm">${escapeHtml(app.developer)}</div>
                    <div class="quick-sub"></div>
                </div>
                <div class="quick-cell">
                    <div class="quick-label">${escapeHtml(T('store_label_language',  { _d: 'Idioma' }))}</div>
                    <div class="quick-value-sm">${escapeHtml(app.languages)}</div>
                    <div class="quick-sub"></div>
                </div>`;
            parent.appendChild(quickInfo);

            // Capturas de ecrã
            const shots = document.createElement('div');
            shots.className = 'detail-section';
            shots.innerHTML = `<h2>${escapeHtml(T('store_section_screenshots', { _d: 'Capturas de Ecrã' }))}</h2>`;
            const shotRow = document.createElement('div');
            shotRow.className = 'detail-shots';
            const themes = [
                heroGradient(app.id),
                'linear-gradient(135deg,#1a1a2e,#16213e)',
                'linear-gradient(135deg,#0f3460,#16213e)',
            ];
            themes.forEach((bg, i) => {
                const sh = document.createElement('div');
                sh.className = 'detail-shot';
                sh.style.background = bg;
                sh.innerHTML = `
                    <div class="shot-fake-titlebar">
                        <span class="shot-tl"></span><span class="shot-tl"></span><span class="shot-tl"></span>
                    </div>
                    <div class="shot-fake-content">
                        <div class="shot-bar"></div>
                        <div class="shot-bar short"></div>
                        <div class="shot-bar"></div>
                        <div class="shot-bar med"></div>
                    </div>
                    <div class="shot-label">${escapeHtml(T('store_label_screenshot_n', { n: i+1, _d: `Captura ${i+1}` }))}</div>`;
                shotRow.appendChild(sh);
            });
            shots.appendChild(shotRow);
            parent.appendChild(shots);

            // Descrição
            const desc = document.createElement('div');
            desc.className = 'detail-section';
            desc.innerHTML = `<h2>${escapeHtml(T('store_section_description', { _d: 'Descrição' }))}</h2>`;
            const descBody = document.createElement('div');
            descBody.className = 'detail-text';
            descBody.textContent = app.longDesc;
            desc.appendChild(descBody);
            parent.appendChild(desc);

            // Avaliações (Reviews)
            const reviews = REVIEWS[app.id] || [];
            if (reviews.length) {
                const reviewSection = document.createElement('div');
                reviewSection.className = 'detail-section';
                reviewSection.innerHTML = `<h2>${escapeHtml(T('store_section_reviews', { _d: 'Avaliações e Críticas' }))}</h2>`;
                const ratingSummary = document.createElement('div');
                ratingSummary.className = 'review-summary';
                ratingSummary.innerHTML = `
                    <div class="review-summary-num">${app.rating.toFixed(1)}</div>
                    <div class="review-summary-stars">${ratingStars(app.rating)}</div>
                    <div class="review-summary-count">${escapeHtml(T('store_label_ratings_count', { count: app.ratings, _d: `${app.ratings} avaliações` }))}</div>`;
                reviewSection.appendChild(ratingSummary);

                const reviewList = document.createElement('div');
                reviewList.className = 'review-list';
                reviews.forEach(r => {
                    const item = document.createElement('div');
                    item.className = 'review-item';
                    item.innerHTML = `
                        <div class="review-head">
                            <span class="review-author">${escapeHtml(r.author)}</span>
                            <span class="review-stars">${ratingStars(r.rating)}</span>
                            <span class="review-date">${escapeHtml(r.date)}</span>
                        </div>
                        <div class="review-text">${escapeHtml(r.text)}</div>`;
                    reviewList.appendChild(item);
                });
                reviewSection.appendChild(reviewList);
                parent.appendChild(reviewSection);
            }

            // Novidades
            const news = document.createElement('div');
            news.className = 'detail-section';
            news.innerHTML = `<h2>${escapeHtml(T('store_section_whats_new', { _d: 'Novidades' }))}</h2>`;
            const newsBody = document.createElement('div');
            newsBody.className = 'detail-text';
            newsBody.textContent = app.whatsNew;
            news.appendChild(newsBody);
            parent.appendChild(news);

            // Apps similares (mesma categoria)
            const similar = catalog.filter(a => a.id !== app.id && a.category === app.category).slice(0, 4);
            if (similar.length) {
                const simSection = document.createElement('div');
                simSection.className = 'detail-section';
                simSection.innerHTML = `<h2>${escapeHtml(T('store_section_you_may_also_like', { _d: 'Também Podes Gostar' }))}</h2>`;
                const simWrap = document.createElement('div');
                simWrap.className = 'store-hscroll';
                similar.forEach(a => simWrap.appendChild(buildBigCard(a)));
                simSection.appendChild(simWrap);
                parent.appendChild(simSection);
            }

            // Informação técnica
            const info = document.createElement('div');
            info.className = 'detail-section';
            info.innerHTML = `<h2>${escapeHtml(T('store_section_information', { _d: 'Informação' }))}</h2>`;
            const infoTbl = document.createElement('div');
            infoTbl.className = 'detail-info-table';
            const rows = [
                [T('store_label_seller',          { _d: 'Vendedor' }),       app.seller],
                [T('store_label_size',            { _d: 'Tamanho' }),        app.size],
                [T('store_label_category',        { _d: 'Categoria' }),      app.categoryLabel || app.category],
                [T('store_label_compatibility',   { _d: 'Compatibilidade' }), T('store_value_compatibility', { _d: 'OxlynOS 14.0 ou superior' })],
                [T('store_label_languages',       { _d: 'Idiomas' }),        app.languages],
                [T('store_label_age',             { _d: 'Idade' }),          T('store_value_age_years', { age: app.age, _d: `${app.age} anos` })],
                [T('store_label_version',         { _d: 'Versão' }),         app.version],
            ];
            rows.forEach(([k, v]) => {
                const r = document.createElement('div');
                r.className = 'detail-info-row';
                r.innerHTML = `<div class="info-key">${escapeHtml(k)}</div><div class="info-val">${escapeHtml(v)}</div>`;
                infoTbl.appendChild(r);
            });
            info.appendChild(infoTbl);
            parent.appendChild(info);
        }

        // Sidebar interactions
        side.querySelectorAll('.sidebar-item').forEach(it => {
            it.addEventListener('click', () => {
                navStack.length = 0;
                navStack.push({ type: 'list', tab: it.dataset.tab });
                render();
            });
        });

        root.appendChild(side);
        root.appendChild(main);
        render();
        return root;
    }

    return {
        id: 'appstore',
        defaultName: 'Loja de Apps',
        get name() { return T('store_title_main', { _d: 'Loja de Apps' }); },
        defaultSize: { w: 1140, h: 760 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
