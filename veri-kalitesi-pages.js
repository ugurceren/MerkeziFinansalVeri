(function () {
    let vkKurallarSorgu = null;
    let vkGunlukSorgu = null;
    let vkKurallarSmartTable = null;
    let vkGunlukSmartTable = null;

    const VK_COLUMN_LABELS = {
        RuleId: 'Kural ID',
        RelTermFieldId: 'Alan ID',
        RunPeriodId: 'Periyot',
        QualityId: 'Kalite ID',
        ExactValue: 'Değer',
        QualityLevel: 'Seviye',
        RuleDesc: 'Açıklama',
        Status: 'Durum',
        ActiveFlag: 'Aktif',
        InsertDate: 'Eklenme',
        UpdatedDate: 'Güncelleme',
        UserName: 'Kullanıcı',
        ResponsibleAnalystName: 'Sorumlu Analist'
    };

    const GUNLUK_COLUMN_LABELS = {
        DataDate: 'Veri Tarihi',
        TableName: 'Tablo',
        FieldName: 'Alan',
        ExactValue: 'Beklenen Değer',
        ErrorDescription: 'Hata Açıklaması',
        QualityId: 'Kalite ID',
        QualityLevel: 'Kalite Seviyesi',
        RuleId: 'Kural ID',
        QualityProcedureName: 'Kalite Prosedürü'
    };

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

    function isVkRowActive(flag) {
        if (flag === 1 || flag === true) return true;
        const text = String(flag ?? '').trim().toLowerCase();
        return text === '1' || text === 'true' || text === 'y' || text === 'evet';
    }

    function getVkRowValue(row, column) {
        if (window.FilterBar?.getQueryRowValue) {
            const value = window.FilterBar.getQueryRowValue(row, column);
            if (value !== undefined && value !== null) return value;
        }

        if (!row || column == null || column === '') return undefined;

        const name = String(column);
        const candidates = [
            name,
            name.charAt(0).toLowerCase() + name.slice(1),
            name.charAt(0).toUpperCase() + name.slice(1)
        ];

        for (const key of candidates) {
            if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
                return row[key];
            }
        }

        const matchedKey = Object.keys(row).find(key => key.toLowerCase() === name.toLowerCase());
        return matchedKey ? row[matchedKey] : undefined;
    }

    function buildVkKurallarCountOptions(data, rows) {
        const activeCount = rows.filter(r => isVkRowActive(getVkRowValue(r, 'ActiveFlag'))).length;
        const total = data.satirSayisi ?? (data.satirlar || []).length;
        const shown = rows.length;
        const notes = [`${window.TableCount?.formatNumber(activeCount) ?? activeCount} aktif`];
        if (data.kisitlandi) {
            notes.unshift(`ilk ${window.TableCount?.formatNumber(data.maxSatir) ?? data.maxSatir} satır`);
        }
        return {
            shown,
            total,
            footnote: notes.join(' · ')
        };
    }

    function renderVkKurallarCount(root, data, rowsInfo) {
        const rows = rowsInfo?.allRows || rowsInfo || [];
        const { shown, total, footnote } = buildVkKurallarCountOptions(data, rows);
        const displayShown = rowsInfo?.length ?? shown;
        window.TableCount?.set(root, displayShown, total, { wrapId: 'vkKurallarMeta', footnote });
    }

    function mountVkKurallarTable(root) {
        const data = vkKurallarSorgu;
        if (!data?.basarili) return;
        const scroll = root.querySelector('.vk-kurallar-scroll');
        if (!scroll) return;
        const cols = data.kolonlar || [];
        const rows = data.satirlar || [];
        vkKurallarSmartTable = mountVkResultTable(
            scroll,
            cols,
            rows,
            formatKurallarCell,
            VK_COLUMN_LABELS,
            shown => renderVkKurallarCount(root, data, { length: shown, allRows: rows })
        );
        renderVkKurallarCount(root, data, { length: rows.length, allRows: rows });
    }

    function mountVkGunlukTable(root) {
        const data = vkGunlukSorgu;
        if (!data?.basarili) return;
        const scroll = root.querySelector('.vk-scroll');
        if (!scroll) return;
        const cols = data.kolonlar || [];
        const rows = data.satirlar || [];
        vkGunlukSmartTable = mountVkResultTable(
            scroll,
            cols,
            rows,
            formatGunlukCell,
            GUNLUK_COLUMN_LABELS,
            shown => {
                const total = data.satirSayisi ?? rows.length;
                const footnote = data.kisitlandi ? `ilk ${data.maxSatir} satır gösterildi` : '';
                window.TableCount?.set(root, shown, total, { wrapId: 'vkGunlukMeta', footnote });
            }
        );
    }

    function formatKurallarCell(col, val) {
        if (val === null || val === undefined) return '';
        const text = String(val);

        if (col === 'Status') {
            const lower = text.toLowerCase();
            if (lower === 'active' || lower === 'aktif' || lower === '1') {
                return '<span class="vk-badge ok">Aktif</span>';
            }
            if (lower === 'inactive' || lower === 'pasif' || lower === '0') {
                return '<span class="vk-badge off">Pasif</span>';
            }
        }

        if (col === 'ActiveFlag') {
            const active = text === '1' || text.toLowerCase() === 'true' || text.toLowerCase() === 'y';
            return `<span class="vk-badge ${active ? 'ok' : 'off'}">${active ? 'Evet' : 'Hayır'}</span>`;
        }

        return escapeHtml(text);
    }

    function formatGunlukCell(col, val) {
        if (val === null || val === undefined) return '';
        if (col === 'QualityLevel') {
            const level = Number(val);
            if (level <= 1) return `<span class="vk-badge fail">${escapeHtml(val)}</span>`;
            if (level <= 2) return `<span class="vk-badge warn">${escapeHtml(val)}</span>`;
            return `<span class="vk-badge ok">${escapeHtml(val)}</span>`;
        }
        return escapeHtml(String(val));
    }

    function isVkWrapColumn(col) {
        const key = String(col || '');
        if (/flag$/i.test(key) || key === 'ActiveFlag') return false;
        if (/^(ruleid|qualitylevel|rulecode)$/i.test(key)) return false;
        return true;
    }

    function mountVkResultTable(scrollEl, cols, rows, formatCell, columnLabels, onFilteredChange) {
        if (!scrollEl || !window.SmartTable) return null;
        const existing = scrollEl.querySelector('table');
        if (existing) window.SmartTable.destroy(existing);
        scrollEl.innerHTML = '<table class="vk-table vk-table--wrap"><thead></thead><tbody></tbody></table>';
        const table = scrollEl.querySelector('table');
        return window.SmartTable.mount({
            scrollEl,
            headEl: table.querySelector('thead'),
            bodyEl: table.querySelector('tbody'),
            cols,
            rows,
            wrapCells: true,
            tableClass: 'vk-table vk-table--wrap',
            getColumnLabel: col => columnLabels[col] || col,
            getValue: (row, col) => getVkRowValue(row, col),
            formatCell: (col, row, val) => {
                const formatted = formatCell(col, val);
                const title = val === null || val === undefined ? '' : String(val);
                const cellClass = isVkWrapColumn(col) ? 'vk-cell-wrap' : 'vk-cell-nowrap';
                return `<td class="${cellClass}" title="${escapeHtml(title)}">${formatted}</td>`;
            },
            onFilteredChange
        });
    }

    function buildResultTable(cols, rows, formatCell, columnLabels) {
        const headerCells = cols.map(c =>
            `<th>${escapeHtml(columnLabels[c] || c)}</th>`
        ).join('');

        const bodyRows = rows.map(row => {
            const cells = cols.map(col => {
                const raw = getVkRowValue(row, col);
                const display = formatCell(col, raw);
                const title = raw === null || raw === undefined ? '' : String(raw);
                const cellClass = isVkWrapColumn(col) ? 'vk-cell-wrap' : 'vk-cell-nowrap';
                return `<td class="${cellClass}" title="${escapeHtml(title)}">${display}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const emptyRow = `<tr><td colspan="${cols.length || 1}">Kayıt bulunamadı.</td></tr>`;

        return `<table class="vk-table vk-table--wrap">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows || emptyRow}</tbody>
        </table>`;
    }

    async function loadVkKurallarSorgu() {
        vkKurallarSorgu = null;

        try {
            vkKurallarSorgu = await ApiClient.getVkKurallarSorgu();
        } catch (err) {
            console.error('VK kurallar sorgusu yüklenemedi:', err);
            vkKurallarSorgu = { basarili: false, hata: apiErrorMessage(err) };
        }
    }

    async function loadVkGunlukSorgu() {
        vkGunlukSorgu = null;
        try {
            vkGunlukSorgu = await ApiClient.getVkGunlukSonuclarSorgu();
        } catch (err) {
            console.error('Günlük sonuçlar sorgusu yüklenemedi:', err);
            vkGunlukSorgu = { basarili: false, hata: apiErrorMessage(err) };
        }
    }

    function buildKurallarHTML() {
        const data = vkKurallarSorgu;

        if (!data) {
            return `<section class="vk-layout">
                <div class="vk-head">
                    <h3>Veri Kalitesi Kuralları</h3>
                    <p>TDUTIL veri kalitesi kuralları yükleniyor…</p>
                </div>
                <div class="vk-card vk-loading">Sorgu çalıştırılıyor…</div>
            </section>`;
        }

        if (!data.basarili) {
            return `<section class="vk-layout">
                <div class="vk-head">
                    <h3>Veri Kalitesi Kuralları</h3>
                </div>
                <div class="vk-error" role="alert">${escapeHtml(data.hata || 'Sorgu başarısız.')}</div>
                <div class="vk-card vk-empty">Kurallar listelenemedi. Sorgu dosyasını ve bağlantı ayarlarını kontrol edin.</div>
            </section>`;
        }

        const cols = data.kolonlar || [];
        const rows = data.satirlar || [];
        const total = data.satirSayisi ?? rows.length;
        const countHtml = window.TableCount?.formatHtml(rows.length, total, {
            wrapId: 'vkKurallarMeta',
            footnote: buildVkKurallarCountOptions(data, rows).footnote
        }) || '';

        return `<section class="vk-layout">
            <div class="vk-head">
                <h3>Veri Kalitesi Kuralları</h3>
                <p>TDUTIL <code>DQ.Rule</code> tablosundan canlı kural listesi</p>
            </div>
            <div class="vk-card">
                <div class="vk-card-head">
                    <h4>Kural Listesi</h4>
                    ${countHtml}
                </div>
                <div class="vk-scroll vk-kurallar-scroll"></div>
            </div>
        </section>`;
    }

    function buildGunlukSonuclarHTML() {
        const data = vkGunlukSorgu;

        if (!data) {
            return `<section class="vk-layout">
                <div class="vk-head">
                    <h3>Günlük Kural Sonuçları</h3>
                    <p>Bugünkü başarısız kural sonuçları yükleniyor…</p>
                </div>
                <div class="vk-card vk-loading">Sonuçlar getiriliyor…</div>
            </section>`;
        }

        if (!data.basarili) {
            return `<section class="vk-layout">
                <div class="vk-head">
                    <h3>Günlük Kural Sonuçları</h3>
                    <p>Bugünkü başarısız kural kayıtları</p>
                </div>
                <div class="vk-error" role="alert">${escapeHtml(data.hata || 'Sonuçlar alınamadı.')}</div>
                <div class="vk-card vk-empty">Günlük sonuçlar listelenemedi.</div>
            </section>`;
        }

        const cols = data.kolonlar || [];
        const rows = data.satirlar || [];
        const total = data.satirSayisi ?? rows.length;
        const footnote = data.kisitlandi ? `ilk ${data.maxSatir} satır gösterildi` : '';
        const countHtml = window.TableCount?.formatHtml(rows.length, total, {
            wrapId: 'vkGunlukMeta',
            footnote
        }) || '';

        const today = new Date().toLocaleDateString('tr-TR');

        return `<section class="vk-layout">
            <div class="vk-head">
                <h3>Günlük Kural Sonuçları</h3>
                <p>Bugün (${today}) başarısız olan aktif kurallar</p>
            </div>
            <div class="vk-card">
                <div class="vk-card-head">
                    <h4>Başarısız Sonuçlar</h4>
                    ${countHtml}
                </div>
                <div class="vk-scroll"></div>
            </div>
        </section>`;
    }

    async function initVkPage(type, container) {
        const el = container || document.querySelector('[data-vk-page]') || document.getElementById('pageBody');
        if (!el) return;

        if (type === 'gunluk') {
            el.innerHTML = buildGunlukSonuclarHTML();
            await loadVkGunlukSorgu();
            el.innerHTML = buildGunlukSonuclarHTML();
            mountVkGunlukTable(el);
            return;
        }

        el.innerHTML = buildKurallarHTML();
        await loadVkKurallarSorgu();
        el.innerHTML = buildKurallarHTML();
        mountVkKurallarTable(el);
    }

    window.buildVeriKalitesiKurallariHTML = buildKurallarHTML;
    window.buildGunlukKuralSonuclariHTML = buildGunlukSonuclarHTML;
    window.initVeriKalitesiKurallariPage = (c) => initVkPage('kurallar', c);
    window.initGunlukKuralSonuclariPage = (c) => initVkPage('gunluk', c);

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        const host = document.querySelector('[data-vk-page]');
        if (!host) return;
        initVkPage(host.dataset.vkPage, host);
    });
})();
