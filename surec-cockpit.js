const COCKPIT_COLUMNS_FALLBACK = [
    {
        name: 'TDSTG',
        role: 'Staging — ham veri katmanı',
        theme: 'cyan',
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

let COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
let DATASET_DOMAINS = [];
let gunlukAkisDataDate = null;
/** 'default' | 'mizan' — Mizan sayfası akış render modu */
let cockpitRenderMode = 'default';
/** Boş = tüm paketler görünür; dolu = yalnızca seçili statüler */
let COCKPIT_GLOBAL_STATUS_FILTERS = new Set();
/** Yalnızca TDSTG kolonu — LND Failed / LND Completed */
let COCKPIT_TDSTG_LND_FILTERS = new Set();

const COCKPIT_FILTER_STG = [
    { key: 'Not Started', label: 'Not Started', className: 'is-not-started' },
    { key: 'In Progress', label: 'In Progress', className: 'is-running' },
    { key: 'Failed', label: 'Failed', className: 'is-failed' },
    { key: 'Success', label: 'Success', className: 'is-done' }
];

const COCKPIT_FILTER_LND = [
    { key: 'LND Failed', label: 'LND Failed', className: 'is-lnd-failed' },
    { key: 'LND Completed', label: 'LND Completed', className: 'is-lnd-done' }
];

function getGlobalFilterOptions() {
    return COCKPIT_FILTER_STG;
}

function getFilterStatusesForColumn(columnName) {
    return COCKPIT_FILTER_STG;
}

function mapKokpitKatmanlar(kokpit) {
    return (kokpit || []).map(k => ({
        name: k.katmanKodu,
        role: k.rol,
        theme: k.tema,
        paketSayisi: k.paketSayisi ?? 0,
        basariliAdimSayisi: k.basariliAdimSayisi ?? 0,
        tamamlanmaYuzdesi: k.tamamlanmaYuzdesi ?? 0,
        datasets: (k.datasets || []).map(d => ({
            name: d.kod,
            label: d.etiket,
            targetTableName: d.etiket || d.kod,
            tasks: (d.gorevler || []).map(g => ({
                label: g.etiket,
                status: g.durum,
                statusText: g.durumMetni || 'Not Started',
                recordCount: g.kayitSayisi ?? null,
                errorMessage: g.hataMesaji || null
            })),
            lndTasks: (d.lndGorevler || []).map(g => ({
                label: g.etiket,
                status: g.durum,
                statusText: g.durumMetni || 'Not Started',
                recordCount: g.kayitSayisi ?? null,
                errorMessage: g.hataMesaji || null
            }))
        }))
    }));
}

function formatFlowRecordCount(value) {
    if (value === null || value === undefined) return '';
    const num = Number(value);
    if (Number.isNaN(num)) return '';
    return `${num.toLocaleString('tr-TR')} kayıt`;
}

function resetCockpitStatusFilters() {
    COCKPIT_GLOBAL_STATUS_FILTERS = new Set();
    COCKPIT_TDSTG_LND_FILTERS = new Set();
}

function isGlobalFilterActive() {
    return COCKPIT_GLOBAL_STATUS_FILTERS.size > 0;
}

function isTdStgLndFilterActive() {
    return COCKPIT_TDSTG_LND_FILTERS.size > 0;
}

function isColumnFilterActive(layerName) {
    if (layerName === 'TDSTG') {
        return isGlobalFilterActive() || isTdStgLndFilterActive();
    }
    return isGlobalFilterActive();
}

function resolveTdStgStgFilterStatus(ds) {
    const tasks = ds.tasks || [];
    if (!tasks.length) return 'Not Started';
    if (tasks.some(t => t.status === 'failed')) return 'Failed';
    if (tasks.every(t => t.status === 'done')) return 'Success';
    if (tasks.some(t => t.status === 'running')) return 'In Progress';
    return 'Not Started';
}

function resolveTdStgLndFilterStatus(ds) {
    const tasks = ds.tasks || [];
    if (!isStgPhaseComplete(tasks) || !ds.lndTasks?.length) return null;
    const lndActive = resolveActiveFlowLabel(ds.lndTasks);
    if (lndActive === 'LND Failed' || lndActive === 'LND Completed') {
        return lndActive;
    }
    return null;
}

function isTdStgDatasetVisible(ds) {
    const stgFilterOn = isGlobalFilterActive();
    const lndFilterOn = isTdStgLndFilterActive();
    if (!stgFilterOn && !lndFilterOn) return true;

    let visible = true;
    if (stgFilterOn) {
        visible = COCKPIT_GLOBAL_STATUS_FILTERS.has(resolveTdStgStgFilterStatus(ds));
    }
    if (lndFilterOn) {
        const lndStatus = resolveTdStgLndFilterStatus(ds);
        visible = visible && lndStatus !== null && COCKPIT_TDSTG_LND_FILTERS.has(lndStatus);
    }
    return visible;
}

function resolveTaskFilterStatus(task) {
    if (task.statusText === 'LND Failed' || task.statusText === 'LND Completed') {
        return task.statusText;
    }
    if (task.status === 'failed') return 'Failed';
    if (task.status === 'done') return 'Success';
    if (task.status === 'running') return 'In Progress';
    return 'Not Started';
}

function isTaskVisible(task) {
    if (!isGlobalFilterActive()) return true;
    return COCKPIT_GLOBAL_STATUS_FILTERS.has(resolveTaskFilterStatus(task));
}

function isDatasetVisible(ds, layerName) {
    if (layerName === 'TDSTG') {
        return isTdStgDatasetVisible(ds);
    }
    if (!isGlobalFilterActive()) return true;
    return COCKPIT_GLOBAL_STATUS_FILTERS.has(resolveDatasetFilterStatus(ds, layerName));
}

function isStgPhaseComplete(tasks) {
    return (tasks || []).length > 0 && tasks.every(task => task.status === 'done');
}

function isProcessFlowLayer(layerName) {
    return layerName === 'TDSTG' || layerName === 'TDMAIN' || layerName === 'TDREPORT';
}

function resolveDatasetCardStatus(ds, layerName) {
    const status = resolveDatasetFilterStatus(ds, layerName);
    if (status === 'Failed' || status === 'LND Failed') return 'failed';
    if (status === 'Success' || status === 'LND Completed') return 'done';
    if (status === 'In Progress') return 'running';
    return 'waiting';
}

function resolveDatasetFilterStatus(ds, layerName) {
    if (['STG', 'LND', 'COR'].includes(layerName)) {
        const tasks = ds.tasks || [];
        if (!tasks.length) return 'Not Started';
        if (tasks.some(t => t.status === 'failed')) return 'Failed';
        if (tasks.every(t => t.status === 'done')) return 'Success';
        if (tasks.some(t => t.status === 'running')) return 'In Progress';
        return 'Not Started';
    }

    const tasks = ds.tasks || [];
    const stgActive = resolveActiveFlowLabel(tasks);

    if (layerName !== 'TDSTG' || !ds.lndTasks?.length) {
        return stgActive;
    }

    if (!isStgPhaseComplete(tasks)) {
        return stgActive;
    }

    const lndActive = resolveActiveFlowLabel(ds.lndTasks);
    if (lndActive === 'Not Started') {
        return 'Success';
    }

    return lndActive;
}

function countGlobalDatasetStatuses() {
    const options = getGlobalFilterOptions();
    const counts = Object.fromEntries(options.map(item => [item.key, 0]));

    COCKPIT_COLUMNS.forEach(col => {
        (col.datasets || []).forEach(ds => {
            if (col.name === 'TDSTG') {
                const status = resolveTdStgStgFilterStatus(ds);
                if (Object.prototype.hasOwnProperty.call(counts, status)) {
                    counts[status] += 1;
                }
                return;
            }

            if (isProcessFlowLayer(col.name)) {
                const status = resolveDatasetFilterStatus(ds, col.name);
                if (Object.prototype.hasOwnProperty.call(counts, status)) {
                    counts[status] += 1;
                }
                return;
            }

            (ds.tasks || []).forEach(task => {
                const status = resolveTaskFilterStatus(task);
                if (Object.prototype.hasOwnProperty.call(counts, status)) {
                    counts[status] += 1;
                }
            });
        });
    });

    return counts;
}

function countTdStgLndStatuses() {
    const counts = Object.fromEntries(COCKPIT_FILTER_LND.map(item => [item.key, 0]));
    const tdStg = COCKPIT_COLUMNS.find(col => col.name === 'TDSTG');
    (tdStg?.datasets || []).forEach(ds => {
        const status = resolveTdStgLndFilterStatus(ds);
        if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status] += 1;
        }
    });
    return counts;
}

