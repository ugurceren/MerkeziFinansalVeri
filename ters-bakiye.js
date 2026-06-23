(function () {
    let currentMod = 'account';
    let ayarlar = null;
    const cache = { account: null, ledger: null };
    let exportContext = null;

    const MOD_LABELS = {
        account: 'Müşteri - Ek No',
        ledger: 'Hesap'
    };

    function modLabel(mod) {
        return MOD_LABELS[mod === 'ledger' ? 'ledger' : 'account'];
    }

    const DEFAULT_KOLON_SIRA = [
        'ExpectedAction', 'Balance', 'LedgerTypeName', 'FECName', 'FECId', 'AccountSuffix',
        'IncomeLossLedgerFlag', 'LedgerCode3Digit', 'LedgerName', 'LedgerCode', 'DebitCreditName',
        'CreditCardLedgerFlag', 'CustomerName', 'AccountNumber', 'CustomerRiskStatusName',
        'SystemDateTime', 'DataDate', 'ResponsibleUnitName', 'BranchName', 'BranchId'
    ];

    const DEFAULT_KOLON_ETIKETLERI = {
        ExpectedAction: 'Alınması Beklenen Aksiyon',
        Balance: 'Bakiye',
        LedgerTypeName: 'Defter Tipi',
        FECName: 'Döviz Adı',
        FECId: 'Döviz Kodu',
        AccountSuffix: 'Ek No',
        IncomeLossLedgerFlag: 'Gelir Gider Hesabı',
        LedgerCode3Digit: 'Hesap (3 digit)',
        LedgerName: 'Hesap Adı',
        LedgerCode: 'Hesap No',
        DebitCreditName: 'Hesap Yönü',
        CreditCardLedgerFlag: 'Kredi Kartı Hesabı',
        CustomerName: 'Müşteri Adı',
        AccountNumber: 'Müşteri No',
        CustomerRiskStatusName: 'Müşteri Statüsü',
        SystemDateTime: 'Rapor Çalışma Tarihi',
        DataDate: 'Rapor Tarihi',
        ResponsibleUnitName: 'Sorumlu Ekip',
        BranchName: 'Şube',
        BranchId: 'Şube Kodu'
    };

    const DEFAULT_FILTRE_KOLON_MAP = {
        tbAccountNumber: 'AccountNumber',
        tbAccountList: 'AccountNumber',
        tbMinLedger: 'LedgerCode',
        tbMaxLedger: 'LedgerCode',
        tbBeginDate: 'DataDate',
        tbEndDate: 'DataDate',
        tbBranchId: 'BranchId',
        tbFECId: 'FECId',
        tbLedgerTypeId: 'LedgerTypeName',
        tbCreditCardFlag: 'CreditCardLedgerFlag',
        tbIncomeLossFlag: 'IncomeLossLedgerFlag',
        tbRiskStatusId: 'CustomerRiskStatusName',
        tbMinBalance: 'Balance'
    };

    function kolonSira() {
        const sira = ayarlar?.kolonSira;
        return Array.isArray(sira) && sira.length ? sira : DEFAULT_KOLON_SIRA;
    }

    function kolonEtiketleri() {
        return ayarlar?.kolonEtiketleri || DEFAULT_KOLON_ETIKETLERI;
    }

    function filtreKolonMap() {
        return ayarlar?.filtreKolonMap || DEFAULT_FILTRE_KOLON_MAP;
    }

    function filterLabelFor(inputId, kolonAd) {
        const base = columnLabel(kolonAd);
        if (inputId === 'tbBeginDate') return 'Başlangıç Tarihi';
        if (inputId === 'tbEndDate') return 'Bitiş Tarihi';
        if (inputId === 'tbAccountList') return `${base} Listesi`;
        if (inputId === 'tbMinLedger') return `Min ${base}`;
        if (inputId === 'tbMaxLedger') return `Max ${base}`;
        if (inputId === 'tbMinBalance') return `Min ${base}`;
        return base;
    }

    function applyFilterLabels() {
        Object.entries(filtreKolonMap()).forEach(([inputId, kolonAd]) => {
            const label = document.querySelector(`label[for="${inputId}"]`);
            if (!label) return;
            label.textContent = filterLabelFor(inputId, kolonAd);
            const input = document.getElementById(inputId);
            if (input) input.title = kolonAd;
        });
    }

    function findSpColumnKey(spCols, configuredName) {
        if (spCols.includes(configuredName)) return configuredName;
        const lower = configuredName.toLowerCase();
        return spCols.find(c => String(c).toLowerCase() === lower) || null;
    }

    function resolveDisplayColumns(spCols) {
        const ordered = [];
        const used = new Set();
        kolonSira().forEach(name => {
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

    function defaultDates() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { begin: formatDateInput(yesterday), end: formatDateInput(today) };
    }

    function parseAccountList(text) {
        if (!text || !String(text).trim()) return null;
        const parts = String(text).split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
        const nums = parts.map(p => parseInt(p, 10)).filter(n => Number.isFinite(n));
        return nums.length ? nums : null;
    }

    function parseOptionalInt(value) {
        if (value === '' || value === null || value === undefined) return null;
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
    }

    function parseOptionalByte(value) {
        if (value === '' || value === null || value === undefined) return null;
        const n = parseInt(value, 10);
        return n === 0 || n === 1 ? n : null;
    }

    function parseOptionalDecimal(value) {
        if (value === '' || value === null || value === undefined) return null;
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : null;
    }

    function collectCriteria() {
        const beginDate = document.getElementById('tbBeginDate')?.value;
        const endDate = document.getElementById('tbEndDate')?.value;
        if (!beginDate || !endDate) {
            throw new Error('Başlangıç ve bitiş tarihi zorunludur.');
        }

        const isAccount = currentMod === 'account';

        return {
            mod: currentMod,
            beginDate,
            endDate,
            accountNumber: isAccount
                ? parseOptionalInt(document.getElementById('tbAccountNumber')?.value)
                : null,
            accountNumberList: isAccount
                ? parseAccountList(document.getElementById('tbAccountList')?.value)
                : null,
            minLedgerCode: document.getElementById('tbMinLedger')?.value?.trim() || null,
            maxLedgerCode: document.getElementById('tbMaxLedger')?.value?.trim() || null,
            branchId: isAccount ? parseOptionalInt(document.getElementById('tbBranchId')?.value) : null,
            fecId: parseOptionalInt(document.getElementById('tbFECId')?.value),
            ledgerTypeId: parseOptionalInt(document.getElementById('tbLedgerTypeId')?.value),
            creditCardLedgerFlag: parseOptionalByte(document.getElementById('tbCreditCardFlag')?.value),
            incomeLossLedgerFlag: parseOptionalByte(document.getElementById('tbIncomeLossFlag')?.value),
            customerRiskStatusId: isAccount
                ? parseOptionalInt(document.getElementById('tbRiskStatusId')?.value)
                : null,
            minBalance: parseOptionalDecimal(document.getElementById('tbMinBalance')?.value),
            accountNumberKTFlag: isAccount && document.getElementById('tbKtFlag')?.checked ? 1 : null
        };
    }

    function clearAccountOnlyFields() {
        ['tbAccountNumber', 'tbAccountList', 'tbBranchId', 'tbRiskStatusId'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = '';
        });
        const kt = document.getElementById('tbKtFlag');
        if (kt) kt.checked = false;
    }

    function setStatus(message, type) {
        const el = document.getElementById('tbStatus');
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = '';
            el.className = 'tb-results-status';
            return;
        }
        el.hidden = false;
        el.textContent = message;
        el.className = 'tb-results-status' + (type ? ` is-${type}` : '');
    }

    function setLoading(loading) {
        const fetchBtn = document.getElementById('tbFetchBtn');
        const clearBtn = document.getElementById('tbClearBtn');
        if (fetchBtn) fetchBtn.disabled = loading;
        if (clearBtn) clearBtn.disabled = loading;
        if (loading) {
            setStatus('Rapor çalıştırılıyor…', 'loading');
        }
    }

    function resetResultsChrome() {
        const info = document.getElementById('tbRecordInfo');
        const exportBtn = document.getElementById('tbExportBtn');
        if (info) info.innerHTML = '';
        if (exportBtn) exportBtn.disabled = true;
        exportContext = null;
    }

    function updateResultsMeta(payload, cols, rows) {
        const info = document.getElementById('tbRecordInfo');
        const exportBtn = document.getElementById('tbExportBtn');
        const allRows = payload.satirlar || rows;

        window.ReportResults.setRecordCount(info, payload, rows);
        if (exportBtn) exportBtn.disabled = !allRows.length;

        exportContext = allRows.length ? {
            columns: cols,
            rows: allRows,
            getHeaderLabel: columnLabel,
            fileName: window.ReportResults.defaultFileName(`ters-bakiye-${currentMod}`)
        } : null;
    }

    function exportCurrentResults() {
        if (!exportContext) return;
        window.ReportResults.exportToExcel(exportContext);
    }

    function renderResults(payload) {
        const wrap = document.getElementById('tbResultsWrap');
        const empty = document.getElementById('tbEmpty');
        const footer = document.getElementById('tbFooter');
        const head = document.getElementById('tbResultsHead');
        const body = document.getElementById('tbResultsBody');
        const timeEl = document.getElementById('tbQueryTime');

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

    function showCachedOrEmpty() {
        const cached = cache[currentMod];
        if (cached) {
            renderResults(cached);
            return;
        }

        setStatus('');
        const wrap = document.getElementById('tbResultsWrap');
        const empty = document.getElementById('tbEmpty');
        const footer = document.getElementById('tbFooter');
        const head = document.getElementById('tbResultsHead');
        const body = document.getElementById('tbResultsBody');
        wrap?.classList.remove('has-data');
        window.ReportResults.destroyActiveTable();
        if (head) head.innerHTML = '';
        if (body) body.innerHTML = '';
        if (empty) {
            empty.hidden = false;
            empty.innerHTML = `Kriterleri girin ve <strong>Bilgi Getir</strong> ile raporu çalıştırın. (${modLabel(currentMod)} modu)`;
        }
        if (footer) footer.hidden = true;
        resetResultsChrome();
    }

    function setMod(mod) {
        const nextMod = mod === 'ledger' ? 'ledger' : 'account';
        if (nextMod !== currentMod && nextMod === 'ledger') {
            clearAccountOnlyFields();
        }
        currentMod = nextMod;
        document.querySelectorAll('.tb-mode-btn').forEach(btn => {
            const active = btn.dataset.mod === currentMod;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const root = document.getElementById('tbReportRoot');
        if (root) root.dataset.mod = currentMod;
        showCachedOrEmpty();
    }

    function resetForm() {
        const dates = defaultDates();
        const form = document.getElementById('tbCriteriaForm');
        form?.reset();
        const begin = document.getElementById('tbBeginDate');
        const end = document.getElementById('tbEndDate');
        if (begin) begin.value = dates.begin;
        if (end) end.value = dates.end;
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
            ayarlar = await ApiClient.getTersBakiyeAyarlar();
        } catch (err) {
            console.warn('Ters bakiye ayarları yüklenemedi:', err);
            ayarlar = {
                kolonSira: DEFAULT_KOLON_SIRA,
                kolonEtiketleri: DEFAULT_KOLON_ETIKETLERI,
                filtreKolonMap: DEFAULT_FILTRE_KOLON_MAP
            };
        }
        applyFilterLabels();
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
            const result = await ApiClient.calistirTersBakiye(criteria);
            cache[currentMod] = result;
            renderResults(result);
        } catch (err) {
            setStatus(apiErrorMessage(err), 'error');
        } finally {
            setLoading(false);
        }
    }

    function clearAll() {
        resetForm();
        cache.account = null;
        cache.ledger = null;
        setStatus('');
        showCachedOrEmpty();
    }

    function setCriteriaPanel(open) {
        const workspace = document.getElementById('tbWorkspace');
        const toggle = document.getElementById('tbCriteriaToggle');
        if (!workspace) return;

        workspace.classList.toggle('is-criteria-collapsed', !open);
        if (toggle) {
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.title = open ? 'Kriterleri gizle' : 'Kriterleri göster';
        }
        try {
            localStorage.setItem('tbCriteriaOpen', open ? '1' : '0');
        } catch (_) { /* ignore */ }
    }

    function initCriteriaPanel() {
        let open = true;
        try {
            open = localStorage.getItem('tbCriteriaOpen') !== '0';
        } catch (_) { /* ignore */ }
        setCriteriaPanel(open);

        document.getElementById('tbCriteriaToggle')?.addEventListener('click', () => {
            const collapsed = document.getElementById('tbWorkspace')?.classList.contains('is-criteria-collapsed');
            setCriteriaPanel(collapsed);
        });
        document.getElementById('tbCriteriaReopen')?.addEventListener('click', () => setCriteriaPanel(true));
    }

    function bindEvents() {
        document.querySelectorAll('.tb-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => setMod(btn.dataset.mod));
        });
        document.getElementById('tbFetchBtn')?.addEventListener('click', fetchReport);
        document.getElementById('tbClearBtn')?.addEventListener('click', clearAll);
        document.getElementById('tbExportBtn')?.addEventListener('click', exportCurrentResults);
        document.getElementById('tbCriteriaForm')?.addEventListener('submit', e => {
            e.preventDefault();
            fetchReport();
        });
        initCriteriaPanel();
    }

    function initDefaults() {
        resetForm();
        setMod('account');
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (!/ters-bakiye\.html/i.test(window.location.pathname)) return;
        await window.PagePermissions?.ready?.();
        bindEvents();
        initDefaults();
        window.ReportResults?.mountExportButtons?.();
        await loadAyarlar();
    });
})();
