/* =========================================
   OXLYN MDT — Front-end (vanilla JS)
   ========================================= */
console.log('[OXLYN-MDT] app.js v1.1 loaded');

// ----------------- State -----------------
const State = {
  open       : false,
  loggedIn   : false,       // sessão MDT iniciada
  currentApp : 'dashboard',
  meta       : null,        // dados do agente
  config     : null,        // crimes, prioridades, bounds, etc.
  locale     : {},          // dicionário traduzido (legacy)
  locales    : {},          // { pt: {...}, en: {...} }  — todos os locales
  localeCode : 'pt',         // código do locale atual
  selectedCitizen: null,    // identifier selecionado
  citizens   : [],
  bolos      : [],
  reports    : [],
  incidents  : [],
  properties : [],
  propertyFilter: 'all',    // status filtro
  propertyQuery : '',       // texto de pesquisa
  propertyMode  : 'grid',   // 'grid' | 'doc' | 'gallery'
  propertyDocId : null,     // id da propriedade aberta no doc mode
  propertyDocTab: 'details',// tab actual no doc mode: 'details' | 'photos' | 'activity'
  messages   : {},          // { channelId: [...] }
  currentChannel: 'general',
  officers   : [],
  myId       : null,
  shiftStart : null,
  headshotCache: {},        // { serverId: txd | null }
  idToSrv    : {}           // { identifier: serverId } para policias online
};

// =========================================================
//   i18n — tradução PT / EN
//   O idioma é definido SÓ via Config.Locale no server.
//   Nada de switcher in-game — single source of truth.
// =========================================================

// Devolve o locale atual (sempre um objeto). Fallback: pt → en → {}.
function currentLocale() {
  return State.locales[State.localeCode] || State.locales.pt || State.locales.en || State.locale || {};
}

// t('key', ...args)
//   - se a key não existir, devolve a própria key (visível em dev)
//   - aceita argumentos para %s / %d (estilo printf)
function t(key, ...args) {
  if (!key) return '';
  const dict = currentLocale();
  let value = dict[key];
  // Fallback PT se a key existir só em PT (ex.: nova string ainda não traduzida)
  if (value === undefined && State.locales.pt) value = State.locales.pt[key];
  if (value === undefined) return key;   // visível: mostra a key crua
  if (!args.length) return value;
  // printf-lite: %s, %d, %%
  let i = 0;
  return String(value).replace(/%[sd]|%%/g, (m) => {
    if (m === '%%') return '%';
    return (args[i++] !== undefined) ? args[i - 1] : m;
  });
}

// Caminha o DOM (root) e aplica traduções a:
//   data-i18n           → textContent
//   data-i18n-html      → innerHTML (cuidado, só usar em strings de fonte segura)
//   data-i18n-ph        → placeholder
//   data-i18n-title     → title
//   data-i18n-aria      → aria-label
function applyI18n(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n'); if (!k) return;
    const v = t(k);
    el.textContent = v;
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    const k = el.getAttribute('data-i18n-html'); if (!k) return;
    el.innerHTML = t(k);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.getAttribute('data-i18n-ph'); if (!k) return;
    el.setAttribute('placeholder', t(k));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const k = el.getAttribute('data-i18n-title'); if (!k) return;
    el.setAttribute('title', t(k));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const k = el.getAttribute('data-i18n-aria'); if (!k) return;
    el.setAttribute('aria-label', t(k));
  });
  // Re-renderiza qualquer custom dropdown (MdtDD) cuja origem é um <select>
  // com data-i18n nas <option> — o textContent das options já foi atualizado
  // acima, mas o wrapper DD precisa de redesenhar.
  if (typeof MdtDD !== 'undefined' && MdtDD.refresh) {
    root.querySelectorAll('select.mdt-select').forEach(sel => {
      try { MdtDD.refresh(sel); } catch (_) {}
    });
  }
}

// Re-localiza um label livre (free-text guardado em BD em PT/EN) para o locale atual.
// Gera uma chave canónica a partir do label (lower + sem acentos + underscore) e
// procura `prefix + chave` em pt e en. Se algum locale tiver essa chave igual ao
// label de input, sabemos qual é o id canónico e devolvemos a tradução para o
// locale activo. Útil para rows antigas guardadas com label cru (ReportCategories,
// PropertySuggestedTags free-text etc.).
function slugifyForLocale(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
function relocalizeLabel(prefix, label) {
  if (!label) return label;
  const dict = currentLocale();
  // 1) tenta key directa <prefix><slug(label)>
  const key = prefix + slugifyForLocale(label);
  const v = dict && dict[key];
  if (v) return v;
  // 2) procura entre todos os locales: se algum locale tem essa key com este label,
  //    devolve a versão do locale activo da mesma key.
  const all = State.locales || {};
  for (const code of Object.keys(all)) {
    const d = all[code];
    if (!d) continue;
    for (const k of Object.keys(d)) {
      if (k.startsWith(prefix) && d[k] === label) {
        return (dict && dict[k]) || label;
      }
    }
  }
  return label;
}

// Aplicação inicial do locale (chamado em openMdt). Não há setter por UI.
function setLocale(code) {
  if (!State.locales[code]) return;
  State.localeCode = code;
  State.locale = State.locales[code];
  try { document.documentElement.setAttribute('lang', code === 'pt' ? 'pt-PT' : 'en'); } catch (_) {}
  applyI18n();
  // Re-render de páginas dinâmicas que tenham strings hard-coded em JS
  if (State.currentApp === 'dashboard') { try { loadDashboard(); } catch (_) {} }
  if (State.currentApp === 'citizens')  { try { setCitizenView(State.citizenView || 'idle'); } catch (_) {} }
  if (State.currentApp === 'vehicles')  { try { setVehicleView('idle'); } catch (_) {} }
  if (State.currentApp === 'bolos')     { try { renderBolos(); } catch (_) {} }
  if (State.currentApp === 'incidents') { try { renderIncidents(); } catch (_) {} }
  if (State.currentApp === 'warrants')  { try { renderWarrantsList(); } catch (_) {} }
  if (State.currentApp === 'units')     { try { renderUnitsList(); } catch (_) {} }
  if (State.currentApp === 'offences')  { try { renderOffencesList(); } catch (_) {} }
  if (State.currentApp === 'reports')   { try { loadReports(); } catch (_) {} }
  if (State.currentApp === 'properties'){ try { renderPropertyList(); } catch (_) {} }
  if (State.currentApp === 'bulletins') { try { renderBulletinList(); } catch (_) {} }
  if (State.currentApp === 'logs')      { try { renderLogsList(); } catch (_) {} }
  if (State.currentApp === 'dispatch')  { try { renderDispatchList(); renderDispatchQuickButtons(); } catch (_) {} }
  if (State.currentApp === 'department'){ try { renderDepartment(); } catch (_) {} }
  if (State.currentApp === 'settings')  { try { loadSettings(); } catch (_) {} }
}

/* Pede headshot ao client (captura local do ped por serverId).
   Cacheia. Chama callback com txd ou null. */
async function ensureHeadshotForServerId(serverId) {
  if (!serverId) return null;
  const sid = String(serverId);
  if (State.headshotCache[sid] !== undefined) return State.headshotCache[sid];
  try {
    const res = await nuiPost('requestPlayerHeadshot', { serverId: Number(serverId) });
    const txd = res && res.txd ? res.txd : null;
    State.headshotCache[sid] = txd;
    return txd;
  } catch (e) {
    State.headshotCache[sid] = null;
    return null;
  }
}

// ----------------- Helpers ---------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Formato regional (BCP47) baseado no locale escolhido.
// PT → 'pt-PT' (24h, dd/mm/yyyy, EUR)
// EN → 'en-US' (12h, mm/dd/yyyy, USD)
function localeBcp47() {
  return (State.localeCode === 'en') ? 'en-US' : 'pt-PT';
}
// Símbolo monetário associado ao país do locale
function moneySymbol() {
  return (State.localeCode === 'en') ? '$' : '€';
}

function fmtMoney(v) {
  v = Number(v) || 0;
  return v.toLocaleString(localeBcp47()) + moneySymbol();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(s) {
  if (!s) return '-';
  // Aceita string SQL "YYYY-MM-DD HH:MM:SS"
  const d = new Date((typeof s === 'string') ? s.replace(' ', 'T') : s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(localeBcp47(), {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function initials(first, last) {
  const f = (first || '').trim()[0] || '?';
  const l = (last  || '').trim()[0] || '';
  return (f + l).toUpperCase();
}

/* Avatar URL (DiceBear "personas" — portrait estilizado, único por seed).
   Usa identifier ou serverId como seed para consistência. Fallback simples se falhar. */
function avatarUrl(seed, size = 80) {
  const s = encodeURIComponent(seed || 'unknown');
  return `https://api.dicebear.com/7.x/personas/svg?seed=${s}&size=${size}&backgroundColor=2e3e54,1f2733,11151c&radius=50`;
}

function avatarHtml(seed, fnln, size = 64, headshot = null) {
  const safeSeed = (seed || 'guest') + '';
  const initStr  = initials(...((fnln || '?').split(' ').slice(0, 2)));
  // 1) Foto real do GTA via ped headshot (NUI scheme) — class av-headshot para blend
  if (headshot) {
    return `<img class="av-headshot" src="https://nui-img/${headshot}/${headshot}"
                 alt="${escapeHtml(initStr)}"
                 onerror="this.onerror=null;this.classList.remove('av-headshot');this.src='${avatarUrl(safeSeed, size)}'"/>
            <span class="avatar-fallback" style="display:none">${escapeHtml(initStr)}</span>`;
  }
  // 2) Fallback: avatar gerado
  return `<img src="${avatarUrl(safeSeed, size)}"
               alt="${escapeHtml(initStr)}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <span class="avatar-fallback" style="display:none">${escapeHtml(initStr)}</span>`;
}

// Toasts dentro do tablet foram desactivadas — o feedback in-game vem
// pelo overlay de dispatch (#dispatch-overlay) e por MdtNotify (cliente Lua).
// A função fica como no-op para não partir os call-sites existentes.
function toast(_msg, _type) { /* no-op */ }

// Pequeno debounce p/ inputs de pesquisa
function debounce(fn, delay) {
  let h;
  return function(...args) {
    if (h) clearTimeout(h);
    h = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Anima um número de 0 (ou valor atual) até target
function animateNumber(el, target, duration = 700) {
  if (!el) return;
  const start = Number(el.dataset.target || 0);
  if (start === target) { el.textContent = target; return; }
  el.dataset.target = target;
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    const v = Math.round(start + (target - start) * eased);
    el.textContent = v;
    if (k < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  };
  requestAnimationFrame(tick);
}

// ----------------- Custom Dropdown (mdt-dd) -----------------
// Substitui <select> nativo por uma UI consistente com o resto do MDT.
// Aplica-se automaticamente a qualquer <select> com classe `mdt-select`.
// Mantém o <select> escondido como source-of-truth (o `value` continua
// sincronizado e o evento `change` é disparado ao seleccionar).
const MdtDD = (() => {
  const wrappers = new WeakMap();   // select -> wrapper element

  function buildOptions(sel) {
    const opts = Array.from(sel.options).map(o => ({
      value: o.value,
      label: o.textContent,
      icon: o.dataset.icon || '',
      color: o.dataset.color || '',
      disabled: o.disabled
    }));
    return opts;
  }

  function getSelected(sel) {
    return Array.from(sel.options).find(o => o.value === sel.value)
      || sel.options[sel.selectedIndex]
      || sel.options[0];
  }

  function render(sel) {
    let wrap = wrappers.get(sel);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'mdt-dd';
      sel.classList.add('mdt-select-hidden');
      sel.parentNode.insertBefore(wrap, sel);
      wrappers.set(sel, wrap);
    }

    const opts = buildOptions(sel);
    const cur  = getSelected(sel);
    const curLabel = cur ? cur.textContent : '—';
    const curIcon  = (cur && cur.dataset.icon) || '';
    const curColor = (cur && cur.dataset.color) || '';

    wrap.innerHTML = `
      <button type="button" class="mdt-dd-trigger" ${sel.disabled ? 'disabled' : ''} ${curColor ? `style="--dd-color:${curColor}"` : ''}>
        ${curIcon ? `<i class="fa-sharp fa-solid ${escapeHtml(curIcon)}"></i>` : ''}
        <span class="mdt-dd-value">${escapeHtml(curLabel)}</span>
        <i class="mdt-dd-caret fa-sharp fa-solid fa-chevron-down"></i>
      </button>
      <div class="mdt-dd-menu hidden">
        ${opts.map(o => `
          <button type="button" class="mdt-dd-opt ${o.value === sel.value ? 'active' : ''} ${o.disabled ? 'disabled' : ''}"
                  data-value="${escapeHtml(o.value)}" ${o.color ? `style="--dd-opt-color:${o.color}"` : ''}>
            ${o.icon ? `<i class="fa-sharp fa-solid ${escapeHtml(o.icon)}"></i>` : ''}
            <span>${escapeHtml(o.label)}</span>
            ${o.value === sel.value ? '<i class="mdt-dd-check fa-sharp fa-solid fa-check"></i>' : ''}
          </button>
        `).join('')}
      </div>
    `;

    const trigger = wrap.querySelector('.mdt-dd-trigger');
    const menu    = wrap.querySelector('.mdt-dd-menu');

    trigger.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (sel.disabled) return;
      // Fecha os outros menus
      document.querySelectorAll('.mdt-dd-menu:not(.hidden)').forEach(m => {
        if (m !== menu) m.classList.add('hidden');
      });
      // Toggle deste
      const wasHidden = menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      // Posicionamento dinâmico — flip up se não couber em baixo
      if (wasHidden) {
        const rect = trigger.getBoundingClientRect();
        const mh = menu.offsetHeight || 200;
        const spaceBelow = window.innerHeight - rect.bottom;
        menu.classList.toggle('mdt-dd-up', spaceBelow < mh + 10);
      }
    });

    wrap.querySelectorAll('.mdt-dd-opt').forEach(b => {
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (b.classList.contains('disabled')) return;
        const v = b.dataset.value;
        if (sel.value !== v) {
          sel.value = v;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        menu.classList.add('hidden');
        render(sel);  // re-render para atualizar selected/check
      });
    });
  }

  function init(root = document) {
    root.querySelectorAll('select.mdt-select').forEach(sel => render(sel));
  }

  function refresh(sel) {
    if (!sel) return init();
    if (sel.tagName !== 'SELECT') return;
    if (!sel.classList.contains('mdt-select')) sel.classList.add('mdt-select');
    render(sel);
  }

  // Click fora — fechar todos
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('.mdt-dd')) return;
    document.querySelectorAll('.mdt-dd-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
  });
  // ESC fecha (sem propagar para o handler global do MDT)
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const open = document.querySelectorAll('.mdt-dd-menu:not(.hidden)');
    if (open.length) {
      open.forEach(m => m.classList.add('hidden'));
      ev.stopPropagation();
    }
  });

  return { init, refresh };
})();

// ----------------- NUI bridge ------------
const RESOURCE_NAME =
  (typeof GetParentResourceName === 'function')
    ? GetParentResourceName()
    : 'oxlyn-mdt';

async function nuiPost(name, data = {}) {
  let text = '';
  try {
    const res = await fetch(`https://${RESOURCE_NAME}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data)
    });
    text = await res.text();
  } catch (fetchErr) {
    console.error('[MDT] fetch falhou:', name, fetchErr);
    return null;
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    console.warn('[MDT] resposta não-JSON para', name, '— body:', JSON.stringify(text).slice(0, 100));
    return null;
  }
}

// ----------------- ESC handler (hierárquico) -----------
// Ordem de prioridade: lightbox → modais → fechar MDT
window.addEventListener('keyup', (e) => {
  if (!State.open) return;
  if (e.key !== 'Escape' && e.keyCode !== 27) return;

  // 1) Lightbox de foto aberto?
  const lb = $('#photo-lightbox');
  if (lb && !lb.classList.contains('hidden')) {
    closePhotoLightbox();
    return;
  }
  // 2) Algum modal aberto?
  const anyModal = $$('.modal').some(m => !m.classList.contains('hidden'));
  if (anyModal) {
    closeAllModals();
    return;
  }
  // 3) Sem modais — fecha o MDT
  closeMdt();
});

// ----------------- Open/close ------------
// Helper: textContent seguro
function setText(sel, value) {
  const el = $(sel);
  if (el) el.textContent = value;
}
function setHtml(sel, value) {
  const el = $(sel);
  if (el) el.innerHTML = value;
}

function openMdt(meta, config, locale, locales, localeCode) {
  State.open  = true;
  State.meta  = meta || {};
  State.config = config || {};
  State.locale = locale || {};
  // i18n: regista o dicionário completo + locale vem SÓ do server (Config.Locale).
  State.locales = (locales && typeof locales === 'object') ? locales : { pt: locale || {} };
  State.localeCode = localeCode || (config && config.defaultLocale) || 'pt';
  if (!State.locales[State.localeCode]) State.localeCode = 'pt';
  State.locale = State.locales[State.localeCode] || State.locale;
  try { document.documentElement.setAttribute('lang', State.localeCode === 'pt' ? 'pt-PT' : 'en'); } catch (_) {}
  applyI18n();

  // Brand (sidebar)
  setText('#sb-agency',      (config && config.agencyName) || 'LSPD');
  setText('#sb-agency-city', (config && config.agencyCity) || 'Los Angeles');
  // Compatibilidade com markup antigo (se ainda existir #agency-name)
  setText('#agency-name',    (config && config.agencyShort) || 'LSPD');

  // User info
  const fn = State.meta.firstname || '?';
  const ln = State.meta.lastname  || '';
  const fullName = `${fn} ${ln}`.trim();
  const seedSelf = 'police-' + (State.meta.serverId || State.meta.identifier || 'me');

  setText('#user-name', fullName);
  setText('#user-rank', State.meta.gradeLabel || t('dash.grade_n', (State.meta.grade || 0)));
  setHtml('#user-avatar', avatarHtml(seedSelf, fullName, 48, State.meta.headshot));
  setText('#dash-welcome', t('dash.welcome', fullName));

  // Lock screen — minimal v3
  setText('#lock-name', fullName || t('lock.officer'));
  setText('#lock-rank', State.meta.gradeLabel || t('dash.grade_n', (State.meta.grade || 0)));
  // Callsign — mostrar enquanto não vem do server (usa serverId como placeholder)
  setText('#lock-callsign', 'LSP-' + String(State.meta.serverId || '00').padStart(2, '0'));
  // Compat legacy
  setText('#lock-badge', '#' + String(State.meta.serverId || '----').padStart(4, '0'));

  // Theme via CSS vars (opcional)
  if (config && config.theme) {
    const t = config.theme;
    const root = document.documentElement;
    if (t.accent) root.style.setProperty('--c-accent', t.accent);
  }

  populateBoloPriorities();
  populateRecordCrimes();
  populateReportCategories();
  populateChannels();
  setupMapImage();

  // Esconder botão de calibração se config disabled
  const calBtn = $('#map-calibrate');
  if (calBtn) {
    if (State.config && State.config.mapShowCalibrate) calBtn.classList.remove('hidden');
    else                                               calBtn.classList.add('hidden');
  }

  State.myId = (meta && meta.serverId) || null;

  // Aplica preferências do utilizador POR CIMA do config do servidor
  // (server config define os defaults; localStorage tem a última vontade do user)
  applyAllPrefs();

  // Mostrar tablet com LOCK SCREEN ativa (sessão fechada)
  showLockScreen();
  $('#root').classList.remove('hidden');
  startClock();   // relógio na lock screen e na top bar

  // Pré-carrega o estado de serviço para que o ecrã de bloqueio
  // mostre "Em serviço / Inativo" desde o primeiro frame em vez de
  // ficar com "A carregar..." até o utilizador abrir o painel.
  loadPoliceStatus().catch(() => {});
}

// ───────── Lock Screen / Sessão ─────────
function showLockScreen() {
  State.loggedIn = false;
  const lock = $('#lock-screen');
  if (lock) {
    lock.classList.remove('hidden');
    lock.classList.remove('unlocking');
  }
  const inner = $('#lock-inner');
  if (inner) {
    inner.classList.remove('unlocking');
    inner.classList.remove('dragging');
    inner.style.transform = '';
    inner.style.opacity = '';
  }
  const session = $('#session');
  if (session) session.style.display = 'none';
  if (shiftInterval) { clearInterval(shiftInterval); shiftInterval = null; }
  if (shiftPillInterval) { clearInterval(shiftPillInterval); shiftPillInterval = null; }
  State.shiftStart = null;
  closeAllModals();
  refreshLockNotifs();
}

function loginToSession() {
  State.loggedIn = true;
  // Animação iOS: o conteúdo desliza para cima, depois o ecrã esvai
  const lock  = $('#lock-screen');
  const inner = $('#lock-inner');
  if (inner) inner.classList.add('unlocking');
  if (lock) {
    setTimeout(() => { lock.classList.add('unlocking'); }, 280);
    setTimeout(() => {
      lock.classList.add('hidden');
      lock.classList.remove('unlocking');
      if (inner) inner.classList.remove('unlocking');
    }, 700);
  }
  const session = $('#session');
  if (session) session.style.display = '';

  // sessão começa agora
  State.shiftStart = new Date();
  goTo('dashboard');
  loadDashboard();
  startShiftPill();
  // Preload dispatches → badge na sidebar fica logo correto
  (async () => {
    try {
      const rows = await nuiPost('listDispatches');
      State.dispatches = Array.isArray(rows) ? rows : [];
      renderDispatchList();
    } catch (e) {}
  })();

  toast(t('session_started'), 'success');
}

// ───────── Lock Screen — Notificações iOS ─────────
function timeAgoShort(iso) {
  if (!iso) return t('time.now');
  const d = new Date((typeof iso === 'string') ? iso.replace(' ', 'T') : iso);
  if (isNaN(d.getTime())) return t('time.now');
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1)   return t('time.now');
  if (m < 60)  return t('time.m_ago', m);
  const h = Math.floor(m / 60);
  if (h < 24)  return t('time.h_ago', h);
  const dd = Math.floor(h / 24);
  return t('time.d_ago', dd);
}

// Set persistente (durante a sessão) com chaves das notificações que o
// utilizador descartou com swipe. Limpa-se ao recarregar o NUI.
State.dismissedNotifs = State.dismissedNotifs || new Set();

function notifKey(n) {
  return `${n.kind}|${n.ts || 0}|${n.title || ''}`;
}

function renderLockNotifs(items) {
  const zone = $('#lock-notifs');
  if (!zone) return;
  if (!items || items.length === 0) {
    zone.innerHTML = `
      <div class="ios-notif-empty">
        <i class="fa-sharp fa-solid fa-bell-slash"></i>
        <span>${escapeHtml(t('lock.no_notifs'))}</span>
      </div>`;
    return;
  }
  zone.innerHTML = items.map(n => `
    <div class="ios-notif ${n.kind}" data-key="${escapeHtml(notifKey(n))}">
      <div class="ios-notif-icon"><i class="fa-sharp fa-solid ${n.icon}"></i></div>
      <div class="ios-notif-body">
        <div class="ios-notif-row1">
          <span class="ios-notif-app">${escapeHtml(n.app)}</span>
          <span class="ios-notif-when">${escapeHtml(n.when)}</span>
        </div>
        <div class="ios-notif-title">${escapeHtml(n.title)}</div>
        <div class="ios-notif-sub">${escapeHtml(n.sub || '')}</div>
      </div>
    </div>
  `).join('');

  $$('.ios-notif', zone).forEach(attachNotifSwipe);
}

// Swipe-to-dismiss (pointer/touch) numa notificação da lock screen.
// Threshold: 120px. Acima disso, animação de saída + adiciona à set de
// descartadas para não voltar no próximo refresh.
function attachNotifSwipe(el) {
  let startX = 0;
  let dx = 0;
  let dragging = false;

  const onDown = (ev) => {
    // Só botão esquerdo (mouse) ou um único toque
    if (ev.type === 'mousedown' && ev.button !== 0) return;
    dragging = true;
    startX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    dx = 0;
    el.classList.add('ios-notif-swiping');
    // Desliga a transição enquanto seguimos o dedo/cursor
    el.style.transition = 'none';
    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('mouseup',   onUp,   true);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp,   true);
    document.addEventListener('touchcancel', onUp, true);
  };
  const onMove = (ev) => {
    if (!dragging) return;
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    dx = x - startX;
    // Resistência: pequena curva — opacidade desce com a distância
    const THRESH = 120;
    const opacity = Math.max(0.25, 1 - Math.min(1, Math.abs(dx) / 220));
    el.style.transform = `translateX(${dx}px)`;
    el.style.opacity   = String(opacity);
    if (Math.abs(dx) > THRESH) el.classList.add('ios-notif-armed');
    else                       el.classList.remove('ios-notif-armed');
    if (ev.cancelable) ev.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp,   true);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend',  onUp,   true);
    document.removeEventListener('touchcancel', onUp, true);

    const THRESH = 120;
    el.classList.remove('ios-notif-swiping', 'ios-notif-armed');
    el.style.transition = 'transform 0.28s ease, opacity 0.28s ease, max-height 0.28s ease, margin 0.28s ease, padding 0.28s ease';

    if (Math.abs(dx) > THRESH) {
      // Dispensar — voa para fora e colapsa o espaço, depois remove
      const dir = dx > 0 ? 1 : -1;
      el.style.transform = `translateX(${dir * 480}px)`;
      el.style.opacity   = '0';
      const key = el.getAttribute('data-key');
      if (key) State.dismissedNotifs.add(key);
      setTimeout(() => {
        el.style.maxHeight = el.offsetHeight + 'px';
        // próximo frame para animar maxHeight 0
        requestAnimationFrame(() => {
          el.style.maxHeight = '0px';
          el.style.marginTop = '0px';
          el.style.marginBottom = '0px';
          el.style.paddingTop = '0px';
          el.style.paddingBottom = '0px';
          el.style.borderWidth = '0px';
        });
        setTimeout(() => {
          el.remove();
          // Se ficou sem notificações, mostra estado vazio
          const zone = $('#lock-notifs');
          if (zone && !$$('.ios-notif', zone).length) {
            zone.innerHTML = `
              <div class="ios-notif-empty">
                <i class="fa-sharp fa-solid fa-bell-slash"></i>
                <span>${escapeHtml(t('lock.no_notifs'))}</span>
              </div>`;
          }
        }, 280);
      }, 200);
    } else {
      // Volta ao sítio
      el.style.transform = '';
      el.style.opacity = '';
    }
    dx = 0;
  };

  el.addEventListener('mousedown',  onDown);
  el.addEventListener('touchstart', onDown, { passive: true });
}

async function refreshLockNotifs() {
  try {
    const [dispatches, bolos, incidents] = await Promise.all([
      nuiPost('listDispatches').catch(() => []),
      nuiPost('listBolos').catch(() => []),
      nuiPost('listIncidents').catch(() => [])
    ]);

    const items = [];

    const dispatchTypes = (State.config && State.config.dispatchTypes) || {};
    (Array.isArray(dispatches) ? dispatches : []).forEach(d => {
      const ms = d.ts ? d.ts * 1000 : (d.created_at ? new Date(String(d.created_at).replace(' ', 'T')).getTime() : Date.now());
      const dt = (d.type && dispatchTypes[d.type]) || null;
      const label = (dt && dt.label) || d.type || t('lock.notif.dispatch_default');
      items.push({
        kind: 'dispatch',
        icon: (dt && dt.icon) || 'fa-tower-broadcast',
        app:  t('lock.notif.app_dispatch'),
        title: label,
        sub:  (d.zone || '') + (d.description ? ' · ' + d.description : ''),
        when: timeAgoShort(new Date(ms).toISOString()),
        ts:   ms
      });
    });

    (Array.isArray(bolos) ? bolos : []).forEach(b => {
      items.push({
        kind: 'bolo',
        icon: 'fa-bullhorn',
        app:  t('lock.notif.app_bolo'),
        title: b.title || t('lock.notif.bolo_default'),
        sub:  b.target ? t('lock.notif.bolo_target', b.target) : (b.description || ''),
        when: timeAgoShort(b.created_at),
        ts:   b.created_at ? new Date(String(b.created_at).replace(' ', 'T')).getTime() : 0
      });
    });

    (Array.isArray(incidents) ? incidents : []).forEach(i => {
      items.push({
        kind: 'incident',
        icon: 'fa-folder-open',
        app:  t('lock.notif.app_incident'),
        title: i.title || t('lock.notif.incident_default'),
        sub:  i.location || i.suspects || (i.description || ''),
        when: timeAgoShort(i.created_at),
        ts:   i.created_at ? new Date(String(i.created_at).replace(' ', 'T')).getTime() : 0
      });
    });

    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const visible = items.filter(n => !State.dismissedNotifs.has(notifKey(n)));
    renderLockNotifs(visible.slice(0, 4));

    // Atualiza stats em tempo real na lock screen
    const dispatchesArr = Array.isArray(dispatches) ? dispatches : [];
    const bolosArr = Array.isArray(bolos) ? bolos : [];
    const onDuty = (State.officers || []).filter(o => o.onDuty).length;
    setText('#lk-st-officers', onDuty);
    setText('#lk-st-dispatch', dispatchesArr.length);
    setText('#lk-st-bolos',    bolosArr.filter(b => b.active).length);
  } catch (e) {
    console.warn('[MDT] lock notifs falhou:', e);
    renderLockNotifs([]);
  }
}

// Contador na pílula "Em serviço" do dashboard header
let shiftPillInterval = null;
function startShiftPill() {
  if (shiftPillInterval) { clearInterval(shiftPillInterval); shiftPillInterval = null; }
  const tick = () => {
    if (!State.shiftStart) return;
    const elapsed = Math.max(0, Date.now() - State.shiftStart.getTime());
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const hms = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const el = $('#dash-shift-time'); if (el) el.textContent = hms;
    // Mantém o contador da página de Definições sincronizado.
    // Usa HH:MM:SS para o utilizador ver o segundo a contar e perceber que está activo.
    const setEl = $('#set-stat-shift'); if (setEl) setEl.textContent = hms;
  };
  tick();
  shiftPillInterval = setInterval(tick, 1000);
}

function logoutSession() {
  toast(t('session_ended'), 'inform');
  showLockScreen();
}

function closeMdt() {
  State.open = false;
  $('#root').classList.add('hidden');
  closeAllModals();
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  if (shiftInterval) { clearInterval(shiftInterval); shiftInterval = null; }
  nuiPost('close');
}

// ----------------- Clock -----------------
let clockInterval = null;
function startClock() {
  if (clockInterval) return;
  const tick = () => {
    const d = new Date();
    const bcp = localeBcp47();
    // EN → 12h (am/pm), PT → 24h
    const hm = d.toLocaleTimeString(bcp, {
      hour: '2-digit', minute: '2-digit',
      hour12: (State.localeCode === 'en')
    });
    const dm = d.toLocaleDateString(bcp, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const wd = d.toLocaleDateString(bcp, { weekday: 'long' });

    const c1 = $('#clock');         if (c1) c1.textContent = hm;
    const d1 = $('#date');          if (d1) d1.textContent = dm;
    const wdEl = $('#weekday');     if (wdEl) wdEl.textContent = wd;
    const lc = $('#lock-clock');    if (lc) lc.textContent = hm;
    const ld = $('#lock-date');     if (ld) ld.textContent = `${wd} · ${dm}`;
  };
  tick();
  clockInterval = setInterval(tick, 30000);
}

// ----------------- Shift logic -----------------
let shiftInterval = null;
function startShiftCounter() {
  if (shiftInterval) return;
  // assume turno de 8h a partir da hora em que se abriu o tablet
  if (!State.shiftStart) State.shiftStart = new Date();
  const SHIFT_HOURS = 8;
  const shiftEnd = new Date(State.shiftStart.getTime() + SHIFT_HOURS * 3600 * 1000);

  // determinar se é diurno/noturno
  const h = State.shiftStart.getHours();
  const shiftKey = (h >= 6 && h < 14) ? 'shift.morning' : (h >= 14 && h < 22) ? 'shift.afternoon' : 'shift.night';
  const sn = $('#shift-name'); if (sn) sn.textContent = t(shiftKey);

  const ss = $('#shift-start'); if (ss) ss.textContent = State.shiftStart.toLocaleTimeString(localeBcp47(), { hour: '2-digit', minute: '2-digit', hour12: (State.localeCode === 'en') });
  const se = $('#shift-end');   if (se) se.textContent = shiftEnd.toLocaleTimeString(localeBcp47(), { hour: '2-digit', minute: '2-digit', hour12: (State.localeCode === 'en') });

  const tick = () => {
    const now = new Date();
    const elapsed = Math.max(0, now - State.shiftStart);
    const total   = SHIFT_HOURS * 3600 * 1000;
    const pct = Math.min(100, (elapsed / total) * 100);

    const eh = Math.floor(elapsed / 3600000);
    const em = Math.floor((elapsed % 3600000) / 60000);
    const es = Math.floor((elapsed % 60000) / 1000);

    const elEl = $('#shift-elapsed');
    if (elEl) elEl.textContent = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;

    const stEl = $('#dash-shift-time');
    if (stEl) stEl.textContent = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:${String(es).padStart(2,'0')}`;

    const bar = $('#shift-bar-fill');
    if (bar) bar.style.width = pct + '%';

    const onlineEl = $('#shift-online');
    if (onlineEl) onlineEl.textContent = `${(State.officers || []).length}/${(State.officers || []).length}`;
  };
  tick();
  shiftInterval = setInterval(tick, 1000);
}

// ----------------- Stacked Bar Chart 24h ---
const ACTIVITY_COLORS = {
  records:    '#3b82f6',  // azul
  bolos:      '#dc2626',  // vermelho
  incidents:  '#a855f7',  // roxo
  dispatches: '#f59e0b'   // âmbar
};

// Catmull-Rom -> Cubic Bezier (smooth e fechado pelos extremos)
function smoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;

  const tension = 0.5; // 0.5 = clássico Catmull-Rom
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const c1x = p1[0] + (p2[0] - p0[0]) * tension / 3;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension / 3;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension / 3;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension / 3;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function renderActivity24h(hourlyByKind) {
  const svg = $('#chart-stack-svg');
  if (!svg) return;
  hourlyByKind = hourlyByKind || { records: [], bolos: [], incidents: [], dispatches: [] };

  const KINDS = ['records', 'bolos', 'incidents', 'dispatches'];
  const KIND_LABELS = {
    records:    t('dash.chart.records'),
    bolos:      t('dash.chart.bolos'),
    incidents:  t('dash.chart.incidents'),
    dispatches: t('dash.chart.dispatches')
  };

  const W = 600, H = 200;
  const PAD_L = 32, PAD_R = 14, PAD_T = 14, PAD_B = 30;
  const cols = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const series = {};
  KINDS.forEach(k => {
    const a = (hourlyByKind[k] || []).slice(0, cols);
    while (a.length < cols) a.push(0);
    series[k] = a;
  });

  // Total por hora (escala empilhada)
  const totals = [];
  for (let i = 0; i < cols; i++) {
    totals.push(KINDS.reduce((acc, k) => acc + (series[k][i] || 0), 0));
  }
  const maxRaw = Math.max(0, ...totals);
  const max = Math.max(4, Math.ceil(maxRaw * 1.20));

  // Larguras dos slots (uma barra por hora)
  const slotW = innerW / cols;
  const barW  = Math.max(4, Math.min(18, slotW * 0.62));

  // Defs com sombras + gradientes vibrantes
  const defs = `
    <defs>
      <linearGradient id="ca-grad-records" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"   stop-color="#60a5fa" stop-opacity="1"/>
        <stop offset="100%" stop-color="#1e40af" stop-opacity="0.85"/>
      </linearGradient>
      <linearGradient id="ca-grad-bolos" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"   stop-color="#f87171" stop-opacity="1"/>
        <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0.85"/>
      </linearGradient>
      <linearGradient id="ca-grad-incidents" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"   stop-color="#c084fc" stop-opacity="1"/>
        <stop offset="100%" stop-color="#581c87" stop-opacity="0.85"/>
      </linearGradient>
      <linearGradient id="ca-grad-dispatches" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"   stop-color="#fbbf24" stop-opacity="1"/>
        <stop offset="100%" stop-color="#78350f" stop-opacity="0.85"/>
      </linearGradient>
      <filter id="ca-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  `;

  // Grelha horizontal (4 níveis subtis)
  const gridLines = [];
  for (let g = 0; g <= 4; g++) {
    const y = PAD_T + (innerH / 4) * g;
    gridLines.push(`<line class="ca-grid" x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${(W - PAD_R).toFixed(1)}" y2="${y.toFixed(1)}"/>`);
  }

  // Y labels — 0, max/2, max
  const yLabels = `
    <text class="ca-label ca-y-lab" x="${(PAD_L - 6).toFixed(1)}" y="${(PAD_T + 4).toFixed(1)}" text-anchor="end">${max}</text>
    <text class="ca-label ca-y-lab" x="${(PAD_L - 6).toFixed(1)}" y="${(PAD_T + innerH/2 + 4).toFixed(1)}" text-anchor="end">${Math.round(max/2)}</text>
    <text class="ca-label ca-y-lab" x="${(PAD_L - 6).toFixed(1)}" y="${(PAD_T + innerH + 4).toFixed(1)}" text-anchor="end">0</text>
  `;

  // X labels (cada 4h)
  const xLabels = [];
  for (let i = 0; i < cols; i += 4) {
    const x = PAD_L + (i + 0.5) * slotW;
    const hagoLabel = (24 - i) === 24 ? '−24h' : `−${24 - i}h`;
    xLabels.push(`<text class="ca-label" x="${x.toFixed(1)}" y="${(H - 10).toFixed(1)}" text-anchor="middle">${hagoLabel}</text>`);
  }
  // Marcador "agora"
  xLabels.push(`<text class="ca-label ca-now" x="${(PAD_L + (cols - 0.5) * slotW).toFixed(1)}" y="${(H - 10).toFixed(1)}" text-anchor="middle">${escapeHtml(t('time.now'))}</text>`);

  // Linha vertical "agora" subtil
  const nowX = PAD_L + (cols - 0.5) * slotW;
  const nowMarker = `<line class="ca-now-line" x1="${nowX.toFixed(1)}" y1="${PAD_T}" x2="${nowX.toFixed(1)}" y2="${(PAD_T + innerH).toFixed(1)}"/>`;

  const baselineY = PAD_T + innerH;

  // Barras empilhadas (uma por hora) — bottom-up: dispatches → incidents → bolos → records
  // Visualmente queremos: dispatches no fundo, records no topo (mais usual)
  // Por convenção, desenhamos primeiro records (em cima), depois bolos, etc.
  // Mas para empilhamento, calculamos cumulativo e desenhamos do mais alto ao mais baixo.
  // Mais simples: desenhar de baixo para cima usando offset cumulativo.
  const bars = [];
  for (let i = 0; i < cols; i++) {
    const cx = PAD_L + (i + 0.5) * slotW;
    const x = cx - barW / 2;
    let stackBottom = baselineY;
    const stackOrder = ['dispatches', 'incidents', 'bolos', 'records'];
    let totalH = 0;
    stackOrder.forEach((k, sIdx) => {
      const v = series[k][i] || 0;
      if (v <= 0) return;
      const h = (v / max) * innerH;
      const y = stackBottom - h;
      const isTop = (sIdx === stackOrder.length - 1) || stackOrder.slice(sIdx + 1).every(kk => (series[kk][i] || 0) === 0);
      const r = isTop ? 2.5 : 0;
      bars.push(`<rect class="ca-bar ca-bar-${k}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="${r}" fill="url(#ca-grad-${k})" data-hour="${24 - i}" data-kind="${k}" data-value="${v}" />`);
      stackBottom = y;
      totalH += h;
    });
    // Hover slot transparente (faixa larga para tooltip)
    if (totals[i] > 0) {
      bars.push(`<rect class="ca-hover-slot" x="${(cx - slotW/2).toFixed(2)}" y="${PAD_T}" width="${slotW.toFixed(2)}" height="${innerH.toFixed(2)}" data-hour-idx="${i}" />`);
    }
  }

  svg.innerHTML = `
    ${defs}
    ${gridLines.join('')}
    <line class="ca-baseline" x1="${PAD_L}" y1="${baselineY.toFixed(1)}" x2="${(W - PAD_R).toFixed(1)}" y2="${baselineY.toFixed(1)}"/>
    ${nowMarker}
    ${bars.join('')}
    ${yLabels}
    ${xLabels.join('')}
  `;

  // Tooltip on hover
  let tooltip = $('#ca-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'ca-tooltip';
    tooltip.className = 'ca-tooltip hidden';
    const wrap = $('.chart-stack-wrap');
    if (wrap) wrap.appendChild(tooltip);
  }

  $$('.ca-hover-slot', svg).forEach(slot => {
    slot.addEventListener('mouseenter', (ev) => {
      const idx = Number(slot.dataset.hourIdx);
      const hago = 24 - idx;
      const lines = [
        `<div class="cat-h">${hago === 24 ? t('time.h24_ago') : (hago === 0 ? t('time.now') : t('time.h_ago', hago))}</div>`
      ];
      KINDS.forEach(k => {
        const v = series[k][idx] || 0;
        if (v > 0) {
          lines.push(`<div class="cat-row"><span class="cat-dot ca-bar-${k}"></span><span class="cat-lab">${KIND_LABELS[k]}</span><strong class="cat-val">${v}</strong></div>`);
        }
      });
      lines.push(`<div class="cat-total"><strong>${totals[idx]}</strong> ${escapeHtml(t('dash.chart.total'))}</div>`);
      tooltip.innerHTML = lines.join('');
      tooltip.classList.remove('hidden');
    });
    slot.addEventListener('mousemove', (ev) => {
      const wrap = $('.chart-stack-wrap');
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      // Mede o tooltip (offsetWidth/Height precisa de estar visível antes)
      const tw = tooltip.offsetWidth  || 170;
      const th = tooltip.offsetHeight || 90;

      // Posição horizontal — flip para a esquerda do cursor se não couber
      let left = x + 14;
      if (left + tw > rect.width - 8) {
        left = x - tw - 14;
      }
      if (left < 8) left = 8;

      // Posição vertical — flip para baixo se não couber em cima
      let top = y - 14;
      if (top - th < 0) {
        top = y + 22;
        tooltip.style.transform = 'translateY(0)';
      } else {
        tooltip.style.transform = 'translateY(-100%)';
      }

      tooltip.style.left = left + 'px';
      tooltip.style.top  = top + 'px';
    });
    slot.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
  });

  // Totais nas legendas
  const sumKind = (k) => (series[k] || []).reduce((a, b) => a + b, 0);
  setText('#csl-records',    sumKind('records'));
  setText('#csl-bolos',      sumKind('bolos'));
  setText('#csl-incidents',  sumKind('incidents'));
  setText('#csl-dispatches', sumKind('dispatches'));
}

// ----------------- Navegação -------------
const APP_META = {
  dashboard:  { titleKey: 'nav.dashboard',   subKey: 'app.sub.dashboard' },
  citizens:   { titleKey: 'nav.citizens',    subKey: 'app.sub.citizens' },
  vehicles:   { titleKey: 'nav.vehicles',    subKey: 'app.sub.vehicles' },
  bolos:      { titleKey: 'nav.bolos',       subKey: 'app.sub.bolos' },
  incidents:  { titleKey: 'nav.incidents',   subKey: 'app.sub.incidents' },
  fines:      { titleKey: 'nav.offences',    subKey: 'app.sub.fines' },
  reports:    { titleKey: 'nav.reports',     subKey: 'app.sub.reports' },
  livemap:    { titleKey: 'nav.livemap',     subKey: 'app.sub.livemap' },
  dispatch:   { titleKey: 'nav.dispatch',    subKey: 'app.sub.dispatch' },
  department: { titleKey: 'nav.department',  subKey: 'app.sub.department' },
  properties: { titleKey: 'nav.properties',  subKey: 'app.sub.properties' },
  offences:   { titleKey: 'nav.offences',    subKey: 'app.sub.offences' },
  warrants:   { titleKey: 'nav.warrants',    subKey: 'app.sub.warrants' },
  units:      { titleKey: 'nav.units',       subKey: 'app.sub.units' },
  bulletins:  { titleKey: 'nav.bulletins',   subKey: 'app.sub.bulletins' },
  logs:       { titleKey: 'nav.logs',        subKey: 'app.sub.logs' },
  settings:   { titleKey: 'nav.settings',    subKey: 'app.sub.settings' }
};

function goTo(appId) {
  State.currentApp = appId;
  $$('.app').forEach(s => s.classList.add('hidden'));
  const target = $(`#app-${appId}`);
  if (target) target.classList.remove('hidden');

  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.app === appId));

  // Atualiza título do top bar
  const meta = APP_META[appId];
  if (meta) {
    const t1 = $('#tb-app-title'); if (t1) t1.textContent = t(meta.titleKey);
    const t2 = $('#tb-app-sub');   if (t2) t2.textContent = t(meta.subKey);
  }

  // Lazy load por app
  switch (appId) {
    case 'dashboard':  loadDashboard();  break;
    case 'bolos':      loadBolos();      break;
    case 'incidents':  loadIncidents();  break;
    case 'reports':    loadReports();    break;
    case 'department': loadDepartment(); break;
    case 'livemap':    renderLiveMap();  break;
    case 'dispatch':   loadDispatch();   break;
    case 'citizens':
      // Reset para idle / atualiza contador online
      State.citizenDocId = null;
      setCitizenView(State.citizens && State.citizens.length ? 'results' : 'idle');
      const onlineEl = $('#cit-idle-online');
      if (onlineEl) onlineEl.textContent = (State.officers || []).length;
      break;
    case 'vehicles':
      // Reset para idle a cada entrada (limpa estado anterior)
      setVehicleView('idle');
      break;
    case 'properties':
      // Reset para grid sempre que entras na página
      State.propertyDocId = null;
      setPropertyMode('grid');
      loadProperties();
      break;
    case 'offences':   loadOffences();   break;
    case 'warrants':   loadWarrants();   break;
    case 'units':      loadUnits();      break;
    case 'bulletins':  loadBulletins();  break;
    case 'logs':       loadLogs();       break;
    case 'settings':   loadSettings();   break;
  }
}

