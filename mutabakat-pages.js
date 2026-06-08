(function () {
    const PERIOD_STORAGE = 'mutabakatPeriod';

    const PERIODS = [
        { id: '2026-06', label: 'Haziran 2026', status: 'aktif', accounts: 248, diffCount: 12, closedAt: null },
        { id: '2026-05', label: 'Mayıs 2026', status: 'kapali', accounts: 246, diffCount: 0, closedAt: '2026-06-03' },
        { id: '2026-04', label: 'Nisan 2026', status: 'kapali', accounts: 244, diffCount: 0, closedAt: '2026-05-04' },
        { id: '2026-03', label: 'Mart 2026', status: 'onay', accounts: 241, diffCount: 3, closedAt: null }
    ];

    const DIFF_ACCOUNTS = [
        { code: '100.01.001', name: 'Merkez Kasa', team: 'Banka Ekip 1', mizan: 1500000, karton: 1485000, status: 'acik' },
        { code: '120.05.042', name: 'Ticari Alacaklar — X A.Ş.', team: 'Banka Ekip 2', mizan: 2847500, karton: 2851000, status: 'inceleniyor' },
        { code: '320.02.018', name: 'Satıcılar — Y Ltd.', team: 'Banka Ekip 1', mizan: 920000, karton: 915500, status: 'acik' },
        { code: '102.03.007', name: 'Vadesiz Mevduat — TL', team: 'Merkezi Kontrol', mizan: 45800000, karton: 45800000, status: 'kapatildi' },
        { code: '180.01.003', name: 'Gelecek Aylara Ait Giderler', team: 'Banka Ekip 3', mizan: 125400, karton: 128900, status: 'acik' },
        { code: '391.01.002', name: 'Hesaplanan KDV', team: 'Banka Ekip 2', mizan: 567800, karton: 562300, status: 'inceleniyor' },
        { code: '770.04.011', name: 'Genel Yönetim Giderleri', team: 'Banka Ekip 3', mizan: 890000, karton: 901200, status: 'acik' },
        { code: '257.01.001', name: 'Birikmiş Amortisman', team: 'Merkezi Kontrol', mizan: 3200000, karton: 3198500, status: 'kapatildi' }
    ];

    const STATUS_LABEL = {
        aktif: { cls: 'aktif', label: 'Aktif' },
        kapali: { cls: 'kapali', label: 'Kapalı' },
        onay: { cls: 'onay', label: 'Onay Bekliyor' },
        acik: { cls: 'acik', label: 'Açık' },
        inceleniyor: { cls: 'inceleniyor', label: 'İnceleniyor' },
        kapatildi: { cls: 'kapatildi', label: 'Kapatıldı' }
    };

    function formatMoney(n) {
        return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    }

    function getActivePeriod() {
        return localStorage.getItem(PERIOD_STORAGE) || '2026-06';
    }

    function setActivePeriod(value) {
        if (value) localStorage.setItem(PERIOD_STORAGE, value);
    }

    function buildPeriodRows(activeId) {
        return PERIODS.map(p => {
            const badge = STATUS_LABEL[p.status];
            const isActive = p.id === activeId;
            return `<tr class="${isActive ? 'mt-row-active' : ''}" data-period="${p.id}">
                <td><strong>${p.label}</strong></td>
                <td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>
                <td class="mt-num">${p.accounts}</td>
                <td class="mt-num">${p.diffCount}</td>
                <td>${p.closedAt || '—'}</td>
            </tr>`;
        }).join('');
    }

    function buildDiffRows(rows) {
        return rows.map(r => {
            const diff = r.mizan - r.karton;
            const badge = STATUS_LABEL[r.status];
            const diffClass = diff !== 0 ? 'mt-diff' : '';
            return `<tr>
                <td>${r.code}</td>
                <td>${r.name}</td>
                <td>${r.team}</td>
                <td class="mt-num">${formatMoney(r.mizan)}</td>
                <td class="mt-num">${formatMoney(r.karton)}</td>
                <td class="mt-num ${diffClass}">${diff > 0 ? '+' : ''}${formatMoney(diff)}</td>
                <td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>
            </tr>`;
        }).join('');
    }

    function buildDonemHTML() {
        const activeId = getActivePeriod();

        return `<section class="mt-layout">
            <div class="mt-head">
                <h3>Mutabakat Dönemleri</h3>
                <p>Aktif dönem seçimi ve dönem durumları</p>
            </div>
            <div class="mt-card" id="mt-donem">
                <div class="mt-card-head">
                    <h4><i class="ti ti-calendar" aria-hidden="true"></i> Dönem Listesi</h4>
                    <div class="mt-period-active">
                        <label for="mtActivePeriod">Aktif dönem</label>
                        <input type="month" id="mtActivePeriod" value="${activeId}">
                    </div>
                </div>
                <div class="mt-scroll">
                    <table class="mt-table">
                        <thead>
                            <tr>
                                <th>Dönem</th>
                                <th>Durum</th>
                                <th>Hesap Sayısı</th>
                                <th>Fark Veren</th>
                                <th>Kapanış Tarihi</th>
                            </tr>
                        </thead>
                        <tbody>${buildPeriodRows(activeId)}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function buildFarkVerenHTML() {
        const activeId = getActivePeriod();
        const openDiffs = DIFF_ACCOUNTS.filter(r => r.status === 'acik' || r.status === 'inceleniyor');
        const totalDiff = openDiffs.reduce((s, r) => s + Math.abs(r.mizan - r.karton), 0);

        return `<section class="mt-layout">
            <div class="mt-head">
                <h3>Fark Veren Hesaplar</h3>
                <p>Mizan ve karton tablo bakiye farkları — ${activeId} dönemi</p>
            </div>
            <div class="mt-card" id="mt-fark">
                <div class="mt-card-head">
                    <h4><i class="ti ti-arrows-diff" aria-hidden="true"></i> Fark Listesi</h4>
                    <span>${activeId} dönemi</span>
                </div>
                <div class="mt-summary">
                    <div class="mt-stat">
                        <strong>${openDiffs.length}</strong>
                        <span>Açık fark</span>
                    </div>
                    <div class="mt-stat">
                        <strong>${DIFF_ACCOUNTS.length}</strong>
                        <span>Toplam kayıt</span>
                    </div>
                    <div class="mt-stat">
                        <strong>${formatMoney(totalDiff)} ₺</strong>
                        <span>Toplam fark tutarı</span>
                    </div>
                </div>
                <div class="mt-filter-bar">
                    <div class="fg">
                        <label for="mtFilterCode">Hesap Kodu</label>
                        <input type="text" id="mtFilterCode" placeholder="Kod ara...">
                    </div>
                    <div class="fg">
                        <label for="mtFilterTeam">Sorumlu Ekip</label>
                        <input type="text" id="mtFilterTeam" placeholder="Ekip ara...">
                    </div>
                    <button type="button" class="filter-btn" id="mtFilterBtn">Filtrele</button>
                </div>
                <div class="mt-scroll">
                    <table class="mt-table" id="mtDiffTable">
                        <thead>
                            <tr>
                                <th>Hesap Kodu</th>
                                <th>Hesap Adı</th>
                                <th>Sorumlu Ekip</th>
                                <th>Mizan Bakiye</th>
                                <th>Karton Tablo Bakiye</th>
                                <th>Fark</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>${buildDiffRows(DIFF_ACCOUNTS)}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function buildMutabakatHTML(view) {
        return view === 'fark-veren' ? buildFarkVerenHTML() : buildDonemHTML();
    }

    function applyDiffFilter(root) {
        const code = (root.querySelector('#mtFilterCode')?.value || '').toLowerCase();
        const team = (root.querySelector('#mtFilterTeam')?.value || '').toLowerCase();
        const filtered = DIFF_ACCOUNTS.filter(r =>
            r.code.toLowerCase().includes(code) &&
            r.team.toLowerCase().includes(team)
        );
        const tbody = root.querySelector('#mtDiffTable tbody');
        if (tbody) tbody.innerHTML = buildDiffRows(filtered);
    }

    function bindMutabakatPage(root) {
        const periodInput = root.querySelector('#mtActivePeriod');
        if (periodInput) {
            periodInput.addEventListener('change', () => {
                setActivePeriod(periodInput.value);
                initMutabakatPage(root);
            });
        }

        root.querySelector('#mtFilterBtn')?.addEventListener('click', () => applyDiffFilter(root));
        root.querySelector('#mtFilterCode')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') applyDiffFilter(root);
        });
        root.querySelector('#mtFilterTeam')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') applyDiffFilter(root);
        });

        root.querySelectorAll('[data-period]').forEach(row => {
            row.addEventListener('click', () => {
                setActivePeriod(row.dataset.period);
                initMutabakatPage(root);
            });
        });
    }

    function getFocusView() {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'fark-veren') return 'fark-veren';
        return 'donem';
    }

    function initMutabakatPage(container) {
        const el = container || document.getElementById('pageBody') || document.querySelector('[data-mt-page]');
        if (!el) return;

        const view = getFocusView();
        el.innerHTML = buildMutabakatHTML(view);
        bindMutabakatPage(el);
    }

    window.initMutabakatPage = initMutabakatPage;
    window.buildMutabakatHTML = buildMutabakatHTML;

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('pageBody') && /mutabakat\.html/i.test(window.location.pathname)) {
            initMutabakatPage();
        }
    });
})();
