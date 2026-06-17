(function () {
    let currentMod = 'account';
    let ayarlar = null;
    const cache = { account: null, ledger: null };

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

    function kolonSira() {
        const sira = ayarlar?.kolonSira;
        return Array.isArray(sira) && sira.length ? sira : DEFAULT_KOLON_SIRA;
    }

    function kolonEtiketleri() {
        return ayarlar?.kolonEtiketleri || DEFAULT_KOLON_ETIKETLERI;
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
            accountNumber: parseOptionalInt(document.getElementById('tbAccountNumber')?.value),
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

    function renderResults(payload) {
        const empty = document.getElementById('tbEmpty');
        const scroll = document.getElementById('tbResultsScroll');
        const footer = document.getElementById('tbFooter');
        const head = document.getElementById('tbResultsHead');
        const body = document.getElementById('tbResultsBody');
        const countEl = document.getElementById('tbRecordCount');
        const timeEl = document.getElementById('tbQueryTime');

        if (!payload || !payload.basarili) {
            empty.hidden = false;
            scroll.hidden = true;
            footer.hidden = true;
            if (payload && !payload.basarili) {
                setStatus(payload.hata || 'Rapor çalıştırılamadı.', 'error');
            }
            return;
        }

        setStatus('');
        const cols = resolveDisplayColumns(payload.kolonlar || []);
        const rows = payload.satirlar || [];

        if (!rows.length) {
            empty.hidden = false;
            empty.querySelector('p')?.replaceChildren?.();
            empty.innerHTML = `
                <i class="ti ti-table" aria-hidden="true"></i>
                <p>Seçilen kriterlere uygun kayıt bulunamadı.</p>`;
            scroll.hidden = true;
            footer.hidden = false;
            if (countEl) countEl.textContent = '0 kayıt';
            if (timeEl) timeEl.textContent = payload.sureMs != null ? `Sorgu süresi: ${payload.sureMs} ms` : '';
            return;
        }

        empty.hidden = true;
        scroll.hidden = false;
        footer.hidden = false;

        head.innerHTML = `<tr>${cols.map(c => `<th title="${escapeHtml(c)}">${escapeHtml(columnLabel(c))}</th>`).join('')}</tr>`;
        body.innerHTML = rows.map(row => {
            const cells = cols.map(col => {
                const val = row[col];
                const display = val === null || val === undefined ? '' : String(val);
                return `<td title="${escapeHtml(display)}">${escapeHtml(display)}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        let countText = `${payload.satirSayisi ?? rows.length} kayıt`;
        if (payload.kisitlandi) {
            countText += ` (ilk ${payload.maxSatir} gösterildi)`;
        }
        if (countEl) countEl.textContent = countText;
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
        const empty = document.getElementById('tbEmpty');
        const scroll = document.getElementById('tbResultsScroll');
        const footer = document.getElementById('tbFooter');
        if (empty) {
            empty.hidden = false;
            empty.innerHTML = `
                <i class="ti ti-table" aria-hidden="true"></i>
                <p>Kriterleri girin ve <strong>Bilgi Getir</strong> ile raporu çalıştırın.</p>
                <p class="tb-empty-hint">${modLabel(currentMod)} modu için henüz sonuç yok.</p>`;
        }
        if (scroll) scroll.hidden = true;
        if (footer) footer.hidden = true;
    }

    function setMod(mod) {
        currentMod = mod === 'ledger' ? 'ledger' : 'account';
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
                kolonEtiketleri: DEFAULT_KOLON_ETIKETLERI
            };
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
        await loadAyarlar();
    });
})();