// ----------------- Dashboard -------------
function timeAgo(iso) {
  if (!iso) return '-';
  const d = new Date((typeof iso === 'string') ? iso.replace(' ', 'T') : iso);
  if (isNaN(d.getTime())) return iso;
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60)    return t('time.s_ago', sec);
  if (sec < 3600)  return t('time.m_ago', Math.floor(sec/60));
  if (sec < 86400) return t('time.h_ago', Math.floor(sec/3600));
  return t('time.d_ago', Math.floor(sec/86400));
}

// ----------------- Police Status (Estado dos Agentes) --------
async function loadPoliceStatus() {
  const [me, agents] = await Promise.all([
    nuiPost('getMyStatus'),
    nuiPost('listDepartment')
  ]);
  State.myStatus = me || {};
  State.allAgents = Array.isArray(agents) ? agents : [];
  renderAgentStatusList();
  renderMyControls();
}

function renderAgentStatusList() {
  const wrap = $('#as-list');
  if (!wrap) return;
  const list = State.allAgents || [];
  const cnt = $('#ps-counter');
  if (cnt) cnt.textContent = list.length;

  if (!list.length) {
    wrap.innerHTML = `<p class="muted pad">${escapeHtml(t('dash.no_agents'))}</p>`;
    return;
  }

  // Ordena: em serviço primeiro, depois inativos
  list.sort((a, b) => (b.onDuty ? 1 : 0) - (a.onDuty ? 1 : 0));

  wrap.innerHTML = list.map(o => {
    const fullName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
    const seed = o.id ? ('police-' + o.id) : fullName;
    const isMe = State.myId && State.myId === o.id;
    const headshot = (isMe && State.meta && State.meta.headshot) ? State.meta.headshot : o.headshot;
    const cs = o.callsign || '—';
    const onDuty = !!o.onDuty;
    return `
      <div class="as-row ${onDuty ? 'as-on' : 'as-off'} ${isMe ? 'as-self-row' : ''}">
        <div class="as-av">${avatarHtml(seed, fullName, 36, headshot)}</div>
        <div class="as-meta">
          <div class="as-name">${escapeHtml(fullName)} ${isMe ? `<span class="as-tag-you">${escapeHtml(t('dash.you'))}</span>` : ''}</div>
          <div class="as-rank">${escapeHtml(o.gradeLabel || t('dash.grade_n', (o.grade || 0)))}</div>
        </div>
        <div class="as-cs"><span class="as-cs-pill">${escapeHtml(cs)}</span></div>
        <div class="as-duty">
          <span class="as-duty-dot"></span>
          <span class="as-duty-lab">${escapeHtml(onDuty ? t('dash.duty.on') : t('dash.duty.off'))}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMyControls() {
  const ps = State.myStatus || {};
  const onDuty = !!ps.onDuty;

  // Pílula no botão "Definições" da sidebar
  const navPill = $('#nav-duty-pill');
  if (navPill) {
    navPill.classList.toggle('on',  onDuty);
    navPill.classList.toggle('off', !onDuty);
  }

  // Lock screen — callsign + status (em serviço / inativo)
  if (ps.callsign) setText('#lock-callsign', ps.callsign);
  setText('#lock-status-label', onDuty ? t('lock.in_service') : t('lock.off_service'));
  const lockDot = $('#lock-status-dot');
  if (lockDot) {
    lockDot.classList.toggle('lk2-on',  onDuty);
    lockDot.classList.toggle('lk2-off', !onDuty);
  }

  // Página de Definições — duty switch + callsign
  const dSwitch = $('#set-duty-switch');
  if (dSwitch) {
    dSwitch.classList.toggle('on', onDuty);
    dSwitch.setAttribute('aria-checked', onDuty ? 'true' : 'false');
  }
  setText('#set-duty-sub',
    onDuty ? t('set.duty.on') : t('set.duty.off'));
  const csInput = $('#set-callsign-input');
  if (csInput && document.activeElement !== csInput) csInput.value = ps.callsign || '';
  setText('#set-profile-callsign', ps.callsign || '—');
}

// ============================================================
//   DEFINIÇÕES — preferências do cliente (localStorage) + UI
// ============================================================
const PREF_DEFAULTS = {
  dispatchOverlay:  true,
  dispatchDuration: 8,
  lockNotifs:       true
};
const PREF_KEY = 'oxlyn_mdt_prefs_v1';

function getPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return Object.assign({}, PREF_DEFAULTS, raw ? JSON.parse(raw) : {});
  } catch (e) { return { ...PREF_DEFAULTS }; }
}
function savePrefs(p) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {}
}
function setPref(key, value) {
  const p = getPrefs();
  p[key] = value;
  savePrefs(p);
  applyPref(key, value);
}
function applyPref(key, value) {
  switch (key) {
    case 'dispatchOverlay':
      State.config = State.config || {};
      State.config.dispatchInGameAlerts = !!value;
      break;
    case 'dispatchDuration':
      State.config = State.config || {};
      State.config.dispatchOverlayDuration = Number(value) || 8;
      break;
    case 'lockNotifs': {
      const wrap = $('.ios-notifs-wrap');
      if (wrap) wrap.style.display = value ? '' : 'none';
      break;
    }
  }
}
function applyAllPrefs() {
  const p = getPrefs();
  Object.keys(p).forEach(k => applyPref(k, p[k]));
}

function loadSettings() {
  const meta = State.meta || {};
  const fn = meta.firstname || '?';
  const ln = meta.lastname  || '';
  const fullName = `${fn} ${ln}`.trim();
  const seedSelf = 'police-' + (meta.serverId || meta.identifier || 'me');

  setText('#set-meta-name', fullName || t('lock.officer'));
  setText('#set-profile-name', fullName || '—');
  setText('#set-profile-grade', meta.gradeLabel || t('dash.grade_n', (meta.grade || 0)));
  setHtml('#set-profile-av', avatarHtml(seedSelf, fullName, 92, meta.headshot));

  // Stats no profile card
  setText('#set-stat-units',  (State.units || []).length);
  setText('#set-stat-online', (State.officers || []).length);
  if (State.shiftStart) {
    const elapsed = Math.max(0, Date.now() - State.shiftStart.getTime());
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    setText('#set-stat-shift', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  } else {
    setText('#set-stat-shift', '--:--:--');
  }
  // Garante que o tick está a correr (se já estiver, é seguro chamar de novo)
  if (State.shiftStart) startShiftPill();

  // Re-render duty/callsign + reflectir prefs nos controlos
  renderMyControls();
  syncPrefControls();
}

function syncPrefControls() {
  const p = getPrefs();
  $$('.set-switch[data-pref]').forEach(sw => {
    const key = sw.dataset.pref;
    sw.classList.toggle('on', !!p[key]);
    sw.setAttribute('aria-checked', p[key] ? 'true' : 'false');
  });
  $$('select.mdt-select[data-pref]').forEach(sel => {
    const key = sel.dataset.pref;
    sel.value = String(p[key]);
    if (typeof MdtDD !== 'undefined') MdtDD.refresh(sel);
  });
}

function bindSettingsPage() {
  // Duty switch
  const dSwitch = $('#set-duty-switch');
  if (dSwitch) dSwitch.addEventListener('click', async () => {
    const newDuty = !(State.myStatus && State.myStatus.onDuty);
    State.myStatus = State.myStatus || {};
    State.myStatus.onDuty = newDuty;
    renderMyControls();
    const me = (State.allAgents || []).find(a => a.id === State.myId);
    if (me) me.onDuty = newDuty;
    renderAgentStatusList();

    // Reinicia o contador de serviço quando entra em serviço.
    // Ao sair de serviço, congela em --:--:-- até voltar a ativar.
    if (newDuty) {
      State.shiftStart = new Date();
      startShiftPill();
    } else {
      if (shiftPillInterval) { clearInterval(shiftPillInterval); shiftPillInterval = null; }
      State.shiftStart = null;
      const el = $('#dash-shift-time'); if (el) el.textContent = '00:00:00';
      const setEl = $('#set-stat-shift'); if (setEl) setEl.textContent = '--:--:--';
    }

    await nuiPost('setMyDuty', { onDuty: newDuty });
    setTimeout(loadPoliceStatus, 800);
  });

  // Callsign
  const csSave = $('#set-callsign-save');
  if (csSave) csSave.addEventListener('click', async () => {
    const inp = $('#set-callsign-input');
    if (!inp) return;
    const v = (inp.value || '').trim().toUpperCase();
    if (!v) return;
    State.myStatus = State.myStatus || {};
    State.myStatus.callsign = v;
    await nuiPost('setMyCallsign', { callsign: v });
    setTimeout(() => { loadPoliceStatus(); renderMyControls(); }, 400);
  });
  const csIn = $('#set-callsign-input');
  if (csIn) csIn.addEventListener('keyup', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('#set-callsign-save').click(); }
  });

  // Switches genéricos (data-pref)
  $$('.set-switch[data-pref]').forEach(sw => {
    sw.addEventListener('click', () => {
      const key = sw.dataset.pref;
      const next = !sw.classList.contains('on');
      sw.classList.toggle('on', next);
      sw.setAttribute('aria-checked', next ? 'true' : 'false');
      setPref(key, next);
    });
  });

  // Selects genéricos (data-pref)
  $$('select.mdt-select[data-pref]').forEach(sel => {
    sel.addEventListener('change', () => {
      const key = sel.dataset.pref;
      let v = sel.value;
      if (!isNaN(parseFloat(v)) && isFinite(v)) v = Number(v);
      setPref(key, v);
    });
  });

  // Repor notifs descartadas
  const clearBtn = $('#set-clear-dismissed');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (State.dismissedNotifs && State.dismissedNotifs.clear) State.dismissedNotifs.clear();
    refreshLockNotifs();
  });

}

async function renderMiniChat() {
  const wrap = $('#dash-chat');
  if (!wrap) return;
  // Carrega últimas mensagens do canal "general"
  const rows = await nuiPost('listMessages', { channel: 'general' });
  State.messages.general = rows || [];
  const last = State.messages.general.slice(-8);
  if (!last.length) {
    const ch = (State.config.channels || []).find(c => c.id === 'general');
    const chLabel = (ch && ch.label) || t('msg.channel.general') || 'general';
    wrap.innerHTML = `
      <div class="mini-chat-empty">
        <i class="fa-sharp fa-solid fa-comments"></i>
        <span>${escapeHtml(t('dash.chat_empty'))} <strong>#${escapeHtml(chLabel)}</strong></span>
        <small>${escapeHtml(t('dash.chat_empty_sub'))}</small>
      </div>`;
    return;
  }

  // Inicial do autor para o avatar (J.Silva → JS)
  const initials = (n) => (n || '?')
    .split(/\s+/).map(s => s[0] || '').slice(0, 2).join('').toUpperCase();

  // Agrupa mensagens consecutivas do mesmo autor — só mostra avatar/header
  // na primeira de cada bloco, dando aspecto de chat moderno.
  const html = [];
  let prevAuthor = null;
  let prevMine = null;
  last.forEach((m, i) => {
    const mine = !!(State.meta && m.author_id && m.author_id === State.meta.identifier);
    const sameBlock = (m.author_id || m.author) === prevAuthor && mine === prevMine;
    prevAuthor = m.author_id || m.author;
    prevMine = mine;

    html.push(`
      <div class="mini-msg ${mine ? 'mine' : 'other'} ${sameBlock ? 'continuation' : ''}">
        ${sameBlock
          ? '<div class="mini-msg-av-spacer"></div>'
          : `<div class="mini-msg-av">${escapeHtml(initials(m.author))}</div>`}
        <div class="mini-msg-content">
          ${sameBlock ? '' : `
            <div class="mini-msg-meta">
              ${mine ? '' : `<span class="mini-msg-author">${escapeHtml(m.author)}</span>`}
              <span class="mini-msg-when">${escapeHtml(timeAgo(m.created_at))}</span>
            </div>`}
          <div class="mini-msg-bubble">
            <div class="mini-msg-text">${formatChatBody(m.message)}</div>
          </div>
        </div>
      </div>
    `);
  });
  wrap.innerHTML = html.join('');
  wrap.scrollTop = wrap.scrollHeight;
}

// Detecta URLs de imagem (.png/.jpg/.jpeg/.gif/.webp ou imgur direto) e renderiza <img>
function formatChatBody(text) {
  if (!text) return '';
  const safe = escapeHtml(text);
  const imageRe = /(https?:\/\/[^\s]+?\.(png|jpe?g|gif|webp)(?:\?[^\s]*)?)/gi;
  const imgurRe = /(https?:\/\/(?:i\.)?imgur\.com\/[A-Za-z0-9]{5,10})(?!\.[a-z]+)/gi;

  let html = safe;
  // Imgur sem extensão → adiciona .png
  html = html.replace(imgurRe, (m, url) => {
    const fixed = url.replace('imgur.com/', 'i.imgur.com/') + '.png';
    return `<img class="chat-img" src="${fixed}" loading="lazy" />`;
  });
  // URLs com extensão de imagem
  html = html.replace(imageRe, (m, url) => `<img class="chat-img" src="${url}" loading="lazy" />`);
  return html;
}

// Lista de emojis comuns para o picker
const COMMON_EMOJIS = [
  '👍','👎','👌','✌️','🤝','👋','🙏','💪',
  '😀','😂','🤣','😊','😍','😘','😎','🤔',
  '😴','😢','😡','😱','🤬','🤯','😬','🥳',
  '❤️','🔥','💯','⚡','✨','🎉','💀','☠️',
  '🚓','🚨','🚑','🚒','🛡️','⚖️','🚔','🚁',
  '🔫','🔪','💣','💊','💵','📞','📍','🗺️',
  '✅','❌','⚠️','❓','❗','📢','🆘','🆗'
];

function buildEmojiPicker() {
  const picker = $('#emoji-picker');
  if (!picker || picker.dataset.built === '1') return;
  picker.dataset.built = '1';
  picker.innerHTML = COMMON_EMOJIS.map(e => `<button class="emoji-cell" type="button" data-emoji="${e}">${e}</button>`).join('');
  picker.addEventListener('click', (e) => {
    const cell = e.target.closest('.emoji-cell');
    if (!cell) return;
    const inp = $('#dash-chat-input');
    if (!inp) return;
    const e0 = inp.selectionStart || inp.value.length;
    const e1 = inp.selectionEnd   || inp.value.length;
    inp.value = inp.value.slice(0, e0) + cell.dataset.emoji + inp.value.slice(e1);
    inp.focus();
    inp.setSelectionRange(e0 + cell.dataset.emoji.length, e0 + cell.dataset.emoji.length);
  });
}

function toggleEmojiPicker() {
  const p = $('#emoji-picker');
  if (!p) return;
  buildEmojiPicker();
  p.classList.toggle('hidden');
}

// promptImageUrl removido — basta colar URL no chat e enviar.
// O formatChatBody detecta URLs de imagem (.png/.jpg/.gif/.webp + imgur) automaticamente.

async function sendMiniChat() {
  const input = $('#dash-chat-input');
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  input.value = '';
  await nuiPost('sendMessage', { channel: 'general', message: txt });
}

function renderOnlineOfficers() {
  const wrap = $('#online-grid');
  const cnt  = $('#online-count');
  if (!wrap) return;   // grid foi removido do dashboard — render sai cedo
  const list = State.officers || [];
  if (cnt) cnt.textContent = list.length;
  if (!list.length) {
    wrap.innerHTML = `<p class="muted pad">${escapeHtml(t('dash.no_agents'))}</p>`;
    return;
  }
  wrap.classList.add('stagger');
  wrap.innerHTML = list.slice(0, 12).map(o => {
    const fullName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
    const inVeh = !!o.vehicle;
    const sub = inVeh
      ? `<i class="fa-sharp fa-solid fa-car-side"></i> ${escapeHtml(o.vehicle)} · ${o.speed || 0} km/h`
      : `<i class="fa-sharp fa-solid fa-walkie-talkie"></i> ${escapeHtml(o.gradeLabel || t('dash.grade_n', (o.grade || 0)))}`;
    const seed = o.id ? ('police-' + o.id) : fullName;
    // Se sou eu, usa State.meta.headshot (válido localmente)
    const headshot = (State.myId && State.myId === o.id && State.meta && State.meta.headshot)
                       ? State.meta.headshot : o.headshot;
    return `
      <div class="online-item ${inVeh ? 'in-vehicle' : ''}">
        <div class="online-avatar">
          ${avatarHtml(seed, fullName, 48, headshot)}
        </div>
        <div class="online-meta">
          <div class="online-name">${escapeHtml(fullName)}</div>
          <div class="online-sub">${sub}</div>
        </div>
      </div>
    `;
  }).join('');
}

function pickActivityIcon(crime) {
  const s = (crime || '').toLowerCase();
  if (s.includes('roubo') || s.includes('furto') || s.includes('robbery') || s.includes('theft') || s.includes('burglary')) return { ico: 'fa-mask', cls: 'ai-purple' };
  if (s.includes('homicídio') || s.includes('agressão') || s.includes('arma') || s.includes('homicide') || s.includes('assault') || s.includes('weapon') || s.includes('murder')) return { ico: 'fa-skull', cls: '' };
  if (s.includes('droga') || s.includes('drug')) return { ico: 'fa-cannabis', cls: 'ai-green' };
  if (s.includes('velocidade') || s.includes('condução') || s.includes('atropelamento') || s.includes('fuga') || s.includes('speeding') || s.includes('driving') || s.includes('hit-and-run') || s.includes('fleeing')) return { ico: 'fa-gauge-high', cls: 'ai-blue' };
  if (s.includes('vandalismo') || s.includes('perturbação') || s.includes('vandalism') || s.includes('disturbing')) return { ico: 'fa-spray-can-sparkles', cls: 'ai-orange' };
  return { ico: 'fa-handcuffs', cls: '' };
}

async function loadDashboard() {
  const data = await nuiPost('getDashboard');
  if (!data) return;

  animateNumber($('#dash-officers'), data.officers || 0);
  animateNumber($('#dash-bolos'),    data.bolos    || 0);
  animateNumber($('#dash-fines'),    data.fines    || 0);

  // bell badge mostra BOLOs activos
  const bb = $('#bell-count');
  if (bb) {
    if (data.bolos > 0) { bb.textContent = data.bolos > 99 ? '99+' : data.bolos; bb.style.display = 'block'; }
    else                { bb.style.display = 'none'; }
  }

  // Atividade recente removida do dashboard

  renderOnlineOfficers();
  renderMiniChat();
  loadPoliceStatus();

  // Stacked chart "Atividade 24h" — usa buckets do server por tipo
  renderActivity24h(data.hourlyByKind || { records: data.hourly || [], bolos: [], incidents: [], dispatches: [] });

  // Atividade Recente (feed)
  renderActivityFeed(data.recentActivity || []);
}

// ----------------- Activity Feed (Painel) ---------------
const ACTIVITY_META = {
  record:   { icon: 'fa-handcuffs',          color: '#3b82f6', labelKey: 'af.kind.record',   go: 'citizens' },
  bolo:     { icon: 'fa-bullhorn',           color: '#dc2626', labelKey: 'af.kind.bolo',     go: 'bolos'    },
  incident: { icon: 'fa-clipboard-list',     color: '#a855f7', labelKey: 'af.kind.incident', go: 'incidents'},
  property: { icon: 'fa-house-flag',         color: '#7d8ea4', labelKey: 'af.kind.property', go: 'properties'}
};

function renderActivityFeed(items) {
  const wrap = $('#dash-activity-feed');
  if (!wrap) return;
  if (!items || !items.length) {
    wrap.innerHTML = `
      <div class="af-empty">
        <i class="fa-sharp fa-solid fa-rss"></i>
        <span>${escapeHtml(t('activity.empty'))}</span>
      </div>`;
    return;
  }

  wrap.innerHTML = items.slice(0, 4).map(it => {
    const meta = ACTIVITY_META[it.kind] || { icon: 'fa-circle', color: '#7f8c8d', labelKey: null, go: '' };
    const label = meta.labelKey ? t(meta.labelKey) : (it.kind || '');
    const sub = it.sub ? `<span class="af-sub">${escapeHtml(it.sub)}</span>` : '';
    return `
      <div class="af-item" data-go="${meta.go}">
        <div class="af-icon" style="--af-color:${meta.color}">
          <i class="fa-sharp fa-solid ${meta.icon}"></i>
        </div>
        <div class="af-body">
          <div class="af-row">
            <span class="af-kind">${escapeHtml(label)}</span>
            <span class="af-time">${escapeHtml(timeAgo(it.created_at))}</span>
          </div>
          <div class="af-title">${escapeHtml(it.title || '—')}</div>
          <div class="af-meta">
            <span class="af-by"><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(it.by || '—')}</span>
            ${sub}
          </div>
        </div>
      </div>
    `;
  }).join('');

  $$('.af-item', wrap).forEach(el => el.addEventListener('click', () => {
    const go = el.dataset.go;
    if (go) goTo(go);
  }));
}

// ----------------- Citizens --------------
// ============================================================
//   CIDADÃOS — Database Terminal v2
// ============================================================
State.citizenView    = 'idle';   // 'idle' | 'searching' | 'results' | 'doc'
State.citizenDocId   = null;     // identifier aberto
State.citizenDocTab  = 'overview';
let _citizenSearchToken = 0;     // anti race condition

function setCitizenView(v) {
  State.citizenView = v;
  ['idle', 'searching', 'results'].forEach(s => {
    const el = $('#cit-state-' + s);
    if (el) el.classList.toggle('hidden', v !== s);
  });
  const dbWrap = $('#cit-mode-db');
  const docWrap = $('#cit-mode-doc');
  if (dbWrap) dbWrap.classList.toggle('hidden', v === 'doc');
  if (docWrap) docWrap.classList.toggle('hidden', v !== 'doc');

  // Topbar metadata
  if (v === 'doc' && State.citizenDocId) {
    setText('#tb-app-title', t('cit.doc.tb_title'));
    setText('#tb-app-sub', t('cit.doc.tb_sub'));
  } else {
    const meta = APP_META.citizens || { titleKey: 'nav.citizens', subKey: 'app.sub.citizens' };
    setText('#tb-app-title', t(meta.titleKey));
    setText('#tb-app-sub', t(meta.subKey));
  }
}

// Escreve linha no scanner com efeito typewriter
function citScannerLine(text, opts = {}) {
  const wrap = $('#cit-scanner');
  if (!wrap) return;
  const line = document.createElement('div');
  line.className = 'cit-scan-line ' + (opts.cls || '');
  line.innerHTML = text;
  wrap.appendChild(line);
  // Auto-scroll
  wrap.scrollTop = wrap.scrollHeight;
  return line;
}

function setSearchProgress(pct) {
  const fill = $('#cit-search-fill');
  const lab  = $('#cit-search-pct');
  if (fill) fill.style.width = pct + '%';
  if (lab)  lab.textContent  = pct + '%';
}

async function searchCitizens() {
  const q = ($('#citizen-search').value || '').trim();
  if (!q) return;
  if (q.length < 2 && !/^\d+$/.test(q)) {
    toast(t('cit.search.min_chars'), 'warning');
    return;
  }

  const myToken = ++_citizenSearchToken;
  const t0 = performance.now();

  // Switch para searching state
  setCitizenView('searching');
  const scanner = $('#cit-scanner');
  if (scanner) scanner.innerHTML = '';
  setSearchProgress(0);

  // Animação: linhas progressivas
  const steps = [
    { delay: 0,    pct: 8,   text: `<span class="cit-scan-prompt">▸</span> ${t('cit.scan.connect')}`, cls: '' },
    { delay: 120,  pct: 22,  text: `<span class="cit-scan-ok">[ OK ]</span>  ${t('cit.scan.encrypted')}`, cls: 'cit-scan-info' },
    { delay: 200,  pct: 35,  text: `<span class="cit-scan-prompt">▸</span> ${t('cit.scan.auth')}`, cls: '' },
    { delay: 280,  pct: 55,  text: `<span class="cit-scan-prompt">▸</span> ${t('cit.scan.executing')} <span class="cit-scan-q">${escapeHtml(q)}</span>`, cls: '' },
    { delay: 380,  pct: 75,  text: `<span class="cit-scan-dim">  &nbsp;&nbsp;&nbsp;${t('cit.scan.filtering')}</span>`, cls: 'cit-scan-info' }
  ];
  for (const step of steps) {
    if (myToken !== _citizenSearchToken) return; // foi cancelado / nova query
    await new Promise(r => setTimeout(r, step.delay));
    citScannerLine(step.text, { cls: step.cls });
    setSearchProgress(step.pct);
  }

  // Pede ao server (em paralelo com o final da animação)
  const rows = await nuiPost('searchCitizens', { query: q });
  if (myToken !== _citizenSearchToken) return;

  State.citizens = Array.isArray(rows) ? rows : [];
  setSearchProgress(100);

  if (!State.citizens.length) {
    citScannerLine(`<span class="cit-scan-warn">[ ! ]</span>  ${t('cit.scan.no_match')}`, { cls: 'cit-scan-warn-line' });
    await new Promise(r => setTimeout(r, 350));
  } else {
    citScannerLine(`<span class="cit-scan-ok">[ OK ]</span>  ${t('cit.scan.matches')} <strong>${State.citizens.length}</strong>`, { cls: 'cit-scan-info' });
    await new Promise(r => setTimeout(r, 250));
  }

  if (myToken !== _citizenSearchToken) return;

  // Mostra resultados
  const elapsed = Math.round(performance.now() - t0);
  setText('#cit-results-time', elapsed + ' ms');
  renderCitizenList();
  setCitizenView('results');
}

function renderCitizenList() {
  const list = $('#citizen-list');
  const cnt  = $('#citizen-result-count');
  if (cnt) cnt.textContent = State.citizens.length;
  if (!State.citizens.length) {
    list.innerHTML = `
      <div class="cit-no-results">
        <i class="fa-sharp fa-solid fa-circle-question"></i>
        <h3>${escapeHtml(t('cit.list.no_results.title'))}</h3>
        <p>${escapeHtml(t('cit.list.no_results.body'))}</p>
      </div>`;
    return;
  }
  list.classList.add('stagger');
  list.innerHTML = State.citizens.map(c => {
    const name = `${c.firstname || ''} ${c.lastname || ''}`.trim() || t('cit.no_name');
    const seed = c.identifier || ('cit-' + name);
    const online = !!c.serverId;
    const records = Number(c.records_count || 0);
    const finesPending = Number(c.fines_pending_count || 0);

    return `
      <div class="cit-card ${online ? 'cit-online' : 'cit-offline'}" data-identifier="${escapeHtml(c.identifier)}">
        <div class="cit-card-photo">
          ${avatarHtml(seed, name, 64, null)}
          ${online ? `<span class="cit-card-online" title="${escapeHtml(t('common.online'))}"></span>` : ''}
        </div>
        <div class="cit-card-info">
          <div class="cit-card-name">${escapeHtml(name)}</div>
          <div class="cit-card-meta">
            ${online ? `<span class="cit-card-id">ID ${escapeHtml(String(c.serverId))}</span>` : `<span class="cit-card-id cit-id-off">${escapeHtml(t('cit.list.offline'))}</span>`}
            <span class="cit-card-job"><i class="fa-sharp fa-solid fa-briefcase"></i> ${escapeHtml(c.job || '—')}</span>
          </div>
          <div class="cit-card-tags">
            ${records > 0 ? `<span class="cit-tag cit-tag-red"><i class="fa-sharp fa-solid fa-handcuffs"></i> ${escapeHtml(t('cit.list.records_n', records))}</span>` : `<span class="cit-tag cit-tag-clean"><i class="fa-sharp fa-solid fa-shield-check"></i> ${escapeHtml(t('cit.list.clean'))}</span>`}
            ${finesPending > 0 ? `<span class="cit-tag cit-tag-amber"><i class="fa-sharp fa-solid fa-receipt"></i> ${escapeHtml(t('cit.list.fines_n', finesPending))}</span>` : ''}
          </div>
        </div>
        <div class="cit-card-arrow">
          <i class="fa-sharp fa-solid fa-arrow-right"></i>
        </div>
      </div>
    `;
  }).join('');

  $$('.cit-card', list).forEach(row => {
    row.addEventListener('click', () => openCitizenDoc(row.dataset.identifier));
  });

  // Carrega headshot real do ped para cada cidadão online e substitui o avatar
  // gerativo no card assim que chega. Os cidadãos offline mantêm o avatar fallback.
  $$('.cit-card', list).forEach(async (cardEl) => {
    const ident = cardEl.dataset.identifier;
    const c = State.citizens.find(x => x.identifier === ident);
    if (!c || !c.serverId) return;
    const txd = await ensureHeadshotForServerId(c.serverId);
    if (!txd) return;
    // Confirma que ainda estamos no mesmo conjunto de resultados
    if (!cardEl.isConnected) return;
    const photoEl = cardEl.querySelector('.cit-card-photo');
    if (!photoEl) return;
    const name = `${c.firstname || ''} ${c.lastname || ''}`.trim();
    const onlineDot = photoEl.querySelector('.cit-card-online');
    photoEl.innerHTML = avatarHtml(c.identifier, name, 64, txd)
                      + (onlineDot ? onlineDot.outerHTML : '');
  });
}

// ============================================================
//   CITIZEN DOCUMENT (in-place)
// ============================================================
async function openCitizenDoc(identifier) {
  State.selectedCitizen = identifier;
  State.citizenDocId    = identifier;
  State.citizenDocTab   = 'overview';
  setCitizenView('doc');
  const root = $('#cit-mode-doc');
  if (root) root.innerHTML = `
    <div class="cit-doc-loading">
      <i class="fa-sharp fa-solid fa-spinner fa-spin"></i>
      <span>${escapeHtml(t('cit.action.loading_file'))}</span>
    </div>`;
  const c = await nuiPost('getCitizen', { identifier });
  if (State.citizenDocId !== identifier) return; // navegou entretanto
  renderCitizenDoc(c);
}

function backToCitizenResults() {
  State.citizenDocId = null;
  if (State.citizens && State.citizens.length) {
    setCitizenView('results');
  } else {
    setCitizenView('idle');
  }
}

function renderCitizenDoc(c) {
  const root = $('#cit-mode-doc');
  if (!root) return;
  if (!c || !c.identifier) {
    root.innerHTML = `<div class="cit-doc-loading"><i class="fa-sharp fa-solid fa-circle-exclamation"></i><span>${escapeHtml(t('cit.doc.not_found'))}</span></div>`;
    return;
  }

  const fullName = `${c.firstname || ''} ${c.lastname || ''}`.trim() || t('cit.no_name');
  const records = c.records || [];
  const fines   = c.fines || [];
  const vehicles= c.vehicles || [];
  const finesPending = fines.filter(f => !f.paid);
  const finesPaid    = fines.filter(f =>  f.paid);
  const totalDue = finesPending.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  const tab = State.citizenDocTab || 'overview';

  const isOnline = !!c.serverId;
  const seed = c.identifier;

  root.innerHTML = `
    <!-- Toolbar -->
    <div class="pdoc-toolbar">
      <button class="pdoc-back" id="cit-doc-back">
        <i class="fa-sharp fa-solid fa-arrow-left"></i><span>${escapeHtml(t('cit.doc.toolbar.back'))}</span>
      </button>
      <div class="pdoc-breadcrumb">
        <span class="pdoc-crumb-icon"><i class="fa-sharp fa-solid fa-id-card"></i></span>
        <span class="pdoc-crumb-label">${escapeHtml(t('cit.doc.crumb_label'))}</span>
        <span class="pdoc-crumb-sep">·</span>
        <span class="pdoc-crumb-current">${escapeHtml(fullName)}</span>
      </div>
      <div class="pdoc-actions">
        <button class="btn btn-primary btn-sm pdoc-action-btn" id="cit-doc-add-record">
          <i class="fa-sharp fa-solid fa-handcuffs"></i> ${escapeHtml(t('cit.doc.btn.record'))}
        </button>
        <button class="btn btn-ghost btn-sm pdoc-action-btn" id="cit-doc-add-fine">
          <i class="fa-sharp fa-solid fa-receipt"></i> ${escapeHtml(t('cit.doc.btn.fine'))}
        </button>
      </div>
    </div>

    <!-- Paper / case file -->
    <div class="pdoc-paper cit-paper">
      <!-- ID Card hero -->
      <div class="cit-id-card">
        <div class="cit-id-stripe"></div>
        <div class="cit-id-body">
          <div class="cit-id-photo" id="cit-id-photo-host">${avatarHtml(seed, fullName, 96, null)}</div>
          <div class="cit-id-info">
            <div class="cit-id-dept">
              <i class="fa-sharp fa-solid fa-shield-halved"></i>
              <span>LOS ANGELES POLICE DEPARTMENT</span>
            </div>
            <div class="cit-id-name">${escapeHtml(fullName)}</div>
            <div class="cit-id-meta">
              <span class="cit-id-status ${isOnline ? 'cit-id-online' : ''}">
                <span class="cit-id-status-dot"></span>
                ${isOnline ? `ID #${escapeHtml(String(c.serverId))} · ${escapeHtml(t('common.online').toUpperCase())}` : escapeHtml(t('cit.list.offline'))}
              </span>
            </div>
            <div class="cit-id-quick">
              <span><i class="fa-sharp fa-solid fa-cake-candles"></i> ${escapeHtml(c.dob || '—')}</span>
              <span><i class="fa-sharp fa-solid fa-venus-mars"></i> ${escapeHtml((c.sex || '—').toUpperCase())}</span>
              <span><i class="fa-sharp fa-solid fa-ruler-vertical"></i> ${c.height || '—'} cm</span>
              <span><i class="fa-sharp fa-solid fa-phone"></i> ${escapeHtml(c.phone || '—')}</span>
              <span><i class="fa-sharp fa-solid fa-briefcase"></i> ${escapeHtml(c.job || '—')}</span>
              <span><i class="fa-sharp fa-solid fa-building-columns"></i> ${escapeHtml(fmtMoney(c.bank))}</span>
            </div>
          </div>
          <div class="cit-id-summary">
            <div class="cit-summary-stat ${records.length ? 'cit-bad' : 'cit-good'}">
              <span class="cit-summary-val">${records.length}</span>
              <span class="cit-summary-lab">${escapeHtml(t('cit.summary.records'))}</span>
            </div>
            <div class="cit-summary-stat ${finesPending.length ? 'cit-warn' : ''}">
              <span class="cit-summary-val">${finesPending.length}</span>
              <span class="cit-summary-lab">${escapeHtml(t('cit.summary.fines_pending'))}</span>
            </div>
            <div class="cit-summary-stat">
              <span class="cit-summary-val">${vehicles.length}</span>
              <span class="cit-summary-lab">${escapeHtml(t('cit.summary.vehicles'))}</span>
            </div>
            ${totalDue > 0 ? `<div class="cit-summary-due">${escapeHtml(t('cit.summary.due'))}<strong>${escapeHtml(fmtMoney(totalDue))}</strong></div>` : ''}
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="pdoc-tabs cit-tabs">
        <button class="pdoc-tab ${tab==='overview'?'active':''}" data-tab="overview"><i class="fa-sharp fa-solid fa-id-badge"></i> ${escapeHtml(t('cit.tab.overview'))}</button>
        <button class="pdoc-tab ${tab==='records' ?'active':''}" data-tab="records"><i class="fa-sharp fa-solid fa-handcuffs"></i> ${escapeHtml(t('cit.tab.records'))} <span class="pdoc-tab-count">${records.length}</span></button>
        <button class="pdoc-tab ${tab==='vehicles'?'active':''}" data-tab="vehicles"><i class="fa-sharp fa-solid fa-car-side"></i> ${escapeHtml(t('cit.tab.vehicles'))} <span class="pdoc-tab-count">${vehicles.length}</span></button>
        <button class="pdoc-tab ${tab==='fines'   ?'active':''}" data-tab="fines"><i class="fa-sharp fa-solid fa-receipt"></i> ${escapeHtml(t('cit.tab.fines'))} <span class="pdoc-tab-count">${fines.length}</span></button>
      </div>

      <!-- Tab content -->
      <div class="pdoc-tab-content cit-tab-content">
        ${tab === 'overview' ? renderCitTabOverview(c, records, vehicles, fines) : ''}
        ${tab === 'records'  ? renderCitTabRecords(records) : ''}
        ${tab === 'vehicles' ? renderCitTabVehicles(vehicles) : ''}
        ${tab === 'fines'    ? renderCitTabFines(fines) : ''}
      </div>
    </div>
  `;

  // Wire
  $('#cit-doc-back', root).addEventListener('click', backToCitizenResults);
  $('#cit-doc-add-record', root).addEventListener('click', () => openRecordModal(c.identifier));
  $('#cit-doc-add-fine',   root).addEventListener('click', () => openFineModal(c.identifier));

  $$('.pdoc-tab', root).forEach(t => t.addEventListener('click', () => {
    State.citizenDocTab = t.dataset.tab;
    renderCitizenDoc(c);
  }));

  $$('[data-remove-record]', root).forEach(btn => btn.addEventListener('click', () => {
    confirmModal(t('rec.confirm.title'), t('rec.confirm.body'), async () => {
      await nuiPost('removeRecord', { id: Number(btn.dataset.removeRecord) });
      setTimeout(() => openCitizenDoc(c.identifier), 300);
    });
  }));
  $$('[data-cancel-fine]', root).forEach(btn => btn.addEventListener('click', () => {
    confirmModal(t('fine.confirm.cancel.title'), t('fine.confirm.cancel.body'), async () => {
      await nuiPost('cancelFine', { id: Number(btn.dataset.cancelFine) });
      setTimeout(() => openCitizenDoc(c.identifier), 300);
    });
  }));

  // Headshot real (cidadão online)
  if (c.serverId) {
    ensureHeadshotForServerId(c.serverId).then(txd => {
      if (!txd) return;
      const host = $('#cit-id-photo-host');
      if (host && State.citizenDocId === c.identifier) {
        host.innerHTML = avatarHtml(c.identifier, fullName, 96, txd);
      }
    });
  }
}

// ===== Renders por tab =====
function renderCitTabOverview(c, records, vehicles, fines) {
  // Atividade resumida (últimos 5 antecedentes/multas)
  const events = [];
  records.forEach(r => events.push({ kind: 'record', date: r.created_at, title: r.crime, by: r.officer, icon: 'fa-handcuffs', color: '#dc2626' }));
  fines.forEach(f => events.push({ kind: 'fine', date: f.created_at, title: f.reason, by: f.officer, paid: f.paid, amount: f.amount, icon: 'fa-receipt', color: '#f59e0b' }));
  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = events.slice(0, 5);

  const recentHtml = recent.length
    ? recent.map(e => `
        <div class="cit-tl-item">
          <div class="cit-tl-icon" style="--tl-color:${e.color}"><i class="fa-sharp fa-solid ${e.icon}"></i></div>
          <div class="cit-tl-body">
            <div class="cit-tl-title">${escapeHtml(e.title)}</div>
            <div class="cit-tl-meta">
              <span><i class="fa-sharp fa-solid fa-clock"></i> ${escapeHtml(timeAgo(e.date))}</span>
              <span><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(e.by || '—')}</span>
              ${e.amount ? `<span class="cit-tl-amount">${escapeHtml(fmtMoney(e.amount))}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')
    : `<p class="muted pad">${escapeHtml(t('cit.overview.no_activity'))}</p>`;

  return `
    <div class="cit-overview-grid">
      <div class="cit-ov-card">
        <div class="cit-ov-header"><i class="fa-sharp fa-solid fa-clock-rotate-left"></i> ${escapeHtml(t('dash.activity_recent'))}</div>
        <div class="cit-timeline">${recentHtml}</div>
      </div>
      <div class="cit-ov-card">
        <div class="cit-ov-header"><i class="fa-sharp fa-solid fa-circle-info"></i> ${escapeHtml(t('cit.overview.personal_details'))}</div>
        <div class="cit-info-grid">
          <div class="cit-info-cell"><div class="cit-lab">${escapeHtml(t('cit.field.dob_short'))}</div><div class="cit-val">${escapeHtml(c.dob || '—')}</div></div>
          <div class="cit-info-cell"><div class="cit-lab">${escapeHtml(t('cit.field.sex'))}</div><div class="cit-val">${escapeHtml((c.sex || '—').toUpperCase())}</div></div>
          <div class="cit-info-cell"><div class="cit-lab">${escapeHtml(t('cit.field.height'))}</div><div class="cit-val">${c.height || '—'} cm</div></div>
          <div class="cit-info-cell"><div class="cit-lab">${escapeHtml(t('cit.field.phone'))}</div><div class="cit-val mono">${escapeHtml(c.phone || '—')}</div></div>
          <div class="cit-info-cell"><div class="cit-lab">${escapeHtml(t('cit.field.job'))}</div><div class="cit-val">${escapeHtml(c.job || '—')}</div></div>
          <div class="cit-info-cell"><div class="cit-lab">${escapeHtml(t('cit.field.bank'))}</div><div class="cit-val">${escapeHtml(fmtMoney(c.bank))}</div></div>
        </div>
      </div>
    </div>
  `;
}

function renderCitTabRecords(records) {
  if (!records.length) return `<div class="cit-tab-empty"><i class="fa-sharp fa-solid fa-shield-check"></i><h3>${escapeHtml(t('cit.records.empty.title'))}</h3><p>${escapeHtml(t('cit.records.empty.body'))}</p></div>`;
  // Inferir severidade pelo valor da multa (já que records guardam apenas o label)
  const sevByFine = (fine) => {
    if (fine >= 10000) return { color: '#7f1d1d', label: t('cit.rec.sev.critical') };
    if (fine >= 5000)  return { color: '#dc2626', label: t('cit.rec.sev.severe') };
    if (fine >= 2000)  return { color: '#f97316', label: t('cit.rec.sev.serious') };
    if (fine >= 500)   return { color: '#f59e0b', label: t('cit.rec.sev.moderate') };
    return { color: '#22c55e', label: t('cit.rec.sev.minor') };
  };
  return `
    <div class="cit-records-list">
      ${records.map(r => {
        const sev = sevByFine(Number(r.fine) || 0);
        return `
          <div class="cit-record-row" style="--rec-color:${sev.color}">
            <div class="cit-rec-side">
              <span class="cit-rec-sev">${escapeHtml(sev.label)}</span>
              <span class="cit-rec-date">${escapeHtml(fmtDate(r.created_at))}</span>
            </div>
            <div class="cit-rec-main">
              <div class="cit-rec-crime">${escapeHtml(relocalizeLabel('crime.', r.crime))}</div>
              ${r.notes ? `<div class="cit-rec-notes"><i class="fa-sharp fa-solid fa-quote-left"></i> ${escapeHtml(r.notes)}</div>` : ''}
              <div class="cit-rec-foot">
                <span><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(r.officer || '—')}</span>
              </div>
            </div>
            <div class="cit-rec-pen">
              <div class="cit-rec-fine">${escapeHtml(fmtMoney(r.fine))}</div>
              ${(r.jail||0) > 0 ? `<div class="cit-rec-jail"><i class="fa-sharp fa-solid fa-clock"></i> ${r.jail} min</div>` : ''}
            </div>
            <div class="cit-rec-actions">
              <button class="btn btn-ghost btn-sm" data-remove-record="${r.id}" title="${escapeHtml(t('cit.rec.remove_title'))}"><i class="fa-sharp fa-solid fa-xmark"></i></button>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

function renderCitTabVehicles(vehicles) {
  if (!vehicles.length) return `<div class="cit-tab-empty"><i class="fa-sharp fa-solid fa-car-side"></i><h3>${escapeHtml(t('cit.vehicles.empty.title'))}</h3><p>${escapeHtml(t('cit.vehicles.empty.body'))}</p></div>`;
  return `
    <div class="cit-vehicles-grid">
      ${vehicles.map(v => `
        <div class="cit-veh-card ${v.stolen ? 'cit-veh-stolen' : ''}">
          <div class="cit-veh-plate">${escapeHtml(v.plate)}</div>
          <div class="cit-veh-model"><i class="fa-sharp fa-solid fa-car"></i> ${escapeHtml(v.model || '—')}</div>
          <div class="cit-veh-tags">
            ${v.stolen ? `<span class="cit-tag cit-tag-red"><i class="fa-sharp fa-solid fa-triangle-exclamation"></i> ${escapeHtml(t('veh.flag.stolen'))}</span>` : ''}
            ${v.stored ? `<span class="cit-tag cit-tag-blue"><i class="fa-sharp fa-solid fa-warehouse"></i> ${escapeHtml(t('veh.location.garage'))}</span>` : `<span class="cit-tag cit-tag-grey"><i class="fa-sharp fa-solid fa-road"></i> ${escapeHtml(t('veh.location.in_use'))}</span>`}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCitTabFines(fines) {
  if (!fines.length) return `<div class="cit-tab-empty"><i class="fa-sharp fa-solid fa-receipt"></i><h3>${escapeHtml(t('cit.fines.empty.title'))}</h3><p>${escapeHtml(t('cit.fines.empty.body'))}</p></div>`;
  const pending = fines.filter(f => !f.paid);
  const paid    = fines.filter(f =>  f.paid);
  const totalDue = pending.reduce((a, f) => a + (Number(f.amount) || 0), 0);
  const totalPaid = paid.reduce((a, f) => a + (Number(f.amount) || 0), 0);

  const fineRow = (f) => `
    <div class="cit-fine-row ${f.paid ? 'cit-fine-paid' : 'cit-fine-pending'}">
      <div class="cit-fine-side">
        <span class="cit-fine-status">${escapeHtml(f.paid ? t('fine.status.paid_caps') : t('fine.status.pending_caps'))}</span>
        <span class="cit-fine-date">${escapeHtml(fmtDate(f.created_at))}</span>
      </div>
      <div class="cit-fine-main">
        <div class="cit-fine-reason">${escapeHtml(f.reason)}</div>
        <div class="cit-fine-officer"><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(f.officer || '—')}</div>
      </div>
      <div class="cit-fine-amount">${escapeHtml(fmtMoney(f.amount))}</div>
      <div class="cit-fine-actions">
        ${!f.paid ? `<button class="btn btn-ghost btn-sm" data-cancel-fine="${f.id}" title="${escapeHtml(t('fine.cancel_title'))}"><i class="fa-sharp fa-solid fa-xmark"></i></button>` : ''}
      </div>
    </div>`;

  return `
    <div class="cit-fines-summary">
      <div class="cit-fines-sum-card cit-due">
        <span class="cit-fines-sum-lab">${escapeHtml(t('cit.summary.due'))}</span>
        <span class="cit-fines-sum-val">${escapeHtml(fmtMoney(totalDue))}</span>
        <span class="cit-fines-sum-cnt">${escapeHtml(t('cit.fines.pending_n', pending.length))}</span>
      </div>
      <div class="cit-fines-sum-card cit-settled">
        <span class="cit-fines-sum-lab">${escapeHtml(t('cit.fines.section.paid'))}</span>
        <span class="cit-fines-sum-val">${escapeHtml(fmtMoney(totalPaid))}</span>
        <span class="cit-fines-sum-cnt">${escapeHtml(t('cit.fines.paid_n', paid.length))}</span>
      </div>
    </div>

    ${pending.length ? `
      <div class="cit-fines-section">
        <div class="cit-fines-section-h"><i class="fa-sharp fa-solid fa-circle-exclamation"></i> ${escapeHtml(t('cit.fines.section.pending'))}</div>
        ${pending.map(fineRow).join('')}
      </div>` : ''}

    ${paid.length ? `
      <div class="cit-fines-section">
        <div class="cit-fines-section-h cit-fines-h-paid"><i class="fa-sharp fa-solid fa-circle-check"></i> ${escapeHtml(t('cit.fines.section.paid'))}</div>
        ${paid.map(fineRow).join('')}
      </div>` : ''}
  `;
}

// Backwards-compat — alguns push handlers chamam loadCitizen
async function loadCitizen(identifier) { return openCitizenDoc(identifier); }

// ----------------- Vehicles --------------
// Normaliza uma matrícula para comparação:
// remove tudo o que não é A-Z / 0-9 e converte para upper.
function normalizePlate(p) {
  return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Formata uma matrícula para exibição. Detecta o formato:
//   • "11BB22"   →  "11-BB-22"   (formato PT antigo)
//   • "AB12CD"   →  "AB-12-CD"
//   • "12AB34"   →  "12-AB-34"
//   • "788FB982" →  "788FB982"  (formato moderno alfanumérico, sem separadores)
//   • outros     →  retorna a matrícula tal como está
function formatPlate(p) {
  const c = normalizePlate(p);
  if (!c) return '';
  // Padrão PT clássico: 2-2-2  (NN-LL-NN, LL-NN-LL, ou variações)
  if (c.length === 6 && /^[A-Z0-9]{6}$/.test(c)) {
    return `${c.slice(0,2)}-${c.slice(2,4)}-${c.slice(4,6)}`;
  }
  // Padrão moderno: 8 caracteres alfanuméricos contínuos
  return c;
}

// ===== Estado da pesquisa =====
let _vehicleSearchToken = 0;

function setVehicleView(v) {
  ['idle', 'searching', 'results'].forEach(s => {
    const el = $('#vh-state-' + s);
    if (el) el.classList.toggle('hidden', v !== s);
  });
}

function vehicleScannerLine(text, opts = {}) {
  const wrap = $('#vh-scanner');
  if (!wrap) return;
  const line = document.createElement('div');
  line.className = 'cit-scan-line ' + (opts.cls || '');
  line.innerHTML = text;
  wrap.appendChild(line);
  wrap.scrollTop = wrap.scrollHeight;
  return line;
}

function setVehicleProgress(pct) {
  const fill = $('#vh-search-fill');
  const lab  = $('#vh-search-pct');
  if (fill) fill.style.width = pct + '%';
  if (lab)  lab.textContent  = pct + '%';
}

async function searchVehicle() {
  const raw = $('#vehicle-search').value.trim();
  const plate = normalizePlate(raw);
  if (!plate) {
    setVehicleView('idle');
    return;
  }

  const myToken = ++_vehicleSearchToken;
  const t0 = performance.now();

  setVehicleView('searching');
  const scanner = $('#vh-scanner');
  if (scanner) scanner.innerHTML = '';
  setVehicleProgress(0);

  const display = formatPlate(plate);
  const steps = [
    { delay: 0,    pct: 8,   text: `<span class="cit-scan-prompt">▸</span> ${t('veh.scan.connect')}`, cls: '' },
    { delay: 110,  pct: 22,  text: `<span class="cit-scan-ok">[ OK ]</span>  ${t('veh.scan.encrypted')}`, cls: 'cit-scan-info' },
    { delay: 200,  pct: 38,  text: `<span class="cit-scan-prompt">▸</span> ${t('veh.scan.auth')}`, cls: '' },
    { delay: 280,  pct: 58,  text: `<span class="cit-scan-prompt">▸</span> ${t('veh.scan.querying')} <span class="cit-scan-q">${escapeHtml(display)}</span>`, cls: '' },
    { delay: 380,  pct: 78,  text: `<span class="cit-scan-dim">  &nbsp;&nbsp;&nbsp;${t('veh.scan.crossref')}</span>`, cls: 'cit-scan-info' }
  ];
  for (const step of steps) {
    if (myToken !== _vehicleSearchToken) return;
    await new Promise(r => setTimeout(r, step.delay));
    vehicleScannerLine(step.text, { cls: step.cls });
    setVehicleProgress(step.pct);
  }

  const rows = await nuiPost('searchVehicle', { plate });
  if (myToken !== _vehicleSearchToken) return;

  setVehicleProgress(100);
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    vehicleScannerLine(`<span class="cit-scan-warn">[ ! ]</span>  ${t('veh.scan.no_match')}`, { cls: 'cit-scan-warn-line' });
    await new Promise(r => setTimeout(r, 350));
  } else {
    vehicleScannerLine(`<span class="cit-scan-ok">[ OK ]</span>  ${t('veh.scan.matches')} <strong>${list.length}</strong>`, { cls: 'cit-scan-info' });
    await new Promise(r => setTimeout(r, 250));
  }
  if (myToken !== _vehicleSearchToken) return;

  const elapsed = Math.round(performance.now() - t0);
  setText('#vh-results-time', elapsed + ' ms');
  setText('#vehicle-result-count', list.length);
  renderVehicleResults(list);
  setVehicleView('results');
}

function vehicleRiskLevel(v) {
  if (v.stolen || v.boloMatch) return 'high';
  if ((v.warrantCount || 0) > 0) return 'high';
  if ((v.unpaidFines || 0) > 0 || (v.recordCount || 0) > 0) return 'medium';
  return 'low';
}

function renderVehicleResults(rows) {
  const wrap = $('#vehicle-results');
  if (!rows.length) {
    wrap.innerHTML = `
      <div class="vs-empty vs-empty-nores">
        <div class="vs-empty-icon vs-empty-not-found"><i class="fa-sharp fa-solid fa-circle-question"></i></div>
        <h3>${escapeHtml(t('veh.empty.title'))}</h3>
        <p>${escapeHtml(t('veh.empty.body'))}</p>
      </div>`;
    return;
  }
  wrap.classList.add('stagger');
  wrap.innerHTML = rows.map(v => {
    const isStolen   = !!v.stolen;
    const hasBolo    = !!v.boloMatch;
    const warrants   = Number(v.warrantCount || 0);
    const unpaid     = Number(v.unpaidFines || 0);
    const records    = Number(v.recordCount || 0);
    const risk       = vehicleRiskLevel(v);
    const display    = formatPlate(v.plate);

    // Lista de flags que aparecem como tags
    const flags = [];
    if (isStolen) flags.push(`<span class="vr-flag vr-flag-red"><i class="fa-sharp fa-solid fa-triangle-exclamation"></i> ${escapeHtml(t('veh.flag.stolen'))}</span>`);
    if (hasBolo)  flags.push(`<span class="vr-flag vr-flag-purple"><i class="fa-sharp fa-solid fa-bullhorn"></i> ${escapeHtml(t('veh.flag.bolo'))}</span>`);
    if (warrants) flags.push(`<span class="vr-flag vr-flag-amber"><i class="fa-sharp fa-solid fa-scale-balanced"></i> ${escapeHtml(t('veh.flag.warrants', warrants))}</span>`);
    if (unpaid)   flags.push(`<span class="vr-flag vr-flag-blue"><i class="fa-sharp fa-solid fa-receipt"></i> ${escapeHtml(t('veh.flag.unpaid', unpaid))}</span>`);
    if (records)  flags.push(`<span class="vr-flag vr-flag-grey"><i class="fa-sharp fa-solid fa-handcuffs"></i> ${escapeHtml(t('veh.flag.records', records))}</span>`);

    // Status tag (em ordem / risco moderado / risco elevado)
    let statusTag;
    if (risk === 'high') {
      statusTag = `<span class="vr-status vr-stolen"><i class="fa-sharp fa-solid fa-triangle-exclamation"></i> ${escapeHtml(t('veh.status.high'))}</span>`;
    } else if (risk === 'medium') {
      statusTag = `<span class="vr-status vr-warn"><i class="fa-sharp fa-solid fa-circle-exclamation"></i> ${escapeHtml(t('veh.status.warn'))}</span>`;
    } else {
      statusTag = `<span class="vr-status vr-ok"><i class="fa-sharp fa-solid fa-circle-check"></i> ${escapeHtml(t('veh.status.ok'))}</span>`;
    }

    // Modelo + marca (ex.: "Pegassi · Zentorno")
    const modelTxt = v.model && String(v.model).trim()
      ? (v.make ? `${v.make} · ${v.model}` : v.model)
      : t('veh.model.unknown');

    return `
      <div class="vehicle-record risk-${risk} ${isStolen ? 'is-stolen' : ''}">
        <div class="vr-plate-block">
          <div class="vr-plate-tag">${escapeHtml(t('veh.tag.state'))}</div>
          <div class="vr-plate-num">${escapeHtml(display)}</div>
          <div class="vr-plate-state">${escapeHtml(t('veh.tag.plate'))}</div>
        </div>
        <div class="vr-info">
          <div class="vr-row1">
            <h3 class="vr-model">${escapeHtml(modelTxt)}</h3>
            ${statusTag}
          </div>
          ${flags.length ? `<div class="vr-flags">${flags.join('')}</div>` : ''}
          <div class="vr-fields">
            <div class="vr-field">
              <span class="vr-fld-label"><i class="fa-sharp fa-solid fa-user"></i> ${escapeHtml(t('veh.field.owner'))}</span>
              <span class="vr-fld-val">${v.ownerName ? escapeHtml(v.ownerName) : `<span class="muted">${escapeHtml(t('veh.field.no_owner'))}</span>`}</span>
            </div>
            <div class="vr-field">
              <span class="vr-fld-label"><i class="fa-sharp fa-solid fa-warehouse"></i> ${escapeHtml(t('veh.field.location'))}</span>
              <span class="vr-fld-val">${escapeHtml(v.stored ? t('veh.location.garage') : t('veh.location.in_use'))}</span>
            </div>
          </div>
        </div>
        <div class="vr-actions">
          ${v.ownerId ? `
            <button class="btn btn-sm btn-ghost vr-act-open" data-open-owner="${escapeHtml(v.ownerId)}">
              <i class="fa-sharp fa-solid fa-id-card"></i> ${escapeHtml(t('veh.action.file'))}
            </button>` : ''}
          <button class="btn btn-sm ${isStolen ? 'btn-ghost' : 'btn-danger'}"
                  data-toggle-stolen="${escapeHtml(v.plate)}"
                  data-current="${isStolen ? 1 : 0}">
            <i class="fa-sharp fa-solid ${isStolen ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
            ${escapeHtml(isStolen ? t('veh.action.unmark') : t('veh.action.mark_stolen'))}
          </button>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-toggle-stolen]', wrap).forEach(btn => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const plate = btn.dataset.toggleStolen;
    const newVal = btn.dataset.current !== '1';
    await nuiPost('setVehicleStolen', { plate, stolen: newVal });
    setTimeout(() => searchVehicle(), 300);
  }));
  $$('[data-open-owner]', wrap).forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = btn.dataset.openOwner;
    if (!id) return;
    goTo('citizens');
    setTimeout(() => { try { openCitizenDoc(id); } catch (_) {} }, 50);
  }));
}

