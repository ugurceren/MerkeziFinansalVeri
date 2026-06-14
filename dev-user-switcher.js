(function () {
    const DEV_ENVIRONMENTS = new Set(['Geliştirme', 'Development', 'Dev']);

    function isDevEnvironment() {
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

    async function initDevUserSwitcher() {
        if (!isDevEnvironment() || !window.ApiClient) return;

        const userSection = document.querySelector('.status-bar-user');
        if (!userSection || document.getElementById('devUserSwitcher')) return;

        const wrap = document.createElement('div');
        wrap.className = 'dev-user-switcher-wrap';
        wrap.innerHTML = `
            <label class="dev-user-switcher-label" for="devUserSwitcher">Gözünden gör</label>
            <select id="devUserSwitcher" class="dev-user-switcher" title="Geliştirme: seçilen kullanıcının yetkileriyle görüntüle">
                <option value="">Yükleniyor…</option>
            </select>`;
        userSection.appendChild(wrap);

        const select = wrap.querySelector('#devUserSwitcher');
        const currentId = String(ApiClient.userId);

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
