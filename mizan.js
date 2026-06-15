(function () {
    const DATASET_ID = 'ds_mizan';
    const RESTART_ROLES = ['admin', 'mutabakat', 'surec'];

    let mizanGorevler = [];
    let datasetMeta = { layer: 'TDMAIN', layerRole: 'Ana veri — kurumsal çekirdek', label: 'Mizan' };

    function getUserRole() {
        return ApiClient?.userRole || localStorage.getItem('userRole') || 'admin';
    }

    function canRestartTasks() {
        return RESTART_ROLES.includes(getUserRole());
    }

    async function loadMizanData() {
        try {
            mizanGorevler = await ApiClient.getMizanGorevler();
        } catch (err) {
            console.error('Mizan görevleri yüklenemedi:', err);
            mizanGorevler = [];
        }
    }

    function statusText(status) {
        if (status === 'done') return 'Tamamlandı';
        if (status === 'running') return 'Çalışıyor';
        if (status === 'failed') return 'Hata';
        return 'Bekliyor';
    }

    function overallStatus(tasks) {
        if (tasks.every(t => t.durum === 'done')) return { label: 'Tamam', cls: 'done' };
        if (tasks.some(t => t.durum === 'running')) return { label: 'Aktif', cls: 'running' };
        if (tasks.some(t => t.durum === 'failed')) return { label: 'Hata', cls: 'failed' };
        return { label: 'Bekliyor', cls: 'waiting' };
    }

    function buildTaskHTML(task, index, authorized) {
        const restartBtn = authorized
            ? `<button type="button" class="mz-restart-btn" data-restart="${index}" data-gorev-id="${task.gorevTanimId}" title="Taskı yeniden başlat">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                    <span>Yeniden Başlat</span>
               </button>`
            : '';

        return `
            <div class="mz-task ${task.durum}" data-task-index="${index}">
                <div class="mz-task-main">
                    <span class="mz-task-icon">${task.durum === 'done' ? '✓' : task.durum === 'running' ? '◉' : task.durum === 'failed' ? '✕' : '○'}</span>
                    <div class="mz-task-info">
                        <strong>${task.etiket}</strong>
                        <span>${statusText(task.durum)}</span>
                    </div>
                </div>
                ${restartBtn}
            </div>`;
    }

    function buildMizanHTML() {
        const authorized = canRestartTasks();
        const overall = overallStatus(mizanGorevler);
        const tasksHtml = mizanGorevler.map((t, i) => buildTaskHTML(t, i, authorized)).join('');
        const lastUpdated = mizanGorevler.reduce((max, t) => {
            if (!t.sonGuncelleme) return max;
            const d = new Date(t.sonGuncelleme);
            return !max || d > max ? d : max;
        }, null);
        const updatedLabel = lastUpdated ? lastUpdated.toLocaleString('tr-TR') : '—';

        return `<section class="mizan-layout">
            <div class="mz-head">
                <div>
                    <h3>Mizan</h3>
                    <p>${datasetMeta.layer} dataset task durumu ve yönetimi</p>
                </div>
                <span class="mz-overall status-${overall.cls}">${overall.label}</span>
            </div>
            <article class="mz-dataset-card status-${overall.cls}">
                <div class="mz-dataset-head">
                    <div class="mz-dataset-title">
                        <i class="ti ti-database" aria-hidden="true"></i>
                        <div>
                            <strong>${datasetMeta.label}</strong>
                            <code>${DATASET_ID}</code>
                        </div>
                    </div>
                    <div class="mz-dataset-meta">
                        <span class="mz-layer">${datasetMeta.layer}</span>
                        <span class="mz-layer-desc">${datasetMeta.layerRole}</span>
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

    function bindMizanEvents(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-restart]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const gorevId = parseInt(btn.dataset.gorevId, 10);
                if (Number.isNaN(gorevId) || !canRestartTasks()) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="ti ti-loader" aria-hidden="true"></i><span>Başlatılıyor…</span>';

                try {
                    await ApiClient.yenidenBaslatMizanGorev(gorevId);
                    await loadMizanData();
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
                } catch (err) {
                    alert('Yeniden başlatma başarısız: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="ti ti-refresh" aria-hidden="true"></i><span>Yeniden Başlat</span>';
                }
            });
        });
    }

    async function initMizanPage(container) {
        const el = container || document.querySelector('[data-mizan-page]') || document.getElementById('pageBody');
        if (!el) return;
        await loadMizanData();
        el.innerHTML = buildMizanHTML();
        bindMizanEvents(el);
    }

    window.buildMizanHTML = buildMizanHTML;
    window.initMizanPage = initMizanPage;
    window.canRestartMizanTasks = canRestartTasks;

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        const host = document.querySelector('[data-mizan-page]');
        if (host) initMizanPage(host);
    });
})();
