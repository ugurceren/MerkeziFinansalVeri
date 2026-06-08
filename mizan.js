(function () {
    const STORAGE_KEY = 'datasetTaskStates';
    const DATASET_ID = 'ds_mizan';

    const DEFAULT_DATASET = {
        id: DATASET_ID,
        label: 'Mizan',
        layer: 'TDMAIN',
        layerRole: 'Ana veri — kurumsal çekirdek',
        tasks: [
            { id: 'donusum', label: 'Dönüşüm', status: 'done' },
            { id: 'mutabakat', label: 'Mutabakat', status: 'running' },
            { id: 'onay', label: 'Ana Veri Onay', status: 'pending' }
        ]
    };

    const RESTART_ROLES = ['admin', 'mutabakat', 'surec'];

    function getUserRole() {
        return localStorage.getItem('userRole') || 'admin';
    }

    function canRestartTasks() {
        return RESTART_ROLES.includes(getUserRole());
    }

    function loadStates() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveStates(states) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    }

    function getMizanDataset() {
        const saved = loadStates()[DATASET_ID];
        if (!saved?.tasks?.length) return structuredClone(DEFAULT_DATASET);
        return {
            ...DEFAULT_DATASET,
            ...saved,
            tasks: saved.tasks.map((t, i) => ({
                ...DEFAULT_DATASET.tasks[i],
                ...t,
                label: DEFAULT_DATASET.tasks[i]?.label || t.label
            }))
        };
    }

    function persistDataset(dataset) {
        const states = loadStates();
        states[DATASET_ID] = {
            tasks: dataset.tasks.map(({ id, label, status }) => ({ id, label, status })),
            lastUpdated: new Date().toISOString()
        };
        saveStates(states);
    }

    function statusText(status) {
        if (status === 'done') return 'Tamamlandı';
        if (status === 'running') return 'Çalışıyor';
        if (status === 'failed') return 'Hata';
        return 'Bekliyor';
    }

    function overallStatus(tasks) {
        if (tasks.every(t => t.status === 'done')) return { label: 'Tamam', cls: 'done' };
        if (tasks.some(t => t.status === 'running')) return { label: 'Aktif', cls: 'running' };
        if (tasks.some(t => t.status === 'failed')) return { label: 'Hata', cls: 'failed' };
        return { label: 'Bekliyor', cls: 'waiting' };
    }

    function buildTaskHTML(task, index, authorized) {
        const restartBtn = authorized
            ? `<button type="button" class="mz-restart-btn" data-restart="${index}" title="Taskı yeniden başlat">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                    <span>Yeniden Başlat</span>
               </button>`
            : '';

        return `
            <div class="mz-task ${task.status}" data-task-index="${index}">
                <div class="mz-task-main">
                    <span class="mz-task-icon">${task.status === 'done' ? '✓' : task.status === 'running' ? '◉' : task.status === 'failed' ? '✕' : '○'}</span>
                    <div class="mz-task-info">
                        <strong>${task.label}</strong>
                        <span>${statusText(task.status)}</span>
                    </div>
                </div>
                ${restartBtn}
            </div>`;
    }

    function buildMizanHTML() {
        const dataset = getMizanDataset();
        const authorized = canRestartTasks();
        const overall = overallStatus(dataset.tasks);
        const tasksHtml = dataset.tasks.map((t, i) => buildTaskHTML(t, i, authorized)).join('');
        const lastUpdated = loadStates()[DATASET_ID]?.lastUpdated;
        const updatedLabel = lastUpdated
            ? new Date(lastUpdated).toLocaleString('tr-TR')
            : '—';

        return `<section class="mizan-layout">
            <div class="mz-head">
                <div>
                    <h3>Mizan</h3>
                    <p>${dataset.layer} dataset task durumu ve yönetimi</p>
                </div>
                <span class="mz-overall status-${overall.cls}">${overall.label}</span>
            </div>
            <article class="mz-dataset-card status-${overall.cls}">
                <div class="mz-dataset-head">
                    <div class="mz-dataset-title">
                        <i class="ti ti-database" aria-hidden="true"></i>
                        <div>
                            <strong>${dataset.label}</strong>
                            <code>${dataset.id}</code>
                        </div>
                    </div>
                    <div class="mz-dataset-meta">
                        <span class="mz-layer">${dataset.layer}</span>
                        <span class="mz-layer-desc">${dataset.layerRole}</span>
                    </div>
                </div>
                <div class="mz-task-list">${tasksHtml}</div>
                <footer class="mz-dataset-foot">
                    <span>Son güncelleme: <time>${updatedLabel}</time></span>
                    ${authorized
                        ? '<span class="mz-auth-note">Task yeniden başlatma yetkiniz var</span>'
                        : '<span class="mz-auth-note muted">Task yeniden başlatma için yetkiniz yok</span>'}
                </footer>
            </article>
        </section>`;
    }

    function restartTask(index) {
        const dataset = getMizanDataset();
        dataset.tasks = dataset.tasks.map((task, i) => {
            if (i < index) return { ...task, status: 'done' };
            if (i === index) return { ...task, status: 'running' };
            return { ...task, status: 'pending' };
        });
        persistDataset(dataset);
        return dataset;
    }

    function bindMizanEvents(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-restart]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.restart, 10);
                if (Number.isNaN(index) || !canRestartTasks()) return;

                btn.disabled = true;
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="ti ti-loader" aria-hidden="true"></i><span>Başlatılıyor…</span>';

                setTimeout(() => {
                    restartTask(index);
                    const host = scope.querySelector('.mizan-layout')?.parentElement || scope;
                    if (host.id === 'pageBody' || host.hasAttribute('data-mizan-page')) {
                        host.innerHTML = buildMizanHTML();
                        bindMizanEvents(host);
                    } else {
                        const layout = scope.querySelector('.mizan-layout');
                        if (layout) {
                            layout.outerHTML = buildMizanHTML();
                            bindMizanEvents(scope);
                        }
                    }
                }, 600);
            });
        });
    }

    function initMizanPage(container) {
        const el = container || document.querySelector('[data-mizan-page]') || document.getElementById('pageBody');
        if (!el) return;
        el.innerHTML = buildMizanHTML();
        bindMizanEvents(el);
    }

    window.buildMizanHTML = buildMizanHTML;
    window.initMizanPage = initMizanPage;
    window.canRestartMizanTasks = canRestartTasks;

    document.addEventListener('DOMContentLoaded', () => {
        const host = document.querySelector('[data-mizan-page]');
        if (host) initMizanPage(host);
    });
})();
