(function () {
    let periods = [];
    let diffAccounts = [];
    let activePeriodYilAy = '2026-06';

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
        const active = periods.find(p => p.aktifMi);
        return active?.yilAy || activePeriodYilAy;
    }

    async function loadData() {
        try {
            periods = await ApiClient.getMutabakatDonemler();
            const active = periods.find(p => p.aktifMi);
            if (active) activePeriodYilAy = active.yilAy;
            diffAccounts = await ApiClient.getFarkVeren({ donemId: active?.donemId });
        } catch (err) {
            console.error('Mutabakat verisi yüklenemedi:', err);
        }
    }

    function buildPeriodRows(activeId) {
        return periods.map(p => {
            const badge = STATUS_LABEL[p.durum] || { cls: '', label: p.durum };
            const isActive = p.yilAy === activeId;
            return `<tr class="${isActive ? 'mt-row-active' : ''}" data-period="${p.yilAy}" data-donem-id="${p.donemId}">
                <td><strong>${p.etiket}</strong></td>
                <td><span class="mt-badge ${badge.cls}">${badge.label}</span></td>
                <td class="mt-num">${p.hesapSayisi}</td>
                <td class="mt-num">${p.farkVerenSayisi}</td>
                <td>${p.kapanisTarihi || '—'}</td>
            </tr>`;
        }).join('');
    }

    function buildDiffRows(rows) {
        return rows.map(r => {
            const diff = r.mizanBakiye - r.kartonBakiye;
            const badge = STATUS_LABEL[r.durum] || { cls: '', label: r.durum };
            const diffClass = diff !== 0 ? 'mt-diff' : '';
            return `<tr>
                <td>${r.hesapKodu}</td>
                <td>${r.hesapAdi}</td>
                <td>${r.ekipAdi || ''}</td>
                <td class="mt-num">${formatMoney(r.mizanBakiye)}</td>
                <td class="mt-num">${formatMoney(r.kartonBakiye)}</td>
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
        const openDiffs = diffAccounts.filter(r => r.durum === 'acik' || r.durum === 'inceleniyor');
        const totalDiff = openDiffs.reduce((s, r) => s + Math.abs(r.mizanBakiye - r.kartonBakiye), 0);

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
                        <strong>${diffAccounts.length}</strong>
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
                        <tbody>${buildDiffRows(diffAccounts)}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function buildMutabakatHTML(view) {
        return view === 'fark-veren' ? buildFarkVerenHTML() : buildDonemHTML();
    }

    async function applyDiffFilter(root) {
        const code = (root.querySelector('#mtFilterCode')?.value || '').trim();
        const team = (root.querySelector('#mtFilterTeam')?.value || '').trim();
        const active = periods.find(p => p.aktifMi);
        try {
            const params = { donemId: active?.donemId };
            if (code) params.hesapKodu = code;
            diffAccounts = await ApiClient.getFarkVeren(params);
            if (team) {
                diffAccounts = diffAccounts.filter(r =>
                    (r.ekipAdi || '').toLowerCase().includes(team.toLowerCase())
                );
            }
            const tbody = root.querySelector('#mtDiffTable tbody');
            if (tbody) tbody.innerHTML = buildDiffRows(diffAccounts);
        } catch (err) {
            console.error('Filtreleme başarısız:', err);
        }
    }

    function bindMutabakatPage(root) {
        const periodInput = root.querySelector('#mtActivePeriod');
        if (periodInput) {
            periodInput.addEventListener('change', async () => {
                const target = periods.find(p => p.yilAy === periodInput.value);
                if (target) {
                    try {
                        await ApiClient.setAktifDonem(target.donemId);
                        activePeriodYilAy = target.yilAy;
                        await loadData();
                        await initMutabakatPage(root);
                    } catch (err) {
                        console.error('Aktif dönem değiştirilemedi:', err);
                    }
                }
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
            row.addEventListener('click', async () => {
                const donemId = parseInt(row.dataset.donemId, 10);
                try {
                    await ApiClient.setAktifDonem(donemId);
                    activePeriodYilAy = row.dataset.period;
                    await loadData();
                    await initMutabakatPage(root);
                } catch (err) {
                    console.error('Dönem seçilemedi:', err);
                }
            });
        });
    }

    function getFocusView() {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'fark-veren') return 'fark-veren';
        return 'donem';
    }

    async function initMutabakatPage(container) {
        const el = container || document.getElementById('pageBody') || document.querySelector('[data-mt-page]');
        if (!el) return;

        await loadData();
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
