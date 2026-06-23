(function () {
    let loadTimer = null;

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDateInput(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function defaultDates() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { begin: formatDateInput(yesterday), end: formatDateInput(today) };
    }

    function formatRelativeTime(dateStr) {
        const d = new Date(dateStr);
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Az önce';
        if (mins < 60) return `${mins} dk önce`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} saat önce`;
        return d.toLocaleString('tr-TR');
    }

    function activityMeta(olayTipi) {
        const map = {
            alert: { dot: 'alert', icon: 'ti-alert-triangle' },
            uyari: { dot: 'alert', icon: 'ti-alert-triangle' },
            ok: { dot: 'ok', icon: 'ti-check' },
            onay: { dot: 'ok', icon: 'ti-check' },
            export: { dot: 'export', icon: 'ti-download' },
            edit: { dot: 'edit', icon: 'ti-pencil' }
        };
        return map[olayTipi] || map.edit;
    }

    function renderActivityRows(items) {
        if (!items.length) {
            return '<li class="activity-item"><div class="activity-body"><span>Seçilen tarih aralığında aktivite kaydı yok</span></div></li>';
        }

        return items.map(a => {
            const meta = activityMeta(a.olayTipi);
            const detay = a.detay ? escapeHtml(a.detay) : '';
            const kullanici = a.kullaniciAdi ? ` — ${escapeHtml(a.kullaniciAdi)}` : '';
            return `<li class="activity-item">
                <div class="activity-dot ${meta.dot}"><i class="ti ${meta.icon}"></i></div>
                <div class="activity-body">
                    <strong>${escapeHtml(a.baslik)}</strong>
                    <span>${detay}${kullanici}</span>
                </div>
                <span class="activity-time">${formatRelativeTime(a.olusturmaZamani)}</span>
            </li>`;
        }).join('');
    }

    function setStatus(message) {
        const el = document.getElementById('alStatus');
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        el.textContent = message;
    }

    function collectFilters() {
        const beginDate = document.getElementById('alBeginDate')?.value;
        const endDate = document.getElementById('alEndDate')?.value;
        if (!beginDate || !endDate) {
            throw new Error('Başlangıç ve bitiş tarihi zorunludur.');
        }
        if (beginDate > endDate) {
            throw new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
        }
        return { beginDate, endDate, limit: 500 };
    }

    function resetFilters() {
        const dates = defaultDates();
        const begin = document.getElementById('alBeginDate');
        const end = document.getElementById('alEndDate');
        if (begin) begin.value = dates.begin;
        if (end) end.value = dates.end;
    }

    function scheduleLoadActivities() {
        clearTimeout(loadTimer);
        loadTimer = setTimeout(() => {
            loadActivities();
        }, 200);
    }

    async function loadActivities() {
        const listEl = document.getElementById('alActivityList');
        if (!listEl) return;

        let filters;
        try {
            filters = collectFilters();
        } catch (err) {
            setStatus(err.message);
            return;
        }

        setStatus('');

        try {
            const items = await ApiClient.getAktiviteLog(filters);
            listEl.innerHTML = renderActivityRows(items);
        } catch (err) {
            const msg = err?.message || String(err);
            setStatus(msg.includes('Failed to fetch')
                ? `API'ye ulaşılamıyor. Varsayılan: ${ApiClient.baseUrl}`
                : msg);
            listEl.innerHTML = '<li class="activity-item"><div class="activity-body"><span>Aktiviteler yüklenemedi.</span></div></li>';
        }
    }

    function bindEvents() {
        document.getElementById('alFilterForm')?.addEventListener('submit', e => {
            e.preventDefault();
            loadActivities();
        });

        document.getElementById('alBeginDate')?.addEventListener('change', scheduleLoadActivities);
        document.getElementById('alEndDate')?.addEventListener('change', scheduleLoadActivities);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (!/aktivite-listesi\.html/i.test(window.location.pathname)) return;
        await window.PagePermissions?.ready?.();
        resetFilters();
        bindEvents();
        await loadActivities();
    });
})();
