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
            { label: 'Fon Hareket', stagingTable: 'ds_fon_hareket' },
            { label: 'Fon Limit', stagingTable: 'ds_fon_limit' },
            { label: 'Fon Faiz', stagingTable: 'ds_fon_faiz' },
            { label: 'Fon İzleme', stagingTable: 'ds_fon_izleme' }
        ]
    },
    {
        id: 'hazine',
        name: 'Hazine',
        theme: 'blue',
        datasets: [
            { label: 'Hazine Portföy', stagingTable: 'ds_hazine_portfoy' },
            { label: 'Hazine İşlem', stagingTable: 'ds_hazine_islem' },
            { label: 'Hazine Değerleme', stagingTable: 'ds_hazine_deger' },
            { label: 'Hazine Risk', stagingTable: 'ds_hazine_risk' },
            { label: 'Hazine Mutabakat', stagingTable: 'ds_hazine_mutabakat' }
        ]
    },
    {
        id: 'mevduat',
        name: 'Mevduat',
        theme: 'purple',
        datasets: [
            { label: 'Vadeli Mevduat', stagingTable: 'ds_mevduat_vadeli' },
            { label: 'Vadesiz Mevduat', stagingTable: 'ds_mevduat_vadesiz' },
            { label: 'Mevduat Faiz', stagingTable: 'ds_mevduat_faiz' },
            { label: 'Mevduat Müşteri', stagingTable: 'ds_mevduat_musteri' },
            { label: 'Mevduat Hareket', stagingTable: 'ds_mevduat_hareket' },
            { label: 'Mevduat Rapor', stagingTable: 'ds_mevduat_rapor' }
        ]
    },
    {
        id: 'masraf',
        name: 'Masraf',
        theme: 'amber',
        datasets: [
            { label: 'Masraf Hesap', stagingTable: 'ds_masraf_hesap' },
            { label: 'Masraf Dağıtım', stagingTable: 'ds_masraf_dagitim' },
            { label: 'Masraf Bütçe', stagingTable: 'ds_masraf_butce' },
            { label: 'Masraf Staging', stagingTable: 'ds_masraf_stg' }
        ]
    },
    {
        id: 'reeskont',
        name: 'Reeskont',
        theme: 'rose',
        datasets: [
            { label: 'Reeskont Portföy', stagingTable: 'ds_reeskont_portfoy' },
            { label: 'Reeskont Faiz', stagingTable: 'ds_reeskont_faiz' },
            { label: 'Reeskont Vade', stagingTable: 'ds_reeskont_vade' }
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
        datasets: d.datasets.map(ds => ({
            label: ds.etiket,
            stagingTable: ds.kod || ''
        }))
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

let DATASET_LIST_ROWS = [];
let DATASET_STATUS_ROWS = [];
let datasetPageView = 'katalog';

function getDatasetPageView() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('dsView');
    return view === 'liste' || view === 'statu' ? view : 'katalog';
}

function setDatasetPageView(view) {
    datasetPageView = view;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'datasetler');
    if (view === 'katalog') {
        url.searchParams.delete('dsView');
    } else {
        url.searchParams.set('dsView', view);
    }
    history.replaceState(null, '', url);
}

function buildDatasetViewToolbar(activeView) {
    const tabs = [
        { id: 'katalog', label: 'Katalog', icon: 'ti-layout-grid' },
        { id: 'liste', label: 'Liste', icon: 'ti-list' },
        { id: 'statu', label: 'Statü', icon: 'ti-chart-dots' }
    ];

    const buttons = tabs.map(tab => `
        <button type="button"
            class="ds-view-btn${activeView === tab.id ? ' is-active' : ''}"
            data-ds-view="${tab.id}">
            <i class="ti ${tab.icon}" aria-hidden="true"></i>
            ${tab.label}
        </button>`).join('');

    return `<div class="ds-view-toolbar" role="tablist" aria-label="Dataset görünümü">${buttons}</div>`;
}

function formatDatasetDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('tr-TR');
}

function escapeDatasetHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function statusBadgeClass(status) {
    const key = String(status || '').toLowerCase();
    if (key.includes('tamam') || key.includes('complete') || key.includes('done') || key.includes('aktif')) return 'is-done';
    if (key.includes('devam') || key.includes('progress') || key.includes('running')) return 'is-running';
    if (key.includes('bekl') || key.includes('wait') || key.includes('pending')) return 'is-pending';
    if (key.includes('hata') || key.includes('fail') || key.includes('iptal')) return 'is-failed';
    return 'is-neutral';
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
            <span class="ds-item-staging">${ds.stagingTable || '—'}</span>
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

function buildDatasetSummaryBlocks() {
    const { domainCount, datasetCount } = getDatasetTotals();
    return `
        <div class="ds-summary">
            <div class="ds-summary-item">
                <strong>${domainCount}</strong>
                <span>domain</span>
            </div>
            <div class="ds-summary-item">
                <strong>${datasetCount}</strong>
                <span>dataset</span>
            </div>
        </div>`;
}

function getDatasetPageMeta(activeView) {
    const meta = {
        katalog: ['Dataset Kataloğu', 'Domain bazında tanımlı dataset envanteri'],
        liste: ['Dataset Listesi', 'DOC.TDDataset tablosunun tam listesi'],
        statu: ['Dataset Statü Özeti', 'Data Model ve Statü bazında dataset dağılımı']
    };
    return meta[activeView] || meta.katalog;
}

function buildDatasetPageShell(activeView) {
    const [title, subtitle] = getDatasetPageMeta(activeView);

    return `<section class="dataset-catalog dataset-view-${activeView}">
        <div class="ds-page-head">
            <div class="ds-page-head-text">
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
            <div class="ds-page-head-toolbar">${buildDatasetViewToolbar(activeView)}</div>
            <div class="ds-page-head-summary">${buildDatasetSummaryBlocks()}</div>
        </div>
        <div class="ds-page-content"><div class="ds-loading">Yükleniyor…</div></div>
    </section>`;
}

function updateDatasetPageChrome(shell, activeView) {
    const [title, subtitle] = getDatasetPageMeta(activeView);
    shell.className = `dataset-catalog dataset-view-${activeView}`;

    const textEl = shell.querySelector('.ds-page-head-text');
    if (textEl) {
        textEl.innerHTML = `<h3>${title}</h3><p>${subtitle}</p>`;
    }

    const summaryEl = shell.querySelector('.ds-page-head-summary');
    if (summaryEl) {
        summaryEl.innerHTML = buildDatasetSummaryBlocks();
    }

    shell.querySelectorAll('[data-ds-view]').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-ds-view') === activeView);
    });
}

function buildDatasetContentOnly(activeView) {
    if (activeView === 'liste') {
        return buildDatasetListeContent();
    }
    if (activeView === 'statu') {
        return buildDatasetStatusContent();
    }
    return buildDatasetCatalogContent();
}

function buildDatasetCatalogContent() {
    const cards = DATASET_DOMAINS.map(buildDomainCard).join('');
    return `<div class="domain-grid">${cards}</div>`;
}

function buildDatasetCatalogHTML() {
    return buildDatasetPageShell('katalog').replace(
        '<div class="ds-loading">Yükleniyor…</div>',
        buildDatasetCatalogContent()
    );
}

function buildDatasetListRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="13">Kayıt bulunamadı.</td></tr>';
    }

    return rows.map(row => `
        <tr>
            <td>${escapeDatasetHtml(row.datasetName)}</td>
            <td>${escapeDatasetHtml(row.dataModel)}</td>
            <td>${escapeDatasetHtml(row.stagingTableName)}</td>
            <td>${escapeDatasetHtml(row.layer)}</td>
            <td><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>
            <td>${formatDatasetDate(row.statusChangeDate)}</td>
            <td>${escapeDatasetHtml(row.statusResponsible)}</td>
            <td>${escapeDatasetHtml(row.tdAnalyst)}</td>
            <td>${escapeDatasetHtml(row.tester)}</td>
            <td>${escapeDatasetHtml(row.ktResponsibleItUnit)}</td>
            <td>${escapeDatasetHtml(row.ktSpName || '—')}</td>
            <td>${escapeDatasetHtml(row.descriptionScope || '—')}</td>
            <td>${escapeDatasetHtml(row.note || '—')}</td>
        </tr>`).join('');
}

