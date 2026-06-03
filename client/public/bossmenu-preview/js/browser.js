// ==========================================
//  OXLYN-BOSSMENU | App: Navegador (com páginas reais fictícias)
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.browser = (function () {
    function t(key, vars) {
        if (window.OS && typeof window.OS.t === 'function') return window.OS.t(key, vars);
        return (vars && vars._d) ? vars._d : key;
    }

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('browser');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(135deg,#7cd6ff,#0d3a8c);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;';
        d.textContent = '◎';
        return d;
    }

    function svg(path, size) {
        const s = size || 14;
        return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }

    // ==========================================
    // PÁGINAS PRÉ-CRIADAS
    // ==========================================
    // Cada página tem: title, render(navigateFn) → HTMLElement
    const PAGES = {
        'inicio': {
            get title() { return t('browser_title_home', { _d: 'Início — Oxlyn Browser' }); },
            url: 'oxlyn://inicio',
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'browser-home';
                w.innerHTML = `
                    <h1>${t('browser_label_search_heading', { _d: 'Procura' })}</h1>
                    <p>${t('browser_label_search_subtitle', { _d: 'O teu portal para a internet de Los Santos.' })}</p>`;

                const search = document.createElement('div');
                search.className = 'browser-search-box';
                search.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"/></svg>`;
                const sInput = document.createElement('input');
                sInput.type = 'text';
                sInput.placeholder = t('browser_placeholder_search', { _d: 'Pesquisar ou introduzir um endereço' });
                sInput.spellcheck = false;
                search.appendChild(sInput);
                w.appendChild(search);

                sInput.addEventListener('keydown', e => {
                    if (e.key === 'Enter' && sInput.value.trim()) {
                        navigate(sInput.value.trim());
                    }
                });

                const sec = document.createElement('div');
                sec.style.cssText = 'max-width: 760px; margin: 0 auto;';
                sec.innerHTML = `
                    <h2 style="font-size: 14px; font-weight: 600; color: rgba(255,255,255,.55); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 16px;">${t('browser_label_bookmarks', { _d: 'Sites Favoritos' })}</h2>`;

                const grid = document.createElement('div');
                grid.className = 'browser-bookmarks-grid';
                Object.values(PAGES).filter(p => p.bookmark !== false && p.url !== 'oxlyn://inicio').forEach(p => {
                    const b = document.createElement('div');
                    b.className = 'browser-bookmark';
                    b.innerHTML = `
                        <div class="bm-icon" style="background:${p.color || 'linear-gradient(135deg,#5fbcff,#6a3ed8)'}">${p.iconText || '🌐'}</div>
                        <div class="bm-name">${p.bookmarkName || p.title.split(' — ')[0]}</div>
                        <div class="bm-url">${p.url.replace('oxlyn://','').replace('https://','')}</div>`;
                    b.addEventListener('click', () => navigate(p.url));
                    grid.appendChild(b);
                });
                sec.appendChild(grid);
                w.appendChild(sec);
                setTimeout(() => sInput.focus(), 50);
                return w;
            },
        },

        'noticias.lsn': {
            get title() { return t('browser_title_news', { _d: 'Notícias LSN' }); },
            url: 'https://noticias.lsn',
            color: 'linear-gradient(135deg,#dc2626,#7c2d12)',
            iconText: '📰',
            get bookmarkName() { return t('browser_title_news', { _d: 'Notícias LSN' }); },
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'cap-page cap-news';
                w.innerHTML = `
                    <div class="cap-nav">
                        <div class="cap-brand"><span style="color:#dc2626">●</span> ${t('browser_news_brand', { _d: 'NOTÍCIAS' })} <span style="opacity:.5">LSN</span></div>
                        <div class="cap-nav-links">
                            <span class="cap-link">${t('browser_news_cat_politics', { _d: 'Política' })}</span>
                            <span class="cap-link">${t('browser_news_cat_business', { _d: 'Negócios' })}</span>
                            <span class="cap-link">${t('browser_news_cat_crime', { _d: 'Crime' })}</span>
                            <span class="cap-link">${t('browser_news_cat_sport', { _d: 'Desporto' })}</span>
                            <span class="cap-link">${t('browser_news_cat_tech', { _d: 'Tecnologia' })}</span>
                        </div>
                    </div>
                    <div class="cap-hero">
                        <div class="cap-hero-tag">${t('browser_news_breaking', { _d: 'ÚLTIMA HORA' })}</div>
                        <h1>${t('browser_news_hero_title', { _d: 'Mercado imobiliário em Los Santos atinge novo máximo histórico' })}</h1>
                        <p>${t('browser_news_hero_desc', { _d: 'Os preços das casas em Vinewood subiram 18% no último trimestre, segundo o relatório da Câmara Municipal divulgado esta manhã.' })}</p>
                        <div class="cap-hero-meta">${t('browser_news_hero_meta', { _d: 'Por <strong>Maria Costa</strong> · há 2 horas · 4 min de leitura' })}</div>
                    </div>
                    <div class="cap-grid">
                        ${[
                            { tag: t('browser_news_cat_business_caps', { _d: 'NEGÓCIOS' }), title: t('browser_news_a1_title', { _d: 'Bolsa LSC fecha com ganhos de 2.4%' }), desc: t('browser_news_a1_desc', { _d: 'Setor tecnológico lidera as subidas...' }), time: '3h' },
                            { tag: t('browser_news_cat_crime_caps', { _d: 'CRIME' }),       title: t('browser_news_a2_title', { _d: 'Operação policial detém 12 em Davis' }), desc: t('browser_news_a2_desc', { _d: 'A operação envolveu mais de 50 agentes...' }), time: '5h' },
                            { tag: t('browser_news_cat_sport_caps', { _d: 'DESPORTO' }),    title: t('browser_news_a3_title', { _d: 'LSC Vipers vencem clássico em Vespucci' }), desc: t('browser_news_a3_desc', { _d: 'Vitória por 3-1 garante liderança...' }), time: '8h' },
                            { tag: t('browser_news_cat_politics_caps', { _d: 'POLÍTICA' }), title: t('browser_news_a4_title', { _d: 'Mayor anuncia novo plano de transportes' }), desc: t('browser_news_a4_desc', { _d: 'Investimento de 2 bilhões previsto para os próximos 5 anos...' }), time: '12h' },
                            { tag: t('browser_news_cat_culture_caps', { _d: 'CULTURA' }),   title: t('browser_news_a5_title', { _d: 'Festival de Verão regressa a Vespucci Beach' }), desc: t('browser_news_a5_desc', { _d: 'Mais de 80 artistas confirmados...' }), time: '14h' },
                            { tag: t('browser_news_cat_auto_caps', { _d: 'AUTO' }),         title: t('browser_news_a6_title', { _d: 'Bravado revela novo modelo desportivo' }), desc: t('browser_news_a6_desc', { _d: 'O novo Banshee 900R chega ao mercado em junho...' }), time: '1d' },
                        ].map(a => `
                            <article class="cap-card">
                                <div class="cap-card-img" style="background: linear-gradient(135deg, #1f2937, #4b5563);"></div>
                                <div class="cap-card-body">
                                    <div class="cap-tag" style="color:#dc2626">${a.tag}</div>
                                    <h3>${a.title}</h3>
                                    <p>${a.desc}</p>
                                    <div class="cap-meta">${t('browser_msg_ago', { _d: 'há {time}', time: a.time })}</div>
                                </div>
                            </article>`).join('')}
                    </div>`;
                return w;
            },
        },

        'bleeter.lsn': {
            title: 'Bleeter',
            url: 'https://bleeter.lsn',
            color: 'linear-gradient(135deg,#facc15,#ca8a04)',
            iconText: 'B',
            bookmarkName: 'Bleeter',
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'cap-page cap-bleeter';
                const posts = [
                    { user: 'Lamar Davis', handle: '@lamardavis', avatar: '#7c3aed', time: '2m', text: t('browser_bleeter_post1', { _d: 'Acabei de ver um cara fazer uma manobra de skate incrível em Vinewood Hills! 🛹' }), likes: 234, replies: 18 },
                    { user: 'Tracey De Santa', handle: '@tracey_ds', avatar: '#ec4899', time: '15m', text: t('browser_bleeter_post2', { _d: 'Festa esta noite em Vespucci Beach! 🎉 Quem vem? #VespucciNight' }), likes: 1245, replies: 87 },
                    { user: 'Weazel News', handle: '@weazelnews', avatar: '#dc2626', time: '34m', text: t('browser_bleeter_post3', { _d: 'BREAKING: Nova ponte em Paleto Bay será inaugurada no próximo mês.' }), likes: 678, replies: 52 },
                    { user: 'Bravado Motors', handle: '@bravado_oficial', avatar: '#0ea5e9', time: '1h', text: t('browser_bleeter_post4', { _d: 'Apresentamos o novo Banshee 900R. Disponível nas concessionárias a partir de junho.' }), likes: 4521, replies: 312 },
                    { user: 'Franklin Clinton', handle: '@franklin_c', avatar: '#16a34a', time: '2h', text: t('browser_bleeter_post5', { _d: 'Trabalho duro paga. Sempre. 💪' }), likes: 9821, replies: 543 },
                    { user: 'Bleeter', handle: '@bleeter', avatar: '#facc15', time: '4h', text: t('browser_bleeter_post6', { _d: 'Bem-vindos ao Bleeter — partilha as tuas ideias em até 280 caracteres.' }), likes: 432, replies: 21 },
                ];
                w.innerHTML = `
                    <div class="cap-nav">
                        <div class="cap-brand"><span style="color:#facc15">B</span> Bleeter</div>
                        <div class="cap-nav-links"><span class="cap-link">${t('browser_bleeter_tab_home', { _d: 'Início' })}</span><span class="cap-link">${t('browser_bleeter_tab_trends', { _d: 'Tendências' })}</span><span class="cap-link">${t('browser_bleeter_tab_notif', { _d: 'Notificações' })}</span></div>
                    </div>
                    <div class="cap-feed">
                        <div class="cap-compose">
                            <div class="cap-avatar" style="background:#374151">P</div>
                            <input class="cap-compose-input" placeholder="${t('browser_bleeter_placeholder_compose', { _d: 'O que estás a pensar?' })}" />
                            <button class="cap-bleet">${t('browser_bleeter_btn_post', { _d: 'Bleetar' })}</button>
                        </div>
                        ${posts.map(p => `
                            <article class="cap-post">
                                <div class="cap-avatar" style="background:${p.avatar}">${p.user.charAt(0)}</div>
                                <div class="cap-post-body">
                                    <div class="cap-post-head">
                                        <strong>${p.user}</strong>
                                        <span class="cap-handle">${p.handle}</span>
                                        <span class="cap-dot">·</span>
                                        <span class="cap-time">${p.time}</span>
                                    </div>
                                    <div class="cap-post-text">${p.text}</div>
                                    <div class="cap-post-actions">
                                        <span>💬 ${p.replies}</span>
                                        <span>🔁 ${Math.floor(p.likes/8)}</span>
                                        <span>❤️ ${p.likes.toLocaleString('pt-PT')}</span>
                                        <span>📤</span>
                                    </div>
                                </div>
                            </article>`).join('')}
                    </div>`;
                return w;
            },
        },

        'lifeinvader.lsn': {
            title: 'LifeInvader',
            url: 'https://lifeinvader.lsn',
            color: 'linear-gradient(135deg,#22c55e,#15803d)',
            iconText: 'L',
            bookmarkName: 'LifeInvader',
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'cap-page cap-li';
                w.innerHTML = `
                    <div class="cap-nav">
                        <div class="cap-brand"><span style="color:#22c55e">L</span> LifeInvader</div>
                        <div class="cap-nav-links"><span class="cap-link">${t('browser_li_tab_wall', { _d: 'Mural' })}</span><span class="cap-link">${t('browser_li_tab_friends', { _d: 'Amigos' })}</span><span class="cap-link">${t('browser_li_tab_messages', { _d: 'Mensagens' })}</span></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 280px; gap: 18px; padding: 18px;">
                        <div>
                            <div class="cap-li-cover" style="height: 160px; background: linear-gradient(135deg, #16a34a, #064e3b); border-radius: 10px; margin-bottom: 14px;"></div>
                            ${[
                                { u: 'Michael De Santa', t: t('browser_li_post1', { _d: 'Pessoas mudam. Eu acho.' }), time: '20m', likes: 89 },
                                { u: 'Trevor Philips', t: t('browser_li_post2', { _d: 'TPI a contratar. Bons benefícios. Não pergunta sobre o passado.' }), time: '1h', likes: 234 },
                                { u: 'Vinewood Stars', t: t('browser_li_post3', { _d: 'Os 10 atores mais bem pagos de Vinewood este ano!' }), time: '3h', likes: 1245 },
                            ].map(p => `
                                <article class="cap-post" style="background: rgba(255,255,255,.04); border-radius: 10px; padding: 14px; margin-bottom: 12px;">
                                    <div class="cap-post-head">
                                        <strong>${p.u}</strong>
                                        <span class="cap-dot">·</span>
                                        <span class="cap-time">${p.time}</span>
                                    </div>
                                    <div class="cap-post-text">${p.t}</div>
                                    <div class="cap-post-actions"><span>👍 ${p.likes}</span><span>💬 ${t('browser_li_btn_comment', { _d: 'Comentar' })}</span></div>
                                </article>`).join('')}
                        </div>
                        <aside style="background: rgba(255,255,255,.04); border-radius: 10px; padding: 16px; height: fit-content;">
                            <div style="font-size: 12px; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; font-weight: 600;">${t('browser_li_label_friend_sug', { _d: 'Sugestões de Amizade' })}</div>
                            ${['Lamar Davis','Ron Jakowski','Wade Hebert'].map(n => `
                                <div style="display:flex; align-items:center; gap:10px; padding: 8px 0;">
                                    <div class="cap-avatar" style="background:#3b82f6; width:36px; height:36px;">${n.charAt(0)}</div>
                                    <div style="flex:1; font-size:13px; font-weight:500;">${n}</div>
                                    <button class="cap-bleet" style="font-size:11px; padding:4px 10px;">${t('browser_li_btn_add', { _d: 'Adicionar' })}</button>
                                </div>`).join('')}
                        </aside>
                    </div>`;
                return w;
            },
        },

        'weazel.lsn': {
            title: 'Weazel News',
            url: 'https://weazel.lsn',
            color: 'linear-gradient(135deg,#f97316,#9a3412)',
            iconText: 'W',
            bookmarkName: 'Weazel News',
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'cap-page';
                w.innerHTML = `
                    <div class="cap-nav" style="background: rgba(249,115,22,.08); border-bottom: 2px solid #f97316;">
                        <div class="cap-brand" style="font-size: 22px;">WEAZEL <span style="color:#f97316; font-weight: 800;">NEWS</span></div>
                        <div class="cap-nav-links"><span class="cap-link">${t('browser_weazel_tab_live', { _d: 'AO VIVO 🔴' })}</span><span class="cap-link">${t('browser_weazel_tab_shows', { _d: 'Programas' })}</span><span class="cap-link">${t('browser_weazel_tab_weather', { _d: 'Tempo' })}</span></div>
                    </div>
                    <div style="padding: 24px;">
                        <div style="background: linear-gradient(135deg,#1a1a1f,#000); border-radius: 14px; padding: 32px; color: #fff; text-align: center; margin-bottom: 24px;">
                            <div style="display:inline-block; background: #dc2626; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">${t('browser_weazel_label_onair', { _d: '🔴 EM DIRETO' })}</div>
                            <h1 style="font-size: 26px; font-weight: 700; margin-bottom: 8px;">${t('browser_weazel_hero_title', { _d: 'Conferência de Imprensa do Mayor' })}</h1>
                            <p style="color: rgba(255,255,255,.7); font-size: 14px;">${t('browser_weazel_hero_sub', { _d: 'A começar dentro de momentos · 2.4k a ver' })}</p>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:14px;">
                            ${[
                                { city: 'Los Santos',   temp: 24, w: '☀️', desc: t('browser_weather_sun', { _d: 'Sol' }) },
                                { city: 'Sandy Shores', temp: 32, w: '🌵', desc: t('browser_weather_hot', { _d: 'Quente' }) },
                                { city: 'Paleto Bay',   temp: 18, w: '🌫️', desc: t('browser_weather_fog', { _d: 'Nevoeiro' }) },
                            ].map(c => `
                                <div style="background: rgba(255,255,255,.04); border-radius: 12px; padding: 18px; text-align: center;">
                                    <div style="font-size: 48px; margin-bottom: 4px;">${c.w}</div>
                                    <div style="font-size: 28px; font-weight: 600;">${c.temp}°</div>
                                    <div style="font-size: 13px; color: rgba(255,255,255,.6); margin-top: 4px;">${c.city}</div>
                                    <div style="font-size: 11px; color: rgba(255,255,255,.4); text-transform: uppercase;">${c.desc}</div>
                                </div>`).join('')}
                        </div>
                    </div>`;
                return w;
            },
        },

        'bolsa.lsn': {
            get title() { return t('browser_title_stock', { _d: 'Bolsa LSC' }); },
            url: 'https://bolsa.lsn',
            color: 'linear-gradient(135deg,#10b981,#064e3b)',
            iconText: '📈',
            get bookmarkName() { return t('browser_title_stock', { _d: 'Bolsa LSC' }); },
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'cap-page';
                const stocks = [
                    { sym: 'BRAV',  name: 'Bravado Motors',     price: 134.50, change: +2.3 },
                    { sym: 'AUGY',  name: 'Augury Insurance',   price:  87.25, change: -1.4 },
                    { sym: 'BAWS',  name: 'BAWSAQ Holdings',    price: 211.80, change: +4.7 },
                    { sym: 'WEZL',  name: 'Weazel Group',       price:  56.40, change: +0.8 },
                    { sym: 'AMMU',  name: 'Ammu-Nation Inc.',   price: 178.95, change: -3.2 },
                    { sym: 'CLUC',  name: 'Cluckin\'Bell',      price:  42.10, change: +1.6 },
                    { sym: 'PISW',  name: 'Pisswasser Beer',    price:  28.30, change: -0.5 },
                    { sym: 'EMCO',  name: 'EmCorp Industries',  price: 412.00, change: +6.2 },
                ];
                w.innerHTML = `
                    <div class="cap-nav">
                        <div class="cap-brand"><span style="color:#10b981">📈</span> ${t('browser_stock_brand', { _d: 'BOLSA' })} <span style="opacity:.5">LSC</span></div>
                        <div class="cap-nav-links"><span class="cap-link">${t('browser_stock_tab_market', { _d: 'Mercado' })}</span><span class="cap-link">${t('browser_stock_tab_watchlist', { _d: 'Watchlist' })}</span><span class="cap-link">${t('browser_stock_tab_news', { _d: 'Notícias' })}</span></div>
                    </div>
                    <div style="padding: 24px;">
                        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${t('browser_stock_title_live', { _d: 'Mercado em Direto' })}</h1>
                        <p style="color: var(--text-3); margin-bottom: 24px;">${t('browser_stock_label_lastupdate', { _d: 'Última atualização: agora mesmo' })}</p>
                        <table style="width:100%; border-collapse:collapse; background: rgba(255,255,255,.03); border-radius: 10px; overflow: hidden;">
                            <thead>
                                <tr style="background: rgba(255,255,255,.04); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: .5px;">
                                    <th style="padding: 12px 16px; text-align:left;">${t('browser_stock_th_symbol', { _d: 'Símbolo' })}</th>
                                    <th style="padding: 12px 16px; text-align:left;">${t('browser_stock_th_name', { _d: 'Nome' })}</th>
                                    <th style="padding: 12px 16px; text-align:right;">${t('browser_stock_th_price', { _d: 'Preço' })}</th>
                                    <th style="padding: 12px 16px; text-align:right;">${t('browser_stock_th_change', { _d: 'Variação' })}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stocks.map(s => `
                                    <tr style="border-top: 1px solid rgba(255,255,255,.04); font-size: 13.5px;">
                                        <td style="padding: 12px 16px; font-weight: 700; font-family: monospace;">${s.sym}</td>
                                        <td style="padding: 12px 16px; color: var(--text-2);">${s.name}</td>
                                        <td style="padding: 12px 16px; text-align: right; font-feature-settings: 'tnum' 1;">$ ${s.price.toFixed(2)}</td>
                                        <td style="padding: 12px 16px; text-align: right; color: ${s.change >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                                            ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%
                                        </td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>`;
                return w;
            },
        },

        'oxlyn.lsn': {
            title: 'Oxlyn Software',
            url: 'https://oxlyn.lsn',
            color: 'linear-gradient(135deg,#5fbcff,#6a3ed8)',
            iconText: 'O',
            bookmarkName: 'Oxlyn',
            render(navigate) {
                const w = document.createElement('div');
                w.className = 'cap-page';
                w.innerHTML = `
                    <div class="cap-nav" style="background: linear-gradient(180deg, rgba(106,62,216,.15), transparent);">
                        <div class="cap-brand" style="font-size: 18px;"><span style="background: linear-gradient(135deg,#5fbcff,#6a3ed8); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800;">OXLYN</span> Software</div>
                        <div class="cap-nav-links"><span class="cap-link">${t('browser_oxlyn_tab_products', { _d: 'Produtos' })}</span><span class="cap-link">${t('browser_oxlyn_tab_support', { _d: 'Suporte' })}</span><span class="cap-link">${t('browser_oxlyn_tab_about', { _d: 'Sobre' })}</span></div>
                    </div>
                    <div style="padding: 60px 32px; text-align: center;">
                        <h1 style="font-size: 42px; font-weight: 700; letter-spacing: -1px; margin-bottom: 14px;">${t('browser_oxlyn_hero_title', { _d: 'Bem-vindo ao OxlynOS' })}</h1>
                        <p style="font-size: 16px; color: var(--text-2); max-width: 580px; margin: 0 auto 32px;">${t('browser_oxlyn_hero_desc', { _d: 'Software pensado para o teu PC. Apps, ferramentas e atualizações — tudo em um só lugar.' })}</p>
                        <div style="display:flex; gap:12px; justify-content:center; margin-bottom: 50px;">
                            <button class="cap-bleet" style="padding: 10px 22px; background: var(--accent);">${t('browser_oxlyn_btn_download', { _d: 'Descarregar Apps' })}</button>
                            <button class="cap-bleet" style="padding: 10px 22px; background: rgba(255,255,255,.10);">${t('browser_oxlyn_btn_more', { _d: 'Saber Mais' })}</button>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 760px; margin: 0 auto;">
                            ${[
                                { t: t('browser_oxlyn_card1_title', { _d: 'Loja de Apps' }), d: t('browser_oxlyn_card1_desc', { _d: 'Centenas de apps verificadas para o teu PC.' }) },
                                { t: t('browser_oxlyn_card2_title', { _d: 'OxlynOS 15.2' }), d: t('browser_oxlyn_card2_desc', { _d: 'O sistema operativo mais leve e rápido de sempre.' }) },
                                { t: t('browser_oxlyn_card3_title', { _d: 'Suporte 24/7' }), d: t('browser_oxlyn_card3_desc', { _d: 'A nossa equipa disponível para te ajudar.' }) },
                            ].map(c => `
                                <div style="background: rgba(255,255,255,.04); border-radius: 12px; padding: 22px; text-align: left;">
                                    <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">${c.t}</h3>
                                    <p style="font-size: 13px; color: var(--text-3); line-height: 1.5;">${c.d}</p>
                                </div>`).join('')}
                        </div>
                    </div>`;
                return w;
            },
        },
    };

    // Resolver texto digitado pelo utilizador → page key
    function resolveQuery(q) {
        const lower = q.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^oxlyn:\/\//, '').replace(/^www\./, '');
        // Procura match exato por URL
        for (const key in PAGES) {
            const p = PAGES[key];
            const purl = p.url.replace(/^https?:\/\//, '').replace(/^oxlyn:\/\//, '');
            if (purl === lower || key === lower) return key;
        }
        // Procura match parcial por nome
        const found = Object.keys(PAGES).find(k => {
            const p = PAGES[k];
            return p.title.toLowerCase().includes(lower) || k.includes(lower);
        });
        if (found) return found;
        return null;
    }

    function buildContent(win, cfg, locale) {
        cfg = cfg || {};
        const root = document.createElement('div');
        root.className = 'browser-app';

        // ---------- Toolbar ----------
        const toolbar = document.createElement('div');
        toolbar.className = 'browser-toolbar';

        const nav = document.createElement('div');
        nav.className = 'browser-nav';
        const backBtn = document.createElement('button');
        backBtn.className = 'browser-btn'; backBtn.title = t('browser_btn_back', { _d: 'Voltar' });
        backBtn.innerHTML = svg('M15 18l-6-6 6-6');
        const fwdBtn = document.createElement('button');
        fwdBtn.className = 'browser-btn'; fwdBtn.title = t('browser_btn_forward', { _d: 'Avançar' });
        fwdBtn.innerHTML = svg('M9 6l6 6-6 6');
        nav.appendChild(backBtn);
        nav.appendChild(fwdBtn);

        const addrWrap = document.createElement('div');
        addrWrap.className = 'browser-address-wrap';
        addrWrap.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 2a5 5 0 015 5v3h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2h1V7a5 5 0 015-5zm3 8V7a3 3 0 10-6 0v3h6z"/></svg>`;
        const addrInput = document.createElement('input');
        addrInput.type = 'text';
        addrInput.className = 'browser-address';
        addrInput.placeholder = t('browser_placeholder_search', { _d: 'Pesquisar ou introduzir um endereço' });
        addrInput.spellcheck = false;
        addrWrap.appendChild(addrInput);

        const actions = document.createElement('div');
        actions.className = 'browser-tabs-actions';
        const reload = document.createElement('button');
        reload.className = 'browser-btn'; reload.title = t('browser_btn_reload', { _d: 'Atualizar' });
        reload.innerHTML = svg('M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M20.49 15A9 9 0 015.64 18.36L1 14');
        actions.appendChild(reload);

        const homeBtn = document.createElement('button');
        homeBtn.className = 'browser-btn'; homeBtn.title = t('browser_btn_home', { _d: 'Início' });
        homeBtn.innerHTML = svg('M3 9l9-7 9 7v11a2 2 0 01-2 2h-4M9 22V12h6v10');
        actions.appendChild(homeBtn);

        toolbar.appendChild(nav);
        toolbar.appendChild(addrWrap);
        toolbar.appendChild(actions);

        // ---------- Content ----------
        const content = document.createElement('div');
        content.className = 'browser-content';

        // ---------- History ----------
        const history = [];
        let pos = -1;

        function navigate(query, pushHistory) {
            const key = resolveQuery(query);
            if (!key) {
                // Página não encontrada
                addrInput.value = query;
                content.innerHTML = '';
                const r = document.createElement('div');
                r.className = 'browser-result';
                r.innerHTML = `
                    <div class="browser-result-icon">
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
                    </div>
                    <h2>${t('browser_msg_not_found', { _d: 'Página não encontrada' })}</h2>
                    <p>${t('browser_msg_not_found_desc', { _d: '"{query}" — Verifica o endereço ou tenta uma das páginas favoritas em <strong>oxlyn://inicio</strong>.', query: query.replace(/[<>]/g,'') })}</p>`;
                content.appendChild(r);
                updateNav();
                return;
            }
            const page = PAGES[key];
            addrInput.value = page.url;
            content.innerHTML = '';
            try {
                const node = page.render(navigate);
                content.appendChild(node);
                content.scrollTop = 0;
            } catch (err) {
                console.error('[browser] erro a renderizar página', key, err);
            }

            if (pushHistory !== false) {
                history.splice(pos + 1);
                history.push(key);
                pos = history.length - 1;
            }
            updateNav();
        }

        function updateNav() {
            backBtn.disabled = pos <= 0;
            fwdBtn.disabled  = pos >= history.length - 1;
        }

        backBtn.addEventListener('click', () => {
            if (pos > 0) { pos--; navigate(history[pos], false); }
        });
        fwdBtn.addEventListener('click', () => {
            if (pos < history.length - 1) { pos++; navigate(history[pos], false); }
        });
        homeBtn.addEventListener('click', () => navigate('inicio'));
        reload.addEventListener('click', () => {
            reload.style.transform = 'rotate(360deg)'; reload.style.transition = 'transform .4s';
            setTimeout(() => { reload.style.transform = ''; reload.style.transition = ''; }, 410);
            if (history[pos]) navigate(history[pos], false);
        });
        addrInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && addrInput.value.trim()) navigate(addrInput.value.trim());
        });

        root.appendChild(toolbar);
        root.appendChild(content);

        navigate('inicio');
        return root;
    }

    return {
        id: 'browser',
        get defaultName() { return t('browser_title_main', { _d: 'Navegador' }); },
        defaultSize: { w: 960, h: 640 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
