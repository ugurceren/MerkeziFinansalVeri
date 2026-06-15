(function () {
    const EDITABLE_COLS = [2, 3, 4, 5, 6, 8, 9];
    let accounts = [];
    let ekipMap = {};

    const filterNameInput = document.getElementById('filterNameInput');
    const filterTeamInput = document.getElementById('filterTeamInput');
    const filterIdMin = document.getElementById('filterIdMin');
    const filterIdMax = document.getElementById('filterIdMax');
    const filterBtn = document.getElementById('filterBtn');
    const accountsTable = document.getElementById('accountsTable');
    const tbody = accountsTable?.querySelector('tbody');
    const addBtn = document.getElementById('addBtn');

    function getUserName() {
        return localStorage.getItem('userName') || document.getElementById('tbUser')?.textContent.split('·')[0].trim() || 'Kullanıcı';
    }

    function formatDate(d) {
        if (!d) return '—';
        return String(d).split('T')[0];
    }

    function formatDateTime(d) {
        if (!d) return '—';
        return new Date(d).toLocaleString('tr-TR');
    }

    function resolveEkipId(ekipAdi) {
        const entry = Object.entries(ekipMap).find(([, ad]) => ad.toLowerCase() === ekipAdi.toLowerCase());
        return entry ? parseInt(entry[0], 10) : 1;
    }

    function buildRowHtml(row) {
        return `<tr data-hesap-no="${row.hesapNo}">
            <td>${row.hesapNo}</td><td>${row.hesapId}</td><td>${row.hesapAdi}</td><td>${row.ekipAdi || ''}</td>
            <td>${row.beklenenAksiyon || '—'}</td><td>${row.kaynak || '—'}</td>
            <td>${formatDate(row.kayitTarihi)}</td><td>${formatDateTime(row.guncellemeTarihi)}</td>
            <td>—</td><td>—</td>
            <td><button class="edit-btn" type="button">Düzenle</button><button class="del-btn" type="button">Sil</button></td>
        </tr>`;
    }

    function renderTable(rows) {
        if (!tbody) return;
        tbody.innerHTML = rows.map(buildRowHtml).join('');
        bindDeleteButtons(tbody);
    }

    async function loadAccounts(params = {}) {
        try {
            accounts = await ApiClient.getKurumsalHesaplar(params);
            accounts.forEach(a => { if (a.ekipId && a.ekipAdi) ekipMap[a.ekipId] = a.ekipAdi; });
            renderTable(accounts);
        } catch (err) {
            console.error('Kurumsal hesaplar yüklenemedi:', err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="11">Veri yüklenemedi: ${err.message}</td></tr>`;
        }
    }

    async function filterTable() {
        const params = {};
        if (filterNameInput?.value) params.hesapAdi = filterNameInput.value;
        if (filterTeamInput?.value) params.ekipAdi = filterTeamInput.value;
        if (filterIdMin?.value) params.hesapIdMin = parseInt(filterIdMin.value, 10);
        if (filterIdMax?.value) params.hesapIdMax = parseInt(filterIdMax.value, 10);
        await loadAccounts(params);
    }

    function bindDeleteButtons(scope) {
        scope.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const hesapNo = parseInt(row.dataset.hesapNo, 10);
                if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
                try {
                    await ApiClient.deleteKurumsalHesap(hesapNo);
                    row.remove();
                } catch (err) {
                    alert('Silme başarısız: ' + err.message);
                }
            });
        });
    }

    function restoreActions(cell, row) {
        cell.innerHTML = '<button class="edit-btn" type="button">Düzenle</button><button class="del-btn" type="button">Sil</button>';
        cell.querySelector('.edit-btn').addEventListener('click', () => startEdit(row));
        bindDeleteButtons(cell);
    }

    function startEdit(row) {
        if (row.dataset.editing === 'true') return;
        row.dataset.editing = 'true';
        row.classList.add('row-editing');
        const cells = row.querySelectorAll('td');
        EDITABLE_COLS.forEach(i => {
            const orig = cells[i].textContent.trim();
            cells[i].dataset.original = orig;
            cells[i].innerHTML = `<input class="cell-input" type="text" value="${orig.replace(/"/g, '&quot;')}">`;
        });
        const ac = cells[cells.length - 1];
        ac.innerHTML = '<button class="save-btn" type="button">Kaydet</button><button class="cancel-btn" type="button">İptal</button>';
        ac.querySelector('.save-btn').addEventListener('click', () => saveEdit(row));
        ac.querySelector('.cancel-btn').addEventListener('click', () => cancelEdit(row));
        cells[EDITABLE_COLS[0]].querySelector('input').focus();
    }

    async function saveEdit(row) {
        const hesapNo = parseInt(row.dataset.hesapNo, 10);
        const cells = row.querySelectorAll('td');
        const hesapAdi = cells[2].querySelector('input')?.value || cells[2].dataset.original;
        const ekipAdi = cells[3].querySelector('input')?.value || cells[3].dataset.original;
        const beklenenAksiyon = cells[4].querySelector('input')?.value || cells[4].dataset.original;
        const kaynak = cells[5].querySelector('input')?.value || cells[5].dataset.original;

        try {
            await ApiClient.updateKurumsalHesap(hesapNo, {
                hesapAdi,
                ekipId: resolveEkipId(ekipAdi),
                beklenenAksiyon,
                kaynak
            });
            row.dataset.editing = 'false';
            row.classList.remove('row-editing');
            await loadAccounts();
        } catch (err) {
            alert('Güncelleme başarısız: ' + err.message);
        }
    }

    function cancelEdit(row) {
        row.dataset.editing = 'false';
        row.classList.remove('row-editing');
        const cells = row.querySelectorAll('td');
        EDITABLE_COLS.forEach(i => { cells[i].textContent = cells[i].dataset.original || cells[i].textContent; });
        restoreActions(cells[cells.length - 1], row);
    }

    function init() {
        if (!accountsTable || !tbody) return;

        filterBtn?.addEventListener('click', filterTable);
        [filterNameInput, filterTeamInput, filterIdMin, filterIdMax].forEach(input => {
            input?.addEventListener('keydown', e => { if (e.key === 'Enter') filterTable(); });
        });

        accountsTable.addEventListener('click', e => {
            if (e.target.classList.contains('edit-btn')) startEdit(e.target.closest('tr'));
        });

        addBtn?.addEventListener('click', async () => {
            const nextId = accounts.length ? Math.max(...accounts.map(a => a.hesapId)) + 1 : 1;
            const today = new Date().toISOString().split('T')[0];
            try {
                await ApiClient.createKurumsalHesap({
                    hesapId: nextId,
                    hesapAdi: `Yeni Kurumsal Hesap ${nextId}`,
                    ekipId: 1,
                    beklenenAksiyon: '-',
                    kaynak: 'Sistem',
                    kayitTarihi: today
                });
                await loadAccounts();
            } catch (err) {
                alert('Ekleme başarısız: ' + err.message);
            }
        });

        loadAccounts();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        init();
    });
})();
