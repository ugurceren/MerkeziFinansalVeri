(function () {
    const STORAGE = {
        defaultPage: 'defaultPage'
    };

    const DEFAULT_PAGES = [
        { value: 'HomePage.html', label: 'Portal' },
        { value: 'surec.html', label: 'Süreç Kokpiti' },
        { value: 'kebir-hesaplari.html', label: 'Kebir Hesapları Sorumluluk Listesi' },
        { value: 'veritabani-sorgu.html', label: 'Veritabanı Sorgusu' },
        { value: 'kullanici-yonetimi.html', label: 'Kullanıcı Yönetimi' }
    ];

    const APP_INFO = {
        name: 'Merkezi Güvenilir Finansal Veri',
        version: '1.0.0',
        environment: 'Geliştirme',
        buildDate: '2026-06-07'
    };

    function buildAyarlarHTML() {
        return `<div class="ay-layout">
                <div class="ay-row">
                <section class="ay-card" id="varsayilan-sayfa">
                    <div class="ay-card-head">
                        <h3><i class="ti ti-home" aria-hidden="true"></i> Varsayılan Açılış Sayfası</h3>
                        <p>Uygulama açıldığında yönlendirilecek sayfa</p>
                    </div>
                    <div class="ay-card-body">
                        <div class="ay-field">
                            <label for="ayDefaultPage">Sayfa</label>
                            <select id="ayDefaultPage"></select>
                        </div>
                        <p class="ay-hint">Tercih kaydedilir; giriş noktası sayfasına eklendiğinde otomatik yönlendirme için kullanılır.</p>
                    </div>
                </section>

                <section class="ay-card" id="gorunum">
                    <div class="ay-card-head">
                        <h3><i class="ti ti-palette" aria-hidden="true"></i> Görünüm</h3>
                        <p>Arayüz teması ve renk tercihleri</p>
                    </div>
                    <div class="ay-card-body">
                        <div class="ay-field">
                            <label>Tema</label>
                            <div class="ay-theme-options">
                                <button type="button" class="ay-theme-option" data-theme-option="dark">
                                    <i class="ti ti-moon" aria-hidden="true"></i>
                                    <strong>Koyu Tema</strong>
                                    <span>Koyu arka plan, göz yormayan</span>
                                </button>
                                <button type="button" class="ay-theme-option" data-theme-option="light">
                                    <i class="ti ti-sun" aria-hidden="true"></i>
                                    <strong>Açık Tema</strong>
                                    <span>Aydınlık arka plan</span>
                                </button>
                            </div>
                        </div>
                        <p class="ay-hint">Menü çubuğundaki anahtar ile de tema değiştirilebilir; seçim otomatik senkronize edilir.</p>
                    </div>
                </section>
                </div>

                <section class="ay-card" id="hakkinda">
                    <div class="ay-card-head">
                        <h3><i class="ti ti-info-circle" aria-hidden="true"></i> Hakkında</h3>
                        <p>Uygulama ve ortam bilgisi</p>
                    </div>
                    <div class="ay-card-body">
                        <dl class="ay-about-grid">
                            <dt>Uygulama</dt>
                            <dd id="ayAppName">—</dd>
                            <dt>Sürüm</dt>
                            <dd id="ayAppVersion">—</dd>
                            <dt>Ortam</dt>
                            <dd><span class="ay-env-badge" id="ayAppEnv">—</span></dd>
                            <dt>Yayın tarihi</dt>
                            <dd id="ayAppBuild">—</dd>
                        </dl>
                    </div>
                </section>

                <div class="ay-save-bar">
                    <button type="button" class="ay-save-btn" id="aySaveBtn">Ayarları Kaydet</button>
                    <span class="ay-save-msg" id="aySaveMsg" role="status">Kaydedildi</span>
                </div>
            </div>`;
    }

    function showSaveMessage(root) {
        const msg = (root || document).querySelector('#aySaveMsg');
        if (!msg) return;
        msg.classList.add('visible');
        clearTimeout(showSaveMessage._timer);
        showSaveMessage._timer = setTimeout(() => msg.classList.remove('visible'), 2200);
    }

    function updateThemeOptionsUI(theme, root) {
        (root || document).querySelectorAll('[data-theme-option]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeOption === theme);
        });
    }

    function initThemeOptions(root) {
        const scope = root || document;
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        updateThemeOptionsUI(current, scope);

        scope.querySelectorAll('[data-theme-option]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof applyTheme === 'function') {
                    applyTheme(btn.dataset.themeOption);
                }
                updateThemeOptionsUI(btn.dataset.themeOption, scope);
            });
        });
    }

    function initDefaultPageSelect(root) {
        const select = (root || document).querySelector('#ayDefaultPage');
        if (!select) return;

        select.innerHTML = DEFAULT_PAGES.map(p =>
            `<option value="${p.value}">${p.label}</option>`
        ).join('');

        const saved = localStorage.getItem(STORAGE.defaultPage) || 'HomePage.html';
        if (DEFAULT_PAGES.some(p => p.value === saved)) {
            select.value = saved;
        }
    }

    function initAboutSection(root) {
        const scope = root || document;
        const map = {
            ayAppName: APP_INFO.name,
            ayAppVersion: APP_INFO.version,
            ayAppEnv: APP_INFO.environment,
            ayAppBuild: APP_INFO.buildDate
        };
        Object.entries(map).forEach(([id, text]) => {
            const el = scope.querySelector('#' + id);
            if (el) el.textContent = text;
        });
    }

    function saveSettings(root) {
        const scope = root || document;
        const defaultPage = scope.querySelector('#ayDefaultPage')?.value;

        if (defaultPage) localStorage.setItem(STORAGE.defaultPage, defaultPage);

        showSaveMessage(scope);
    }

    function scrollToSection(id) {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function initScrollLinks() {
        if (initScrollLinks._bound) return;
        initScrollLinks._bound = true;
        document.addEventListener('click', e => {
            const btn = e.target.closest('[data-scroll]');
            if (!btn) return;
            scrollToSection(btn.dataset.scroll);
        });
    }

    function initAyarlarPage(container) {
        const root = container || document;
        initThemeOptions(root);
        initDefaultPageSelect(root);
        initAboutSection(root);
        initScrollLinks();

        root.querySelector('#aySaveBtn')?.addEventListener('click', () => saveSettings(root));

        const hash = window.location.hash.replace('#', '');
        if (hash) setTimeout(() => scrollToSection(hash), 100);
    }

    function initAyarlarShell() {
        const pageBody = document.getElementById('pageBody');
        const root = pageBody || document;

        if (window.SistemDurumuPage?.isSistemDurumuView?.()) {
            if (pageBody) {
                window.SistemDurumuPage.render(pageBody);
            }
            return;
        }

        if (pageBody && !pageBody.querySelector('.ay-layout')) {
            pageBody.innerHTML = buildAyarlarHTML();
        }

        initAyarlarPage(root);
    }

    window.buildAyarlarHTML = buildAyarlarHTML;
    window.initAyarlarPage = initAyarlarPage;
    window.scrollToAyarlarSection = scrollToSection;

    document.addEventListener('ribbon-ready', async () => {
        if (!(window.location.pathname.split('/').pop() || '').toLowerCase().includes('ayarlar.html')) return;
        await window.PagePermissions?.ready?.();
        if (typeof initUserBar === 'function') initUserBar();
        if (typeof initThemeMenu === 'function') initThemeMenu();
        initAyarlarShell();
    });

    document.addEventListener('DOMContentLoaded', async () => {
        if (document.getElementById('ribbonBody')) return;
        await window.PagePermissions?.ready?.();
        initAyarlarShell();
    });

    window.getDefaultPage = () => localStorage.getItem(STORAGE.defaultPage) || 'HomePage.html';
})();
