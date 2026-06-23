(function () {
    let vkKurallarSorgu = null;
    let vkGunlukSorgu = null;
    let vkKurallarFilters = {};

    const VK_KURALLAR_FILTER_FIELDS = [
        { key: 'qualityLevel', label: 'Seviye', column: 'QualityLevel', type: 'text', maxLength: 20 },
        { key: 'ruleDesc', label: 'Açıklama', column: 'RuleDesc', type: 'text', maxLength: 250 },
        { key: 'status', label: 'Durum', column: 'Status', type: 'text', maxLength: 50 },
        { key: 'activeFlag', label: 'Aktif', column: 'ActiveFlag', type: 'active' }
    ];

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
        return window.FilterBar?.getQueryRowValue(row, column);
    }

    function normalizeVkStatusLabel(value) {
        const text = String(value ?? '').trim().toLowerCase();
        if (['active', 'aktif', '1', 'true', 'y', 'evet'].includes(text)) return 'aktif';
        if (['inactive', 'pasif', '0', 'false', 'hayır', 'hayir', 'n'].includes(text)) return 'pasif';
        return text;
    }

    function matchVkStatusFilter(cellValue, filterText) {
        const cell = String(cellValue ?? '').toLowerCase();
        const filter = filterText.toLowerCase().trim();
        if (!filter) return true;
        if (cell.includes(filter)) return true;

        const cellNorm = normalizeVkStatusLabel(cell);
        const filterNorm = normalizeVkStatusLabel(filter);
        if (!cellNorm || !filterNorm) return false;
        return cellNorm === filterNorm
            || cellNorm.includes(filterNorm)
            || filterNorm.includes(cellNorm);
    }

    function filterVkKurallarRows(rows, filters) {
        return (rows || []).filter(row => {
            for (const field of VK_KURALLAR_FILTER_FIELDS) {
                const filterVal = filters[field.key];
                if (!filterVal) continue;

                if (field.type === 'active') {
                    const active = isVkRowActive(getVkRowValue(row, field.column));
                    if (filterVal === '1' && !active) return false;
                    if (filterVal === '0' && active) return false;
                    continue;
                }

                const cellVal = getVkRowValue(row, field.column);
                if (field.key === 'status') {
                    if (!matchVkStatusFilter(cellVal, filterVal)) return false;
                    continue;
                }

                const haystack = String(cellVal ?? '').toLowerCase();
                if (!haystack.includes(filterVal.toLowerCase())) return false;
            }
            return true;
        });
    }

    function collectVkKurallarFilters(root) {
        const filters = {};
        VK_KURALLAR_FILTER_FIELDS.forEach(field => {
            const input = root.querySelector(`#vkf-${field.key}`);
            if (!input) return;
            const val = (input.value || '').trim();
            if (!val) return;
            if (field.type === 'active') {
                if (val === '0' || val === '1') filters[field.key] = val;
                return;
            }
            filters[field.key] = field.maxLength ? val.slice(0, field.maxLength) : val;
        });
        return filters;
    }

    function buildVkKurallarFilterBar() {
        const wrap = html => (window.FilterBar?.wrapControlHtml(html)) || html;
        const clearBtn = window.FilterBar?.clearAllButtonHtml('vkKurallarClearAllBtn')
            || '<button type="button" class="filter-btn filter-btn-clear filter-clear-all-btn" id="vkKurallarClearAllBtn"><span>Temizle</span></button>';

        const fields = VK_KURALLAR_FILTER_FIELDS.map(field => {
            const value = escapeHtml(vkKurallarFilters[field.key] ?? '');
            if (field.type === 'active') {
                const selected = value === '' ? '' : value;
                return `<div class="fg">
                    <label for="vkf-${field.key}">${field.label}</label>
                    ${wrap(`<select id="vkf-${field.key}" class="vk-filter-input filter-input-with-clear" data-filter="${field.key}">
                        <option value=""${selected === '' ? ' selected' : ''}>Tümü</option>
                        <option value="1"${selected === '1' ? ' selected' : ''}>Evet</option>
                        <option value="0"${selected === '0' ? ' selected' : ''}>Hayır</option>
                    </select>`)}
                </div>`;
            }
            return `<div class="fg">
                <label for="vkf-${field.key}">${field.label}</label>
                ${wrap(`<input type="text" id="vkf-${field.key}" class="vk-filter-input filter-input-with-clear" data-filter="${field.key}"
                    value="${value}" maxlength="${field.maxLength}" placeholder="${field.label} ara...">`)}
            </div>`;
        }).join('');

        return `<div class="filter-bar vk-kurallar-filter-bar" id="vkKurallarFilterPanel">
            ${fields}
            ${clearBtn}
        </div>`;
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

    function renderVkKurallarCount(root, data, rows) {
        const { shown, total, footnote } = buildVkKurallarCountOptions(data, rows);
        window.TableCount?.set(root, shown, total, { wrapId: 'vkKurallarMeta', footnote });
    }

    function applyVkKurallarFilter(root) {
        vkKurallarFilters = collectVkKurallarFilters(root);
        const data = vkKurallarSorgu;
        if (!data?.basarili) return;

        const cols = data.kolonlar || [];
        const allRows = data.satirlar || [];
        const filtered = filterVkKurallarRows(allRows, vkKurallarFilters);

        const scroll = root.querySelector('.vk-kurallar-scroll');
        if (scroll) {
            scroll.innerHTML = buildResultTable(cols, filtered, formatKurallarCell, VK_COLUMN_LABELS);
        }

        const metaEl = root.querySelector('#vkKurallarMeta');
        if (metaEl) {
            renderVkKurallarCount(root, data, filtered);
        }
    }

    function clearVkKurallarFilters(root) {
        vkKurallarFilters = {};
        root.querySelectorAll('.vk-filter-input').forEach(input => {
            input.value = '';
        });
        window.FilterBar?.syncFieldsInBar(root.querySelector('#vkKurallarFilterPanel'), '.vk-filter-input');
        applyVkKurallarFilter(root);
    }

    function bindVkKurallarPage(root) {
        const panel = root.querySelector('#vkKurallarFilterPanel');
        if (!panel) return;

        window.FilterBar?.bind(panel, {
            bindKey: 'vk-kurallar',
            fieldSelector: '.vk-filter-input',
            debounceMs: 300,
            clearAllId: 'vkKurallarClearAllBtn',
            onFilter: () => applyVkKurallarFilter(root),
            onClearAll: () => clearVkKurallarFilters(root)
        });
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
        const allRows = data.satirlar || [];
        const rows = filterVkKurallarRows(allRows, vkKurallarFilters);
        const total = data.satirSayisi ?? allRows.length;
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
                ${buildVkKurallarFilterBar()}
                <div class="vk-scroll vk-kurallar-scroll">
                    ${buildResultTable(cols, rows, formatKurallarCell, VK_COLUMN_LABELS)}
                </div>
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
                <div class="vk-scroll">
                    ${buildResultTable(cols, rows, formatGunlukCell, GUNLUK_COLUMN_LABELS)}
                </div>
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
            return;
        }

        el.innerHTML = buildKurallarHTML();
        await loadVkKurallarSorgu();
        el.innerHTML = buildKurallarHTML();
        bindVkKurallarPage(el);
        return;
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