function countVisibleDatasetStatuses(datasets, layerName) {
    const statuses = getFilterStatusesForColumn(layerName);
    const counts = Object.fromEntries(statuses.map(item => [item.key, 0]));
    const isLedgerLayer = ['STG', 'LND', 'COR'].includes(layerName);

    (datasets || []).forEach(ds => {
        if (isLedgerLayer) {
            (ds.tasks || []).filter(isTaskVisible).forEach(task => {
                const status = resolveTaskFilterStatus(task);
                if (Object.prototype.hasOwnProperty.call(counts, status)) {
                    counts[status] += 1;
                }
            });
            return;
        }

        if (!isDatasetVisible(ds, layerName)) return;

        const status = layerName === 'TDSTG'
            ? resolveTdStgStgFilterStatus(ds)
            : resolveDatasetFilterStatus(ds, layerName);
        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status] += 1;
        }
    });

    return counts;
}

function buildGlobalStatusFiltersHtml() {
    const counts = countGlobalDatasetStatuses();
    const chips = getGlobalFilterOptions().map(({ key, label, className }) => {
        const count = counts[key] || 0;
        const checked = COCKPIT_GLOBAL_STATUS_FILTERS.has(key);
        return `
            <label class="cockpit-status-chip ${className}">
                <input type="checkbox" data-status="${key}" ${checked ? 'checked' : ''} aria-label="${label} filtre">
                <span>${label}</span>
                <strong>${count}</strong>
            </label>`;
    }).join('');

    return `<div class="cockpit-global-filters" role="group" aria-label="Statü filtresi">${chips}</div>`;
}

function buildTdStgLndFiltersHtml() {
    const counts = countTdStgLndStatuses();
    const chips = COCKPIT_FILTER_LND.map(({ key, label, className }) => {
        const count = counts[key] || 0;
        const checked = COCKPIT_TDSTG_LND_FILTERS.has(key);
        return `
            <label class="cockpit-status-chip ${className}">
                <input type="checkbox" data-lnd-status="${key}" ${checked ? 'checked' : ''} aria-label="${label} filtre">
                <span>${label}</span>
                <strong>${count}</strong>
            </label>`;
    }).join('');

    return `<div class="col-status-checkboxes cockpit-tdstg-lnd-filters" role="group" aria-label="LND statü filtresi">${chips}</div>`;
}

function getVisiblePaketCount(datasets, layerName) {
    if (['STG', 'LND', 'COR'].includes(layerName)) {
        return (datasets || []).reduce(
            (sum, ds) => sum + (ds.tasks || []).filter(isTaskVisible).length,
            0
        );
    }
    return (datasets || []).filter(ds => isDatasetVisible(ds, layerName)).length;
}

function buildColumnStatusSummaryText(counts, columnName) {
    const parts = getFilterStatusesForColumn(columnName)
        .map(({ key }) => ({ label: key, count: counts[key] || 0 }))
        .filter(part => part.count > 0)
        .map(part => `${part.count} ${part.label}`);
    return parts.length ? parts.join(', ') : 'Kayıt yok';
}

function buildSingleStatusFlowHtml(layerName, ds) {
    const status = resolveDatasetFilterStatus(ds, layerName);
    const statusClass = {
        'Not Started': 'not-started',
        'In Progress': 'running',
        'Failed': 'failed',
        'Success': 'done',
        'LND Failed': 'failed lnd-failed',
        'LND Completed': 'done lnd-done'
    }[status] || 'not-started';

    return `<div class="task-flow task-flow-single">
        <div class="flow-step is-active ${statusClass}">
            <span class="flow-status-text">${escapeDatasetHtml(status)}</span>
        </div>
    </div>`;
}