// ----------------- BOLOs -----------------
async function loadBolos() {
  const rows = await nuiPost('listBolos');
  State.bolos = rows || [];
  renderBolos();
}

function renderBolos() {
  const grid = $('#bolos-grid');
  const activeCount = (State.bolos || []).filter(b => b.active).length;
  const cntEl = $('#bolo-active-count'); if (cntEl) cntEl.textContent = activeCount;

  if (!State.bolos.length) {
    grid.innerHTML = `
      <div class="bolo-empty">
        <i class="fa-sharp fa-solid fa-bullhorn"></i>
        <h3>${escapeHtml(t('bolo.empty.title'))}</h3>
        <p>${escapeHtml(t('bolo.empty.body'))}</p>
      </div>`;
    return;
  }

  grid.classList.add('stagger');
  grid.innerHTML = State.bolos.map(b => {
    const prio = b.priority || 'medium';
    const prioLabel = (State.config.priorities || []).find(p => p.id === prio);
    // Prefere foto capturada (base64) sobre URL externa
    let imgSrc = '';
    if (b.image_b64) {
      imgSrc = `data:${b.image_mime || 'image/jpeg'};base64,${b.image_b64}`;
    } else if (b.image_url) {
      imgSrc = b.image_url;
    }
    const hasImg = !!imgSrc;
    const inactive = !b.active;
    return `
      <div class="bolo-poster priority-${prio} ${inactive ? 'inactive' : ''}">
        <div class="bp-banner">
          <span class="bp-stamp">BOLO</span>
          <span class="bp-priority priority-${prio}">${escapeHtml(prioLabel ? prioLabel.label : prio)}</span>
        </div>
        <div class="bp-photo ${hasImg ? '' : 'bp-photo-empty'}" ${hasImg ? `style="background-image:url('${imgSrc.replace(/'/g, "\\'")}')"` : ''}>
          ${hasImg ? '' : '<i class="fa-sharp fa-solid fa-user-secret"></i>'}
        </div>
        <div class="bp-info">
          <h3 class="bp-title">${escapeHtml(b.title)}</h3>
          ${b.target ? `<div class="bp-target"><i class="fa-sharp fa-solid fa-crosshairs"></i> ${escapeHtml(b.target)}</div>` : ''}
          <div class="bp-desc">${escapeHtml(b.description || '')}</div>
        </div>
        <div class="bp-foot">
          <div class="bp-officer">
            <i class="fa-sharp fa-solid fa-user-shield"></i>
            <span>${escapeHtml(b.officer)}</span>
          </div>
          <div class="bp-time">${escapeHtml(fmtDate(b.created_at))}</div>
        </div>
        <div class="bp-actions">
          <button class="btn btn-sm btn-ghost" data-delete-bolo="${b.id}"><i class="fa-sharp fa-solid fa-trash"></i> ${escapeHtml(t('common.delete'))}</button>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-delete-bolo]', grid).forEach(btn => btn.addEventListener('click', () => {
    confirmModal(t('bolo.confirm.title'), t('bolo.confirm_delete'), async () => {
      await nuiPost('deleteBolo', { id: Number(btn.dataset.deleteBolo) });
      setTimeout(loadBolos, 300);
    });
  }));
}

function populateBoloPriorities() {
  const sel = $('#bolo-priority');
  if (!sel) return;
  sel.innerHTML = (State.config.priorities || []).map(p =>
    `<option value="${escapeHtml(p.id)}" data-color="${escapeHtml(p.color || '')}">${escapeHtml(p.label)}</option>`
  ).join('');
  MdtDD.refresh(sel);
}

// ----------------- Records modal ---------
let _recordCrimeChangeHandler = null;
async function populateRecordCrimes() {
  const sel = $('#record-crime');
  if (!sel) return;

  // Carrega lista de multas/crimes da BD (com fallback para config se vazio)
  let offences = await nuiPost('listOffences');
  if (!Array.isArray(offences) || !offences.length) {
    offences = (State.config.crimes || []).map((c, i) => ({
      id: 'cfg_' + i, code: '', name: c.label, fine: c.fine || 0,
      jail: c.jail || 0, category: 'config', severity: 'minor'
    }));
  }
  State.offencesCache = offences;

  const SEV_COLORS = {
    minor: '#22c55e', moderate: '#f59e0b', serious: '#f97316',
    severe: '#dc2626', critical: '#7f1d1d'
  };

  const dict = currentLocale();
  sel.innerHTML = offences.map(o => {
    const code = o.code ? `[${o.code}] ` : '';
    const nameLoc = (o.code && dict[`off.code.${o.code}`])
      || relocalizeLabel('crime.', o.name)
      || o.name;
    return `<option value="${escapeHtml(o.id)}"
                  data-color="${escapeHtml(SEV_COLORS[o.severity] || '#6b7280')}"
                  data-icon="fa-gavel">${escapeHtml(code + nameLoc)} · ${escapeHtml(fmtMoney(o.fine || 0))}</option>`;
  }).join('');
  MdtDD.refresh(sel);

  // Substitui handler anterior (sem clonar o elemento — mantém o wrapper do dropdown intacto)
  if (_recordCrimeChangeHandler) {
    sel.removeEventListener('change', _recordCrimeChangeHandler);
  }
  _recordCrimeChangeHandler = () => {
    const id = sel.value;
    const crime = (State.offencesCache || []).find(c => String(c.id) === String(id));
    if (crime) {
      $('#record-fine').value = crime.fine || 0;
      $('#record-jail').value = crime.jail || 0;
    }
  };
  sel.addEventListener('change', _recordCrimeChangeHandler);
  sel.dispatchEvent(new Event('change'));
}

let recordTargetIdentifier = null;
function openRecordModal(identifier) {
  recordTargetIdentifier = identifier;
  $('#modal-record').classList.remove('hidden');
}

let fineTargetIdentifier = null;
function openFineModal(identifier) {
  fineTargetIdentifier = identifier;
  $('#cz-fine-amount').value = '';
  $('#cz-fine-reason').value = '';
  $('#modal-fine').classList.remove('hidden');
}

// ----------------- Reports ---------------
function populateReportCategories() {
  const sel = $('#report-category');
  if (!sel) return;
  sel.innerHTML = (State.config.categories || []).map(c =>
    `<option value="${escapeHtml(c)}" data-icon="fa-folder">${escapeHtml(c)}</option>`
  ).join('');
  MdtDD.refresh(sel);
}

async function loadReports() {
  const rows = await nuiPost('listReports');
  State.reports = rows || [];
  renderReports();
}

