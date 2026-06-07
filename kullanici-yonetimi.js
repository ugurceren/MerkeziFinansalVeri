(function () {
    const PAGE_MENU = [
        {
            section: 'GENEL',
            icon: 'ti-home',
            pages: [{ id: 'genel-bakis', label: 'Genel Bakış', href: 'HomePage.html' }]
        },
        {
            section: 'SÜREÇ',
            icon: 'ti-timeline',
            pages: [{ id: 'surec', label: 'Süreç', href: 'surec.html' }]
        },
        {
            section: 'MUTABAKAT',
            icon: 'ti-notebook',
            pages: [
                { id: 'kebir', label: 'Kebir Hesapları Sorumluluk Listesi', href: 'kebir-hesaplari.html' },
                { id: 'mizan', label: 'Mizan' },
                { id: 'yevmiye', label: 'Yevmiye Defteri' },
                { id: 'masraf', label: 'Masraf Hesapları' }
            ]
        },
        {
            section: 'RAPORLAMA',
            icon: 'ti-chart-bar',
            pages: [
                { id: 'bilanco', label: 'Bilanço' },
                { id: 'gelir', label: 'Gelir Tablosu' },
                { id: 'ters-bakiye', label: 'Ters Bakiye Raporu' },
                { id: 'nazim', label: 'Nazım Hesapları Raporu' },
                { id: 'excel', label: 'Excel Dışa Aktar' }
            ]
        },
        {
            section: 'AYARLAR',
            icon: 'ti-settings',
            pages: [{ id: 'ayarlar', label: 'Ayarlar' }]
        },
        {
            section: 'YÖNETİM',
            icon: 'ti-users',
            pages: [{ id: 'kullanici-yonetimi', label: 'Kullanıcı Yönetimi', href: 'kullanici-yonetimi.html' }]
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
            desc: 'Genel bakış ve mutabakat sayfaları',
            badgeClass: 'role-mutabakat',
            pages: ['genel-bakis', 'kebir', 'mizan', 'yevmiye', 'masraf']
        },
        {
            id: 'rapor',
            name: 'Raporlama Uzmanı',
            desc: 'Genel bakış ve raporlama sayfaları',
            badgeClass: 'role-rapor',
            pages: ['genel-bakis', 'bilanco', 'gelir', 'ters-bakiye', 'nazim', 'excel']
        },
        {
            id: 'surec',
            name: 'Süreç Koordinatörü',
            desc: 'Genel bakış ve süreç yönetimi',
            badgeClass: 'role-surec',
            pages: ['genel-bakis', 'surec']
        },
        {
            id: 'viewer',
            name: 'Görüntüleyici',
            desc: 'Yalnızca genel bakış',
            badgeClass: 'role-viewer',
            pages: ['genel-bakis']
        }
    ];

    const USERS = [
        { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet.yilmaz@sirket.com', roleId: 'admin', status: 'active', lastLogin: '2026-06-07 09:14' },
        { id: 2, name: 'Ayşe Demir', email: 'ayse.demir@sirket.com', roleId: 'mutabakat', status: 'active', lastLogin: '2026-06-06 16:42' },
        { id: 3, name: 'Mehmet Kara', email: 'mehmet.kara@sirket.com', roleId: 'rapor', status: 'active', lastLogin: '2026-06-07 08:05' },
        { id: 4, name: 'Zeynep Can', email: 'zeynep.can@sirket.com', roleId: 'surec', status: 'active', lastLogin: '2026-06-05 11:30' },
        { id: 5, name: 'Seda Yıldız', email: 'seda.yildiz@sirket.com', roleId: 'viewer', status: 'active', lastLogin: '2026-06-04 14:18' },
        { id: 6, name: 'Fatih Şahin', email: 'fatih.sahin@sirket.com', roleId: 'mutabakat', status: 'passive', lastLogin: '2026-05-28 10:02' }
    ];

    const roleMap = Object.fromEntries(ROLES.map(r => [r.id, r]));
    const roleListEl = document.getElementById('roleList');
    const accessTitleEl = document.getElementById('accessTitle');
    const accessDescEl = document.getElementById('accessDesc');
    const accessMenuEl = document.getElementById('accessMenu');
    const usersBody = document.querySelector('#usersTable tbody');

    let selectedRoleId = 'admin';
    let selectedUserId = 1;

    function initials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'K';
    }

    function countUsersForRole(roleId) {
        return USERS.filter(u => u.roleId === roleId).length;
    }

    function renderRoleCards() {
        roleListEl.innerHTML = ROLES.map(role => `
            <button type="button" class="um-role-card${role.id === selectedRoleId ? ' active' : ''}" data-role-id="${role.id}">
                <div class="um-role-card-head">
                    <strong>${role.name}</strong>
                    <span class="um-role-count">${countUsersForRole(role.id)} kullanıcı</span>
                </div>
                <p>${role.desc}</p>
            </button>
        `).join('');

        roleListEl.querySelectorAll('.um-role-card').forEach(card => {
            card.addEventListener('click', () => {
                selectedRoleId = card.dataset.roleId;
                renderRoleCards();
                renderAccessPanel();
            });
        });
    }

    function renderAccessPanel() {
        const role = roleMap[selectedRoleId];
        if (!role) return;

        const user = USERS.find(u => u.id === selectedUserId);
        const viaUser = user && user.roleId === selectedRoleId;

        accessTitleEl.textContent = role.name;
        accessDescEl.textContent = viaUser && user
            ? `${user.name} bu role sahip — erişebileceği sayfalar aşağıda listelenmiştir.`
            : `${role.desc}. Bu role atanmış kullanıcılar aşağıdaki sayfalara erişebilir.`;

        accessMenuEl.innerHTML = PAGE_MENU.map(group => {
            const items = group.pages.map(page => {
                const allowed = role.pages.includes(page.id);
                return `
                    <li class="${allowed ? 'allowed' : 'denied'}">
                        <span class="um-access-icon ${allowed ? 'allowed' : 'denied'}" aria-hidden="true">
                            <i class="ti ${allowed ? 'ti-check' : 'ti-x'}"></i>
                        </span>
                        ${page.label}
                    </li>
                `;
            }).join('');

            return `
                <div class="um-menu-section">
                    <div class="um-menu-section-head">
                        <i class="ti ${group.icon}" aria-hidden="true"></i>
                        ${group.section}
                    </div>
                    <ul class="um-menu-pages">${items}</ul>
                </div>
            `;
        }).join('');
    }

    function renderUsersTable() {
        usersBody.innerHTML = USERS.map(user => {
            const role = roleMap[user.roleId];
            return `
                <tr data-user-id="${user.id}" data-role-id="${user.roleId}" class="${user.id === selectedUserId ? 'selected' : ''}">
                    <td>
                        <div class="um-user-cell">
                            <div class="um-user-avatar">${initials(user.name)}</div>
                            <div>
                                <span class="um-user-name">${user.name}</span>
                                <span class="um-user-email">${user.email}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="um-badge ${role.badgeClass}">${role.name}</span></td>
                    <td><span class="um-badge status-${user.status}">${user.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                    <td>${user.lastLogin}</td>
                    <td>
                        <button class="edit-btn um-edit-btn" type="button" data-user-id="${user.id}">Düzenle</button>
                    </td>
                </tr>
            `;
        }).join('');

        usersBody.querySelectorAll('tr[data-user-id]').forEach(row => {
            row.addEventListener('click', e => {
                if (e.target.closest('.um-edit-btn')) return;
                selectedUserId = Number(row.dataset.userId);
                selectedRoleId = row.dataset.roleId;
                renderUsersTable();
                renderRoleCards();
                renderAccessPanel();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderRoleCards();
        renderUsersTable();
        renderAccessPanel();
    });
})();