function renderCockpitDatasetsHtml(layerName, datasets) {
    const isTdStg = layerName === 'TDSTG';
    const isLedgerLayer = ['STG', 'LND', 'COR'].includes(layerName);
    const visible = (datasets || []).filter(ds => {
        if (isLedgerLayer) {
            const tasks = (ds.tasks || []).filter(isTaskVisible);
            return tasks.length > 0;
        }
        return isDatasetVisible(ds, layerName);
    });

    if (!visible.length) {
        if (!datasets?.length) {
            return '<div class="cockpit-empty">Bu katmanda kayıt bulunamadı.</div>';
        }
        return '<div class="cockpit-empty cockpit-filter-empty">Seçili statülere uygun kayıt yok.</div>';
    }

    return visible.map(ds => {
        const visibleTasks = isLedgerLayer ? (ds.tasks || []).filter(isTaskVisible) : (ds.tasks || []);

        let flowHtml;
        if (isLedgerLayer) {
            const rowTasks = [...visibleTasks, ...(ds.lndTasks || [])];
            const tasksHtml = visibleTasks.map(t => buildFlowStepHtml(layerName, t, rowTasks)).join('');
            const flowClass = cockpitRenderMode === 'mizan'
                ? 'task-flow task-flow-mizan'
                : 'task-flow task-flow-ledger';
            flowHtml = `<div class="${flowClass}">${tasksHtml}</div>`;
        } else if (isProcessFlowLayer(layerName)) {
            flowHtml = buildSingleStatusFlowHtml(layerName, ds);
        } else {
            const rowTasks = [...visibleTasks, ...(ds.lndTasks || [])];
            const tasksHtml = visibleTasks.map(t => buildFlowStepHtml(layerName, t, rowTasks)).join('');
            const lndTasksHtml = isTdStg && ds.lndTasks?.length
                ? ds.lndTasks.map(t => buildFlowStepHtml(layerName, t, rowTasks)).join('')
                : '';
            const flowClass = isTdStg ? 'task-flow task-flow-tdstg' : 'task-flow';
            flowHtml = `<div class="${flowClass}">${tasksHtml}${lndTasksHtml}</div>`;
        }

        const dsStatus = isProcessFlowLayer(layerName)
            ? resolveDatasetCardStatus(ds, layerName)
            : (() => {
                const dsDone = visibleTasks.length > 0 && visibleTasks.every(t => t.status === 'done')
                    && (!ds.lndTasks?.length || ds.lndTasks.every(t => t.status === 'done' || t.status === 'not-started'));
                const dsRunning = visibleTasks.some(t => t.status === 'running')
                    || (ds.lndTasks || []).some(t => t.status === 'running');
                const dsFailed = visibleTasks.some(t => t.status === 'failed')
                    || (ds.lndTasks || []).some(t => t.status === 'failed');
                return dsFailed ? 'failed' : dsDone ? 'done' : dsRunning ? 'running' : 'waiting';
            })();

        return `
            <article class="dataset-card ${dsStatus}">
                <div class="dataset-head">
                    <strong>${ds.targetTableName || ds.label || ds.name}</strong>
                </div>
                ${flowHtml}
            </article>`;
    }).join('');
}

function refreshCockpitColumnDatasets(columnName) {
    const col = COCKPIT_COLUMNS.find(item => item.name === columnName);
    const colEl = document.querySelector(`.cockpit-col[data-column="${columnName}"]`);
    if (!col || !colEl) return;
    const listEl = colEl.querySelector('.dataset-list');
    if (listEl) {
        listEl.innerHTML = renderCockpitDatasetsHtml(columnName, col.datasets);
    }
    const statusCounts = countVisibleDatasetStatuses(col.datasets, columnName);
    const summaryEl = colEl.querySelector('.col-stats-summary');
    if (summaryEl) {
        summaryEl.textContent = buildColumnStatusSummaryText(statusCounts, columnName);
    }
    const paketEl = colEl.querySelector('.col-stats-paket strong');
    if (paketEl) {
        const visibleCount = getVisiblePaketCount(col.datasets, columnName);
        paketEl.textContent = isColumnFilterActive(columnName) ? visibleCount : (col.paketSayisi ?? visibleCount);
    }
    if (columnName === 'TDSTG') {
        updateTdStgLndFilterCounts();
    }
}

function updateGlobalFilterCounts() {
    const counts = countGlobalDatasetStatuses();
    document.querySelectorAll('.cockpit-global-filters .cockpit-status-chip input[data-status]').forEach(input => {
        const strong = input.parentElement?.querySelector('strong');
        if (strong) {
            strong.textContent = counts[input.dataset.status] || 0;
        }
    });
}

function updateTdStgLndFilterCounts() {
    const counts = countTdStgLndStatuses();
    document.querySelectorAll('.cockpit-tdstg-lnd-filters .cockpit-status-chip input[data-lnd-status]').forEach(input => {
        const strong = input.parentElement?.querySelector('strong');
        if (strong) {
            strong.textContent = counts[input.dataset.lndStatus] || 0;
        }
    });
}

function refreshAllCockpitColumns() {
    COCKPIT_COLUMNS.forEach(col => refreshCockpitColumnDatasets(col.name));
    updateGlobalFilterCounts();
    updateTdStgLndFilterCounts();
}

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
    if (typeof ApiClient === 'undefined') {
        throw new Error('API istemcisi yüklenemedi.');
    }

    const katalog = await ApiClient.getSurecDatasetKatalog();
    DATASET_DOMAINS = mapDatasetKatalog(Array.isArray(katalog) ? katalog : []);
    return DATASET_DOMAINS;
}

async function loadSurecData(options = {}) {
    if (typeof ApiClient === 'undefined') return;
    const dataDate = options.dataDate ?? getGunlukAkisDate();
    gunlukAkisDataDate = dataDate;
    try {
        const kokpit = await ApiClient.getSurecKokpit({ dataDate });
        if (kokpit?.length) {
            COCKPIT_COLUMNS = mapKokpitKatmanlar(kokpit);
            resetCockpitStatusFilters();
        }
        if (!options.kokpitOnly) {
            try {
                await loadDatasetCatalogData();
            } catch (catalogErr) {
                console.warn('Dataset katalog yüklenemedi:', catalogErr.message);
                DATASET_DOMAINS = [];
            }
        }
    } catch (err) {
        console.warn('Süreç verisi API\'den yüklenemedi:', err.message);
        COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
    }
}

