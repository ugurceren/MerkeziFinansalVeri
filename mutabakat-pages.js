(function () {
    let periods = [];
    let diffAccounts = [];
    let activePeriodYilAy = '2026-06';
    let matrixMapData = null;
    let diffSmartTable = null;
    let periodSmartTable = null;
    let matrixSmartTable = null;

    const MATRIXMAP_COLUMNS = [
        { key: 'loadId', label: 'LoadId' },
        { key: 'updateLoadId', label: 'UpdateLoadId' },
        { key: 'systemDateTime', label: 'SystemDateTime' },
        { key: 'validFrom', label: 'ValidFrom' },
        { key: 'validUntil', label: 'ValidUntil' },
        { key: 'scdActiveFlag', label: 'SCDActiveFlag' },
        { key: 'matrixMapId', label: 'MatrixMapId' },
        { key: 'sourceName', label: 'SourceName' },
        { key: 'matrixTableId', label: 'MatrixTableId' },
        { key: 'matrixTableName', label: 'MatrixTableName' },
        { key: 'matrixTableDescription', label: 'MatrixTableDescription' },
        { key: 'matrixColumnId', label: 'MatrixColumnId' },
        { key: 'matrixColumnName', label: 'MatrixColumnName' },
        { key: 'matrixColumnDescription', label: 'MatrixColumnDescription' },
        { key: 'reconciliationInScopeFlag', label: 'ReconciliationInScopeFlag' },
        { key: 'balanceTypeId', label: 'BalanceTypeId' },
        { key: 'balanceTypeName', label: 'BalanceTypeName' },
        { key: 'insertUserCode', label: 'InsertUserCode' },
        { key: 'updateUserCode', label: 'UpdateUserCode' }
    ];

    const MATRIXMAP_COLUMN_KEYS = {
        loadId: 'LoadId',
        updateLoadId: 'UpdateLoadId',
        systemDateTime: 'SystemDateTime',
        validFrom: 'ValidFrom',
        validUntil: 'ValidUntil',
        scdActiveFlag: 'SCDActiveFlag',
        matrixMapId: 'MatrixMapId',
        sourceName: 'SourceName',
        matrixTableId: 'MatrixTableId',
        matrixTableName: 'MatrixTableName',
        matrixTableDescription: 'MatrixTableDescription',
        matrixColumnId: 'MatrixColumnId',
        matrixColumnName: 'MatrixColumnName',
        matrixColumnDescription: 'MatrixColumnDescription',
        reconciliationInScopeFlag: 'ReconciliationInScopeFlag',
        balanceTypeId: 'BalanceTypeId',
        balanceTypeName: 'BalanceTypeName',
        insertUserCode: 'InsertUserCode',
        updateUserCode: 'UpdateUserCode'
    };

    const STATUS_LABEL = {
        aktif: { cls: 'aktif', label: 'Aktif' },
        kapali: { cls: 'kapali', label: 'Kapalı' },
        onay: { cls: 'onay', label: 'Onay Bekliyor' },
        acik: { cls: 'acik', label: 'Açık' },
        inceleniyor: { cls: 'inceleniyor', label: 'İnceleniyor' },
        kapatildi: { cls: 'kapatildi', label: 'Kapatıldı' }
    };

    const MONTHS_TR = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    function formatYilAy(yilAy) {
        if (!yilAy || !/^\d{4}-\d{2}$/.test(yilAy)) return yilAy || '—';
        const [yil, ay] = yilAy.split('-');
        const monthIdx = parseInt(ay, 10) - 1;
        return `${MONTHS_TR[monthIdx] || ay} ${yil}`;
    }

    function formatDonemEtiket(period) {
        if (!period) return '—';
        return period.etiket || formatYilAy(period.yilAy);
    }

    function formatKapanisTarihi(value) {
        if (!value) return '—';
        const text = String(value).trim();
        const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
        if (iso) {
            const date = new Date(`${iso[1]}T12:00:00`);
            if (!Number.isNaN(date.getTime())) {
                return date.toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }
        }
        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
        return text;
    }

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
                <td><strong>${escapeHtml(formatDonemEtiket(p))}</strong></td>
                <td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>
                <td class="mt-num">${p.hesapSayisi}</td>
                <td class="mt-num">${p.farkVerenSayisi}</td>
                <td>${formatKapanisTarihi(p.kapanisTarihi)}</td>
            </tr>`;
        }).join('');
    }

    function buildDiffRows(rows) {
        return rows.map(r => {
            const diff = r.mizanBakiye - r.kartonBakiye;
            const badge = STATUS_LABEL[r.durum] || { cls: '', label: r.durum };
            const diffClass = diff !== 0 ? 'mt-diff' : '';
            return `<tr>
                <td class="mt-cell-nowrap">${r.hesapKodu}</td>
                <td class="mt-cell-wrap">${r.hesapAdi}</td>
                <td class="mt-cell-wrap">${r.ekipAdi || ''}</td>
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
        const activeLabel = formatDonemEtiket(activePeriod || { yilAy: activeId, etiket: '' });

        return `<section class="mt-layout">
            <div class="mt-head">
                <h3>Mutabakat Dönemi</h3>
                <p>Mutabakat ve raporlama için aktif dönem seçimi</p>
            </div>
            <div class="mt-card mt-donem-picker" id="mt-donem-picker">
                <div class="mt-card-head">
                    <h4><i class="ti ti-calendar" aria-hidden="true"></i> Aktif Dönem</h4>
                    <span class="mt-active-label">Seçili: <strong>${escapeHtml(activeLabel)}</strong></span>
                </div>
                <div class="mt-donem-picker-body">
                    <div class="mt-period-active">
                        <label for="mtActivePeriod">Dönem (Ay / Yıl)</label>
                        <div class="mt-period-picker-row">
                            <input type="month" id="mtActivePeriod" value="${activeId}" lang="tr">
                            <span class="mt-period-tr-label">${escapeHtml(formatYilAy(activeId))}</span>
                        </div>
                    </div>
                    <p class="mt-hint">Kebir hesapları, mizan ve fark veren ekranlarında varsayılan filtre dönemi olarak kullanılır. Ay/yıl alanından veya alttaki tablodan satır seçerek değiştirebilirsiniz.</p>
                </div>
            </div>
            <div class="mt-card" id="mt-donem">
                <div class="mt-card-head">
                    <h4><i class="ti ti-list" aria-hidden="true"></i> Dönem Listesi</h4>
                </div>
                <div class="mt-scroll">
                    <table class="mt-table" id="mtPeriodTable">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function buildFarkVerenHTML() {
        const activeId = getActivePeriod();
        const activePeriod = periods.find(p => p.yilAy === activeId);
        const activeLabel = formatDonemEtiket(activePeriod || { yilAy: activeId, etiket: '' });
        const openDiffs = diffAccounts.filter(r => r.durum === 'acik' || r.durum === 'inceleniyor');
        const totalDiff = openDiffs.reduce((s, r) => s + Math.abs(r.mizanBakiye - r.kartonBakiye), 0);

        return `<section class="mt-layout">
            <div class="mt-head">
                <h3>Fark Veren Hesaplar</h3>
                <p>Mizan ve karton tablo bakiye farkları — ${escapeHtml(activeLabel)} dönemi</p>
            </div>
            <div class="mt-card" id="mt-fark">
                <div class="mt-card-head">
                    <h4><i class="ti ti-arrows-diff" aria-hidden="true"></i> Fark Listesi</h4>
                    <span>${escapeHtml(activeLabel)} dönemi</span>
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
                <div class="mt-filter-bar" id="mtDiffFilterPanel">
                    <div class="fg">
                        <label for="mtFilterCode">Hesap Kodu</label>
                        ${(window.FilterBar?.wrapControlHtml('<input type="text" id="mtFilterCode" class="filter-input-with-clear" placeholder="Kod ara...">')) || '<input type="text" id="mtFilterCode" placeholder="Kod ara...">'}
                    </div>
                    <div class="fg">
                        <label for="mtFilterTeam">Sorumlu Ekip</label>
                        ${(window.FilterBar?.wrapControlHtml('<input type="text" id="mtFilterTeam" class="filter-input-with-clear" placeholder="Ekip ara...">')) || '<input type="text" id="mtFilterTeam" placeholder="Ekip ara...">'}
                    </div>
                    ${window.FilterBar?.clearAllButtonHtml('mtDiffClearAllBtn') || '<button type="button" class="filter-btn filter-btn-clear filter-clear-all-btn" id="mtDiffClearAllBtn"><span>Temizle</span></button>'}
                </div>
                <div class="mt-scroll">
                    <table class="mt-table mt-table--wrap" id="mtDiffTable">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    async function loadMatrixMapData() {
        try {
            matrixMapData = await ApiClient.getMatrixMap();
        } catch (err) {
            console.error('MatrixMap verisi yüklenemedi:', err);
            matrixMapData = { basarili: false, hata: apiErrorMessage(err) };
        }
    }

    function formatMatrixMapCell(colKey, val) {
        if (val === null || val === undefined) return '';
        if (colKey === 'scdActiveFlag' || colKey === 'reconciliationInScopeFlag') {
            const active = val === 1 || val === '1';
            return `<span class="mt-badge ${active ? 'aktif' : 'kapali'}">${active ? '1' : '0'}</span>`;
        }
        return escapeHtml(String(val));
    }

    function buildMatrixMapRows(rows) {
        const readCell = (row, col) => {
            const dbKey = MATRIXMAP_COLUMN_KEYS[col.key];
            return window.FilterBar?.getQueryRowValue(row, dbKey)
                ?? window.FilterBar?.getQueryRowValue(row, col.key);
        };

        return rows.map(row => {
            const cells = MATRIXMAP_COLUMNS.map(col => {
                const val = readCell(row, col);
                const display = formatMatrixMapCell(col.key, val);
                const title = val === null || val === undefined ? '' : String(val);
                return `<td class="mt-cell-wrap" title="${escapeHtml(title)}">${display}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
    }

    function mountPeriodSmartTable(root) {
        if (!window.SmartTable) return;
        const table = root.querySelector('#mtPeriodTable');
        if (!table) return;
        window.SmartTable.destroy(table);
        const activeId = getActivePeriod();
        periodSmartTable = window.SmartTable.mount({
            scrollEl: table.closest('.mt-scroll'),
            headEl: table.querySelector('thead'),
            bodyEl: table.querySelector('tbody'),
            cols: [
                { key: 'etiket', label: 'Dönem' },
                { key: 'durum', label: 'Durum' },
                { key: 'hesapSayisi', label: 'Hesap Sayısı', type: 'number' },
                { key: 'farkVerenSayisi', label: 'Fark Veren', type: 'number' },
                { key: 'kapanisTarihi', label: 'Kapanış Tarihi' }
            ],
            rows: periods.map(p => ({ ...p, etiket: formatDonemEtiket(p) })),
            wrapCells: true,
            tableClass: 'mt-table',
            getValue: (row, col) => {
                if (col === 'etiket') return formatDonemEtiket(row);
                return row[col];
            },
            formatCell: (col, row, value) => {
                if (col === 'durum') {
                    const badge = STATUS_LABEL[row.durum] || { cls: '', label: row.durum };
                    return `<td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>`;
                }
                if (col === 'kapanisTarihi') return `<td>${formatKapanisTarihi(value)}</td>`;
                if (col === 'hesapSayisi' || col === 'farkVerenSayisi') return `<td class="mt-num">${value}</td>`;
                if (col === 'etiket') return `<td class="vs-cell-wrap">${escapeHtml(value)}</td>`;
                return null;
            },
            rowClass: row => (row.yilAy === activeId ? 'mt-row-active' : ''),
            rowAttrs: row => ({
                'data-period': row.yilAy,
                'data-donem-id': row.donemId
            }),
            onRowClick: async row => {
                try {
                    await setActivePeriod(row.donemId, row.yilAy);
                    await initMutabakatPage(root);
                } catch (err) {
                    console.error('Dönem seçilemedi:', err);
                }
            }
        });
    }

    function mountDiffSmartTable(root) {
        if (!window.SmartTable) return;
        const table = root.querySelector('#mtDiffTable');
        if (!table) return;
        window.SmartTable.destroy(table);
        diffSmartTable = window.SmartTable.mount({
            scrollEl: table.closest('.mt-scroll'),
            headEl: table.querySelector('thead'),
            bodyEl: table.querySelector('tbody'),
            cols: [
                { key: 'hesapKodu', label: 'Hesap Kodu' },
                { key: 'hesapAdi', label: 'Hesap Adı' },
                { key: 'ekipAdi', label: 'Sorumlu Ekip' },
                { key: 'mizanBakiye', label: 'Mizan Bakiye', type: 'number' },
                { key: 'kartonBakiye', label: 'Karton Tablo Bakiye', type: 'number' },
                { key: 'fark', label: 'Fark', type: 'number' },
                { key: 'durum', label: 'Durum' }
            ],
            rows: diffAccounts.map(r => ({
                ...r,
                fark: r.mizanBakiye - r.kartonBakiye
            })),
            wrapCells: true,
            tableClass: 'mt-table mt-table--wrap',
            getValue: (row, col) => {
                if (col === 'fark') return row.mizanBakiye - row.kartonBakiye;
                return row[col];
            },
            formatCell: (col, row, value) => {
                if (col === 'hesapKodu') return `<td class="mt-cell-nowrap">${escapeHtml(value)}</td>`;
                if (col === 'hesapAdi' || col === 'ekipAdi') return `<td class="mt-cell-wrap">${escapeHtml(value || '')}</td>`;
                if (col === 'mizanBakiye' || col === 'kartonBakiye') {
                    return `<td class="mt-num">${formatMoney(value)}</td>`;
                }
                if (col === 'fark') {
                    const diff = Number(value) || 0;
                    const diffClass = diff !== 0 ? 'mt-diff' : '';
                    return `<td class="mt-num ${diffClass}">${diff > 0 ? '+' : ''}${formatMoney(diff)}</td>`;
                }
                if (col === 'durum') {
                    const badge = STATUS_LABEL[row.durum] || { cls: '', label: row.durum };
                    return `<td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>`;
                }
                return null;
            }
        });
    }

    function mountMatrixSmartTable(root, data) {
        if (!window.SmartTable) return;
        const table = root.querySelector('#mtMatrixTable');
        if (!table) return;
        window.SmartTable.destroy(table);
        const rows = data?.satirlar || [];
        const readCell = (row, col) => {
            const dbKey = MATRIXMAP_COLUMN_KEYS[col.key];
            return window.FilterBar?.getQueryRowValue(row, dbKey)
                ?? window.FilterBar?.getQueryRowValue(row, col.key);
        };

        matrixSmartTable = window.SmartTable.mount({
            scrollEl: table.closest('.mt-mm-scroll'),
            headEl: table.querySelector('thead'),
            bodyEl: table.querySelector('tbody'),
            cols: MATRIXMAP_COLUMNS.map(c => ({ key: c.key, label: c.label })),
            rows,
            wrapCells: true,
            tableClass: 'mt-table mt-table--wrap',
            getValue: (row, col) => {
                const column = MATRIXMAP_COLUMNS.find(c => c.key === col);
                return column ? readCell(row, column) : row[col];
            },
            formatCell: (col, row, value) => {
                const display = formatMatrixMapCell(col, value);
                const title = value === null || value === undefined ? '' : String(value);
                return `<td class="mt-cell-wrap" title="${escapeHtml(title)}">${display}</td>`;
            },
            onFilteredChange: shown => {
                updateMatrixMapRecordCount(root, matrixMapData, shown);
            }
        });
        updateMatrixMapRecordCount(root, data);
    }

    function formatMatrixMapRecordCount(data) {
        if (!data?.basarili) return { shown: 0, total: 0 };
        const rows = data.satirlar || [];
        return {
            shown: rows.length,
            total: data.satirSayisi ?? rows.length
        };
    }

    function updateMatrixMapRecordCount(root, data, shownOverride) {
        if (!data?.basarili) return;
        const { shown, total } = formatMatrixMapRecordCount(data);
        const displayShown = shownOverride ?? shown;
        window.TableCount?.set(root, displayShown, total, { wrapId: 'mtMatrixRecordCount' });
    }

    function buildMatrixMapHead(data) {
        const { shown, total } = data?.basarili
            ? formatMatrixMapRecordCount(data)
            : { shown: 0, total: 0 };
        const countHtml = window.TableCount?.formatHtml(shown, total, { wrapId: 'mtMatrixRecordCount' })
            || '<span>—</span>';

        return `<div class="mt-head mt-mm-head">
            <div class="mt-mm-head-text">
                <h3>Matrix Map</h3>
                <span class="mt-mm-head-subtitle">TDMAIN.PRM.TDMatrixMap</span>
            </div>
            ${countHtml}
        </div>`;
    }

    function buildMatrixMapTableSection(data) {
        if (!data) {
            return `<div class="mt-card mt-mm-card">
                <div class="mt-mm-loading">Veri getiriliyor…</div>
            </div>`;
        }

        if (!data.basarili) {
            return `<div class="mt-card mt-mm-card">
                <div class="mt-error" role="alert">${escapeHtml(data.hata || 'Veri yüklenemedi.')}</div>
            </div>`;
        }

        return `<div class="mt-card mt-mm-card" id="mt-matrixmap">
            <div class="mt-mm-scroll">
                <table class="mt-table mt-table--wrap" id="mtMatrixTable">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>`;
    }

    function buildMatrixMapHTML() {
        const data = matrixMapData;

        return `<section class="mt-layout mt-matrixmap-layout">
            ${buildMatrixMapHead(data)}
            ${buildMatrixMapTableSection(data)}
        </section>`;
    }

    function bindMatrixMapPage() {
        document.getElementById('pageBody')?.classList.add('page-body-matrixmap');
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
            if (diffSmartTable) {
                diffSmartTable.setRows(diffAccounts.map(r => ({
                    ...r,
                    fark: r.mizanBakiye - r.kartonBakiye
                })));
            } else {
                mountDiffSmartTable(root);
            }
        } catch (err) {
            console.error('Filtreleme başarısız:', err);
        }
    }

    async function clearDiffFilters(root) {
        const codeEl = root.querySelector('#mtFilterCode');
        const teamEl = root.querySelector('#mtFilterTeam');
        if (codeEl) codeEl.value = '';
        if (teamEl) teamEl.value = '';
        window.FilterBar?.syncFieldsInBar(root.querySelector('#mtDiffFilterPanel'), '#mtFilterCode, #mtFilterTeam');
        await applyDiffFilter(root);
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

        window.FilterBar?.bind(root.querySelector('#mtDiffFilterPanel'), {
            bindKey: 'fark-veren',
            fieldSelector: '#mtFilterCode, #mtFilterTeam',
            debounceMs: 300,
            clearAllId: 'mtDiffClearAllBtn',
            onFilter: () => applyDiffFilter(root),
            onClearAll: () => clearDiffFilters(root)
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
            await loadMatrixMapData();
        } else {
            await loadData();
        }
        el.innerHTML = buildMutabakatHTML(view);
        if (view === 'matrixmap') {
            bindMatrixMapPage();
            mountMatrixSmartTable(el, matrixMapData);
        } else {
            document.getElementById('pageBody')?.classList.remove('page-body-matrixmap');
            bindMutabakatPage(el);
            if (view === 'donem') mountPeriodSmartTable(el);
            if (view === 'fark-veren') mountDiffSmartTable(el);
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
