// ==========================================
//  OXLYN-BOSSMENU | Ícones SVG das aplicações
// ==========================================
// Ícones detalhados, vetoriais, com gradientes inline.
// Cada função devolve um <div class="app-icon-wrap"> com a SVG.
window.OS = window.OS || {};

window.OS.Icons = (function () {
    function wrap(svg) {
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.innerHTML = svg;
        return d;
    }

    function calculator() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="calc-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3e"/>
      <stop offset="1" stop-color="#1c1c1e"/>
    </linearGradient>
    <linearGradient id="calc-disp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0c"/>
      <stop offset="1" stop-color="#1a1a1e"/>
    </linearGradient>
    <linearGradient id="calc-op" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb340"/>
      <stop offset="1" stop-color="#ff8a00"/>
    </linearGradient>
    <linearGradient id="calc-num" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b5b62"/>
      <stop offset="1" stop-color="#3e3e44"/>
    </linearGradient>
    <linearGradient id="calc-fn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9a9aa0"/>
      <stop offset="1" stop-color="#6c6c72"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#calc-bg)"/>
  <rect x="20" y="22" width="160" height="40" rx="9" fill="url(#calc-disp)"/>
  <text x="170" y="52" text-anchor="end" font-family="Inter,Arial" font-size="26" font-weight="300" fill="#fff">874</text>
  <!-- linha 1: AC ± % ÷ -->
  <g>
    <circle cx="40" cy="84" r="14" fill="url(#calc-fn)"/>
    <circle cx="74" cy="84" r="14" fill="url(#calc-fn)"/>
    <circle cx="108" cy="84" r="14" fill="url(#calc-fn)"/>
    <circle cx="160" cy="84" r="14" fill="url(#calc-op)"/>
    <text x="40" y="89" text-anchor="middle" font-family="Inter,Arial" font-size="12" font-weight="600" fill="#1d1d1f">AC</text>
    <text x="160" y="89" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#fff">÷</text>
  </g>
  <!-- linha 2 -->
  <g>
    <circle cx="40" cy="116" r="14" fill="url(#calc-num)"/>
    <circle cx="74" cy="116" r="14" fill="url(#calc-num)"/>
    <circle cx="108" cy="116" r="14" fill="url(#calc-num)"/>
    <circle cx="160" cy="116" r="14" fill="url(#calc-op)"/>
    <text x="160" y="121" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#fff">×</text>
  </g>
  <!-- linha 3 -->
  <g>
    <circle cx="40" cy="148" r="14" fill="url(#calc-num)"/>
    <circle cx="74" cy="148" r="14" fill="url(#calc-num)"/>
    <circle cx="108" cy="148" r="14" fill="url(#calc-num)"/>
    <circle cx="160" cy="148" r="14" fill="url(#calc-op)"/>
    <text x="160" y="153" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#fff">−</text>
  </g>
  <!-- linha 4 (zero alargado + . + =) -->
  <g>
    <rect x="22" y="166" width="62" height="28" rx="14" fill="url(#calc-num)"/>
    <circle cx="108" cy="180" r="14" fill="url(#calc-num)"/>
    <circle cx="160" cy="180" r="14" fill="url(#calc-op)"/>
    <text x="160" y="185" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#fff">=</text>
  </g>
</svg>`);
    }

    function browser() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="br-bg" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#7cd6ff"/>
      <stop offset=".55" stop-color="#1f7adf"/>
      <stop offset="1" stop-color="#0d3a8c"/>
    </radialGradient>
    <linearGradient id="br-needle" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff5d5d"/>
      <stop offset=".5" stop-color="#ff5d5d"/>
      <stop offset=".5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#br-bg)"/>
  <!-- contorno circular -->
  <circle cx="100" cy="100" r="74" fill="#fff"/>
  <circle cx="100" cy="100" r="74" fill="none" stroke="rgba(0,0,0,.06)" stroke-width="2"/>
  <!-- marcas N E S O -->
  <g fill="#1d1d1f" font-family="Inter,Arial" font-size="9" font-weight="600">
    <text x="100" y="42" text-anchor="middle">N</text>
    <text x="100" y="166" text-anchor="middle">S</text>
    <text x="36"  y="103" text-anchor="middle">O</text>
    <text x="164" y="103" text-anchor="middle">E</text>
  </g>
  <!-- ticks -->
  <g stroke="#1d1d1f" stroke-opacity=".15" stroke-width="1">
    <line x1="100" y1="50" x2="100" y2="58"/>
    <line x1="100" y1="142" x2="100" y2="150"/>
    <line x1="50" y1="100" x2="58" y2="100"/>
    <line x1="142" y1="100" x2="150" y2="100"/>
  </g>
  <!-- agulha -->
  <g transform="rotate(-32 100 100)">
    <polygon points="100,52 110,100 100,108 90,100" fill="#ff5d5d"/>
    <polygon points="100,148 110,100 100,92 90,100" fill="#ffffff" stroke="#1d1d1f" stroke-opacity=".08" stroke-width=".5"/>
  </g>
  <circle cx="100" cy="100" r="5" fill="#1d1d1f"/>
</svg>`);
    }

    function appstore() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="as-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5fbcff"/>
      <stop offset=".55" stop-color="#1f6cd0"/>
      <stop offset="1" stop-color="#6a3ed8"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#as-bg)"/>
  <!-- A com 3 traços horizontais (estilo modern A) -->
  <g fill="#fff">
    <path d="M77 138 L100 60 L123 138 L113 138 L107 119 L93 119 L87 138 Z"/>
    <rect x="91"  y="119" width="18" height="6" rx="2"/>
    <rect x="84"  y="138" width="32" height="6" rx="3"/>
  </g>
