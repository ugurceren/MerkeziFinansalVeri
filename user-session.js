(function () {
    const DEFAULT_USER_ID = 5124;
    const STALE_NAMES = new Set(['Kullanıcı', 'Ahmet Yılmaz', '']);

    function initials(name) {
        return String(name || '')
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'K';
    }

    function syncUserDisplay(user) {
        const name = user.ad || 'Kullanıcı';
        const init = initials(name);

        localStorage.setItem('currentUserId', String(user.kullaniciId));
        localStorage.setItem('userName', name);
        localStorage.setItem('userRole', user.rolId || '');
        if (user.kullaniciKodu) {
            localStorage.setItem('userCode', user.kullaniciKodu);
        }

        document.querySelectorAll('#tbUser, #statusUserName, #userName, #headerTbUser').forEach(el => {
            el.textContent = name;
        });
        document.querySelectorAll('#tbAvatar, .status-avatar, #userAvatar, #headerTbAvatar').forEach(el => {
            el.textContent = init;
        });

        if (typeof window.syncStatusUser === 'function') {
            window.syncStatusUser(name);
        }
    }

    async function loadUserFromApi() {
        const userId = window.DevAdminMode?.isActive?.()
            ? window.DevAdminMode.ADMIN_USER_ID
            : (ApiClient?.userId || DEFAULT_USER_ID);
        try {
            const user = await ApiClient.getKullanici(userId);
            if (!user || user.durum !== 'active') {
                console.warn('Kullanıcı bulunamadı veya pasif:', userId);
                return null;
            }
            syncUserDisplay(user);
            return user;
        } catch (err) {
            console.warn('Kullanıcı oturumu yüklenemedi:', err);
            const cachedName = localStorage.getItem('userName');
            if (!cachedName || STALE_NAMES.has(cachedName)) {
                localStorage.setItem('userName', 'Uğur Çeren');
                localStorage.setItem('userRole', 'admin');
                localStorage.setItem('currentUserId', String(DEFAULT_USER_ID));
            }
            syncUserDisplay({
                kullaniciId: parseInt(localStorage.getItem('currentUserId') || String(DEFAULT_USER_ID), 10),
                ad: localStorage.getItem('userName') || 'Uğur Çeren',
                rolId: localStorage.getItem('userRole') || 'admin'
            });
            return null;
        }
    }

    window.UserSession = {
        load: loadUserFromApi,
        syncUserDisplay,
        initials
    };

    document.addEventListener('DOMContentLoaded', async () => {
        await loadUserFromApi();
        document.dispatchEvent(new Event('user-session-ready'));
    });
})();
