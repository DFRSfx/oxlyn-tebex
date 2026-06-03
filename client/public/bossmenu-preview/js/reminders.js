// ==========================================
//  OXLYN-BOSSMENU | App: Lembretes
//  Listas + tarefas com checkboxes, datas, prioridades.
// ==========================================
window.OS = window.OS || {};
window.OS.apps = window.OS.apps || {};

window.OS.apps.reminders = (function () {
    const STORAGE_KEY = 'oxlyn_bm_reminders';

    // Helper de tradução: usa window.OS.t se disponível, senão devolve fallback (_d).
    function T(key, vars) {
        if (window.OS && typeof window.OS.t === 'function') return window.OS.t(key, vars);
        return (vars && vars._d) || key;
    }

    function buildIcon() {
        if (window.OS && typeof window.OS.icon === 'function' && window.OS.Icons && window.OS.Icons.reminders)
            return window.OS.Icons.reminders();
        const d = document.createElement('div');
        d.className = 'app-icon-wrap';
        d.style.cssText = 'background:linear-gradient(180deg,#fff,#e0e0e8);width:100%;height:100%;border-radius:13px;display:flex;align-items:center;justify-content:center;';
        d.innerHTML = `<svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="#ff453a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 9"/></svg>`;
        return d;
    }

    function loadData() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (d && d.lists) return d;
        } catch (_) {}
        return {
            lists: [
                { id: 'l_default',  name: T('rem_default_list_personal', { _d: 'Pessoal' }),  icon: '📋', color: '#0ea5e9' },
                { id: 'l_work',     name: T('rem_default_list_work',     { _d: 'Trabalho' }), icon: '💼', color: '#a855f7' },
                { id: 'l_shopping', name: T('rem_default_list_shopping', { _d: 'Compras' }),  icon: '🛒', color: '#f59e0b' },
            ],
            items: [],
        };
    }
    function saveData(d) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (_) {}
    }

    function fmtDate(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            const today = new Date();
            const tomorrow = new Date(today.getTime() + 86400000);
            if (d.toDateString() === today.toDateString())    return T('rem_filter_today',    { _d: 'Hoje' });
            if (d.toDateString() === tomorrow.toDateString()) return T('rem_filter_tomorrow', { _d: 'Amanhã' });
            return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
        } catch (_) { return ''; }
    }

    function isOverdue(iso) {
        if (!iso) return false;
        return new Date(iso) < new Date();
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildContent(win, cfg, locale) {
        const root = document.createElement('div');
        root.className = 'reminders-app';

        let data = loadData();
        let selectedListId = 'all';  // 'all' | 'today' | 'completed' | listId

        // ===== Sidebar =====
        const side = document.createElement('div');
        side.className = 'rem-sidebar';

        function renderSidebar() {
            side.innerHTML = '';

            // Smart lists
            const counts = {
                all:       data.items.filter(i => !i.completed).length,
                today:     data.items.filter(i => !i.completed && i.dueDate && new Date(i.dueDate).toDateString() === new Date().toDateString()).length,
                scheduled: data.items.filter(i => !i.completed && i.dueDate).length,
                flagged:   data.items.filter(i => !i.completed && i.priority === 'high').length,
                completed: data.items.filter(i => i.completed).length,
            };

            const smart = [
                { id: 'today',     name: T('rem_filter_today',     { _d: 'Hoje' }),         icon: '📅', color: '#0ea5e9', count: counts.today },
                { id: 'scheduled', name: T('rem_filter_scheduled', { _d: 'Agendado' }),     icon: '⏰', color: '#ff453a', count: counts.scheduled },
                { id: 'flagged',   name: T('rem_filter_flagged',   { _d: 'Prioritárias' }), icon: '🚩', color: '#f59e0b', count: counts.flagged },
                { id: 'all',       name: T('rem_filter_all',       { _d: 'Tudo' }),         icon: '🗒️', color: '#222',    count: counts.all },
            ];

            const smartGrid = document.createElement('div');
            smartGrid.className = 'rem-smart-grid';
            smart.forEach(s => {
                const c = document.createElement('div');
                c.className = 'rem-smart-card' + (selectedListId === s.id ? ' active' : '');
                c.style.setProperty('--smart-color', s.color);
                c.innerHTML = `
                    <div class="rem-smart-icon">${s.icon}</div>
                    <div class="rem-smart-count">${s.count}</div>
                    <div class="rem-smart-name">${escapeHtml(s.name)}</div>`;
                c.addEventListener('click', () => { selectedListId = s.id; renderSidebar(); renderMain(); });
                smartGrid.appendChild(c);
            });
            side.appendChild(smartGrid);

            // Custom lists
            const listsHead = document.createElement('div');
            listsHead.className = 'rem-lists-head';
            listsHead.innerHTML = `
                <span>${escapeHtml(T('rem_section_my_lists', { _d: 'AS MINHAS LISTAS' }))}</span>
                <button class="rem-add-list" title="${escapeHtml(T('rem_btn_new_list', { _d: 'Nova lista' }))}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>`;
            listsHead.querySelector('.rem-add-list').addEventListener('click', addList);
            side.appendChild(listsHead);

            const listsContainer = document.createElement('div');
            listsContainer.className = 'rem-lists';
            data.lists.forEach(l => {
                const count = data.items.filter(i => !i.completed && i.listId === l.id).length;
                const li = document.createElement('div');
                li.className = 'rem-list-item' + (selectedListId === l.id ? ' active' : '');
                li.innerHTML = `
                    <span class="rem-list-icon" style="background:${l.color}20;color:${l.color}">${l.icon}</span>
                    <span class="rem-list-name">${escapeHtml(l.name)}</span>
                    <span class="rem-list-count">${count}</span>`;
                li.addEventListener('click', () => { selectedListId = l.id; renderSidebar(); renderMain(); });
                li.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    window.OS.api.showFloatingMenu(li, [
                        { label: T('rem_ctx_rename', { _d: 'Renomear' }), onClick: () => renameList(l) },
                        '---',
                        { label: T('rem_ctx_delete_list', { _d: 'Eliminar Lista' }), danger: true, onClick: () => deleteList(l) },
                    ]);
                });
                listsContainer.appendChild(li);
            });
            side.appendChild(listsContainer);
        }

        // ===== Main =====
        const mainArea = document.createElement('div');
        mainArea.className = 'rem-main';

        function renderMain() {
            mainArea.innerHTML = '';

            // Determinar título e items filtrados
            let title = T('rem_filter_all', { _d: 'Tudo' }), items = [...data.items], color = '#0ea5e9', icon = '🗒️';
            const today = new Date();

            if (selectedListId === 'today') {
                title = T('rem_filter_today', { _d: 'Hoje' }); color = '#0ea5e9'; icon = '📅';
                items = data.items.filter(i => !i.completed && i.dueDate &&
                    new Date(i.dueDate).toDateString() === today.toDateString());
            } else if (selectedListId === 'scheduled') {
                title = T('rem_filter_scheduled', { _d: 'Agendado' }); color = '#ff453a'; icon = '⏰';
                items = data.items.filter(i => !i.completed && i.dueDate);
                items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            } else if (selectedListId === 'flagged') {
                title = T('rem_filter_flagged', { _d: 'Prioritárias' }); color = '#f59e0b'; icon = '🚩';
                items = data.items.filter(i => !i.completed && i.priority === 'high');
            } else if (selectedListId === 'completed') {
                title = T('rem_filter_completed', { _d: 'Concluídas' }); color = '#34c759'; icon = '✓';
                items = data.items.filter(i => i.completed);
            } else if (selectedListId === 'all') {
                title = T('rem_filter_all', { _d: 'Tudo' }); color = '#0a0a10'; icon = '🗒️';
                items = data.items.filter(i => !i.completed);
            } else {
                const list = data.lists.find(l => l.id === selectedListId);
                if (list) {
                    title = list.name; color = list.color; icon = list.icon;
                    items = data.items.filter(i => i.listId === list.id && !i.completed);
                }
            }

            // Header
            const head = document.createElement('div');
            head.className = 'rem-main-head';
            head.style.setProperty('--list-color', color);
            head.innerHTML = `
                <div class="rem-main-title-wrap">
                    <span class="rem-main-icon">${icon}</span>
                    <h1 class="rem-main-title">${escapeHtml(title)}</h1>
                    <span class="rem-main-count">${items.length}</span>
                </div>`;
            mainArea.appendChild(head);

            // Add new (apenas em listas custom + smart "tudo"/"today")
            const canAdd = !['scheduled', 'flagged', 'completed'].includes(selectedListId);
            if (canAdd) {
                const addRow = document.createElement('div');
                addRow.className = 'rem-add-row';
                const addBtnTitle  = T('rem_btn_add', { _d: 'Adicionar lembrete' });
                const addPlaceholder = T('rem_placeholder_new_task', { _d: 'Nova tarefa' });
                addRow.innerHTML = `
                    <button class="rem-check rem-check-add" title="${escapeHtml(addBtnTitle)}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                    <input class="rem-add-input" type="text" placeholder="${escapeHtml(addPlaceholder)}" spellcheck="false" />`;
                const inp = addRow.querySelector('.rem-add-input');
                const submitNew = () => {
                    const txt = inp.value.trim();
                    if (!txt) return;
                    const item = {
                        id: 'r_' + Math.random().toString(36).substr(2, 9),
                        title: txt,
                        completed: false,
                        listId: selectedListId === 'all' || selectedListId === 'today'
                                ? data.lists[0].id
                                : selectedListId,
                        dueDate: selectedListId === 'today' ? new Date().toISOString() : null,
                        priority: 'normal',
                        created: new Date().toISOString(),
                    };
                    data.items.unshift(item);
                    saveData(data);
                    inp.value = '';
                    renderMain();
                    renderSidebar();
                };
                inp.addEventListener('keydown', e => {
                    if (e.key === 'Enter') submitNew();
                });
                addRow.querySelector('.rem-check-add').addEventListener('click', submitNew);
                mainArea.appendChild(addRow);
            }

            // Lista de items
            if (!items.length) {
                const empty = document.createElement('div');
                empty.className = 'rem-empty';
                const emptyTitle = selectedListId === 'completed'
                    ? T('rem_empty_completed_title', { _d: 'Sem tarefas concluídas' })
                    : T('rem_empty_main_title', { _d: 'Sem tarefas aqui' });
                const emptyMsg = selectedListId === 'completed'
                    ? T('rem_empty_completed_msg', { _d: 'Quando marcares tarefas como concluídas, aparecem aqui.' })
                    : T('rem_empty_main_msg', { _d: 'Adiciona uma tarefa para começar.' });
                empty.innerHTML = `
                    <div style="font-size:48px;opacity:.4">${icon}</div>
                    <div class="rem-empty-title">${escapeHtml(emptyTitle)}</div>
                    <div class="rem-empty-msg">${escapeHtml(emptyMsg)}</div>`;
                mainArea.appendChild(empty);
                return;
            }

            const itemsWrap = document.createElement('div');
            itemsWrap.className = 'rem-items';
            items.forEach(item => itemsWrap.appendChild(buildItem(item)));
            mainArea.appendChild(itemsWrap);
        }

        function buildItem(item) {
            const list = data.lists.find(l => l.id === item.listId);
            const overdue = !item.completed && isOverdue(item.dueDate);
            const div = document.createElement('div');
            div.className = 'rem-item' + (item.completed ? ' completed' : '');

            const check = document.createElement('button');
            check.className = 'rem-check' + (item.completed ? ' checked' : '');
            check.style.borderColor = list ? list.color : '#666';
            check.style.background = item.completed ? (list ? list.color : '#666') : 'transparent';
            check.innerHTML = item.completed
                ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '';
            check.title = item.completed
                ? T('rem_label_done', { _d: 'Concluído' })
                : T('rem_btn_mark_done', { _d: 'Marcar como concluída' });
            check.addEventListener('click', () => toggleComplete(item.id));
            div.appendChild(check);

            const body = document.createElement('div');
            body.className = 'rem-item-body';

            const title = document.createElement('input');
            title.className = 'rem-item-title';
            title.type = 'text';
            title.value = item.title;
            title.addEventListener('blur', () => {
                if (title.value.trim() !== item.title) {
                    item.title = title.value.trim() || item.title;
                    saveData(data);
                    renderMain();
                }
            });
            title.addEventListener('keydown', e => {
                if (e.key === 'Enter') title.blur();
            });
            body.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'rem-item-meta';
            const metaParts = [];
            if (list && selectedListId !== item.listId)
                metaParts.push(`<span class="rem-meta-list" style="color:${list.color}">${list.icon} ${escapeHtml(list.name)}</span>`);
            if (item.dueDate)
                metaParts.push(`<span class="rem-meta-date${overdue ? ' overdue' : ''}">📅 ${escapeHtml(fmtDate(item.dueDate))}</span>`);
            if (item.priority === 'high')
                metaParts.push(`<span class="rem-meta-flag">🚩 ${escapeHtml(T('rem_label_priority', { _d: 'Prioritária' }))}</span>`);
            if (metaParts.length) meta.innerHTML = metaParts.join(' · ');
            body.appendChild(meta);

            div.appendChild(body);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'rem-item-actions';

            const flag = document.createElement('button');
            flag.className = 'rem-item-action' + (item.priority === 'high' ? ' active' : '');
            flag.title = T('rem_btn_mark_priority', { _d: 'Marcar como prioritária' });
            flag.innerHTML = '🚩';
            flag.addEventListener('click', () => togglePriority(item.id));
            actions.appendChild(flag);

            const dateBtn = document.createElement('button');
            dateBtn.className = 'rem-item-action' + (item.dueDate ? ' active' : '');
            dateBtn.title = T('rem_btn_set_date', { _d: 'Definir data' });
            dateBtn.innerHTML = '📅';
            dateBtn.addEventListener('click', e => openDatePicker(item, dateBtn));
            actions.appendChild(dateBtn);

            const del = document.createElement('button');
            del.className = 'rem-item-action danger';
            del.title = T('rem_btn_delete', { _d: 'Eliminar' });
            del.innerHTML = '🗑';
            del.addEventListener('click', () => deleteItem(item.id));
            actions.appendChild(del);

            div.appendChild(actions);

            return div;
        }

        function toggleComplete(id) {
            const item = data.items.find(i => i.id === id);
            if (!item) return;
            item.completed = !item.completed;
            saveData(data);
            // Pequeno delay para a animação de check ser vista
            setTimeout(() => { renderMain(); renderSidebar(); }, item.completed ? 300 : 50);
        }

        function togglePriority(id) {
            const item = data.items.find(i => i.id === id);
            if (!item) return;
            item.priority = item.priority === 'high' ? 'normal' : 'high';
            saveData(data);
            renderMain();
            renderSidebar();
        }

        function deleteItem(id) {
            data.items = data.items.filter(i => i.id !== id);
            saveData(data);
            renderMain();
            renderSidebar();
        }

        function openDatePicker(item, anchor) {
            window.OS.api.showFloatingMenu(anchor, [
                { label: '📅 ' + T('rem_filter_today',     { _d: 'Hoje' }),           onClick: () => { item.dueDate = new Date().toISOString(); saveData(data); renderMain(); renderSidebar(); } },
                { label: '📅 ' + T('rem_filter_tomorrow',  { _d: 'Amanhã' }),         onClick: () => { item.dueDate = new Date(Date.now() + 86400000).toISOString(); saveData(data); renderMain(); renderSidebar(); } },
                { label: '📅 ' + T('rem_date_next_week',   { _d: 'Próxima Semana' }), onClick: () => { item.dueDate = new Date(Date.now() + 7*86400000).toISOString(); saveData(data); renderMain(); renderSidebar(); } },
                '---',
                { label: '🚫 ' + T('rem_date_remove',      { _d: 'Remover Data' }),   onClick: () => { item.dueDate = null; saveData(data); renderMain(); renderSidebar(); } },
            ]);
        }

        function addList() {
            const colors = ['#0ea5e9','#a855f7','#f59e0b','#ec4899','#34c759','#ff453a'];
            const icons = ['📋','💼','🛒','🏠','🎯','💡','📚','🎮','🍔','✈️','💰','🏃'];
            const body = document.createElement('div');
            body.innerHTML = `
                <div class="field">
                    <label>${escapeHtml(T('rem_modal_list_name_label', { _d: 'Nome da Lista' }))}</label>
                    <input type="text" data-field="name" placeholder="${escapeHtml(T('rem_modal_list_name_placeholder', { _d: 'Ex: Compras Semana' }))}" />
                </div>`;

            let selectedColor = colors[0];
            let selectedIcon = icons[0];

            const colorBlock = document.createElement('div');
            colorBlock.className = 'field';
            colorBlock.innerHTML = `<label>${escapeHtml(T('rem_modal_color_label', { _d: 'Cor' }))}</label>`;
            const colorRow = document.createElement('div');
            colorRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
            colors.forEach(c => {
                const sw = document.createElement('button');
                sw.style.cssText = `width:32px;height:32px;border-radius:50%;background:${c};border:2px solid ${c === selectedColor ? '#fff' : 'transparent'};cursor:pointer;transition:transform .1s`;
                sw.addEventListener('click', () => {
                    selectedColor = c;
                    Array.from(colorRow.children).forEach(s => s.style.borderColor = 'transparent');
                    sw.style.borderColor = '#fff';
                });
                colorRow.appendChild(sw);
            });
            colorBlock.appendChild(colorRow);
            body.appendChild(colorBlock);

            const iconBlock = document.createElement('div');
            iconBlock.className = 'field';
            iconBlock.innerHTML = `<label>${escapeHtml(T('rem_modal_icon_label', { _d: 'Ícone' }))}</label>`;
            const iconRow = document.createElement('div');
            iconRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
            icons.forEach(i => {
                const ib = document.createElement('button');
                ib.style.cssText = `width:32px;height:32px;border-radius:8px;background:${i === selectedIcon ? 'var(--accent)' : 'rgba(255,255,255,.06)'};border:none;font-size:18px;cursor:pointer;transition:background .1s`;
                ib.textContent = i;
                ib.addEventListener('click', () => {
                    selectedIcon = i;
                    Array.from(iconRow.children).forEach(s => s.style.background = 'rgba(255,255,255,.06)');
                    ib.style.background = 'var(--accent)';
                });
                iconRow.appendChild(ib);
            });
            iconBlock.appendChild(iconRow);
            body.appendChild(iconBlock);

            window.OS.api.showModal({
                title: T('rem_btn_new_list', { _d: 'Nova lista' }),
                body,
                actions: [
                    { label: T('rem_btn_cancel', { _d: 'Cancelar' }) },
                    { label: T('rem_btn_create', { _d: 'Criar' }), style: 'primary', onClick: ({ body }) => {
                        const name = body.querySelector('[data-field="name"]').value.trim();
                        if (!name) return false;
                        data.lists.push({
                            id: 'l_' + Math.random().toString(36).substr(2, 9),
                            name, icon: selectedIcon, color: selectedColor,
                        });
                        saveData(data);
                        renderSidebar();
                    }},
                ],
            });
        }

        function renameList(list) {
            const body = document.createElement('div');
            body.innerHTML = `<div class="field"><label>${escapeHtml(T('rem_modal_name_label', { _d: 'Nome' }))}</label><input type="text" data-field="name" value="${escapeHtml(list.name)}" /></div>`;
            window.OS.api.showModal({
                title: T('rem_modal_rename_title', { _d: 'Renomear Lista' }),
                body,
                actions: [
                    { label: T('rem_btn_cancel', { _d: 'Cancelar' }) },
                    { label: T('rem_btn_save', { _d: 'Guardar' }), style: 'primary', onClick: ({ body }) => {
                        const name = body.querySelector('[data-field="name"]').value.trim();
                        if (!name) return false;
                        list.name = name;
                        saveData(data);
                        renderSidebar();
                        renderMain();
                    }},
                ],
            });
        }

        function deleteList(list) {
            const itemCount = data.items.filter(i => i.listId === list.id).length;
            const subtitle = itemCount
                ? (itemCount === 1
                    ? T('rem_modal_delete_subtitle_one',  { _d: '{n} tarefa será apagada.', n: itemCount })
                    : T('rem_modal_delete_subtitle_many', { _d: '{n} tarefas serão apagadas.', n: itemCount }))
                : T('rem_modal_delete_subtitle_empty', { _d: 'Esta lista está vazia.' });
            window.OS.api.showModal({
                title: T('rem_modal_delete_title', { _d: 'Eliminar "{name}"?', name: list.name }),
                subtitle,
                actions: [
                    { label: T('rem_btn_cancel', { _d: 'Cancelar' }) },
                    { label: T('rem_btn_delete', { _d: 'Eliminar' }), style: 'danger', onClick: () => {
                        data.lists = data.lists.filter(l => l.id !== list.id);
                        data.items = data.items.filter(i => i.listId !== list.id);
                        if (selectedListId === list.id) selectedListId = 'all';
                        saveData(data);
                        renderSidebar();
                        renderMain();
                    }},
                ],
            });
        }

        root.appendChild(side);
        root.appendChild(mainArea);
        renderSidebar();
        renderMain();

        return root;
    }

    return {
        id: 'reminders',
        get defaultName() { return T('rem_title_main', { _d: 'Lembretes' }); },
        defaultSize: { w: 920, h: 620 },
        resizable: true,
        buildIcon: buildIcon,
        build: buildContent,
    };
})();