let DATASET_LIST_ROWS = [];
let DATASET_STATUS_OZET = [];
let DATASET_STATUS_MODEL_ROWS = [];
const DATASET_STATUS_OZET_MOCK = [
    { status: 'Done', adet: 142 },
    { status: 'In Progress', adet: 28 },
    { status: 'Not Started', adet: 15 },
    { status: 'On Hold', adet: 6 },
    { status: 'Failed', adet: 3 }
];
const DATASET_STATUS_MODEL_MOCK = [
    { dataModel: 'Finance', status: 'Done', adet: 45 },
    { dataModel: 'Finance', status: 'In Progress', adet: 8 },
    { dataModel: 'Finance', status: 'Not Started', adet: 3 },
    { dataModel: 'Risk', status: 'Done', adet: 32 },
    { dataModel: 'Risk', status: 'In Progress', adet: 6 },
    { dataModel: 'Risk', status: 'On Hold', adet: 2 },
    { dataModel: 'Customer', status: 'Done', adet: 38 },
    { dataModel: 'Customer', status: 'Not Started', adet: 7 },
    { dataModel: 'Customer', status: 'Failed', adet: 1 },
    { dataModel: 'Reference', status: 'Done', adet: 27 },
    { dataModel: 'Reference', status: 'In Progress', adet: 9 },
    { dataModel: 'Reference', status: 'Not Started', adet: 5 }
];
let datasetPageView = 'katalog';
let datasetCatalogFocusId = null;

function getDatasetCatalogFocusId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('dsDomain') || null;
}

function setDatasetCatalogFocus(domainId) {
    datasetCatalogFocusId = domainId || null;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'datasetler');
    if (datasetCatalogFocusId) {
        url.searchParams.set('dsDomain', datasetCatalogFocusId);
    } else {
        url.searchParams.delete('dsDomain');
    }
    history.replaceState(null, '', url);
}

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
        url.searchParams.delete('dsDomain');
        datasetCatalogFocusId = null;
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

function getSortedDatasetDomains() {
    return [...DATASET_DOMAINS].sort((a, b) => {
        const countDiff = b.datasets.length - a.datasets.length;
        if (countDiff !== 0) return countDiff;
        return a.name.localeCompare(b.name, 'tr');
    });
}

function getDomainCatalogContext(domainId) {
    const sortedDomains = getSortedDatasetDomains();
    const maxCount = sortedDomains.reduce((max, d) => Math.max(max, d.datasets.length), 0);
    const rank = sortedDomains.findIndex(d => d.id === domainId) + 1;
    const domain = sortedDomains.find(d => d.id === domainId) || null;
    const totalDatasets = sortedDomains.reduce((sum, d) => sum + d.datasets.length, 0);
    return { sortedDomains, maxCount, rank, domain, totalDatasets, domainCount: sortedDomains.length };
}

function buildDomainTile(domain, rank, maxCount) {
    const count = domain.datasets.length;
    const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    const safeName = escapeDatasetHtml(domain.name);
    const safeId = escapeDatasetHtml(domain.id);

    const items = domain.datasets.slice(0, 4).map(ds => `
        <li class="domain-tile-item" title="${escapeDatasetHtml(ds.stagingTable || ds.label)}">
            <span class="domain-tile-dot" aria-hidden="true"></span>
            <span class="domain-tile-label">${escapeDatasetHtml(ds.label)}</span>
        </li>`).join('');
    const overflow = count > 4
        ? `<li class="domain-tile-more">+${count - 4} dataset daha</li>`
        : '';

    return `
        <article class="domain-tile theme-${domain.theme}"
            data-domain-id="${safeId}"
            role="button"
            tabindex="0"
            aria-label="${safeName}, ${count} dataset. Detay için tıklayın.">
            <div class="domain-tile-accent" aria-hidden="true"></div>
            <header class="domain-tile-head">
                <span class="domain-tile-rank">${rank}</span>
                <h4 class="domain-tile-name" title="${safeName}">${safeName}</h4>
                <span class="domain-tile-count">${count}</span>
            </header>
            <div class="domain-tile-bar" role="presentation" aria-hidden="true">
                <span style="width:${barWidth}%"></span>
            </div>
            <ul class="domain-tile-list">${items}${overflow}</ul>
            <span class="domain-tile-cta">Detay <i class="ti ti-arrow-right" aria-hidden="true"></i></span>
        </article>`;
}

function buildDomainDetailRows(datasets) {
    return datasets.map((ds, index) => `
        <tr>
            <td class="domain-detail-num">${index + 1}</td>
            <td class="domain-detail-name">${escapeDatasetHtml(ds.label)}</td>
            <td class="domain-detail-staging"><code>${escapeDatasetHtml(ds.stagingTable || '—')}</code></td>
        </tr>`).join('');
}