</svg>`);
    }

    function calendar() {
        const day = new Date().getDate();
        const monthLabel = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][new Date().getMonth()];
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cal-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff5b50"/>
      <stop offset="1" stop-color="#d62b1d"/>
    </linearGradient>
    <linearGradient id="cal-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f0f0f0"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#cal-body)"/>
  <rect width="200" height="48" rx="44" fill="url(#cal-top)"/>
  <rect y="32" width="200" height="16" fill="url(#cal-top)"/>
  <text x="100" y="34" text-anchor="middle" font-family="Inter,Arial" font-size="14" font-weight="700" fill="#fff" letter-spacing="2">${monthLabel}</text>
  <text x="100" y="150" text-anchor="middle" font-family="Inter,Arial" font-size="98" font-weight="200" fill="#1d1d1f">${day}</text>
</svg>`);
    }

    // O ícone do relógio é dinâmico — atualiza ponteiros conforme a hora.
    function clock(opts) {
        const d = new Date();
        const h = d.getHours() % 12 + d.getMinutes()/60;
        const m = d.getMinutes();
        const s = d.getSeconds();
        const hourAngle = (h / 12) * 360;
        const minAngle  = (m / 60) * 360;
        const secAngle  = (s / 60) * 360;

        const w = wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="clk-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2a2e"/>
      <stop offset="1" stop-color="#0e0e10"/>
    </linearGradient>
    <radialGradient id="clk-face" cx="50%" cy="35%" r="65%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e6e6e9"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#clk-bg)"/>
  <circle cx="100" cy="100" r="78" fill="url(#clk-face)" stroke="rgba(0,0,0,.05)" stroke-width="2"/>
  <!-- ticks -->
  <g stroke="#1d1d1f" stroke-width="2" stroke-linecap="round">
    ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
        const rad = (a-90) * Math.PI/180;
        const x1 = 100 + Math.cos(rad) * 70;
        const y1 = 100 + Math.sin(rad) * 70;
        const x2 = 100 + Math.cos(rad) * 76;
        const y2 = 100 + Math.sin(rad) * 76;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join('')}
  </g>
  <!-- ponteiros -->
  <g transform="rotate(${hourAngle} 100 100)">
    <line x1="100" y1="100" x2="100" y2="55" stroke="#1d1d1f" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g transform="rotate(${minAngle} 100 100)">
    <line x1="100" y1="100" x2="100" y2="35" stroke="#1d1d1f" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g transform="rotate(${secAngle} 100 100)" class="clock-second-hand">
    <line x1="100" y1="108" x2="100" y2="32" stroke="#ff8a26" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="100" cy="100" r="4" fill="#ff8a26"/>
  </g>
  <circle cx="100" cy="100" r="3" fill="#1d1d1f"/>
</svg>`);
        return w;
    }

    function settings() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="set-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7d8392"/>
      <stop offset="1" stop-color="#3a3f4b"/>
    </linearGradient>
    <linearGradient id="set-gear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0f0f0"/>
      <stop offset="1" stop-color="#bcbcc2"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#set-bg)"/>
  <g transform="translate(100 100)">
    <g fill="url(#set-gear)" stroke="rgba(0,0,0,.18)" stroke-width="1">
      ${Array.from({length: 12}, (_, i) => {
          const a = (i * 30) - 90;
          return `<g transform="rotate(${a})"><rect x="-7" y="-66" width="14" height="20" rx="3"/></g>`;
      }).join('')}
    </g>
    <circle r="44" fill="url(#set-gear)" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
    <circle r="18" fill="#3a3f4b"/>
  </g>
</svg>`);
    }

    function company() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cm-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4ade80"/>
      <stop offset="1" stop-color="#198a3d"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#cm-bg)"/>
  <!-- prédio -->
  <g fill="#ffffff">
    <path d="M50 158 V90 L100 60 L150 90 V158 Z" opacity=".96"/>
  </g>
  <!-- janelas -->
  <g fill="#198a3d">
    ${[0,1,2].map(row =>
        [0,1,2].map(col =>
            `<rect x="${68 + col*22}" y="${100 + row*16}" width="14" height="10" rx="2"/>`
        ).join('')
    ).join('')}
  </g>
  <!-- porta -->
  <rect x="92" y="138" width="16" height="20" rx="2" fill="#198a3d"/>
  <!-- chaminé / sinalização barras -->
  <g transform="translate(118 44)">
    <rect x="0"  y="14" width="6" height="14" rx="1.5" fill="#fff"/>
    <rect x="9"  y="6"  width="6" height="22" rx="1.5" fill="#fff"/>
    <rect x="18" y="0"  width="6" height="28" rx="1.5" fill="#fff"/>
  </g>