function buildDatasetListeContent() {
    const count = DATASET_LIST_ROWS.length;

    return `
        <div class="ds-table-card">
            <div class="ds-table-toolbar">
                <label class="ds-table-search">
                    <i class="ti ti-search" aria-hidden="true"></i>
                    <input type="search" id="dsListSearch" placeholder="Dataset, model, staging, statü ara…">
                </label>
                <span class="ds-table-count">${count} kayıt</span>
            </div>
            <div class="ds-table-scroll">
                <table class="ds-table" id="dsListTable">
                    <thead>
                        <tr>
                            <th>Dataset</th>
                            <th>Data Model</th>
                            <th>Staging Tablo</th>
                            <th>Layer</th>
                            <th>Statü</th>
                            <th>Statü Tarihi</th>
                            <th>Statü Sorumlusu</th>
                            <th>TD Analist</th>
                            <th>Tester</th>
                            <th>KT IT Birimi</th>
                            <th>KT SP</th>
                            <th>Kapsam</th>
                            <th>Not</th>
                        </tr>
                    </thead>
                    <tbody>${buildDatasetListRows(DATASET_LIST_ROWS)}</tbody>
                </table>
            </div>
        </div>`;
}

function buildDatasetListeHTML() {
    return buildDatasetPageShell('liste').replace(
        '<div class="ds-loading">Yükleniyor…</div>',
        buildDatasetListeContent()
    );
}

function buildDatasetStatusSummary(rows) {
    const byStatus = new Map();
    rows.forEach(row => {
        const current = byStatus.get(row.status) || 0;
        byStatus.set(row.status, current + row.adet);
    });

    if (!byStatus.size) {
        return '<div class="ds-status-empty">Statü özeti bulunamadı.</div>';
    }

    return Array.from(byStatus.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([status, adet]) => `
            <div class="ds-status-chip ${statusBadgeClass(status)}">
                <strong>${adet}</strong>
                <span>${escapeDatasetHtml(status)}</span>
            </div>`).join('');
}

function buildDatasetStatusModelRows(rows) {
    const models = new Map();

    rows.forEach(row => {
        if (!models.has(row.dataModel)) {
            models.set(row.dataModel, {
                dataModel: row.dataModel,
                toplam: 0,
                sonTarih: null,
                durumlar: []
            });
        }

        const model = models.get(row.dataModel);
        model.toplam += row.adet;
        model.durumlar.push({ status: row.status, adet: row.adet });

        if (row.sonDurumTarihi) {
            const current = model.sonTarih ? new Date(model.sonTarih) : null;
            const next = new Date(row.sonDurumTarihi);
            if (!current || next > current) {
                model.sonTarih = row.sonDurumTarihi;
            }
        }
    });

    const sorted = Array.from(models.values())
        .sort((a, b) => a.dataModel.localeCompare(b.dataModel, 'tr'));

    if (!sorted.length) {
        return '<tr><td colspan="4">Kayıt bulunamadı.</td></tr>';
    }

    return sorted.map(model => {
        const breakdown = model.durumlar
            .sort((a, b) => b.adet - a.adet)
            .map(item => `<span class="ds-status-mini ${statusBadgeClass(item.status)}">${escapeDatasetHtml(item.status)}: ${item.adet}</span>`)
            .join('');

        const latestStatus = model.durumlar
            .slice()
            .sort((a, b) => b.adet - a.adet)[0]?.status || '—';

        return `
            <tr>
                <td>${escapeDatasetHtml(model.dataModel)}</td>
                <td><strong>${model.toplam}</strong></td>
                <td><span class="ds-status-badge ${statusBadgeClass(latestStatus)}">${escapeDatasetHtml(latestStatus)}</span></td>
                <td>${formatDatasetDate(model.sonTarih)}</td>
                <td><div class="ds-status-breakdown">${breakdown}</div></td>
            </tr>`;
    }).join('');
}

function buildDatasetStatusDetailRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="4">Kayıt bulunamadı.</td></tr>';
    }

    return rows.map(row => `
        <tr>
            <td>${escapeDatasetHtml(row.dataModel)}</td>
            <td><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>
            <td><strong>${row.adet}</strong></td>
            <td>${formatDatasetDate(row.sonDurumTarihi)}</td>
        </tr>`).join('');
}

