(function () {
    let ayarlar = null;
    let lastResult = null;
    let exportContext = null;

    function kolonSira() {
        const sira = ayarlar?.kolonSira;
        return Array.isArray(sira) && sira.length ? sira : null;
    }

    function kolonEtiketleri() {
        return ayarlar?.kolonEtiketleri || {};
    }

    function findSpColumnKey(spCols, configuredName) {
        if (spCols.includes(configuredName)) return configuredName;
        const lower = configuredName.toLowerCase();
        return spCols.find(c => String(c).toLowerCase() === lower) || null;
    }

    function resolveDisplayColumns(spCols) {
        const configured = kolonSira();
        if (!configured) return spCols.slice();

        const ordered = [];
        const used = new Set();
        configured.forEach(name => {
            const key = findSpColumnKey(spCols, name);
            if (key && !used.has(key)) {
                ordered.push(key);
                used.add(key);
            }
        });
        spCols.forEach(col => {
            if (!used.has(col)) ordered.push(col);
        });
        return ordered;
    }

    function columnLabel(spColName) {
        const labels = kolonEtiketleri();
        if (labels[spColName]) return labels[spColName];
        const lower = String(spColName).toLowerCase();
        const match = Object.keys(labels).find(k => k.toLowerCase() === lower);
        return match ? labels[match] : spColName;
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDateInput(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function parseOptionalInt(value) {
        if (value === '' || value === null || value === undefined) return null;
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
    }

    function parseOptionalDecimal(value) {
        if (value === '' || value === null || value === undefined) return null;
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : null;
    }

    function collectCriteria() {
        const dataDate = document.getElementById('nzDataDate')?.value;
        if (!dataDate) {
            throw new Error('Rapor tarihi zorunludur.');
        }

        const fecRaw = document.getElementById('nzFECId')?.value;
        const fecParsed = fecRaw === '' || fecRaw === null || fecRaw === undefined
            ? 0
            : parseOptionalInt(fecRaw);
        const fecId = fecParsed === null ? 0 : fecParsed;

        const minLedger = document.getElementById('nzMinLedger')?.value?.trim() || null;
        const maxLedger = document.getElementById('nzMaxLedger')?.value?.trim() || null;

        return {
            dataDate,
            levelName: document.getElementById('nzLevelName')?.value?.trim() || null,
            fecId,
            branchId: parseOptionalInt(document.getElementById('nzBranchId')?.value),
            minToLedgerId: minLedger,
            maxToLedgerId: maxLedger,
            minDifferenceAmount: parseOptionalDecimal(document.getElementById('nzMinDifference')?.value) ?? 0
        };
    }

    function setStatus(message, type) {
        const el = document.getElementById('nzStatus');
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = '';
            el.className = 'nz-results-status';
            return;
        }
        el.hidden = false;
        el.textContent = message;
        el.className = 'nz-results-status' + (type ? ` is-${type}` : '');
    }

    function setLoading(loading) {
        const fetchBtn = document.getElementById('nzFetchBtn');
        const clearBtn = document.getElementById('nzClearBtn');
        if (fetchBtn) fetchBtn.disabled = loading;
        if (clearBtn) clearBtn.disabled = loading;
        if (loading) {
            setStatus('Rapor çalıştırılıyor…', 'loading');
        }
    }

    function resetResultsChrome() {
        const info = document.getElementById('nzRecordInfo');
        const exportBtn = document.getElementById('nzExportBtn');
        if (info) info.textContent = '';
        if (exportBtn) exportBtn.disabled = true;
        exportContext = null;
    }

    function updateResultsMeta(payload, cols, rows) {
        const info = document.getElementById('nzRecordInfo');
        const exportBtn = document.getElementById('nzExportBtn');
        const allRows = payload.satirlar || rows;
        const total = payload.satirSayisi ?? allRows.length;

        if (info) {
            info.textContent = window.ReportResults.formatRecordInfo(total, {
                kisitlandi: payload.kisitlandi,
                maxSatir: payload.maxSatir
            });
        }
        if (exportBtn) exportBtn.disabled = !allRows.length;

        exportContext = allRows.length ? {
            columns: cols,
            rows: allRows,
            getHeaderLabel: columnLabel,
            fileName: window.ReportResults.defaultFileName('nazim-hesaplari')
        } : null;
    }

    function exportCurrentResults() {
        if (!exportContext) return;
        window.ReportResults.exportToExcel(exportContext);
    }

    function renderResults(payload) {
        const wrap = document.getElementById('nzResultsWrap');
        const empty = document.getElementById('nzEmpty');
        const footer = document.getElementById('nzFooter');
        const head = document.getElementById('nzResultsHead');
        const body = document.getElementById('nzResultsBody');
        const timeEl = document.getElementById('nzQueryTime');

        if (!payload || !payload.basarili) {
            wrap?.classList.remove('has-data');
            window.ReportResults.destroyActiveTable();
            if (head) head.innerHTML = '';
            if (body) body.innerHTML = '';
            if (empty) {
                empty.hidden = false;
                empty.textContent = 'Kriterleri girin ve Bilgi Getir ile raporu çalıştırın.';
            }
            if (footer) footer.hidden = true;
            resetResultsChrome();
            if (payload && !payload.basarili) {
                setStatus(payload.hata || 'Rapor çalıştırılamadı.', 'error');
            }
            return;
        }

        setStatus('');
        const cols = resolveDisplayColumns(payload.kolonlar || []);
        const rows = payload.satirlar || [];
        const displayRows = window.ReportResults.sliceForDisplay(rows);

        if (!rows.length) {
            wrap?.classList.remove('has-data');
            window.ReportResults.destroyActiveTable();
            if (head) head.innerHTML = '';
            if (body) body.innerHTML = '';
            if (empty) {
                empty.hidden = false;
                empty.textContent = 'Seçilen kriterlere uygun kayıt bulunamadı.';
            }
            if (footer) footer.hidden = false;
            updateResultsMeta(payload, cols, rows);
            if (timeEl) timeEl.textContent = payload.sureMs != null ? `Sorgu süresi: ${payload.sureMs} ms` : '';
            return;
        }

        if (empty) empty.hidden = true;
        wrap?.classList.add('has-data');
        if (footer) footer.hidden = false;
        updateResultsMeta(payload, cols, rows);

        window.ReportResults.renderTable({
            scrollEl: wrap,
            headEl: head,
            bodyEl: body,
            cols,
            rows: displayRows,
            getColumnLabel: columnLabel
        });

        if (timeEl) {
            timeEl.textContent = payload.sureMs != null ? `Sorgu süresi: ${payload.sureMs} ms` : '';
        }
    }

    function showEmptyState() {
        setStatus('');
        const wrap = document.getElementById('nzResultsWrap');
        const empty = document.getElementById('nzEmpty');
        const footer = document.getElementById('nzFooter');
        const head = document.getElementById('nzResultsHead');
        const body = document.getElementById('nzResultsBody');
        wrap?.classList.remove('has-data');
        window.ReportResults.destroyActiveTable();
        if (head) head.innerHTML = '';
        if (body) body.innerHTML = '';
        if (empty) {
            empty.hidden = false;
            empty.innerHTML = 'Kriterleri girin ve <strong>Bilgi Getir</strong> ile raporu çalıştırın.';
        }
        if (footer) footer.hidden = true;
        resetResultsChrome();
    }

    function resetForm() {
        const form = document.getElementById('nzCriteriaForm');
        form?.reset();
        const dataDate = document.getElementById('nzDataDate');
        if (dataDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dataDate.value = formatDateInput(yesterday);
        }
        const minLedger = document.getElementById('nzMinLedger');
        const maxLedger = document.getElementById('nzMaxLedger');
        const minDiff = document.getElementById('nzMinDifference');
        const fec = document.getElementById('nzFECId');
        if (minLedger) minLedger.value = '977';
        if (maxLedger) maxLedger.value = '9980';
        if (minDiff) minDiff.value = '0';
        if (fec) fec.value = '0';
    }

    function apiErrorMessage(err) {
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            return `API'ye ulaşılamıyor. API çalışıyor mu? Varsayılan: ${ApiClient.baseUrl}`;
        }
        return msg;
    }

    async function loadAyarlar() {
        try {
            ayarlar = await ApiClient.getNazimHesaplariAyarlar();
        } catch (err) {
            console.warn('Nazım hesapları ayarları yüklenemedi:', err);
            ayarlar = { kolonSira: [], kolonEtiketleri: {} };
        }
    }

    async function fetchReport() {
        let criteria;
        try {
            criteria = collectCriteria();
        } catch (err) {
            setStatus(err.message, 'error');
            return;
        }

        setLoading(true);
        try {
            const result = await ApiClient.calistirNazimHesaplari(criteria);
            lastResult = result;
            renderResults(result);
        } catch (err) {
            setStatus(apiErrorMessage(err), 'error');
        } finally {
            setLoading(false);
        }
    }

    function clearAll() {
        resetForm();
        lastResult = null;
        showEmptyState();
    }

    function setCriteriaPanel(open) {
        const workspace = document.getElementById('nzWorkspace');
        const toggle = document.getElementById('nzCriteriaToggle');
        if (!workspace) return;

        workspace.classList.toggle('is-criteria-collapsed', !open);
        if (toggle) {
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.title = open ? 'Kriterleri gizle' : 'Kriterleri göster';
        }
        try {
            localStorage.setItem('nzCriteriaOpen', open ? '1' : '0');
        } catch (_) { /* ignore */ }
    }

    function initCriteriaPanel() {
        let open = true;
        try {
            open = localStorage.getItem('nzCriteriaOpen') !== '0';
        } catch (_) { /* ignore */ }
        setCriteriaPanel(open);

        document.getElementById('nzCriteriaToggle')?.addEventListener('click', () => {
            const collapsed = document.getElementById('nzWorkspace')?.classList.contains('is-criteria-collapsed');
            setCriteriaPanel(collapsed);
        });
        document.getElementById('nzCriteriaReopen')?.addEventListener('click', () => setCriteriaPanel(true));
    }

    function bindEvents() {
        document.getElementById('nzFetchBtn')?.addEventListener('click', fetchReport);
        document.getElementById('nzClearBtn')?.addEventListener('click', clearAll);
        document.getElementById('nzExportBtn')?.addEventListener('click', exportCurrentResults);
        document.getElementById('nzCriteriaForm')?.addEventListener('submit', e => {
            e.preventDefault();
            fetchReport();
        });
        initCriteriaPanel();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (!/nazim-hesaplari\.html/i.test(window.location.pathname)) return;
        await window.PagePermissions?.ready?.();
        bindEvents();
        resetForm();
        window.ReportResults?.mountExportButtons?.();
        showEmptyState();
        await loadAyarlar();
    });
})();
