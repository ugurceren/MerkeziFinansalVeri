(function () {
    const DEV_ENVIRONMENTS = new Set(['Geliştirme', 'Development', 'Dev']);

    function isDevEnvironment() {
        if (window.DevAdminMode?.isDevEnvironment) {
            return window.DevAdminMode.isDevEnvironment();
        }
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return true;
        }
        const env = window.StatusBarInfo?.environment || document.querySelector('.status-env')?.textContent?.trim();
        return DEV_ENVIRONMENTS.has(env || '');
    }

    function formatOptionLabel(user) {
        const code = user.kullaniciKodu || '?';
        const role = user.rolId || '?';
        return `${user.ad} (${code} · ${role})`;
    }

    function bindAdminModeToggle(wrap) {
        const checkbox = wrap.querySelector('#devAdminMode');
        if (!checkbox || !window.DevAdminMode) return;

        checkbox.checked = DevAdminMode.isActive();
        checkbox.addEventListener('change', () => {
            DevAdminMode.setActive(checkbox.checked);
            location.reload();
        });
    }

    function updateSwitcherState(select, adminActive) {
        if (!select) return;
        select.disabled = adminActive;
        select.title = adminActive
            ? 'Admin modu açık — yetki testi için admin modunu kapatın'
            : 'Geliştirme: seçilen kullanıcının yetkileriyle görüntüle';
    }

    async function initDevUserSwitcher() {
        if (!isDevEnvironment()) return;

        const userSection = document.querySelector('.status-bar-user');
        if (!userSection || document.getElementById('devToolsWrap')) return;

        const adminActive = window.DevAdminMode?.isActive?.() ?? true;

        const wrap = document.createElement('div');
        wrap.className = 'dev-tools-wrap';
        wrap.id = 'devToolsWrap';
        wrap.innerHTML = `
            <label class="dev-admin-toggle" title="Açıkken tüm sayfalar ve API admin (5124) olarak çalışır">
                <input type="checkbox" id="devAdminMode"${adminActive ? ' checked' : ''}>
                <span>Admin modu</span>
            </label>
            <div class="dev-user-switcher-wrap" id="devUserSwitcherWrap">
                <label class="dev-user-switcher-label" for="devUserSwitcher">Gözünden gör</label>
                <select id="devUserSwitcher" class="dev-user-switcher">
                    <option value="">Yükleniyor…</option>
                </select>
            </div>`;
        userSection.appendChild(wrap);

        bindAdminModeToggle(wrap);

        const select = wrap.querySelector('#devUserSwitcher');
        updateSwitcherState(select, adminActive);

        if (!window.ApiClient) return;

        const currentId = String(localStorage.getItem('currentUserId') || ApiClient.userId);

        try {
            const users = await ApiClient.getKullanicilar();
            const active = (users || []).filter(u => u.durum === 'active');

            if (!active.length) {
                select.innerHTML = '<option value="">Kullanıcı yok</option>';
                select.disabled = true;
                return;
            }

            select.innerHTML = active
                .map(u => {
                    const id = String(u.kullaniciId);
                    const selected = id === currentId ? ' selected' : '';
                    return `<option value="${id}"${selected}>${formatOptionLabel(u)}</option>`;
                })
                .join('');

            updateSwitcherState(select, adminActive);

            select.addEventListener('change', () => {
                const nextId = select.value;
                if (!nextId || nextId === currentId) return;
                localStorage.setItem('currentUserId', nextId);
                location.reload();
            });
        } catch (err) {
            console.warn('Dev kullanıcı listesi yüklenemedi:', err);
            select.innerHTML = '<option value="">Liste alınamadı</option>';
            select.disabled = true;
        }
    }

    document.addEventListener('DOMContentLoaded', initDevUserSwitcher);
})();
