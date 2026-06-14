(function () {
    const HREF_TO_PAGE_ID = {
        'homepage.html': 'portal',
        'homepage.html?page=ters-bakiye': 'ters-bakiye',
        'homepage.html?page=nazim': 'nazim',
        'surec.html': 'surec',
        'surec.html?view=datasetler': 'datasetler',
        'surec.html?view=task-listesi': 'task-listesi',
        'mizan.html': 'mizan',
        'mutabakat.html?view=donem': 'mutabakat-donem',
        'mutabakat.html': 'mutabakat-donem',
        'mutabakat.html?view=fark-veren': 'fark-veren',
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

    function normalizeHref(href) {
        if (!href) return '';
        return href.replace(/^\//, '').toLowerCase();
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
            return 'portal';
        }
        if (path === 'surec.html') {
            if (view === 'datasetler') return 'datasetler';
            if (view === 'task-listesi') return 'task-listesi';
            return 'surec';
        }
        if (path === 'mutabakat.html') {
            return view === 'fark-veren' ? 'fark-veren' : 'mutabakat-donem';
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

    function guardCurrentPage() {
        const pageId = detectCurrentPageId();
        if (!pageId || pageId === 'portal') return;
        if (allowedPages.has(pageId)) return;

        alert('Bu sayfa için yetkiniz yok.');
        window.location.replace('HomePage.html');
    }

    async function loadPermissions() {
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
        }
    }

    async function initPagePermissions() {
        await loadPermissions();
        applyRibbonPermissions();
        guardCurrentPage();
    }

    window.PagePermissions = {
        load: loadPermissions,
        applyRibbon: applyRibbonPermissions,
        guardPage: guardCurrentPage,
        hasAccess: pageId => allowedPages.has(pageId),
        getAllowedPages: () => new Set(allowedPages)
    };

    document.addEventListener('ribbon-ready', () => applyRibbonPermissions());

    document.addEventListener('user-session-ready', () => {
        initPagePermissions();
    });
})();
