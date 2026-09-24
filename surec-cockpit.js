const COCKPIT_COLUMNS_FALLBACK = [
    {
        name: 'TDSTG.STG',
        role: 'Staging — STG',
        theme: 'cyan',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        ozetSatirlar: [],
        kayitlar: [],
        datasets: []
    },
    {
        name: 'TDSTG.LND',
        role: 'Staging — LND',
        theme: 'teal',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        ozetSatirlar: [],
        kayitlar: [],
        datasets: []
    },
    {
        name: 'TDMAIN',
        role: 'Ana veri — kurumsal çekirdek',
        theme: 'blue',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        ozetSatirlar: [],
        kayitlar: [],
        datasets: []
    },
    {
        name: 'TDREPORT',
        role: 'Raporlama — analitik katman',
        theme: 'purple',
        paketSayisi: 0,
        tamamlanmaYuzdesi: 0,
        ozetSatirlar: [],
        kayitlar: [],
        datasets: []
    }
];

let COCKPIT_COLUMNS = COCKPIT_COLUMNS_FALLBACK;
let DATASET_DOMAINS = [];
let gunlukAkisDataDate = null;
let cockpitFocusLayer = null;
/** 'default' | 'mizan' — Mizan sayfası akış render modu */
let cockpitRenderMode = 'default';
/** Boş = tüm paketler görünür; dolu = yalnızca seçili statüler */
let COCKPIT_GLOBAL_STATUS_FILTERS = new Set();

const COCKPIT_FILTER_STG = [
    { key: 'Not Started', label: 'Not Started', className: 'is-not-started' },
    { key: 'In Progress', label: 'In Progress', className: 'is-running' },
    { key: 'Failed', label: 'Failed', className: 'is-failed' },
    { key: 'Success', label: 'Success', className: 'is-done' }
];

const GUNLUK_AKIS_LAYER_ORDER = ['TDSTG.STG', 'TDSTG.LND', 'TDMAIN', 'TDREPORT'];

function getGlobalFilterOptions() {
    return COCKPIT_FILTER_STG;
}

function mapKokpitKatmanlar(kokpit) {
    const byCode = Object.fromEntries(
        (kokpit || []).map(k => [String(k.katmanKodu || ''), k])
    );

    return GUNLUK_AKIS_LAYER_ORDER.map(code => {
        const k = byCode[code] || {};
        const ozetSatirlar = (k.ozetSatirlar || []).map(row => ({
            hedefTablo: row.hedefTablo || row.HedefTablo || '',
            durum: row.durum || 'not-started',
            durumMetni: row.durumMetni || 'Not Started'
        }));
        const kayitlar = (k.kayitlar || k.Kayitlar || []).map(row => ({
            targetTableName: row.targetTableName || row.TargetTableName || '',
            durum: row.durum || row.Durum || 'not-started',
            durumMetni: row.durumMetni || row.DurumMetni || 'Not Started',
            dataDate: row.dataDate || row.DataDate || null,
            executionStartTime: row.executionStartTime || row.ExecutionStartTime || null,
            executionEndTime: row.executionEndTime || row.ExecutionEndTime || null,
            sureDakika: row.sureDakika ?? row.SureDakika ?? null,
            executionRecordCount: row.executionRecordCount ?? row.ExecutionRecordCount ?? null,
            errorMessageText: row.errorMessageText || row.ErrorMessageText || null
        }));

        return {
            name: code,
            role: k.rol || code,
            theme: k.tema || 'blue',
            paketSayisi: k.paketSayisi ?? 0,
            basariliAdimSayisi: k.basariliAdimSayisi ?? 0,
            tamamlanmaYuzdesi: k.tamamlanmaYuzdesi ?? 0,
            ozetSatirlar,
            kayitlar,
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
        };
    });
}

function resetCockpitStatusFilters() {
    COCKPIT_GLOBAL_STATUS_FILTERS = new Set();
}

function isGlobalFilterActive() {
    return COCKPIT_GLOBAL_STATUS_FILTERS.size > 0;
}

function isOzetRowVisible(row) {
    return isFlowStatusRowVisible(row);
}

function isFlowStatusRowVisible(row) {
    if (!isGlobalFilterActive()) return true;
    return COCKPIT_GLOBAL_STATUS_FILTERS.has(row.durumMetni || 'Not Started');
}

function getVisibleOzetRows(col) {
    return (col?.ozetSatirlar || []).filter(isOzetRowVisible);
}

function getVisibleKayitlar(col) {
    return (col?.kayitlar || []).filter(isFlowStatusRowVisible);
}

function gunlukAkisStatusChipClass(durumMetni, durum) {
    const key = String(durumMetni || durum || '').toLowerCase();
    if (key.includes('success') || durum === 'done') return 'is-done';
    if (key.includes('fail') || durum === 'failed') return 'is-failed';
    if (key.includes('progress') || durum === 'running') return 'is-running';
    return 'is-not-started';
}

