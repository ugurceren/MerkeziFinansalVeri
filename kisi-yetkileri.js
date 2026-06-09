(function () {
    const { PAGE_MENU, userInitials } = window.KullaniciShared;

    let USERS = [];
    let roleMap = {};
    let userOverrides = {};
    let selectedUserId = 9;
    let searchQuery = '';
    let saveHintTimer = null;

    const userListEl = document.getElementById('kyUserList');
    const searchEl = document.getElementById('kyUserSearch');
    const permTitleEl = document.getElementById('kyPermTitle');
    const permDescEl = document.getElementById('kyPermDesc');
    const permBadgesEl = document.getElementById('kyPermBadges');
    const treeEl = document.getElementById('kyPermTree');
    const saveHintEl = document.getElementById('kySaveHint');

    async function loadUsers() {
        try {
            const [users, roles] = await Promise.all([
                ApiClient.getKullanicilar(),
                ApiClient.getRoller()
            ]);
            USERS = users;
            roleMap = Object.fromEntries(roles.map(r => [r.rolId, {
                id: r.rolId,
                name: r.ad,
                badgeClass: r.rozetSinifi
            }]));
            if (USERS.length && !USERS.find(u => u.kullaniciId === selectedUserId)) {
                selectedUserId = USERS[0].kullaniciId;
            }
        } catch (err) {
            console.error('Kullanıcılar yüklenemedi:', err);
            USERS = window.KullaniciShared?.USERS || [];
            roleMap = window.KullaniciShared?.roleMap || {};
        }
    }

    function getUser(userId) {
        return USERS.find(u => u.kullaniciId === userId);
    }

    function hasCustomPermissions(userId) {
        return Object.prototype.hasOwnProperty.call(userOverrides, userId);
    }

    function getEffectivePages(userId) {
        if (hasCustomPermissions(userId)) {
            return new Set(userOverrides[userId]);
        }
        return new Set();
    }

    async function loadEffectivePages(userId) {
        try {
            const yetkiler = await ApiClient.getKullaniciYetkiler(userId);
            return new Set(yetkiler.filter(y => y.izinVerildi).map(y => y.sayfaId));
        } catch (err) {
            console.error('Yetkiler yüklenemedi:', err);
            return new Set();
        }
    }

    async function getRoleDefaultPages(userId) {
        const user = getUser(userId);
        if (!user) return new Set();
        try {
            const yetkiler = await ApiClient.getRolYetkiler(user.rolId);
            return new Set(yetkiler.filter(y => y.izinVerildi && y.rolVarsayilan).map(y => y.sayfaId));
        } catch {
            return new Set();
        }
    }

    function filterUsers() {
        const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
        if (!q) return USERS;
        return USERS.filter(u =>
            u.ad.toLocaleLowerCase('tr-TR').includes(q) ||
            u.eposta.toLocaleLowerCase('tr-TR').includes(q) ||
            (roleMap[u.rolId]?.name || '').toLocaleLowerCase('tr-TR').includes(q)
        );
    }

    function renderUserList() {
        const users = filterUsers();
        if (!users.length) {
            userListEl.innerHTML = '<li class="ky-empty">Arama kriterine uygun kullanıcı bulunamadı.</li>';
            return;
        }

        userListEl.innerHTML = users.map(user => {
            const role = roleMap[user.rolId];
            const custom = hasCustomPermissions(user.kullaniciId);
            return `
                <li>
                    <button type="button" class="ky-user-item${user.kullaniciId === selectedUserId ? ' active' : ''}" data-user-id="${user.kullaniciId}">
                        <div class="um-user-avatar">${userInitials(user.ad)}</div>
                        <div class="ky-user-meta">
                            <strong>${user.ad}</strong>
                            <span>${user.eposta}</span>
                        </div>
                        <span class="um-badge ${role?.badgeClass || ''}">${role?.name || user.rolId}</span>
                        ${custom ? '<span class="ky-custom-badge">Özel</span>' : ''}
                    </button>
                </li>
            `;
        }).join('');

        userListEl.querySelectorAll('.ky-user-item').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedUserId = Number(btn.dataset.userId);
                renderUserList();
                renderPermissionPanel();
            });
        });
    }

    function sectionCheckState(sectionPages, effective) {
        const allowed = sectionPages.filter(id => effective.has(id)).length;
        if (allowed === 0) return { checked: false, indeterminate: false };
        if (allowed === sectionPages.length) return { checked: true, indeterminate: false };
        return { checked: false, indeterminate: true };
    }

    async function renderPermissionPanel() {
        const user = getUser(selectedUserId);
        if (!user) return;

        const role = roleMap[user.rolId];
        const effective = hasCustomPermissions(user.kullaniciId)
            ? getEffectivePages(user.kullaniciId)
            : await loadEffectivePages(user.kullaniciId);
        const roleDefault = await getRoleDefaultPages(user.kullaniciId);
        const custom = hasCustomPermissions(user.kullaniciId);
        const allowedCount = PAGE_MENU.flatMap(g => g.pages).filter(p => effective.has(p.id)).length;
        const totalCount = PAGE_MENU.flatMap(g => g.pages).length;

        permTitleEl.textContent = user.ad;
        permDescEl.textContent = `${role?.name || user.rolId} rolü · ${allowedCount}/${totalCount} sayfa erişimi`;
        permBadgesEl.innerHTML = `
            <span class="um-badge ${role?.badgeClass || ''}">${role?.name || user.rolId}</span>
            <span class="um-badge status-${user.durum}">${user.durum === 'active' ? 'Aktif' : 'Pasif'}</span>
            ${custom ? '<span class="ky-custom-badge">Kişiye özel yetki</span>' : '<span class="ky-custom-badge" style="opacity:0.5;background:var(--rb-accent-soft);color:var(--rb-text-muted)">Rol varsayılanı</span>'}
        `;

        treeEl.innerHTML = PAGE_MENU.map(group => {
            const sectionIds = group.pages.map(p => p.id);
            const check = sectionCheckState(sectionIds, effective);
            const sectionKey = group.section.replace(/\s+/g, '-').toLowerCase();

            const leaves = group.pages.map(page => {
                const isAllowed = effective.has(page.id);
                const isRoleDefault = roleDefault.has(page.id);
                const isCustom = custom && isAllowed !== isRoleDefault;
                return `
                    <label class="ky-tree-leaf${isCustom ? ' is-custom' : ''}">
                        <input type="checkbox" data-page-id="${page.id}" ${isAllowed ? 'checked' : ''}>
                        <span>${page.label}</span>
                    </label>
                `;
            }).join('');

            return `
                <div class="ky-tree-section expanded" data-section="${sectionKey}">
                    <div class="ky-tree-section-head">
                        <button type="button" class="ky-tree-toggle" aria-label="Aç/kapat">
                            <i class="ti ti-chevron-down"></i>
                        </button>
                        <label class="ky-tree-section-label">
                            <input type="checkbox" data-section-ids="${sectionIds.join(',')}" ${check.checked ? 'checked' : ''}>
                            <i class="ti ${group.icon}"></i>
                            <span>${group.section}</span>
                        </label>
                    </div>
                    <div class="ky-tree-children">${leaves}</div>
                </div>
            `;
        }).join('');

        treeEl.querySelectorAll('.ky-tree-section').forEach(section => {
            section.querySelector('.ky-tree-toggle').addEventListener('click', () => {
                section.classList.toggle('collapsed');
                section.classList.toggle('expanded');
            });
        });

        treeEl.querySelectorAll('[data-section-ids]').forEach(input => {
            const ids = input.dataset.sectionIds.split(',');
            const check = sectionCheckState(ids, effective);
            input.indeterminate = check.indeterminate;
            input.addEventListener('change', () => {
                setPagePermissions(selectedUserId, ids, input.checked);
            });
        });

        treeEl.querySelectorAll('[data-page-id]').forEach(input => {
            input.addEventListener('change', () => {
                togglePagePermission(selectedUserId, input.dataset.pageId, input.checked);
            });
        });
    }

    async function ensureOverrideSet(userId) {
        if (!hasCustomPermissions(userId)) {
            const effective = await loadEffectivePages(userId);
            userOverrides[userId] = [...effective];
        }
        return new Set(userOverrides[userId]);
    }

    async function togglePagePermission(userId, pageId, allowed) {
        const set = await ensureOverrideSet(userId);
        if (allowed) set.add(pageId);
        else set.delete(pageId);
        userOverrides[userId] = [...set];
        renderUserList();
        renderPermissionPanel();
        showSaveHint(false);
    }

    async function setPagePermissions(userId, pageIds, allowed) {
        const set = await ensureOverrideSet(userId);
        pageIds.forEach(id => {
            if (allowed) set.add(id);
            else set.delete(id);
        });
        userOverrides[userId] = [...set];
        renderUserList();
        renderPermissionPanel();
        showSaveHint(false);
    }

    async function resetToRoleDefault() {
        delete userOverrides[selectedUserId];
        try {
            await ApiClient.sifirlaKullaniciYetkiler(selectedUserId);
        } catch (err) {
            console.error('Yetki sıfırlama başarısız:', err);
        }
        renderUserList();
        renderPermissionPanel();
        showSaveHint(false);
    }

    function expandAll(expand) {
        treeEl.querySelectorAll('.ky-tree-section').forEach(section => {
            section.classList.toggle('collapsed', !expand);
            section.classList.toggle('expanded', expand);
        });
    }

    function showSaveHint(saved) {
        if (!saveHintEl) return;
        clearTimeout(saveHintTimer);
        saveHintEl.textContent = saved
            ? 'Yetkiler kaydedildi.'
            : 'Kaydedilmemiş değişiklikler var.';
        saveHintEl.classList.toggle('saved', saved);
        if (saved) {
            saveHintTimer = setTimeout(() => {
                saveHintEl.textContent = '';
                saveHintEl.classList.remove('saved');
            }, 2500);
        }
    }

    function bindToolbar() {
        document.getElementById('kyExpandAll')?.addEventListener('click', () => expandAll(true));
        document.getElementById('kyCollapseAll')?.addEventListener('click', () => expandAll(false));
        document.getElementById('kyResetRole')?.addEventListener('click', resetToRoleDefault);
        document.getElementById('kySaveBtn')?.addEventListener('click', async () => {
            if (!hasCustomPermissions(selectedUserId)) {
                showSaveHint(true);
                return;
            }
            try {
                const yetkiler = userOverrides[selectedUserId].map(sayfaId => ({
                    sayfaId,
                    izinVerildi: true
                }));
                const allPages = PAGE_MENU.flatMap(g => g.pages.map(p => p.id));
                allPages.forEach(sayfaId => {
                    if (!userOverrides[selectedUserId].includes(sayfaId)) {
                        yetkiler.push({ sayfaId, izinVerildi: false });
                    }
                });
                await ApiClient.updateKullaniciYetkiler(selectedUserId, yetkiler);
                showSaveHint(true);
            } catch (err) {
                alert('Kaydetme başarısız: ' + err.message);
            }
        });

        searchEl?.addEventListener('input', () => {
            searchQuery = searchEl.value;
            renderUserList();
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        bindToolbar();
        await loadUsers();
        renderUserList();
        await renderPermissionPanel();
    });
})();