function renderReports() {
  const wrap = $('#reports-list');
  const list = State.reports || [];

  // Construir filtros (categorias únicas)
  const filtersWrap = $('#reports-filters');
  if (filtersWrap) {
    const cats = [...new Set(list.map(r => r.category).filter(Boolean))];
    filtersWrap.innerHTML = `
      <button class="rep-filter ${(!State.reportFilter || State.reportFilter === 'all') ? 'active' : ''}" data-filter="all">
        <i class="fa-sharp fa-solid fa-folder-open"></i> ${escapeHtml(t('common.all'))} <span class="rf-count">${list.length}</span>
      </button>
      ${cats.map(c => {
        const n = list.filter(r => r.category === c).length;
        const localCat = relocalizeLabel('rep.cat.', c);
        return `<button class="rep-filter ${State.reportFilter === c ? 'active' : ''}" data-filter="${escapeHtml(c)}">
          <i class="fa-sharp fa-solid fa-folder"></i> ${escapeHtml(localCat)} <span class="rf-count">${n}</span>
        </button>`;
      }).join('')}
    `;
    $$('.rep-filter', filtersWrap).forEach(b => b.addEventListener('click', () => {
      State.reportFilter = b.dataset.filter;
      renderReports();
    }));
  }

  // Aplicar filtro
  const filter = State.reportFilter || 'all';
  const filtered = filter === 'all' ? list : list.filter(r => r.category === filter);

  if (!filtered.length) {
    wrap.innerHTML = `
      <div class="reports-empty">
        <i class="fa-sharp fa-solid fa-folder-open"></i>
        <h3>${escapeHtml(t('rep.empty.cat.title'))}</h3>
        <p>${escapeHtml(filter === 'all' ? t('rep.empty.body') : t('rep.empty.cat.body'))}</p>
      </div>`;
    return;
  }

  wrap.classList.add('stagger');
  wrap.innerHTML = filtered.map(r => {
    const initials = (r.officer || '?').split(' ').map(s => s[0] || '').slice(0,2).join('').toUpperCase();
    const date = fmtDate(r.created_at);
    return `
      <div class="report-dossier">
        <div class="rd-tab"><i class="fa-sharp fa-solid fa-file-lines"></i> ${escapeHtml(relocalizeLabel('rep.cat.', r.category) || t('rep.default_category'))}</div>
        <div class="rd-body">
          <div class="rd-header">
            <h3 class="rd-title">${escapeHtml(r.title)}</h3>
            <button class="rd-delete" data-delete-report="${r.id}" title="${escapeHtml(t('common.delete'))}"><i class="fa-sharp fa-solid fa-trash"></i></button>
          </div>
          <div class="rd-meta">
            <span class="rd-officer-av">${escapeHtml(initials)}</span>
            <span class="rd-officer">${escapeHtml(r.officer)}</span>
            <span class="rd-sep">·</span>
            <span class="rd-date"><i class="fa-sharp fa-solid fa-calendar"></i> ${escapeHtml(date)}</span>
            ${r.involved ? `<span class="rd-sep">·</span><span class="rd-involved"><i class="fa-sharp fa-solid fa-users"></i> ${escapeHtml(r.involved)}</span>` : ''}
          </div>
          <div class="rd-content">${escapeHtml(r.content)}</div>
          <div class="rd-stamp">${escapeHtml(t('rep.tag.confidential'))}</div>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-delete-report]', wrap).forEach(btn => btn.addEventListener('click', () => {
    confirmModal(t('rep.confirm.title'), t('rep.confirm_delete'), async () => {
      await nuiPost('deleteReport', { id: Number(btn.dataset.deleteReport) });
      setTimeout(loadReports, 300);
    });
  }));
}

// ----------------- Dispatch --------------
State.dispatches = [];

function dispatchTypeMeta(typeId) {
  const types = (State.config && State.config.dispatchTypes) || {};
  const meta = types[typeId];
  if (!meta) return { label: typeId, icon: 'fa-tower-broadcast', color: '#3b82f6', priority: 'low' };
  // Tenta traduzir o label via locale (chave: disp.type.<id>) — fallback para o
  // label do config (que está sempre em PT por defeito).
  const i18nKey = 'disp.type.' + typeId;
  const dict = currentLocale();
  const localized = dict && dict[i18nKey];
  return Object.assign({}, meta, { label: localized || meta.label });
}

function setupDispatchMap() {
  const img    = $('#dispatch-img');
  const frame  = $('#dispatch-frame');
  const canvas = $('#dispatch-canvas');
  if (!img || !frame) return;

  const candidates = ['img/map.png', 'img/map.jpg', 'img/map.svg'];
  let idx = 0;

  const applyAspect = (w, h) => {
    const ar = `${w} / ${h}`;
    if (frame)  frame.style.aspectRatio = ar;
    if (canvas) canvas.style.aspectRatio = ar;
  };
  img.onload  = () => {
    const w = img.naturalWidth  || 738, h = img.naturalHeight || 1098;
    applyAspect(w, h);
    if (State.currentApp === 'dispatch') renderDispatchMarkers();
  };
  img.onerror = () => { if (idx < candidates.length) img.src = candidates[idx++]; };
  if (State.config.mapRatio) applyAspect(State.config.mapRatio.w, State.config.mapRatio.h);
  img.src = candidates[idx++];
}

const dispatchMarkerCache = new Map();

function renderDispatchMarkers() {
  const layer = $('#dispatch-markers');
  if (!layer) return;
  const list = State.dispatches || [];
  const liveIds = new Set();

  list.forEach(d => {
    const meta = dispatchTypeMeta(d.type);
    const p = projectCoord(d.x, d.y);
    liveIds.add(d.id);

    let m = dispatchMarkerCache.get(d.id);
    if (!m) {
      m = document.createElement('div');
      m.className = `dispatch-marker priority-${meta.priority}`;
      m.innerHTML = `
        <span class="dm-pulse"></span>
        <span class="dm-pulse dm-pulse-2"></span>
        <span class="dm-core"><i class="fa-sharp fa-solid ${meta.icon}"></i></span>
        <span class="tip"></span>
      `;
      m.addEventListener('click', (ev) => {
        ev.stopPropagation();
        zoomToDispatch(d);
      });
      layer.appendChild(m);
      dispatchMarkerCache.set(d.id, m);
    } else {
      m.className = `dispatch-marker priority-${meta.priority}`;
      const ic = m.querySelector('.dm-core i');
      if (ic) ic.className = `fa-sharp fa-solid ${meta.icon}`;
    }
    m.style.setProperty('--dm-color', meta.color);
    m.style.left = p.x + '%';
    m.style.top  = p.y + '%';
    const tip = m.querySelector('.tip');
    if (tip) tip.textContent = meta.label;
  });

  dispatchMarkerCache.forEach((el, id) => {
    if (!liveIds.has(id)) { el.remove(); dispatchMarkerCache.delete(id); }
  });
}

let dispatchMapView = null;   // estado de zoom independente p/ mapa de dispatch
function applyDispatchTransform() {
  if (!dispatchMapView) return;
  const frame  = $('#dispatch-frame');
  const canvas = $('#dispatch-canvas');
  if (!frame) return;
  frame.style.transformOrigin = '0 0';
  frame.style.transform = `translate(${dispatchMapView.tx}px, ${dispatchMapView.ty}px) scale(${dispatchMapView.scale})`;
  frame.style.setProperty('--map-scale', dispatchMapView.scale);
  if (canvas) canvas.classList.toggle('zoomed', dispatchMapView.scale > 1);
  const btn = $('#dispatch-zoom-reset');
  if (btn) {
    const isReset = (dispatchMapView.scale === 1 && dispatchMapView.tx === 0 && dispatchMapView.ty === 0);
    btn.classList.toggle('hidden', isReset);
  }
}

function zoomToDispatch(d) {
  if (!d) return;
  const p = projectCoord(d.x, d.y);
  const scale = (State.config && State.config.mapZoomScale) || 4.0;
  const canvas = $('#dispatch-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  dispatchMapView = dispatchMapView || { scale: 1, tx: 0, ty: 0, dragging: false };
  dispatchMapView.scale = scale;
  dispatchMapView.tx = rect.width  / 2 - (p.x / 100) * rect.width  * scale;
  dispatchMapView.ty = rect.height / 2 - (p.y / 100) * rect.height * scale;
  dispatchMapView.tx = Math.max(rect.width  * (1 - scale), Math.min(0, dispatchMapView.tx));
  dispatchMapView.ty = Math.max(rect.height * (1 - scale), Math.min(0, dispatchMapView.ty));
  applyDispatchTransform();
}

function resetDispatchZoom() {
  dispatchMapView = { scale: 1, tx: 0, ty: 0, dragging: false };
  applyDispatchTransform();
}

function renderDispatchList() {
  const wrap = $('#dispatch-list');
  if (!wrap) return;
  const list = State.dispatches || [];

  // Stats
  const totalEl = $('#dispatch-count');      if (totalEl) totalEl.textContent = list.length;
  const highEl  = $('#dispatch-count-high'); if (highEl)  highEl.textContent  = list.filter(d => dispatchTypeMeta(d.type).priority === 'high').length;
  const cadCnt  = $('#cad-panel-count');     if (cadCnt)  cadCnt.textContent  = list.length;
  const navBadge = $('#nav-dispatch-count');
  if (navBadge) {
    if (list.length > 0) { navBadge.textContent = list.length; navBadge.style.display = 'inline-flex'; }
    else                   navBadge.style.display = 'none';
  }

  if (!list.length) {
    wrap.innerHTML = `
      <div class="cad-empty">
        <i class="fa-sharp fa-solid fa-circle-check"></i>
        <span>${escapeHtml(t('disp.empty.title'))}</span>
        <small>${escapeHtml(t('disp.empty.body'))}</small>
      </div>`;
    return;
  }
  wrap.classList.add('stagger');
  wrap.innerHTML = list.map(d => {
    const meta = dispatchTypeMeta(d.type);
    return `
      <div class="dispatch-card priority-${meta.priority}" style="--dm-color:${meta.color}" data-id="${d.id}">
        <div class="dc-row1">
          <span class="dc-icon" style="background:${meta.color}25;color:${meta.color}"><i class="fa-sharp fa-solid ${meta.icon}"></i></span>
          <div class="dc-meta">
            <div class="dc-title">${escapeHtml(meta.label)}</div>
            <div class="dc-zone"><i class="fa-sharp fa-solid fa-location-dot"></i> ${escapeHtml(d.zone || '—')} · ${escapeHtml(timeAgo(new Date(d.ts * 1000)))}</div>
          </div>
        </div>
        ${d.description ? `<div class="dc-desc">${escapeHtml(d.description)}</div>` : ''}
        <div class="dc-actions">
          <button class="btn btn-sm btn-ghost" data-zoom-dispatch="${d.id}"><i class="fa-sharp fa-solid fa-magnifying-glass"></i> ${escapeHtml(t('disp.action.see'))}</button>
          <button class="btn btn-sm btn-ghost" data-waypoint-dispatch="${d.id}"><i class="fa-sharp fa-solid fa-route"></i> ${escapeHtml(t('disp.action.gps'))}</button>
          <button class="btn btn-sm btn-resolve" data-clear-dispatch="${d.id}" title="${escapeHtml(t('disp.action.resolve_title'))}"><i class="fa-sharp fa-solid fa-check"></i> ${escapeHtml(t('disp.action.resolve'))}</button>
        </div>
      </div>
    `;
  }).join('');

  // Click no card todo → zoom
  $$('.dispatch-card', wrap).forEach(card => card.addEventListener('click', () => {
    const d = list.find(x => x.id === Number(card.dataset.id));
    if (d) zoomToDispatch(d);
  }));

  $$('[data-zoom-dispatch]', wrap).forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = list.find(x => x.id === Number(b.dataset.zoomDispatch));
    if (d) zoomToDispatch(d);
  }));
  $$('[data-waypoint-dispatch]', wrap).forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = list.find(x => x.id === Number(b.dataset.waypointDispatch));
    if (d) nuiPost('setWaypoint', { x: d.x, y: d.y });
  }));
  $$('[data-clear-dispatch]', wrap).forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    nuiPost('clearDispatch', { id: Number(b.dataset.clearDispatch) });
  }));
}

function renderDispatchQuickButtons() {
  const wrap = $('#dispatch-quick-grid');
  if (!wrap) return;
  const types = (State.config && State.config.dispatchTypes) || {};
  const entries = Object.entries(types);
  if (!entries.length) {
    wrap.innerHTML = `<p class="muted dq-empty">${escapeHtml(t('common.no_data'))}</p>`;
    return;
  }
  // Botões compactos com TEXTO (label) — clicas no nome, não em ícone.
  // No mapa os marcadores continuam como ícones; isto só muda a barra de envio.
  wrap.innerHTML = entries.map(([id, meta]) => {
    const label = dispatchTypeMeta(id).label;
    return `
    <button class="dq-pill priority-${meta.priority || 'low'}"
            data-type="${escapeHtml(id)}"
            title="${escapeHtml(label)}"
            style="--dm-color:${meta.color}">
      <span class="dq-pill-dot"></span>
      <span class="dq-pill-lbl">${escapeHtml(label)}</span>
    </button>`;
  }).join('');

  $$('.dq-pill', wrap).forEach(b => b.addEventListener('click', async () => {
    const type = b.dataset.type;
    b.classList.add('sending');
    await nuiPost('quickDispatch', { type });
    setTimeout(() => b.classList.remove('sending'), 600);
    toast(t('disp.toast.sent', dispatchTypeMeta(type).label), 'success');
  }));
}

async function loadDispatch() {
  setupDispatchMap();
  renderDispatchQuickButtons();
  let rows = null;
  try { rows = await nuiPost('listDispatches'); }
  catch (e) { console.warn('[MDT] listDispatches falhou:', e); rows = null; }
  State.dispatches = Array.isArray(rows) ? rows : [];
  renderDispatchMarkers();
  renderDispatchList();
}

// ===== Overlay in-game (canto superior direito) =====
function showDispatchAlert(d) {
  if (!State.config || State.config.dispatchInGameAlerts === false) return;
  const overlay = $('#dispatch-overlay');
  if (!overlay) return;
  const meta = dispatchTypeMeta(d.type);

  const el = document.createElement('div');
  el.className = `dispatch-alert priority-${meta.priority}`;
  el.style.setProperty('--dm-color', meta.color);
  el.innerHTML = `
    <div class="da-bar"></div>
    <div class="da-icon"><i class="fa-sharp fa-solid ${meta.icon}"></i></div>
    <div class="da-body">
      <div class="da-head">
        <span class="da-tag">${escapeHtml(t('disp.alert.tag'))} · ${escapeHtml((meta.priority || 'low').toUpperCase())}</span>
        <span class="da-time">${escapeHtml(t('disp.alert.now'))}</span>
      </div>
      <div class="da-title">${escapeHtml(meta.label)}</div>
      <div class="da-zone"><i class="fa-sharp fa-solid fa-location-dot"></i> ${escapeHtml(d.zone || '—')}</div>
      ${d.description ? `<div class="da-desc">${escapeHtml(d.description)}</div>` : ''}
    </div>
  `;
  overlay.appendChild(el);

  // Auto-remove (configurável)
  const durationMs = ((State.config && State.config.dispatchOverlayDuration) || 8) * 1000;
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    setTimeout(() => el.remove(), 300);
  }, durationMs);
}

// ----------------- Incidents -------------
let selectedWeapons = new Set();

function populateWeaponPicker() {
  const grid = $('#weapon-grid');
  if (!grid) return;
  const list = State.config.weapons || [];
  if (!list.length) {
    grid.innerHTML = `<p class="muted pad">${escapeHtml(t('inc.weapons.no_arsenal'))}</p>`;
    return;
  }
  grid.innerHTML = list.map(w => `
    <div class="weapon-item" data-weapon="${escapeHtml(w.id)}" title="${escapeHtml(w.label)}">
      <img class="weapon-img" src="img/weapons/${escapeHtml(w.id)}.png"
           onerror="this.parentNode.style.display='none'" alt="${escapeHtml(w.label)}" />
    </div>
  `).join('');

  $$('.weapon-item', grid).forEach(it => {
    it.addEventListener('click', () => {
      const id = it.dataset.weapon;
      if (selectedWeapons.has(id)) {
        selectedWeapons.delete(id);
        it.classList.remove('selected');
      } else {
        selectedWeapons.add(id);
        it.classList.add('selected');
      }
      renderSelectedWeapons();
    });
  });
}

function renderSelectedWeapons() {
  const wrap = $('#weapon-selected');
  if (!wrap) return;
  if (!selectedWeapons.size) { wrap.innerHTML = ''; return; }
  const list = State.config.weapons || [];
  const byId = Object.fromEntries(list.map(w => [w.id, w]));
  wrap.innerHTML = [...selectedWeapons].map(id => {
    const w = byId[id]; if (!w) return '';
    return `<span class="weapon-pill" title="${escapeHtml(w.label)}"><img src="img/weapons/${escapeHtml(id)}.png" /></span>`;
  }).join('');
}

// Coalesce + signature para evitar flicker visual em cascadas de incidentChanged
let _loadIncidentsInflight = null;
let _loadIncidentsLastSig = '';

function _incidentsSignature(rows) {
  return (rows || []).map(r =>
    `${r.id}:${r.created_at}:${r.photo_count || 0}:${r.title || ''}:${r.hero_b64 ? r.hero_b64.length : 0}`
  ).join('|');
}

async function loadIncidents() {
  if (_loadIncidentsInflight) return _loadIncidentsInflight;
  _loadIncidentsInflight = (async () => {
    try {
      const rows = await nuiPost('listIncidents');
      const sig = _incidentsSignature(rows);
      const changed = sig !== _loadIncidentsLastSig;
      _loadIncidentsLastSig = sig;
      State.incidents = rows || [];
      if (changed) renderIncidents();
    } finally {
      setTimeout(() => { _loadIncidentsInflight = null; }, 250);
    }
  })();
  return _loadIncidentsInflight;
}

function renderIncidents() {
  const wrap = $('#incidents-list');
  if (!wrap) return;
  const list = State.incidents || [];
  const types = State.config.incidentTypes || {};

  // Filtros por tipo
  const filtersWrap = $('#inc-filters');
  if (filtersWrap) {
    const usedTypes = [...new Set(list.map(i => i.type).filter(Boolean))];
    filtersWrap.innerHTML = `
      <button class="inc-filter ${(!State.incidentFilter || State.incidentFilter === 'all') ? 'active' : ''}" data-filter="all">
        <i class="fa-sharp fa-solid fa-grip"></i> ${escapeHtml(t('common.all_m'))} <span class="rf-count">${list.length}</span>
      </button>
      ${usedTypes.map(typ => {
        const meta = types[typ] || { label: typ, color: '#7f8c8d' };
        const n = list.filter(i => i.type === typ).length;
        return `<button class="inc-filter ${State.incidentFilter === typ ? 'active' : ''}" data-filter="${escapeHtml(typ)}" style="--ic-color:${meta.color}">
          <span class="inc-filter-dot"></span> ${escapeHtml(meta.label)} <span class="rf-count">${n}</span>
        </button>`;
      }).join('')}
    `;
    $$('.inc-filter', filtersWrap).forEach(b => b.addEventListener('click', () => {
      State.incidentFilter = b.dataset.filter;
      renderIncidents();
    }));
  }

  // Counter total
  const cntEl = $('#inc-active-count'); if (cntEl) cntEl.textContent = list.length;

  // Aplica filtro
  const filter = State.incidentFilter || 'all';
  const filtered = filter === 'all' ? list : list.filter(i => i.type === filter);

  if (!filtered.length) {
    wrap.innerHTML = `
      <div class="inc-empty">
        <i class="fa-sharp fa-solid fa-clipboard-list"></i>
        <h3>${escapeHtml(list.length === 0 ? t('inc.empty.title') : t('inc.empty_filter.title'))}</h3>
        <p>${escapeHtml(list.length === 0 ? t('inc.empty.body') : t('inc.empty_filter.body'))}</p>
      </div>`;
    return;
  }

  wrap.classList.add('stagger');
  wrap.innerHTML = filtered.map((i, idx) => {
    let weapons = [];
    try { weapons = JSON.parse(i.weapons || '[]'); } catch (e) { weapons = []; }
    const typeMeta = types[i.type] || { label: i.type || 'Outros', color: '#7f8c8d' };
    const caseNum = String(i.id || 0).padStart(5, '0');

    const wHtml = weapons.length
      ? `<div class="ic-weapons">${weapons.map(w =>
          `<img class="ic-weapon-thumb" src="img/weapons/${escapeHtml(w)}.png" title="${escapeHtml(w)}"
                onerror="this.style.display='none'"/>`
        ).join('')}</div>`
      : '';

    let heroSrc = '';
    if (i.hero_b64) heroSrc = `data:${i.hero_mime || 'image/jpeg'};base64,${i.hero_b64}`;
    const photoCount = Number(i.photo_count || 0);

    return `
      <div class="case-file" style="--ic-color:${typeMeta.color}" data-incident-id="${i.id}">
        <div class="cf-tab"><i class="fa-sharp fa-solid fa-folder"></i> ${escapeHtml(typeMeta.label)}</div>
        <div class="cf-body">
          <div class="cf-header">
            <div class="cf-case-no">${escapeHtml(t('inc.case_no'))} <strong>${escapeHtml(caseNum)}</strong></div>
            <button class="cf-delete" data-delete-incident="${i.id}" title="${escapeHtml(t('inc.archive_title'))}"><i class="fa-sharp fa-solid fa-box-archive"></i></button>
          </div>
          ${heroSrc ? `
            <div class="cf-photo" data-zoom-src="${heroSrc}">
              <img src="${heroSrc}" alt="" onerror="this.parentElement.style.display='none'"/>
              ${photoCount > 1 ? `<span class="cf-photo-count"><i class="fa-sharp fa-solid fa-images"></i> ${photoCount}</span>` : ''}
            </div>` : ''}
          <h3 class="cf-title">${escapeHtml(i.title)}</h3>
          <div class="cf-meta">
            <span><i class="fa-sharp fa-solid fa-user-shield"></i> <strong>${escapeHtml(i.officer)}</strong></span>
            <span class="cf-sep">·</span>
            <span><i class="fa-sharp fa-solid fa-clock"></i> ${escapeHtml(timeAgo(i.created_at))}</span>
            ${i.location ? `<span class="cf-sep">·</span><span><i class="fa-sharp fa-solid fa-location-dot"></i> ${escapeHtml(i.location)}</span>` : ''}
          </div>
          ${i.suspects ? `
            <div class="cf-block">
              <div class="cf-block-label"><i class="fa-sharp fa-solid fa-users-line"></i> ${escapeHtml(t('inc.suspects_label'))}</div>
              <div class="cf-block-content">${escapeHtml(i.suspects)}</div>
            </div>` : ''}
          ${i.description ? `
            <div class="cf-block">
              <div class="cf-block-label"><i class="fa-sharp fa-solid fa-file-lines"></i> ${escapeHtml(t('inc.report_label'))}</div>
              <div class="cf-block-content">${escapeHtml(i.description)}</div>
            </div>` : ''}
          ${weapons.length ? `
            <div class="cf-block">
              <div class="cf-block-label"><i class="fa-sharp fa-solid fa-gun"></i> ${escapeHtml(t('inc.evidence_label'))} (${weapons.length})</div>
              ${wHtml}
            </div>` : ''}
          <div class="cf-stamp">${escapeHtml(t('inc.case_open_stamp'))}</div>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-delete-incident]', wrap).forEach(btn => btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    confirmModal(t('inc.confirm_archive.title'), t('inc.confirm_archive.body'), async () => {
      await nuiPost('deleteIncident', { id: Number(btn.dataset.deleteIncident) });
      setTimeout(loadIncidents, 300);
    });
  }));

  // Click numa case-file → abre o caso em modo EDIÇÃO (campos + fotos)
  // Click na hero photo → abre lightbox em vez de editar
  $$('.case-file', wrap).forEach(card => {
    const incId = Number(card.dataset.incidentId);
    card.addEventListener('click', (ev) => {
      if (ev.target.closest('.cf-delete')) return;
      // Click directo na foto → lightbox
      if (ev.target.closest('.cf-photo')) {
        const photoEl = card.querySelector('.cf-photo');
        if (photoEl && photoEl.dataset.zoomSrc) openPhotoLightbox(photoEl.dataset.zoomSrc);
        return;
      }
      // Resto do card → editar caso
      openIncidentEdit(incId);
    });
  });
}

// ----------------- Messages --------------
function populateChannels() {
  const wrap = $('#chat-channels');
  if (!wrap) return;   // app messages foi removido; chat agora vive no painel
  const iconFor = (id) => ({
    general:   'fa-comments',
    patrol:    'fa-walkie-talkie',
    detective: 'fa-magnifying-glass',
    command:   'fa-star'
  }[id] || 'fa-hashtag');

  wrap.innerHTML = (State.config.channels || []).map(c => `
    <div class="channel-row ${c.id === State.currentChannel ? 'active' : ''}" data-channel="${escapeHtml(c.id)}">
      <i class="fa-sharp fa-solid ${iconFor(c.id)}"></i>
      <span>${escapeHtml(c.label)}</span>
    </div>
  `).join('');

  $$('.channel-row', wrap).forEach(row => row.addEventListener('click', () => {
    State.currentChannel = row.dataset.channel;
    $$('.channel-row', wrap).forEach(r => r.classList.toggle('active', r.dataset.channel === State.currentChannel));
    loadMessages();
  }));
}

async function loadMessages() {
  const rows = await nuiPost('listMessages', { channel: State.currentChannel });
  State.messages[State.currentChannel] = rows || [];
  renderMessages();
}