function buildDomainDetailView(domain, rank, maxCount, domainCount, totalDatasets) {
    const count = domain.datasets.length;
    const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    const sharePct = totalDatasets > 0 ? Math.round((count / totalDatasets) * 100) : 0;
    const safeName = escapeDatasetHtml(domain.name);
    const safeId = escapeDatasetHtml(domain.id);

    return `
        <div class="domain-detail theme-${domain.theme}" data-domain-id="${safeId}">
            <div class="domain-detail-toolbar">
                <button type="button" class="domain-detail-back" data-domain-back>
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    Tüm domainler
                </button>
                <span class="domain-detail-toolbar-meta">${domainCount} domain · ${totalDatasets} dataset</span>
            </div>

            <header class="domain-detail-hero">
                <div class="domain-detail-hero-main">
                    <span class="domain-detail-rank">#${rank}</span>
                    <div class="domain-detail-hero-text">
                        <h2>${safeName}</h2>
                        <p>Data Model · ${count} dataset · Toplam envanterin %${sharePct}'i</p>
                    </div>
                    <div class="domain-detail-hero-stat">
                        <strong>${count}</strong>
                        <span>dataset</span>
                    </div>
                </div>
                <div class="domain-detail-hero-bar" role="presentation" aria-hidden="true">
                    <span style="width:${barWidth}%"></span>
                </div>
            </header>

            <div class="domain-detail-panel">
                <div class="domain-detail-panel-head">
                    <h3>Dataset listesi</h3>
                    <label class="domain-detail-search">
                        <i class="ti ti-search" aria-hidden="true"></i>
                        <input type="search" id="dsDomainSearch" placeholder="Dataset veya staging tablo ara…" autocomplete="off">
                    </label>
                </div>
                <div class="vs-results-wrap is-fill has-data">
                    <table class="vs-results-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Dataset</th>
                                <th>Staging tablo</th>
                            </tr>
                        </thead>
                        <tbody id="dsDomainTableBody">
                            ${buildDomainDetailRows(domain.datasets)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
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
        statu: ['Dataset Statü Özeti', 'DOC.TDDataset Status ve Data Model bazında dataset dağılımı']
    };
    return meta[activeView] || meta.katalog;
}

function buildDatasetPageShell(activeView) {
    const [title, subtitle] = getDatasetPageMeta(activeView);

    return `<section class="dataset-catalog dataset-view-${activeView}">
        <div class="ds-page-head">
            <div class="ds-page-head-left">
                <div class="ds-page-head-text">
                    <h3>${title}</h3>
                    <span class="ds-page-head-subtitle">${subtitle}</span>
                </div>
                <div class="ds-page-head-toolbar">${buildDatasetViewToolbar(activeView)}</div>
            </div>
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
        textEl.innerHTML = `<h3>${title}</h3><span class="ds-page-head-subtitle">${subtitle}</span>`;
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
    if (!DATASET_DOMAINS.length) {
        return '<div class="ds-empty">DOC.TDDataset kaydı bulunamadı.</div>';
    }

    const focusId = datasetCatalogFocusId || getDatasetCatalogFocusId();
    const { sortedDomains, maxCount, rank, domain, totalDatasets, domainCount } = getDomainCatalogContext(focusId || '');

    if (focusId && !domain) {
        datasetCatalogFocusId = null;
    }

    if (focusId && domain) {
        return buildDomainDetailView(domain, rank, maxCount, domainCount, totalDatasets);
    }

    const tiles = sortedDomains.map((entry, index) => buildDomainTile(entry, index + 1, maxCount)).join('');

    return `
        <div class="domain-mosaic-wrap">
            <p class="domain-mosaic-hint">
                <i class="ti ti-sort-descending" aria-hidden="true"></i>
                Domainler dataset sayısına göre sıralı · detay için karta tıklayın
            </p>
            <div class="domain-mosaic">${tiles}</div>
        </div>`;
}

function buildDatasetErrorContent(message) {
    return `<div class="ds-error-box">
        <i class="ti ti-alert-circle" aria-hidden="true"></i>
        <strong>Dataset katalog yüklenemedi</strong>
        <p>${escapeDatasetHtml(message || 'Bilinmeyen hata')}</p>
        <p class="ds-error-hint">Kaynak: <code>[DOC].[TDDataset]</code> (TDUTIL) · API: <code>/api/surec/dataset-katalog</code></p>
    </div>`;
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
            <div class="vs-results-wrap is-fill has-data">
                <table class="vs-results-table" id="dsListTable">
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

function resolveDatasetStatusOzet() {
    return DATASET_STATUS_OZET.length ? DATASET_STATUS_OZET : DATASET_STATUS_OZET_MOCK;
}

function resolveDatasetStatusModelRows() {
    return DATASET_STATUS_MODEL_ROWS.length
        ? DATASET_STATUS_MODEL_ROWS
        : sortDatasetStatusModelRows(DATASET_STATUS_MODEL_MOCK);
}

function isDatasetStatusMock() {
    return !DATASET_STATUS_OZET.length || !DATASET_STATUS_MODEL_ROWS.length;
}

function buildDatasetStatusMockBadge() {
    if (!isDatasetStatusMock()) {
        return '';
    }

    return '<span class="ds-mock-badge" title="API verisi yok; örnek gösterim">Demo veri</span>';
}

function sortDatasetStatusModelRows(rows) {
    const totals = {};
    rows.forEach(row => {
        totals[row.dataModel] = (totals[row.dataModel] || 0) + (row.adet || 0);
    });
    return [...rows].sort((a, b) => {
        const totalDiff = (totals[b.dataModel] || 0) - (totals[a.dataModel] || 0);
        if (totalDiff !== 0) return totalDiff;
        const modelCmp = a.dataModel.localeCompare(b.dataModel, 'tr', { sensitivity: 'base' });
        if (modelCmp !== 0) return modelCmp;
        return a.status.localeCompare(b.status, 'tr', { sensitivity: 'base' });
    });
}

function buildDatasetStatusOzetRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="2">Kayıt bulunamadı.</td></tr>';
    }

    const toplam = rows.reduce((sum, row) => sum + (row.adet || 0), 0);

    return rows.map(row => `
        <tr>
            <td><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>
            <td class="ds-num-col"><strong>${row.adet}</strong></td>
        </tr>`).join('') + `
        <tr class="ds-status-total-row">
            <td><strong>Toplam</strong></td>
            <td class="ds-num-col"><strong>${toplam}</strong></td>
        </tr>`;
}

function buildDatasetStatusModelRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="3">Kayıt bulunamadı.</td></tr>';
    }

    return rows.map(row => `
        <tr>
            <td>${escapeDatasetHtml(row.dataModel)}</td>
            <td><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>
            <td class="ds-num-col"><strong>${row.adet}</strong></td>
        </tr>`).join('');
}

