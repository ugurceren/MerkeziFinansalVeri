(function () {
    const APP_INFO = {
        name: 'Merkezi Güvenilir Finansal Veri',
        version: '1.0.0',
        environment: 'Geliştirme'
    };

    function getUserName() {
        return localStorage.getItem('userName') || 'Ahmet Yılmaz';
    }

    function getInitials(name) {
        return name.split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'K';
    }

    function buildStatusBar() {
        const userName = getUserName();
        const footer = document.createElement('footer');
        footer.className = 'status-bar';
        footer.setAttribute('role', 'contentinfo');
        footer.innerHTML = `
            <div class="status-bar-user">
                <span class="status-avatar" aria-hidden="true">${getInitials(userName)}</span>
                <span class="status-user-name" id="statusUserName">${userName}</span>
            </div>
            <div class="status-bar-app">${APP_INFO.name}</div>
            <div class="status-bar-about">
                <span>v${APP_INFO.version}</span>
                <span class="status-sep" aria-hidden="true">·</span>
                <span class="status-env">${APP_INFO.environment}</span>
            </div>`;
        return footer;
    }

    function syncStatusUser(name) {
        const el = document.getElementById('statusUserName');
        const avatar = document.querySelector('.status-avatar');
        if (el) el.textContent = name;
        if (avatar) avatar.textContent = getInitials(name);
    }

    function initStatusBar() {
        if (document.querySelector('.status-bar')) return;

        const footer = buildStatusBar();
        const app = document.querySelector('.app');
        const shell = document.querySelector('.app-shell');

        if (app) {
            app.appendChild(footer);
        } else if (shell) {
            shell.appendChild(footer);
        }
    }

    window.initStatusBar = initStatusBar;
    window.syncStatusUser = syncStatusUser;

    document.addEventListener('DOMContentLoaded', initStatusBar);
})();
