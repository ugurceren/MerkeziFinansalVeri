function initUserBar() {
    const userName = localStorage.getItem('userName') || 'Ahmet Yılmaz';
    const tbUser = document.getElementById('tbUser');
    const tbAvatar = document.getElementById('tbAvatar');
    if (tbUser) tbUser.textContent = userName;
    if (tbAvatar) {
        tbAvatar.textContent = userName.split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'K';
    }
    return userName;
}

function activateRibbonSection(section) {
    const map = {
        GENEL: 'genel',
        'SÜREÇ': 'surec',
        MUTABAKAT: 'mutabakat',
        RAPORLAMA: 'raporlama',
        AYARLAR: 'ayarlar',
        'YÖNETİM': 'yonetim'
    };
    const tabId = map[section];
    if (!tabId) return;
    document.querySelectorAll('.rtab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-' + tabId);
    });
}

function initRibbonNav() {
    document.querySelectorAll('.rtab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    document.querySelectorAll('.rbtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const href = btn.dataset.href;
            if (href) {
                window.location.href = href;
                return;
            }

            const page = btn.dataset.page;
            const section = btn.dataset.section;
            if (!page) return;

            document.querySelectorAll('.rbtn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (section) activateRibbonSection(section);

            if (typeof window.handleRibbonPage === 'function') {
                window.handleRibbonPage(section, page, btn);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initUserBar();
    initThemeMenu();
    initRibbonNav();
});
