(function () {
    const HREF_TO_PAGE_ID = {
        'homepage.html': 'portal',
        'homepage.html?view=hizli-erisim': 'portal',
        'ayarlar.html?view=sistem-durumu': 'ayarlar',
        'homepage.html?page=ters-bakiye': 'ters-bakiye',
        'homepage.html?page=nazim': 'nazim',
        'surec.html': 'surec',
        'surec.html?view=datasetler': 'datasetler',
        'surec.html?view=task-listesi': 'task-listesi',
        'mizan.html': 'mizan',
        'mutabakat.html?view=donem': 'mutabakat-donem',
        'mutabakat.html': 'mutabakat-donem',
        'mutabakat.html?view=fark-veren': 'fark-veren',
        'mutabakat.html?view=matrixmap': 'matrixmap',
        'kebir-hesaplari.html': 'kebir',
        'veri-kalitesi-kurallari.html': 'vk-kurallar',
        'gunluk-kural-sonuclari.html': 'vk-gunluk',
        'veritabani-sorgu.html': 'veritabani-sorgu',
        'ayarlar.html': 'ayarlar',
        'kullanici-yonetimi.html': 'kullanici-yonetimi',
        'kisi-yetkileri.html': 'kisi-yetkileri',
        'veritabani-baglantisi.html': 'veritabani-baglantisi'
    };

    let allowedPages = new Set(['portal']);
    let permissionsInitPromise = null;
    let permissionsReadyResolve;
    let permissionsReady = false;

    const permissionsReadyPromise = new Promise(resolve => {
        permissionsReadyResolve = resolve;
    });

    function applyFallbackPermissions() {
        const roleId = localStorage.getItem('userRole') || ApiClient?.userRole || 'viewer';
        if (window.KullaniciShared?.getRolePages) {
            allowedPages = new Set(KullaniciShared.getRolePages(roleId));
        }
        if (!allowedPages.size) {
            allowedPages.add('portal');
        }
    }

    function normalizeHref(href) {
        if (!href) return '';
        try {
            const url = new URL(href, window.location.href);
            const path = (url.pathname.split('/').pop() || '').toLowerCase();
            const view = url.searchParams.get('view');
            const page = url.searchParams.get('page');
            if (path === 'homepage.html') {
                if (page === 'ters-bakiye') return 'homepage.html?page=ters-bakiye';
                if (page === 'nazim') return 'homepage.html?page=nazim';
                if (view === 'hizli-erisim') return 'homepage.html?view=hizli-erisim';
                return 'homepage.html';
            }
            if (view) return `${path}?view=${view}`;
            return path;
        } catch {
            return href.replace(/^\//, '').toLowerCase();
        }
    }

    function hrefToPageId(href) {
        return HREF_TO_PAGE_ID[normalizeHref(href)] || null;
    }

    function detectCurrentPageId() {
        if (typeof window.detectRibbonState === 'function') {
            const state = window.detectRibbonState();
            if (state?.page) {
                const btn = document.querySelector(`.rbtn[data-page="${state.page}"][data-page-id]`);
                if (btn?.dataset.pageId) return btn.dataset.pageId;
            }
        }

        const path = (window.location.pathname.split('/').pop() || '').toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const pageParam = params.get('page');

        if (path === 'homepage.html') {
            if (pageParam === 'ters-bakiye') return 'ters-bakiye';
            if (pageParam === 'nazim') return 'nazim';
            if (view === 'hizli-erisim') return 'portal';
            return 'portal';
        }
        if (path === 'ayarlar.html') {
            return view === 'sistem-durumu' ? 'ayarlar' : 'ayarlar';
        }
        if (path === 'surec.html') {
            if (view === 'datasetler') return 'datasetler';
            if (view === 'task-listesi') return 'task-listesi';
            return 'surec';
        }
        if (path === 'mutabakat.html') {
            if (view === 'fark-veren') return 'fark-veren';
            if (view === 'matrixmap') return 'matrixmap';
            return 'mutabakat-donem';
        }

        const key = path + (window.location.search || '');
        return HREF_TO_PAGE_ID[key] || HREF_TO_PAGE_ID[path] || null;
    }

    function setButtonDisabled(btn, disabled) {
        btn.classList.toggle('is-disabled', disabled);
        btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        if (disabled) {
            btn.title = 'Bu sayfa için yetkiniz yok';
        } else {
            btn.removeAttribute('title');
        }
    }

    function applyRibbonPermissions() {
        if (window.DevAdminMode?.isActive?.()) {
            document.querySelectorAll('.rbtn[data-href]').forEach(btn => {
                const pageId = btn.dataset.pageId || hrefToPageId(btn.dataset.href);
                if (pageId) btn.dataset.pageId = pageId;
                setButtonDisabled(btn, false);
            });
            document.querySelectorAll('.rtab').forEach(tab => {
                tab.classList.remove('is-disabled');
                tab.setAttribute('aria-disabled', 'false');
            });
            return;
        }

        document.querySelectorAll('.rbtn[data-href]').forEach(btn => {
            const pageId = btn.dataset.pageId || hrefToPageId(btn.dataset.href);
            if (!pageId) return;
            btn.dataset.pageId = pageId;
            setButtonDisabled(btn, !allowedPages.has(pageId));
        });

        document.querySelectorAll('.rtab').forEach(tab => {
            const panel = document.getElementById('tab-' + tab.dataset.tab);
            if (!panel) return;
            const hasEnabled = panel.querySelector('.rbtn[data-href]:not(.is-disabled)');
            tab.classList.toggle('is-disabled', !hasEnabled);
            tab.setAttribute('aria-disabled', hasEnabled ? 'false' : 'true');
        });
    }

    function denyAccess() {
        alert('Bu sayfa için yetkiniz yok.');
        if (!/homepage\.html/i.test(window.location.pathname)) {
            window.location.replace('HomePage.html');
        }
    }

    function hasAccess(pageId) {
        if (!pageId) return true;
        if (window.DevAdminMode?.isActive?.()) return true;
        return allowedPages.has(pageId);
    }

    function canNavigateTo(href) {
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return true;
        }
        const pageId = hrefToPageId(href);
        if (!pageId) return true;
        return hasAccess(pageId);
    }

    function guardCurrentPage() {
        if (window.DevAdminMode?.isActive?.()) return true;

        const pageId = detectCurrentPageId();
        if (!pageId || pageId === 'portal') return true;
        if (hasAccess(pageId)) return true;

        denyAccess();
        return false;
    }

    function markPermissionsReady() {
        if (permissionsReady) return;
        permissionsReady = true;
        document.documentElement.classList.remove('permissions-pending');
        permissionsReadyResolve();
        document.dispatchEvent(new Event('permissions-ready'));
    }

    function bindNavigationGuard() {
        document.addEventListener('click', (e) => {
            if (window.DevAdminMode?.isActive?.()) return;

            const rbtn = e.target.closest('.rbtn[data-href]');
            if (rbtn) {
                if (rbtn.classList.contains('is-disabled')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    alert('Bu sayfa için yetkiniz yok.');
                    return;
                }
                if (!canNavigateTo(rbtn.dataset.href)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    alert('Bu sayfa için yetkiniz yok.');
                }
                return;
            }

            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!canNavigateTo(href)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                alert('Bu sayfa için yetkiniz yok.');
            }
        }, true);
    }

    async function loadPermissions() {
        if (window.DevAdminMode?.isActive?.()) {
            allowedPages = new Set(Object.values(HREF_TO_PAGE_ID));
            return;
        }

        try {
            const userId = ApiClient.userId;
            const yetkiler = await ApiClient.getKullaniciYetkiler(userId);
            allowedPages = new Set(
                yetkiler.filter(y => y.izinVerildi).map(y => y.sayfaId)
            );
            if (!allowedPages.size) {
                allowedPages.add('portal');
            }
        } catch (err) {
            console.warn('Sayfa yetkileri yüklenemedi:', err);
            applyFallbackPermissions();
        }
    }

    function initPagePermissions() {
        if (!permissionsInitPromise) {
            permissionsInitPromise = (async () => {
                await loadPermissions();
                applyRibbonPermissions();
                if (guardCurrentPage()) {
                    markPermissionsReady();
                }
            })();
        }
        return permissionsInitPromise;
    }

    applyFallbackPermissions();
    document.documentElement.classList.add('permissions-pending');
    bindNavigationGuard();

    window.PagePermissions = {
        load: async () => {
            permissionsInitPromise = null;
            await loadPermissions();
        },
        applyRibbon: applyRibbonPermissions,
        guardPage: guardCurrentPage,
        hasAccess,
        canNavigateTo,
        hrefToPageId,
        getAllowedPages: () => new Set(allowedPages),
        ready: () => permissionsReadyPromise,
        reload: () => {
            permissionsInitPromise = null;
            permissionsReady = false;
            document.documentElement.classList.add('permissions-pending');
            return initPagePermissions();
        }
    };

    document.addEventListener('ribbon-ready', () => {
        initPagePermissions();
    });

    document.addEventListener('user-session-ready', () => {
        initPagePermissions();
    });
})();
