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
                { id: 'surec', label: 'Süreç', href: 'surec.html' },
                { id: 'datasetler', label: 'Datasetler', href: 'surec.html?view=datasetler' },
                { id: 'task-listesi', label: 'Task Listesi', href: 'surec.html?view=task-listesi' }
            ]
        },
        {
            section: 'MUTABAKAT',
            icon: 'ti-scale',
            pages: [
                { id: 'mizan', label: 'Mizan', href: 'mizan.html' },
                { id: 'mutabakat-donem', label: 'Dönem', href: 'mutabakat.html?view=donem' },
                { id: 'fark-veren', label: 'Fark Veren Hesaplar', href: 'mutabakat.html?view=fark-veren' }
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
                { id: 'ters-bakiye', label: 'Ters Bakiye Raporu' },
                { id: 'nazim', label: 'Nazım Hesapları Raporu' }
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
            pages: ['portal', 'kebir', 'mizan', 'mutabakat-donem', 'fark-veren']
        },
        {
            id: 'rapor',
            name: 'Raporlama Uzmanı',
            desc: 'Portal ve raporlama sayfaları',
            badgeClass: 'role-rapor',
            pages: ['portal', 'veritabani-sorgu', 'ters-bakiye', 'nazim']
        },
        {
            id: 'surec',
            name: 'Süreç Koordinatörü',
            desc: 'Portal ve süreç yönetimi',
            badgeClass: 'role-surec',
            pages: ['portal', 'surec', 'datasetler', 'task-listesi']
        },
        {
            id: 'veri-kalitesi',
            name: 'Veri Kalitesi Sorumlusu',
            desc: 'Portal ve veri kalitesi sayfaları',
            badgeClass: 'role-veri-kalitesi',
            pages: ['portal', 'vk-kurallar', 'vk-gunluk']
        },
        {
            id: 'viewer',
            name: 'Görüntüleyici',
            desc: 'Yalnızca portal',
            badgeClass: 'role-viewer',
            pages: ['portal']
        }
    ];

    const USERS = [
        { id: 9, name: 'Uğur Çeren', email: 'ugur.ceren@sirket.com', roleId: 'admin', status: 'active', lastLogin: '2026-06-07 10:30' },
        { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet.yilmaz@sirket.com', roleId: 'admin', status: 'active', lastLogin: '2026-06-07 09:14' },
        { id: 2, name: 'Ayşe Demir', email: 'ayse.demir@sirket.com', roleId: 'mutabakat', status: 'active', lastLogin: '2026-06-06 16:42' },
        { id: 3, name: 'Mehmet Kara', email: 'mehmet.kara@sirket.com', roleId: 'rapor', status: 'active', lastLogin: '2026-06-07 08:05' },
        { id: 4, name: 'Zeynep Can', email: 'zeynep.can@sirket.com', roleId: 'surec', status: 'active', lastLogin: '2026-06-05 11:30' },
        { id: 5, name: 'Seda Yıldız', email: 'seda.yildiz@sirket.com', roleId: 'veri-kalitesi', status: 'active', lastLogin: '2026-06-04 14:18' },
        { id: 6, name: 'Fatih Şahin', email: 'fatih.sahin@sirket.com', roleId: 'mutabakat', status: 'passive', lastLogin: '2026-05-28 10:02' },
        { id: 7, name: 'Can Öztürk', email: 'can.ozturk@sirket.com', roleId: 'viewer', status: 'active', lastLogin: '2026-06-07 07:22' },
        { id: 8, name: 'Elif Arslan', email: 'elif.arslan@sirket.com', roleId: 'veri-kalitesi', status: 'active', lastLogin: '2026-06-06 13:45' }
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