function renderMessages() {
  const feed = $('#chat-feed');
  const list = State.messages[State.currentChannel] || [];
  if (!list.length) {
    feed.innerHTML = `<p class="muted pad">${escapeHtml(t('common.no_messages'))}</p>`;
    return;
  }
  feed.innerHTML = list.map(m => {
    const mine = (State.meta && (m.author === `${State.meta.firstname} ${State.meta.lastname}`.trim()));
    return `
      <div class="chat-msg ${mine ? 'mine' : ''}">
        <span class="author">${escapeHtml(m.author)}</span>
        <span class="when">${escapeHtml(fmtDate(m.created_at))}</span>
        <div class="body">${escapeHtml(m.message)}</div>
      </div>
    `;
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

async function sendMessage() {
  const input = $('#chat-text');
  const txt = input.value.trim();
  if (!txt) return;
  input.value = '';
  await nuiPost('sendMessage', { channel: State.currentChannel, message: txt });
  // será reenviado via push 'newMessage'
}

// ----------------- Live Map --------------

// Tenta carregar map.png → map.jpg → map.svg na ordem.
// O canvas adopta o aspect-ratio real da imagem ao carregar (assim a imagem
// preenche perfeitamente sem corte/letterbox e os markers alinham).
function setupMapImage() {
  const img    = $('#map-img');
  const frame  = $('#map-frame');
  const canvas = $('#map-canvas');
  if (!img || !frame) return;

  const candidates = ['img/map.png', 'img/map.jpg', 'img/map.svg'];
  let idx = 0;

  const applyAspect = (w, h) => {
    const ar = `${w} / ${h}`;
    if (frame)  frame.style.aspectRatio = ar;
    if (canvas) canvas.style.aspectRatio = ar;
  };

  const onLoad = () => {
    const w = img.naturalWidth  || (State.config.mapRatio && State.config.mapRatio.w) || 738;
    const h = img.naturalHeight || (State.config.mapRatio && State.config.mapRatio.h) || 1098;
    applyAspect(w, h);
    // Re-renderiza markers porque a área pode ter mudado
    if (State.currentApp === 'livemap') renderLiveMap();
  };

  const tryNext = () => {
    if (idx >= candidates.length) return;
    img.src = candidates[idx++];
  };

  img.onload  = onLoad;
  img.onerror = () => { if (idx < candidates.length) tryNext(); };

  // Pré-define aspect ratio com a config para evitar layout shift
  if (State.config.mapRatio) {
    applyAspect(State.config.mapRatio.w, State.config.mapRatio.h);
  }

  tryNext();
}

function projectCoord(x, y) {
  // Converte coords GTA -> percentagens da imagem do mapa.
  // O eixo Y do GTA cresce para Norte, mas a imagem cresce para baixo.
  const b = State.config.mapBounds || { minX: -4000, maxX: 4500, minY: -4000, maxY: 8000 };
  const px = ((x - b.minX) / (b.maxX - b.minX)) * 100;
  const py = ((b.maxY - y) / (b.maxY - b.minY)) * 100;
  return { x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) };
}

// Ícone reflete sempre o estado (a pé / viatura), independente de ser eu
function pickMarkerIcon(o) {
  if (o.vehicle) return 'fa-car-side';
  return 'fa-person-walking';
}
function pickMarkerExtraClass(o) {
  if (o.vehicle) return 'in-vehicle';
  return 'on-foot';
}

// Cache de elementos para evitar flash
const liveMapCache = {
  markers: new Map(),  // id -> element
  rows:    new Map()   // id -> element
};

// === Pan + Zoom interativo do mapa ===
const mapView = {
  scale: 1,
  tx: 0, ty: 0,             // translação em pixels (transform-origin: 0 0)
  minScale: 1,
  maxScale: 8,
  dragging: false,
  startX: 0, startY: 0,
  startTx: 0, startTy: 0,
  hasMoved: false
};

function applyMapTransform() {
  const frame = $('#map-frame');
  if (!frame) return;
  frame.style.transformOrigin = '0 0';
  frame.style.transform = `translate(${mapView.tx}px, ${mapView.ty}px) scale(${mapView.scale})`;
  frame.style.setProperty('--map-scale', mapView.scale);

  const canvas = $('#map-canvas');
  if (canvas) canvas.classList.toggle('zoomed', mapView.scale > 1);

  const btn = $('#map-zoom-reset');
  if (btn) {
    const isReset = (mapView.scale === 1 && mapView.tx === 0 && mapView.ty === 0);
    btn.classList.toggle('hidden', isReset);
  }
}

// Limita translation para o frame nunca sair do canvas
// (a 1× → tx/ty forçados a 0, sem pan possível)
function clampMapTransform() {
  const canvas = $('#map-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const s = mapView.scale;
  // Mantém o canvas sempre coberto pelo frame escalado:
  // 0  ≤  tx  ≤  0  +  (não permite frame começar à direita do canvas)
  // W*(1-s) ≤ tx ≤ 0   (frame deve cobrir todo o canvas em x)
  mapView.tx = Math.max(W * (1 - s), Math.min(0, mapView.tx));
  mapView.ty = Math.max(H * (1 - s), Math.min(0, mapView.ty));
}

function zoomToOfficer(o) {
  if (!o) return;
  const p = projectCoord(o.x, o.y);
  const scale = (State.config && State.config.mapZoomScale) || 4.0;
  const canvas = $('#map-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  // Queremos que o ponto (p.x%, p.y%) do frame natural fique no centro do canvas
  // Com transform-origin 0 0: posição_visivel = tx + (px/100)*w*scale
  // Centrado: tx + (px/100)*w*scale = w/2  →  tx = w/2 - (px/100)*w*scale
  mapView.scale = scale;
  mapView.tx = rect.width  / 2 - (p.x / 100) * rect.width  * scale;
  mapView.ty = rect.height / 2 - (p.y / 100) * rect.height * scale;
  clampMapTransform();
  applyMapTransform();
}

function resetMapZoom() {
  mapView.scale = 1;
  mapView.tx = 0;
  mapView.ty = 0;
  applyMapTransform();
}

// Wheel zoom centrado no cursor
function onMapWheel(e) {
  if (calibrating) return;       // não interferir com calibração
  e.preventDefault();
  const canvas = $('#map-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
  const newScale = Math.max(mapView.minScale, Math.min(mapView.maxScale, mapView.scale * factor));
  if (newScale === mapView.scale) return;

  // Mantém o ponto sob o cursor estável: novo_tx = mx - ((mx - tx)/scale) * newScale
  mapView.tx = mx - ((mx - mapView.tx) / mapView.scale) * newScale;
  mapView.ty = my - ((my - mapView.ty) / mapView.scale) * newScale;
  mapView.scale = newScale;
  clampMapTransform();
  applyMapTransform();
}

// Drag/pan
function onMapMouseDown(e) {
  if (calibrating) return;       // calibração tem o seu próprio click
  if (e.button !== 0) return;    // só botão esquerdo
  if (mapView.scale <= 1) return; // sem zoom não há nada para arrastar
  // Ignorar se clique foi num marker (deixar o click do marker funcionar)
  if (e.target.closest('.map-marker')) return;
  mapView.dragging  = true;
  mapView.hasMoved  = false;
  mapView.startX    = e.clientX;
  mapView.startY    = e.clientY;
  mapView.startTx   = mapView.tx;
  mapView.startTy   = mapView.ty;
  const canvas = $('#map-canvas');
  if (canvas) canvas.classList.add('dragging');
}

function onMapMouseMove(e) {
  if (!mapView.dragging) return;
  const dx = e.clientX - mapView.startX;
  const dy = e.clientY - mapView.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mapView.hasMoved = true;
  mapView.tx = mapView.startTx + dx;
  mapView.ty = mapView.startTy + dy;
  clampMapTransform();
  applyMapTransform();
}

function onMapMouseUp() {
  if (!mapView.dragging) return;
  mapView.dragging = false;
  const canvas = $('#map-canvas');
  if (canvas) canvas.classList.remove('dragging');
}

// ============== CALIBRAÇÃO 2-pontos ==============
let calibrating = false;
let calibrationPoints = [];   // [{ wx, wy, px, py }, ...]

function setCalibBannerText(html) {
  const banner = $('#map-cal-banner span');
  if (banner) banner.innerHTML = html;
}

function setCalibrating(on) {
  calibrating = !!on;
  if (!on) calibrationPoints = [];
  const banner = $('#map-cal-banner');
  const btn    = $('#map-calibrate');
  const canvas = $('#map-canvas');
  if (banner) banner.classList.toggle('hidden', !on);
  if (btn)    btn.classList.toggle('active', on);
  if (canvas) canvas.classList.toggle('calibrating', on);
  if (on) setCalibBannerText(t('live.calibrate.point1'));
}

function getMyOfficer() {
  return (State.officers || []).find(o => o.id === State.myId) || null;
}

function calibrateMapAt(percentX, percentY) {
  const me = getMyOfficer();
  if (!me) {
    toast(t('perm.position_pending'), 'warning');
    return;
  }

  // Adiciona ponto
  calibrationPoints.push({ wx: me.x, wy: me.y, px: percentX, py: percentY });

  // Ainda só temos 1 ponto → pede o 2º
  if (calibrationPoints.length === 1) {
    setCalibBannerText(t('perm.cal_p1'));
    toast(t('perm.cal_p1'), 'inform');
    return;
  }

  // 2 pontos — calcula scale + offset
  const [p1, p2] = calibrationPoints;
  const dpx = p2.px - p1.px;
  const dpy = p1.py - p2.py;   // y invertido (px% sobe quando wy desce)

  if (Math.abs(dpx) < 5 || Math.abs(dpy) < 5) {
    toast(t('perm.cal_close'), 'error');
    calibrationPoints = [];
    setCalibBannerText(t('live.calibrate.point1'));
    return;
  }

  // px = (x - minX) / xRange * 100  →  xRange = (x2-x1) / ((px2-px1)/100)
  const xRange = (p2.wx - p1.wx) / (dpx / 100);
  const yRange = (p2.wy - p1.wy) / (dpy / 100);

  const newMinX = p1.wx - (p1.px / 100) * xRange;
  const newMaxX = newMinX + xRange;
  const newMaxY = p1.wy + (p1.py / 100) * yRange;
  const newMinY = newMaxY - yRange;

  // Sanity check
  if (!isFinite(newMinX) || !isFinite(newMaxX) || !isFinite(newMinY) || !isFinite(newMaxY)) {
    toast(t('perm.cal_invalid'), 'error');
    calibrationPoints = [];
    setCalibBannerText(t('live.calibrate.point1'));
    return;
  }

  // Aplica em runtime
  State.config.mapBounds = {
    minX: newMinX, maxX: newMaxX,
    minY: newMinY, maxY: newMaxY
  };

  renderLiveMap();
  setCalibrating(false);

  const lines = `minX = ${newMinX.toFixed(0)}, maxX = ${newMaxX.toFixed(0)}, minY = ${newMinY.toFixed(0)}, maxY = ${newMaxY.toFixed(0)}`;
  console.log('[OXLYN-MDT] Novos bounds (2-point):', State.config.mapBounds);
  toast(t('perm.cal_done') + ' ' + lines, 'success');
}

function renderLiveMap() {
  const layer = $('#map-markers');
  if (!layer) return;

  const list = State.officers || [];
  const liveIds = new Set();

  list.forEach(o => {
    const p = projectCoord(o.x, o.y);
    const isMe = (State.myId && State.myId === o.id);
    const stateCls = pickMarkerExtraClass(o);     // on-foot / in-vehicle
    const meCls    = isMe ? 'me' : '';             // cor diferente para mim
    const cls      = (meCls + ' ' + stateCls).trim();
    const ic = pickMarkerIcon(o);
    const fullName = `${o.firstname || ''} ${o.lastname || ''}`.trim();

    liveIds.add(o.id);
    let m = liveMapCache.markers.get(o.id);
    if (!m) {
      m = document.createElement('div');
      m.className = `map-marker ${cls}`;
      m.innerHTML = `
        <i class="fa-sharp fa-solid ${ic}"></i>
        <span class="tip"></span>
      `;
      m.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const fresh = (State.officers || []).find(x => x.id === o.id) || o;
        zoomToOfficer(fresh);
      });
      layer.appendChild(m);
      liveMapCache.markers.set(o.id, m);
    } else {
      m.className = `map-marker ${cls}`;
      const ip = m.querySelector('i');
      if (ip) ip.className = `fa-sharp fa-solid ${ic}`;
    }
    m.style.left = p.x + '%';
    m.style.top  = p.y + '%';
    const tip = m.querySelector('.tip');
    if (tip) tip.textContent = fullName;
  });

  // Remover markers que já não existem
  liveMapCache.markers.forEach((el, id) => {
    if (!liveIds.has(id)) {
      el.remove();
      liveMapCache.markers.delete(id);
    }
  });

  // Overlay stats
  const inVeh = list.filter(o => !!o.vehicle).length;
  const onFoot = list.length - inVeh;
  const sOnline = $('#map-st-online'); if (sOnline) sOnline.textContent = list.length;
  const sVeh    = $('#map-st-veh');    if (sVeh)    sVeh.textContent    = inVeh;
  const sFoot   = $('#map-st-foot');   if (sFoot)   sFoot.textContent   = onFoot;

  // Side list (também com persistência)
  const side = $('#map-list');
  if (!side) return;

  if (!list.length) {
    side.innerHTML = `<p class="muted">${escapeHtml(t('live.no_online'))}</p>`;
    liveMapCache.rows.clear();
    return;
  }

  // Limpar mensagem inicial de "Sem polícias online"
  if (side.querySelector('p.muted')) side.innerHTML = '';

  list.forEach(o => {
    const fullName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
    const seed = o.id ? ('police-' + o.id) : fullName;
    const isMe = (State.myId && State.myId === o.id);
    const headshot = (isMe && State.meta && State.meta.headshot) ? State.meta.headshot : o.headshot;

    const statusCls = o.vehicle ? 'st-vehicle' : 'st-foot';
    const statusLab = o.vehicle ? t('live.status.in_vehicle') : t('live.status.on_foot');
    const statusIco = o.vehicle ? 'fa-car-side' : 'fa-person-walking';
    const speedTxt  = o.vehicle ? (o.speed || 0) + ' km/h' : null;

    let row = liveMapCache.rows.get(o.id);
    if (!row) {
      row = document.createElement('div');
      row.className = 'map-officer-row police-card';
      row.innerHTML = `
        <div class="poc-top">
          <div class="poc-av"></div>
          <div class="poc-info">
            <div class="poc-name"></div>
            <div class="poc-rank"></div>
          </div>
          ${isMe ? `<span class="poc-you">${escapeHtml(t('live.tag.you'))}</span>` : ''}
        </div>
        <div class="poc-status">
          <span class="poc-status-pill ${statusCls}">
            <i class="fa-sharp fa-solid ${statusIco}"></i>
            <span class="poc-status-lab">${statusLab}</span>
          </span>
          ${speedTxt ? `<span class="poc-speed"><i class="fa-sharp fa-solid fa-gauge-high"></i> ${escapeHtml(speedTxt)}</span>` : ''}
        </div>
        <div class="poc-meta">
          <span class="poc-zone"><i class="fa-sharp fa-solid fa-location-dot"></i> <span class="poc-zone-name"></span></span>
          ${o.vehicle ? `<span class="poc-veh" title="${escapeHtml(o.vehicle)}"><i class="fa-sharp fa-solid fa-car"></i> ${escapeHtml(o.vehicle)}</span>` : ''}
        </div>
      `;
      row.addEventListener('click', () => zoomToOfficer(o));
      side.appendChild(row);
      liveMapCache.rows.set(o.id, row);
      const av = row.querySelector('.poc-av');
      if (av) av.innerHTML = avatarHtml(seed, fullName, 40, headshot);
    } else {
      const prevHs = row.dataset.hs || '';
      if (prevHs !== (headshot || '')) {
        const av = row.querySelector('.poc-av');
        if (av) av.innerHTML = avatarHtml(seed, fullName, 40, headshot);
      }
      // Status pode mudar (foot ⇄ vehicle) — actualiza class+icon+label
      const pill = row.querySelector('.poc-status-pill');
      if (pill) {
        pill.className = 'poc-status-pill ' + statusCls;
        const icp = pill.querySelector('i'); if (icp) icp.className = `fa-sharp fa-solid ${statusIco}`;
        const lp = pill.querySelector('.poc-status-lab'); if (lp) lp.textContent = statusLab;
      }
      const speedEl = row.querySelector('.poc-speed');
      if (speedTxt) {
        if (speedEl) speedEl.innerHTML = `<i class="fa-sharp fa-solid fa-gauge-high"></i> ${escapeHtml(speedTxt)}`;
        else {
          const status = row.querySelector('.poc-status');
          if (status) status.insertAdjacentHTML('beforeend', `<span class="poc-speed"><i class="fa-sharp fa-solid fa-gauge-high"></i> ${escapeHtml(speedTxt)}</span>`);
        }
      } else if (speedEl) speedEl.remove();
      row.onclick = () => zoomToOfficer(o);
    }
    row.dataset.hs = headshot || '';
    const nameEl = row.querySelector('.poc-name'); if (nameEl) nameEl.textContent = fullName.toUpperCase();
    const rankEl = row.querySelector('.poc-rank'); if (rankEl) rankEl.textContent = (o.gradeLabel || ('Grade ' + (o.grade || 0)));
    const zoneEl = row.querySelector('.poc-zone-name'); if (zoneEl) zoneEl.textContent = o.zone || '—';
  });

  // Remover rows que já não existem
  liveMapCache.rows.forEach((el, id) => {
    if (!liveIds.has(id)) {
      el.remove();
      liveMapCache.rows.delete(id);
    }
  });
}

// ----------------- Propriedades ----------
function propertyTagsToList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(t => String(t).trim()).filter(Boolean);
  return String(raw).split(',').map(t => t.trim()).filter(Boolean);
}

function propertyMatchesQuery(p, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const tags = propertyTagsToList(p.tags).join(' ').toLowerCase();
  return [
    p.address, p.district, p.suspects, p.description, p.officer, tags
  ].some(v => (v || '').toString().toLowerCase().includes(needle));
}

// Coalesce: chamadas rápidas a loadProperties partilham a mesma promise.
// Evita re-render quando vários propertyChanged push events chegam em cascata
// (ex: chunks de foto a terminarem após submit em background).
let _loadPropertiesInflight = null;
let _loadPropertiesLastSig = '';

function _propertiesSignature(rows) {
  // Hash leve baseado em id + updated_at + photo_count para detectar mudanças
  return (rows || []).map(r =>
    `${r.id}:${r.updated_at || r.created_at}:${r.photo_count || 0}:${r.status}:${r.hero_b64 ? r.hero_b64.length : 0}`
  ).join('|');
}

async function loadProperties() {
  if (_loadPropertiesInflight) return _loadPropertiesInflight;
  _loadPropertiesInflight = (async () => {
    try {
      const rows = await nuiPost('listProperties');
      const sig = _propertiesSignature(rows);
      const changed = sig !== _loadPropertiesLastSig;
      _loadPropertiesLastSig = sig;
      State.properties = Array.isArray(rows) ? rows : [];

      if (changed) {
        renderPropertyFilters();
        renderPropertyList();
      }

      if (State.propertyMode === 'doc' && State.propertyDocId) {
        const full = await nuiPost('getProperty', { id: State.propertyDocId });
        if (full && full.id) renderPropertyDocument(full);
      } else if (State.propertyMode === 'gallery') {
        loadPropertyGlobalGallery();
      }
    } finally {
      // Cooldown curto — calls dentro deste período partilham o mesmo carregamento
      setTimeout(() => { _loadPropertiesInflight = null; }, 250);
    }
  })();
  return _loadPropertiesInflight;
}

// Comuta entre modos da página Propriedades
function setPropertyMode(mode, docData) {
  State.propertyMode = mode;
  const grid    = $('#prop-mode-grid');
  const doc     = $('#prop-mode-doc');
  const gallery = $('#prop-mode-gallery');

  if (grid)    grid.classList.toggle('hidden', mode !== 'grid');
  if (doc)     doc.classList.toggle('hidden', mode !== 'doc');
  if (gallery) gallery.classList.toggle('hidden', mode !== 'gallery');

  // Atualiza topbar (subtítulo) consoante o modo
  const meta = APP_META.properties || { titleKey: 'nav.properties', subKey: 'app.sub.properties' };
  if (mode === 'doc' && docData) {
    setText('#tb-app-title', t('prop.doc.tb_title') + ' · ' + (docData.address || '—'));
    setText('#tb-app-sub', t('prop.doc.tb_sub', String(docData.id || 0).padStart(5, '0')));
  } else if (mode === 'gallery') {
    setText('#tb-app-title', t('prop.gallery.tb_title'));
    setText('#tb-app-sub', t('prop.gallery.tb_sub'));
  } else {
    setText('#tb-app-title', t(meta.titleKey));
    setText('#tb-app-sub', t(meta.subKey));
  }
}

async function openPropertyDocument(id) {
  State.propertyDocId = Number(id);
  State.propertyDocTab = 'details';
  // Render rápido do skeleton enquanto vai buscar a versão completa
  const cached = (State.properties || []).find(x => Number(x.id) === Number(id));
  if (cached) renderPropertyDocument(cached);
  setPropertyMode('doc', cached || { id, address: '...' });

  const full = await nuiPost('getProperty', { id });
  if (full && full.id) renderPropertyDocument(full);
  else {
    toast(t('perm.cant_open'), 'error');
    setPropertyMode('grid');
  }
}

function backToPropertyGrid() {
  State.propertyDocId = null;
  setPropertyMode('grid');
}

function renderPropertyFilters() {
  const wrap = $('#prop-filters');
  if (!wrap) return;
  const list = State.properties || [];
  const statuses = (State.config && State.config.propertyStatuses) || {};
  const used = [...new Set(list.map(p => p.status).filter(Boolean))];

  const all = `
    <button class="prop-filter ${State.propertyFilter === 'all' ? 'active' : ''}" data-filter="all">
      <i class="fa-sharp fa-solid fa-grip"></i> ${escapeHtml(t('common.all'))} <span class="rf-count">${list.length}</span>
    </button>
  `;
  const items = used.map(s => {
    const meta = statuses[s] || { label: s, color: '#7f8c8d', icon: 'fa-circle' };
    const n = list.filter(p => p.status === s).length;
    return `
      <button class="prop-filter ${State.propertyFilter === s ? 'active' : ''}" data-filter="${escapeHtml(s)}" style="--pf-color:${meta.color}">
        <span class="prop-filter-dot"></span>
        <i class="fa-sharp fa-solid ${escapeHtml(meta.icon || 'fa-circle')}"></i>
        ${escapeHtml(meta.label)} <span class="rf-count">${n}</span>
      </button>
    `;
  }).join('');

  wrap.innerHTML = all + items;
  $$('.prop-filter', wrap).forEach(b => b.addEventListener('click', () => {
    State.propertyFilter = b.dataset.filter;
    renderPropertyList();
  }));
}

function renderPropertyList() {
  const grid = $('#properties-grid');
  const totalEl = $('#prop-active-count');

  const types    = (State.config && State.config.propertyTypes)    || {};
  const statuses = (State.config && State.config.propertyStatuses) || {};

  const all = State.properties || [];
  const filtered = all.filter(p =>
    (State.propertyFilter === 'all' || p.status === State.propertyFilter) &&
    propertyMatchesQuery(p, State.propertyQuery)
  );

  if (totalEl) totalEl.textContent = all.length;
  if (!grid) return;

  if (!filtered.length) {
    const isEmpty = all.length === 0;
    grid.innerHTML = `
      <div class="prop-grid-empty">
        <i class="fa-sharp fa-solid fa-${isEmpty ? 'house-flag' : 'circle-question'}"></i>
        <h3>${escapeHtml(isEmpty ? t('prop.empty.title') : t('prop.empty_filter.title'))}</h3>
        <p>${escapeHtml(isEmpty ? t('prop.empty.body') : t('prop.empty_filter.body'))}</p>
      </div>`;
    return;
  }

  grid.classList.add('stagger');
  grid.innerHTML = filtered.map(p => {
    const typeMeta   = types[p.type]      || { label: p.type || 'Outros', color: '#7f8c8d', icon: 'fa-location-dot' };
    const statusMeta = statuses[p.status] || { label: p.status || 'Suspeita', color: '#7f8c8d', icon: 'fa-circle' };
    const tagList = propertyTagsToList(p.tags);
    const tagsHtml = tagList.slice(0, 3).map(tg => `<span class="prop-chip">#${escapeHtml(relocalizeLabel('prop.tag.', tg))}</span>`).join('');
    const moreTags = tagList.length > 3 ? `<span class="prop-chip prop-chip-more">+${tagList.length - 3}</span>` : '';

    let heroSrc = '';
    if (p.hero_b64) {
      heroSrc = `data:${p.hero_mime || 'image/jpeg'};base64,${p.hero_b64}`;
    } else if (p.image_url) {
      heroSrc = p.image_url;
    }
    const photoCount = Number(p.photo_count || 0);
    const caseNum = String(p.id || 0).padStart(5, '0');

    return `
      <div class="prop-card" data-property-id="${p.id}" style="--ps-color:${statusMeta.color}; --pt-color:${typeMeta.color}">
        <div class="pc-photo ${heroSrc ? '' : 'pc-photo-empty'}"
             ${heroSrc ? `style="background-image:url('${escapeHtml(heroSrc)}')"` : ''}>
          ${heroSrc ? '' : `<i class="fa-sharp fa-solid ${escapeHtml(typeMeta.icon)}"></i>`}
          <div class="pc-photo-grad"></div>
          <span class="pc-status-pill">
            <span class="pc-status-dot"></span> ${escapeHtml(statusMeta.label)}
          </span>
          <span class="pc-case">Nº ${escapeHtml(caseNum)}</span>
          ${photoCount ? `<span class="pc-photo-count"><i class="fa-sharp fa-solid fa-images"></i> ${photoCount}</span>` : ''}
        </div>
        <div class="pc-info">
          <div class="pc-type">
            <i class="fa-sharp fa-solid ${escapeHtml(typeMeta.icon)}"></i>
            <span>${escapeHtml(typeMeta.label)}</span>
            ${p.district ? `<span class="pc-sep">·</span><span class="pc-district">${escapeHtml(p.district)}</span>` : ''}
          </div>
          <h3 class="pc-title">${escapeHtml(p.address || t('common.no_address'))}</h3>
          ${p.suspects ? `<div class="pc-suspects"><i class="fa-sharp fa-solid fa-users-line"></i> ${escapeHtml(p.suspects)}</div>` : ''}
          ${tagList.length ? `<div class="pc-tags">${tagsHtml}${moreTags}</div>` : ''}
        </div>
        <div class="pc-foot">
          <span class="pc-officer"><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(p.officer || '—')}</span>
          <span class="pc-time">${escapeHtml(timeAgo(p.updated_at || p.created_at))}</span>
        </div>
      </div>
    `;
  }).join('');

  $$('.prop-card', grid).forEach(card => {
    card.addEventListener('click', () => openPropertyDocument(Number(card.dataset.propertyId)));
  });
}

// Mantém estes símbolos para retrocompatibilidade interna (alguns handlers
// de mensagens push referenciam `viewingPropertyId`). Agora apenas alias.
let viewingPropertyId = null;

function renderPropertyDocument(p) {
  const types    = (State.config && State.config.propertyTypes)    || {};
  const statuses = (State.config && State.config.propertyStatuses) || {};
  const typeMeta   = types[p.type]      || { label: p.type || 'Outros', color: '#7f8c8d', icon: 'fa-location-dot' };
  const statusMeta = statuses[p.status] || { label: p.status || 'Suspeita', color: '#7f8c8d', icon: 'fa-circle' };
  const tagList = propertyTagsToList(p.tags);
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const caseNum = String(p.id || 0).padStart(5, '0');

  const root = $('#prop-mode-doc');
  if (!root) return;

  const heroSrc = photos.length ? photoSrcFromRow(photos[0]) : (p.image_url || '');
  const hasGps = (p.gps_x !== null && p.gps_x !== undefined && p.gps_x !== '' &&
                  p.gps_y !== null && p.gps_y !== undefined && p.gps_y !== '');
  const heroDate = photos.length && photos[0].created_at
    ? fmtDate(photos[0].created_at)
    : fmtDate(p.created_at);

  // Status dropdown options
  const statusOptions = ['suspeita', 'sob_vigilancia', 'raid_concluido', 'arquivada']
    .filter(k => statuses[k])
    .map(k => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${escapeHtml(statuses[k].label)}</option>`)
    .join('');

  const tab = State.propertyDocTab || 'details';

  root.innerHTML = `
    <!-- Toolbar topo: voltar + acções rápidas -->
    <div class="pdoc-toolbar">
      <button class="pdoc-back" id="pdoc-back">
        <i class="fa-sharp fa-solid fa-arrow-left"></i>
        <span>${escapeHtml(t('common.list'))}</span>
      </button>
      <div class="pdoc-breadcrumb">
        <span class="pdoc-crumb-icon"><i class="fa-sharp fa-solid fa-folder-open"></i></span>
        <span class="pdoc-crumb-label">${escapeHtml(t('prop.case_file_label', caseNum))}</span>
        <span class="pdoc-crumb-sep">·</span>
        <span class="pdoc-crumb-current">${escapeHtml(p.address || t('common.no_address'))}</span>
      </div>
      <div class="pdoc-actions">
        <div class="pdoc-status-wrap" style="--ps-color:${statusMeta.color}">
          <label class="pdoc-status-label"><i class="fa-sharp fa-solid fa-circle-dot"></i> ${escapeHtml(t('common.status'))}</label>
          <select class="pdoc-status-select" id="pdoc-status-select">${statusOptions}</select>
        </div>
        <button class="btn btn-warning btn-sm pdoc-action-btn" id="pdoc-capture">
          <i class="fa-sharp fa-solid fa-camera"></i> ${escapeHtml(t('prop.btn.capture'))}
        </button>
        <button class="btn btn-ghost btn-sm pdoc-action-btn" id="pdoc-edit">
          <i class="fa-sharp fa-solid fa-pen"></i> ${escapeHtml(t('prop.btn.edit'))}
        </button>
        <button class="btn btn-ghost btn-sm pdoc-action-btn pdoc-danger" id="pdoc-delete">
          <i class="fa-sharp fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <!-- Documento (case-file) -->
    <div class="pdoc-paper">

      <!-- Hero (foto + tape + perforation + strip) -->
      <div class="pv-hero-frame">
        <span class="pv-tape pv-tape-tl"></span>
        <span class="pv-tape pv-tape-tr"></span>
        <div class="pv-hero ${heroSrc ? '' : 'pv-hero-empty'}"
             ${heroSrc ? `style="background-image:url('${escapeHtml(heroSrc)}')"` : ''}>
          ${heroSrc ? '' : `<i class="fa-sharp fa-solid ${escapeHtml(typeMeta.icon)}"></i>`}
          <div class="pv-hero-grad-top"></div>
          <div class="pv-hero-pills">
            <span class="prop-status-pill big" style="--ps-color:${statusMeta.color}">
              <i class="fa-sharp fa-solid ${escapeHtml(statusMeta.icon)}"></i> ${escapeHtml(statusMeta.label)}
            </span>
            <span class="prop-type-pill" style="--pt-color:${typeMeta.color}">
              <i class="fa-sharp fa-solid ${escapeHtml(typeMeta.icon)}"></i> ${escapeHtml(typeMeta.label)}
            </span>
          </div>
          ${heroSrc && photos.length ? `<button type="button" class="pv-hero-zoom" data-src="${heroSrc}" title="${escapeHtml(t('common.view'))}"><i class="fa-sharp fa-solid fa-magnifying-glass-plus"></i></button>` : ''}
          <div class="pv-ink-stamp">${t('prop.case_open_stamp')}</div>
        </div>
        <div class="pv-hero-perforation" aria-hidden="true">${'<span></span>'.repeat(20)}</div>
        <div class="pv-hero-strip">
          <span class="pv-strip-stamp"><i class="fa-sharp fa-solid fa-shield-halved"></i> ${escapeHtml(t('prop.case_file_open'))}</span>
          <span class="pv-strip-sep"></span>
          <span class="pv-strip-meta"><span class="pv-strip-lab">Nº</span><span class="pv-strip-val">${escapeHtml(caseNum)}</span></span>
          <span class="pv-strip-spacer"></span>
          <span class="pv-strip-meta pv-strip-date"><i class="fa-sharp fa-solid fa-calendar-days"></i> ${escapeHtml(heroDate)}</span>
        </div>
      </div>

      <!-- Bloco Localização -->
      <div class="pv-location">
        <div class="pv-location-icon"><i class="fa-sharp fa-solid fa-location-dot"></i></div>
        <div class="pv-location-info">
          <div class="pv-location-label">${escapeHtml(t('prop.address_label'))}</div>
          <div class="pv-location-address">${escapeHtml(p.address || t('common.no_address'))}</div>
          <div class="pv-location-meta">
            ${p.district ? `<span class="pv-loc-chip"><i class="fa-sharp fa-solid fa-map-pin"></i> ${escapeHtml(p.district)}</span>` : ''}
            ${hasGps ? `<span class="pv-loc-chip pv-loc-gps"><i class="fa-sharp fa-solid fa-crosshairs"></i> ${escapeHtml(String(p.gps_x))} · ${escapeHtml(String(p.gps_y))}</span>` : ''}
          </div>
        </div>
        <div class="pv-location-actions">
          ${hasGps ? `<button type="button" class="btn btn-warning btn-sm pv-gps-btn" id="pdoc-set-waypoint" data-x="${escapeHtml(String(p.gps_x))}" data-y="${escapeHtml(String(p.gps_y))}">
            <i class="fa-sharp fa-solid fa-route"></i> ${escapeHtml(t('prop.gps_mark'))}
          </button>` : `<span class="pv-no-gps"><i class="fa-sharp fa-solid fa-circle-info"></i> ${escapeHtml(t('prop.no_gps'))}</span>`}
        </div>
      </div>

      <!-- Tabs -->
      <div class="pdoc-tabs">
        <button class="pdoc-tab ${tab === 'details' ? 'active' : ''}" data-tab="details">
          <i class="fa-sharp fa-solid fa-file-lines"></i> ${escapeHtml(t('prop.tab.details'))}
        </button>
        <button class="pdoc-tab ${tab === 'photos' ? 'active' : ''}" data-tab="photos">
          <i class="fa-sharp fa-solid fa-images"></i> ${escapeHtml(t('prop.tab.photos'))} <span class="pdoc-tab-count">${photos.length}</span>
        </button>
        <button class="pdoc-tab ${tab === 'activity' ? 'active' : ''}" data-tab="activity">
          <i class="fa-sharp fa-solid fa-clock-rotate-left"></i> ${escapeHtml(t('prop.tab.activity'))}
        </button>
      </div>

      <!-- Tab content -->
      <div class="pdoc-tab-content">
        ${tab === 'details' ? renderPropDetailsTab(p, tagList, photos) : ''}
        ${tab === 'photos' ? renderPropPhotosTab(p, photos) : ''}
        ${tab === 'activity' ? renderPropActivityTab(p) : ''}
      </div>

    </div>
  `;

  // ===== Wire handlers =====
  $('#pdoc-back', root).addEventListener('click', backToPropertyGrid);

  // Status dropdown
  const statusSel = $('#pdoc-status-select', root);
  if (statusSel) statusSel.addEventListener('change', async () => {
    const newStatus = statusSel.value;
    if (newStatus === p.status) return;
    await nuiPost('setPropertyStatus', { id: p.id, status: newStatus });
    // server emite propertyChanged → loadProperties refresca
    toast(t('perm.status_updated'), 'success');
  });

  // Capturar (abre câmara, ao Aceitar adiciona à propriedade)
  const capBtn = $('#pdoc-capture', root);
  if (capBtn) capBtn.addEventListener('click', () => {
    // Liga a câmara à propriedade aberta
    editingPropertyId = Number(p.id);
    editingPropertyPhotos = photos.slice();
    propertyPendingPhotos = [];
    openCameraModal();
  });

  // Editar (abre modal-property pré-preenchido)
  const editBtn = $('#pdoc-edit', root);
  if (editBtn) editBtn.addEventListener('click', () => openPropertyModal(p));

  // Eliminar
  const delBtn = $('#pdoc-delete', root);
  if (delBtn) delBtn.addEventListener('click', () => {
    confirmModal(t('prop.confirm_delete.title'), t('prop.confirm_delete.body'), async () => {
      await nuiPost('deleteProperty', { id: Number(p.id) });
      backToPropertyGrid();
      setTimeout(loadProperties, 300);
    });
  });

  // Hero/zoom + thumbnails → lightbox
  const heroZoom = $('.pv-hero-zoom', root);
  if (heroZoom) heroZoom.addEventListener('click', () => openPhotoLightbox(heroZoom.dataset.src));
  const hero = $('.pv-hero', root);
  if (hero && heroSrc) hero.addEventListener('click', (ev) => {
    if (ev.target.closest('.pv-hero-zoom')) return;
    openPhotoLightbox(heroSrc);
  });
  $$('.prop-detail-tile', root).forEach(t => t.addEventListener('click', () => openPhotoLightbox(t.dataset.src)));

  // Marcar GPS
  const wpBtn = $('#pdoc-set-waypoint', root);
  if (wpBtn) wpBtn.addEventListener('click', async () => {
    const x = parseFloat(wpBtn.dataset.x);
    const y = parseFloat(wpBtn.dataset.y);
    if (isNaN(x) || isNaN(y)) return;
    const r = await nuiPost('setWaypoint', { x, y });
    if (r && r.ok) toast(t('perm.gps_set'), 'success');
  });

  // Tabs switch
  $$('.pdoc-tab', root).forEach(tab => tab.addEventListener('click', () => {
    State.propertyDocTab = tab.dataset.tab;
    renderPropertyDocument(p);
  }));

  // Eliminar foto individual (na tab fotografias)
  $$('[data-photo-del-doc]', root).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const pid = Number(b.dataset.photoDelDoc);
    confirmModal(t('prop.confirm_photo_del.title'), t('prop.confirm_photo_del.body'), async () => {
      await nuiPost('deletePropertyPhoto', { id: pid });
      // O server emite propertyChanged → re-render automático
    });
  }));
}

// ====== Tab renderers ======
function renderPropDetailsTab(p, tagList, photos) {
  return `
    <div class="pv-info">
      <div class="pv-info-cell"><div class="pv-lab">${escapeHtml(t('prop.details.registered_by'))}</div><div class="pv-val">${escapeHtml(p.officer || '—')}</div></div>
      <div class="pv-info-cell"><div class="pv-lab">${escapeHtml(t('prop.details.created_at'))}</div><div class="pv-val">${escapeHtml(fmtDate(p.created_at))}</div></div>
      <div class="pv-info-cell"><div class="pv-lab">${escapeHtml(t('prop.details.updated_at'))}</div><div class="pv-val">${escapeHtml(fmtDate(p.updated_at || p.created_at))}</div></div>
      <div class="pv-info-cell"><div class="pv-lab">${escapeHtml(t('prop.details.total_photos'))}</div><div class="pv-val mono">${photos.length}</div></div>
    </div>

    ${tagList.length ? `
      <div class="prop-block">
        <div class="prop-block-label"><i class="fa-sharp fa-solid fa-tags"></i> ${escapeHtml(t('prop.details.tags'))}</div>
        <div class="prop-block-tags">${tagList.map(tag => `<span class="prop-chip">#${escapeHtml(relocalizeLabel('prop.tag.', tag))}</span>`).join('')}</div>
      </div>` : ''}

    ${p.suspects ? `
      <div class="prop-block">
        <div class="prop-block-label"><i class="fa-sharp fa-solid fa-users-line"></i> ${escapeHtml(t('prop.details.suspects'))}</div>
        <div class="prop-block-content">${escapeHtml(p.suspects)}</div>
      </div>` : ''}

    ${p.description ? `
      <div class="prop-block">
        <div class="prop-block-label"><i class="fa-sharp fa-solid fa-file-lines"></i> ${escapeHtml(t('prop.details.notes'))}</div>
        <div class="prop-block-content">${escapeHtml(p.description)}</div>
      </div>` : ''}

    ${!tagList.length && !p.suspects && !p.description ? `
      <p class="muted pad">${escapeHtml(t('prop.details.no_extra'))}</p>
    ` : ''}
  `;
}

function renderPropPhotosTab(_p, photos) {
  if (!photos.length) {
    return `
      <div class="pdoc-photos-empty">
        <i class="fa-sharp fa-solid fa-camera-retro"></i>
        <h3>${escapeHtml(t('prop.gallery.no_photos.title'))}</h3>
        <p>${t('prop.gallery.no_photos.body')}</p>
      </div>`;
  }
  return `
    <div class="pdoc-photos-grid">
      ${photos.map(ph => {
        const src = photoSrcFromRow(ph);
        return `
          <div class="pdoc-photo-tile prop-detail-tile" data-src="${src}">
            <img src="${src}" alt="" onerror="this.style.display='none'"/>
            <div class="pdoc-photo-overlay">
              <span class="pdoc-photo-time"><i class="fa-sharp fa-solid fa-clock"></i> ${escapeHtml(fmtDate(ph.created_at))}</span>
              <span class="pdoc-photo-by"><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(ph.taken_by || '—')}</span>
            </div>
            <button class="pdoc-photo-del" data-photo-del-doc="${ph.id}" title="${escapeHtml(t('common.delete'))}"><i class="fa-sharp fa-solid fa-trash"></i></button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPropActivityTab(p) {
  // Timeline simples baseado nos campos disponíveis (sem tabela de log dedicada)
  const events = [];
  if (p.created_at) events.push({ icon: 'fa-folder-plus', text: t('prop.activity.opened'), date: p.created_at, by: p.officer });
  if (p.updated_at && p.updated_at !== p.created_at) events.push({ icon: 'fa-pen', text: t('prop.activity.last_update'), date: p.updated_at });
  (p.photos || []).forEach(ph => events.push({ icon: 'fa-camera', text: t('prop.activity.photo_added'), date: ph.created_at, by: ph.taken_by }));
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!events.length) {
    return `<p class="muted pad">${escapeHtml(t('prop.activity.empty'))}</p>`;
  }

  return `
    <div class="pdoc-timeline">
      ${events.map(e => `
        <div class="pdoc-tl-item">
          <div class="pdoc-tl-icon"><i class="fa-sharp fa-solid ${escapeHtml(e.icon)}"></i></div>
          <div class="pdoc-tl-body">
            <div class="pdoc-tl-text">${escapeHtml(e.text)}</div>
            <div class="pdoc-tl-meta">
              <span><i class="fa-sharp fa-solid fa-clock"></i> ${escapeHtml(fmtDate(e.date))}</span>
              ${e.by ? `<span><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(e.by)}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ====== Galeria global (todas as propriedades) ======
let propertyGlobalGalleryRows = [];

async function loadPropertyGlobalGallery() {
  setPropertyMode('gallery');
  const root = $('#prop-mode-gallery');
  if (!root) return;
  root.innerHTML = `
    <div class="pdoc-toolbar">
      <button class="pdoc-back" id="prop-gallery-back">
        <i class="fa-sharp fa-solid fa-arrow-left"></i>
        <span>${escapeHtml(t('common.list'))}</span>
      </button>
      <div class="pdoc-breadcrumb">
        <span class="pdoc-crumb-icon"><i class="fa-sharp fa-solid fa-images"></i></span>
        <span class="pdoc-crumb-label">${escapeHtml(t('prop.gallery.title'))}</span>
        <span class="pdoc-crumb-sep">·</span>
        <span class="pdoc-crumb-current">${escapeHtml(t('prop.gallery.loading_short'))}</span>
      </div>
      <div class="pdoc-actions"></div>
    </div>
    <div class="prop-gallery-loading"><i class="fa-sharp fa-solid fa-spinner fa-spin"></i> ${escapeHtml(t('prop.gallery.loading'))}</div>
  `;
  $('#prop-gallery-back', root).addEventListener('click', backToPropertyGrid);

  const rows = await nuiPost('listAllPropertyPhotos');
  propertyGlobalGalleryRows = Array.isArray(rows) ? rows : [];
  renderPropertyGlobalGallery();
}

function renderPropertyGlobalGallery() {
  const root = $('#prop-mode-gallery');
  if (!root) return;
  const rows = propertyGlobalGalleryRows || [];
  const statuses = (State.config && State.config.propertyStatuses) || {};

  // Atualiza breadcrumb count
  const crumb = root.querySelector('.pdoc-crumb-current');
  if (crumb) crumb.textContent = t('prop.gallery.photo_count', rows.length);

  const grid = root.querySelector('.prop-gallery-loading') || document.createElement('div');
  grid.classList.remove('prop-gallery-loading');
  grid.classList.add('global-gallery-grid');

  if (!rows.length) {
    grid.innerHTML = `
      <div class="prop-grid-empty">
        <i class="fa-sharp fa-solid fa-image"></i>
        <h3>${escapeHtml(t('prop.gallery.empty.title'))}</h3>
        <p>${escapeHtml(t('prop.gallery.empty.body'))}</p>
      </div>`;
  } else {
    grid.innerHTML = rows.map(r => {
      const src = photoSrcFromRow({ data_b64: r.data_b64, mime_type: r.mime_type });
      const statusMeta = statuses[r.prop_status] || { label: r.prop_status || '—', color: '#7f8c8d' };
      return `
        <div class="gg-tile" data-property-id="${r.property_id}" data-src="${src}">
          <img src="${src}" alt="" onerror="this.style.display='none'"/>
          <div class="gg-tile-overlay">
            <div class="gg-tile-status" style="--ps-color:${statusMeta.color}">
              <span class="gg-status-dot"></span> ${escapeHtml(statusMeta.label)}
            </div>
            <div class="gg-tile-address"><i class="fa-sharp fa-solid fa-location-dot"></i> ${escapeHtml(r.address || t('common.no_address'))}</div>
            <div class="gg-tile-meta">
              <span><i class="fa-sharp fa-solid fa-clock"></i> ${escapeHtml(fmtDate(r.created_at))}</span>
              <span><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(r.taken_by || '—')}</span>
            </div>
          </div>
          <button class="gg-tile-zoom" data-zoom-src="${src}" title="${escapeHtml(t('common.view'))}"><i class="fa-sharp fa-solid fa-magnifying-glass-plus"></i></button>
        </div>
      `;
    }).join('');
  }

  // Re-attach se grid já estava no DOM
  if (!grid.parentElement) root.appendChild(grid);

  // Click no tile → abre o documento da propriedade
  $$('.gg-tile', grid).forEach(tile => tile.addEventListener('click', (ev) => {
    if (ev.target.closest('.gg-tile-zoom')) return;
    openPropertyDocument(Number(tile.dataset.propertyId));
  }));
  // Lupa → lightbox
  $$('.gg-tile-zoom', grid).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openPhotoLightbox(b.dataset.zoomSrc);
  }));
}

// ---------- Modal Propriedade (criar / editar) ----------
function populatePropertyTypeSelect() {
  const sel = $('#property-type');
  if (!sel) return;
  const types = (State.config && State.config.propertyTypes) || {};
  const order = ['residencial', 'comercial', 'armazem', 'esconderijo', 'outros'];
  const ordered = order.filter(k => types[k]).concat(Object.keys(types).filter(k => !order.includes(k)));
  sel.innerHTML = ordered.map(k => {
    const t = types[k] || {};
    return `<option value="${escapeHtml(k)}" data-icon="${escapeHtml(t.icon || '')}" data-color="${escapeHtml(t.color || '')}">${escapeHtml(t.label || k)}</option>`;
  }).join('');
  MdtDD.refresh(sel);
}

function populatePropertyStatusSelect() {
  const sel = $('#property-status');
  if (!sel) return;
  const statuses = (State.config && State.config.propertyStatuses) || {};
  const order = ['suspeita', 'sob_vigilancia', 'raid_concluido', 'arquivada'];
  const ordered = order.filter(k => statuses[k]).concat(Object.keys(statuses).filter(k => !order.includes(k)));
  sel.innerHTML = ordered.map(k => {
    const s = statuses[k] || {};
    return `<option value="${escapeHtml(k)}" data-icon="${escapeHtml(s.icon || '')}" data-color="${escapeHtml(s.color || '')}">${escapeHtml(s.label || k)}</option>`;
  }).join('');
  MdtDD.refresh(sel);
}

let propertyTagsState = [];
function renderPropertyChips() {
  const host = $('#property-tags-chips');
  if (!host) return;
  host.innerHTML = propertyTagsState.map((tag, i) => `
    <span class="prop-chip prop-chip-input">
      #${escapeHtml(relocalizeLabel('prop.tag.', tag))}
      <button type="button" class="prop-chip-x" data-chip-rm="${i}" title="${escapeHtml(t('prop.tags.remove_title'))}">×</button>
    </span>
  `).join('');
  $$('.prop-chip-x', host).forEach(b => b.addEventListener('click', () => {
    const idx = Number(b.dataset.chipRm);
    propertyTagsState.splice(idx, 1);
    renderPropertyChips();
  }));
}

function renderPropertySuggestedTags() {
  const host = $('#property-tags-suggestions');
  if (!host) return;
  const tags = (State.config && State.config.propertySuggestedTags) || [];
  if (!tags.length) { host.innerHTML = ''; return; }
  host.innerHTML = `<span class="prop-tags-suggest-label">${escapeHtml(t('prop.tags.suggestions'))}</span>` +
    tags.map(tag => `<button type="button" class="prop-tag-suggest" data-tag="${escapeHtml(tag)}">+ ${escapeHtml(tag)}</button>`).join('');
  $$('.prop-tag-suggest', host).forEach(b => b.addEventListener('click', () => {
    const tag = b.dataset.tag;
    if (tag && !propertyTagsState.includes(tag)) {
      propertyTagsState.push(tag);
      renderPropertyChips();
    }
  }));
}

let editingPropertyId = null;
async function openPropertyModal(existing) {
  populatePropertyTypeSelect();
  populatePropertyStatusSelect();
  renderPropertySuggestedTags();

  // Reset do estado da galeria
  propertyPendingPhotos = [];
  editingPropertyPhotos = [];

  const titleEl = $('#property-modal-title');
  if (existing && existing.id) {
    editingPropertyId = Number(existing.id);
    if (titleEl) titleEl.textContent = t('prop.modal.edit');
    $('#property-address').value     = existing.address     || '';
    $('#property-district').value    = existing.district    || '';
    $('#property-type').value        = existing.type        || 'outros';
    $('#property-status').value      = existing.status      || 'suspeita';
    $('#property-suspects').value    = existing.suspects    || '';
    $('#property-description').value = existing.description || '';
    $('#property-image').value       = existing.image_url   || '';
    $('#property-gps-x').value       = (existing.gps_x !== null && existing.gps_x !== undefined) ? existing.gps_x : '';
    $('#property-gps-y').value       = (existing.gps_y !== null && existing.gps_y !== undefined) ? existing.gps_y : '';
    propertyTagsState = propertyTagsToList(existing.tags);
    // Carrega fotos
    if (Array.isArray(existing.photos)) {
      editingPropertyPhotos = existing.photos;
    } else {
      // Caso o `existing` não traga ainda photos (lista geral), pede ao servidor
      const full = await nuiPost('getProperty', { id: editingPropertyId });
      editingPropertyPhotos = (full && full.photos) || [];
    }
  } else {
    editingPropertyId = null;
    if (titleEl) titleEl.textContent = t('prop.modal.new');
    $('#property-address').value = '';
    $('#property-district').value = '';
    $('#property-type').value = 'outros';
    $('#property-status').value = 'suspeita';
    $('#property-suspects').value = '';
    $('#property-description').value = '';
    $('#property-image').value = '';
    $('#property-gps-x').value = '';
    $('#property-gps-y').value = '';
    propertyTagsState = [];
  }
  renderPropertyChips();
  $('#property-tags-field').value = '';
  renderPropertyGallery();
  $('#modal-property').classList.remove('hidden');
  setTimeout(() => $('#property-address').focus(), 50);
}

async function submitPropertyModal() {
  const address = ($('#property-address').value || '').trim();
  if (!address) { toast(t('perm.address_required'), 'error'); return; }

  // Empurra qualquer tag por confirmar no input
  const pending = ($('#property-tags-field').value || '').trim();
  if (pending && !propertyTagsState.includes(pending)) propertyTagsState.push(pending);

  const payload = {
    address,
    district    : ($('#property-district').value    || '').trim(),
    type        : $('#property-type').value || 'outros',
    status      : $('#property-status').value || 'suspeita',
    suspects    : ($('#property-suspects').value    || '').trim(),
    tags        : propertyTagsState.slice(),
    description : ($('#property-description').value || '').trim(),
    image_url   : ($('#property-image').value       || '').trim()
  };
  const gx = parseFloat($('#property-gps-x').value);
  const gy = parseFloat($('#property-gps-y').value);
  if (!isNaN(gx)) payload.gps_x = gx;
  if (!isNaN(gy)) payload.gps_y = gy;

  // Disable submit para prevenir double-click
  const submitBtn = $('#property-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (editingPropertyId) {
      payload.id = editingPropertyId;
      await nuiPost('updateProperty', payload);
      closeAllModals();
      setTimeout(loadProperties, 250);
    } else {
      const res = await nuiPost('createProperty', payload);
      const newId = res && res.id;
      if (!newId) {
        toast(t('perm.create_failed'), 'error');
        return;
      }

      // Snapshot das pendentes ANTES de fechar (para subirem em background)
      const photosToUpload = propertyPendingPhotos.slice();
      propertyPendingPhotos = [];

      // Fecha modal e refresca lista IMEDIATAMENTE — registo aparece logo
      closeAllModals();
      loadProperties();

      // Sobe as fotos em background (fire-and-forget). Cada chunk completo emite
      // propertyChanged → o cliente refresca automaticamente, fazendo a hero
      // photo aparecer no card sem reload manual.
      if (photosToUpload.length) {
        toast(t('perm.photo_uploading_n', photosToUpload.length), 'inform');
        for (const ph of photosToUpload) {
          nuiPost('addPropertyPhoto', {
            property_id: newId,
            data_b64   : ph.dataUri,
            mime_type  : ph.mime || 'image/jpeg'
          });
        }
      }
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ----------------- Câmara MDT + Galeria de Propriedades -----------
// Workflow:
// 1. Utilizador clica "Capturar" no modal de propriedade.
// 2. NUI manda `enterCameraMode` ao Lua → tablet some, prop sai da mão,
//    força 1ª pessoa, scripted cam ligada à cabeça, focus passa para o jogo.
// 3. NUI mostra overlay full-screen com brackets/crosshair/zoom/coords.
// 4. Player ajusta zoom (roda do rato) e dispara (ESPAÇO/ENTER/E ou LMB).
// 5. screenshot-basic devolve base64 → preview com Aceitar/Repetir/Descartar.
// 6. Aceitar entrega o data URI à galeria da propriedade aberta.

let propertyPendingPhotos = []; // [{ dataUri, mime }]
let incidentPendingPhotos = []; // [{ dataUri, mime }] para nova ocorrência
let editingIncidentId = null;   // id da ocorrência em edição
let editingIncidentPhotos = []; // fotos já gravadas (rows da BD) no modo edição
let cameraOpenedFromContext = null; // 'modal' | null
let cameraTarget = 'property'; // 'property' | 'incident' | 'bolo'
let boloPendingPhoto = null;    // { dataUri, mime } única foto pendente do BOLO em criação

function renderBoloPhotoPreview() {
  const wrap = $('#bolo-photo-preview');
  const img  = $('#bolo-photo-img');
  const clr  = $('#bolo-clear-photo');
  if (!wrap || !img) return;
  if (boloPendingPhoto && boloPendingPhoto.dataUri) {
    img.src = boloPendingPhoto.dataUri;
    wrap.classList.remove('hidden');
    if (clr) clr.classList.remove('hidden');
  } else {
    img.src = '';
    wrap.classList.add('hidden');
    if (clr) clr.classList.add('hidden');
  }
}

function uploadBoloImageChunks(boloId, dataUri, mime) {
  const CHUNK = 4096;
  const transferId = 'bolo-' + boloId + '-' + Date.now();
  const total = Math.ceil(dataUri.length / CHUNK);
  let idx = 0;
  function sendNext() {
    if (idx >= total) return;
    const chunk = dataUri.slice(idx * CHUNK, (idx + 1) * CHUNK);
    nuiPost('setBoloImageChunk', {
      transferId, idx, total, chunk,
      boloId,
      mime: mime || 'image/jpeg'
    });
    idx++;
    setTimeout(sendNext, 30);
  }
  sendNext();
}

function photoSrcFromRow(p) {
  if (!p) return '';
  if (p.dataUri) return p.dataUri;
  const mime = p.mime_type || 'image/jpeg';
  return `data:${mime};base64,${p.data_b64 || ''}`;
}

// ===== Overlay state helpers =====
function camoShow() {
  const ov = $('#camera-overlay');
  if (ov) ov.classList.remove('hidden');
}
function camoHide() {
  const ov = $('#camera-overlay');
  if (ov) ov.classList.add('hidden');
}
function camoSetState(state) {
  // states: 'live' | 'preview'
  const live    = $('#cam-live');
  const prev    = $('#cam-preview-screen');
  if (live) live.classList.toggle('hidden', state !== 'live');
  if (prev) prev.classList.toggle('hidden', state !== 'preview');
}

function camoUpdateCoords() {
  nuiPost('getMyCoords').then(pos => {
    if (!pos) return;
    const c = $('#camo-coords');
    if (c) c.textContent = (pos.zone || '—') + ' · ' + (pos.street || '—');
  }).catch(() => {});
  const t = $('#camo-time');
  if (t) t.textContent = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

let camoTimeInterval = null;

async function openCameraModal() {
  if (!(State.config && State.config.cameraEnabled)) {
    toast(t('perm.camera_disabled'), 'warning');
    return;
  }
  cameraOpenedFromContext = 'modal';
  // Detecta contexto pelo modal aberto se não foi explicitamente definido
  if ($('#modal-bolo') && !$('#modal-bolo').classList.contains('hidden')) {
    cameraTarget = 'bolo';
  } else if ($('#modal-incident') && !$('#modal-incident').classList.contains('hidden')) {
    cameraTarget = 'incident';
  } else {
    cameraTarget = 'property';
  }
  camoShow();
  camoSetState('live');
  camoUpdateCoords();
  if (camoTimeInterval) clearInterval(camoTimeInterval);
  camoTimeInterval = setInterval(camoUpdateCoords, 1000);
  await nuiPost('enterCameraMode');
}

function camoCloseFully() {
  camoHide();
  camoSetState('live');
  if (camoTimeInterval) { clearInterval(camoTimeInterval); camoTimeInterval = null; }
  // Esconde toast de erro
  const err = $('#camo-error');
  if (err) err.classList.add('hidden');
}

async function camoAcceptPhoto(dataUri, mime) {
  if (!dataUri) return;

  const cap = (State.config && State.config.photosPerProperty) || 12;

  // ===== Foto destinada a um BOLO =====
  if (cameraTarget === 'bolo') {
    boloPendingPhoto = { dataUri, mime: mime || 'image/jpeg' };
    renderBoloPhotoPreview();
    return;
  }

  // ===== Foto destinada a uma OCORRÊNCIA =====
  if (cameraTarget === 'incident') {
    // Em modo EDIÇÃO (incidente já existe) → upload imediato
    if (editingIncidentId) {
      const total = (editingIncidentPhotos || []).length + (incidentPendingPhotos || []).length;
      if (total >= cap) {
        toast(t('perm.photo_limit_inc', cap), 'warning');
        return;
      }
      nuiPost('addIncidentPhoto', {
        incident_id: editingIncidentId,
        data_b64   : dataUri,
        mime_type  : mime || 'image/jpeg'
      });
      toast(t('perm.photo_uploading'), 'inform');
      // O incidentChanged push vai disparar refreshEditingIncidentPhotos
      return;
    }
    // Modo CRIAÇÃO → fica pendente até guardar
    if ((incidentPendingPhotos || []).length >= cap) {
      toast(t('perm.photo_limit_inc', cap), 'warning');
      return;
    }
    incidentPendingPhotos.push({ dataUri, mime: mime || 'image/jpeg' });
    renderIncidentGallery();
    toast(t('perm.evidence_added'), 'success');
    return;
  }

  // ===== Foto destinada a uma PROPRIEDADE =====
  if (editingPropertyId) {
    const total = (editingPropertyPhotos || []).length + (propertyPendingPhotos || []).length;
    if (total >= cap) {
      toast(t('perm.photo_limit_prop', cap), 'warning');
      return;
    }
    await nuiPost('addPropertyPhoto', {
      property_id: editingPropertyId,
      data_b64   : dataUri,
      mime_type  : mime || 'image/jpeg'
    });
    setTimeout(refreshEditingPropertyPhotos, 4500);
  } else {
    if ((propertyPendingPhotos || []).length >= cap) {
      toast(t('perm.photo_limit_prop', cap), 'warning');
      return;
    }
    propertyPendingPhotos.push({ dataUri, mime: mime || 'image/jpeg' });
    renderPropertyGallery();
  }
  toast(t('perm.photo_added'), 'success');
}

// Galeria do modal de ocorrência — fotos já gravadas (modo edit) + pendentes
function renderIncidentGallery() {
  const wrap = $('#incident-gallery');
  if (!wrap) return;
  const cap = (State.config && State.config.photosPerProperty) || 12;
  const existing = editingIncidentPhotos || [];
  const pending  = incidentPendingPhotos || [];
  const total = existing.length + pending.length;
  const cnt = $('#incident-gallery-count');
  if (cnt) cnt.textContent = `${total} / ${cap}`;

  if (!total) {
    wrap.innerHTML = `
      <div class="prop-gallery-empty">
        <i class="fa-sharp fa-solid fa-camera-retro"></i>
        <span>${t('inc.gallery.empty_pending')}</span>
      </div>`;
    return;
  }

  const tilesExisting = existing.map(ph => {
    const src = photoSrcFromRow(ph);
    return `
      <div class="prop-gallery-tile" data-photo-id="${ph.id}" data-src="${src}">
        <img src="${src}" alt="" onerror="this.style.display='none'"/>
        <span class="pgt-time">${escapeHtml(fmtDate(ph.created_at))}</span>
        <button class="pgt-del" data-inc-photo-del="${ph.id}" title="${escapeHtml(t('common.delete'))}"><i class="fa-sharp fa-solid fa-trash"></i></button>
      </div>`;
  }).join('');

  const tilesPending = pending.map((p, i) => `
    <div class="prop-gallery-tile pgt-pending" data-pending-idx="${i}" data-src="${p.dataUri}">
      <img src="${p.dataUri}" alt=""/>
      <span class="pgt-pending-tag">${escapeHtml(t('bolo.photo.pending'))}</span>
      <button class="pgt-del" data-pending-del="${i}" title="${escapeHtml(t('common.remove'))}"><i class="fa-sharp fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  wrap.innerHTML = tilesExisting + tilesPending;

  $$('.prop-gallery-tile', wrap).forEach(tile => tile.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-pending-del]') || ev.target.closest('[data-inc-photo-del]')) return;
    openPhotoLightbox(tile.dataset.src);
  }));
  $$('[data-pending-del]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    incidentPendingPhotos.splice(Number(b.dataset.pendingDel), 1);
    renderIncidentGallery();
  }));
  $$('[data-inc-photo-del]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const pid = Number(b.dataset.incPhotoDel);
    confirmModal(t('inc.confirm_photo_del.title'), t('inc.confirm_photo_del.body'), async () => {
      await nuiPost('deleteIncidentPhoto', { id: pid });
      // Server emite incidentChanged → refresh chega via push, mas para feedback
      // imediato removemos localmente também:
      editingIncidentPhotos = editingIncidentPhotos.filter(x => Number(x.id) !== pid);
      renderIncidentGallery();
    });
  }));
}