function buildDatasetStatusContent() {
    return `
        <div class="ds-status-summary">${buildDatasetStatusSummary(DATASET_STATUS_ROWS)}</div>
        <div class="ds-table-card">
            <div class="ds-table-toolbar">
                <h4>Data Model Özeti</h4>
            </div>
            <div class="ds-table-scroll">
                <table class="ds-table">
                    <thead>
                        <tr>
                            <th>Data Model</th>
                            <th>Toplam</th>
                            <th>Önde Gelen Statü</th>
                            <th>Son Durum Tarihi</th>
                            <th>Statü Dağılımı</th>
                        </tr>
                    </thead>
                    <tbody>${buildDatasetStatusModelRows(DATASET_STATUS_ROWS)}</tbody>
                </table>
            </div>
        </div>
        <div class="ds-table-card">
            <div class="ds-table-toolbar">
                <h4>Data Model × Statü Detayı</h4>
            </div>
            <div class="ds-table-scroll">
                <table class="ds-table">
                    <thead>
                        <tr>
                            <th>Data Model</th>
                            <th>Statü</th>
                            <th>Adet</th>
                            <th>Son Durum Tarihi</th>
                        </tr>
                    </thead>
                    <tbody>${buildDatasetStatusDetailRows(DATASET_STATUS_ROWS)}</tbody>
                </table>
            </div>
        </div>`;
}

function buildDatasetStatusHTML() {
    return buildDatasetPageShell('statu').replace(
        '<div class="ds-loading">Yükleniyor…</div>',
        buildDatasetStatusContent()
    );
}

async function loadDatasetListData() {
    if (typeof ApiClient === 'undefined') return;
    try {
        const items = await ApiClient.getSurecDatasetListe();
        DATASET_LIST_ROWS = (items || []).map(item => ({
            datasetName: item.datasetName || '',
            descriptionScope: item.descriptionScope || '',
            layer: item.layer || '',
            stagingTableName: item.stagingTableName || '',
            ktResponsibleItUnit: item.ktResponsibleItUnit || '',
            note: item.note || '',
            tdAnalyst: item.tdAnalyst || '',
            tester: item.tester || '',
            dataModel: item.dataModel || '',
            ktSpName: item.ktSpName || '',
            status: item.status || '',
            statusResponsible: item.statusResponsible || '',
            statusChangeDate: item.statusChangeDate || null
        }));
    } catch (err) {
        console.warn('Dataset liste API\'den yüklenemedi:', err.message);
        DATASET_LIST_ROWS = [];
    }
}

async function loadDatasetStatusData() {
    if (typeof ApiClient === 'undefined') return;
    try {
        const items = await ApiClient.getSurecDatasetStatus();
        DATASET_STATUS_ROWS = (items || []).map(item => ({
            dataModel: item.dataModel || '',
            status: item.status || '',
            adet: item.adet || 0,
            sonDurumTarihi: item.sonDurumTarihi || null
        }));
    } catch (err) {
        console.warn('Dataset statü API\'den yüklenemedi:', err.message);
        DATASET_STATUS_ROWS = [];
    }
}

function bindDatasetListSearch(root) {
    const input = root.querySelector('#dsListSearch');
    const tbody = root.querySelector('#dsListTable tbody');
    const countEl = root.querySelector('.ds-table-count');
    if (!input || !tbody) return;

    input.addEventListener('input', () => {
        const term = input.value.trim().toLowerCase();
        const filtered = !term
            ? DATASET_LIST_ROWS
            : DATASET_LIST_ROWS.filter(row =>
                [row.datasetName, row.dataModel, row.stagingTableName, row.status, row.layer, row.tdAnalyst, row.tester]
                    .some(value => String(value || '').toLowerCase().includes(term))
            );

        tbody.innerHTML = buildDatasetListRows(filtered);
        if (countEl) {
            countEl.textContent = `${filtered.length} kayıt`;
        }
    });
}

function bindDatasetViewToolbar(root) {
    const shell = root.querySelector('.dataset-catalog');
    if (!shell || shell.dataset.toolbarBound === '1') return;
    shell.dataset.toolbarBound = '1';

    shell.addEventListener('click', async event => {
        const btn = event.target.closest('[data-ds-view]');
        if (!btn) return;

        const nextView = btn.getAttribute('data-ds-view');
        if (!nextView || nextView === datasetPageView) return;

        setDatasetPageView(nextView);
        await renderDatasetPage(root);
    });
}

