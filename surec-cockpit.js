const COCKPIT_COLUMNS_FALLBACK = [
    {
        name: 'TDSTG',
        role: 'Staging — ham veri katmanı',
        theme: 'teal',
        datasets: [
            { name: 'ds_banka_ham', label: 'Banka Ham Veri', tasks: [
                { label: 'Yükleme', status: 'done' },
                { label: 'Validasyon', status: 'done' },
                { label: 'Staging Onay', status: 'done' }
            ]},
            { name: 'ds_muhasebe_raw', label: 'Muhasebe Raw', tasks: [
                { label: 'Yükleme', status: 'done' },
                { label: 'Validasyon', status: 'running' },
                { label: 'Staging Onay', status: 'pending' }
            ]},
            { name: 'ds_doviz_kurlari', label: 'Döviz Kurları', tasks: [
                { label: 'Yükleme', status: 'done' },
                { label: 'Validasyon', status: 'done' },
                { label: 'Staging Onay', status: 'done' }
            ]},
            { name: 'ds_masraf_stg', label: 'Masraf Staging', tasks: [
                { label: 'Yükleme', status: 'running' },
                { label: 'Validasyon', status: 'pending' },
                { label: 'Staging Onay', status: 'pending' }
            ]}
        ]
    },
    {
        name: 'TDMAIN',
        role: 'Ana veri — kurumsal çekirdek',
        theme: 'blue',
        datasets: [
            { name: 'ds_kebir', label: 'Kebir Defteri', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'running' },
                { label: 'Ana Veri Onay', status: 'pending' }
            ]},
            { name: 'ds_mizan', label: 'Mizan', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'running' },
                { label: 'Ana Veri Onay', status: 'pending' }
            ]},
            { name: 'ds_yevmiye', label: 'Yevmiye', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'pending' },
                { label: 'Ana Veri Onay', status: 'pending' }
            ]},
            { name: 'ds_hesap_plan', label: 'Hesap Planı', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'done' },
                { label: 'Ana Veri Onay', status: 'done' }
            ]}
        ]
    },
    {
        name: 'TDREPORT',
        role: 'Raporlama — analitik katman',
        theme: 'purple',
        datasets: [
            { name: 'ds_bilanco', label: 'Bilanço', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]},
            { name: 'ds_gelir', label: 'Gelir Tablosu', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]},
            { name: 'ds_ters_bakiye', label: 'Ters Bakiye', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]},
            { name: 'ds_nazim', label: 'Nazım Hesapları', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]}
        ]
    }
];

const DATASET_DOMAINS_FALLBACK = [
    {
        id: 'fon-kullandirim',
        name: 'Fon Kullandırım',
        theme: 'teal',
        datasets: [
            { name: 'ds_fon_hareket', label: 'Fon Hareket' },
            { name: 'ds_fon_limit', label: 'Fon Limit' },
            { name: 'ds_fon_faiz', label: 'Fon Faiz' },
            { name: 'ds_fon_izleme', label: 'Fon İzleme' }
        ]
    },
    {
        id: 'hazine',
        name: 'Hazine',
        theme: 'blue',
        datasets: [
            { name: 'ds_hazine_portfoy', label: 'Hazine Portföy' },
            { name: 'ds_hazine_islem', label: 'Hazine İşlem' },
            { name: 'ds_hazine_deger', label: 'Hazine Değerleme' },
            { name: 'ds_hazine_risk', label: 'Hazine Risk' },
            { name: 'ds_hazine_mutabakat', label: 'Hazine Mutabakat' }
        ]
    },
    {
        id: 'mevduat',
        name: 'Mevduat',
        theme: 'purple',
        datasets: [
            { name: 'ds_mevduat_vadeli', label: 'Vadeli Mevduat' },
            { name: 'ds_mevduat_vadesiz', label: 'Vadesiz Mevduat' },
            { name: 'ds_mevduat_faiz', label: 'Mevduat Faiz' },
            { name: 'ds_mevduat_musteri', label: 'Mevduat Müşteri' },
            { name: 'ds_mevduat_hareket', label: 'Mevduat Hareket' },
            { name: 'ds_mevduat_rapor', label: 'Mevduat Rapor' }
        ]
    },
    {
        id: 'masraf',
        name: 'Masraf',
        theme: 'amber',
        datasets: [
            { name: 'ds_masraf_hesap', label: 'Masraf Hesap' },
            { name: 'ds_masraf_dagitim', label: 'Masraf Dağıtım' },
            { name: 'ds_masraf_butce', label: 'Masraf Bütçe' },
            { name: 'ds_masraf_stg', label: 'Masraf Staging' }
        ]
    },
    {
        id: 'reeskont',
        name: 'Reeskont',
        theme: 'rose',
        datasets: [
            { name: 'ds_reeskont_portfoy', label: 'Reeskont Portföy' },
            { name: 'ds_reeskont_faiz', label: 'Reeskont Faiz' },
            { name: 'ds_reeskont_vade', label: 'Reeskont Vade' }
        ]
    }
];

let COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
let DATASET_DOMAINS = DATASET_DOMAINS_FALLBACK;

async function loadSurecData() {
    if (typeof ApiClient === 'undefined') return;
    try {
        const kokpit = await ApiClient.getSurecKokpit();
        if (kokpit?.length) {
            COCKPIT_COLUMNS = kokpit.map(k => ({
                name: k.katmanKodu,
                role: k.rol,
                theme: k.tema,
                datasets: k.datasets.map(d => ({
                    name: d.kod,
                    label: d.etiket,
                    tasks: d.gorevler.map(g => ({ label: g.etiket, status: g.durum }))
                }))
            }));
        }
        const domainler = await ApiClient.getSurecDomainler();
        if (domainler?.length) {
            DATASET_DOMAINS = domainler.map(d => ({
                id: d.domainId,
                name: d.ad,
                theme: d.tema,
                datasets: d.datasets.map(ds => ({ name: ds.kod, label: ds.etiket }))
            }));
        }
    } catch (err) {
        console.warn('Süreç verisi API\'den yüklenemedi, yerel veri kullanılıyor:', err.message);
        COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
        DATASET_DOMAINS = DATASET_DOMAINS_FALLBACK;
    }
}

function getDatasetTotals() {
    const domainCount = DATASET_DOMAINS.length;
    const datasetCount = DATASET_DOMAINS.reduce((sum, d) => sum + d.datasets.length, 0);
    return { domainCount, datasetCount };
}

function buildDomainCard(domain) {
    const items = domain.datasets.map(ds => `
        <li class="ds-item">
            <span class="ds-item-label">${ds.label}</span>
            <code>${ds.name}</code>
        </li>`).join('');

    return `
        <article class="domain-card theme-${domain.theme}">
            <div class="domain-head">
                <div class="domain-title">
                    <i class="ti ti-folder" aria-hidden="true"></i>
                    <h4>${domain.name}</h4>
                </div>
                <span class="domain-count">${domain.datasets.length} dataset</span>
            </div>
            <ul class="domain-datasets">${items}</ul>
        </article>`;
}

function buildDatasetCatalogHTML() {
    const { domainCount, datasetCount } = getDatasetTotals();
    const cards = DATASET_DOMAINS.map(buildDomainCard).join('');

    return `<section class="dataset-catalog">
        <div class="ds-catalog-head">
            <div>
                <h3>Dataset Kataloğu</h3>
                <p>Domain bazında tanımlı dataset envanteri</p>
            </div>
            <div class="ds-summary">
                <div class="ds-summary-item">
                    <strong>${domainCount}</strong>
                    <span>domain</span>
                </div>
                <div class="ds-summary-item">
                    <strong>${datasetCount}</strong>
                    <span>dataset</span>
                </div>
            </div>
        </div>
        <div class="domain-grid">${cards}</div>
    </section>`;
}