// Atualiza o estado das fotos da ocorrência aberta (chamado por incidentChanged)
async function refreshEditingIncidentPhotos() {
  if (!editingIncidentId) return;
  const inc = await nuiPost('getIncident', { id: editingIncidentId });
  if (inc && inc.id) {
    editingIncidentPhotos = inc.photos || [];
    renderIncidentGallery();
  }
}

// Abre o modal-incident em MODO EDIÇÃO com dados da ocorrência id
async function openIncidentEdit(id) {
  const inc = await nuiPost('getIncident', { id });
  if (!inc || !inc.id) {
    toast(t('perm.incident_not_found'), 'error');
    return;
  }

  editingIncidentId = Number(inc.id);
  editingIncidentPhotos = inc.photos || [];
  incidentPendingPhotos = [];

  // Atualiza título do modal
  const h = $('#modal-incident h2');
  if (h) h.textContent = t('inc.modal.edit');
  const sub = $('#modal-incident .modal-sub');
  if (sub) sub.textContent = t('inc.modal.case_sub', String(inc.id).padStart(5, '0'), inc.title || '');

  // Popula campos
  $('#incident-title').value = inc.title || '';
  $('#incident-type').value = inc.type || 'outros';
  MdtDD.refresh($('#incident-type'));
  $('#incident-location').value = inc.location || '';
  $('#incident-suspects').value = inc.suspects || '';
  $('#incident-description').value = inc.description || '';

  // Reset weapons + popular com selecção existente
  selectedWeapons = new Set();
  let existingWeapons = [];
  try { existingWeapons = JSON.parse(inc.weapons || '[]'); } catch (e) {}
  if (Array.isArray(existingWeapons)) existingWeapons.forEach(w => selectedWeapons.add(w));
  populateWeaponPicker();
  renderSelectedWeapons();
  // Toggle visibility da secção das armas
  const wepSec = $('#incident-weapons-section');
  if (wepSec) wepSec.classList.toggle('hidden', inc.type !== 'apreensao');

  // Render galeria com fotos existentes
  renderIncidentGallery();

  // Atualiza submit button label
  const submitBtn = $('#incident-submit');
  if (submitBtn) submitBtn.innerHTML = `<i class="fa-sharp fa-solid fa-floppy-disk"></i> ${escapeHtml(t('inc.action.save'))}`;

  $('#modal-incident').classList.remove('hidden');
}

function camoShowError(msg) {
  const err = $('#camo-error');
  const txt = $('#camo-error-msg');
  if (txt) txt.textContent = msg || t('common.unknown_error');
  if (err) err.classList.remove('hidden');
  setTimeout(() => { if (err) err.classList.add('hidden'); }, 4000);
}

// Conta fotos já gravadas da propriedade que está a ser editada
let editingPropertyPhotos = []; // rows da BD para o modal aberto
function propertyExistingPhotosCount() {
  return editingPropertyPhotos.length;
}

async function refreshEditingPropertyPhotos() {
  if (!editingPropertyId) return;
  const p = await nuiPost('getProperty', { id: editingPropertyId });
  editingPropertyPhotos = (p && p.photos) || [];
  renderPropertyGallery();
}

function renderPropertyGallery() {
  const wrap = $('#property-gallery');
  if (!wrap) return;
  const cap = (State.config && State.config.photosPerProperty) || 12;
  const existing = editingPropertyPhotos || [];
  const pending  = propertyPendingPhotos  || [];
  const total    = existing.length + pending.length;
  const cnt = $('#property-gallery-count');
  if (cnt) cnt.textContent = `${total} / ${cap}`;

  if (!total) {
    wrap.innerHTML = `
      <div class="prop-gallery-empty">
        <i class="fa-sharp fa-solid fa-camera-retro"></i>
        <span>${t('prop.gallery.empty_modal')}</span>
      </div>`;
    return;
  }

  const tilesExisting = existing.map(ph => {
    const src = photoSrcFromRow(ph);
    return `
      <div class="prop-gallery-tile" data-photo-id="${ph.id}" data-src="${src}">
        <img src="${src}" alt="" onerror="this.style.display='none'"/>
        <span class="pgt-time">${escapeHtml(fmtDate(ph.created_at))}</span>
        <button class="pgt-del" data-photo-del="${ph.id}" title="${escapeHtml(t('common.delete'))}"><i class="fa-sharp fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join('');

  const tilesPending = pending.map((ph, i) => `
    <div class="prop-gallery-tile pgt-pending" data-pending-idx="${i}" data-src="${ph.dataUri}">
      <img src="${ph.dataUri}" alt="" />
      <span class="pgt-pending-tag">${escapeHtml(t('bolo.photo.pending'))}</span>
      <button class="pgt-del" data-pending-del="${i}" title="${escapeHtml(t('common.remove'))}"><i class="fa-sharp fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  wrap.innerHTML = tilesExisting + tilesPending;

  // Click numa foto → lightbox
  $$('.prop-gallery-tile', wrap).forEach(tile => tile.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-photo-del]') || ev.target.closest('[data-pending-del]')) return;
    openPhotoLightbox(tile.dataset.src);
  }));

  // Eliminar foto guardada
  $$('[data-photo-del]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = Number(b.dataset.photoDel);
    confirmModal(t('prop.confirm_photo_del.title'), t('prop.confirm_photo_del.body'), async () => {
      await nuiPost('deletePropertyPhoto', { id });
      setTimeout(refreshEditingPropertyPhotos, 300);
    });
  }));

  // Remover foto pendente
  $$('[data-pending-del]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const idx = Number(b.dataset.pendingDel);
    propertyPendingPhotos.splice(idx, 1);
    renderPropertyGallery();
  }));
}

// Lightbox simples
function openPhotoLightbox(src) {
  if (!src) return;
  const lb  = $('#photo-lightbox');
  const img = $('#photo-lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.remove('hidden');
}

function closePhotoLightbox() {
  const lb = $('#photo-lightbox');
  if (lb) lb.classList.add('hidden');
  const img = $('#photo-lightbox-img');
  if (img) img.src = '';
}

// ----------------- Offences / Multas ----------------------
// Labels are looked up via t() at render-time so they reflect the current locale.
const OFFENCE_CATEGORIES = {
  traffic:      { labelKey: 'off.cat.traffic',      icon: 'fa-car',          color: '#f59e0b' },
  property:     { labelKey: 'off.cat.property',     icon: 'fa-house-lock',   color: '#ea580c' },
  violent:      { labelKey: 'off.cat.violent',      icon: 'fa-hand-fist',    color: '#dc2626' },
  drug:         { labelKey: 'off.cat.drug',         icon: 'fa-cannabis',     color: '#a855f7' },
  order:        { labelKey: 'off.cat.order',        icon: 'fa-people-group', color: '#3b82f6' },
  white_collar: { labelKey: 'off.cat.white_collar', icon: 'fa-briefcase',    color: '#16a374' },
  cyber:        { labelKey: 'off.cat.cyber',        icon: 'fa-laptop-code',  color: '#06b6d4' }
};
const OFFENCE_SEVERITY = {
  minor:    { labelKey: 'off.sev.minor',    color: '#22c55e' },
  moderate: { labelKey: 'off.sev.moderate', color: '#f59e0b' },
  serious:  { labelKey: 'off.sev.serious',  color: '#f97316' },
  severe:   { labelKey: 'off.sev.severe',   color: '#dc2626' },
  critical: { labelKey: 'off.sev.critical', color: '#7f1d1d' }
};
function offenceCatLabel(k) { const m = OFFENCE_CATEGORIES[k]; return m ? t(m.labelKey) : k; }
function offenceSevLabel(k) { const m = OFFENCE_SEVERITY[k];   return m ? t(m.labelKey) : k; }
const OFFENCE_CATEGORY_ORDER = ['traffic','property','violent','drug','order','white_collar','cyber'];
const OFFENCE_SEVERITY_ORDER = ['minor','moderate','serious','severe','critical'];

State.offences = [];
State.offenceFilter = 'all';
State.offenceQuery  = '';

async function loadOffences() {
  // Carrega lista completa (incluindo desactivadas) para gestão
  const rows = await nuiPost('listAllOffences');
  State.offences = Array.isArray(rows) ? rows : [];
  renderOffenceFilters();
  renderOffencesList();
  // Atualiza também o cache para o citizen panel (apenas activas)
  State.offencesCache = State.offences.filter(o => Number(o.active) === 1);
}

function renderOffenceFilters() {
  const wrap = $('#off-filters');
  if (!wrap) return;
  const list = State.offences || [];
  const used = OFFENCE_CATEGORY_ORDER.filter(c => list.some(o => o.category === c));
  const totalEl = $('#off-active-count');
  if (totalEl) totalEl.textContent = list.filter(o => Number(o.active) === 1).length;

  wrap.innerHTML = `
    <button class="off-filter ${State.offenceFilter === 'all' ? 'active' : ''}" data-filter="all">
      <i class="fa-sharp fa-solid fa-grip"></i> ${escapeHtml(t('common.all_f'))} <span class="rf-count">${list.length}</span>
    </button>
    ${used.map(c => {
      const meta = OFFENCE_CATEGORIES[c];
      const n = list.filter(o => o.category === c).length;
      return `<button class="off-filter ${State.offenceFilter === c ? 'active' : ''}" data-filter="${escapeHtml(c)}" style="--cat-color:${meta.color}">
        <i class="fa-sharp fa-solid ${escapeHtml(meta.icon)}"></i> ${escapeHtml(offenceCatLabel(c))} <span class="rf-count">${n}</span>
      </button>`;
    }).join('')}
  `;

  $$('.off-filter', wrap).forEach(b => b.addEventListener('click', () => {
    State.offenceFilter = b.dataset.filter;
    renderOffencesList();
  }));
}

function renderOffencesList() {
  const wrap = $('#off-list');
  if (!wrap) return;

  const q = (State.offenceQuery || '').toLowerCase();
  let list = State.offences || [];
  if (State.offenceFilter !== 'all') {
    list = list.filter(o => o.category === State.offenceFilter);
  }
  if (q) {
    list = list.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      (o.code || '').toLowerCase().includes(q) ||
      (o.description || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    wrap.innerHTML = `
      <div class="off-empty">
        <i class="fa-sharp fa-solid fa-gavel"></i>
        <h3>${escapeHtml(t('off.empty.title'))}</h3>
        <p>${escapeHtml(t('off.empty.body'))}</p>
      </div>`;
    return;
  }

  // Agrupa por categoria
  const groups = {};
  list.forEach(o => {
    if (!groups[o.category]) groups[o.category] = [];
    groups[o.category].push(o);
  });

  wrap.innerHTML = OFFENCE_CATEGORY_ORDER
    .filter(c => groups[c])
    .map(c => {
      const meta = OFFENCE_CATEGORIES[c] || { icon: 'fa-folder', color: '#7f8c8d' };
      const catLabel = offenceCatLabel(c);
      const items = groups[c].map(o => {
        const sev = OFFENCE_SEVERITY[o.severity] || { color: '#6b7280' };
        const sevLabel = offenceSevLabel(o.severity);
        const inactive = Number(o.active) !== 1;
        // Para offences seeded por defeito (com code), a name/description é traduzida
        // via `off.code.<CODE>` e `off.code.<CODE>.desc`. Offences criadas em-game
        // mantêm o texto original (não há ID canónico).
        const dict = currentLocale();
        const nameLoc = (o.code && dict[`off.code.${o.code}`]) || o.name;
        const descLoc = (o.code && dict[`off.code.${o.code}.desc`]) || o.description;
        return `
          <div class="off-row ${inactive ? 'off-inactive' : ''}" data-offence-id="${o.id}"
               style="--cat-color:${meta.color}; --sev-color:${sev.color}">
            <div class="off-row-left">
              ${o.code ? `<span class="off-code">${escapeHtml(o.code)}</span>` : ''}
              <span class="off-sev-pill">${escapeHtml(sevLabel)}</span>
            </div>
            <div class="off-row-main">
              <div class="off-row-name">${escapeHtml(nameLoc)}${inactive ? ` <span class="off-inactive-tag">${escapeHtml(t('off.tag.inactive'))}</span>` : ''}</div>
              ${descLoc ? `<div class="off-row-desc">${escapeHtml(descLoc)}</div>` : ''}
            </div>
            <div class="off-row-money">
              <div class="off-row-fine">${escapeHtml(fmtMoney(o.fine || 0))}</div>
              ${(o.jail || 0) > 0 ? `<div class="off-row-jail"><i class="fa-sharp fa-solid fa-clock"></i> ${o.jail} min</div>` : ''}
            </div>
            <div class="off-row-actions">
              <button class="btn btn-ghost btn-sm off-edit" data-edit="${o.id}" title="${escapeHtml(t('off.action.edit_title'))}"><i class="fa-sharp fa-solid fa-pen"></i></button>
            </div>
          </div>
        `;
      }).join('');
      return `
        <div class="off-cat-block" style="--cat-color:${meta.color}">
          <div class="off-cat-header">
            <span class="off-cat-icon"><i class="fa-sharp fa-solid ${escapeHtml(meta.icon)}"></i></span>
            <span class="off-cat-label">${escapeHtml(catLabel)}</span>
            <span class="off-cat-count">${groups[c].length}</span>
          </div>
          <div class="off-cat-items">${items}</div>
        </div>
      `;
    }).join('');

  $$('.off-edit', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = Number(b.dataset.edit);
    const o = State.offences.find(x => Number(x.id) === id);
    if (o) openOffenceModal(o);
  }));
  $$('.off-row', wrap).forEach(row => row.addEventListener('click', () => {
    const id = Number(row.dataset.offenceId);
    const o = State.offences.find(x => Number(x.id) === id);
    if (o) openOffenceModal(o);
  }));
}

// ===== Modal: criar / editar =====
let editingOffenceId = null;

function populateOffenceCategoryDropdown() {
  const sel = $('#offence-category');
  if (!sel) return;
  sel.innerHTML = OFFENCE_CATEGORY_ORDER.map(k => {
    const m = OFFENCE_CATEGORIES[k];
    return `<option value="${k}" data-icon="${m.icon}" data-color="${m.color}">${escapeHtml(offenceCatLabel(k))}</option>`;
  }).join('');
  MdtDD.refresh(sel);
}
function populateOffenceSeverityDropdown() {
  const sel = $('#offence-severity');
  if (!sel) return;
  sel.innerHTML = OFFENCE_SEVERITY_ORDER.map(k => {
    const m = OFFENCE_SEVERITY[k];
    return `<option value="${k}" data-color="${m.color}" data-icon="fa-circle">${escapeHtml(offenceSevLabel(k))}</option>`;
  }).join('');
  MdtDD.refresh(sel);
}

function openOffenceModal(existing) {
  populateOffenceCategoryDropdown();
  populateOffenceSeverityDropdown();

  const titleEl = $('#offence-modal-title');
  const delBtn  = $('#offence-delete');

  if (existing && existing.id) {
    editingOffenceId = Number(existing.id);
    if (titleEl) titleEl.textContent = t('off.modal.edit');
    if (delBtn) delBtn.classList.remove('hidden');
    const dict = currentLocale();
    const nameLoc = (existing.code && dict[`off.code.${existing.code}`])      || existing.name        || '';
    const descLoc = (existing.code && dict[`off.code.${existing.code}.desc`]) || existing.description || '';
    $('#offence-category').value    = existing.category    || 'traffic';
    $('#offence-severity').value    = existing.severity    || 'minor';
    $('#offence-code').value        = existing.code        || '';
    $('#offence-name').value        = nameLoc;
    $('#offence-description').value = descLoc;
    $('#offence-fine').value        = existing.fine        || 0;
    $('#offence-jail').value        = existing.jail        || 0;
    $('#offence-active').checked    = Number(existing.active) === 1;
  } else {
    editingOffenceId = null;
    if (titleEl) titleEl.textContent = t('off.modal.new');
    if (delBtn) delBtn.classList.add('hidden');
    $('#offence-category').value    = 'traffic';
    $('#offence-severity').value    = 'minor';
    $('#offence-code').value        = '';
    $('#offence-name').value        = '';
    $('#offence-description').value = '';
    $('#offence-fine').value        = '';
    $('#offence-jail').value        = '';
    $('#offence-active').checked    = true;
  }
  // Re-render do dropdown para refletir o value seleccionado
  MdtDD.refresh($('#offence-category'));
  MdtDD.refresh($('#offence-severity'));

  $('#modal-offence').classList.remove('hidden');
  setTimeout(() => $('#offence-name').focus(), 50);
}

async function submitOffenceModal() {
  const payload = {
    category:    $('#offence-category').value,
    severity:    $('#offence-severity').value,
    code:        ($('#offence-code').value || '').trim(),
    name:        ($('#offence-name').value || '').trim(),
    description: ($('#offence-description').value || '').trim(),
    fine:        Number($('#offence-fine').value) || 0,
    jail:        Number($('#offence-jail').value) || 0,
    active:      $('#offence-active').checked
  };
  if (!payload.name) { toast(t('perm.required_field_simple', t('cit.field.name')), 'error'); return; }

  const btn = $('#offence-submit');
  if (btn) btn.disabled = true;
  try {
    if (editingOffenceId) {
      payload.id = editingOffenceId;
      await nuiPost('updateOffence', payload);
    } else {
      await nuiPost('createOffence', payload);
    }
    closeAllModals();
    setTimeout(loadOffences, 250);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function deleteOffence() {
  if (!editingOffenceId) return;
  const id = editingOffenceId;
  confirmModal(t('off.confirm_delete.title'), t('off.confirm_delete.body'), async () => {
    await nuiPost('deleteOffence', { id });
    closeAllModals();
    setTimeout(loadOffences, 250);
  });
}

// ============================================================
//   MANDADOS / WARRANTS
// ============================================================
State.warrants = [];
State.warrantFilter = 'all';
State.warrantQuery  = '';

async function loadWarrants() {
  const rows = await nuiPost('listWarrants');
  State.warrants = Array.isArray(rows) ? rows : [];
  renderWarrantFilters();
  renderWarrantsList();
}

function renderWarrantFilters() {
  const wrap = $('#wnt-filters');
  if (!wrap) return;
  const list = State.warrants || [];
  const active = list.filter(w => w.status === 'active').length;
  const cnt = $('#wnt-active-count');
  if (cnt) cnt.textContent = active;

  // Filtros: Todos · Activos · Por tipo · Cumpridos · Anulados
  wrap.innerHTML = `
    <button class="wnt-filter ${State.warrantFilter==='all'?'active':''}" data-filter="all">
      <i class="fa-sharp fa-solid fa-grip"></i> ${escapeHtml(t('common.all_m'))} <span class="rf-count">${list.length}</span>
    </button>
    <button class="wnt-filter wnt-f-active ${State.warrantFilter==='active'?'active':''}" data-filter="active">
      <i class="fa-sharp fa-solid fa-bolt"></i> ${escapeHtml(t('wnt.filter.in_force'))} <span class="rf-count">${active}</span>
    </button>
    <button class="wnt-filter wnt-f-arrest ${State.warrantFilter==='arrest'?'active':''}" data-filter="arrest">
      <i class="fa-sharp fa-solid fa-handcuffs"></i> ${escapeHtml(t('wnt.filter.arrest'))}
    </button>
    <button class="wnt-filter wnt-f-search ${State.warrantFilter==='search'?'active':''}" data-filter="search">
      <i class="fa-sharp fa-solid fa-magnifying-glass"></i> ${escapeHtml(t('wnt.filter.search'))}
    </button>
    <button class="wnt-filter wnt-f-bench ${State.warrantFilter==='bench'?'active':''}" data-filter="bench">
      <i class="fa-sharp fa-solid fa-gavel"></i> ${escapeHtml(t('wnt.filter.bench'))}
    </button>
    <button class="wnt-filter ${State.warrantFilter==='executed'?'active':''}" data-filter="executed">
      <i class="fa-sharp fa-solid fa-circle-check"></i> ${escapeHtml(t('wnt.filter.executed'))}
    </button>
  `;
  $$('.wnt-filter', wrap).forEach(b => b.addEventListener('click', () => {
    State.warrantFilter = b.dataset.filter;
    renderWarrantsList();
  }));
}

function renderWarrantsList() {
  const wrap = $('#wnt-list');
  if (!wrap) return;
  const types = (State.config && State.config.warrantTypes) || {};
  const stats = (State.config && State.config.warrantStatuses) || {};

  let list = State.warrants || [];
  if (State.warrantFilter && State.warrantFilter !== 'all') {
    if (['arrest','search','bench'].includes(State.warrantFilter)) {
      list = list.filter(w => w.type === State.warrantFilter);
    } else {
      list = list.filter(w => w.status === State.warrantFilter);
    }
  }
  const q = (State.warrantQuery || '').toLowerCase();
  if (q) {
    list = list.filter(w =>
      (w.citizen_name || '').toLowerCase().includes(q) ||
      (w.charges || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    wrap.innerHTML = `
      <div class="wnt-empty">
        <i class="fa-sharp fa-solid fa-scale-balanced"></i>
        <h3>${escapeHtml(t('wnt.empty.title'))}</h3>
        <p>${escapeHtml(t('wnt.empty.body'))}</p>
      </div>`;
    return;
  }

  wrap.classList.add('stagger');
  wrap.innerHTML = list.map(w => {
    const tm = types[w.type] || { label: w.type, icon: 'fa-scale-balanced', color: '#dc2626' };
    const sm = stats[w.status] || { label: w.status.toUpperCase(), color: '#6b7280' };
    const charges = (w.charges || '').split('\n').filter(Boolean);
    const photo = w.image_url ? `style="background-image:url('${escapeHtml(w.image_url)}')"` : '';
    const initials = (w.citizen_name || '?').split(' ').map(s => s[0] || '').slice(0,2).join('').toUpperCase();
    const isActive = w.status === 'active';

    return `
      <div class="wnt-poster wnt-status-${escapeHtml(w.status)}" style="--wnt-tcolor:${tm.color}; --wnt-scolor:${sm.color}" data-warrant-id="${w.id}">
        <div class="wnt-poster-paper">
          <!-- Banner topo -->
          <div class="wnt-poster-banner">
            <span class="wnt-banner-icon"><i class="fa-sharp fa-solid ${escapeHtml(tm.icon)}"></i></span>
            <span class="wnt-banner-title">WANTED</span>
            <span class="wnt-banner-type">${escapeHtml((tm.label || '').toUpperCase())}</span>
          </div>

          <!-- Foto / Mugshot -->
          <div class="wnt-poster-photo ${w.image_url ? '' : 'wnt-photo-empty'}" ${photo}>
            ${!w.image_url ? `<span class="wnt-photo-initials">${escapeHtml(initials)}</span>` : ''}
            ${isActive ? `<div class="wnt-stamp-active">${escapeHtml(t('wnt.stamp.in_force'))}</div>` : ''}
            ${w.status === 'executed' ? `<div class="wnt-stamp-done">${escapeHtml(t('wnt.stamp.executed'))}</div>` : ''}
            ${w.status === 'cancelled' ? `<div class="wnt-stamp-cancel">${escapeHtml(t('wnt.stamp.cancelled'))}</div>` : ''}
            ${w.status === 'expired' ? `<div class="wnt-stamp-cancel">${escapeHtml(t('wnt.stamp.expired'))}</div>` : ''}
          </div>

          <!-- Info -->
          <div class="wnt-poster-info">
            <div class="wnt-poster-name">${escapeHtml(w.citizen_name)}</div>
            <div class="wnt-poster-id">${escapeHtml(t('wnt.case_no'))} ${String(w.id).padStart(5, '0')}</div>

            ${charges.length ? `
              <div class="wnt-poster-charges">
                <div class="wnt-charges-label">${escapeHtml(t('wnt.charges_label'))}</div>
                <ul>${charges.slice(0, 4).map(c => `<li>${escapeHtml(c)}</li>`).join('')}${charges.length>4?`<li class="wnt-charges-more">${escapeHtml(t('wnt.charges_more', charges.length-4))}</li>`:''}</ul>
              </div>` : ''}

            ${w.reward > 0 ? `
              <div class="wnt-poster-reward">
                <span class="wnt-reward-lab">${escapeHtml(t('wnt.reward_label'))}</span>
                <span class="wnt-reward-val">${escapeHtml(fmtMoney(w.reward))}</span>
              </div>` : ''}
          </div>

          <!-- Footer -->
          <div class="wnt-poster-foot">
            <div class="wnt-foot-meta">
              <span><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(w.issued_by)}</span>
              <span><i class="fa-sharp fa-solid fa-calendar"></i> ${escapeHtml(fmtDate(w.created_at))}</span>
            </div>
            ${isActive ? `
              <div class="wnt-foot-actions">
                <button class="btn btn-warning btn-sm" data-execute="${w.id}" title="${escapeHtml(t('wnt.action.execute_title'))}"><i class="fa-sharp fa-solid fa-check"></i> ${escapeHtml(t('wnt.action.execute'))}</button>
                <button class="btn btn-ghost btn-sm" data-cancel="${w.id}" title="${escapeHtml(t('wnt.action.cancel_title'))}"><i class="fa-sharp fa-solid fa-ban"></i></button>
                <button class="btn btn-ghost btn-sm" data-edit="${w.id}" title="${escapeHtml(t('wnt.action.edit_title'))}"><i class="fa-sharp fa-solid fa-pen"></i></button>
              </div>
            ` : `
              <div class="wnt-foot-meta wnt-foot-done">
                ${w.executed_by ? `${escapeHtml(t('wnt.executed_by'))} <strong>${escapeHtml(w.executed_by)}</strong> · ${escapeHtml(fmtDate(w.executed_at))}` : ''}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bind actions
  $$('[data-execute]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = Number(b.dataset.execute);
    confirmModal(t('wnt.confirm_execute.title'), t('wnt.confirm_execute.body'), async () => {
      await nuiPost('executeWarrant', { id });
      setTimeout(loadWarrants, 250);
    });
  }));
  $$('[data-cancel]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = Number(b.dataset.cancel);
    confirmModal(t('wnt.confirm_cancel.title'), t('wnt.confirm_cancel.body'), async () => {
      await nuiPost('cancelWarrant', { id });
      setTimeout(loadWarrants, 250);
    });
  }));
  $$('[data-edit]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = Number(b.dataset.edit);
    const w = State.warrants.find(x => Number(x.id) === id);
    if (w) openWarrantModal(w);
  }));
}

