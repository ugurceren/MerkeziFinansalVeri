(function () {
    const { PAGE_MENU, userInitials } = window.KullaniciShared;

    const roleListEl = document.getElementById('roleList');
    const accessTitleEl = document.getElementById('accessTitle');
    const accessDescEl = document.getElementById('accessDesc');
    const accessMenuEl = document.getElementById('accessMenu');
    const usersBody = document.querySelector('#usersTable tbody');

    let ROLES = [];
    let USERS = [];
    let roleMap = {};
    let selectedRoleId = 'admin';
    let selectedUserId = 5124;

    async function loadData() {
        try {
            [ROLES, USERS] = await Promise.all([
                ApiClient.getRoller(),
                ApiClient.getKullanicilar()
            ]);
            roleMap = Object.fromEntries(ROLES.map(r => [r.rolId, {
                id: r.rolId,
                name: r.ad,
                desc: r.aciklama,
                badgeClass: r.rozetSinifi
            }]));
        } catch (err) {
            console.error('Kullanıcı verisi yüklenemedi:', err);
            ROLES = window.KullaniciShared?.ROLES || [];
            USERS = window.KullaniciShared?.USERS || [];
            roleMap = window.KullaniciShared?.roleMap || {};
        }
    }

    function countUsersForRole(roleId) {
        return USERS.filter(u => u.rolId === roleId).length;
    }

    function renderRoleCards() {
        roleListEl.innerHTML = ROLES.map(role => `
            <button type="button" class="um-role-card${role.rolId === selectedRoleId ? ' active' : ''}" data-role-id="${role.rolId}">
                <div class="um-role-card-head">
                    <strong>${role.ad}</strong>
                    <span class="um-role-count">${countUsersForRole(role.rolId)} kullanıcı</span>
                </div>
                <p>${role.aciklama || ''}</p>
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

    async function renderAccessPanel() {
        const role = roleMap[selectedRoleId];
        if (!role) return;

        const user = USERS.find(u => u.kullaniciId === selectedUserId);
        const viaUser = user && user.rolId === selectedRoleId;

        accessTitleEl.textContent = role.name;
        accessDescEl.textContent = viaUser && user
            ? `${user.ad} bu role sahip — erişebileceği sayfalar aşağıda listelenmiştir.`
            : `${role.desc || ''}. Bu role atanmış kullanıcılar aşağıdaki sayfalara erişebilir.`;

        let rolePages = [];
        try {
            const yetkiler = await ApiClient.getRolYetkiler(selectedRoleId);
            rolePages = yetkiler.filter(y => y.izinVerildi).map(y => y.sayfaId);
        } catch (err) {
            console.error('Rol yetkileri yüklenemedi:', err);
        }

        accessMenuEl.innerHTML = PAGE_MENU.map(group => {
            const items = group.pages.map(page => {
                const allowed = rolePages.includes(page.id);
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
            const role = roleMap[user.rolId];
            const lastLogin = user.sonGiris
                ? new Date(user.sonGiris).toLocaleString('tr-TR')
                : '—';
            return `
                <tr data-user-id="${user.kullaniciId}" data-role-id="${user.rolId}" class="${user.kullaniciId === selectedUserId ? 'selected' : ''}">
                    <td>
                        <div class="um-user-cell">
                            <div class="um-user-avatar">${userInitials(user.ad)}</div>
                            <div>
                                <span class="um-user-name">${user.ad}</span>
                                <span class="um-user-email">${user.eposta}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="um-badge ${role?.badgeClass || ''}">${role?.name || user.rolId}</span></td>
                    <td><span class="um-badge status-${user.durum}">${user.durum === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                    <td>${lastLogin}</td>
                    <td>
                        <button class="edit-btn um-edit-btn" type="button" data-user-id="${user.kullaniciId}">Düzenle</button>
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

    document.addEventListener('DOMContentLoaded', async () => {
        await loadData();
        renderRoleCards();
        renderUsersTable();
        await renderAccessPanel();
    });
})();
