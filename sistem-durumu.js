(function () {
    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatApiError(message) {
        if (!message) return 'API bağlantısı kurulamadı.';
        if (/failed to fetch/i.test(message)) {
            return 'API sunucusuna ulaşılamıyor. Sunucunun çalıştığından emin olun.';
        }
        if (/network/i.test(message)) {
            return 'Ağ bağlantısı hatası oluştu.';
        }
        return message;
    }

    function buildOfflineBannerHTML(message) {
        const apiUrl = ApiClient?.baseUrl || 'http://localhost:5038/api';
        return `<div class="portal-offline-banner" role="alert">
            <i class="ti ti-plug-connected-x"></i>
            <div class="portal-offline-text">
                <strong>Canlı veri yüklenemedi</strong>
                <span>${escapeHtml(formatApiError(message))} · <code>${escapeHtml(apiUrl)}</code></span>
            </div>
            <button type="button" class="portal-retry-btn" id="portalRetryBtn">Yeniden dene</button>
        </div>`;
    }

    function buildLoadingHTML() {
        return `<section class="dashboard portal-loading">
            <div class="dashboard-panel skeleton-panel" style="min-height:240px"></div>
        </section>`;
    }

    function buildStatusRowsHTML(isOffline, veriKaynaklari) {
        if (isOffline) {
            const apiUrl = ApiClient?.baseUrl || 'http://localhost:5038/api';
            return `<div class="status-item">
                <span>API</span>
                <span class="status-badge syncing">Çevrimdışı</span>
               </div>
               <div class="status-item">
                <span>API adresi</span>
                <span class="portal-status-meta"><code>${escapeHtml(apiUrl)}</code></span>
               </div>
               <div class="status-item">
                <span>Canlı veri</span>
                <span class="status-badge pending">Kullanılamıyor</span>
               </div>`;
        }
        if (veriKaynaklari.length) {
            return veriKaynaklari.map(v => {
                const online = v.durum === 'connected';
                return `<div class="status-item">
                    <span>${v.katmanKodu}</span>
                    <span class="status-badge ${online ? 'online' : 'syncing'}">${online ? 'Çevrimiçi' : 'Bağlantı yok'}</span>
                </div>`;
            }).join('');
        }
        return '<div class="status-item"><span>Veri kaynağı</span><span class="status-badge pending">Yapılandırılıyor</span></div>';
    }

    function buildSystemStatusContent({ isOffline, offlineMessage, ozet }) {
        const veriKaynaklari = isOffline ? [] : (ozet?.sistemDurumu?.veriKaynaklari || []);
        const kpi = isOffline ? {} : (ozet?.kpi || {});
        const online = veriKaynaklari.filter(v => v.durum === 'connected').length;
        const total = veriKaynaklari.length;
        const offlineBanner = isOffline ? buildOfflineBannerHTML(offlineMessage) : '';

        const summary = isOffline
            ? 'Sistem durumu canlı olarak alınamıyor'
            : (total
                ? `${online}/${total} veri kaynağı çevrimiçi · ${kpi.bekleyenGorevSayisi ?? 0} bekleyen görev`
                : 'Veri kaynağı yapılandırması bekleniyor');

        const apiRow = !isOffline
            ? `<div class="status-item">
                <span>API</span>
                <span class="status-badge online">Çevrimiçi</span>
               </div>`
            : '';

        return `<section class="dashboard portal-view-system${isOffline ? ' portal-offline' : ''}">
            ${offlineBanner}
            <div class="portal-welcome">
                <div>
                    <h2>Sistem Durumu</h2>
                    <p class="portal-welcome-sub">${summary}</p>
                </div>
            </div>
            <div class="dashboard-panel portal-system-panel">
                <div class="panel-head"><h4>Veri Kaynakları</h4><span>Bağlantı ve erişilebilirlik</span></div>
                <div class="status-list portal-status-expanded">${apiRow}${buildStatusRowsHTML(isOffline, veriKaynaklari)}</div>
            </div>
            ${!isOffline && total ? `<p class="portal-system-footnote">Son güncelleme: portal özeti yüklendiğinde</p>` : ''}
        </section>`;
    }

    function bindRetryButton(container, retryFn) {
        const retryBtn = container.querySelector('#portalRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => retryFn(container));
        }
    }

    async function render(container) {
        const target = container || document.getElementById('pageBody');
        if (!target) return;

        target.innerHTML = buildLoadingHTML();

        let ozet = null;
        let loadError = null;
        try {
            ozet = await ApiClient.getPortalOzet();
        } catch (err) {
            loadError = err.message;
            console.warn('Sistem durumu yüklenemedi:', err.message);
        }

        const isOffline = !!loadError && !ozet;
        target.innerHTML = buildSystemStatusContent({
            isOffline,
            offlineMessage: loadError,
            ozet
        });

        if (isOffline) {
            bindRetryButton(target, render);
        }
    }

    function isSistemDurumuView() {
        return new URLSearchParams(window.location.search).get('view') === 'sistem-durumu';
    }

    window.SistemDurumuPage = {
        render,
        buildStatusRowsHTML,
        isSistemDurumuView
    };
})();
