// ==========================================
//  OXLYN-BOSSMENU | App: Calculadora
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.calculator = (function () {
    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function') return window.OS.icon('calculator');
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(180deg,#3a3a3e,#1c1c1e);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;';
        d.textContent = '=';
        return d;
    }

    function t(key, vars) {
        if (window.OS && typeof window.OS.t === 'function') return window.OS.t(key, vars);
        return (vars && vars._d) ? vars._d : key;
    }

    function format(num, cfg) {
        if (!isFinite(num)) return cfg.errorLabel || t('calc_msg_error', { _d: 'Erro' });
        const sep = cfg.decimalSeparator || ',';
        const max = cfg.maxDecimals || 8;
        let str;
        const abs = Math.abs(num);
        if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
            str = num.toExponential(6);
        } else {
            str = parseFloat(num.toPrecision(12)).toString();
        }
        if (str.includes('.')) {
            const [intPart, decPart] = str.split('.');
            str = intPart + sep + decPart.slice(0, max);
        }
        return str;
    }

    function applyShrink(el) {
        el.classList.remove('shrink-1','shrink-2','shrink-3');
        const len = el.textContent.length;
        if (len > 16) el.classList.add('shrink-3');
        else if (len > 12) el.classList.add('shrink-2');
        else if (len > 9)  el.classList.add('shrink-1');
    }

    function buildContent(win, cfg, locale) {
        cfg = cfg || {};
        cfg.errorLabel = locale && locale.ui_calc_error ? locale.ui_calc_error : t('calc_msg_error', { _d: 'Erro' });

        const root = document.createElement('div');
        root.className = 'calc-app';

        const display = document.createElement('div');
        display.className = 'calc-display';

        const expr = document.createElement('div');
        expr.className = 'calc-expression';
        expr.textContent = '';
        display.appendChild(expr);

        const dispText = document.createElement('div');
        dispText.className = 'calc-display-text';
        dispText.textContent = '0';
        display.appendChild(dispText);
        root.appendChild(display);

        const grid = document.createElement('div');
        grid.className = 'calc-grid';
        root.appendChild(grid);

        function opSymbol(op) {
            return op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op;
        }
        function setExpression(prev, op) {
            if (prev == null) { expr.textContent = ''; return; }
            const sep = cfg.decimalSeparator || ',';
            const prevStr = format(prev, cfg);
            expr.textContent = `${prevStr} ${op ? opSymbol(op) : ''}`.trim();
        }

        // State
        const state = {
            display: '0',
            previous: null,
            operator: null,
            justEvaluated: false,
            replaceNext: true,
            cleared: true,
        };

        function setDisplay(value) {
            state.display = value;
            dispText.textContent = value;
            applyShrink(dispText);
        }

        function getDisplayNumber() {
            const sep = cfg.decimalSeparator || ',';
            return parseFloat(state.display.replace(sep, '.'));
        }

        function clearAll() {
            state.display = '0';
            state.previous = null;
            state.operator = null;
            state.justEvaluated = false;
            state.replaceNext = true;
            state.cleared = true;
            setDisplay('0');
            setExpression(null);
            updateOperatorHighlight();
            setACLabel();
        }

        function setACLabel() {
            const acBtn = grid.querySelector('[data-action="clear"]');
            if (!acBtn) return;
            acBtn.textContent = state.cleared ? t('calc_btn_ac', { _d: 'AC' }) : t('calc_btn_clear', { _d: 'C' });
        }

        function inputDigit(d) {
            if (state.replaceNext) {
                state.display = d;
                state.replaceNext = false;
            } else {
                if (state.display === '0') state.display = d;
                else state.display = state.display + d;
            }
            state.cleared = false;
            state.justEvaluated = false;
            setDisplay(state.display);
            setACLabel();
            updateOperatorHighlight();
        }

        function inputDecimal() {
            const sep = cfg.decimalSeparator || ',';
            if (state.replaceNext) {
                state.display = '0' + sep;
                state.replaceNext = false;
            } else if (!state.display.includes(sep)) {
                state.display += sep;
            }
            state.cleared = false;
            setDisplay(state.display);
            setACLabel();
        }

        function compute(a, b, op) {
            switch (op) {
                case '+': return a + b;
                case '-': return a - b;
                case '*': return a * b;
                case '/': return b === 0 ? Infinity : a / b;
            }
            return b;
        }

        function chooseOperator(op) {
            const current = getDisplayNumber();
            if (state.previous == null) {
                state.previous = current;
            } else if (!state.replaceNext && !state.justEvaluated) {
                const result = compute(state.previous, current, state.operator);
                state.previous = result;
                setDisplay(format(result, cfg));
            }
            state.operator = op;
            state.replaceNext = true;
            state.justEvaluated = false;
            setExpression(state.previous, op);
            updateOperatorHighlight();
        }

        function evaluate() {
            if (state.operator == null || state.previous == null) return;
            const current = getDisplayNumber();
            const op = state.operator;
            const prev = state.previous;
            const result = compute(prev, current, op);
            setExpression(prev, op);
            // mostra a expressão completa por momentos
            expr.textContent = `${format(prev, cfg)} ${opSymbol(op)} ${format(current, cfg)} =`;
            setDisplay(format(result, cfg));
            state.previous = null;
            state.operator = null;
            state.replaceNext = true;
            state.justEvaluated = true;
            state.cleared = false;
            updateOperatorHighlight();
        }

        function negate() {
            if (state.display === '0') return;
            state.display = state.display.startsWith('-')
                ? state.display.slice(1)
                : '-' + state.display;
            setDisplay(state.display);
        }

        function percent() {
            const v = getDisplayNumber() / 100;
            setDisplay(format(v, cfg));
            state.replaceNext = true;
        }

        function updateOperatorHighlight() {
            grid.querySelectorAll('.calc-btn.op').forEach(b => b.classList.remove('active'));
            if (state.operator && !state.justEvaluated) {
                const btn = grid.querySelector(`[data-op="${state.operator}"]`);
                if (btn) btn.classList.add('active');
            }
        }

        // Layout (rows of buttons)
        const buttons = [
            { label: t('calc_btn_ac', { _d: 'AC' }), cls: 'func', action: 'clear', aria: t('calc_btn_clear_aria', { _d: 'Limpar' }) },
            { label: '±',  cls: 'func', action: 'negate',  aria: t('calc_btn_negate_aria', { _d: 'Inverter sinal' }) },
            { label: '%',  cls: 'func', action: 'percent', aria: t('calc_btn_percent_aria', { _d: 'Percentagem' }) },
            { label: '÷',  cls: 'op',   op: '/', aria: t('calc_btn_divide_aria', { _d: 'Dividir' }) },

            { label: '7', cls: '', digit: '7' },
            { label: '8', cls: '', digit: '8' },
            { label: '9', cls: '', digit: '9' },
            { label: '×', cls: 'op', op: '*', aria: t('calc_btn_multiply_aria', { _d: 'Multiplicar' }) },

            { label: '4', cls: '', digit: '4' },
            { label: '5', cls: '', digit: '5' },
            { label: '6', cls: '', digit: '6' },
            { label: '−', cls: 'op', op: '-', aria: t('calc_btn_subtract_aria', { _d: 'Subtrair' }) },

            { label: '1', cls: '', digit: '1' },
            { label: '2', cls: '', digit: '2' },
            { label: '3', cls: '', digit: '3' },
            { label: '+', cls: 'op', op: '+', aria: t('calc_btn_add_aria', { _d: 'Adicionar' }) },

            { label: '0', cls: 'zero', digit: '0' },
            { label: cfg.decimalSeparator || ',', cls: '', action: 'decimal', aria: t('calc_btn_decimal_aria', { _d: 'Vírgula decimal' }) },
            { label: '=', cls: 'op', action: 'equals', aria: t('calc_btn_equals_aria', { _d: 'Igual' }) },
        ];

        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'calc-btn ' + (b.cls || '');
            btn.textContent = b.label;
            if (b.action) btn.dataset.action = b.action;
            if (b.digit)  btn.dataset.digit  = b.digit;
            if (b.op)     btn.dataset.op     = b.op;
            if (b.aria)   { btn.setAttribute('aria-label', b.aria); btn.title = b.aria; }
            grid.appendChild(btn);
        });

        grid.addEventListener('click', e => {
            const btn = e.target.closest('.calc-btn');
            if (!btn) return;
            if (btn.dataset.digit)       inputDigit(btn.dataset.digit);
            else if (btn.dataset.op)     chooseOperator(btn.dataset.op);
            else if (btn.dataset.action === 'clear')   clearAll();
            else if (btn.dataset.action === 'negate')  negate();
            else if (btn.dataset.action === 'percent') percent();
            else if (btn.dataset.action === 'decimal') inputDecimal();
            else if (btn.dataset.action === 'equals')  evaluate();
        });

        // Teclado físico
        const keyHandler = e => {
            if (!win.isFocused()) return;
            const k = e.key;
            if (k >= '0' && k <= '9') { inputDigit(k); e.preventDefault(); return; }
            if (k === '.' || k === ',') { inputDecimal(); e.preventDefault(); return; }
            if (k === '+' || k === '-' || k === '*' || k === '/') { chooseOperator(k); e.preventDefault(); return; }
            if (k === 'Enter' || k === '=') { evaluate(); e.preventDefault(); return; }
            // Backspace = limpar (ESC fica reservado para fechar a janela/PC)
            if (k === 'Backspace') { clearAll(); e.preventDefault(); return; }
            if (k === '%') { percent(); e.preventDefault(); }
        };
        document.addEventListener('keydown', keyHandler);
        win.onClose(() => document.removeEventListener('keydown', keyHandler));

        return root;
    }

    return {
        id: 'calculator',
        get defaultName() { return t('calc_title_main', { _d: 'Calculadora' }); },
        defaultSize: { w: 380, h: 580 },
        resizable: false,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
