// ==========================================
//  OXLYN-BOSSMENU | App: Notas
//  Editor com persistência, pin e pesquisa.
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.notes = (function () {
    const STORAGE_KEY = 'oxlyn_bm_notes';

    // Helper de tradução: usa window.OS.t se disponível, senão devolve fallback (_d).
    function T(key, vars) {
        if (window.OS && typeof window.OS.t === 'function') return window.OS.t(key, vars);
        return (vars && vars._d) || key;
    }

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function' && window.OS.Icons && window.OS.Icons.notes)
            return window.OS.Icons.notes();
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(180deg,#ffd454,#f9a826);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;';
        d.innerHTML = `<svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        return d;
    }

    function loadNotes() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch (_) { return []; }
    }
    function saveNotes(notes) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch (_) {}
    }

    function fmtRelative(iso) {
        try {
            const t = new Date(iso).getTime();
            const diff = (Date.now() - t) / 1000;
            if (diff < 60)        return T('notes_time_now', { _d: 'agora' });
            if (diff < 3600)      return T('notes_time_min_ago', { _d: 'há {n} min', n: Math.floor(diff/60) });
            if (diff < 86400)     return T('notes_time_hour_ago', { _d: 'há {n}h', n: Math.floor(diff/3600) });
            if (diff < 86400*7)   return T('notes_time_day_ago', { _d: 'há {n}d', n: Math.floor(diff/86400) });
            const d = new Date(iso);
            return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
        } catch (_) { return ''; }
    }

    function fmtFullDate(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleString('pt-PT', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (_) { return iso; }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildContent(win, cfg, locale) {
        const root = document.createElement('div');
        root.className = 'notes-app';

        let notes = loadNotes();
        let selectedId = notes.length ? notes[0].id : null;
        let searchQuery = '';
        let saveTimeout = null;

        // ===== Sidebar =====
        const side = document.createElement('div');
        side.className = 'notes-sidebar';

        const sideHead = document.createElement('div');
        sideHead.className = 'notes-side-head';
        sideHead.innerHTML = `
            <div class="notes-side-title">${escapeHtml(T('notes_title_main', { _d: 'Notas' }))}</div>
            <button class="notes-new-btn" title="${escapeHtml(T('notes_btn_new', { _d: 'Nova nota' }))}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>`;
        side.appendChild(sideHead);

        const search = document.createElement('div');
        search.className = 'notes-search-wrap';
        search.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
        const searchInp = document.createElement('input');
        searchInp.type = 'text';
        searchInp.placeholder = T('notes_placeholder_search', { _d: 'Procurar' });
        searchInp.spellcheck = false;
        search.appendChild(searchInp);
        side.appendChild(search);

        const list = document.createElement('div');
        list.className = 'notes-list';
        side.appendChild(list);

        // ===== Editor =====
        const editor = document.createElement('div');
        editor.className = 'notes-editor';

        function newNote() {
            const note = {
                id: 'n_' + Math.random().toString(36).substr(2, 9),
                title: '',
                body: '',
                pinned: false,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            };
            notes.unshift(note);
            saveNotes(notes);
            selectedId = note.id;
            renderList();
            renderEditor();
            // foca no input
            setTimeout(() => {
                const inp = editor.querySelector('.notes-title-input');
                if (inp) inp.focus();
            }, 50);
        }

        function deleteNote(id) {
            const n = notes.find(x => x.id === id);
            if (!n) return;
            const noteTitle = n.title || T('notes_label_untitled', { _d: 'Sem título' });
            window.OS.api.showModal({
                title: T('notes_modal_delete_title', { _d: 'Eliminar nota?' }),
                subtitle: T('notes_modal_delete_subtitle', { _d: '"{name}" será apagada permanentemente.', name: noteTitle }),
                actions: [
                    { label: T('notes_btn_cancel', { _d: 'Cancelar' }) },
                    { label: T('notes_btn_delete', { _d: 'Eliminar' }), style: 'danger', onClick: () => {
                        notes = notes.filter(x => x.id !== id);
                        saveNotes(notes);
                        if (selectedId === id) {
                            selectedId = notes.length ? notes[0].id : null;
                        }
                        renderList();
                        renderEditor();
                        if (window.OS.api.notify) {
                            window.OS.api.notify({
                                type: 'info',
                                app: T('notes_title_main', { _d: 'Notas' }),
                                title: T('notes_notify_deleted', { _d: 'Nota eliminada' }),
                            });
                        }
                    }},
                ],
            });
        }

        function togglePin(id) {
            const n = notes.find(x => x.id === id);
            if (!n) return;
            n.pinned = !n.pinned;
            n.updated = new Date().toISOString();
            // Re-ordena: pinned primeiro, depois por updated
            sortNotes();
            saveNotes(notes);
            renderList();
            renderEditor();
        }

        function sortNotes() {
            notes.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return new Date(b.updated) - new Date(a.updated);
            });
        }

        function renderList() {
            list.innerHTML = '';
            sortNotes();
            const q = searchQuery.toLowerCase();
            const filtered = q ?
                notes.filter(n => (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q))
                : notes;

            if (!filtered.length) {
                const empty = document.createElement('div');
                empty.className = 'notes-list-empty';
                empty.innerHTML = q
                    ? `<div>${escapeHtml(T('notes_empty_search', { _d: 'Sem resultados' }))}</div>`
                    : `<div>${escapeHtml(T('notes_empty_main', { _d: 'Sem notas' }))}</div><div style="font-size:11px;color:var(--text-3);margin-top:4px">${escapeHtml(T('notes_empty_hint', { _d: 'Cria a tua primeira nota com o botão +' }))}</div>`;
                list.appendChild(empty);
                return;
            }

            // Separar pinned vs normais
            const pinned = filtered.filter(n => n.pinned);
            const normal = filtered.filter(n => !n.pinned);

            if (pinned.length) {
                const pinHead = document.createElement('div');
                pinHead.className = 'notes-section-head';
                pinHead.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1V4H8v2h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg> ${escapeHtml(T('notes_section_pinned', { _d: 'FIXADAS' }))}`;
                list.appendChild(pinHead);
                pinned.forEach(n => list.appendChild(buildItem(n)));
            }
            if (normal.length) {
                if (pinned.length) {
                    const sep = document.createElement('div');
                    sep.className = 'notes-section-head';
                    sep.textContent = T('notes_section_notes', { _d: 'NOTAS' });
                    list.appendChild(sep);
                }
                normal.forEach(n => list.appendChild(buildItem(n)));
            }
        }

        function buildItem(n) {
            const it = document.createElement('div');
            it.className = 'notes-item' + (n.id === selectedId ? ' active' : '');
            const preview = (n.body || '').replace(/\n/g, ' ').substring(0, 60);
            const titleTxt = n.title || T('notes_label_untitled', { _d: 'Sem título' });
            const emptyPreview = `<i style="opacity:.55">${escapeHtml(T('notes_label_empty_body', { _d: 'Sem conteúdo' }))}</i>`;
            it.innerHTML = `
                <div class="notes-item-title">${escapeHtml(titleTxt)}</div>
                <div class="notes-item-meta">
                    <span class="notes-item-time">${fmtRelative(n.updated)}</span>
                    <span class="notes-item-preview">${escapeHtml(preview) || emptyPreview}</span>
                </div>`;
            it.addEventListener('click', () => {
                selectedId = n.id;
                renderList();
                renderEditor();
            });
            it.addEventListener('contextmenu', e => {
                e.preventDefault();
                window.OS.api.showFloatingMenu(it, [
                    {
                        label: n.pinned
                            ? T('notes_ctx_unpin', { _d: 'Desafixar' })
                            : T('notes_ctx_pin_top', { _d: 'Fixar no topo' }),
                        onClick: () => togglePin(n.id),
                    },
                    '---',
                    {
                        label: T('notes_btn_delete', { _d: 'Eliminar' }),
                        danger: true,
                        onClick: () => deleteNote(n.id),
                    },
                ]);
            });
            return it;
        }

        function renderEditor() {
            editor.innerHTML = '';
            if (!selectedId) {
                editor.innerHTML = `
                    <div class="notes-editor-empty">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <div class="notes-editor-empty-title">${escapeHtml(T('notes_editor_empty_title', { _d: 'Sem nota selecionada' }))}</div>
                        <div class="notes-editor-empty-msg">${escapeHtml(T('notes_editor_empty_msg', { _d: 'Cria uma nova nota ou seleciona uma da lista para começar a escrever.' }))}</div>
                    </div>`;
                return;
            }
            const note = notes.find(x => x.id === selectedId);
            if (!note) { selectedId = null; renderEditor(); return; }

            // Toolbar
            const tb = document.createElement('div');
            tb.className = 'notes-editor-toolbar';
            const pinTitle = note.pinned
                ? T('notes_ctx_unpin', { _d: 'Desafixar' })
                : T('notes_ctx_pin', { _d: 'Fixar' });
            const delTitle = T('notes_btn_delete', { _d: 'Eliminar' });
            tb.innerHTML = `
                <div class="notes-editor-date">${escapeHtml(fmtFullDate(note.updated))}</div>
                <div class="notes-editor-actions">
                    <button class="notes-tool-btn" data-action="pin" title="${escapeHtml(pinTitle)}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="${note.pinned ? '#ff9f0a' : 'none'}" stroke="${note.pinned ? '#ff9f0a' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1V4H8v2h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg>
                    </button>
                    <button class="notes-tool-btn" data-action="delete" title="${escapeHtml(delTitle)}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                </div>`;
            tb.querySelector('[data-action="pin"]').addEventListener('click', () => togglePin(note.id));
            tb.querySelector('[data-action="delete"]').addEventListener('click', () => deleteNote(note.id));
            editor.appendChild(tb);

            // Title input
            const title = document.createElement('input');
            title.type = 'text';
            title.className = 'notes-title-input';
            title.placeholder = T('notes_placeholder_title', { _d: 'Título' });
            title.value = note.title;
            title.spellcheck = false;
            editor.appendChild(title);

            // Body textarea
            const body = document.createElement('textarea');
            body.className = 'notes-body-input';
            body.placeholder = T('notes_placeholder_body', { _d: 'Começa a escrever...' });
            body.value = note.body;
            body.spellcheck = false;
            editor.appendChild(body);

            // Auto-save
            const autoSave = () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    note.title = title.value;
                    note.body = body.value;
                    note.updated = new Date().toISOString();
                    saveNotes(notes);
                    // re-render só a lista para atualizar previews
                    renderList();
                    // atualiza data no header
                    const dateEl = editor.querySelector('.notes-editor-date');
                    if (dateEl) dateEl.textContent = fmtFullDate(note.updated);
                }, 350);
            };
            title.addEventListener('input', autoSave);
            body.addEventListener('input', autoSave);
        }

        // Eventos
        sideHead.querySelector('.notes-new-btn').addEventListener('click', newNote);
        searchInp.addEventListener('input', () => {
            searchQuery = searchInp.value;
            renderList();
        });

        // Cleanup save timeout ao fechar
        win.onClose(() => clearTimeout(saveTimeout));

        root.appendChild(side);
        root.appendChild(editor);

        renderList();
        renderEditor();

        // Se não há notas, criar uma de boas-vindas
        if (!notes.length) {
            notes.unshift({
                id: 'n_welcome',
                title: T('notes_welcome_title', { _d: '👋 Bem-vindo às Notas' }),
                body: T('notes_welcome_body', { _d: 'Bem-vindo à app de Notas!\n\nUsa esta app para guardar pensamentos, lembretes ou qualquer informação importante.\n\nAtalhos:\n• Botão "+" no topo cria uma nova nota\n• Pesquisa no campo no topo\n• Botão direito numa nota abre menu (fixar / eliminar)\n• Notas guardam-se automaticamente enquanto escreves\n\nPodes apagar esta nota a qualquer altura.' }),
                pinned: true,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            });
            saveNotes(notes);
            selectedId = 'n_welcome';
            renderList();
            renderEditor();
        }

        return root;
    }

    return {
        id: 'notes',
        get defaultName() { return T('notes_title_main', { _d: 'Notas' }); },
        defaultSize: { w: 880, h: 600 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