function countGlobalDatasetStatuses() {
    const options = getGlobalFilterOptions();
    const counts = Object.fromEntries(options.map(item => [item.key, 0]));

    if (cockpitFocusLayer) {
        const col = COCKPIT_COLUMNS.find(column => column.name === cockpitFocusLayer);
        (col?.kayitlar || []).forEach(row => {
            const status = row.durumMetni || 'Not Started';
            if (Object.prototype.hasOwnProperty.call(counts, status)) {
                counts[status] += 1;
            }
        });
        return counts;
    }

    COCKPIT_COLUMNS.forEach(col => {
        (col.ozetSatirlar || []).forEach(row => {
            if (Object.prototype.hasOwnProperty.call(counts, row.durumMetni)) {
                counts[row.durumMetni] += 1;
            }
        });
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

function formatGunlukAkisDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('tr-TR');
}

function formatGunlukAkisMinutes(value) {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return `${num.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} dk`;
}

function resolveFlowLayerStatus(col) {
    const rows = col?.ozetSatirlar || [];
    if (!rows.length) return 'waiting';
    if (rows.some(row => row.durum === 'failed')) return 'failed';
    if (rows.every(row => row.durum === 'done')) return 'done';
    if (rows.some(row => row.durum === 'running')) return 'running';
    return 'waiting';
}

function buildFlowLayerOzetTable(col) {
    const rows = getVisibleOzetRows(col);
    if (!rows.length) {
        const hasData = (col.ozetSatirlar || []).length > 0;
        return `<div class="flow-layer-empty">${hasData ? 'Seçili statülere uygun kayıt yok.' : 'Bu katmanda kayıt bulunamadı.'}</div>`;
    }

    const body = rows.map(row => `
        <tr>
            <td class="flow-layer-hedef" title="${escapeDatasetHtml(row.hedefTablo)}">${escapeDatasetHtml(row.hedefTablo)}</td>
            <td class="flow-layer-statu">
                <span class="flow-status-pill ${gunlukAkisStatusChipClass(row.durumMetni, row.durum)}">${escapeDatasetHtml(row.durumMetni)}</span>
            </td>
        </tr>`).join('');

    return `
        <table class="flow-layer-mini-table">
            <thead>
                <tr>
                    <th>Hedef Tablo</th>
                    <th>Statü</th>
                </tr>
            </thead>
            <tbody>${body}</tbody>
        </table>`;
}

function buildFlowLayerTile(col) {
    const pct = Math.min(100, col.tamamlanmaYuzdesi ?? 0);
    const visibleCount = getVisibleOzetRows(col).length;
    const paketDisplay = isGlobalFilterActive() ? visibleCount : (col.paketSayisi ?? visibleCount);
    const status = resolveFlowLayerStatus(col);
    const statusLabel = status === 'failed' ? 'Hata' : status === 'done' ? 'Tamam' : status === 'running' ? 'Aktif' : 'Bekliyor';

    return `
        <article class="flow-layer-tile theme-${col.theme} status-${status}"
            data-flow-layer="${escapeDatasetHtml(col.name)}"
            role="button"
            tabindex="0"
            aria-label="${escapeDatasetHtml(col.name)} katman detayı">
            <div class="flow-layer-tile-accent" aria-hidden="true"></div>
            <header class="flow-layer-tile-head">
                <div class="flow-layer-tile-title">
                    <i class="ti ti-database" aria-hidden="true"></i>
                    <div>
                        <h4>${escapeDatasetHtml(col.name)}</h4>
                        <span>${escapeDatasetHtml(col.role)}</span>
                    </div>
                </div>
                <div class="flow-layer-tile-meta">
                    <strong>${pct}%</strong>
                    <span class="flow-layer-tile-badge">${statusLabel}</span>
                </div>
            </header>
            <div class="flow-layer-tile-stats">
                <span><strong>${paketDisplay}</strong> paket</span>
            </div>
            <div class="flow-layer-tile-body">${buildFlowLayerOzetTable(col)}</div>
            <span class="flow-layer-tile-cta">Detay <i class="ti ti-arrow-right" aria-hidden="true"></i></span>
        </article>`;
}

function resolveFlowKayitDataDate(row) {
    return row?.dataDate || getGunlukAkisDate();
}

function buildFlowLayerDetail(col) {
    const kayitlar = getVisibleKayitlar(col);

    return `
        <div class="flow-layer-detail theme-${col.theme}" data-flow-detail="${escapeDatasetHtml(col.name)}">
            <div class="flow-layer-detail-toolbar">
                <button type="button" class="flow-layer-detail-back" data-flow-back>
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    Tüm katmanlar
                </button>
                <span class="flow-layer-detail-meta">${escapeDatasetHtml(col.name)} · ${kayitlar.length} kayıt</span>
            </div>
            <header class="flow-layer-detail-hero">
                <h2>${escapeDatasetHtml(col.name)}</h2>
                <p>${escapeDatasetHtml(col.role)}</p>
            </header>
            <div class="vs-results-wrap is-fill has-data flow-layer-detail-table-wrap">
                <table class="vs-results-table vs-results-table--wrap flow-layer-detail-table">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>`;
}

function buildFlowLayerGridHtml() {
    return COCKPIT_COLUMNS.map(buildFlowLayerTile).join('');
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

function refreshAllCockpitColumns() {
    const grid = document.getElementById('cockpitFlowGrid');
    if (grid) {
        grid.innerHTML = buildFlowLayerGridHtml();
    }
    updateGlobalFilterCounts();
    refreshOpenFlowLayerDrawer();
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
            descriptionScope: ds.descriptionScope || '',
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
let dsListSmartTable = null;
let tlSmartTable = null;
let flowDetailSmartTable = null;
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
let datasetPageSearchTerm = '';
let datasetCardsStatusFilter = null;
let datasetCardsSort = 'name';
let surecDrawerCloser = null;
let surecDrawerKeyHandler = null;

function getPageBodyEl() {
    return document.getElementById('pageBody') || document.querySelector('.page-body');
}

function ensureSurecDrawerHost() {
    let host = document.getElementById('surecDrawerHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'surecDrawerHost';
        document.body.appendChild(host);
    }
    return host;
}

function closeSurecDrawer(options = {}) {
    const immediate = !!options.immediate;
    const host = document.getElementById('surecDrawerHost');
    const pageBody = getPageBodyEl();
    pageBody?.classList.remove('sc-drawer-dim');

    if (surecDrawerKeyHandler) {
        document.removeEventListener('keydown', surecDrawerKeyHandler);
        surecDrawerKeyHandler = null;
    }

    const onClose = surecDrawerCloser;
    surecDrawerCloser = null;

    if (!host) {
        onClose?.();
        return;
    }

    const drawer = host.querySelector('.sc-drawer');
    if (!drawer || immediate) {
        host.innerHTML = '';
        onClose?.();
        return;
    }

    drawer.classList.remove('is-open');
    const finish = () => {
        if (host.contains(drawer)) host.innerHTML = '';
        onClose?.();
    };
    drawer.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 480);
}

function openSurecDrawer({ title, subtitle, theme, bodyHtml, onMounted, onClose, placement }) {
    closeSurecDrawer({ immediate: true });

    const host = ensureSurecDrawerHost();
    const themeClass = theme ? ` theme-${theme}` : '';
    const placementClass = placement === 'bottom' ? ' is-bottom' : ' is-right';
    host.innerHTML = `
        <div class="sc-drawer${placementClass}" aria-hidden="true">
            <div class="sc-drawer-backdrop" data-drawer-close tabindex="-1"></div>
            <aside class="sc-drawer-panel${themeClass}" role="dialog" aria-modal="true" aria-label="${escapeDatasetHtml(title || 'Detay')}">
                <div class="sc-drawer-accent" aria-hidden="true"></div>
                <header class="sc-drawer-head">
                    <button type="button" class="sc-drawer-close" data-drawer-close title="Kapat" aria-label="Kapat">
                        <i class="ti ti-x" aria-hidden="true"></i>
                    </button>
                    <div class="sc-drawer-titles">
                        <h2>${escapeDatasetHtml(title || '')}</h2>
                        <p>${escapeDatasetHtml(subtitle || '')}</p>
                    </div>
                </header>
                <div class="sc-drawer-body">${bodyHtml || ''}</div>
            </aside>
        </div>`;

    const drawer = host.querySelector('.sc-drawer');
    const pageBody = getPageBodyEl();
    surecDrawerCloser = typeof onClose === 'function' ? onClose : null;

    host.querySelectorAll('[data-drawer-close]').forEach(el => {
        el.addEventListener('click', () => closeSurecDrawer());
    });
    host.querySelectorAll('[data-flow-back], [data-domain-back]').forEach(el => {
        el.addEventListener('click', event => {
            event.preventDefault();
            closeSurecDrawer();
        });
    });

    surecDrawerKeyHandler = event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSurecDrawer();
        }
    };
    document.addEventListener('keydown', surecDrawerKeyHandler);

    requestAnimationFrame(() => {
        drawer?.classList.add('is-open');
        drawer?.setAttribute('aria-hidden', 'false');
        pageBody?.classList.add('sc-drawer-dim');
        host.querySelector('.sc-drawer-close')?.focus();
        onMounted?.(host.querySelector('.sc-drawer-body'));
    });
}

function openFlowLayerDrawer(layerName) {
    const col = COCKPIT_COLUMNS.find(column => column.name === layerName);
    if (!col) return;

    cockpitFocusLayer = layerName;
    const kayitlar = getVisibleKayitlar(col);
    openSurecDrawer({
        title: col.name,
        subtitle: `${col.role} · ${kayitlar.length} kayıt`,
        theme: col.theme,
        bodyHtml: buildFlowLayerDetail(col),
        onMounted: () => mountFlowDetailTable(),
        onClose: () => {
            cockpitFocusLayer = null;
        }
    });
}

function refreshOpenFlowLayerDrawer() {
    if (!cockpitFocusLayer || !document.querySelector('#surecDrawerHost .sc-drawer.is-open')) return;
    const col = COCKPIT_COLUMNS.find(column => column.name === cockpitFocusLayer);
    if (!col) return;
    const body = document.querySelector('#surecDrawerHost .sc-drawer-body');
    const titles = document.querySelector('#surecDrawerHost .sc-drawer-titles');
    if (!body) return;
    const kayitlar = getVisibleKayitlar(col);
    if (titles) {
        titles.innerHTML = `<h2>${escapeDatasetHtml(col.name)}</h2><p>${escapeDatasetHtml(`${col.role} · ${kayitlar.length} kayıt`)}</p>`;
    }
    body.innerHTML = buildFlowLayerDetail(col);
    mountFlowDetailTable();
}

function openDomainDrawer(domainId) {
    const { sortedDomains, maxCount, rank, domain, totalDatasets, domainCount } = getDomainCatalogContext(domainId || '');
    if (!domain) return;

    setDatasetCatalogFocus(domain.id);
    openSurecDrawer({
        title: domain.name,
        subtitle: `Domain detayı · ${domain.datasets.length} dataset · sıra #${rank}`,
        theme: domain.theme,
        placement: 'bottom',
        bodyHtml: buildDomainDetailView(domain, rank, maxCount, domainCount, totalDatasets),
        onMounted: () => {},
        onClose: () => {
            setDatasetCatalogFocus(null);
            const shell = document.querySelector('.dataset-catalog');
            if (shell) {
                shell.classList.remove('is-domain-focused');
                const textEl = shell.querySelector('.ds-page-head-text');
                const meta = getDatasetPageMeta('katalog');
                if (textEl) {
                    textEl.innerHTML = `<h3>${meta[0]}</h3><span class="ds-page-head-subtitle">${meta[1]}</span>`;
                }
            }
        }
    });
}

function animateDatasetStage(contentEl) {
    if (!contentEl) return;
    contentEl.classList.remove('is-stage-enter');
    // force reflow for replay
    void contentEl.offsetWidth;
    contentEl.classList.add('is-stage-enter');
}

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
    return view === 'liste' || view === 'kartlar' || view === 'statu' ? view : 'katalog';
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
        { id: 'kartlar', label: 'Kartlar', icon: 'ti-cards' },
        { id: 'statu', label: 'Statü', icon: 'ti-chart-dots' }
    ];

    const buttons = tabs.map(tab => `
        <button type="button"
            class="ds-view-btn${activeView === tab.id ? ' is-active' : ''}"
            data-ds-view="${tab.id}">
            <i class="ti ${tab.icon}" aria-hidden="true"></i>
            ${tab.label}
        </button>`).join('');

    const searchHtml = activeView === 'statu' ? '' : `
            <label class="ds-page-search">
                <i class="ti ti-search" aria-hidden="true"></i>
                <input type="search" id="dsPageSearch" placeholder="Dataset ara…" value="${escapeDatasetHtml(datasetPageSearchTerm)}" autocomplete="off" aria-label="Dataset ara">
            </label>`;

    return `
        <div class="ds-view-toolbar-wrap">
            <div class="ds-view-toolbar" role="tablist" aria-label="Dataset görünümü">${buttons}</div>
            ${searchHtml}
        </div>`;
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
            <td class="domain-detail-name vs-cell-wrap">${escapeDatasetHtml(ds.label)}</td>
            <td class="domain-detail-scope vs-cell-wrap">${escapeDatasetHtml(ds.descriptionScope || '—')}</td>
            <td class="domain-detail-staging vs-cell-wrap"><code>${escapeDatasetHtml(ds.stagingTable || '—')}</code></td>
        </tr>`).join('');
}

function buildDomainDetailView(domain, rank, maxCount, domainCount, totalDatasets) {
    const count = domain.datasets.length;
    const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    const sharePct = totalDatasets > 0 ? Math.round((count / totalDatasets) * 100) : 0;
    const safeName = escapeDatasetHtml(domain.name);
    const safeId = escapeDatasetHtml(domain.id);
    const term = datasetPageSearchTerm.trim().toLowerCase();
    const filteredDatasets = !term
        ? domain.datasets
        : domain.datasets.filter(ds =>
            [ds.label, ds.descriptionScope, ds.stagingTable].some(value =>
                String(value || '').toLowerCase().includes(term)
            )
        );

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
                    <span class="domain-detail-count">${filteredDatasets.length}${term ? ` / ${count}` : ''} kayıt</span>
                </div>
                <div class="vs-results-wrap is-fill has-data">
                    <table class="vs-results-table vs-results-table--wrap">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Dataset</th>
                                <th>Kapsam</th>
                                <th>Staging tablo</th>
                            </tr>
                        </thead>
                        <tbody id="dsDomainTableBody">
                            ${filteredDatasets.length
                                ? buildDomainDetailRows(filteredDatasets)
                                : '<tr><td colspan="4" class="ds-empty-cell">Eşleşen dataset bulunamadı.</td></tr>'}
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
        kartlar: ['Dataset Kartları', 'Her dataset için özet kart görünümü'],
        statu: ['Dataset Statü Özeti', 'DOC.TDDataset Status ve Data Model bazında dataset dağılımı']
    };
    return meta[activeView] || meta.katalog;
}

function buildDatasetPageShell(activeView) {
    const [title, subtitle] = getDatasetPageMeta(activeView);

    return `<section class="dataset-catalog dataset-view-${activeView}">
        <div class="ds-page-head">
            <div class="ds-page-head-text">
                <h3>${title}</h3>
                <span class="ds-page-head-subtitle">${subtitle}</span>
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
        textEl.innerHTML = `<h3>${title}</h3><span class="ds-page-head-subtitle">${subtitle}</span>`;
    }

    const toolbarEl = shell.querySelector('.ds-page-head-toolbar');
    if (toolbarEl) {
        toolbarEl.innerHTML = buildDatasetViewToolbar(activeView);
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
    if (activeView === 'kartlar') {
        return buildDatasetKartlarContent();
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

    const { sortedDomains, maxCount } = getDomainCatalogContext('');
    const term = datasetPageSearchTerm.trim().toLowerCase();
    const filteredDomains = !term
        ? sortedDomains
        : sortedDomains.filter(entry => {
            if (String(entry.name || '').toLowerCase().includes(term)) return true;
            return (entry.datasets || []).some(ds =>
                [ds.label, ds.descriptionScope, ds.stagingTable].some(value =>
                    String(value || '').toLowerCase().includes(term)
                )
            );
        });

    if (!filteredDomains.length) {
        return `
            <div class="domain-mosaic-wrap">
                <div class="ds-empty">Aramayla eşleşen domain veya dataset bulunamadı.</div>
            </div>`;
    }

    const tiles = filteredDomains.map((entry, index) => {
        const originalRank = sortedDomains.findIndex(d => d.id === entry.id) + 1;
        return buildDomainTile(entry, originalRank || (index + 1), maxCount);
    }).join('');

    return `
        <div class="domain-mosaic-wrap">
            <p class="domain-mosaic-hint">
                <i class="ti ti-sort-descending" aria-hidden="true"></i>
                ${term
                    ? `${filteredDomains.length} domain · arama: “${escapeDatasetHtml(datasetPageSearchTerm.trim())}”`
                    : 'Domainler dataset sayısına göre sıralı · detay için karta tıklayın'}
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

function filterDatasetListRows(rows, term) {
    const needle = String(term || '').trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(row =>
        [
            row.datasetName,
            row.descriptionScope,
            row.dataModel,
            row.stagingTableName,
            row.status,
            row.statusResponsible,
            row.layer,
            row.tdAnalyst,
            row.tester,
            row.ktResponsibleItUnit,
            row.ktSpName,
            row.note
        ].some(value => String(value || '').toLowerCase().includes(needle))
    );
}

function buildDatasetListeContent() {
    const filtered = filterDatasetListRows(DATASET_LIST_ROWS, datasetPageSearchTerm);
    const count = DATASET_LIST_ROWS.length;

    return `
        <div class="ds-table-card">
            <div class="ds-table-toolbar ds-table-toolbar--count-only">
                ${tableCountHtml(filtered.length, count, { wrapId: 'dsListCountWrap' })}
            </div>
            <div class="vs-results-wrap is-fill has-data">
                <table class="vs-results-table vs-results-table--wrap" id="dsListTable">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>`;
}

const DATASET_CARD_SORTS = [
    { id: 'name', label: 'Ada göre (A-Z)' },
    { id: 'date', label: 'Statü tarihi (yeni → eski)' },
    { id: 'status', label: 'Statüye göre' }
];

const DATASET_CARD_STATUS_ORDER = { 'is-failed': 0, 'is-running': 1, 'is-pending': 2, 'is-neutral': 3, 'is-done': 4 };

const datasetCardCollator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

function datasetCardText(value) {
    return String(value ?? '').trim();
}

function formatRelativeDays(value) {
    if (!value || !Intl.RelativeTimeFormat) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
    const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
    const abs = Math.abs(diffDays);

    if (abs < 30) return rtf.format(diffDays, 'day');
    if (abs < 365) return rtf.format(Math.round(diffDays / 30), 'month');
    return rtf.format(Math.round(diffDays / 365), 'year');
}

function getDatasetCardsBaseRows() {
    return filterDatasetListRows(DATASET_LIST_ROWS, datasetPageSearchTerm);
}

/** Arama + statü filtresi + sıralama; hem render hem tıklama bu listeyi kullanır. */
function getVisibleDatasetCards() {
    const rows = getDatasetCardsBaseRows();
    const filtered = datasetCardsStatusFilter === null
        ? rows
        : rows.filter(row => datasetCardText(row.status) === datasetCardsStatusFilter);

    const byName = (a, b) => datasetCardCollator.compare(datasetCardText(a.datasetName), datasetCardText(b.datasetName));
    const timeOf = row => {
        const time = new Date(row.statusChangeDate).getTime();
        return Number.isNaN(time) ? 0 : time;
    };
    const orderOf = row => DATASET_CARD_STATUS_ORDER[statusBadgeClass(row.status)] ?? 99;

    const sorted = [...filtered];
    if (datasetCardsSort === 'date') {
        sorted.sort((a, b) => (timeOf(b) - timeOf(a)) || byName(a, b));
    } else if (datasetCardsSort === 'status') {
        sorted.sort((a, b) => (orderOf(a) - orderOf(b)) || byName(a, b));
    } else {
        sorted.sort(byName);
    }
    return sorted;
}

function getDatasetCardStatusCounts(rows) {
    const counts = new Map();
    rows.forEach(row => {
        const status = datasetCardText(row.status);
        counts.set(status, (counts.get(status) || 0) + 1);
    });
    return [...counts.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => (b.count - a.count) || datasetCardCollator.compare(a.status, b.status));
}

function buildDatasetCardsToolbar(baseRows, visibleCount) {
    const counts = getDatasetCardStatusCounts(baseRows);
    if (datasetCardsStatusFilter !== null && !counts.some(c => c.status === datasetCardsStatusFilter)) {
        counts.push({ status: datasetCardsStatusFilter, count: 0 });
    }

    const allActive = datasetCardsStatusFilter === null;
    const chips = [`
        <button type="button" class="ds-cards-chip${allActive ? ' is-active' : ''}" data-ds-status-all aria-pressed="${allActive}">
            Tümü<span class="ds-cards-chip-count">${baseRows.length}</span>
        </button>`];

    counts.forEach(({ status, count }) => {
        const active = datasetCardsStatusFilter === status;
        const safe = escapeDatasetHtml(status);
        chips.push(`
        <button type="button" class="ds-cards-chip ${statusBadgeClass(status)}${active ? ' is-active' : ''}" data-ds-status="${safe}" aria-pressed="${active}">
            <span class="ds-cards-chip-dot" aria-hidden="true"></span>${safe || 'Statüsüz'}<span class="ds-cards-chip-count">${count}</span>
        </button>`);
    });

    const sortOptions = DATASET_CARD_SORTS.map(option =>
        `<option value="${option.id}"${option.id === datasetCardsSort ? ' selected' : ''}>${option.label}</option>`
    ).join('');

    return `
        <div class="ds-cards-toolbar">
            <div class="ds-cards-chips" role="group" aria-label="Statüye göre filtrele">${chips.join('')}</div>
            <div class="ds-cards-toolbar-end">
                <label class="ds-cards-sort">
                    <i class="ti ti-arrows-sort" aria-hidden="true"></i>
                    <select id="dsCardsSort" aria-label="Kartları sırala">${sortOptions}</select>
                </label>
                ${tableCountHtml(visibleCount, DATASET_LIST_ROWS.length, { wrapId: 'dsCardsCountWrap' })}
            </div>
        </div>`;
}

function buildDatasetCardPerson(icon, label, value) {
    const text = datasetCardText(value);
    if (!text) return '';
    const safe = escapeDatasetHtml(text);
    return `
        <div class="ds-dataset-card-person">
            <i class="ti ${icon}" aria-hidden="true"></i>
            <span class="ds-dataset-card-person-label">${label}</span>
            <span class="ds-dataset-card-person-name" title="${safe}">${safe}</span>
        </div>`;
}

function buildDatasetCard(row, index) {
    const statusClass = statusBadgeClass(row.status);
    const name = escapeDatasetHtml(row.datasetName || '—');
    const status = escapeDatasetHtml(row.status || '—');
    const model = escapeDatasetHtml(datasetCardText(row.dataModel));
    const layer = escapeDatasetHtml(datasetCardText(row.layer));
    const staging = escapeDatasetHtml(datasetCardText(row.stagingTableName));
    const scope = escapeDatasetHtml(datasetCardText(row.descriptionScope));
    const relative = formatRelativeDays(row.statusChangeDate);

    const chips = [
        model ? `<span class="ds-dataset-card-chip" title="Data Model"><i class="ti ti-box-model-2" aria-hidden="true"></i>${model}</span>` : '',
        layer ? `<span class="ds-dataset-card-chip is-layer" title="Layer"><i class="ti ti-stack-2" aria-hidden="true"></i>${layer}</span>` : ''
    ].join('');

    const people = [
        buildDatasetCardPerson('ti-user', 'Analist', row.tdAnalyst),
        buildDatasetCardPerson('ti-test-pipe', 'Tester', row.tester),
        buildDatasetCardPerson('ti-user-check', 'Sorumlu', row.statusResponsible)
    ].join('');

    return `
        <article class="ds-dataset-card ${statusClass}"
            data-ds-card-index="${index}"
            role="button"
            tabindex="0"
            aria-label="${name} dataset detayı, statü ${status}">
            <header class="ds-dataset-card-head">
                <h4 class="ds-dataset-card-title" title="${name}">${name}</h4>
                <span class="ds-status-badge ${statusClass}">${status}</span>
            </header>
            ${chips ? `<div class="ds-dataset-card-chips">${chips}</div>` : ''}
            ${staging ? `
            <div class="ds-dataset-card-staging">
                <span>Staging</span>
                <code title="${staging}">${staging}</code>
            </div>` : ''}
            <p class="ds-dataset-card-scope${scope ? '' : ' is-empty'}"${scope ? ` title="${scope}"` : ''}>${scope || 'Kapsam açıklaması yok'}</p>
            <footer class="ds-dataset-card-foot">
                ${people ? `<div class="ds-dataset-card-people">${people}</div>` : ''}
                <div class="ds-dataset-card-date" title="Statü tarihi">
                    <i class="ti ti-clock" aria-hidden="true"></i>
                    <strong>${formatDatasetDate(row.statusChangeDate)}</strong>
                    ${relative ? `<span>· ${escapeDatasetHtml(relative)}</span>` : ''}
                </div>
            </footer>
        </article>`;
}

function buildDatasetCardsSkeleton(count = 6) {
    const card = `
        <div class="ds-dataset-card is-skeleton" aria-hidden="true">
            <span class="ds-skel ds-skel-title"></span>
            <span class="ds-skel ds-skel-chips"></span>
            <span class="ds-skel ds-skel-line"></span>
            <span class="ds-skel ds-skel-line is-short"></span>
            <span class="ds-skel ds-skel-foot"></span>
        </div>`;
    return `
        <div class="ds-cards-wrap" aria-busy="true">
            <div class="ds-cards-grid">${card.repeat(count)}</div>
        </div>`;
}

function buildDatasetKartlarContent() {
    const baseRows = getDatasetCardsBaseRows();
    const visible = getVisibleDatasetCards();
    const toolbar = buildDatasetCardsToolbar(baseRows, visible.length);

    if (!visible.length) {
        const hasFilter = Boolean(datasetPageSearchTerm.trim()) || datasetCardsStatusFilter !== null;
        return `
            <div class="ds-cards-wrap">
                ${toolbar}
                <div class="ds-empty ds-cards-empty">
                    <i class="ti ${hasFilter ? 'ti-filter-off' : 'ti-database-off'}" aria-hidden="true"></i>
                    <p>${hasFilter ? 'Filtrelerle eşleşen dataset bulunamadı.' : 'Dataset kaydı bulunamadı.'}</p>
                    ${hasFilter ? '<button type="button" class="ds-cards-clear" data-ds-cards-clear>Filtreyi temizle</button>' : ''}
                </div>
            </div>`;
    }

    return `
        <div class="ds-cards-wrap">
            ${toolbar}
            <div class="ds-cards-grid" id="dsCardsGrid">${visible.map(buildDatasetCard).join('')}</div>
        </div>`;
}

function buildDatasetCardDrawerBody(row) {
    const groups = [
        ['Genel', [
            ['Dataset', row.datasetName],
            ['Data Model', row.dataModel],
            ['Layer', row.layer],
            ['Staging Tablo', row.stagingTableName, true],
            ['Statü Tarihi', row.statusChangeDate ? formatDatasetDate(row.statusChangeDate) : '']
        ]],
        ['Sorumlular', [
            ['TD Analist', row.tdAnalyst],
            ['Tester', row.tester],
            ['Statü Sorumlusu', row.statusResponsible],
            ['KT IT Birimi', row.ktResponsibleItUnit]
        ]],
        ['Teknik', [
            ['KT SP', row.ktSpName, true]
        ]],
        ['Açıklama', [
            ['Kapsam', row.descriptionScope],
            ['Not', row.note]
        ]]
    ];

    const sections = groups.map(([title, fields]) => {
        const rows = fields
            .filter(([, value]) => datasetCardText(value))
            .map(([label, value, isCode]) => `
                <div class="ds-card-detail-row">
                    <dt>${escapeDatasetHtml(label)}</dt>
                    <dd${isCode ? ' class="is-code"' : ''}>${escapeDatasetHtml(datasetCardText(value))}</dd>
                </div>`).join('');
        if (!rows) return '';
        return `
            <section class="ds-card-detail-group">
                <h5 class="ds-card-detail-group-title">${escapeDatasetHtml(title)}</h5>
                <dl class="ds-card-detail-list">${rows}</dl>
            </section>`;
    }).join('');

    return `
        <div class="ds-card-detail">
            <div class="ds-card-detail-status">
                <span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status || '—')}</span>
            </div>
            ${sections}
        </div>`;
}

function openDatasetCardDrawer(row) {
    if (!row) return;
    openSurecDrawer({
        title: row.datasetName || 'Dataset',
        subtitle: [row.dataModel, row.layer].filter(Boolean).join(' · ') || 'Dataset detayı',
        theme: 'teal',
        bodyHtml: buildDatasetCardDrawerBody(row)
    });
}

function bindDatasetKartlarInteractions(root) {
    const shell = root.querySelector?.('.dataset-catalog') || root;
    const wrap = shell.querySelector('.ds-cards-wrap');
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';

    const openFromCard = card => {
        const index = Number(card.getAttribute('data-ds-card-index'));
        openDatasetCardDrawer(getVisibleDatasetCards()[index]);
    };

    // Filtre/sıralama değişiminde içerik yeniden çizilir; klavye odağı aynı kontrole geri verilir.
    const rerender = focusSelector => {
        refreshDatasetKartlarContent(shell, { animate: false });
        if (focusSelector) shell.querySelector(focusSelector)?.focus();
    };

    wrap.addEventListener('click', event => {
        const chip = event.target.closest('[data-ds-status], [data-ds-status-all]');
        if (chip) {
            const next = chip.hasAttribute('data-ds-status-all') ? null : chip.getAttribute('data-ds-status');
            datasetCardsStatusFilter = next === datasetCardsStatusFilter ? null : next;
            rerender(datasetCardsStatusFilter === null
                ? '[data-ds-status-all]'
                : `[data-ds-status="${CSS.escape(datasetCardsStatusFilter)}"]`);
            return;
        }

        if (event.target.closest('[data-ds-cards-clear]')) {
            datasetCardsStatusFilter = null;
            datasetPageSearchTerm = '';
            const input = shell.querySelector('#dsPageSearch');
            if (input) input.value = '';
            rerender('[data-ds-status-all]');
            return;
        }

        const card = event.target.closest('.ds-dataset-card[data-ds-card-index]');
        if (card) openFromCard(card);
    });

    wrap.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('.ds-dataset-card[data-ds-card-index]');
        if (!card || event.target !== card) return;
        event.preventDefault();
        openFromCard(card);
    });

    wrap.addEventListener('change', event => {
        if (event.target.id !== 'dsCardsSort') return;
        datasetCardsSort = event.target.value;
        rerender('#dsCardsSort');
    });
}

function refreshDatasetKartlarContent(shell, { animate = true } = {}) {
    const contentEl = shell.querySelector('.ds-page-content');
    if (!contentEl) return;
    contentEl.innerHTML = buildDatasetKartlarContent();
    if (animate) animateDatasetStage(contentEl);
    bindDatasetKartlarInteractions(shell);
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

function buildDatasetStatusContent() {
    // Statü görünümünde sayfa araması yok; özet tablolar her zaman tam veri gösterir.
    const ozetRows = resolveDatasetStatusOzet();
    const modelRows = resolveDatasetStatusModelRows();
    const mockBadge = buildDatasetStatusMockBadge();

    return `
        <div class="ds-status-split" data-ozet-count="${ozetRows.length}" data-model-count="${modelRows.length}">
            ${mockBadge ? `<div class="ds-status-mock-bar">${mockBadge}</div>` : ''}
            <div class="ds-table-card ds-status-ozet-card">
                <div class="ds-table-toolbar">
                    <div class="ds-table-toolbar-title">
                        <h4>Dataset Durumları</h4>
                    </div>
                </div>
                <div class="vs-results-wrap has-data">
                    <table class="vs-results-table ds-status-compact-table" id="dsStatusOzetTable">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
            <div class="ds-table-card ds-status-model-card">
                <div class="ds-table-toolbar">
                    <div class="ds-table-toolbar-title">
                        <h4>Data Model × Statü</h4>
                    </div>
                </div>
                <div class="vs-results-wrap has-data">
                    <table class="vs-results-table vs-results-table--wrap ds-status-compact-table" id="dsStatusModelTable">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>`;
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
        const tile = event.target.closest('.domain-tile[data-domain-id]');
        if (!tile) return;

        const domainId = tile.getAttribute('data-domain-id');
        if (!domainId) return;
        openDomainDrawer(domainId);
    });

    shell.addEventListener('keydown', event => {
        const tile = event.target.closest('.domain-tile[data-domain-id]');
        if (!tile) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const domainId = tile.getAttribute('data-domain-id');
        if (!domainId) return;
        openDomainDrawer(domainId);
    });
}

function refreshDatasetCatalogContent(shell) {
    const contentEl = shell.querySelector('.ds-page-content');
    if (!contentEl) return;

    shell.classList.remove('is-domain-focused');
    const meta = getDatasetPageMeta('katalog');
    const textEl = shell.querySelector('.ds-page-head-text');
    if (textEl) {
        textEl.innerHTML = `<h3>${meta[0]}</h3><span class="ds-page-head-subtitle">${meta[1]}</span>`;
    }

    contentEl.innerHTML = buildDatasetCatalogContent();
    animateDatasetStage(contentEl);
}

function mountDatasetListTable(root, rows) {
    if (!window.SmartTable) return;
    const table = root.querySelector('#dsListTable');
    if (!table) return;
    window.SmartTable.destroy(table);
    dsListSmartTable = window.SmartTable.mount({
        scrollEl: table.closest('.vs-results-wrap'),
        headEl: table.querySelector('thead'),
        bodyEl: table.querySelector('tbody'),
        cols: [
            { key: 'datasetName', label: 'Dataset' },
            { key: 'dataModel', label: 'Data Model' },
            { key: 'stagingTableName', label: 'Staging Tablo' },
            { key: 'layer', label: 'Layer' },
            { key: 'status', label: 'Statü' },
            { key: 'statusChangeDate', label: 'Statü Tarihi' },
            { key: 'statusResponsible', label: 'Statü Sorumlusu' },
            { key: 'tdAnalyst', label: 'TD Analist' },
            { key: 'tester', label: 'Tester' },
            { key: 'ktResponsibleItUnit', label: 'KT IT Birimi' },
            { key: 'ktSpName', label: 'KT SP' },
            { key: 'descriptionScope', label: 'Kapsam' },
            { key: 'note', label: 'Not' }
        ],
        rows,
        wrapCells: true,
        tableClass: 'vs-results-table vs-results-table--wrap',
        getValue: (row, col) => row[col],
        formatCell: (col, row, value) => {
            if (col === 'status') {
                return `<td class="vs-cell-nowrap"><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>`;
            }
            if (col === 'statusChangeDate') {
                return `<td class="vs-cell-nowrap">${formatDatasetDate(value)}</td>`;
            }
            const nowrapCols = ['datasetName', 'layer'];
            const wrapClass = nowrapCols.includes(col) ? 'vs-cell-nowrap' : 'vs-cell-wrap';
            const extraClass = col === 'ktSpName' ? ' vs-cell-wrap--kt-sp'
                : col === 'descriptionScope' ? ' vs-cell-wrap--scope'
                    : col === 'note' ? ' vs-cell-wrap--note' : '';
            return `<td class="${wrapClass}${extraClass}">${escapeDatasetHtml(value || (col === 'ktSpName' || col === 'descriptionScope' ? '—' : ''))}</td>`;
        },
        onFilteredChange: shown => updateTableCount(root, shown, DATASET_LIST_ROWS.length, { wrapId: 'dsListCountWrap' })
    });
}

function mountDatasetStatusTables(shell) {
    if (!window.SmartTable) return;
    const ozetRows = resolveDatasetStatusOzet();
    const modelRows = resolveDatasetStatusModelRows();

    const ozetTable = shell.querySelector('#dsStatusOzetTable');
    if (ozetTable) {
        window.SmartTable.destroy(ozetTable);
        window.SmartTable.mount({
            scrollEl: ozetTable.closest('.vs-results-wrap'),
            headEl: ozetTable.querySelector('thead'),
            bodyEl: ozetTable.querySelector('tbody'),
            cols: [
                { key: 'status', label: 'Statü' },
                { key: 'adet', label: 'Adet', type: 'number' }
            ],
            rows: ozetRows,
            wrapCells: true,
            filterable: false,
            tableClass: 'vs-results-table ds-status-compact-table',
            formatCell: (col, row, value) => {
                if (col === 'status') {
                    return `<td><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>`;
                }
                if (col === 'adet') return `<td class="ds-num-col"><strong>${value}</strong></td>`;
                return null;
            }
        });
    }

    const modelTable = shell.querySelector('#dsStatusModelTable');
    if (modelTable) {
        window.SmartTable.destroy(modelTable);
        window.SmartTable.mount({
            scrollEl: modelTable.closest('.vs-results-wrap'),
            headEl: modelTable.querySelector('thead'),
            bodyEl: modelTable.querySelector('tbody'),
            cols: [
                { key: 'dataModel', label: 'Model' },
                { key: 'status', label: 'Statü' },
                { key: 'adet', label: 'Adet', type: 'number' }
            ],
            rows: modelRows,
            wrapCells: true,
            filterable: false,
            tableClass: 'vs-results-table vs-results-table--wrap ds-status-compact-table',
            formatCell: (col, row, value) => {
                if (col === 'dataModel') return `<td class="vs-cell-wrap ds-model-name-col">${escapeDatasetHtml(value)}</td>`;
                if (col === 'status') {
                    return `<td><span class="ds-status-badge ${statusBadgeClass(row.status)}">${escapeDatasetHtml(row.status)}</span></td>`;
                }
                if (col === 'adet') return `<td class="ds-num-col"><strong>${value}</strong></td>`;
                return null;
            }
        });
    }
}

function mountFlowDetailTable() {
    if (!window.SmartTable) return;
    const detail = document.querySelector('.flow-layer-detail');
    if (!detail) return;
    const layerName = detail.getAttribute('data-flow-detail');
    const col = COCKPIT_COLUMNS.find(item => item.name === layerName);
    if (!col) return;
    const table = detail.querySelector('.flow-layer-detail-table');
    if (!table) return;
    window.SmartTable.destroy(table);
    const kayitlar = getVisibleKayitlar(col);
    flowDetailSmartTable = window.SmartTable.mount({
        scrollEl: detail.querySelector('.flow-layer-detail-table-wrap'),
        headEl: table.querySelector('thead'),
        bodyEl: table.querySelector('tbody'),
        cols: [
            { key: 'targetTableName', label: 'Hedef Tablo' },
            { key: 'durumMetni', label: 'Statü' },
            { key: 'dataDate', label: 'Veri Tarihi' },
            { key: 'executionStartTime', label: 'Başlangıç' },
            { key: 'executionEndTime', label: 'Bitiş' },
            { key: 'sureDakika', label: 'Süre (dk)', type: 'number' },
            { key: 'executionRecordCount', label: 'Kayıt', type: 'number' },
            { key: 'errorMessageText', label: 'Hata' }
        ],
        rows: kayitlar,
        wrapCells: true,
        tableClass: 'vs-results-table vs-results-table--wrap flow-layer-detail-table',
        getValue: (row, colKey) => {
            if (colKey === 'dataDate') return formatDatasetDate(resolveFlowKayitDataDate(row));
            return row[colKey];
        },
        formatCell: (colKey, row, value) => {
            if (colKey === 'targetTableName') {
                return `<td class="flow-detail-target" title="${escapeDatasetHtml(value)}">${escapeDatasetHtml(value)}</td>`;
            }
            if (colKey === 'durumMetni') {
                return `<td class="flow-detail-statu"><span class="flow-status-pill ${gunlukAkisStatusChipClass(row.durumMetni, row.durum)}">${escapeDatasetHtml(row.durumMetni || 'Not Started')}</span></td>`;
            }
            if (colKey === 'errorMessageText') {
                return `<td class="flow-detail-error vs-cell-wrap" title="${escapeDatasetHtml(value || '')}">${escapeDatasetHtml(value || '—')}</td>`;
            }
            if (colKey === 'executionStartTime' || colKey === 'executionEndTime') {
                return `<td class="flow-detail-nowrap">${formatGunlukAkisDateTime(value)}</td>`;
            }
            if (colKey === 'sureDakika') {
                return `<td class="flow-detail-nowrap">${formatGunlukAkisMinutes(value)}</td>`;
            }
            if (colKey === 'executionRecordCount') {
                const text = value != null ? Number(value).toLocaleString('tr-TR') : '—';
                return `<td class="flow-detail-nowrap">${text}</td>`;
            }
            return `<td class="flow-detail-nowrap">${escapeDatasetHtml(value)}</td>`;
        }
    });
}

function mountTaskListTable(root, rows) {
    if (!window.SmartTable) return;
    const table = root.querySelector('#tlResultsTable');
    if (!table) return;
    window.SmartTable.destroy(table);
    tlSmartTable = window.SmartTable.mount({
        scrollEl: root.querySelector('#tlResultsWrap'),
        headEl: table.querySelector('thead'),
        bodyEl: table.querySelector('#tlBody') || table.querySelector('tbody'),
        cols: [
            { key: 'layer', label: 'Katman' },
            { key: 'task', label: 'Paket Adı' },
            { key: 'datasetCode', label: 'Hedef Tablo' },
            { key: 'active', label: 'Aktiflik' },
            { key: 'lastExecution', label: 'Son Çalıştırma Tarihi' },
            { key: 'transferType', label: 'Transfer Tipi' },
            { key: 'loadPeriodType', label: 'Yükleme Periyodu' },
            { key: 'datasetLabel', label: 'Dataset' }
        ],
        rows,
        wrapCells: true,
        tableClass: 'vs-results-table vs-results-table--wrap',
        formatCell: (col, row, value) => {
            if (col === 'active') return `<td class="vs-cell-nowrap">${formatAktiflikCell(row.active)}</td>`;
            if (col === 'lastExecution') return `<td class="vs-cell-nowrap">${formatDatasetDate(value)}</td>`;
            if (col === 'transferType') return `<td class="vs-cell-wrap">${formatTransferTypeCell(row)}</td>`;
            const nowrap = ['layer', 'active', 'lastExecution'].includes(col);
            return `<td class="${nowrap ? 'vs-cell-nowrap' : 'vs-cell-wrap'}">${col === 'task' || col === 'datasetCode' || col === 'loadPeriodType' ? escapeDatasetHtml(value) : value}</td>`;
        },
        onFilteredChange: shown => updateTaskListCount(root, shown, getTaskListRows().length)
    });
}

function bindDatasetListSearch(root) {
    const filtered = filterDatasetListRows(DATASET_LIST_ROWS, datasetPageSearchTerm);
    if (dsListSmartTable) {
        dsListSmartTable.setRows(filtered);
    } else {
        mountDatasetListTable(root, filtered);
    }
}

function applyDatasetPageSearch(shell) {
    if (!shell) return;

    if (datasetPageView === 'liste') {
        bindDatasetListSearch(shell);
        return;
    }

    if (datasetPageView === 'kartlar') {
        refreshDatasetKartlarContent(shell);
        return;
    }

    if (datasetPageView === 'statu') {
        return;
    }

    refreshDatasetCatalogContent(shell);
    if (datasetCatalogFocusId && document.querySelector('#surecDrawerHost .sc-drawer.is-open')) {
        openDomainDrawer(datasetCatalogFocusId);
    }
}

function bindDatasetPageSearch(root) {
    const shell = root.querySelector('.dataset-catalog') || root.closest?.('.dataset-catalog') || root;
    if (!shell) return;

    const input = shell.querySelector('#dsPageSearch');
    if (!input || input.dataset.bound === '1') return;
    input.dataset.bound = '1';

    const apply = () => {
        datasetPageSearchTerm = input.value || '';
        applyDatasetPageSearch(shell);
    };

    if (window.FilterBar?.bindField) {
        window.FilterBar.bindField(input, { debounceMs: 200, onFilter: apply });
    } else {
        input.addEventListener('input', () => {
            clearTimeout(input._dsSearchTimer);
            input._dsSearchTimer = setTimeout(apply, 200);
        });
    }
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

        closeSurecDrawer({ immediate: true });
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
        contentEl.innerHTML = datasetPageView === 'kartlar'
            ? buildDatasetCardsSkeleton()
            : '<div class="ds-loading">Yükleniyor…</div>';
    }

    let loadError = null;

    try {
        await loadDatasetCatalogData();
    } catch (err) {
        loadError = err.message || 'Dataset katalog alınamadı.';
        console.warn('Dataset katalog yüklenemedi:', loadError);
        DATASET_DOMAINS = [];
    }

    if (datasetPageView === 'liste' || datasetPageView === 'kartlar') {
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
        } else if (loadError && (datasetPageView === 'liste' || datasetPageView === 'kartlar')) {
            contentEl.innerHTML = buildDatasetErrorContent(loadError) + buildDatasetContentOnly(datasetPageView);
        } else {
            contentEl.innerHTML = buildDatasetContentOnly(datasetPageView);
        }
        animateDatasetStage(contentEl);
    }

    if (datasetPageView === 'liste') {
        bindDatasetListSearch(shell);
    } else if (datasetPageView === 'kartlar') {
        bindDatasetKartlarInteractions(shell);
    } else if (datasetPageView === 'statu') {
        mountDatasetStatusTables(shell);
    } else if (datasetPageView === 'katalog') {
        shell.classList.remove('is-domain-focused');
        bindDatasetCatalogInteractions(el);
        if (datasetCatalogFocusId) {
            openDomainDrawer(datasetCatalogFocusId);
        }
    }

    bindDatasetPageSearch(shell);
}

function buildCockpitColumn(col) {
    return buildFlowLayerTile(col);
}

function buildSurecHTML() {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dataDate = getGunlukAkisDate();

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
        <div class="cockpit-body">
            <div class="cockpit-grid cockpit-grid-flow" id="cockpitFlowGrid">${buildFlowLayerGridHtml()}</div>
        </div>
    </section>`;
}

