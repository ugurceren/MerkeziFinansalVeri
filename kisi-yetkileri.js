(function () {
    const { PAGE_MENU, USERS, roleMap, userInitials, getRolePages } = window.KullaniciShared;

    const userOverrides = {};
    let selectedUserId = USERS[0]?.id || 1;
    let searchQuery = '';
    let saveHintTimer = null;

    const userListEl = document.getElementById('kyUserList');
    const searchEl = document.getElementById('kyUserSearch');
    const permTitleEl = document.getElementById('kyPermTitle');
    const permDescEl = document.getElementById('kyPermDesc');
    const permBadgesEl = document.getElementById('kyPermBadges');
    const treeEl = document.getElementById('kyPermTree');
    const saveHintEl = document.getElementById('kySaveHint');

    function getUser(userId) {
        return USERS.find(u => u.id === userId);
    }

    function hasCustomPermissions(userId) {
        return Object.prototype.hasOwnProperty.call(userOverrides, userId);
    }

    function getEffectivePages(userId) {
        if (hasCustomPermissions(userId)) {
            return new Set(userOverrides[userId]);
        }
        const user = getUser(userId);
        return new Set(getRolePages(user?.roleId));
    }

    function getRoleDefaultPages(userId) {
        const user = getUser(userId);
        return new Set(getRolePages(user?.roleId));
    }

    function filterUsers() {
        const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
        if (!q) return USERS;
        return USERS.filter(u =>
            u.name.toLocaleLowerCase('tr-TR').includes(q) ||
            u.email.toLocaleLowerCase('tr-TR').includes(q) ||
            (roleMap[u.roleId]?.name || '').toLocaleLowerCase('tr-TR').includes(q)
        );
    }

    function renderUserList() {
        const users = filterUsers();
        if (!users.length) {
            userListEl.innerHTML = '<li class="ky-empty">Arama kriterine uygun kullanıcı bulunamadı.</li>';
            return;
        }

        userListEl.innerHTML = users.map(user => {
            const role = roleMap[user.roleId];
            const custom = hasCustomPermissions(user.id);
            return `
                <li>
                    <button type="button" class="ky-user-item${user.id === selectedUserId ? ' active' : ''}" data-user-id="${user.id}">
                        <div class="um-user-avatar">${userInitials(user.name)}</div>
                        <div class="ky-user-meta">
                            <strong>${user.name}</strong>
                            <span>${user.email}</span>
                        </div>
                        <span class="um-badge ${role.badgeClass}">${role.name}</span>
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

    function renderPermissionPanel() {
        const user = getUser(selectedUserId);
        if (!user) return;

        const role = roleMap[user.roleId];
        const effective = getEffectivePages(user.id);
        const custom = hasCustomPermissions(user.id);
        const allowedCount = PAGE_MENU.flatMap(g => g.pages).filter(p => effective.has(p.id)).length;
        const totalCount = PAGE_MENU.flatMap(g => g.pages).length;

        permTitleEl.textContent = user.name;
        permDescEl.textContent = `${role.name} rolü · ${allowedCount}/${totalCount} sayfa erişimi`;
        permBadgesEl.innerHTML = `
            <span class="um-badge ${role.badgeClass}">${role.name}</span>
            <span class="um-badge status-${user.status}">${user.status === 'active' ? 'Aktif' : 'Pasif'}</span>
            ${custom ? '<span class="ky-custom-badge">Kişiye özel yetki</span>' : '<span class="ky-custom-badge" style="opacity:0.5;background:var(--rb-accent-soft);color:var(--rb-text-muted)">Rol varsayılanı</span>'}
        `;

        treeEl.innerHTML = PAGE_MENU.map(group => {
            const sectionIds = group.pages.map(p => p.id);
            const check = sectionCheckState(sectionIds, effective);
            const sectionKey = group.section.replace(/\s+/g, '-').toLowerCase();

            const leaves = group.pages.map(page => {
                const isAllowed = effective.has(page.id);
                const roleDefault = getRoleDefaultPages(user.id).has(page.id);
                const isCustom = custom && isAllowed !== roleDefault;
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
            const toggle = section.querySelector('.ky-tree-toggle');
            toggle.addEventListener('click', () => {
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

    function ensureOverrideSet(userId) {
        if (!hasCustomPermissions(userId)) {
            userOverrides[userId] = [...getEffectivePages(userId)];
        }
        return new Set(userOverrides[userId]);
    }

    function togglePagePermission(userId, pageId, allowed) {
        const set = ensureOverrideSet(userId);
        if (allowed) set.add(pageId);
        else set.delete(pageId);
        userOverrides[userId] = [...set];
        renderUserList();
        renderPermissionPanel();
        showSaveHint(false);
    }

    function setPagePermissions(userId, pageIds, allowed) {
        const set = ensureOverrideSet(userId);
        pageIds.forEach(id => {
            if (allowed) set.add(id);
            else set.delete(id);
        });
        userOverrides[userId] = [...set];
        renderUserList();
        renderPermissionPanel();
        showSaveHint(false);
    }

    function resetToRoleDefault() {
        delete userOverrides[selectedUserId];
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
        document.getElementById('kySaveBtn')?.addEventListener('click', () => showSaveHint(true));

        searchEl?.addEventListener('input', () => {
            searchQuery = searchEl.value;
            renderUserList();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindToolbar();
        renderUserList();
        renderPermissionPanel();
    });
})();