async function renderDatasetPage(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;

    let shell = el.querySelector('.dataset-catalog');
    if (!shell) {
        el.innerHTML = buildDatasetPageShell(datasetPageView);
        shell = el.querySelector('.dataset-catalog');
        bindDatasetViewToolbar(el);
    } else {
        updateDatasetPageChrome(shell, datasetPageView);
    }

    const contentEl = shell.querySelector('.ds-page-content');
    if (contentEl) {
        contentEl.innerHTML = '<div class="ds-loading">Yükleniyor…</div>';
    }

    if (datasetPageView === 'liste') {
        await Promise.all([loadDatasetCatalogData(), loadDatasetListData()]);
    } else if (datasetPageView === 'statu') {
        await Promise.all([loadDatasetCatalogData(), loadDatasetStatusData()]);
    } else {
        await loadDatasetCatalogData();
    }

    updateDatasetPageChrome(shell, datasetPageView);

    if (contentEl) {
        contentEl.innerHTML = buildDatasetContentOnly(datasetPageView);
    }

    if (datasetPageView === 'liste') {
        bindDatasetListSearch(shell);
    }
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
    datasetPageView = getDatasetPageView();
    await renderDatasetPage(el);
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

function buildPortalDatasetCardHTML(surecOzet) {
    const datasetFromApi = surecOzet?.dataset;
    const gunlukFromApi = surecOzet?.gunlukAkis;
    const useApi = !!(datasetFromApi?.basarili || gunlukFromApi?.basarili);

    const fallbackTotals = getDatasetTotals();
    const domainCount = useApi && datasetFromApi?.domainSayisi != null
        ? datasetFromApi.domainSayisi
        : fallbackTotals.domainCount;
    const datasetCount = useApi && datasetFromApi?.datasetSayisi != null
        ? datasetFromApi.datasetSayisi
        : fallbackTotals.datasetCount;

    const layerSource = useApi && gunlukFromApi?.katmanlar?.length
        ? gunlukFromApi.katmanlar.map(k => ({
            name: k.katmanKodu,
            theme: k.tema || 'blue',
            paketSayisi: k.paketSayisi ?? 0,
            tamamlanmaYuzdesi: k.tamamlanmaYuzdesi ?? 0,
            durum: k.durum
        }))
        : COCKPIT_COLUMNS.map(col => {
            const { pct } = getLayerProgress(col);
            const running = col.datasets.some(ds => ds.tasks.some(t => t.status === 'running'));
            const failed = col.datasets.some(ds => ds.tasks.some(t => t.status === 'failed'));
            const allDone = col.datasets.length > 0 && col.datasets.every(ds => ds.tasks.every(t => t.status === 'done'));
            return {
                name: col.name,
                theme: col.theme,
                paketSayisi: col.paketSayisi ?? 0,
                tamamlanmaYuzdesi: pct,
                durum: failed ? 'failed' : allDone ? 'done' : running ? 'running' : 'pending'
            };
        });

    const statusLabels = {
        done: 'Tamam',
        running: 'Aktif',
        failed: 'Hata',
        pending: 'Bekliyor'
    };

    const layers = layerSource.map(col => {
        const pct = col.tamamlanmaYuzdesi ?? 0;
        const statusClass = col.durum || 'pending';
        const statusLabel = statusLabels[statusClass] || 'Bekliyor';
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

    const veriTarihiLabel = gunlukFromApi?.veriTarihi
        ? formatDatasetDate(gunlukFromApi.veriTarihi)
        : '';
    const akisMeta = useApi && gunlukFromApi
        ? `<span class="portal-ds-head-meta">${veriTarihiLabel ? veriTarihiLabel + ' · ' : ''}${gunlukFromApi.basariliAdimSayisi ?? 0} başarılı · ${gunlukFromApi.devamEdenAdimSayisi ?? 0} devam · ${gunlukFromApi.hataliAdimSayisi ?? 0} hata</span>`
        : '';

    return `
        <div class="dashboard-panel portal-dataset-card">
            <div class="panel-head">
                <h4>Günlük Akış Özeti</h4>
                <div class="portal-ds-head-links">
                    ${akisMeta}
                    <a class="portal-ds-link" href="surec.html">Günlük Akış</a>
                </div>
            </div>
            <div class="portal-ds-summary">
                <div class="portal-ds-stat">
                    <strong>${domainCount}</strong>
                    <span>İş domain</span>
                </div>
                <div class="portal-ds-stat">
                    <strong>${datasetCount}</strong>
                    <span>Katalog dataset</span>
                </div>
                <div class="portal-ds-stat">
                    <strong>${gunlukFromApi?.tamamlanmaYuzdesi ?? 0}%</strong>
                    <span>ETL tamamlanma</span>
                </div>
            </div>
            <div class="portal-ds-layers">${layers || '<p class="portal-empty-hint">Katman verisi yok.</p>'}</div>
            <div class="portal-ds-footer">
                <a href="surec.html?view=datasetler"><i class="ti ti-stack-2"></i> Datasetler</a>
                <a href="surec.html"><i class="ti ti-timeline"></i> Günlük Akış</a>
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
