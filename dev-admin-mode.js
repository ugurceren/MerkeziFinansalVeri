(function () {
    const STORAGE_KEY = 'devAdminMode';
    const ADMIN_USER_ID = 5124;
    const DEV_ENVIRONMENTS = new Set(['Geliştirme', 'Development', 'Dev']);

    function isDevEnvironment() {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return true;
        }
        const env = window.StatusBarInfo?.environment || document.querySelector('.status-env')?.textContent?.trim();
        return DEV_ENVIRONMENTS.has(env || '');
    }

    function isAdminMode() {
        if (!isDevEnvironment()) return false;

        const params = new URLSearchParams(location.search);
        if (params.get('admin') === '1') return true;
        if (params.get('admin') === '0') return false;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === '0') return false;
        if (stored === '1') return true;

        return true;
    }

    function setAdminMode(active) {
        localStorage.setItem(STORAGE_KEY, active ? '1' : '0');
    }

    window.DevAdminMode = {
        isActive: isAdminMode,
        setActive: setAdminMode,
        isDevEnvironment,
        ADMIN_USER_ID
    };
})();
