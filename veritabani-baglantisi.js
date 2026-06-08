(function () {
    const STORAGE_KEY = 'dbConnections';

    const DATABASES = [
        {
            id: 'tdstg',
            name: 'TDSTG',
            role: 'Staging — ham veri katmanı',
            theme: 'stg',
            defaults: { server: 'sql-stg-01.sirket.local', database: 'TDSTG', port: '1433', auth: 'sql' }
        },
        {
            id: 'tdmain',
            name: 'TDMAIN',
            role: 'Ana veri — kurumsal çekirdek',
            theme: 'main',
            defaults: { server: 'sql-main-01.sirket.local', database: 'TDMAIN', port: '1433', auth: 'sql' }
        },
        {
            id: 'tdreport',
            name: 'TDREPORT',
            role: 'Raporlama — analitik katman',
            theme: 'report',
            defaults: { server: 'sql-rpt-01.sirket.local', database: 'TDREPORT', port: '1433', auth: 'sql' }
        }
    ];

    function loadConnections() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveConnections(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function getConn(id) {
        const saved = loadConnections()[id];
        const db = DATABASES.find(d => d.id === id);
        return { ...db.defaults, ...saved };
    }

    function getDb(id) {
        return DATABASES.find(d => d.id === id) || DATABASES[0];
    }

    function statusLabel(status) {
        if (status === 'connected') return 'Bağlı';
        if (status === 'error') return 'Hata';
        return 'Yapılandırılmadı';
    }

    function statusClass(status) {
        if (status === 'connected') return 'connected';
        if (status === 'error') return 'error';
        return '';
    }

    function buildDbOptions(selectedId) {
        return DATABASES.map(db => {
            const conn = getConn(db.id);
            const status = conn._status || 'unknown';
            const label = `${db.name} — ${statusLabel(status)}`;
            return `<option value="${db.id}" ${db.id === selectedId ? 'selected' : ''}>${label}</option>`;
        }).join('');
    }

    function buildPageHTML(selectedId) {
        const db = getDb(selectedId || DATABASES[0].id);
        const conn = getConn(db.id);
        const status = conn._status || 'unknown';

        return `<div class="dbc-layout">
            <article class="dbc-panel theme-${db.theme}" data-dbc-panel>
                <div class="dbc-panel-head">
                    <div>
                        <h3><i class="ti ti-plug-connected" aria-hidden="true"></i> Veritabanı Bağlantısı</h3>
                        <p>TDSTG, TDMAIN ve TDREPORT ortamları için bağlantı parametrelerini yönetin.</p>
                    </div>
                    <span class="dbc-status ${statusClass(status)}" data-status>${statusLabel(status)}</span>
                </div>
                <div class="dbc-panel-body">
                    <div class="dbc-field">
                        <label for="dbc-db-select">Veritabanı Seçimi</label>
                        <select id="dbc-db-select" data-db-select>${buildDbOptions(db.id)}</select>
                        <p class="dbc-db-role" data-db-role>${db.role}</p>
                    </div>
                    <div class="dbc-field">
                        <label for="dbc-server">Sunucu</label>
                        <input type="text" id="dbc-server" data-field="server" value="${conn.server}" placeholder="sql-server.sirket.local">
                    </div>
                    <div class="dbc-row">
                        <div class="dbc-field">
                            <label for="dbc-database">Veritabanı</label>
                            <input type="text" id="dbc-database" data-field="database" value="${conn.database}">
                        </div>
                        <div class="dbc-field">
                            <label for="dbc-port">Port</label>
                            <input type="text" id="dbc-port" data-field="port" value="${conn.port}">
                        </div>
                    </div>
                    <div class="dbc-field">
                        <label for="dbc-auth">Kimlik Doğrulama</label>
                        <select id="dbc-auth" data-field="auth">
                            <option value="sql" ${conn.auth === 'sql' ? 'selected' : ''}>SQL Server</option>
                            <option value="windows" ${conn.auth === 'windows' ? 'selected' : ''}>Windows (Entegre)</option>
                        </select>
                    </div>
                    <div class="dbc-actions">
                        <button type="button" class="dbc-test-btn" data-test>Bağlantıyı Test Et</button>
                        <button type="button" class="dbc-save-btn" data-save>Kaydet</button>
                    </div>
                </div>
            </article>
            <p class="dbc-hint">Bağlantı bilgileri yalnızca tarayıcıda (localStorage) saklanır. Üretim ortamında güvenli bir secret store kullanılmalıdır.</p>
            <div class="dbc-footer">
                <span class="dbc-footer-msg" id="dbcSaveMsg" role="status">Kaydedildi</span>
            </div>
        </div>`;
    }

    function readFormFields(scope) {
        const data = {};
        scope.querySelectorAll('[data-field]').forEach(el => {
            data[el.dataset.field] = el.value.trim();
        });
        return data;
    }

    function updateStatus(scope, status) {
        const badge = scope.querySelector('[data-status]');
        if (!badge) return;
        badge.className = 'dbc-status ' + statusClass(status);
        badge.textContent = statusLabel(status);
    }

    function updateSelectOptions(scope, selectedId) {
        const select = scope.querySelector('[data-db-select]');
        if (!select) return;
        select.innerHTML = buildDbOptions(selectedId);
        select.value = selectedId;
    }

    function applyDbTheme(scope, dbId) {
        const panel = scope.querySelector('[data-dbc-panel]');
        const db = getDb(dbId);
        if (!panel) return;
        panel.className = `dbc-panel theme-${db.theme}`;
        const roleEl = scope.querySelector('[data-db-role]');
        if (roleEl) roleEl.textContent = db.role;
    }

    function loadFormForDb(scope, dbId, draft) {
        const conn = draft || getConn(dbId);
        const server = scope.querySelector('[data-field="server"]');
        const database = scope.querySelector('[data-field="database"]');
        const port = scope.querySelector('[data-field="port"]');
        const auth = scope.querySelector('[data-field="auth"]');
        if (server) server.value = conn.server || '';
        if (database) database.value = conn.database || '';
        if (port) port.value = conn.port || '';
        if (auth) auth.value = conn.auth || 'sql';
        updateStatus(scope, conn._status || 'unknown');
        applyDbTheme(scope, dbId);
        updateSelectOptions(scope, dbId);
    }

    function saveCurrentDb(scope, dbId) {
        const fields = readFormFields(scope);
        const all = loadConnections();
        all[dbId] = { ...all[dbId], ...fields };
        delete all[dbId]._status;
        saveConnections(all);
    }

    function bindEvents(root) {
        const scope = root || document;
        const drafts = {};
        let currentId = scope.querySelector('[data-db-select]')?.value || DATABASES[0].id;

        scope.querySelector('[data-db-select]')?.addEventListener('change', (e) => {
            const nextId = e.target.value;
            drafts[currentId] = { ...readFormFields(scope), _status: loadConnections()[currentId]?._status };
            currentId = nextId;
            loadFormForDb(scope, nextId, drafts[nextId]);
        });

        scope.querySelector('[data-test]')?.addEventListener('click', (btn) => {
            const button = btn.currentTarget;
            button.disabled = true;
            button.textContent = 'Test ediliyor…';
            setTimeout(() => {
                const ok = scope.querySelector('[data-field="server"]')?.value.trim();
                const status = ok ? 'connected' : 'error';
                updateStatus(scope, status);
                const all = loadConnections();
                all[currentId] = { ...all[currentId], ...readFormFields(scope), _status: status };
                saveConnections(all);
                delete drafts[currentId];
                updateSelectOptions(scope, currentId);
                button.disabled = false;
                button.textContent = 'Bağlantıyı Test Et';
            }, 800);
        });

        scope.querySelector('[data-save]')?.addEventListener('click', () => {
            saveCurrentDb(scope, currentId);
            delete drafts[currentId];
            updateSelectOptions(scope, currentId);
            showSaveMsg(scope);
        });
    }

    function showSaveMsg(root) {
        const msg = (root || document).querySelector('#dbcSaveMsg');
        if (!msg) return;
        msg.classList.add('visible');
        clearTimeout(showSaveMsg._timer);
        showSaveMsg._timer = setTimeout(() => msg.classList.remove('visible'), 2200);
    }

    function initVeritabaniBaglantisi(container) {
        const root = container || document;
        if (root === document && !root.querySelector('.dbc-layout')) {
            const pageBody = root.querySelector('.page-body');
            if (pageBody) {
                pageBody.innerHTML = buildPageHTML();
                bindEvents(pageBody);
            }
            return;
        }
        bindEvents(root);
    }

    window.buildVeritabaniBaglantisiHTML = buildPageHTML;
    window.initVeritabaniBaglantisi = initVeritabaniBaglantisi;

    document.addEventListener('DOMContentLoaded', () => {
        const host = document.querySelector('[data-db-page]');
        if (host) {
            host.innerHTML = buildPageHTML();
            bindEvents(host);
            return;
        }
        if (document.querySelector('.dbc-layout')) {
            bindEvents(document);
        }
    });
})();