function rerenderSurecCockpit(container) {
    const root = container || document.getElementById('pageBody');
    if (!root) return;
    root.innerHTML = buildSurecHTML();
    bindSurecCockpit();
    bindSurecCockpitDateFilter(root);
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
        closeSurecDrawer({ immediate: true });
        cockpitFocusLayer = null;
        root.innerHTML = '<div class="cockpit-loading">Yükleniyor…</div>';
        await loadSurecData({ dataDate: input.value, kokpitOnly: true });
        rerenderSurecCockpit(root);
    });
}

function bindGlobalCockpitStatusFilters() {
    const cockpit = document.querySelector('.cockpit');
    if (!cockpit || cockpit.dataset.globalFilterBound === '1') return;
    cockpit.dataset.globalFilterBound = '1';

    cockpit.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
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

function bindFlowLayerTiles() {
    const cockpit = document.querySelector('.cockpit');
    if (!cockpit || cockpit.dataset.flowLayerBound === '1') return;
    cockpit.dataset.flowLayerBound = '1';

    cockpit.addEventListener('click', event => {
        const tile = event.target.closest('.flow-layer-tile[data-flow-layer]');
        if (!tile) return;
        const layer = tile.getAttribute('data-flow-layer');
        if (!layer) return;
        openFlowLayerDrawer(layer);
    });

    cockpit.addEventListener('keydown', event => {
        const tile = event.target.closest('.flow-layer-tile[data-flow-layer]');
        if (!tile) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const layer = tile.getAttribute('data-flow-layer');
        if (!layer) return;
        openFlowLayerDrawer(layer);
    });
}

function bindSurecCockpit() {
    const cockpit = document.querySelector('.cockpit');
    if (cockpit) {
        delete cockpit.dataset.globalFilterBound;
        delete cockpit.dataset.flowLayerBound;
    }

    const clock = document.getElementById('cockpitClock');
    if (clock) {
        if (window._cockpitTimer) clearInterval(window._cockpitTimer);
        window._cockpitTimer = setInterval(() => {
            clock.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }, 1000);
    }

    bindGlobalCockpitStatusFilters();
    bindFlowLayerTiles();
    if (cockpitFocusLayer) {
        openFlowLayerDrawer(cockpitFocusLayer);
    }
}

async function initSurecCockpit(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    closeSurecDrawer({ immediate: true });
    if (!gunlukAkisDataDate) {
        gunlukAkisDataDate = getDefaultGunlukAkisDate();
    }
    cockpitFocusLayer = null;
    await loadSurecData({ dataDate: gunlukAkisDataDate, kokpitOnly: true });
    rerenderSurecCockpit(el);
}

async function initDatasetCatalog(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    closeSurecDrawer({ immediate: true });
    if (window._cockpitTimer) {
        clearInterval(window._cockpitTimer);
        window._cockpitTimer = null;
    }
    datasetPageView = getDatasetPageView();
    await renderDatasetPage(el);
}

let TASK_LIST_ROWS = [];

function pickTaskListField(item, ...keys) {
    for (const key of keys) {
        const value = item?.[key];
        if (value != null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '—';
}

function mapTaskListesiRows(items) {
    return items.map(item => ({
        layer: item.katman || item.Katman || '—',
        datasetCode: item.datasetKod || item.DatasetKod || '',
        datasetLabel: item.datasetEtiket || item.DatasetEtiket || item.datasetKod || item.DatasetKod || '',
        task: item.etiket || item.Etiket || '',
        loadPeriodType: pickTaskListField(item, 'yuklemePeriyodu', 'YuklemePeriyodu'),
        transferType: pickTaskListField(item, 'transferTipi', 'TransferTipi'),
        active: item.aktif ?? item.Aktif ?? null,
        lastExecution: item.sonGuncelleme || item.SonGuncelleme || null
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

async function loadTaskListesiData() {
    if (typeof ApiClient === 'undefined') return;
    try {
        const items = await ApiClient.getTaskListesi();
        if (Array.isArray(items)) {
            TASK_LIST_ROWS = mapTaskListesiRows(items);
            return;
        }
        TASK_LIST_ROWS = [];
    } catch (err) {
        console.warn('Paket listesi API\'den yüklenemedi:', err.message);
        TASK_LIST_ROWS = [];
    }
}

function getTaskListRows() {
    return TASK_LIST_ROWS;
}

function tableCountHtml(filtered, total, options = {}) {
    if (window.TableCount?.formatHtml) {
        return window.TableCount.formatHtml(filtered, total, options);
    }
    return `<span>${filtered} kayıt</span>`;
}

function updateTableCount(root, filtered, total, options = {}) {
    window.TableCount?.set(root, filtered, total, options);
}

function formatTaskListCountHtml(filtered, total) {
    return tableCountHtml(filtered, total, { wrapId: 'tlCountWrap' });
}

function updateTaskListCount(root, filtered, total) {
    updateTableCount(root, filtered, total, { wrapId: 'tlCountWrap' });
}

function buildTaskListesiHTML() {
    const rows = getTaskListRows();
    const total = rows.length;
    return `<div class="tl-layout">
        <div class="tl-head">
            <h3>Paket Listesi</h3>
            <p>ParallelRun paket envanteri</p>
            ${formatTaskListCountHtml(total, total)}
        </div>
        <div class="tl-card">
            <div class="vs-results-wrap is-fill has-data" id="tlResultsWrap">
                <table class="vs-results-table vs-results-table--wrap" id="tlResultsTable">
                    <thead></thead>
                    <tbody id="tlBody"></tbody>
                </table>
            </div>
        </div>
    </div>`;
}

function mountTaskListesi(container) {
    const root = container || document.getElementById('pageBody');
    if (!root) return;
    mountTaskListTable(root, getTaskListRows());
}

async function initTaskListesi(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    closeSurecDrawer({ immediate: true });
    if (window._cockpitTimer) {
        clearInterval(window._cockpitTimer);
        window._cockpitTimer = null;
    }
    await loadTaskListesiData();
    el.innerHTML = buildTaskListesiHTML();
    mountTaskListesi(el);
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
            const rows = col.ozetSatirlar || [];
            const running = rows.some(row => row.durum === 'running');
            const failed = rows.some(row => row.durum === 'failed');
            const allDone = rows.length > 0 && rows.every(row => row.durum === 'done');
            return {
                name: col.name,
                theme: col.theme,
                paketSayisi: col.paketSayisi ?? 0,
                tamamlanmaYuzdesi: col.tamamlanmaYuzdesi ?? 0,
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
