// Tema değiştirme işlevselliği
function initThemeToggle() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;
    
    // Kaydedilen temayı yükle veya sistem tercihini kullan
    const savedTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.textContent = theme === 'dark' ? '◉ Light Mode' : '◉ Dark Mode';
}

// Kullanıcı adı yönetimi
function initUserName() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');
    
    // localStorage'dan kullanıcı adını oku
    let userName = localStorage.getItem('userName');
    
    // Eğer kullanıcı adı yoksa sor
    if (!userName) {
        userName = prompt('Lütfen adınızı girin:');
        
        // Eğer kullanıcı iptal ettiyse default değeri kullan
        if (!userName) {
            userName = 'Kullanıcı';
        }
        
        // Adı localStorage'a kaydet
        localStorage.setItem('userName', userName);
    }
    
    // Adı sayfada göster
    userNameElement.textContent = userName;
    
    // Avatar baş harflerini güncelle
    const initials = userName.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    userAvatarElement.textContent = initials || 'K';
}

// Sidebar toggle işlevselliği
function initSidebarToggle() {
    const sidebarToggleBtn = document.getElementById('sidebarToggle');
    const appShell = document.querySelector('.app-shell');
    
    sidebarToggleBtn.addEventListener('click', function() {
        appShell.classList.toggle('sidebar-collapsed');
    });
}

// Basit JavaScript işlevselliği
document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
    initUserName();
    initSidebarToggle();
    
    // Menü navigasyon işlevi
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Active sınıfını kaldır
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Tıklanan öğeye ekle
            this.classList.add('active');
            
            // Breadcrumb ve başlığı güncelle
            const section = this.getAttribute('data-section');
            const page = this.getAttribute('data-page');
            
            document.getElementById('breadcrumbSection').textContent = section;
            document.getElementById('breadcrumbPage').textContent = page;
            document.getElementById('pageTitle').textContent = page;
        });
    });
    
    const filterNameInput = document.getElementById('filterNameInput');
    const filterTeamInput = document.getElementById('filterTeamInput');
    const filterIdMin = document.getElementById('filterIdMin');
    const filterIdMax = document.getElementById('filterIdMax');
    const filterBtn = document.getElementById('filterBtn');
    const accountsTable = document.getElementById('accountsTable').getElementsByTagName('tbody')[0];
    const addBtn = document.getElementById('addBtn');

    // Filtreleme işlevi
    filterBtn.addEventListener('click', function() {
        const filterName = filterNameInput.value.toLowerCase();
        const filterTeam = filterTeamInput.value.toLowerCase();
        const minId = filterIdMin.value ? parseInt(filterIdMin.value) : null;
        const maxId = filterIdMax.value ? parseInt(filterIdMax.value) : null;
        
        const rows = accountsTable.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].getElementsByTagName('td');
            const accountId = parseInt(cells[0].textContent);
            const accountName = cells[1].textContent.toLowerCase();
            const accountTeam = cells[2].textContent.toLowerCase();
            
            let match = true;
            
            // Hesap adı filtresi
            if (filterName && !accountName.includes(filterName)) {
                match = false;
            }
            
            // Ekip filtresi
            if (filterTeam && !accountTeam.includes(filterTeam)) {
                match = false;
            }
            
            // Hesap ID aralığı filtresi
            if (minId !== null && accountId < minId) {
                match = false;
            }
            if (maxId !== null && accountId > maxId) {
                match = false;
            }
            
            rows[i].style.display = match ? '' : 'none';
        }
    });

    // Enter tuşu ile filtrele
    [filterNameInput, filterTeamInput, filterIdMin, filterIdMax].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterBtn.click();
            }
        });
    });

    // Yeni hesap ekleme (basit simülasyon)
    addBtn.addEventListener('click', function() {
        const newRow = accountsTable.insertRow();
        const idCell = newRow.insertCell(0);
        const nameCell = newRow.insertCell(1);
        const teamCell = newRow.insertCell(2);
        const actionsCell = newRow.insertCell(3);

        const nextId = accountsTable.rows.length;
        idCell.textContent = nextId;
        nameCell.textContent = `Yeni Kurumsal Hesap ${nextId}`;
        teamCell.textContent = 'Yeni Ekip';
        actionsCell.innerHTML = '<button class="edit-btn">Düzenle</button> <button class="delete-btn">Sil</button>';

        // Silme işlevi
        actionsCell.querySelector('.delete-btn').addEventListener('click', function() {
            accountsTable.deleteRow(newRow.rowIndex - 1);
        });
    });

    // Mevcut silme butonlarına işlev ekleme
    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            row.remove();
        });
    });
});