function buildCockpitColumn({ name, role, theme, datasets }) {
    let doneTasks = 0;
    let totalTasks = 0;
    datasets.forEach(ds => {
        ds.tasks.forEach(t => {
            totalTasks++;
            if (t.status === 'done') doneTasks++;
        });
    });
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const allDone = doneTasks === totalTasks;
    const hasRunning = datasets.some(ds => ds.tasks.some(t => t.status === 'running'));
    const colStatus = allDone ? 'done' : hasRunning ? 'running' : 'waiting';

    const datasetHtml = datasets.map(ds => {
        const dsDone = ds.tasks.every(t => t.status === 'done');
        const dsRunning = ds.tasks.some(t => t.status === 'running');
        const dsStatus = dsDone ? 'done' : dsRunning ? 'running' : 'waiting';
        const tasksHtml = ds.tasks.map(t => `
            <div class="flow-step ${t.status}">
                <span class="flow-icon">${t.status === 'done' ? '✓' : t.status === 'running' ? '◉' : t.status === 'failed' ? '✕' : '○'}</span>
                <span class="flow-label">${t.label}</span>
            </div>`).join('');
        return `
            <article class="dataset-card ${dsStatus}">
                <div class="dataset-head">
                    <strong>${ds.label}</strong>
                    <code>${ds.name}</code>
                </div>
                <div class="task-flow">${tasksHtml}</div>
            </article>`;
    }).join('');

    return `
        <div class="cockpit-col theme-${theme} status-${colStatus}">
            <header class="col-header">
                <div class="col-title">
                    <i class="ti ti-database"></i>
                    <div>
                        <h4>${name}</h4>
                        <span>${role}</span>
                    </div>
                </div>
                <div class="col-meta">
                    <span class="col-pct">${pct}%</span>
                    <span class="col-status-badge">${allDone ? 'Tamam' : hasRunning ? 'Aktif' : 'Bekliyor'}</span>
                </div>
            </header>
            <div class="col-stats">
                <span><strong>${datasets.length}</strong> dataset</span>
                <span><strong>${doneTasks}/${totalTasks}</strong> task</span>
            </div>
            <div class="dataset-list">${datasetHtml}</div>
        </div>`;
}

function buildSurecHTML() {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const columns = COCKPIT_COLUMNS.map(buildCockpitColumn).join('');
    return `<section class="cockpit">
        <div class="cockpit-head">
            <div>
                <h3>Süreç Kokpiti</h3>
                <p>Dataset ve task akışlarının canlı durumu</p>
            </div>
            <div class="cockpit-live">
                <span class="live-dot"></span>
                <span>Canlı</span>
                <time id="cockpitClock">${now}</time>
            </div>
        </div>
        <div class="cockpit-grid">${columns}</div>
    </section>`;
}

function bindSurecCockpit() {
    const clock = document.getElementById('cockpitClock');
    if (!clock) return;
    if (window._cockpitTimer) clearInterval(window._cockpitTimer);
    window._cockpitTimer = setInterval(() => {
        clock.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);
}

async function initSurecCockpit(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    await loadSurecData();
    el.innerHTML = buildSurecHTML();
    bindSurecCockpit();
}

async function initDatasetCatalog(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    if (window._cockpitTimer) {
        clearInterval(window._cockpitTimer);
        window._cockpitTimer = null;
    }
    await loadSurecData();
    el.innerHTML = buildDatasetCatalogHTML();
}

const TASK_STATUS_LABELS = {
    done: 'Tamam',
    running: 'Çalışıyor',
    pending: 'Bekliyor',
    failed: 'Hata'
};

function flattenTaskMappings() {
    const rows = [];
    COCKPIT_COLUMNS.forEach(col => {
        col.datasets.forEach(ds => {
            ds.tasks.forEach((task, idx) => {
                rows.push({
                    layer: col.name,
                    datasetCode: ds.name,
                    datasetLabel: ds.label,
                    task: task.label,
                    taskOrder: idx + 1,
                    status: task.status
                });
            });
        });
    });
    return rows;
}

function taskRowSearchKey(row) {
    const statusLabel = TASK_STATUS_LABELS[row.status] || row.status;
    return [row.layer, row.datasetCode, row.datasetLabel, row.task, statusLabel, row.status]
        .join(' ')
        .toLocaleLowerCase('tr-TR');
}

function renderTaskListesiRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="5" class="tl-empty">Arama kriterine uygun kayıt bulunamadı.</td></tr>';
    }
    return rows.map(row => {
        const statusLabel = TASK_STATUS_LABELS[row.status] || row.status;
        return `<tr>
            <td>${row.layer}</td>
            <td><code>${row.datasetCode}</code></td>
            <td>${row.datasetLabel}</td>
            <td>${row.task}</td>
            <td><span class="tl-badge ${row.status}">${statusLabel}</span></td>
        </tr>`;
    }).join('');
}