// ===== Modal Mandado =====
let editingWarrantId = null;
let warrantSelectedCitizen = null;

function populateWarrantTypeDD() {
  const sel = $('#warrant-type');
  if (!sel) return;
  const types = (State.config && State.config.warrantTypes) || {};
  sel.innerHTML = Object.keys(types).map(k => {
    const t = types[k];
    return `<option value="${k}" data-icon="${t.icon}" data-color="${t.color}">${escapeHtml(t.label)}</option>`;
  }).join('');
  MdtDD.refresh(sel);
}

function setWarrantSelectedCitizen(c) {
  warrantSelectedCitizen = c;
  const wrap = $('#warrant-citizen-selected');
  if (!wrap) return;
  if (!c) {
    wrap.innerHTML = `<i class="fa-sharp fa-solid fa-user-magnifying-glass"></i><span class="muted">${escapeHtml(t('wnt.no_subject'))}</span>`;
    $('#warrant-citizen-id').value = '';
    $('#warrant-citizen-name').value = '';
    return;
  }
  const name = `${c.firstname || ''} ${c.lastname || ''}`.trim() || t('common.no_name');
  wrap.innerHTML = `
    <i class="fa-sharp fa-solid fa-id-card"></i>
    <div class="wnt-cit-pick">
      <strong>${escapeHtml(name)}</strong>
      <span class="muted">${c.serverId ? 'ID #' + c.serverId + ' · ONLINE' : 'OFFLINE'}</span>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" id="wnt-clear-cit"><i class="fa-sharp fa-solid fa-xmark"></i></button>
  `;
  $('#warrant-citizen-id').value = c.identifier;
  $('#warrant-citizen-name').value = name;
  $('#wnt-clear-cit').addEventListener('click', () => setWarrantSelectedCitizen(null));
}

async function searchWarrantCitizen() {
  const q = ($('#warrant-citizen-search').value || '').trim();
  if (!q) return;
  const rows = await nuiPost('searchCitizens', { query: q });
  const wrap = $('#warrant-citizen-results');
  if (!wrap) return;
  if (!rows || !rows.length) {
    wrap.innerHTML = `<p class="muted pad">${escapeHtml(t('common.no_results'))}</p>`;
    wrap.classList.remove('hidden');
    return;
  }
  wrap.innerHTML = rows.slice(0, 8).map(c => {
    const name = `${c.firstname || ''} ${c.lastname || ''}`.trim() || t('common.no_name');
    return `
      <button type="button" class="wnt-cit-result" data-identifier="${escapeHtml(c.identifier)}">
        <strong>${escapeHtml(name)}</strong>
        <span>${c.serverId ? `ID ${c.serverId}` : 'OFFLINE'}</span>
      </button>`;
  }).join('');
  wrap.classList.remove('hidden');
  $$('.wnt-cit-result', wrap).forEach(b => b.addEventListener('click', () => {
    const c = rows.find(x => x.identifier === b.dataset.identifier);
    if (c) {
      setWarrantSelectedCitizen(c);
      wrap.classList.add('hidden');
      $('#warrant-citizen-search').value = '';
    }
  }));
}

function openWarrantModal(existing) {
  populateWarrantTypeDD();
  setWarrantSelectedCitizen(null);
  $('#warrant-citizen-results').classList.add('hidden');
  $('#warrant-citizen-search').value = '';

  const titleEl = $('#warrant-modal-title');
  if (existing && existing.id) {
    editingWarrantId = Number(existing.id);
    if (titleEl) titleEl.textContent = t('wnt.modal.edit');
    setWarrantSelectedCitizen({
      identifier: existing.citizen_identifier,
      firstname: existing.citizen_name.split(' ')[0],
      lastname:  existing.citizen_name.split(' ').slice(1).join(' '),
      serverId: null
    });
    $('#warrant-type').value = existing.type || 'arrest';
    MdtDD.refresh($('#warrant-type'));
    $('#warrant-charges').value     = existing.charges || '';
    $('#warrant-description').value = existing.description || '';
    $('#warrant-reward').value      = existing.reward || '';
    $('#warrant-image').value       = existing.image_url || '';
    $('#warrant-notes').value       = existing.notes || '';
    $('#warrant-expires').value     = '';
  } else {
    editingWarrantId = null;
    if (titleEl) titleEl.textContent = t('wnt.modal.issue');
    $('#warrant-type').value = 'arrest';
    MdtDD.refresh($('#warrant-type'));
    $('#warrant-charges').value     = '';
    $('#warrant-description').value = '';
    $('#warrant-reward').value      = '';
    $('#warrant-image').value       = '';
    $('#warrant-notes').value       = '';
    $('#warrant-expires').value     = '';
  }
  $('#modal-warrant').classList.remove('hidden');
}

async function submitWarrantModal() {
  if (!warrantSelectedCitizen && !editingWarrantId) {
    toast(t('perm.select_subject'), 'error'); return;
  }
  const charges = ($('#warrant-charges').value || '').trim();
  if (!charges) { toast(t('perm.charge_required'), 'error'); return; }

  const payload = {
    citizen_identifier: $('#warrant-citizen-id').value,
    citizen_name: $('#warrant-citizen-name').value,
    type: $('#warrant-type').value,
    charges,
    description: ($('#warrant-description').value || '').trim(),
    reward: Number($('#warrant-reward').value) || 0,
    image_url: ($('#warrant-image').value || '').trim(),
    notes: ($('#warrant-notes').value || '').trim()
  };
  const expires = Number($('#warrant-expires').value);
  if (expires > 0) payload.expires_in_hours = expires;

  const btn = $('#warrant-submit');
  if (btn) btn.disabled = true;
  try {
    if (editingWarrantId) {
      payload.id = editingWarrantId;
      await nuiPost('updateWarrant', payload);
    } else {
      await nuiPost('createWarrant', payload);
    }
    closeAllModals();
    setTimeout(loadWarrants, 250);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================
//   UNIDADES / TACTICAL UNITS
// ============================================================
State.units = [];
State.unitFilter = 'all';
let editingUnitId = null;
let memberPickUnitId = null;
// Identificador do agente em drag (mais fiável que dataTransfer no NUI/CEF)
let __draggedOfficerIdent = null;

async function loadUnits() {
  const rows = await nuiPost('listUnits');
  State.units = Array.isArray(rows) ? rows : [];
  renderUnitFilters();
  renderUnitsList();
  renderUnitRoster();
}

function renderUnitFilters() {
  const wrap = $('#un-filters');
  if (!wrap) return;
  const list = State.units || [];
  const stats = (State.config && State.config.unitStatuses) || {};
  const cntEl = $('#un-active-count');
  if (cntEl) cntEl.textContent = list.length;

  const order = ['available','responding','busy','unavailable'];
  wrap.innerHTML = `
    <button class="un-filter ${State.unitFilter==='all'?'active':''}" data-filter="all">
      <i class="fa-sharp fa-solid fa-grip"></i> ${escapeHtml(t('common.all_f'))} <span class="rf-count">${list.length}</span>
    </button>
    ${order.filter(s => stats[s]).map(s => {
      const meta = stats[s];
      const n = list.filter(u => u.status === s).length;
      return `<button class="un-filter ${State.unitFilter===s?'active':''}" data-filter="${s}" style="--un-color:${meta.color}">
        <i class="fa-sharp fa-solid ${escapeHtml(meta.icon)}"></i> ${escapeHtml(meta.label)} <span class="rf-count">${n}</span>
      </button>`;
    }).join('')}
  `;
  $$('.un-filter', wrap).forEach(b => b.addEventListener('click', () => {
    State.unitFilter = b.dataset.filter;
    renderUnitsList();
  }));
}

function renderUnitsList() {
  const wrap = $('#un-list');
  if (!wrap) return;
  const types = (State.config && State.config.unitTypes) || {};
  const stats = (State.config && State.config.unitStatuses) || {};

  let list = State.units || [];
  if (State.unitFilter !== 'all') list = list.filter(u => u.status === State.unitFilter);

  if (!list.length) {
    wrap.innerHTML = `
      <div class="un-empty">
        <i class="fa-sharp fa-solid fa-users-rectangle"></i>
        <h3>${escapeHtml(t('un.empty.title'))}</h3>
        <p>${escapeHtml(t('un.empty.body'))}</p>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map(u => {
    const tMeta = types[u.type] || { label: u.type, icon: 'fa-shield', color: '#3b82f6' };
    const sMeta = stats[u.status] || { label: u.status, color: '#6b7280', icon: 'fa-circle' };
    const members = u.members || [];
    const onlineCount = members.filter(m => m.online).length;

    return `
      <div class="un-card un-status-${escapeHtml(u.status)}" style="--un-tcolor:${tMeta.color}; --un-scolor:${sMeta.color}" data-unit-id="${u.id}">
        <div class="un-card-head">
          <div class="un-card-icon"><i class="fa-sharp fa-solid ${escapeHtml(tMeta.icon)}"></i></div>
          <div class="un-card-title">
            <div class="un-card-callsign">${escapeHtml(u.callsign)}</div>
            <div class="un-card-name">${escapeHtml(u.name)}</div>
          </div>
          <button class="un-card-edit" data-edit-unit="${u.id}" title="${escapeHtml(t('un.edit_title'))}"><i class="fa-sharp fa-solid fa-pen"></i></button>
        </div>

        <div class="un-card-status-row">
          <select class="mdt-select un-status-select" data-unit-id="${u.id}">
            ${Object.keys(stats).map(k => {
              const m = stats[k];
              return `<option value="${k}" data-color="${m.color}" data-icon="${m.icon}" ${k===u.status?'selected':''}>${escapeHtml(m.label)}</option>`;
            }).join('')}
          </select>
        </div>

        ${u.notes ? `<div class="un-card-notes"><i class="fa-sharp fa-solid fa-quote-left"></i> ${escapeHtml(u.notes)}</div>` : ''}

        <div class="un-card-members">
          <div class="un-card-members-h">
            <span><i class="fa-sharp fa-solid fa-users"></i> ${escapeHtml(t('un.section.agents'))}</span>
            <span class="un-card-members-cnt">${escapeHtml(t('un.section.online_n', onlineCount, members.length))}</span>
          </div>
          ${members.length ? members.map(m => {
            const fname = `${m.firstname || ''} ${m.lastname || ''}`.trim() || '(?)';
            // Tenta obter o ped headshot real (cidadão online) — caso contrário, fallback para avatar gerado
            const officerOnline = (State.officers || []).find(o => o.identifier === m.identifier);
            const headshot = officerOnline ? officerOnline.headshot : null;
            return `
              <div class="un-member-row ${m.online ? 'un-mem-on' : 'un-mem-off'} ${m.is_leader ? 'un-mem-leader' : ''}">
                <div class="un-mem-av">${avatarHtml('police-' + (m.serverId || m.identifier), fname, 32, headshot)}</div>
                <div class="un-mem-info">
                  <div class="un-mem-name">${escapeHtml(fname)} ${m.is_leader ? `<span class="un-mem-leader-tag">${escapeHtml(t('un.member.leader_tag'))}</span>` : ''}</div>
                  <div class="un-mem-meta">${m.online ? escapeHtml(t('un.member.online_id', m.serverId)) : escapeHtml(t('un.member.offline'))}</div>
                </div>
                <div class="un-mem-actions">
                  ${!m.is_leader ? `<button class="un-mem-act" data-set-leader='${escapeHtml(JSON.stringify({unitId: u.id, identifier: m.identifier}))}' title="${escapeHtml(t('un.member.set_leader_title'))}"><i class="fa-sharp fa-solid fa-crown"></i></button>` : ''}
                  <button class="un-mem-act un-mem-rem" data-rem-member='${escapeHtml(JSON.stringify({unitId: u.id, identifier: m.identifier}))}' title="${escapeHtml(t('un.member.remove_title'))}"><i class="fa-sharp fa-solid fa-xmark"></i></button>
                </div>
              </div>
            `;
          }).join('') : `<p class="muted pad" style="text-align:center;font-size:11px">${escapeHtml(t('un.no_members'))}</p>`}
        </div>

        <div class="un-card-foot">
          <button class="btn btn-ghost btn-sm" data-add-member="${u.id}"><i class="fa-sharp fa-solid fa-user-plus"></i> ${escapeHtml(t('un.add_officer'))}</button>
          <button class="btn btn-ghost btn-sm un-card-del" data-del-unit="${u.id}" title="${escapeHtml(t('un.delete_unit'))}"><i class="fa-sharp fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');

  // Re-init custom dropdowns dos status selects
  $$('.un-status-select', wrap).forEach(sel => {
    MdtDD.refresh(sel);
    sel.addEventListener('change', () => {
      nuiPost('setUnitStatus', { id: Number(sel.dataset.unitId), status: sel.value });
    });
  });

  // Bind actions
  $$('[data-edit-unit]', wrap).forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const id = Number(b.dataset.editUnit);
    const u = State.units.find(x => Number(x.id) === id);
    if (u) openUnitModal(u);
  }));
  $$('[data-del-unit]', wrap).forEach(b => b.addEventListener('click', () => {
    const id = Number(b.dataset.delUnit);
    confirmModal(t('un.confirm_delete.title'), t('un.confirm_delete.body'), async () => {
      await nuiPost('deleteUnit', { id });
      setTimeout(loadUnits, 250);
    });
  }));
  $$('[data-add-member]', wrap).forEach(b => b.addEventListener('click', () => {
    openUnitMemberPicker(Number(b.dataset.addMember));
  }));
  $$('[data-set-leader]', wrap).forEach(b => b.addEventListener('click', () => {
    const d = JSON.parse(b.dataset.setLeader);
    nuiPost('setUnitLeader', { unitId: d.unitId, identifier: d.identifier });
  }));
  $$('[data-rem-member]', wrap).forEach(b => b.addEventListener('click', () => {
    const d = JSON.parse(b.dataset.remMember);
    nuiPost('removeUnitMember', { unitId: d.unitId, identifier: d.identifier });
  }));

  // Drag de membros: cada .un-member-row pode ser arrastada para outra
  // unidade (move) ou para o roster lateral (remove). Os botões de acção
  // (líder, remover) ficam imunes ao drag.
  $$('.un-member-row', wrap).forEach(row => {
    row.dataset.identifier = row.dataset.identifier || '';
    // Lemos o identifier a partir do botão de remover (já está em JSON)
    const remBtn = row.querySelector('[data-rem-member]');
    if (remBtn) {
      try {
        const d = JSON.parse(remBtn.dataset.remMember);
        row.dataset.identifier = d.identifier || '';
        row.dataset.fromUnitId = String(d.unitId || '');
      } catch (e) {}
    }
    row.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      // Não iniciar drag se o clique foi num botão de acção
      if (ev.target.closest('.un-mem-act')) return;
      if (!row.dataset.identifier || !row.dataset.fromUnitId) return;
      ev.preventDefault();
      startOfficerDrag(row, ev, Number(row.dataset.fromUnitId));
    });
  });
}

// ===== Roster lateral (agentes online) =====
function renderUnitRoster() {
  const list = $('#un-roster-list');
  if (!list) return;
  const cntEl = $('#un-roster-cnt');

  const officers = State.officers || [];
  // Mapa identifier -> callsign da unidade onde já está
  const assignedMap = {};
  (State.units || []).forEach(u => {
    (u.members || []).forEach(m => {
      if (m.identifier) assignedMap[m.identifier] = u.callsign;
    });
  });

  if (cntEl) cntEl.textContent = officers.length;

  if (!officers.length) {
    list.innerHTML = `<p class="muted pad" style="text-align:center;font-size:11.5px">${escapeHtml(t('live.no_online'))}</p>`;
    return;
  }

  list.innerHTML = officers.map(o => {
    const fname = `${o.firstname || ''} ${o.lastname || ''}`.trim() || '(?)';
    const assigned = assignedMap[o.identifier];
    const cls = [
      'un-officer-card',
      o.onDuty ? '' : 'un-off-duty',
      assigned ? 'un-off-assigned' : ''
    ].filter(Boolean).join(' ');
    const tip = assigned
      ? t('un.assigned_tip', assigned)
      : (o.onDuty ? t('un.drag_to_unit') : t('un.drag_off_duty'));
    return `
      <div class="${cls}"
           data-identifier="${escapeHtml(o.identifier || '')}"
           title="${escapeHtml(tip)}">
        <div class="un-officer-av">${avatarHtml('police-' + o.id, fname, 36, o.headshot)}</div>
        <div class="un-officer-info">
          <div class="un-officer-name">${escapeHtml(fname)}</div>
          <div class="un-officer-meta">${escapeHtml(o.callsign || ('ID ' + o.id))} · ${escapeHtml(o.onDuty ? t('un.on_duty') : t('un.off_duty'))}</div>
        </div>
        ${assigned
          ? `<span class="un-officer-assigned-badge">${escapeHtml(assigned)}</span>`
          : `<i class="fa-sharp fa-solid fa-grip-dots-vertical un-officer-grip"></i>`}
      </div>
    `;
  }).join('');

  // Drag customizado via pointer events (HTML5 DnD é instável em CEF/NUI).
  // Cria um "ghost" que segue o cursor; ao soltar em cima de um .un-card
  // chama addUnitMember no servidor.
  $$('.un-officer-card', list).forEach(el => {
    if (el.classList.contains('un-off-assigned')) return;
    el.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return; // só botão esquerdo
      ev.preventDefault();
      startOfficerDrag(el, ev);
    });
  });
}

// ===== Drag customizado (pointer events) =====
let __dragGhost = null;
let __dragSource = null;

function startOfficerDrag(sourceEl, downEv, fromUnitId) {
  const ident = sourceEl.dataset.identifier;
  if (!ident) return;

  __draggedOfficerIdent = ident;
  __dragSource = sourceEl;
  sourceEl.classList.add('dragging');
  document.body.classList.add('un-dragging');

  // Ghost visual a seguir o cursor
  const rect = sourceEl.getBoundingClientRect();
  __dragGhost = sourceEl.cloneNode(true);
  __dragGhost.classList.add('un-drag-ghost');
  __dragGhost.classList.remove('dragging');
  __dragGhost.style.position = 'fixed';
  __dragGhost.style.left  = rect.left + 'px';
  __dragGhost.style.top   = rect.top + 'px';
  __dragGhost.style.width = rect.width + 'px';
  __dragGhost.style.pointerEvents = 'none';
  __dragGhost.style.zIndex = '1000005';
  document.body.appendChild(__dragGhost);

  // Offset para o ghost seguir o cursor pelo mesmo ponto onde foi clicado
  const offX = downEv.clientX - rect.left;
  const offY = downEv.clientY - rect.top;

  // Highlight global em todos os cards de unidade
  $$('.un-card').forEach(z => z.classList.add('un-drop-ready'));
  // Se vem de uma unidade, o roster também é drop target (= remover)
  const roster = $('.un-roster');
  if (roster && fromUnitId) roster.classList.add('un-drop-ready');

  function onMove(e) {
    if (!__dragGhost) return;
    __dragGhost.style.left = (e.clientX - offX) + 'px';
    __dragGhost.style.top  = (e.clientY - offY) + 'px';

    const hit = elementUnderCursor(e.clientX, e.clientY);
    const overCard   = hit ? hit.closest('.un-card')   : null;
    const overRoster = (hit && fromUnitId) ? hit.closest('.un-roster') : null;
    $$('.un-card').forEach(c => {
      c.classList.toggle('un-drop-active', c === overCard);
    });
    if (roster) roster.classList.toggle('un-drop-active', overRoster === roster);
  }

  async function onUp(e) {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);

    const hit = elementUnderCursor(e.clientX, e.clientY);
    const dropCard   = hit ? hit.closest('.un-card')   : null;
    const dropRoster = (hit && fromUnitId) ? hit.closest('.un-roster') : null;

    if (__dragGhost) { __dragGhost.remove(); __dragGhost = null; }
    if (__dragSource) __dragSource.classList.remove('dragging');
    document.body.classList.remove('un-dragging');
    $$('.un-card').forEach(z => {
      z.classList.remove('un-drop-ready');
      z.classList.remove('un-drop-active');
    });
    if (roster) {
      roster.classList.remove('un-drop-ready');
      roster.classList.remove('un-drop-active');
    }

    const droppedIdent = __draggedOfficerIdent;
    __draggedOfficerIdent = null;
    __dragSource = null;

    if (!droppedIdent) return;

    // 1) Drop no roster (vindo de uma unidade) → remover dessa unidade
    if (dropRoster && fromUnitId) {
      await nuiPost('removeUnitMember', { unitId: fromUnitId, identifier: droppedIdent });
      setTimeout(loadUnits, 250);
      return;
    }

    // 2) Drop num card de unidade
    if (dropCard) {
      const unitId = Number(dropCard.dataset.unitId);
      if (!unitId) return;
      const u = State.units.find(x => Number(x.id) === unitId);
      if (u && (u.members || []).some(m => m.identifier === droppedIdent)) {
        // Já está nesta unidade — no-op silencioso (drag para a própria unidade)
        return;
      }
      // Server faz "remove de qualquer unidade + insert na nova" automaticamente,
      // por isso isto serve tanto para roster→unit como para unit→unit.
      await nuiPost('addUnitMember', { unitId, identifier: droppedIdent });
      setTimeout(loadUnits, 250);
    }
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mouseup',   onUp,   true);
}

// Hit-test que ignora o ghost (que tem pointer-events:none, mas alguns
// browsers ainda o devolvem caso esteja em cima do cursor)
function elementUnderCursor(x, y) {
  if (!__dragGhost) return document.elementFromPoint(x, y);
  const oldVis = __dragGhost.style.visibility;
  __dragGhost.style.visibility = 'hidden';
  const el = document.elementFromPoint(x, y);
  __dragGhost.style.visibility = oldVis;
  return el;
}

// ===== Modal Nova/Editar Unidade =====
function populateUnitTypeDD() {
  const sel = $('#unit-type');
  if (!sel) return;
  const types = (State.config && State.config.unitTypes) || {};
  sel.innerHTML = Object.keys(types).map(k => {
    const t = types[k];
    return `<option value="${k}" data-icon="${t.icon}" data-color="${t.color}">${escapeHtml(t.label)}</option>`;
  }).join('');
  MdtDD.refresh(sel);
}

function openUnitModal(existing) {
  populateUnitTypeDD();
  const titleEl = $('#unit-modal-title');
  const delBtn = $('#unit-delete');

  if (existing && existing.id) {
    editingUnitId = Number(existing.id);
    if (titleEl) titleEl.textContent = t('un.modal.edit');
    if (delBtn) delBtn.classList.remove('hidden');
    $('#unit-callsign').value = existing.callsign || '';
    $('#unit-name').value     = existing.name || '';
    $('#unit-type').value     = existing.type || 'patrol';
    $('#unit-notes').value    = existing.notes || '';
    MdtDD.refresh($('#unit-type'));
  } else {
    editingUnitId = null;
    if (titleEl) titleEl.textContent = t('un.modal.new');
    if (delBtn) delBtn.classList.add('hidden');
    $('#unit-callsign').value = '';
    $('#unit-name').value     = '';
    $('#unit-type').value     = 'patrol';
    $('#unit-notes').value    = '';
    MdtDD.refresh($('#unit-type'));
  }
  $('#modal-unit').classList.remove('hidden');
}

