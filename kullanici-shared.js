(function () {
    const PAGE_MENU = [
        {
            section: 'PORTAL',
            icon: 'ti-home',
            pages: [{ id: 'portal', label: 'Portal', href: 'HomePage.html' }]
        },
        {
            section: 'SÜREÇ',
            icon: 'ti-timeline',
            pages: [
                { id: 'surec', label: 'Günlük Akış', href: 'surec.html' },
                { id: 'datasetler', label: 'Datasetler', href: 'surec.html?view=datasetler' },
                { id: 'task-listesi', label: 'Paket Listesi', href: 'surec.html?view=task-listesi' }
            ]
        },
        {
            section: 'MUTABAKAT',
            icon: 'ti-scale',
            pages: [
                { id: 'mizan', label: 'Mizan', href: 'mizan.html' },
                { id: 'mutabakat-donem', label: 'Dönem', href: 'mutabakat.html?view=donem' },
                { id: 'fark-veren', label: 'Fark Veren Hesaplar', href: 'mutabakat.html?view=fark-veren' },
                { id: 'matrixmap', label: 'Matrix Map', href: 'mutabakat.html?view=matrixmap' }
            ]
        },
        {
            section: 'PARAMETRE YÖNETİMİ',
            icon: 'ti-adjustments',
            pages: [
                { id: 'kebir', label: 'Kebir Hesapları Sorumluluk Listesi', href: 'kebir-hesaplari.html' }
            ]
        },
        {
            section: 'VERİ KALİTESİ',
            icon: 'ti-list-check',
            pages: [
                { id: 'vk-kurallar', label: 'Veri Kalitesi Kuralları', href: 'veri-kalitesi-kurallari.html' },
                { id: 'vk-gunluk', label: 'Günlük Kural Sonuçları', href: 'gunluk-kural-sonuclari.html' }
            ]
        },
        {
            section: 'RAPORLAMA',
            icon: 'ti-chart-bar',
            pages: [
                { id: 'veritabani-sorgu', label: 'Veritabanı Sorgusu', href: 'veritabani-sorgu.html' },
                { id: 'ters-bakiye', label: 'Ters Bakiye Raporu', href: 'ters-bakiye.html' },
                { id: 'nazim', label: 'Nazım Hesapları Raporu', href: 'nazim-hesaplari.html' }
            ]
        },
        {
            section: 'AYARLAR',
            icon: 'ti-settings',
            pages: [{ id: 'ayarlar', label: 'Ayarlar', href: 'ayarlar.html' }]
        },
        {
            section: 'YÖNETİM',
            icon: 'ti-users',
            pages: [
                { id: 'kullanici-yonetimi', label: 'Kullanıcı Yönetimi', href: 'kullanici-yonetimi.html' },
                { id: 'kisi-yetkileri', label: 'Kişi Bazlı Yetkiler', href: 'kisi-yetkileri.html' },
                { id: 'aktivite-listesi', label: 'Aktivite Listesi', href: 'aktivite-listesi.html' },
                { id: 'veritabani-baglantisi', label: 'Veritabanı Bağlantısı', href: 'veritabani-baglantisi.html' }
            ]
        }
    ];

    const ALL_PAGE_IDS = PAGE_MENU.flatMap(g => g.pages.map(p => p.id));

    const ROLES = [
        {
            id: 'admin',
            name: 'Sistem Yöneticisi',
            desc: 'Tüm modüllere tam erişim',
            badgeClass: 'role-admin',
            pages: ALL_PAGE_IDS.slice()
        },
        {
            id: 'mutabakat',
            name: 'Mutabakat Sorumlusu',
            desc: 'Portal ve mutabakat sayfaları',
            badgeClass: 'role-mutabakat',
            pages: ['portal', 'kebir', 'mizan', 'mutabakat-donem', 'fark-veren', 'matrixmap', 'ayarlar']
        },
        {
            id: 'rapor',
            name: 'Raporlama Uzmanı',
            desc: 'Portal ve raporlama sayfaları',
            badgeClass: 'role-rapor',
            pages: ['portal', 'veritabani-sorgu', 'ters-bakiye', 'nazim', 'mizan', 'mutabakat-donem', 'fark-veren', 'matrixmap', 'kebir', 'ayarlar']
        },
        {
            id: 'surec',
            name: 'Süreç Koordinatörü',
            desc: 'Portal ve süreç yönetimi',
            badgeClass: 'role-surec',
            pages: ['portal', 'surec', 'datasetler', 'task-listesi', 'mizan', 'mutabakat-donem', 'fark-veren', 'matrixmap', 'ayarlar']
        },
        {
            id: 'veri-kalitesi',
            name: 'Veri Kalitesi Sorumlusu',
            desc: 'Portal ve veri kalitesi sayfaları',
            badgeClass: 'role-veri-kalitesi',
            pages: ['portal', 'vk-kurallar', 'vk-gunluk', 'ayarlar']
        },
        {
            id: 'viewer',
            name: 'Görüntüleyici',
            desc: 'Yalnızca portal',
            badgeClass: 'role-viewer',
            pages: ['portal', 'ayarlar']
        }
    ];

    const USERS = [
        { id: 5124, name: 'Uğur Çeren', email: 'ugur.ceren@kuveytturk.com.tr', roleId: 'admin', status: 'active', userCode: 'uceren' },
        { id: 5853, name: 'Mesut Yanık', email: 'mesut.yanik@kuveytturk.com.tr', roleId: 'rapor', status: 'active', userCode: 'myanik' },
        { id: 5067, name: 'Selim Eşki', email: 'selim.eski@kuveytturk.com.tr', roleId: 'surec', status: 'active', userCode: 'selime' },
        { id: 9653, name: 'İbrahim Tahtabiçen', email: 'ibrahim.tahtabicen@kuveytturk.com.tr', roleId: 'veri-kalitesi', status: 'active', userCode: 'ibrahimt' }
    ];

    const roleMap = Object.fromEntries(ROLES.map(r => [r.id, r]));

    function userInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'K';
    }

    function getRolePages(roleId) {
        return roleMap[roleId]?.pages || [];
    }

    window.KullaniciShared = {
        PAGE_MENU,
        ALL_PAGE_IDS,
        ROLES,
        USERS,
        roleMap,
        userInitials,
        getRolePages
    };
})();
