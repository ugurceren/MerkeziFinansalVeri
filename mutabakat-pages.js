(function () {
    let periods = [];
    let diffAccounts = [];
    let activePeriodYilAy = '2026-06';
    let matrixMapData = null;
    let matrixMapFilters = {};
    let matrixMapFilterPanelOpen = false;
    let matrixMapFilterDebounceTimer = null;

    const MATRIXMAP_COLUMNS = [
        { key: 'systemDateTime', label: 'SystemDateTime' },
        { key: 'validFrom', label: 'ValidFrom' },
        { key: 'validUntil', label: 'ValidUntil' },
        { key: 'scdActiveFlag', label: 'SCDActiveFlag' },
        { key: 'trustedDataMatrixMapId', label: 'TrustedDataMatrixMapId' },
        { key: 'sourceName', label: 'SourceName' },
        { key: 'matrixTableId', label: 'MatrixTableId' },
        { key: 'matrixTableName', label: 'MatrixTableName' },
        { key: 'matrixTableDescription', label: 'MatrixTableDescription' },
        { key: 'matrixColumnId', label: 'MatrixColumnId' },
        { key: 'matrixColumnName', label: 'MatrixColumnName' },
        { key: 'matrixColumnDescription', label: 'MatrixColumnDescription' },
        { key: 'tdInscopeFlag', label: 'TDInscopeFlag' },
        { key: 'balanceTypeName', label: 'BalanceTypeName' },
        { key: 'insertUserCode', label: 'InsertUserCode' },
        { key: 'updateUserCode', label: 'UpdateUserCode' }
    ];

    const MATRIXMAP_FILTER_FIELDS = [
        { apiKey: 'matrixTableName', label: 'MatrixTableName', maxLength: 120, type: 'text' },
        { apiKey: 'matrixTableDescription', label: 'MatrixTableDescription', maxLength: 250, type: 'text' },
        { apiKey: 'matrixColumnName', label: 'MatrixColumnName', maxLength: 120, type: 'text' },
        { apiKey: 'matrixColumnDescription', label: 'MatrixColumnDescription', maxLength: 250, type: 'text' },
        { apiKey: 'tdInscopeFlag', label: 'TDInscopeFlag', type: 'tinyint' },
        { apiKey: 'balanceTypeName', label: 'BalanceTypeName', maxLength: 120, type: 'text' }
    ];

    const MATRIXMAP_COLUMN_KEYS = Object.fromEntries(
        MATRIXMAP_COLUMNS.map(c => [c.key, c.key.replace(/^[a-z]/, ch => ch.toUpperCase())])
    );
    MATRIXMAP_COLUMN_KEYS.systemDateTime = 'SystemDateTime';
    MATRIXMAP_COLUMN_KEYS.validFrom = 'ValidFrom';
    MATRIXMAP_COLUMN_KEYS.validUntil = 'ValidUntil';
    MATRIXMAP_COLUMN_KEYS.scdActiveFlag = 'SCDActiveFlag';
    MATRIXMAP_COLUMN_KEYS.trustedDataMatrixMapId = 'TrustedDataMatrixMapId';
    MATRIXMAP_COLUMN_KEYS.sourceName = 'SourceName';
    MATRIXMAP_COLUMN_KEYS.matrixTableId = 'MatrixTableId';
    MATRIXMAP_COLUMN_KEYS.matrixTableName = 'MatrixTableName';
    MATRIXMAP_COLUMN_KEYS.matrixTableDescription = 'MatrixTableDescription';
    MATRIXMAP_COLUMN_KEYS.matrixColumnId = 'MatrixColumnId';
    MATRIXMAP_COLUMN_KEYS.matrixColumnName = 'MatrixColumnName';
    MATRIXMAP_COLUMN_KEYS.matrixColumnDescription = 'MatrixColumnDescription';
    MATRIXMAP_COLUMN_KEYS.tdInscopeFlag = 'TDInscopeFlag';
    MATRIXMAP_COLUMN_KEYS.balanceTypeName = 'BalanceTypeName';
    MATRIXMAP_COLUMN_KEYS.insertUserCode = 'InsertUserCode';
    MATRIXMAP_COLUMN_KEYS.updateUserCode = 'UpdateUserCode';

    const STATUS_LABEL = {
        aktif: { cls: 'aktif', label: 'Aktif' },
        kapali: { cls: 'kapali', label: 'Kapalı' },
        onay: { cls: 'onay', label: 'Onay Bekliyor' },
        acik: { cls: 'acik', label: 'Açık' },
        inceleniyor: { cls: 'inceleniyor', label: 'İnceleniyor' },
        kapatildi: { cls: 'kapatildi', label: 'Kapatıldı' }
    };

    function formatMoney(n) {
        return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function apiErrorMessage(err) {
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            return `API'ye ulaşılamıyor. start-api.bat çalıştırın. Varsayılan: ${ApiClient.baseUrl}`;
        }
        return msg;
    }

    function getActivePeriod() {
        const active = periods.find(p => p.aktifMi);
        return active?.yilAy || activePeriodYilAy;
    }

    function persistMutabakatPeriod(yilAy) {
        if (yilAy && /^\d{4}-\d{2}$/.test(yilAy)) {
            localStorage.setItem('mutabakatPeriod', yilAy);
        }
    }

    async function setActivePeriod(donemId, yilAy) {
        await ApiClient.setAktifDonem(donemId);
        activePeriodYilAy = yilAy;
        persistMutabakatPeriod(yilAy);
        await loadData();
    }

    async function loadData() {
        try {
            periods = await ApiClient.getMutabakatDonemler();
            const active = periods.find(p => p.aktifMi);
            if (active) {
                activePeriodYilAy = active.yilAy;
                persistMutabakatPeriod(active.yilAy);
            }
            diffAccounts = await ApiClient.getFarkVeren({ donemId: active?.donemId });
        } catch (err) {
            console.error('Mutabakat verisi yüklenemedi:', err);
        }
    }

    function buildPeriodRows(activeId) {
        return periods.map(p => {
            const badge = STATUS_LABEL[p.durum] || { cls: '', label: p.durum };
            const isActive = p.yilAy === activeId;
            return `<tr class="${isActive ? 'mt-row-active' : ''}" data-period="${p.yilAy}" data-donem-id="${p.donemId}">
                <td><strong>${p.etiket}</strong></td>
                <td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>
                <td class="mt-num">${p.hesapSayisi}</td>
                <td class="mt-num">${p.farkVerenSayisi}</td>
                <td>${p.kapanisTarihi || '—'}</td>
            </tr>`;
        }).join('');
    }

    function buildDiffRows(rows) {
        return rows.map(r => {
            const diff = r.mizanBakiye - r.kartonBakiye;
            const badge = STATUS_LABEL[r.durum] || { cls: '', label: r.durum };
            const diffClass = diff !== 0 ? 'mt-diff' : '';
            return `<tr>
                <td>${r.hesapKodu}</td>
                <td>${r.hesapAdi}</td>
                <td>${r.ekipAdi || ''}</td>
                <td class="mt-num">${formatMoney(r.mizanBakiye)}</td>
                <td class="mt-num">${formatMoney(r.kartonBakiye)}</td>
                <td class="mt-num ${diffClass}">${diff > 0 ? '+' : ''}${formatMoney(diff)}</td>
                <td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>
            </tr>`;
        }).join('');
    }

    function buildDonemHTML() {
        const activeId = getActivePeriod();
        const activePeriod = periods.find(p => p.yilAy === activeId);
        const activeLabel = activePeriod?.etiket || activeId;

        return `<section class="mt-layout">
            <div class="mt-head">
                <h3>Mutabakat Dönemi</h3>
                <p>Mutabakat ve raporlama için aktif dönem seçimi</p>
            </div>
            <div class="mt-card mt-donem-picker" id="mt-donem-picker">
                <div class="mt-card-head">
                    <h4><i class="ti ti-calendar" aria-hidden="true"></i> Aktif Dönem</h4>
                    <span class="mt-active-label">Seçili: <strong>${activeLabel}</strong></span>
                </div>
                <div class="mt-donem-picker-body">
                    <div class="mt-period-active">
                        <label for="mtActivePeriod">Dönem (Ay / Yıl)</label>
                        <input type="month" id="mtActivePeriod" value="${activeId}">
                    </div>
                    <p class="mt-hint">Kebir hesapları, mizan ve fark veren ekranlarında varsayılan filtre dönemi olarak kullanılır. Ay/yıl alanından veya alttaki tablodan satır seçerek değiştirebilirsiniz.</p>
                </div>
            </div>
            <div class="mt-card" id="mt-donem">
                <div class="mt-card-head">
                    <h4><i class="ti ti-list" aria-hidden="true"></i> Dönem Listesi</h4>
                </div>
                <div class="mt-scroll">
                    <table class="mt-table">
                        <thead>
                            <tr>
                                <th>Dönem</th>
                                <th>Durum</th>
                                <th>Hesap Sayısı</th>
                                <th>Fark Veren</th>
                                <th>Kapanış Tarihi</th>
                            </tr>
                        </thead>
                        <tbody>${buildPeriodRows(activeId)}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function buildFarkVerenHTML() {
        const activeId = getActivePeriod();
        const openDiffs = diffAccounts.filter(r => r.durum === 'acik' || r.durum === 'inceleniyor');
        const totalDiff = openDiffs.reduce((s, r) => s + Math.abs(r.mizanBakiye - r.kartonBakiye), 0);

        return `<section class="mt-layout">
            <div class="mt-head">
                <h3>Fark Veren Hesaplar</h3>
                <p>Mizan ve karton tablo bakiye farkları — ${activeId} dönemi</p>
            </div>
            <div class="mt-card" id="mt-fark">
                <div class="mt-card-head">
                    <h4><i class="ti ti-arrows-diff" aria-hidden="true"></i> Fark Listesi</h4>
                    <span>${activeId} dönemi</span>
                </div>
                <div class="mt-summary">
                    <div class="mt-stat">
                        <strong>${openDiffs.length}</strong>
                        <span>Açık fark</span>
                    </div>
                    <div class="mt-stat">
                        <strong>${diffAccounts.length}</strong>
                        <span>Toplam kayıt</span>
                    </div>
                    <div class="mt-stat">
                        <strong>${formatMoney(totalDiff)} ₺</strong>
                        <span>Toplam fark tutarı</span>
                    </div>
                </div>
                <div class="mt-filter-bar">
                    <div class="fg">
                        <label for="mtFilterCode">Hesap Kodu</label>
                        <input type="text" id="mtFilterCode" placeholder="Kod ara...">
                    </div>
                    <div class="fg">
                        <label for="mtFilterTeam">Sorumlu Ekip</label>
                        <input type="text" id="mtFilterTeam" placeholder="Ekip ara...">
                    </div>
                    <button type="button" class="filter-btn" id="mtFilterBtn">Filtrele</button>
                </div>
                <div class="mt-scroll">
                    <table class="mt-table" id="mtDiffTable">
                        <thead>
                            <tr>
                                <th>Hesap Kodu</th>
                                <th>Hesap Adı</th>
                                <th>Sorumlu Ekip</th>
                                <th>Mizan Bakiye</th>
                                <th>Karton Tablo Bakiye</th>
                                <th>Fark</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>${buildDiffRows(diffAccounts)}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    async function loadMatrixMapData(filters = {}) {
        matrixMapFilters = { ...filters };
        try {
            matrixMapData = await ApiClient.getMatrixMap(filters);
        } catch (err) {
            console.error('MatrixMap verisi yüklenemedi:', err);
            matrixMapData = { basarili: false, hata: apiErrorMessage(err) };
        }
    }

    function formatMatrixMapCell(colKey, val) {
        if (val === null || val === undefined) return '';
        if (colKey === 'scdActiveFlag' || colKey === 'tdInscopeFlag') {
            const active = val === 1 || val === '1';
            return `<span class="mt-badge ${active ? 'aktif' : 'kapali'}">${active ? '1' : '0'}</span>`;
        }
        return escapeHtml(String(val));
    }

    function buildMatrixMapRows(rows) {
        return rows.map(row => {
            const cells = MATRIXMAP_COLUMNS.map(col => {
                const dbKey = MATRIXMAP_COLUMN_KEYS[col.key];
                const val = row[dbKey] ?? row[col.key] ?? row[dbKey?.toLowerCase()];
                const display = formatMatrixMapCell(col.key, val);
                const title = val === null || val === undefined ? '' : String(val);
                return `<td title="${escapeHtml(title)}">${display}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
    }

    function buildMatrixMapFilterPanel() {
        const fields = MATRIXMAP_FILTER_FIELDS.map(field => {
            const value = escapeHtml(matrixMapFilters[field.apiKey] ?? '');
            if (field.type === 'tinyint') {
                const selected = value === '' ? '' : value;
                return `<div class="fg">
                    <select id="mmf-${field.apiKey}" class="mt-mm-filter-input" data-filter="${field.apiKey}" aria-label="${field.label}">
                        <option value=""${selected === '' ? ' selected' : ''}>TDInscopeFlag</option>
                        <option value="1"${selected === '1' ? ' selected' : ''}>1</option>
                        <option value="0"${selected === '0' ? ' selected' : ''}>0</option>
                    </select>
                </div>`;
            }
            return `<div class="fg">
                <input type="text" id="mmf-${field.apiKey}" class="mt-mm-filter-input" data-filter="${field.apiKey}"
                    value="${value}" maxlength="${field.maxLength}" placeholder="${field.label}" aria-label="${field.label}">
            </div>`;
        }).join('');

        return `<div class="mt-mm-filter-panel${matrixMapFilterPanelOpen ? '' : ' is-hidden'}" id="mtMatrixFilterPanel">
            ${fields}
        </div>`;
    }

    function buildMatrixMapHTML() {
        const data = matrixMapData;

        if (!data) {
            return `<section class="mt-layout mt-matrixmap-layout">
                <div class="mt-head mt-mm-head">
                    <div class="mt-mm-head-main">
                        <h3>Matrix Map</h3>
                        <div class="mt-mm-head-actions">
                            <button type="button" class="filter-btn" id="mtMatrixFilterBtn">Filtrele</button>
                            <button type="button" class="filter-btn filter-btn-secondary" id="mtMatrixClearBtn">Temizle</button>
                        </div>
                    </div>
                </div>
                <div class="mt-card mt-loading">Veri getiriliyor…</div>
            </section>`;
        }

        if (!data.basarili) {
            return `<section class="mt-layout mt-matrixmap-layout">
                <div class="mt-head mt-mm-head">
                    <div class="mt-mm-head-main">
                        <h3>Matrix Map</h3>
                        <div class="mt-mm-head-actions">
                            <button type="button" class="filter-btn" id="mtMatrixFilterBtn">Filtrele</button>
                            <button type="button" class="filter-btn filter-btn-secondary" id="mtMatrixClearBtn">Temizle</button>
                        </div>
                    </div>
                </div>
                <div class="mt-error" role="alert">${escapeHtml(data.hata || 'Veri yüklenemedi.')}</div>
            </section>`;
        }

        const rows = data.satirlar || [];

        return `<section class="mt-layout mt-matrixmap-layout">
            <div class="mt-head mt-mm-head">
                <div class="mt-mm-head-main">
                    <h3>Matrix Map</h3>
                    <div class="mt-mm-head-actions">
                        <button type="button" class="filter-btn" id="mtMatrixFilterBtn">Filtrele</button>
                        <button type="button" class="filter-btn filter-btn-secondary" id="mtMatrixClearBtn">Temizle</button>
                    </div>
                </div>
            </div>
            ${buildMatrixMapFilterPanel()}
            <div class="mt-card mt-mm-card" id="mt-matrixmap">
                <div class="mt-mm-scroll">
                    <table class="mt-table" id="mtMatrixTable">
                        <thead>
                            <tr>${MATRIXMAP_COLUMNS.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>
                        </thead>
                        <tbody>${buildMatrixMapRows(rows) || `<tr><td colspan="${MATRIXMAP_COLUMNS.length}">Kayıt bulunamadı.</td></tr>`}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function collectMatrixMapFilters(root) {
        const filters = {};
        root.querySelectorAll('.mt-mm-filter-input').forEach(input => {
            const key = input.dataset.filter;
            const val = (input.value || '').trim();
            if (!val) return;
            if (key === 'tdInscopeFlag') {
                if (val === '0' || val === '1') filters[key] = parseInt(val, 10);
                return;
            }
            const field = MATRIXMAP_FILTER_FIELDS.find(f => f.apiKey === key);
            filters[key] = field?.maxLength ? val.slice(0, field.maxLength) : val;
        });
        return filters;
    }

    async function applyMatrixMapFilter(root) {
        const filters = collectMatrixMapFilters(root);
        await loadMatrixMapData(filters);
        if (!matrixMapData?.basarili) {
            await initMutabakatPage(root);
            return;
        }
        const tbody = root.querySelector('#mtMatrixTable tbody');
        if (tbody) {
            const rows = matrixMapData.satirlar || [];
            tbody.innerHTML = buildMatrixMapRows(rows) || `<tr><td colspan="${MATRIXMAP_COLUMNS.length}">Kayıt bulunamadı.</td></tr>`;
        }
    }

    function scheduleMatrixMapFilter(root) {
        clearTimeout(matrixMapFilterDebounceTimer);
        matrixMapFilterDebounceTimer = setTimeout(() => {
            applyMatrixMapFilter(root);
        }, 300);
    }

    function bindMatrixMapPage(root) {
        const pageBody = document.getElementById('pageBody');
        pageBody?.classList.add('page-body-matrixmap');

        root.querySelector('#mtMatrixFilterBtn')?.addEventListener('click', () => {
            const panel = root.querySelector('#mtMatrixFilterPanel');
            if (!panel) return;
            matrixMapFilterPanelOpen = !matrixMapFilterPanelOpen;
            panel.classList.toggle('is-hidden', !matrixMapFilterPanelOpen);
        });

        root.querySelector('#mtMatrixClearBtn')?.addEventListener('click', async () => {
            clearTimeout(matrixMapFilterDebounceTimer);
            matrixMapFilters = {};
            root.querySelectorAll('.mt-mm-filter-input').forEach(input => {
                input.value = '';
            });
            await loadMatrixMapData({});
            if (!matrixMapData?.basarili) {
                await initMutabakatPage(root);
                return;
            }
            const tbody = root.querySelector('#mtMatrixTable tbody');
            if (tbody) {
                const rows = matrixMapData.satirlar || [];
                tbody.innerHTML = buildMatrixMapRows(rows) || `<tr><td colspan="${MATRIXMAP_COLUMNS.length}">Kayıt bulunamadı.</td></tr>`;
            }
        });

        root.querySelectorAll('.mt-mm-filter-input').forEach(input => {
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', () => applyMatrixMapFilter(root));
                return;
            }
            input.addEventListener('input', () => scheduleMatrixMapFilter(root));
        });
    }

    function buildMutabakatHTML(view) {
        if (view === 'matrixmap') return buildMatrixMapHTML();
        return view === 'fark-veren' ? buildFarkVerenHTML() : buildDonemHTML();
    }

    async function applyDiffFilter(root) {
        const code = (root.querySelector('#mtFilterCode')?.value || '').trim();
        const team = (root.querySelector('#mtFilterTeam')?.value || '').trim();
        const active = periods.find(p => p.aktifMi);
        try {
            const params = { donemId: active?.donemId };
            if (code) params.hesapKodu = code;
            diffAccounts = await ApiClient.getFarkVeren(params);
            if (team) {
                diffAccounts = diffAccounts.filter(r =>
                    (r.ekipAdi || '').toLowerCase().includes(team.toLowerCase())
                );
            }
            const tbody = root.querySelector('#mtDiffTable tbody');
            if (tbody) tbody.innerHTML = buildDiffRows(diffAccounts);
        } catch (err) {
            console.error('Filtreleme başarısız:', err);
        }
    }

    function bindMutabakatPage(root) {
        const periodInput = root.querySelector('#mtActivePeriod');
        if (periodInput) {
            periodInput.addEventListener('change', async () => {
                const target = periods.find(p => p.yilAy === periodInput.value);
                if (!target) {
                    periodInput.value = getActivePeriod();
                    return;
                }
                try {
                    await setActivePeriod(target.donemId, target.yilAy);
                    await initMutabakatPage(root);
                } catch (err) {
                    console.error('Aktif dönem değiştirilemedi:', err);
                    periodInput.value = getActivePeriod();
                }
            });
        }

        root.querySelector('#mtFilterBtn')?.addEventListener('click', () => applyDiffFilter(root));
        root.querySelector('#mtFilterCode')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') applyDiffFilter(root);
        });
        root.querySelector('#mtFilterTeam')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') applyDiffFilter(root);
        });

        root.querySelectorAll('[data-period]').forEach(row => {
            row.addEventListener('click', async () => {
                const donemId = parseInt(row.dataset.donemId, 10);
                try {
                    await setActivePeriod(donemId, row.dataset.period);
                    await initMutabakatPage(root);
                } catch (err) {
                    console.error('Dönem seçilemedi:', err);
                }
            });
        });
    }

    function getFocusView() {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'fark-veren') return 'fark-veren';
        if (view === 'matrixmap') return 'matrixmap';
        return 'donem';
    }

    async function initMutabakatPage(container) {
        const el = container || document.getElementById('pageBody') || document.querySelector('[data-mt-page]');
        if (!el) return;

        const view = getFocusView();
        if (view === 'matrixmap') {
            await loadMatrixMapData(matrixMapFilters);
        } else {
            await loadData();
        }
        el.innerHTML = buildMutabakatHTML(view);
        if (view === 'matrixmap') {
            bindMatrixMapPage(el);
        } else {
            document.getElementById('pageBody')?.classList.remove('page-body-matrixmap');
            bindMutabakatPage(el);
        }
    }

    window.initMutabakatPage = initMutabakatPage;
    window.buildMutabakatHTML = buildMutabakatHTML;
    window.getMutabakatPeriod = getActivePeriod;

    document.addEventListener('DOMContentLoaded', async () => {
        if (document.getElementById('pageBody') && /mutabakat\.html/i.test(window.location.pathname)) {
            await window.PagePermissions?.ready?.();
            initMutabakatPage();
        }
    });
})();