function buildDatasetStatusContent() {
    const ozetRows = resolveDatasetStatusOzet();
    const modelRows = resolveDatasetStatusModelRows();
    const mockBadge = buildDatasetStatusMockBadge();

    return `
        <div class="ds-status-split">
            ${mockBadge ? `<div class="ds-status-mock-bar">${mockBadge}</div>` : ''}
            <div class="ds-table-card ds-status-ozet-card">
                <div class="ds-table-toolbar">
                    <div class="ds-table-toolbar-title">
                        <h4>Dataset Durumları</h4>
                    </div>
                    <span class="ds-table-caption">Status · GROUP BY</span>
                </div>
                <div class="vs-results-wrap has-data">
                    <table class="vs-results-table ds-status-compact-table">
                        <thead>
                            <tr>
                                <th>Statü</th>
                                <th class="ds-num-col">Adet</th>
                            </tr>
                        </thead>
                        <tbody>${buildDatasetStatusOzetRows(ozetRows)}</tbody>
                    </table>
                </div>
            </div>
            <div class="ds-table-card ds-status-model-card">
                <div class="ds-table-toolbar">
                    <div class="ds-table-toolbar-title">
                        <h4>Data Model × Statü</h4>
                    </div>
                    <span class="ds-table-caption">Data_Model · Status</span>
                </div>
                <div class="vs-results-wrap is-fill has-data">
                    <table class="vs-results-table ds-status-compact-table">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Statü</th>
                                <th class="ds-num-col">Adet</th>
                            </tr>
                        </thead>
                        <tbody>${buildDatasetStatusModelRows(modelRows)}</tbody>
                    </table>
                </div>
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
        const response = await ApiClient.getSurecDatasetStatus();
        DATASET_STATUS_OZET = (response?.durumOzeti || []).map(item => ({
            status: item.status || '',
            adet: item.adet ?? 0
        }));
        DATASET_STATUS_MODEL_ROWS = sortDatasetStatusModelRows((response?.modelDurumlar || []).map(item => ({
            dataModel: item.dataModel || '',
            status: item.status || '',
            adet: item.adet ?? 0
        })));
    } catch (err) {
        console.warn('Dataset statü API\'den yüklenemedi:', err.message);
        DATASET_STATUS_OZET = [];
        DATASET_STATUS_MODEL_ROWS = [];
        throw err;
    }
}

function bindDatasetCatalogInteractions(root) {
    const shell = root.querySelector('.dataset-catalog');
    if (!shell || shell.dataset.catalogBound === '1') return;
    shell.dataset.catalogBound = '1';

    shell.addEventListener('click', event => {
        const backBtn = event.target.closest('[data-domain-back]');
        if (backBtn) {
            setDatasetCatalogFocus(null);
            refreshDatasetCatalogContent(shell);
            return;
        }

        const tile = event.target.closest('.domain-tile[data-domain-id]');
        if (!tile) return;

        const domainId = tile.getAttribute('data-domain-id');
        if (!domainId) return;

        setDatasetCatalogFocus(domainId);
        refreshDatasetCatalogContent(shell);
    });

    shell.addEventListener('keydown', event => {
        const tile = event.target.closest('.domain-tile[data-domain-id]');
        if (!tile) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const domainId = tile.getAttribute('data-domain-id');
        if (!domainId) return;
        setDatasetCatalogFocus(domainId);
        refreshDatasetCatalogContent(shell);
    });
}

function bindDatasetDetailSearch(root, domain) {
    const input = root.querySelector('#dsDomainSearch');
    const tbody = root.querySelector('#dsDomainTableBody');
    if (!input || !tbody || !domain) return;

    input.addEventListener('input', () => {
        const term = input.value.trim().toLowerCase();
        const filtered = !term
            ? domain.datasets
            : domain.datasets.filter(ds =>
                [ds.label, ds.stagingTable].some(value => String(value || '').toLowerCase().includes(term))
            );
        tbody.innerHTML = filtered.length
            ? buildDomainDetailRows(filtered)
            : '<tr><td colspan="3" class="ds-empty-cell">Eşleşen dataset bulunamadı.</td></tr>';
    });
}

function refreshDatasetCatalogContent(shell) {
    const contentEl = shell.querySelector('.ds-page-content');
    if (!contentEl) return;

    shell.classList.toggle('is-domain-focused', !!datasetCatalogFocusId);

    const meta = getDatasetPageMeta('katalog');
    const textEl = shell.querySelector('.ds-page-head-text');
    if (textEl && datasetCatalogFocusId) {
        const { domain } = getDomainCatalogContext(datasetCatalogFocusId);
        if (domain) {
            textEl.innerHTML = `
                <h3>${escapeDatasetHtml(domain.name)}</h3>
                <span class="ds-page-head-subtitle">Domain detayı · ${domain.datasets.length} dataset</span>`;
        }
    } else if (textEl) {
        textEl.innerHTML = `<h3>${meta[0]}</h3><span class="ds-page-head-subtitle">${meta[1]}</span>`;
    }

    contentEl.innerHTML = buildDatasetCatalogContent();

    if (datasetCatalogFocusId) {
        const { domain } = getDomainCatalogContext(datasetCatalogFocusId);
        bindDatasetDetailSearch(shell, domain);
        shell.querySelector('.domain-detail-back')?.focus();
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

    datasetCatalogFocusId = getDatasetCatalogFocusId();

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

    let loadError = null;

    try {
        await loadDatasetCatalogData();
    } catch (err) {
        loadError = err.message || 'Dataset katalog alınamadı.';
        console.warn('Dataset katalog yüklenemedi:', loadError);
        DATASET_DOMAINS = [];
    }

    if (datasetPageView === 'liste') {
        try {
            await loadDatasetListData();
        } catch (err) {
            if (!loadError) {
                loadError = err.message || 'Dataset listesi alınamadı.';
            }
            console.warn('Dataset liste yüklenemedi:', err.message);
            DATASET_LIST_ROWS = [];
        }
    } else if (datasetPageView === 'statu') {
        try {
            await loadDatasetStatusData();
        } catch (err) {
            if (!loadError) {
                loadError = err.message || 'Dataset statü özeti alınamadı.';
            }
            console.warn('Dataset statü yüklenemedi:', err.message);
            DATASET_STATUS_OZET = [];
            DATASET_STATUS_MODEL_ROWS = [];
        }
    }

    updateDatasetPageChrome(shell, datasetPageView);

    if (contentEl) {
        if (loadError && datasetPageView === 'katalog') {
            contentEl.innerHTML = buildDatasetErrorContent(loadError);
        } else if (loadError && datasetPageView === 'liste') {
            contentEl.innerHTML = buildDatasetErrorContent(loadError) + buildDatasetContentOnly(datasetPageView);
        } else {
            contentEl.innerHTML = buildDatasetContentOnly(datasetPageView);
        }
    }

    if (datasetPageView === 'liste') {
        bindDatasetListSearch(shell);
    } else if (datasetPageView === 'katalog') {
        shell.classList.toggle('is-domain-focused', !!datasetCatalogFocusId);
        bindDatasetCatalogInteractions(el);
        if (datasetCatalogFocusId) {
            const { domain } = getDomainCatalogContext(datasetCatalogFocusId);
            bindDatasetDetailSearch(shell, domain);
        }
    }
}

function shouldShowFlowStepLabel(layerName, task) {
    if (['STG', 'LND', 'COR'].includes(layerName)) {
        return !!(task.label && task.label !== '—');
    }
    if (task.status === 'done' && (layerName === 'TDSTG' || layerName === 'TDMAIN' || layerName === 'TDREPORT')) {
        return false;
    }
    return !!(task.label && task.label !== '—');
}

function resolveActiveFlowLabel(tasks) {
    const progressed = tasks.find(t => t.status === 'running' || t.status === 'failed' || t.status === 'done');
    if (progressed) return progressed.statusText;
    return 'Not Started';
}

function getFlowStepClasses(task, rowTasks, layerName) {
    if (['STG', 'LND', 'COR'].includes(layerName)) {
        return ['flow-step', 'is-active', task.status || 'not-started'].join(' ');
    }

    const isLndFailed = task.statusText === 'LND Failed';
    const isLndCompleted = task.statusText === 'LND Completed';
    const lndTasks = rowTasks.filter(t => t.statusText === 'LND Failed' || t.statusText === 'LND Completed');
    const stgTasks = rowTasks.filter(t => !lndTasks.includes(t));

    let isActive;
    if (isLndFailed || isLndCompleted) {
        const activeLnd = resolveActiveFlowLabel(lndTasks);
        isActive = task.statusText === activeLnd;
    } else {
        isActive = task.statusText === resolveActiveFlowLabel(stgTasks);
    }

    const classes = ['flow-step', isActive ? 'is-active' : 'is-idle'];
    if (isLndFailed) {
        classes.push('lnd-failed');
        if (isActive && task.status === 'failed') classes.push('failed');
        else if (isActive) classes.push('not-started');
    } else if (isLndCompleted) {
        classes.push('lnd-done');
        if (isActive && task.status === 'done') classes.push('done');
        else if (isActive && task.status === 'running') classes.push('running');
        else if (isActive) classes.push('not-started');
    } else if (isActive) {
        classes.push(task.status || 'not-started');
    }

    return classes.join(' ');
}

function buildFlowStepHtml(layerName, task, rowTasks) {
    const isMizanLedger = cockpitRenderMode === 'mizan' && ['STG', 'LND', 'COR'].includes(layerName);
    const showLabel = shouldShowFlowStepLabel(layerName, task);
    const recordText = formatFlowRecordCount(task.recordCount);
    const recordHtml = recordText
        ? `<span class="flow-record-count${isMizanLedger ? ' flow-record-count-prominent' : ''}">${recordText}</span>`
        : '';
    const errorHtml = task.errorMessage
        ? `<span class="flow-error" title="${escapeDatasetHtml(task.errorMessage)}">${escapeDatasetHtml(task.errorMessage)}</span>`
        : '';
    const labelHtml = showLabel
        ? `<span class="flow-label">${escapeDatasetHtml(task.label)}</span>`
        : '';
    const statusHtml = `<span class="flow-status-text">${task.statusText || 'Not Started'}</span>`;

    if (isMizanLedger) {
        return `
            <div class="${getFlowStepClasses(task, rowTasks, layerName)}">
                ${recordHtml}
                ${labelHtml}
                ${statusHtml}
                ${errorHtml}
            </div>`;
    }

    return `
            <div class="${getFlowStepClasses(task, rowTasks, layerName)}">
                ${statusHtml}
                ${labelHtml}
                ${recordHtml}
                ${errorHtml}
            </div>`;
}

function buildCockpitColumn({ name, role, theme, datasets, paketSayisi, tamamlanmaYuzdesi }) {
    const pct = Math.min(100, tamamlanmaYuzdesi ?? 0);
    const allDone = pct >= 100;
    const hasRunning = datasets.some(ds => ds.tasks.some(t => t.status === 'running')
        || (ds.lndTasks || []).some(t => t.status === 'running'));
    const hasFailed = datasets.some(ds => ds.tasks.some(t => t.status === 'failed')
        || (ds.lndTasks || []).some(t => t.status === 'failed'));
    const colStatus = hasFailed ? 'failed' : allDone ? 'done' : hasRunning ? 'running' : 'waiting';
    const statusCounts = countVisibleDatasetStatuses(datasets, name);
    const datasetHtml = renderCockpitDatasetsHtml(name, datasets);
    const visiblePaket = getVisiblePaketCount(datasets, name);
    const paketDisplay = isColumnFilterActive(name) ? visiblePaket : (paketSayisi ?? visiblePaket);
    const lndFiltersHtml = name === 'TDSTG' ? buildTdStgLndFiltersHtml() : '';

    return `
        <div class="cockpit-col theme-${theme} status-${colStatus}" data-column="${name}">
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
                <div class="col-stats-lead">
                    <div class="col-stats-paket-row">
                        <span class="col-stats-paket"><strong>${paketDisplay}</strong> paket</span>
                        ${lndFiltersHtml}
                    </div>
                    <span class="col-stats-summary">${buildColumnStatusSummaryText(statusCounts, name)}</span>
                </div>
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
            <div class="cockpit-head-main">
                <div class="cockpit-head-title-row">
                    <h3>Günlük Akış</h3>
                    ${buildGlobalStatusFiltersHtml()}
                </div>
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

function bindGlobalCockpitStatusFilters() {
    const cockpit = document.querySelector('.cockpit');
    if (!cockpit || cockpit.dataset.globalFilterBound === '1') return;
    cockpit.dataset.globalFilterBound = '1';

    cockpit.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;

        if (input.closest('.cockpit-tdstg-lnd-filters')) {
            const status = input.dataset.lndStatus;
            if (!status) return;

            if (input.checked) {
                COCKPIT_TDSTG_LND_FILTERS.add(status);
            } else {
                COCKPIT_TDSTG_LND_FILTERS.delete(status);
            }
            refreshCockpitColumnDatasets('TDSTG');
            updateGlobalFilterCounts();
            updateTdStgLndFilterCounts();
            return;
        }

        if (!input.closest('.cockpit-global-filters')) return;

        const status = input.dataset.status;
        if (!status) return;

        if (input.checked) {
            COCKPIT_GLOBAL_STATUS_FILTERS.add(status);
        } else {
            COCKPIT_GLOBAL_STATUS_FILTERS.delete(status);
        }
        refreshAllCockpitColumns();
    });
}