</svg>`);
    }

    function notes() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nt-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe57f"/>
      <stop offset=".5" stop-color="#ffcc4d"/>
      <stop offset="1" stop-color="#ff9f0a"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#nt-bg)"/>
  <!-- Folha branca dobrada -->
  <path d="M44 30 L138 30 L156 56 L156 170 L44 170 Z" fill="#ffffff" opacity=".96"/>
  <!-- Dobra do canto -->
  <path d="M138 30 L138 56 L156 56 Z" fill="#e6c84a"/>
  <!-- Linhas de texto -->
  <g stroke="#d4a020" stroke-width="3" stroke-linecap="round">
    <line x1="58" y1="78" x2="142" y2="78"/>
    <line x1="58" y1="98" x2="142" y2="98"/>
    <line x1="58" y1="118" x2="142" y2="118"/>
    <line x1="58" y1="138" x2="110" y2="138"/>
  </g>
</svg>`);
    }

    function reminders() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rm-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e0e0e8"/>
    </linearGradient>
    <linearGradient id="rm-circle" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff5b50"/>
      <stop offset="1" stop-color="#d62b1d"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#rm-bg)"/>
  <!-- Círculo grande com check -->
  <circle cx="100" cy="100" r="62" fill="url(#rm-circle)"/>
  <path d="M72 102 L92 122 L132 80" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);
    }

    function trash() {
        return wrap(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tr-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6c6c74"/>
      <stop offset="1" stop-color="#3a3a40"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#tr-bg)"/>
  <g fill="#e9e9ec">
    <rect x="76" y="48" width="48" height="10" rx="2"/>
    <rect x="56" y="62" width="88" height="14" rx="3"/>
    <path d="M62 80 H138 L130 156 C129.6 162 124.6 166 119 166 H81 C75.4 166 70.4 162 70 156 Z"/>
  </g>
  <g stroke="#3a3a40" stroke-width="3" stroke-linecap="round" fill="none">
    <line x1="86"  y1="94" x2="86"  y2="150"/>
    <line x1="100" y1="94" x2="100" y2="150"/>
    <line x1="114" y1="94" x2="114" y2="150"/>
  </g>
</svg>`);
    }

    return {
        calculator,
        browser,
        appstore,
        calendar,
        clock,
        settings,
        company,
        notes,
        reminders,
        trash,
    };
})();

// ==========================================
//  Helper global para construir ícones com fallback
//  (cada app chama OS.icon('appstore') em vez de OS.Icons.appstore())
//  Se OS.Icons não tiver carregado por algum motivo, devolve um
//  ícone de fallback simples para garantir que a UI nunca rebenta.
// ==========================================
window.OS.icon = function (name, opts) {
    const I = window.OS && window.OS.Icons;
    if (I && typeof I[name] === 'function') {
        try { return I[name](opts); }
        catch (e) { console.error('[oxlyn-bossmenu] erro a desenhar ícone', name, e); }
    }

    // Fallback: gradiente colorido por app + inicial
    const palette = {
        appstore:    { bg: 'linear-gradient(135deg,#5fbcff,#6a3ed8)', label: 'A' },
        calculator:  { bg: 'linear-gradient(180deg,#3a3a3e,#1c1c1e)', label: '=' },
        browser:     { bg: 'linear-gradient(135deg,#7cd6ff,#0d3a8c)', label: '◎' },
        calendar:    { bg: 'linear-gradient(180deg,#ff5b50,#d62b1d)', label: String(new Date().getDate()) },
        clock:       { bg: 'linear-gradient(180deg,#2a2a2e,#0e0e10)', label: '⏱' },
        settings:    { bg: 'linear-gradient(180deg,#7d8392,#3a3f4b)', label: '⚙' },
        company:     { bg: 'linear-gradient(135deg,#4ade80,#198a3d)', label: '🏢' },
        notes:       { bg: 'linear-gradient(180deg,#ffe57f,#ff9f0a)', label: '📝' },
        reminders:   { bg: 'linear-gradient(180deg,#fff,#e0e0e8)',    label: '✓' },
        trash:       { bg: 'linear-gradient(180deg,#6c6c74,#3a3a40)', label: '🗑' },
    };
    const p = palette[name] || { bg: 'linear-gradient(135deg,#666,#333)', label: '?' };
    const d = document.createElement('div');
    d.className = 'app-icon-wrap';
    d.style.cssText = `width:100%;height:100%;border-radius:13px;background:${p.bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.4);`;
    d.textContent = p.label;
    return d;
};
