(function () {
    let mizanColumns = [];
    let mizanDataDate = null;

    function getMizanDataDate() {
        if (mizanDataDate) return mizanDataDate;
        if (typeof window.getDefaultGunlukAkisDate === 'function') {
            return window.getDefaultGunlukAkisDate();
        }
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().slice(0, 10);
    }

    async function loadMizanAkis(dataDate) {
        const kokpit = await ApiClient.getMizanAkis({ dataDate });
        return window.mapKokpitKatmanlar(kokpit);
    }

    function buildMizanHTML(columns) {
        const dataDate = getMizanDataDate();
        const grid = window.buildCockpitGridHtml(columns);
        const globalFilters = typeof window.buildGlobalStatusFiltersHtml === 'function'
            ? window.buildGlobalStatusFiltersHtml()
            : '';

        return `<section class="cockpit mizan-flow">
            <div class="cockpit-head">
                <div class="cockpit-head-main">
                    <div>
                        <h3>Mizan</h3>
                        <p>LedgerBalance günlük akışı · TDUTIL.OPR.ETLLoad</p>
                    </div>
                    ${globalFilters}
                </div>
                <div class="cockpit-head-actions">
                    <label class="cockpit-date-filter">
                        <span>Veri Tarihi</span>
                        <input type="date" id="mizanDataDate" value="${dataDate}" aria-label="Veri tarihi">
                    </label>
                </div>
            </div>
            <div class="cockpit-grid">${grid}</div>
        </section>`;
    }

    function bindMizanDateFilter(root) {
        const input = root.querySelector('#mizanDataDate');
        if (!input || input.dataset.bound === '1') return;
        input.dataset.bound = '1';

        input.addEventListener('change', async () => {
            if (!input.value) return;
            mizanDataDate = input.value;
            root.innerHTML = '<div class="cockpit-loading">Yükleniyor…</div>';
            try {
                mizanColumns = await loadMizanAkis(input.value);
                if (typeof COCKPIT_COLUMNS !== 'undefined') {
                    COCKPIT_COLUMNS = mizanColumns;
                }
                window.resetCockpitStatusFilters?.();
                root.innerHTML = buildMizanHTML(mizanColumns);
                window.bindGlobalCockpitStatusFilters?.();
                bindMizanDateFilter(root);
            } catch (err) {
                root.innerHTML = `<div class="mz-error-box">
                    <i class="ti ti-alert-circle" aria-hidden="true"></i>
                    <strong>Mizan akışı yüklenemedi</strong>
                    <p>${err.message || 'Bilinmeyen hata'}</p>
                </div>`;
            }
        });
    }

    async function initMizanPage(container) {
        const el = container || document.querySelector('[data-mizan-page]') || document.getElementById('pageBody');
        if (!el) return;

        el.innerHTML = '<div class="cockpit-loading">Yükleniyor…</div>';

        try {
            mizanColumns = await loadMizanAkis(getMizanDataDate());
            if (typeof COCKPIT_COLUMNS !== 'undefined') {
                COCKPIT_COLUMNS = mizanColumns;
            }
            window.resetCockpitStatusFilters?.();
            el.innerHTML = buildMizanHTML(mizanColumns);
            window.bindGlobalCockpitStatusFilters?.();
            bindMizanDateFilter(el);
        } catch (err) {
            console.error('Mizan akışı yüklenemedi:', err);
            el.innerHTML = `<div class="mz-error-box">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                <strong>Mizan akışı yüklenemedi</strong>
                <p>${err.message || 'API bağlantısı kurulamadı. API çalışıyor mu kontrol edin.'}</p>
                <p class="mz-error-hint">Kaynak: <code>TDUTIL.OPR.ETLLoad</code> · <code>/api/mizan/akis</code></p>
            </div>`;
        }
    }

    window.initMizanPage = initMizanPage;

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        const host = document.querySelector('[data-mizan-page]');
        if (host) initMizanPage(host);
    });
})();