function buildTaskListesiHTML() {
    const rows = flattenTaskMappings();
    return `<div class="tl-layout">
        <div class="tl-head">
            <h3>Task Listesi</h3>
            <p>Süreç task'ları ile dataset eşleştirmesi — arama ile filtreleyin.</p>
        </div>
        <div class="tl-card">
            <div class="tl-toolbar">
                <label class="tl-search">
                    <i class="ti ti-search" aria-hidden="true"></i>
                    <input type="search" id="tlSearch" placeholder="Task, dataset veya katman ara…" autocomplete="off">
                </label>
                <span class="tl-count" id="tlCount">${rows.length} kayıt</span>
            </div>
            <div class="tl-scroll">
                <table class="tl-table">
                    <thead>
                        <tr>
                            <th>Katman</th>
                            <th>Dataset Kodu</th>
                            <th>Dataset</th>
                            <th>Task</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody id="tlBody">${renderTaskListesiRows(rows)}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

function bindTaskListesiSearch(container) {
    const root = container || document.getElementById('pageBody');
    if (!root) return;
    const input = root.querySelector('#tlSearch');
    const body = root.querySelector('#tlBody');
    const count = root.querySelector('#tlCount');
    if (!input || !body || !count) return;

    const allRows = flattenTaskMappings();

    function applyFilter() {
        const q = input.value.trim().toLocaleLowerCase('tr-TR');
        const filtered = q
            ? allRows.filter(row => taskRowSearchKey(row).includes(q))
            : allRows;
        body.innerHTML = renderTaskListesiRows(filtered);
        count.textContent = `${filtered.length} / ${allRows.length} kayıt`;
    }

    input.addEventListener('input', applyFilter);
}

async function initTaskListesi(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    if (window._cockpitTimer) {
        clearInterval(window._cockpitTimer);
        window._cockpitTimer = null;
    }
    await loadSurecData();
    el.innerHTML = buildTaskListesiHTML();
    bindTaskListesiSearch(el);
}

function getLayerProgress(col) {
    let done = 0;
    let total = 0;
    col.datasets.forEach(ds => {
        ds.tasks.forEach(t => {
            total++;
            if (t.status === 'done') done++;
        });
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function buildPortalDatasetCardHTML() {
    const { domainCount, datasetCount } = getDatasetTotals();
    const pipelineDatasets = COCKPIT_COLUMNS.reduce((sum, col) => sum + col.datasets.length, 0);

    const layers = COCKPIT_COLUMNS.map(col => {
        const { pct } = getLayerProgress(col);
        const running = col.datasets.some(ds => ds.tasks.some(t => t.status === 'running'));
        const allDone = col.datasets.every(ds => ds.tasks.every(t => t.status === 'done'));
        const statusLabel = allDone ? 'Tamam' : running ? 'Aktif' : 'Bekliyor';
        const statusClass = allDone ? 'done' : running ? 'running' : 'pending';
        return `
            <div class="portal-ds-row">
                <div class="portal-ds-row-head">
                    <strong>${col.name}</strong>
                    <span class="portal-ds-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="portal-ds-meta">${col.datasets.length} dataset · ${pct}% task tamamlandı</div>
                <div class="portal-ds-bar"><div class="portal-ds-fill theme-${col.theme}" style="width:${pct}%"></div></div>
            </div>`;
    }).join('');

    return `
        <div class="dashboard-panel portal-dataset-card">
            <div class="panel-head">
                <h4>Dataset Özeti</h4>
                <a class="portal-ds-link" href="surec.html?view=datasetler">Tümünü gör</a>
            </div>
            <div class="portal-ds-summary">
                <div class="portal-ds-stat">
                    <strong>${pipelineDatasets}</strong>
                    <span>Süreç dataset</span>
                </div>
                <div class="portal-ds-stat">
                    <strong>${datasetCount}</strong>
                    <span>Domain dataset</span>
                </div>
                <div class="portal-ds-stat">
                    <strong>${domainCount}</strong>
                    <span>İş domain</span>
                </div>
            </div>
            <div class="portal-ds-layers">${layers}</div>
            <div class="portal-ds-footer">
                <a href="surec.html?view=datasetler"><i class="ti ti-stack-2"></i> Dataset Kataloğu</a>
                <a href="surec.html?view=task-listesi"><i class="ti ti-list-check"></i> Task Listesi</a>
            </div>
        </div>`;
}

window.initSurecCockpit = initSurecCockpit;
window.initDatasetCatalog = initDatasetCatalog;
window.buildDatasetCatalogHTML = buildDatasetCatalogHTML;
window.buildPortalDatasetCardHTML = buildPortalDatasetCardHTML;
window.initTaskListesi = initTaskListesi;
window.flattenTaskMappings = flattenTaskMappings;