function bindSurecCockpit() {
    const clock = document.getElementById('cockpitClock');
    if (clock) {
        if (window._cockpitTimer) clearInterval(window._cockpitTimer);
        window._cockpitTimer = setInterval(() => {
            clock.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }, 1000);
    }

    bindGlobalCockpitStatusFilters();
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
        transferType: item.transferTipi || '—',
        active: item.aktif,
        lastExecution: item.sonGuncelleme || null
    }));
}

function formatAktiflikCell(active) {
    if (active === true) {
        return '<span class="tl-badge aktif">Aktif</span>';
    }
    if (active === false) {
        return '<span class="tl-badge pasif">Pasif</span>';
    }
    return '—';
}

function formatTransferTypeCell(row) {
    if (row.transferType && row.transferType !== '—') {
        return escapeDatasetHtml(row.transferType);
    }
    return '—';
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
                    lastExecution: null,
                    taskOrder: idx + 1,
                    active: null,
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
    const activeLabel = row.active === true ? 'aktif' : row.active === false ? 'pasif' : '';
    return [row.layer, row.task, row.datasetCode, row.active, row.lastExecution, row.transferType, row.loadPeriodType, row.datasetLabel, activeLabel]
        .join(' ')
        .toLocaleLowerCase('tr-TR');
}

