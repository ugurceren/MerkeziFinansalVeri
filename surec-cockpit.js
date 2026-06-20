const COCKPIT_COLUMNS_FALLBACK = [
    {
        name: 'TDSTG.STG',
        role: 'Staging — ham veri katmanı',
        theme: 'cyan',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        datasets: []
    },
    {
        name: 'TDSTG.LND',
        role: 'Landing — ham veri yükleme',
        theme: 'teal',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        datasets: []
    },
    {
        name: 'TDMAIN',
        role: 'Ana veri — kurumsal çekirdek',
        theme: 'blue',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        datasets: []
    },
    {
        name: 'TDREPORT',
        role: 'Raporlama — analitik katman',
        theme: 'purple',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        datasets: []
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
let gunlukAkisDataDate = null;

function getDefaultGunlukAkisDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
}

function getGunlukAkisDate() {
    return gunlukAkisDataDate || getDefaultGunlukAkisDate();
}

function mapDatasetKatalog(domainler) {
    return domainler.map(d => ({
        id: d.domainId,
        name: d.ad,
        theme: d.tema,
        datasets: d.datasets.map(ds => ({ name: ds.kod, label: ds.etiket }))
    }));
}

async function loadDatasetCatalogData() {
    if (typeof ApiClient === 'undefined') return;
    try {
        const katalog = await ApiClient.getSurecDatasetKatalog();
        if (katalog?.length) {
            DATASET_DOMAINS = mapDatasetKatalog(katalog);
        }
    } catch (err) {
        console.warn('Dataset katalog API\'den yüklenemedi, yerel veri kullanılıyor:', err.message);
        DATASET_DOMAINS = DATASET_DOMAINS_FALLBACK;
    }
}

async function loadSurecData(options = {}) {
    if (typeof ApiClient === 'undefined') return;
    const dataDate = options.dataDate ?? getGunlukAkisDate();
    gunlukAkisDataDate = dataDate;
    try {
        const kokpit = await ApiClient.getSurecKokpit({ dataDate });
        if (kokpit?.length) {
            COCKPIT_COLUMNS = kokpit.map(k => ({
                name: k.katmanKodu,
                role: k.rol,
                theme: k.tema,
                paketSayisi: k.paketSayisi ?? 0,
                basariliAdimSayisi: k.basariliAdimSayisi ?? 0,
                tamamlanmaYuzdesi: k.tamamlanmaYuzdesi ?? 0,
                datasets: k.datasets.map(d => ({
                    name: d.kod,
                    label: d.etiket,
                    tasks: d.gorevler.map(g => ({
                        label: g.etiket,
                        status: g.durum,
                        statusText: g.durumMetni || 'Not Started'
                    }))
                }))
            }));
        }
        if (!options.kokpitOnly) {
            await loadDatasetCatalogData();
        }
    } catch (err) {
        console.warn('Süreç verisi API\'den yüklenemedi, yerel veri kullanılıyor:', err.message);
        COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
        if (!options.kokpitOnly) {
            DATASET_DOMAINS = DATASET_DOMAINS_FALLBACK;
        }
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

function buildCockpitColumn({ name, role, theme, datasets, paketSayisi, tamamlanmaYuzdesi }) {
    const pct = tamamlanmaYuzdesi ?? 0;
    const allDone = pct >= 100;
    const hasRunning = datasets.some(ds => ds.tasks.some(t => t.status === 'running'));
    const hasFailed = datasets.some(ds => ds.tasks.some(t => t.status === 'failed'));
    const colStatus = hasFailed ? 'failed' : allDone ? 'done' : hasRunning ? 'running' : 'waiting';

    const datasetHtml = datasets.length
        ? datasets.map(ds => {
            const dsDone = ds.tasks.length > 0 && ds.tasks.every(t => t.status === 'done');
            const dsRunning = ds.tasks.some(t => t.status === 'running');
            const dsFailed = ds.tasks.some(t => t.status === 'failed');
            const dsStatus = dsFailed ? 'failed' : dsDone ? 'done' : dsRunning ? 'running' : 'waiting';
            const tasksHtml = ds.tasks.map(t => `
            <div class="flow-step ${t.status}">
                <span class="flow-status-text">${t.statusText || 'Not Started'}</span>
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
        }).join('')
        : '<div class="cockpit-empty">Bu katmanda kayıt bulunamadı.</div>';

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
                    <span class="col-pct-caption">Tamamlanma</span>
                    <span class="col-status-badge">${hasFailed ? 'Hata' : allDone ? 'Tamam' : hasRunning ? 'Aktif' : 'Bekliyor'}</span>
                </div>
            </header>
            <div class="col-stats">
                <span><strong>${paketSayisi ?? 0}</strong> paket</span>
            </div>
            <div class="dataset-list">${datasetHtml}</div>
        </div>`;
}

function buildSurecHTML() {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dataDate = getGunlukAkisDate();
    const columns = COCKPIT_COLUMNS.map(buildCockpitColumn).join('');
    return `<section class="cockpit">
        <div class="cockpit-head">
            <div>
                <h3>Günlük Akış</h3>
                <p>ETLLoad tabanlı dataset adım durumları</p>
            </div>
            <div class="cockpit-head-actions">
                <label class="cockpit-date-filter">
                    <span>Veri Tarihi</span>
                    <input type="date" id="cockpitDataDate" value="${dataDate}" aria-label="Veri tarihi">
                </label>
                <div class="cockpit-live">
                    <span class="live-dot"></span>
                    <span>Canlı</span>
                    <time id="cockpitClock">${now}</time>
                </div>
            </div>
        </div>
        <div class="cockpit-grid">${columns}</div>
    </section>`;
}

function bindSurecCockpitDateFilter(container) {
    const root = container || document.getElementById('pageBody');
    if (!root) return;
    const input = root.querySelector('#cockpitDataDate');
    if (!input || input.dataset.bound === '1') return;
    input.dataset.bound = '1';

    input.addEventListener('change', async () => {
        if (!input.value) return;
        gunlukAkisDataDate = input.value;
        root.innerHTML = '<div class="cockpit-loading">Yükleniyor…</div>';
        await loadSurecData({ dataDate: input.value, kokpitOnly: true });
        root.innerHTML = buildSurecHTML();
        bindSurecCockpit();
        bindSurecCockpitDateFilter(root);
    });
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
    if (!gunlukAkisDataDate) {
        gunlukAkisDataDate = getDefaultGunlukAkisDate();
    }
    await loadSurecData({ dataDate: gunlukAkisDataDate, kokpitOnly: true });
    el.innerHTML = buildSurecHTML();
    bindSurecCockpit();
    bindSurecCockpitDateFilter(el);
}

async function initDatasetCatalog(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    if (window._cockpitTimer) {
        clearInterval(window._cockpitTimer);
        window._cockpitTimer = null;
    }
    await loadDatasetCatalogData();
    el.innerHTML = buildDatasetCatalogHTML();
}

const TASK_STATUS_LABELS = {
    done: 'Tamam',
    running: 'Çalışıyor',
    pending: 'Bekliyor',
    failed: 'Hata'
};

let TASK_LIST_ROWS = [];

function mapTaskListesiRows(items) {
    return items.map(item => ({
        layer: item.katman || '—',
        datasetCode: item.datasetKod || '',
        datasetLabel: item.datasetEtiket || item.datasetKod || '',
        task: item.etiket || '',
        loadPeriodType: item.yuklemePeriyodu || '—',
        transferTypeId: item.transferTypeId,
        transferType: item.transferTipi || '—',
        status: item.durum || 'pending'
    }));
}

function formatTransferTypeCell(row) {
    if (row.transferTypeId != null && row.transferType && row.transferType !== '—') {
        return `<code>${row.transferTypeId}</code> ${row.transferType}`;
    }
    if (row.transferTypeId != null) {
        return `<code>${row.transferTypeId}</code>`;
    }
    return row.transferType || '—';
}

function buildTaskListRowsFromCockpit() {
    const rows = [];
    COCKPIT_COLUMNS.forEach(col => {
        col.datasets.forEach(ds => {
            ds.tasks.forEach((task, idx) => {
                rows.push({
                    layer: col.name,
                    datasetCode: ds.name,
                    datasetLabel: ds.label,
                    task: task.label,
                    loadPeriodType: '—',
                    taskOrder: idx + 1,
                    status: task.status
                });
            });
        });
    });
    return rows;
}

async function loadTaskListesiData() {
    if (typeof ApiClient === 'undefined') return;
    try {
        const items = await ApiClient.getTaskListesi();
        if (items?.length) {
            TASK_LIST_ROWS = mapTaskListesiRows(items);
        } else {
            TASK_LIST_ROWS = [];
        }
    } catch (err) {
        console.warn('Paket listesi API\'den yüklenemedi, yerel veri kullanılıyor:', err.message);
        if (!COCKPIT_COLUMNS.length) {
            COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
        }
        TASK_LIST_ROWS = buildTaskListRowsFromCockpit();
    }
}

function getTaskListRows() {
    return TASK_LIST_ROWS.length ? TASK_LIST_ROWS : buildTaskListRowsFromCockpit();
}

function taskRowSearchKey(row) {
    const statusLabel = TASK_STATUS_LABELS[row.status] || row.status;
    return [row.layer, row.datasetCode, row.datasetLabel, row.task, row.loadPeriodType, row.transferTypeId, row.transferType, statusLabel, row.status]
        .join(' ')
        .toLocaleLowerCase('tr-TR');
}

function renderTaskListesiRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="7" class="tl-empty">Arama kriterine uygun kayıt bulunamadı.</td></tr>';
    }
    return rows.map(row => {
        const statusLabel = TASK_STATUS_LABELS[row.status] || row.status;
        return `<tr>
            <td>${row.layer}</td>
            <td><code>${row.datasetCode}</code></td>
            <td>${row.datasetLabel}</td>
            <td>${row.task}</td>
            <td>${row.loadPeriodType}</td>
            <td>${formatTransferTypeCell(row)}</td>
            <td><span class="tl-badge ${row.status}">${statusLabel}</span></td>
        </tr>`;
    }).join('');
}

function buildTaskListesiHTML() {
    const rows = getTaskListRows();
    return `<div class="tl-layout">
        <div class="tl-head">
            <h3>Paket Listesi</h3>
            <p>ParallelRun paket envanteri — arama ile filtreleyin.</p>
        </div>
        <div class="tl-card">
            <div class="tl-toolbar">
                <label class="tl-search">
                    <i class="ti ti-search" aria-hidden="true"></i>
                    <input type="search" id="tlSearch" placeholder="Paket, dataset, katman, transfer tipi veya yükleme periyodu ara…" autocomplete="off">
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
                            <th>Yükleme Periyodu</th>
                            <th>Transfer Tipi</th>
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

    const allRows = getTaskListRows();

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
    await loadTaskListesiData();
    el.innerHTML = buildTaskListesiHTML();
    bindTaskListesiSearch(el);
}

function getLayerProgress(col) {
    if (col.tamamlanmaYuzdesi != null) {
        return {
            done: col.basariliAdimSayisi ?? 0,
            total: col.paketSayisi ?? 0,
            pct: col.tamamlanmaYuzdesi ?? 0
        };
    }

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
                <div class="portal-ds-meta">${col.paketSayisi ?? 0} paket · ${pct}% tamamlanma</div>
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
                <a href="surec.html?view=task-listesi"><i class="ti ti-list-check"></i> Paket Listesi</a>
            </div>
        </div>`;
}

window.initSurecCockpit = initSurecCockpit;
window.initDatasetCatalog = initDatasetCatalog;
window.buildDatasetCatalogHTML = buildDatasetCatalogHTML;
window.buildPortalDatasetCardHTML = buildPortalDatasetCardHTML;
window.initTaskListesi = initTaskListesi;
window.getTaskListRows = getTaskListRows;
