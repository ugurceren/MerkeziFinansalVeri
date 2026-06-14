// Tema seçimi — theme-toggle.js (initThemeMenu)
function initThemeToggleFromScript() {
    if (typeof initThemeMenu === 'function') initThemeMenu();
}

// Kullanıcı adı — user-session.js ribbon sayfalarında DB'den yükler
function initUserName() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');
    if (!userNameElement || !userAvatarElement) return;

    let userName = localStorage.getItem('userName');
    if (!userName || userName === 'Kullanıcı') {
        userName = 'Uğur Çeren';
        localStorage.setItem('userName', userName);
    }

    userNameElement.textContent = userName;

    const initials = userName.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    userAvatarElement.textContent = initials || 'K';

    const headerUser = document.getElementById('headerTbUser');
    const headerAvatar = document.getElementById('headerTbAvatar');
    if (headerUser) headerUser.textContent = userName;
    if (headerAvatar) headerAvatar.textContent = initials || 'K';

    return userName;
}

// Sidebar toggle işlevselliği
function initSidebarToggle() {
    const sidebarToggleBtn = document.getElementById('sidebarToggle');
    const appShell = document.querySelector('.app-shell');
    if (!sidebarToggleBtn || !appShell) return;

    sidebarToggleBtn.addEventListener('click', function() {
        appShell.classList.toggle('sidebar-collapsed');
    });
}

// Menü bölümlerini aç/kapat
function initSidebarSections() {
    document.querySelectorAll('.sidebar-section').forEach(section => {
        const titleBtn = section.querySelector('.section-title');
        if (!titleBtn) return;

        titleBtn.addEventListener('click', function() {
            const isCollapsed = section.classList.toggle('collapsed');
            titleBtn.setAttribute('aria-expanded', String(!isCollapsed));
        });
    });
}

// Menü navigasyon — yalnızca aynı sayfa içi (#) linkler için
function initSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#') return;

            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const section = this.getAttribute('data-section');
            const page = this.getAttribute('data-page');
            const breadcrumbSection = document.getElementById('breadcrumbSection');
            const breadcrumbPage = document.getElementById('breadcrumbPage');
            const pageTitle = document.getElementById('pageTitle');

            if (breadcrumbSection) breadcrumbSection.textContent = section;
            if (breadcrumbPage) breadcrumbPage.textContent = page;
            if (pageTitle) pageTitle.textContent = page;
        });
    });
}

// Dashboard — Genel Bakış ana ekran
function initDashboard() {
    const greetingEl = document.getElementById('dashboardGreeting');
    const dateEl = document.getElementById('dashboardDate');
    if (!greetingEl && !dateEl) return;

    const userName = localStorage.getItem('userName') || 'Kullanıcı';
    const firstName = userName.split(' ')[0];

    if (greetingEl) {
        greetingEl.textContent = `Hoş geldiniz, ${firstName}`;
    }

    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

// Kebir hesapları sayfası — tablo işlemleri (inline script yoksa yedek)
function initAccountsPage() {
    const filterBtn = document.getElementById('filterBtn');
    const accountsTableEl = document.getElementById('accountsTable');
    const addBtn = document.getElementById('addBtn');

    if (!accountsTableEl || !filterBtn || accountsTableEl.dataset.inlineInit === 'true') return;

    const filterNameInput = document.getElementById('filterNameInput');
    const filterTeamInput = document.getElementById('filterTeamInput');
    const filterIdMin = document.getElementById('filterIdMin');
    const filterIdMax = document.getElementById('filterIdMax');
    const accountsTable = accountsTableEl.getElementsByTagName('tbody')[0];

    filterBtn.addEventListener('click', function() {
        const filterName = filterNameInput.value.toLowerCase();
        const filterTeam = filterTeamInput.value.toLowerCase();
        const minId = filterIdMin.value ? parseInt(filterIdMin.value) : null;
        const maxId = filterIdMax.value ? parseInt(filterIdMax.value) : null;
        const rows = accountsTable.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].getElementsByTagName('td');
            const accountId = parseInt(cells[1].textContent);
            const accountName = cells[2].textContent.toLowerCase();
            const accountTeam = cells[3].textContent.toLowerCase();
            let match = true;

            if (filterName && !accountName.includes(filterName)) match = false;
            if (filterTeam && !accountTeam.includes(filterTeam)) match = false;
            if (minId !== null && accountId < minId) match = false;
            if (maxId !== null && accountId > maxId) match = false;

            rows[i].style.display = match ? '' : 'none';
        }
    });

    [filterNameInput, filterTeamInput, filterIdMin, filterIdMax].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') filterBtn.click();
        });
    });

    if (addBtn) {
        addBtn.addEventListener('click', function() {
            const newRow = accountsTable.insertRow();
            const nextId = accountsTable.rows.length;

            newRow.insertCell(0).textContent = nextId;
            newRow.insertCell(1).textContent = nextId;
            newRow.insertCell(2).textContent = `Yeni Kurumsal Hesap ${nextId}`;
            newRow.insertCell(3).textContent = 'Yeni Ekip';
            newRow.insertCell(4).textContent = '-';
            newRow.insertCell(5).textContent = 'Sistem';
            newRow.insertCell(6).textContent = new Date().toISOString().split('T')[0];
            newRow.insertCell(7).textContent = new Date().toISOString().split('T')[0];
            newRow.insertCell(8).textContent = document.getElementById('userName').textContent;
            newRow.insertCell(9).textContent = '-';

            const actionsCell = newRow.insertCell(10);
            actionsCell.innerHTML = '<button class="table-btn edit-btn">Düzenle</button> <button class="table-btn delete-btn">Sil</button>';
            actionsCell.querySelector('.delete-btn').addEventListener('click', function() {
                accountsTable.deleteRow(newRow.rowIndex - 1);
            });
        });
    }

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('tr').remove();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initThemeToggleFromScript();
    initUserName();
    initSidebarToggle();
    initSidebarSections();
    initSidebarNavigation();
    initDashboard();
    initAccountsPage();
});
