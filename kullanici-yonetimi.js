(function () {
    const { PAGE_MENU, ROLES, USERS, roleMap, userInitials } = window.KullaniciShared;

    const roleListEl = document.getElementById('roleList');
    const accessTitleEl = document.getElementById('accessTitle');
    const accessDescEl = document.getElementById('accessDesc');
    const accessMenuEl = document.getElementById('accessMenu');
    const usersBody = document.querySelector('#usersTable tbody');

    let selectedRoleId = 'admin';
    let selectedUserId = 9;

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
                            <div class="um-user-avatar">${userInitials(user.name)}</div>
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
