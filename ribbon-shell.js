(function () {
    const RIBBON_PANELS = {
        portal: `
        <div class="tab-panel" id="tab-portal">
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Portal" data-page-id="portal" data-section="PORTAL" data-href="HomePage.html">
                        <i class="ti ti-home"></i>
                        <span>Portal</span>
                    </button>
                </div>
            </div>
        </div>`,
        surec: `
        <div class="tab-panel" id="tab-surec">
            <div class="ribbon-group">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Süreç" data-page-id="surec" data-section="SÜREÇ" data-href="surec.html">
                        <i class="ti ti-timeline"></i>
                        <span>Süreç</span>
                    </button>
                </div>
            </div>
            <div class="ribbon-group">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Datasetler" data-page-id="datasetler" data-section="SÜREÇ" data-href="surec.html?view=datasetler">
                        <i class="ti ti-stack-2"></i>
                        <span>Datasetler</span>
                    </button>
                </div>
            </div>
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Task Listesi" data-page-id="task-listesi" data-section="SÜREÇ" data-href="surec.html?view=task-listesi">
                        <i class="ti ti-list-check"></i>
                        <span>Task<br>Listesi</span>
                    </button>
                </div>
            </div>
        </div>`,
        mutabakat: `
        <div class="tab-panel" id="tab-mutabakat">
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Mizan" data-page-id="mizan" data-section="MUTABAKAT" data-href="mizan.html">
                        <i class="ti ti-scale"></i>
                        <span>Mizan</span>
                    </button>
                    <button class="rbtn" type="button" data-page="Dönem" data-page-id="mutabakat-donem" data-section="MUTABAKAT" data-href="mutabakat.html?view=donem">
                        <i class="ti ti-calendar"></i>
                        <span>Dönem</span>
                    </button>
                    <button class="rbtn" type="button" data-page="Fark Veren Hesaplar" data-page-id="fark-veren" data-section="MUTABAKAT" data-href="mutabakat.html?view=fark-veren">
                        <i class="ti ti-arrows-diff"></i>
                        <span>Fark Veren<br>Hesaplar</span>
                    </button>
                </div>
            </div>
        </div>`,
        parametre: `
        <div class="tab-panel" id="tab-parametre">
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Kebir Hesapları Sorumluluk Listesi" data-page-id="kebir" data-section="PARAMETRE YÖNETİMİ" data-href="kebir-hesaplari.html">
                        <i class="ti ti-notebook"></i>
                        <span>Kebir<br>Hesapları<br>Sorumluluk Listesi</span>
                    </button>
                </div>
            </div>
        </div>`,
        'veri-kalitesi': `
        <div class="tab-panel" id="tab-veri-kalitesi">
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Veri Kalitesi Kuralları" data-page-id="vk-kurallar" data-section="VERİ KALİTESİ" data-href="veri-kalitesi-kurallari.html">
                        <i class="ti ti-list-check"></i>
                        <span>Veri Kalitesi<br>Kuralları</span>
                    </button>
                    <button class="rbtn" type="button" data-page="Günlük Kural Sonuçları" data-page-id="vk-gunluk" data-section="VERİ KALİTESİ" data-href="gunluk-kural-sonuclari.html">
                        <i class="ti ti-calendar-stats"></i>
                        <span>Günlük Kural<br>Sonuçları</span>
                    </button>
                </div>
            </div>
        </div>`,
        raporlama: `
        <div class="tab-panel" id="tab-raporlama">
            <div class="ribbon-group">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Ters Bakiye Raporu" data-page-id="ters-bakiye" data-section="RAPORLAMA" data-href="HomePage.html?page=ters-bakiye">
                        <i class="ti ti-arrows-exchange"></i>
                        <span>Ters Bakiye<br>Raporu</span>
                    </button>
                    <button class="rbtn" type="button" data-page="Nazım Hesapları Raporu" data-page-id="nazim" data-section="RAPORLAMA" data-href="HomePage.html?page=nazim">
                        <i class="ti ti-file-analytics"></i>
                        <span>Nazım Hesapları<br>Raporu</span>
                    </button>
                </div>
            </div>
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Veritabanı Sorgusu" data-page-id="veritabani-sorgu" data-section="RAPORLAMA" data-href="veritabani-sorgu.html">
                        <i class="ti ti-database"></i>
                        <span>Veritabanı<br>Sorgusu</span>
                    </button>
                </div>
            </div>
        </div>`,
        ayarlar: `
        <div class="tab-panel" id="tab-ayarlar">
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Uygulama Ayarları" data-page-id="ayarlar" data-section="AYARLAR" data-href="ayarlar.html">
                        <i class="ti ti-settings"></i>
                        <span>Uygulama<br>Ayarları</span>
                    </button>
                </div>
            </div>
        </div>`,
        yonetim: `
        <div class="tab-panel" id="tab-yonetim">
            <div class="ribbon-group">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Kullanıcı Yönetimi" data-page-id="kullanici-yonetimi" data-section="YÖNETİM" data-href="kullanici-yonetimi.html">
                        <i class="ti ti-users"></i>
                        <span>Kullanıcı<br>Yönetimi</span>
                    </button>
                    <button class="rbtn" type="button" data-page="Kişi Bazlı Yetkiler" data-page-id="kisi-yetkileri" data-section="YÖNETİM" data-href="kisi-yetkileri.html">
                        <i class="ti ti-user-shield"></i>
                        <span>Kişi Bazlı<br>Yetkiler</span>
                    </button>
                </div>
            </div>
            <div class="ribbon-group" style="border-right:none">
                <div class="rg-buttons">
                    <button class="rbtn" type="button" data-page="Veritabanı Bağlantısı" data-page-id="veritabani-baglantisi" data-section="YÖNETİM" data-href="veritabani-baglantisi.html">
                        <i class="ti ti-plug-connected"></i>
                        <span>Veritabanı<br>Bağlantısı</span>
                    </button>
                </div>
            </div>
        </div>`
    };

    const RIBBON_TABS = [
        { id: 'portal', label: 'Portal' },
        { id: 'surec', label: 'Süreç' },
        { id: 'mutabakat', label: 'Mutabakat' },
        { id: 'parametre', label: 'Parametre Yönetimi' },
        { id: 'veri-kalitesi', label: 'Veri Kalitesi' },
        { id: 'raporlama', label: 'Raporlama' },
        { id: 'ayarlar', label: 'Ayarlar' },
        { id: 'yonetim', label: 'Yönetim' }
    ];

    const SECTION_TAB = {
        PORTAL: 'portal',
        SÜREÇ: 'surec',
        MUTABAKAT: 'mutabakat',
        'PARAMETRE YÖNETİMİ': 'parametre',
        'VERİ KALİTESİ': 'veri-kalitesi',
        RAPORLAMA: 'raporlama',
        AYARLAR: 'ayarlar',
        YÖNETİM: 'yonetim'
    };

    function initUserBar() {
        const userName = localStorage.getItem('userName') || 'Uğur Çeren';
        const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const el = document.getElementById('tbUser');
        const av = document.getElementById('tbAvatar');
        if (el) el.textContent = userName;
        if (av) av.textContent = initials;
        return userName;
    }

    function renderRibbonShell() {
        const tabList = document.querySelector('.ribbon-tab-list');
        const body = document.getElementById('ribbonBody');
        if (!tabList || !body) return;

        tabList.innerHTML = RIBBON_TABS.map(t =>
            `<button class="rtab" type="button" data-tab="${t.id}">${t.label}</button>`
        ).join('');

        body.innerHTML = Object.values(RIBBON_PANELS).join('');
    }

    function activateRibbonSection(section) {
        const tabId = SECTION_TAB[section];
        if (!tabId) return;
        document.querySelectorAll('.rtab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === 'tab-' + tabId);
        });
    }

    function activateRibbonButton(page) {
        document.querySelectorAll('.rbtn[data-page]').forEach(b => {
            b.classList.toggle('active', b.dataset.page === page);
        });
    }

    function detectRibbonState() {
        const path = (window.location.pathname.split('/').pop() || '').toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const pageParam = params.get('page');

        if (path === 'homepage.html') {
            if (pageParam === 'ters-bakiye') return { section: 'RAPORLAMA', page: 'Ters Bakiye Raporu' };
            if (pageParam === 'nazim') return { section: 'RAPORLAMA', page: 'Nazım Hesapları Raporu' };
            return { section: 'PORTAL', page: 'Portal' };
        }
        if (path === 'surec.html') {
            if (view === 'datasetler') return { section: 'SÜREÇ', page: 'Datasetler' };
            if (view === 'task-listesi') return { section: 'SÜREÇ', page: 'Task Listesi' };
            return { section: 'SÜREÇ', page: 'Süreç' };
        }
        if (path === 'mizan.html') return { section: 'MUTABAKAT', page: 'Mizan' };
        if (path === 'mutabakat.html') {
            if (view === 'fark-veren') return { section: 'MUTABAKAT', page: 'Fark Veren Hesaplar' };
            return { section: 'MUTABAKAT', page: 'Dönem' };
        }
        if (path === 'kebir-hesaplari.html') return { section: 'PARAMETRE YÖNETİMİ', page: 'Kebir Hesapları Sorumluluk Listesi' };
        if (path === 'veri-kalitesi-kurallari.html') return { section: 'VERİ KALİTESİ', page: 'Veri Kalitesi Kuralları' };
        if (path === 'gunluk-kural-sonuclari.html') return { section: 'VERİ KALİTESİ', page: 'Günlük Kural Sonuçları' };
        if (path === 'veritabani-sorgu.html') return { section: 'RAPORLAMA', page: 'Veritabanı Sorgusu' };
        if (path === 'ayarlar.html') return { section: 'AYARLAR', page: 'Uygulama Ayarları' };
        if (path === 'kullanici-yonetimi.html') return { section: 'YÖNETİM', page: 'Kullanıcı Yönetimi' };
        if (path === 'kisi-yetkileri.html') return { section: 'YÖNETİM', page: 'Kişi Bazlı Yetkiler' };
        if (path === 'veritabani-baglantisi.html') return { section: 'YÖNETİM', page: 'Veritabanı Bağlantısı' };
        return null;
    }

    function bindRibbonNavigation() {
        const tabs = document.querySelectorAll('.rtab');
        const panels = document.querySelectorAll('.tab-panel');
        const btns = document.querySelectorAll('.rbtn');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.classList.contains('is-disabled')) return;
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panel = document.getElementById('tab-' + tab.dataset.tab);
                if (panel) panel.classList.add('active');
            });
        });

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('is-disabled')) return;
                if (btn.classList.contains('ribbon-dropdown-trigger')) return;
                if (btn.classList.contains('theme-option')) return;

                const href = btn.dataset.href;
                if (href) {
                    window.location.href = href;
                    return;
                }

                const section = btn.dataset.section;
                const page = btn.dataset.page;
                if (!page) return;

                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activateRibbonSection(section);

                if (typeof window.handleRibbonPage === 'function') {
                    window.handleRibbonPage(section, page);
                }
            });
        });
    }

    function bootRibbonShell() {
        renderRibbonShell();
        bindRibbonNavigation();

        const state = detectRibbonState();
        if (state) {
            activateRibbonSection(state.section);
            activateRibbonButton(state.page);
        }

        setTimeout(function () {
            document.dispatchEvent(new CustomEvent('ribbon-ready', { detail: state }));
        }, 0);
    }

    window.initUserBar = initUserBar;
    window.activateRibbonSection = activateRibbonSection;
    window.activateRibbonButton = activateRibbonButton;
    window.detectRibbonState = detectRibbonState;
    window.RIBBON_TABS = RIBBON_TABS;

    if (document.getElementById('ribbonBody')) {
        bootRibbonShell();
    }
})();
