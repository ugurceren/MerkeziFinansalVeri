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
    let usersSmartTable = null;
    let usersTableActionsBound = false;

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

    function bindUsersTableActions() {
        if (!usersBody || usersTableActionsBound) return;
        usersTableActionsBound = true;
        usersBody.addEventListener('click', e => {
            const editBtn = e.target.closest('.um-edit-btn');
            if (!editBtn) return;
            e.stopPropagation();
        });
    }

    function mountUsersSmartTable() {
        if (!usersBody) return;

        if (!window.SmartTable) {
            usersBody.innerHTML = USERS.map(user => {
                const role = roleMap[user.rolId];
                const lastLogin = user.sonGiris
                    ? new Date(user.sonGiris).toLocaleString('tr-TR')
                    : '—';
                return `
                    <tr data-user-id="${user.kullaniciId}" data-role-id="${user.rolId}" class="${user.kullaniciId === selectedUserId ? 'selected' : ''}">
                        <td>${user.ad}</td>
                        <td>${role?.name || user.rolId}</td>
                        <td>${user.durum}</td>
                        <td>${lastLogin}</td>
                        <td><button class="edit-btn um-edit-btn" type="button">Düzenle</button></td>
                    </tr>`;
            }).join('');
            return;
        }

        const table = document.getElementById('usersTable');
        if (!table) return;
        window.SmartTable.destroy(table);

        usersSmartTable = window.SmartTable.mount({
            scrollEl: table.closest('.table-scroll'),
            headEl: table.querySelector('thead'),
            bodyEl: usersBody,
            cols: [
                { key: 'user', label: 'Kullanıcı' },
                { key: 'rolId', label: 'Rol' },
                { key: 'durum', label: 'Durum' },
                { key: 'sonGiris', label: 'Son Giriş' },
                { key: 'actions', label: 'İşlemler' }
            ],
            rows: USERS,
            wrapCells: true,
            tableClass: 'vs-results-table vs-results-table--wrap',
            getValue: (user, col) => {
                if (col === 'user') return user.ad;
                if (col === 'rolId') return roleMap[user.rolId]?.name || user.rolId;
                if (col === 'durum') return user.durum === 'active' ? 'Aktif' : 'Pasif';
                if (col === 'sonGiris') {
                    return user.sonGiris ? new Date(user.sonGiris).toLocaleString('tr-TR') : '—';
                }
                return '';
            },
            formatCell: (col, user) => {
                const role = roleMap[user.rolId];
                const lastLogin = user.sonGiris
                    ? new Date(user.sonGiris).toLocaleString('tr-TR')
                    : '—';
                if (col === 'user') {
                    return `<td>
                        <div class="um-user-cell">
                            <div class="um-user-avatar">${userInitials(user.ad)}</div>
                            <div>
                                <span class="um-user-name">${user.ad}</span>
                                <span class="um-user-email">${user.eposta}</span>
                            </div>
                        </div>
                    </td>`;
                }
                if (col === 'rolId') {
                    return `<td><span class="um-badge ${role?.badgeClass || ''}">${role?.name || user.rolId}</span></td>`;
                }
                if (col === 'durum') {
                    return `<td><span class="um-badge status-${user.durum}">${user.durum === 'active' ? 'Aktif' : 'Pasif'}</span></td>`;
                }
                if (col === 'sonGiris') return `<td>${lastLogin}</td>`;
                if (col === 'actions') {
                    return `<td><button class="edit-btn um-edit-btn" type="button" data-user-id="${user.kullaniciId}">Düzenle</button></td>`;
                }
                return null;
            },
            rowClass: user => (user.kullaniciId === selectedUserId ? 'selected' : ''),
            rowAttrs: user => ({
                'data-user-id': user.kullaniciId,
                'data-role-id': user.rolId
            }),
            onRowClick: (user, rowEl, event) => {
                if (event.target.closest('.um-edit-btn')) return;
                selectedUserId = user.kullaniciId;
                selectedRoleId = user.rolId;
                mountUsersSmartTable();
                renderRoleCards();
                renderAccessPanel();
            }
        });

        bindUsersTableActions();
    }

    function renderUsersTable() {
        mountUsersSmartTable();
    }

    /* -- Yeni kullanıcı penceresi → POST /api/kullanicilar (VIB.sec_User) -- */

    const userModal = document.getElementById('umUserModal');
    const userForm = document.getElementById('umUserForm');
    let lastFocusBeforeModal = null;

    function setUserFormMessage(message) {
        const el = document.getElementById('umUserFormMsg');
        if (!el) return;
        el.hidden = !message;
        el.textContent = message || '';
    }

    function openUserModal() {
        if (!userModal || !userForm) return;
        userForm.reset();
        const roleSelect = userForm.elements.rolId;
        // API yanıtı rolId/ad, çevrimdışı yedek (KullaniciShared) id/name kullanır
        roleSelect.innerHTML = ROLES.map(r => `<option value="${r.rolId ?? r.id}">${r.ad ?? r.name}</option>`).join('');
        // Varsayılan rol, sağ panelde seçili olan rol
        if (ROLES.some(r => (r.rolId ?? r.id) === selectedRoleId)) roleSelect.value = selectedRoleId;
        setUserFormMessage('');
        lastFocusBeforeModal = document.activeElement;
        userModal.hidden = false;
        userForm.elements.kullaniciKodu.focus();
    }

    function closeUserModal() {
        if (!userModal || userModal.hidden) return;
        userModal.hidden = true;
        lastFocusBeforeModal?.focus?.();
    }

    function readUserForm() {
        const f = userForm.elements;
        const sicil = f.kullaniciId.value.trim();
        return {
            // Boş sicil no null gider; API otomatik numara atar
            kullaniciId: sicil ? Number(sicil) : null,
            kullaniciKodu: f.kullaniciKodu.value.trim(),
            ad: f.ad.value.trim(),
            eposta: f.eposta.value.trim(),
            rolId: f.rolId.value,
            durum: f.durum.value
        };
    }

    function validateUserForm(data) {
        if (data.kullaniciId !== null && (!Number.isInteger(data.kullaniciId) || data.kullaniciId <= 0)) {
            return 'Sicil no pozitif bir sayı olmalıdır; bilinmiyorsa boş bırakın.';
        }
        if (!data.kullaniciKodu || !data.ad || !data.eposta || !data.rolId) {
            return 'Tüm alanları doldurun.';
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.eposta)) return 'Geçerli bir e-posta adresi girin.';
        if (data.kullaniciId !== null && USERS.some(u => u.kullaniciId === data.kullaniciId)) {
            return `${data.kullaniciId} sicil numaralı kullanıcı zaten listede.`;
        }
        return '';
    }

    async function saveNewUser(event) {
        event.preventDefault();
        const data = readUserForm();
        const invalid = validateUserForm(data);
        if (invalid) {
            setUserFormMessage(invalid);
            return;
        }

        const saveBtn = document.getElementById('umUserSaveBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Kaydediliyor…';
        setUserFormMessage('');
        try {
            const created = await ApiClient.createKullanici(data);
            closeUserModal();
            await loadData();
            selectedUserId = created?.kullaniciId ?? data.kullaniciId ?? selectedUserId;
            selectedRoleId = created?.rolId ?? data.rolId;
            renderRoleCards();
            renderUsersTable();
            await renderAccessPanel();
        } catch (err) {
            const msg = err?.message || String(err);
            setUserFormMessage(msg.includes('Failed to fetch')
                ? `API'ye ulaşılamıyor. start-api.bat çalıştırın. Varsayılan: ${ApiClient.baseUrl}`
                : `Kullanıcı kaydedilemedi: ${msg}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Kaydet';
        }
    }

    function bindUserModal() {
        document.getElementById('umNewUserBtn')?.addEventListener('click', openUserModal);
        userModal?.querySelectorAll('[data-um-modal-close]').forEach(el => {
            el.addEventListener('click', closeUserModal);
        });
        userForm?.addEventListener('submit', saveNewUser);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeUserModal();
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        bindUserModal();
        await loadData();
        renderRoleCards();
        renderUsersTable();
        await renderAccessPanel();
    });
})();