function renderTaskListesiRows(rows) {
    if (!rows.length) {
        return '<tr><td colspan="8" class="tl-empty-cell">Arama kriterine uygun kayıt bulunamadı.</td></tr>';
    }
    return rows.map(row => `
        <tr>
            <td>${row.layer}</td>
            <td>${escapeDatasetHtml(row.task)}</td>
            <td><code>${row.datasetCode}</code></td>
            <td>${formatAktiflikCell(row.active)}</td>
            <td>${formatDatasetDate(row.lastExecution)}</td>
            <td>${formatTransferTypeCell(row)}</td>
            <td>${escapeDatasetHtml(row.loadPeriodType)}</td>
            <td>${row.datasetLabel}</td>
        </tr>`).join('');
}

function formatTaskListCountInner(filtered, total) {
    const isFiltered = filtered !== total;
    return `
            <span class="tl-count${isFiltered ? ' is-filtered' : ''}" role="status" aria-live="polite">
                <span class="tl-count-block">
                    <span class="tl-count-label">Gösterilen</span>
                    <strong class="tl-count-value">${filtered}</strong>
                </span>
                <span class="tl-count-divider" aria-hidden="true">/</span>
                <span class="tl-count-block">
                    <span class="tl-count-label">Toplam</span>
                    <strong class="tl-count-value">${total}</strong>
                </span>
            </span>`;
}

function formatTaskListCountHtml(filtered, total) {
    return `<div class="tl-count-wrap" id="tlCountWrap">${formatTaskListCountInner(filtered, total)}</div>`;
}

function updateTaskListCount(root, filtered, total) {
    const wrap = root.querySelector('#tlCountWrap');
    if (wrap) {
        wrap.innerHTML = formatTaskListCountInner(filtered, total);
    }
}

function buildTaskListesiHTML() {
    const rows = getTaskListRows();
    const total = rows.length;
    return `<div class="tl-layout">
        <div class="tl-head">
            <h3>Paket Listesi</h3>
            <p>ParallelRun paket envanteri — arama ile filtreleyin.</p>
        </div>
        <div class="tl-card">
            <div class="tl-toolbar">
                <label class="tl-search">
                    <i class="ti ti-search" aria-hidden="true"></i>
                    <input type="search" id="tlSearch" placeholder="Paket, dataset, katman, aktiflik, transfer tipi veya yükleme periyodu ara…" autocomplete="off">
                </label>
                ${formatTaskListCountHtml(total, total)}
            </div>
            <div class="vs-results-wrap is-fill has-data" id="tlResultsWrap">
                <table class="vs-results-table">
                    <thead>
                        <tr>
                            <th>Katman</th>
                            <th>Paket Adı</th>
                            <th>Hedef Tablo</th>
                            <th>Aktiflik</th>
                            <th>Son Çalıştırma Tarihi</th>
                            <th>Transfer Tipi</th>
                            <th>Yükleme Periyodu</th>
                            <th>Dataset</th>
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
    if (!input || !body) return;

    const allRows = getTaskListRows();

    function applyFilter() {
        const q = input.value.trim().toLocaleLowerCase('tr-TR');
        const filtered = q
            ? allRows.filter(row => taskRowSearchKey(row).includes(q))
            : allRows;
        body.innerHTML = renderTaskListesiRows(filtered);
        updateTaskListCount(root, filtered.length, allRows.length);
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
            const running = col.datasets.some(ds => ds.tasks.some(t => t.status === 'running')
                || (ds.lndTasks || []).some(t => t.status === 'running'));
            const failed = col.datasets.some(ds => ds.tasks.some(t => t.status === 'failed')
                || (ds.lndTasks || []).some(t => t.status === 'failed'));
            const allDone = col.datasets.length > 0 && col.datasets.every(ds =>
                ds.tasks.every(t => t.status === 'done')
                && !(ds.lndTasks || []).some(t => t.status === 'failed' || t.status === 'running'));
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
window.mapKokpitKatmanlar = mapKokpitKatmanlar;
window.buildCockpitColumn = buildCockpitColumn;
window.buildCockpitGridHtml = columns => columns.map(buildCockpitColumn).join('');
window.setCockpitRenderMode = mode => { cockpitRenderMode = mode || 'default'; };
window.bindCockpitColumnFilters = bindSurecCockpit;
window.bindGlobalCockpitStatusFilters = bindGlobalCockpitStatusFilters;
window.buildGlobalStatusFiltersHtml = buildGlobalStatusFiltersHtml;
window.refreshAllCockpitColumns = refreshAllCockpitColumns;
window.getDefaultGunlukAkisDate = getDefaultGunlukAkisDate;
window.getGunlukAkisDate = getGunlukAkisDate;
window.resetCockpitStatusFilters = resetCockpitStatusFilters;