async function submitUnitModal() {
  const payload = {
    callsign: ($('#unit-callsign').value || '').trim().toUpperCase(),
    name:     ($('#unit-name').value || '').trim(),
    type:     $('#unit-type').value,
    notes:    ($('#unit-notes').value || '').trim()
  };
  if (!payload.callsign || !payload.name) {
    toast(t('perm.callsign_required'), 'error'); return;
  }
  const btn = $('#unit-submit');
  if (btn) btn.disabled = true;
  try {
    if (editingUnitId) {
      payload.id = editingUnitId;
      await nuiPost('updateUnit', payload);
    } else {
      await nuiPost('createUnit', payload);
    }
    closeAllModals();
    setTimeout(loadUnits, 250);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function deleteUnitFromModal() {
  if (!editingUnitId) return;
  const id = editingUnitId;
  confirmModal(t('un.confirm_delete.title'), t('un.confirm_delete.body'), async () => {
    await nuiPost('deleteUnit', { id });
    closeAllModals();
    setTimeout(loadUnits, 250);
  });
}

// ===== Picker de membro =====
function openUnitMemberPicker(unitId) {
  memberPickUnitId = unitId;
  const u = State.units.find(x => Number(x.id) === unitId);
  if (u) setText('#unit-member-target', t('un.modal.member_target', u.callsign));

  const list = $('#unit-member-list');
  if (!list) return;

  // Lista de agentes online (do livemap state) que ainda não estão NESTA unidade
  const inUnit = new Set((u && u.members ? u.members.map(m => m.identifier) : []));
  const candidates = (State.officers || []).filter(o => o.identifier && !inUnit.has(o.identifier));

  if (!candidates.length) {
    list.innerHTML = `<p class="muted pad">${escapeHtml(t('un.no_online_avail'))}</p>`;
  } else {
    list.innerHTML = candidates.map(o => {
      const fname = `${o.firstname || ''} ${o.lastname || ''}`.trim() || '(?)';
      return `
        <button type="button" class="un-mem-pick" data-add-mem="${escapeHtml(o.identifier)}">
          <div class="un-mem-pick-av">${avatarHtml('police-' + o.id, fname, 32, o.headshot)}</div>
          <div class="un-mem-pick-info">
            <div class="un-mem-pick-name">${escapeHtml(fname)}</div>
            <div class="un-mem-pick-meta">ID ${o.id} · ${escapeHtml(o.gradeLabel || '')}</div>
          </div>
          <i class="fa-sharp fa-solid fa-arrow-right"></i>
        </button>
      `;
    }).join('');
    $$('.un-mem-pick', list).forEach(b => b.addEventListener('click', async () => {
      const ident = b.dataset.addMem;
      await nuiPost('addUnitMember', { unitId: memberPickUnitId, identifier: ident });
      closeAllModals();
      setTimeout(loadUnits, 250);
    }));
  }

  $('#modal-unit-member').classList.remove('hidden');
}

// ============================================================
//   BULLETIN BOARD
// ============================================================
State.bulletins = [];
State.selectedBulletinId = null;
State.bulletinSearch = '';
let editingBulletinId = null;

async function loadBulletins() {
  const rows = await nuiPost('listBulletins');
  State.bulletins = Array.isArray(rows) ? rows : [];
  renderBulletinList();
  // Mantém a selecção, ou pega na primeira (priorizando pinned)
  if (State.selectedBulletinId &&
      State.bulletins.find(b => Number(b.id) === Number(State.selectedBulletinId))) {
    renderBulletinDetail(Number(State.selectedBulletinId));
  } else if (State.bulletins.length) {
    State.selectedBulletinId = Number(State.bulletins[0].id);
    renderBulletinDetail(State.selectedBulletinId);
  } else {
    State.selectedBulletinId = null;
    renderBulletinDetail(null);
  }
}

function renderBulletinList() {
  const wrap = $('#bb-list');
  if (!wrap) return;
  const list = (State.bulletins || []).filter(b => {
    const q = (State.bulletinSearch || '').toLowerCase().trim();
    if (!q) return true;
    return (b.title || '').toLowerCase().includes(q)
        || (b.body  || '').toLowerCase().includes(q)
        || (b.author|| '').toLowerCase().includes(q);
  });

  setText('#bb-active-count', (State.bulletins || []).length);

  if (!list.length) {
    wrap.innerHTML = `
      <div class="bb-empty">
        <i class="fa-sharp fa-solid fa-clipboard"></i>
        <p>${escapeHtml(t('bb.empty_msg'))}</p>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map(b => {
    const pinned = (Number(b.pinned) === 1);
    const active = (Number(State.selectedBulletinId) === Number(b.id));
    const preview = (b.body || '').slice(0, 110);
    return `
      <button type="button" class="bb-card ${active ? 'active' : ''} ${pinned ? 'pinned' : ''}" data-bb-id="${b.id}">
        <div class="bb-card-head">
          <span class="bb-card-title">${escapeHtml(b.title || t('bb.no_title'))}</span>
          ${pinned ? '<i class="fa-sharp fa-solid fa-thumbtack bb-pin-icon"></i>' : ''}
        </div>
        <div class="bb-card-preview">${escapeHtml(preview)}${(b.body || '').length > 110 ? '…' : ''}</div>
        <div class="bb-card-meta">
          <span>${escapeHtml(b.author || '—')}</span>
          <span>·</span>
          <span>${escapeHtml(fmtDate(b.created_at))}</span>
        </div>
      </button>
    `;
  }).join('');

  $$('.bb-card', wrap).forEach(c => c.addEventListener('click', () => {
    State.selectedBulletinId = Number(c.dataset.bbId);
    renderBulletinList();
    renderBulletinDetail(State.selectedBulletinId);
  }));
}

function renderBulletinDetail(id) {
  const wrap = $('#bb-detail');
  if (!wrap) return;
  if (!id) {
    wrap.innerHTML = `
      <div class="bb-detail-empty">
        <i class="fa-sharp fa-solid fa-clipboard-list"></i>
        <h3>${escapeHtml(t('bb.detail.empty.title'))}</h3>
        <p>${escapeHtml(t('bb.detail.empty.body'))}</p>
      </div>`;
    return;
  }
  const b = (State.bulletins || []).find(x => Number(x.id) === Number(id));
  if (!b) { wrap.innerHTML = ''; return; }
  const pinned = Number(b.pinned) === 1;

  wrap.innerHTML = `
    <header class="bb-detail-head">
      <div class="bb-detail-title-wrap">
        <h2 class="bb-detail-title">${escapeHtml(b.title || '')}</h2>
        <div class="bb-detail-meta">
          <span><i class="fa-sharp fa-solid fa-user-shield"></i> ${escapeHtml(b.author || '—')}</span>
          <span><i class="fa-sharp fa-solid fa-clock"></i> ${escapeHtml(fmtDate(b.created_at))}</span>
          ${pinned ? `<span class="bb-pinned-tag"><i class="fa-sharp fa-solid fa-thumbtack"></i> ${escapeHtml(t('bb.tag.pinned'))}</span>` : ''}
        </div>
      </div>
      <div class="bb-detail-actions">
        <button class="btn btn-ghost btn-sm" data-bb-pin="${b.id}" title="${escapeHtml(pinned ? t('bb.action.unpin') : t('bb.action.pin'))}">
          <i class="fa-sharp fa-solid fa-thumbtack"></i> ${escapeHtml(pinned ? t('bb.action.unpin') : t('bb.action.pin'))}
        </button>
        <button class="btn btn-ghost btn-sm" data-bb-edit="${b.id}"><i class="fa-sharp fa-solid fa-pen"></i> ${escapeHtml(t('bb.action.edit'))}</button>
        <button class="btn btn-danger btn-sm" data-bb-delete="${b.id}"><i class="fa-sharp fa-solid fa-trash"></i> ${escapeHtml(t('bb.action.delete'))}</button>
      </div>
    </header>
    <div class="bb-detail-body">${formatChatBody(b.body || '')}</div>
  `;

  const pinBtn = wrap.querySelector('[data-bb-pin]');
  if (pinBtn) pinBtn.addEventListener('click', async () => {
    await nuiPost('toggleBulletinPin', { id: Number(pinBtn.dataset.bbPin) });
  });
  const editBtn = wrap.querySelector('[data-bb-edit]');
  if (editBtn) editBtn.addEventListener('click', () => {
    const target = (State.bulletins || []).find(x => Number(x.id) === Number(editBtn.dataset.bbEdit));
    if (target) openBulletinModal(target);
  });
  const delBtn = wrap.querySelector('[data-bb-delete]');
  if (delBtn) delBtn.addEventListener('click', () => {
    const bid = Number(delBtn.dataset.bbDelete);
    confirmModal(t('bb.confirm_delete.title'), t('bb.confirm_delete.body'), async () => {
      await nuiPost('deleteBulletin', { id: bid });
      State.selectedBulletinId = null;
    });
  });
}

function openBulletinModal(existing) {
  const titleEl = $('#bulletin-modal-title');
  const delBtn  = $('#bulletin-delete');
  if (existing && existing.id) {
    editingBulletinId = Number(existing.id);
    if (titleEl) titleEl.textContent = t('bb.modal.edit');
    if (delBtn)  delBtn.classList.remove('hidden');
    $('#bulletin-title').value   = existing.title || '';
    $('#bulletin-body').value    = existing.body  || '';
    $('#bulletin-pinned').checked = Number(existing.pinned) === 1;
  } else {
    editingBulletinId = null;
    if (titleEl) titleEl.textContent = t('bb.modal.new');
    if (delBtn)  delBtn.classList.add('hidden');
    $('#bulletin-title').value   = '';
    $('#bulletin-body').value    = '';
    $('#bulletin-pinned').checked = false;
  }
  $('#modal-bulletin').classList.remove('hidden');
}

async function submitBulletinModal() {
  const payload = {
    title:  ($('#bulletin-title').value || '').trim(),
    body:   ($('#bulletin-body').value || '').trim(),
    pinned: !!$('#bulletin-pinned').checked
  };
  if (!payload.title || !payload.body) return;
  const btn = $('#bulletin-submit');
  if (btn) btn.disabled = true;
  try {
    if (editingBulletinId) {
      payload.id = editingBulletinId;
      await nuiPost('updateBulletin', payload);
    } else {
      const res = await nuiPost('createBulletin', payload);
      if (res && res.id) State.selectedBulletinId = Number(res.id);
    }
    closeAllModals();
  } finally {
    if (btn) btn.disabled = false;
  }
}

function deleteBulletinFromModal() {
  if (!editingBulletinId) return;
  const id = editingBulletinId;
  confirmModal(t('bb.confirm_delete.title'), t('bb.confirm_delete.body'), async () => {
    await nuiPost('deleteBulletin', { id });
    closeAllModals();
  });
}

// ============================================================
//   LOGS — auditoria
// ============================================================
State.logs = [];

async function loadLogs() {
  const wrap = $('#lg-list');
  if (wrap) wrap.innerHTML = `<p class="muted pad">${escapeHtml(t('common.loading'))}</p>`;
  const rows = await nuiPost('listLogs', {
    q          : ($('#lg-q')      && $('#lg-q').value      || '').trim(),
    action     : ($('#lg-action') && $('#lg-action').value || ''),
    target_type: ($('#lg-target') && $('#lg-target').value || ''),
    limit: 200, offset: 0
  });
  State.logs = Array.isArray(rows) ? rows : [];
  renderLogsList();
}

const LOG_ACTION_META = {
  create:        { labelKey: 'lg.action.create',             icon: 'fa-plus',            color: '#22c55e' },
  update:        { labelKey: 'lg.action.update',             icon: 'fa-pen',             color: '#3b82f6' },
  delete:        { labelKey: 'lg.action.delete',             icon: 'fa-trash',           color: '#dc2626' },
  status_change: { labelKey: 'lg.action.status_change',      icon: 'fa-arrows-rotate',   color: '#a855f7' },
  photo_add:     { labelKey: 'lg.action.photo_add',          icon: 'fa-camera',          color: '#f59e0b' },
  photo_delete:  { labelKey: 'lg.action.photo_delete',       icon: 'fa-image-slash',     color: '#dc2626' },
  execute:       { labelKey: 'lg.action.execute',            icon: 'fa-gavel',           color: '#22c55e' },
  cancel:        { labelKey: 'lg.action.cancel',             icon: 'fa-ban',             color: '#dc2626' },
  pin:           { labelKey: 'lg.action.pin',                icon: 'fa-thumbtack',       color: '#f59e0b' },
  unpin:         { labelKey: 'lg.action.unpin',              icon: 'fa-thumbtack-slash', color: '#94a3b8' },
  unit_add_member:    { labelKey: 'lg.action.unit_add_member',    icon: 'fa-user-plus',  color: '#22c55e' },
  unit_remove_member: { labelKey: 'lg.action.unit_remove_member', icon: 'fa-user-minus', color: '#dc2626' },
  unit_set_leader:    { labelKey: 'lg.action.unit_set_leader',    icon: 'fa-crown',      color: '#fbbf24' },
  unit_set_status:    { labelKey: 'lg.action.unit_set_status',    icon: 'fa-flag',       color: '#a855f7' }
};
const LOG_TARGET_META = {
  bolo:     { labelKey: 'lg.target.bolo',     icon: 'fa-bullhorn' },
  property: { labelKey: 'lg.target.property', icon: 'fa-house-flag' },
  incident: { labelKey: 'lg.target.incident', icon: 'fa-clipboard-list' },
  warrant:  { labelKey: 'lg.target.warrant',  icon: 'fa-scale-balanced' },
  unit:     { labelKey: 'lg.target.unit',     icon: 'fa-users-rectangle' },
  report:   { labelKey: 'lg.target.report',   icon: 'fa-file-lines' },
  record:   { labelKey: 'lg.target.record',   icon: 'fa-fingerprint' },
  bulletin: { labelKey: 'lg.target.bulletin', icon: 'fa-thumbtack' }
};

function renderLogsList() {
  const wrap = $('#lg-list');
  if (!wrap) return;
  setText('#lg-count', (State.logs || []).length);

  if (!State.logs.length) {
    wrap.innerHTML = `
      <div class="lg-empty">
        <i class="fa-sharp fa-solid fa-clock-rotate-left"></i>
        <h3>${escapeHtml(t('lg.empty.title'))}</h3>
        <p>${escapeHtml(t('lg.empty.body'))}</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="lg-row lg-row-head">
      <div>${escapeHtml(t('lg.col.when'))}</div>
      <div>${escapeHtml(t('lg.col.action'))}</div>
      <div>${escapeHtml(t('lg.col.target'))}</div>
      <div>${escapeHtml(t('lg.col.details'))}</div>
      <div>${escapeHtml(t('lg.col.actor'))}</div>
    </div>
    ${State.logs.map(l => {
      const am = LOG_ACTION_META[l.action] || { icon: 'fa-circle', color: '#94a3b8' };
      const amLabel = am.labelKey ? t(am.labelKey) : (l.action || '');
      const tm = LOG_TARGET_META[l.target_type] || { icon: 'fa-cube' };
      const tmLabel = tm.labelKey ? t(tm.labelKey) : (l.target_type || '—');
      return `
        <div class="lg-row">
          <div class="lg-when" title="${escapeHtml(l.created_at || '')}">${escapeHtml(timeAgo(l.created_at))}</div>
          <div class="lg-action" style="--la-color:${am.color || ''}">
            <i class="fa-sharp fa-solid ${am.icon}"></i> <span>${escapeHtml(amLabel)}</span>
          </div>
          <div class="lg-target">
            <i class="fa-sharp fa-solid ${tm.icon}"></i>
            <span>${escapeHtml(tmLabel)}${l.target_id ? ' #' + escapeHtml(l.target_id) : ''}</span>
          </div>
          <div class="lg-details" title="${escapeHtml(l.details || '')}">${escapeHtml(l.details || '—')}</div>
          <div class="lg-actor">${escapeHtml(l.actor || '—')}</div>
        </div>
      `;
    }).join('')}
  `;
}

// ----------------- Department ------------
async function loadDepartment() {
  const rows = await nuiPost('listDepartment');
  const wrap = $('#dept-grid');
  if (!rows || !rows.length) {
    wrap.innerHTML = `<p class="muted pad">${escapeHtml(t('dept.no_online'))}</p>`;
    return;
  }
  wrap.classList.add('stagger');
  wrap.innerHTML = rows.map(o => {
    const fullName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
    const seed = o.id ? ('police-' + o.id) : fullName;
    const headshot = (State.myId && State.myId === o.id && State.meta && State.meta.headshot)
                       ? State.meta.headshot : o.headshot;
    return `
      <div class="dept-card">
        <div class="dept-avatar">${avatarHtml(seed, fullName, 56, headshot)}</div>
        <div class="dept-info">
          <div class="dept-name">${escapeHtml(fullName)}</div>
          <div class="dept-rank">${escapeHtml(o.gradeLabel || t('dash.grade_n', (o.grade || 0)))}</div>
        </div>
        <span class="dept-status">${escapeHtml(t('dept.online_status'))}</span>
      </div>
    `;
  }).join('');
}

// ----------------- Modais ----------------
function closeAllModals() {
  $$('.modal').forEach(m => m.classList.add('hidden'));
}

let confirmCallback = null;
function confirmModal(title, text, cb) {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent  = text;
  $('#modal-confirm').classList.remove('hidden');
  confirmCallback = cb;
}

// ----------------- Bind events -----------
function bindEvents() {
  // Sidebar nav
  $$('.nav-item').forEach(b => b.addEventListener('click', () => goTo(b.dataset.app)));
  $$('.quick-btn').forEach(b => b.addEventListener('click', () => goTo(b.dataset.go)));

  // Logout (sidebar) → volta ao lock screen, MDT continua aberto
  const btnLogout = $('#btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', logoutSession);

  // Lock screen — iOS home bar (clicar OU arrastar para cima)
  const lockStart = $('#lock-start');
  const lockInner = $('#lock-inner');
  if (lockStart && lockInner) {
    let unlocking = false;
    let dragging = false;
    let startY = 0;
    let dy = 0;
    const UNLOCK_THRESHOLD = 80; // px

    const onStart = (clientY) => {
      if (unlocking) return;
      dragging = true;
      startY = clientY;
      dy = 0;
      lockStart.classList.add('dragging');
      lockInner.classList.add('dragging');
    };
    const onMove = (clientY) => {
      if (!dragging) return;
      dy = Math.min(0, clientY - startY); // só arrasta para cima
      lockInner.style.transform = `translateY(${dy}px)`;
      // Fade gradual conforme arrasta
      const k = Math.min(1, Math.abs(dy) / 200);
      lockInner.style.opacity = String(1 - k * 0.4);
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      lockStart.classList.remove('dragging');
      lockInner.classList.remove('dragging');

      if (Math.abs(dy) >= UNLOCK_THRESHOLD) {
        // Desbloqueia
        unlocking = true;
        lockInner.style.transform = '';
        lockInner.style.opacity = '';
        loginToSession();
        setTimeout(() => { unlocking = false; }, 800);
      } else {
        // Snap-back suave
        lockInner.style.transform = '';
        lockInner.style.opacity = '';
      }
      dy = 0;
    };

    // Click → desbloqueia (sem arrastar)
    lockStart.addEventListener('click', (ev) => {
      // Se foi um drag real, ignora o click
      if (Math.abs(dy) > 5) return;
      if (unlocking) return;
      unlocking = true;
      loginToSession();
      setTimeout(() => { unlocking = false; }, 800);
    });

    // Mouse drag
    lockStart.addEventListener('mousedown', (ev) => { onStart(ev.clientY); ev.preventDefault(); });
    window.addEventListener('mousemove', (ev) => onMove(ev.clientY));
    window.addEventListener('mouseup',   () => onEnd());

    // Touch drag (caso o NUI tenha touch)
    lockStart.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0]; if (t) onStart(t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (ev) => {
      const t = ev.touches[0]; if (t) onMove(t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => onEnd());

    // Permitir também arrastar a partir de qualquer ponto do footer/inner
    // (estilo iOS — swipe-up universal). Limita ao terço inferior.
    lockInner.addEventListener('mousedown', (ev) => {
      if (ev.target === lockStart) return; // já tratado
      const rect = lockInner.getBoundingClientRect();
      if (ev.clientY < rect.top + rect.height * 0.65) return;
      onStart(ev.clientY);
    });
    lockInner.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0]; if (!t) return;
      const rect = lockInner.getBoundingClientRect();
      if (t.clientY < rect.top + rect.height * 0.65) return;
      onStart(t.clientY);
    }, { passive: true });
  }

  // Citizens
  $('#citizen-search-btn').addEventListener('click', searchCitizens);
  $('#citizen-search').addEventListener('keyup', e => { if (e.key === 'Enter') searchCitizens(); });

  // Vehicles
  $('#vehicle-search-btn').addEventListener('click', searchVehicle);
  $('#vehicle-search').addEventListener('keyup', e => { if (e.key === 'Enter') searchVehicle(); });

  // BOLO modal
  $('#btn-new-bolo').addEventListener('click', () => {
    boloPendingPhoto = null;
    renderBoloPhotoPreview();
    $('#modal-bolo').classList.remove('hidden');
  });
  $('#bolo-capture-btn').addEventListener('click', () => openCameraModal());
  $('#bolo-clear-photo').addEventListener('click', () => {
    boloPendingPhoto = null;
    renderBoloPhotoPreview();
  });
  $('#bolo-submit').addEventListener('click', async () => {
    const payload = {
      title       : $('#bolo-title').value.trim(),
      description : $('#bolo-description').value.trim(),
      priority    : $('#bolo-priority').value,
      target      : $('#bolo-target').value.trim(),
      image_url   : $('#bolo-image').value.trim()
    };
    if (!payload.title || !payload.description) return;
    const submitBtn = $('#bolo-submit');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await nuiPost('createBolo', payload);
      const newId = res && res.id;
      // Se o agente capturou foto, faz o upload em chunks com o id retornado
      if (newId && boloPendingPhoto && boloPendingPhoto.dataUri) {
        uploadBoloImageChunks(newId, boloPendingPhoto.dataUri, boloPendingPhoto.mime || 'image/jpeg');
      }
      boloPendingPhoto = null;
      closeAllModals();
      $('#bolo-title').value = '';
      $('#bolo-description').value = '';
      $('#bolo-target').value = '';
      $('#bolo-image').value = '';
      renderBoloPhotoPreview();
      setTimeout(loadBolos, 300);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Record modal
  $('#record-submit').addEventListener('click', async () => {
    const id = $('#record-crime').value;
    const crime = (State.offencesCache || []).find(c => String(c.id) === String(id));
    if (!recordTargetIdentifier || !crime) return;
    const label = crime.code ? `[${crime.code}] ${crime.name}` : crime.name;
    await nuiPost('addRecord', {
      identifier: recordTargetIdentifier,
      crime     : label,
      fine      : Number($('#record-fine').value) || 0,
      jail      : Number($('#record-jail').value) || 0,
      notes     : $('#record-notes').value.trim()
    });
    closeAllModals();
    $('#record-notes').value = '';
    setTimeout(() => loadCitizen(recordTargetIdentifier), 350);
  });

  // Fine modal (do perfil do cidadão)
  $('#cz-fine-submit').addEventListener('click', async () => {
    const amount = Number($('#cz-fine-amount').value) || 0;
    const reason = $('#cz-fine-reason').value.trim();
    if (!fineTargetIdentifier || !amount || !reason) {
      toast('Preenche os campos.', 'error'); return;
    }
    await nuiPost('issueFine', {
      identifier: fineTargetIdentifier, amount, reason
    });
    closeAllModals();
    setTimeout(() => loadCitizen(fineTargetIdentifier), 350);
  });

  // Fine quick form removido — multas só via perfil do cidadão

  // Incidents modal
  // A secção de armas só aparece quando o tipo é "apreensao"
  function updateIncidentWeaponSection() {
    const typeSel = $('#incident-type');
    const wepSec = $('#incident-weapons-section');
    if (!typeSel || !wepSec) return;
    const isApreensao = (typeSel.value === 'apreensao');
    wepSec.classList.toggle('hidden', !isApreensao);
    if (!isApreensao) {
      // limpa selecção quando muda para outro tipo
      selectedWeapons = new Set();
      renderSelectedWeapons();
    }
  }

  const incTypeSel = $('#incident-type');
  if (incTypeSel) incTypeSel.addEventListener('change', updateIncidentWeaponSection);

  const btnNewIncident = $('#btn-new-incident');
  if (btnNewIncident) btnNewIncident.addEventListener('click', () => {
    // Reset modo edição
    editingIncidentId = null;
    editingIncidentPhotos = [];
    incidentPendingPhotos = [];

    // Reset chrome do modal
    const h = $('#modal-incident h2');
    if (h) h.textContent = t('inc.modal.new');
    const sub = $('#modal-incident .modal-sub');
    if (sub) sub.textContent = t('inc.modal.subtitle');
    const submitBtn = $('#incident-submit');
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-sharp fa-solid fa-floppy-disk"></i> ${escapeHtml(t('inc.action.register'))}`;

    selectedWeapons = new Set();
    populateWeaponPicker();
    renderSelectedWeapons();
    $('#incident-title').value = '';
    $('#incident-location').value = '';
    $('#incident-suspects').value = '';
    $('#incident-description').value = '';
    renderIncidentGallery();
    updateIncidentWeaponSection();
    $('#modal-incident').classList.remove('hidden');
  });

  // Câmara para incidente
  const incCamBtn = $('#incident-camera-btn');
  if (incCamBtn) incCamBtn.addEventListener('click', () => {
    cameraTarget = 'incident';
    openCameraModal();
  });

  // Botão "Aqui" — preenche o campo Local com a zona/rua actuais
  const incUseLoc = $('#incident-use-location');
  if (incUseLoc) incUseLoc.addEventListener('click', async () => {
    const c = await nuiPost('getMyCoords');
    if (!c) { toast(t('inc.toast.no_position'), 'error'); return; }
    const inp = $('#incident-location');
    if (!inp) return;
    const parts = [];
    if (c.street) parts.push(c.street);
    if (c.zone) parts.push(c.zone);
    inp.value = parts.join(' · ') || '—';
  });

  const incSubmit = $('#incident-submit');
  if (incSubmit) incSubmit.addEventListener('click', async () => {
    const payload = {
      title       : $('#incident-title').value.trim(),
      type        : $('#incident-type').value,
      location    : $('#incident-location').value.trim(),
      suspects    : $('#incident-suspects').value.trim(),
      description : $('#incident-description').value.trim(),
      weapons     : [...selectedWeapons]
    };
    if (!payload.title || !payload.description) {
      toast(t('inc.toast.required_fields'), 'error'); return;
    }

    incSubmit.disabled = true;
    try {
      let id = editingIncidentId;
      if (id) {
        // Modo EDIÇÃO — atualiza campos
        payload.id = id;
        await nuiPost('updateIncident', payload);
        closeAllModals();
        setTimeout(loadIncidents, 250);
      } else {
        // Modo CRIAÇÃO — cria + sobe pendentes em background
        const res = await nuiPost('createIncident', payload);
        id = res && res.id;
        if (!id) { toast(t('inc.toast.create_failed'), 'error'); return; }

        const photosToUpload = incidentPendingPhotos.slice();
        incidentPendingPhotos = [];

        closeAllModals();
        loadIncidents();

        if (photosToUpload.length) {
          toast(t('perm.photo_uploading_n', photosToUpload.length), 'inform');
          for (const ph of photosToUpload) {
            nuiPost('addIncidentPhoto', {
              incident_id: id,
              data_b64   : ph.dataUri,
              mime_type  : ph.mime || 'image/jpeg'
            });
          }
        }
      }
    } finally {
      incSubmit.disabled = false;
    }
  });

  // Properties — pesquisa
  const propSearch = $('#property-search');
  if (propSearch) propSearch.addEventListener('input', () => {
    State.propertyQuery = (propSearch.value || '').trim();
    renderPropertyList();
  });

  // Properties — botão Nova
  const btnNewProp = $('#btn-new-property');
  if (btnNewProp) btnNewProp.addEventListener('click', () => openPropertyModal(null));

  // Properties — submit do modal
  const propSubmit = $('#property-submit');
  if (propSubmit) propSubmit.addEventListener('click', submitPropertyModal);

  // Properties — tags chip input (Enter / vírgula adiciona)
  const tagField = $('#property-tags-field');
  if (tagField) {
    tagField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = (tagField.value || '').trim().replace(/^#/, '');
        if (v && !propertyTagsState.includes(v)) {
          propertyTagsState.push(v);
          renderPropertyChips();
        }
        tagField.value = '';
      } else if (e.key === 'Backspace' && !tagField.value && propertyTagsState.length) {
        propertyTagsState.pop();
        renderPropertyChips();
      }
    });
  }

  // Properties — botão Câmara (entra em modo viewfinder)
  const propCamBtn = $('#property-camera-btn');
  if (propCamBtn) propCamBtn.addEventListener('click', () => openCameraModal());

  // Properties — botão Galeria global
  const galleryBtn = $('#btn-prop-gallery');
  if (galleryBtn) galleryBtn.addEventListener('click', loadPropertyGlobalGallery);

  // ===== Warrants =====
  const wntSearch = $('#warrant-search');
  if (wntSearch) wntSearch.addEventListener('input', () => {
    State.warrantQuery = (wntSearch.value || '').trim();
    renderWarrantsList();
  });
  const newWntBtn = $('#btn-new-warrant');
  if (newWntBtn) newWntBtn.addEventListener('click', () => openWarrantModal(null));
  const wntSubmit = $('#warrant-submit');
  if (wntSubmit) wntSubmit.addEventListener('click', submitWarrantModal);
  const wntCitSearchBtn = $('#warrant-citizen-search-btn');
  if (wntCitSearchBtn) wntCitSearchBtn.addEventListener('click', searchWarrantCitizen);
  const wntCitInput = $('#warrant-citizen-search');
  if (wntCitInput) wntCitInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') searchWarrantCitizen();
  });

  // ===== Units =====
  const newUnBtn = $('#btn-new-unit');
  if (newUnBtn) newUnBtn.addEventListener('click', () => openUnitModal(null));
  const unSubmit = $('#unit-submit');
  if (unSubmit) unSubmit.addEventListener('click', submitUnitModal);
  const unDelBtn = $('#unit-delete');
  if (unDelBtn) unDelBtn.addEventListener('click', deleteUnitFromModal);

  // Offences — pesquisa + criar/editar/eliminar
  const offSearch = $('#offence-search');
  if (offSearch) offSearch.addEventListener('input', () => {
    State.offenceQuery = (offSearch.value || '').trim();
    renderOffencesList();
  });
  const newOffBtn = $('#btn-new-offence');
  if (newOffBtn) newOffBtn.addEventListener('click', () => openOffenceModal(null));
  const offSubmit = $('#offence-submit');
  if (offSubmit) offSubmit.addEventListener('click', submitOffenceModal);
  const offDel = $('#offence-delete');
  if (offDel) offDel.addEventListener('click', deleteOffence);

  // Lightbox de fotografias — fechar via botão X ou clicar fora da imagem
  // (o ESC é tratado pelo handler global hierárquico)
  const lbClose = $('#photo-lightbox-close');
  if (lbClose) lbClose.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closePhotoLightbox();
  });
  const lb = $('#photo-lightbox');
  if (lb) lb.addEventListener('click', (ev) => {
    // Só fecha se o clique foi no fundo (não na imagem nem no botão)
    if (ev.target === lb) closePhotoLightbox();
  });

  // Câmara overlay — Aceitar / Repetir / Descartar
  // (já não passamos o dataUri ao Lua — ele vive só no NUI)
  const camAccept = $('#camo-accept');
  if (camAccept) camAccept.addEventListener('click', () => {
    if (!window.__camoLastDataUri) return;
    nuiPost('cameraAccept');
  });
  const camRetake = $('#camo-retake');
  if (camRetake) camRetake.addEventListener('click', () => {
    nuiPost('cameraRetake');
  });
  const camCancelBtn = $('#camo-cancel');
  if (camCancelBtn) camCancelBtn.addEventListener('click', () => {
    nuiPost('cameraCancel');
  });

  // Properties — usar a minha posição actual
  const useCoords = $('#property-use-coords');
  if (useCoords) useCoords.addEventListener('click', async () => {
    const c = await nuiPost('getMyCoords');
    if (!c) return;
    if (typeof c.x === 'number') $('#property-gps-x').value = c.x;
    if (typeof c.y === 'number') $('#property-gps-y').value = c.y;
    // Pré-preenche zona se vazia
    const dist = $('#property-district');
    if (dist && !dist.value && c.zone) dist.value = c.zone;
    const addr = $('#property-address');
    if (addr && !addr.value && c.street) addr.value = c.street;
    toast('Coordenadas capturadas.', 'success');
  });

  // Reports modal
  $('#btn-new-report').addEventListener('click', () => $('#modal-report').classList.remove('hidden'));
  $('#report-submit').addEventListener('click', async () => {
    const payload = {
      title    : $('#report-title').value.trim(),
      category : $('#report-category').value,
      content  : $('#report-content').value.trim(),
      involved : $('#report-involved').value.trim()
    };
    if (!payload.title || !payload.content) { toast('Preenche os campos.', 'error'); return; }
    await nuiPost('createReport', payload);
    closeAllModals();
    $('#report-title').value = '';
    $('#report-content').value = '';
    $('#report-involved').value = '';
    setTimeout(loadReports, 300);
  });

  // Chat (full app messages foi removido; mantém handlers se existir o markup legacy)
  const chatSend = $('#chat-send');
  if (chatSend) chatSend.addEventListener('click', sendMessage);
  const chatText = $('#chat-text');
  if (chatText) chatText.addEventListener('keyup', e => { if (e.key === 'Enter') sendMessage(); });

  // Modais (close) — proteção quando há fotos pendentes em property/incident
  $$('[data-close-modal]').forEach(b => b.addEventListener('click', (ev) => {
    const modalProperty = $('#modal-property');
    const modalIncident = $('#modal-incident');
    const isInsideProperty = ev.target.closest('#modal-property');
    const isInsideIncident = ev.target.closest('#modal-incident');

    if (isInsideProperty && modalProperty && !modalProperty.classList.contains('hidden')
        && (propertyPendingPhotos || []).length > 0) {
      confirmModal(t('common.confirm_delete'),
        t('prop.confirm_close.body', propertyPendingPhotos.length),
        () => { propertyPendingPhotos = []; closeAllModals(); });
      return;
    }
    if (isInsideIncident && modalIncident && !modalIncident.classList.contains('hidden')
        && (incidentPendingPhotos || []).length > 0) {
      confirmModal(t('common.confirm_delete'),
        t('inc.confirm_close.body', incidentPendingPhotos.length),
        () => { incidentPendingPhotos = []; closeAllModals(); });
      return;
    }
    closeAllModals();
  }));

  // Confirm
  $('#confirm-yes').addEventListener('click', () => {
    closeAllModals();
    if (typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
  });

  // Top-bar global search → procura cidadão (Enter)
  const gs = $('#global-search');
  if (gs) {
    gs.addEventListener('keyup', e => {
      if (e.key === 'Enter') {
        const q = gs.value.trim();
        if (!q) return;
        goTo('citizens');
        $('#citizen-search').value = q;
        searchCitizens();
        gs.value = '';
      }
    });
  }

  // Top-bar bell → vai para BOLOs
  const bell = $('.tb-bell');
  if (bell) bell.addEventListener('click', () => goTo('bolos'));

  // Map zoom reset
  const mzReset = $('#map-zoom-reset');
  if (mzReset) mzReset.addEventListener('click', resetMapZoom);
  const dzReset = $('#dispatch-zoom-reset');
  if (dzReset) dzReset.addEventListener('click', resetDispatchZoom);

  // Map calibration
  const mCal  = $('#map-calibrate');
  const mCanc = $('#map-cal-cancel');
  if (mCal)  mCal.addEventListener('click', () => setCalibrating(!calibrating));
  if (mCanc) mCanc.addEventListener('click', () => setCalibrating(false));

  // Click on map (frame area) — usado em modo calibração
  const mFrame  = $('#map-frame');
  const mCanvas = $('#map-canvas');
  if (mFrame) {
    mFrame.addEventListener('click', (e) => {
      if (!calibrating) return;
      if (mapView.hasMoved) return;   // ignorar se foi drag
      const rect = mFrame.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top)  / rect.height) * 100;
      calibrateMapAt(px, py);
    });
  }

  // Pan / Zoom interativo
  if (mCanvas) {
    mCanvas.addEventListener('wheel',     onMapWheel,    { passive: false });
    mCanvas.addEventListener('mousedown', onMapMouseDown);
  }
  // Drag continua mesmo se o cursor sair do canvas
  window.addEventListener('mousemove', onMapMouseMove);
  window.addEventListener('mouseup',   onMapMouseUp);

  // ====== Página de Definições — listeners ======
  bindSettingsPage();

  // ====== Bulletin Board ======
  const newBulletin = $('#btn-new-bulletin');
  if (newBulletin) newBulletin.addEventListener('click', () => openBulletinModal(null));
  const bbSubmit = $('#bulletin-submit');
  if (bbSubmit) bbSubmit.addEventListener('click', submitBulletinModal);
  const bbDel = $('#bulletin-delete');
  if (bbDel) bbDel.addEventListener('click', deleteBulletinFromModal);
  const bbSearch = $('#bb-search');
  if (bbSearch) bbSearch.addEventListener('input', () => {
    State.bulletinSearch = bbSearch.value;
    renderBulletinList();
  });

  // ====== Logs ======
  const lgRefresh = $('#btn-refresh-logs');
  if (lgRefresh) lgRefresh.addEventListener('click', () => loadLogs());
  const lgQ = $('#lg-q');
  if (lgQ) lgQ.addEventListener('input', debounce(() => loadLogs(), 350));
  ['#lg-action', '#lg-target'].forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener('change', () => loadLogs());
  });

  // Mini chat
  const dchSend = $('#dash-chat-send');
  if (dchSend) dchSend.addEventListener('click', sendMiniChat);
  const dchInput = $('#dash-chat-input');
  if (dchInput) dchInput.addEventListener('keyup', e => { if (e.key === 'Enter') sendMiniChat(); });
  const dchEmoji = $('#dash-chat-emoji');
  if (dchEmoji) dchEmoji.addEventListener('click', toggleEmojiPicker);

  // Fechar picker quando clica fora
  document.addEventListener('click', (e) => {
    const picker = $('#emoji-picker');
    if (!picker || picker.classList.contains('hidden')) return;
    if (e.target.closest('#emoji-picker') || e.target.closest('#dash-chat-emoji')) return;
    picker.classList.add('hidden');
  });
}

// ----------------- Receiver --------------
window.addEventListener('message', (event) => {
  const data = event.data || {};
  switch (data.action) {
    case 'open':
      openMdt(data.meta, data.config, data.locale, data.locales, data.localeCode);
      break;

    case 'close':
      State.open = false;
      $('#root').classList.add('hidden');
      closeAllModals();
      break;

    case 'liveMapUpdate':
      State.officers = data.officers || [];
      // Atualiza mapa identifier → serverId
      State.idToSrv = {};
      State.officers.forEach(o => { if (o.identifier) State.idToSrv[o.identifier] = o.id; });
      const onDutyCount = State.officers.filter(o => o.onDuty).length;
      const dofc = $('#dash-officers'); if (dofc) animateNumber(dofc, onDutyCount, 300);

      // Reconstrói allAgents do livemap (tem callsign + onDuty + headshot)
      State.allAgents = State.officers.map(o => ({
        id:         o.id,
        firstname:  o.firstname,
        lastname:   o.lastname,
        grade:      o.grade,
        gradeLabel: o.gradeLabel,
        onDuty:     !!o.onDuty,
        callsign:   o.callsign || String(o.id).padStart(3, '0'),
        headshot:   o.headshot
      }));

      if (State.currentApp === 'livemap')   renderLiveMap();
      if (State.currentApp === 'dashboard') {
        renderOnlineOfficers();
        renderAgentStatusList();
      }
      if (State.currentApp === 'units')     renderUnitRoster();
      break;

    case 'boloCreated':
      toast(`Novo BOLO: ${data.bolo && data.bolo.title || '?'}`, 'warning');
      if (State.currentApp === 'bolos') loadBolos();
      if (State.currentApp === 'dashboard') loadDashboard();
      break;

    case 'boloDeleted':
      if (State.currentApp === 'bolos') loadBolos();
      if (State.currentApp === 'dashboard') loadDashboard();
      break;

    case 'newMessage':
      if (data.message) {
        const ch = data.message.channel;
        State.messages[ch] = State.messages[ch] || [];
        State.messages[ch].push(data.message);
        if (State.currentApp === 'messages' && ch === State.currentChannel) renderMessages();
        if (State.currentApp === 'dashboard' && ch === 'general')          renderMiniChat();
      }
      break;

    case 'recordChanged':
      if (State.currentApp === 'citizens' && data.identifier === State.selectedCitizen) {
        loadCitizen(data.identifier);
      }
      if (State.currentApp === 'dashboard') loadDashboard();
      break;

    case 'fineChanged':
      if (State.currentApp === 'citizens' && data.identifier === State.selectedCitizen) {
        loadCitizen(data.identifier);
      }
      break;

    case 'vehicleUpdated':
      if (State.currentApp === 'vehicles') searchVehicle();
      break;

    case 'reportCreated':
    case 'reportDeleted':
      if (State.currentApp === 'reports') loadReports();
      if (State.currentApp === 'dashboard') loadDashboard();
      break;

    case 'incidentCreated':
    case 'incidentDeleted':
    case 'incidentChanged':
      if (State.currentApp === 'incidents') loadIncidents();
      if (State.currentApp === 'dashboard') loadDashboard();
      // Se está aberto em edição este mesmo caso, refresca a galeria
      if (editingIncidentId && Number(data.id) === editingIncidentId) {
        refreshEditingIncidentPhotos();
      }
      break;

    case 'propertyChanged':
      if (State.currentApp === 'properties') loadProperties();
      if (State.currentApp === 'dashboard') loadDashboard();
      // Se a propriedade aberta para edição é a mesma que mudou, refresca galeria
      if (editingPropertyId && Number(data.id) === editingPropertyId) {
        refreshEditingPropertyPhotos();
      }
      // Se a propriedade aberta no doc é a mesma, refresca o documento
      if (State.propertyMode === 'doc' && State.propertyDocId
          && Number(data.id) === State.propertyDocId) {
        nuiPost('getProperty', { id: State.propertyDocId }).then(p => {
          if (p && p.id) renderPropertyDocument(p);
        });
      }
      // Se está na galeria global, recarrega
      if (State.propertyMode === 'gallery') {
        loadPropertyGlobalGallery();
      }
      break;

    case 'offenceChanged':
      if (State.currentApp === 'offences') loadOffences();
      // Invalida cache + reaponta o select do modal-record para a versão fresca
      State.offencesCache = null;
      populateRecordCrimes();
      break;

    case 'warrantChanged':
      if (State.currentApp === 'warrants')  loadWarrants();
      if (State.currentApp === 'dashboard') loadDashboard();
      break;

    case 'unitChanged':
      if (State.currentApp === 'units') loadUnits();
      break;

    case 'bulletinChanged':
      if (State.currentApp === 'bulletins') loadBulletins();
      break;

    case 'boloChanged':
      if (State.currentApp === 'bolos') loadBolos();
      break;

    // === Câmara overlay ===
    case 'cameraLiveStart':
      // Tablet desaparece, overlay aparece em modo viewfinder
      $('#root').classList.add('cam-hidden');
      camoShow();
      camoSetState('live');
      break;

    case 'cameraLiveResume':
      // Voltar de preview para viewfinder live
      camoSetState('live');
      break;

    case 'cameraZoom':
      const fill = $('#camo-zoom-fill');
      if (fill) fill.style.width = (data.pct || 0) + '%';
      const zx = $('#camo-zoom-x');
      if (zx) zx.textContent = (data.zoomX != null ? data.zoomX : '1.0') + '×';
      const fov = $('#camo-zoom-fov');
      if (fov) fov.textContent = 'FOV ' + (data.fov != null ? data.fov : '60');
      break;

    case 'cameraShutterStart':
      // Esconde os elementos da viewfinder antes do flash do screenshot
      $('#cam-live').classList.add('camo-shooting');
      break;

    case 'cameraShutterEnd':
      $('#cam-live').classList.remove('camo-shooting');
      break;

    case 'cameraPreview':
      $('#cam-live').classList.remove('camo-shooting');
      camoSetState('preview');
      const pImg = $('#camo-preview-img');
      if (pImg) pImg.src = data.dataUri;
      const pStamp = $('#camo-preview-stamp');
      if (pStamp) {
        const agencyShort = (State.config && State.config.agency && State.config.agency.shortName) || 'LSPD';
        const stampLabel  = (typeof t === 'function') ? t('cam.stamp_label') : 'EVIDENCE';
        pStamp.textContent = stampLabel + ' · ' + agencyShort + ' ' +
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      // Guarda estado para Aceitar
      window.__camoLastDataUri = data.dataUri;
      window.__camoLastMime    = data.mime || 'image/jpeg';
      break;

    case 'cameraLiveEnd': {
      camoCloseFully();
      $('#root').classList.remove('cam-hidden');
      const accepted = !!data.accepted;
      const _data    = window.__camoLastDataUri;
      const _mime    = window.__camoLastMime;
      window.__camoLastDataUri = null;
      window.__camoLastMime    = null;
      if (accepted && _data) camoAcceptPhoto(_data, _mime);
      break;
    }

    case 'cameraError': {
      const errMap = {
        no_resource:    t('cam.error.no_resource'),
        disabled:       t('cam.error.disabled'),
        capture_failed: t('cam.error.capture_failed'),
        exception:      t('cam.error.failed')
      };
      camoShowError(errMap[data.error] || t('cam.error.unknown_fail'));
      $('#cam-live').classList.remove('camo-shooting');
      break;
    }

    case 'dispatchAlert':
      // Notificação overlay in-game (sempre visível)
      if (data.dispatch) showDispatchAlert(data.dispatch);
      break;

    case 'dispatchAdded':
      if (data.dispatch) {
        State.dispatches = State.dispatches || [];
        // já existe?
        if (!State.dispatches.find(d => d.id === data.dispatch.id)) {
          State.dispatches.unshift(data.dispatch);
        }
        if (State.currentApp === 'dispatch') {
          renderDispatchMarkers();
          renderDispatchList();
        } else {
          // Atualiza badge na sidebar
          renderDispatchList();
        }
        // Atualiza notificações na lock screen se ainda não há sessão
        if (!State.loggedIn) refreshLockNotifs();
      }
      break;

    case 'dispatchRemoved':
      if (data.id) {
        State.dispatches = (State.dispatches || []).filter(d => d.id !== data.id);
        if (State.currentApp === 'dispatch') {
          renderDispatchMarkers();
          renderDispatchList();
        } else {
          renderDispatchList();
        }
        if (!State.loggedIn) refreshLockNotifs();
      }
      break;

    case 'toast':
      toast(data.message, data.type || 'info');
      break;

    case 'localHeadshot':
      // Headshot local actualizado — refresca avatares pessoais
      if (data.isOwn && data.txd && State.meta) {
        State.meta.headshot = data.txd;
        const fn = State.meta.firstname || '?';
        const ln = State.meta.lastname  || '';
        const fullName = `${fn} ${ln}`.trim();
        const seedSelf = 'police-' + (State.meta.serverId || State.meta.identifier || 'me');
        setHtml('#user-avatar', avatarHtml(seedSelf, fullName, 48, data.txd));
        setHtml('#lock-avatar', avatarHtml(seedSelf, fullName, 80, data.txd));
      }
      break;
  }
});

// ----------------- Boot ------------------
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  // Inicializa custom dropdowns para todos os <select class="mdt-select">
  MdtDD.init();
  // Aplica preferências guardadas (cor accent, modo compacto, animações...)
  applyAllPrefs();
});
