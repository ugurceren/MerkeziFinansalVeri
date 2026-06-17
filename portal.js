(function () {
    const KPI_LINKS = {
        fark: 'mutabakat.html?view=fark-veren',
        mutabakat: 'mutabakat.html?view=donem',
        gorev: 'surec.html'
    };

    const VK_KPI_LINKS = {
        kurallar: 'veri-kalitesi-kurallari.html',
        gunluk: 'gunluk-kural-sonuclari.html'
    };

    const PORTAL_QUICK_LINKS = [
        { pageId: 'kebir', label: 'Kebir Hesapları Listesi', href: 'kebir-hesaplari.html', icon: 'ti-notebook' },
        { pageId: 'mizan', label: 'Mizan Görüntüle', href: 'mizan.html', icon: 'ti-scale' },
        { pageId: 'fark-veren', label: 'Fark Veren Hesaplar', href: 'mutabakat.html?view=fark-veren', icon: 'ti-arrows-diff' },
        { pageId: 'surec', label: 'Süreç Kokpiti', href: 'surec.html', icon: 'ti-timeline' },
        { pageId: 'veritabani-sorgu', label: 'Veritabanı Sorgusu', href: 'veritabani-sorgu.html', icon: 'ti-database' },
        { pageId: 'mutabakat-donem', label: 'Mutabakat Dönemi', href: 'mutabakat.html?view=donem', icon: 'ti-calendar' },
        { pageId: 'vk-kurallar', label: 'Veri Kalitesi Kuralları', href: 'veri-kalitesi-kurallari.html', icon: 'ti-list-check' },
        { pageId: 'ayarlar', label: 'Uygulama Ayarları', href: 'ayarlar.html', icon: 'ti-settings' }
    ];

    const PORTAL_HUB = [
        {
            section: 'MUTABAKAT',
            title: 'Mutabakat',
            desc: 'Mizan, dönem ve fark veren hesaplar',
            icon: 'ti-scale',
            pages: ['mizan', 'mutabakat-donem', 'fark-veren', 'matrixmap']
        },
        {
            section: 'SÜREÇ',
            title: 'Süreç',
            desc: 'Dataset ve görev yönetimi',
            icon: 'ti-timeline',
            pages: ['surec', 'datasetler', 'task-listesi']
        },
        {
            section: 'RAPORLAMA',
            title: 'Raporlama',
            desc: 'Sorgu ve rapor ekranları',
            icon: 'ti-chart-bar',
            pages: ['veritabani-sorgu', 'ters-bakiye', 'nazim']
        },
        {
            section: 'VERİ KALİTESİ',
            title: 'Veri Kalitesi',
            desc: 'Kurallar ve günlük sonuçlar',
            icon: 'ti-list-check',
            pages: ['vk-kurallar', 'vk-gunluk']
        },
        {
            section: 'PARAMETRE YÖNETİMİ',
            title: 'Parametreler',
            desc: 'Kebir hesap sorumlulukları',
            icon: 'ti-notebook',
            pages: ['kebir']
        },
        {
            section: 'YÖNETİM',
            title: 'Yönetim',
            desc: 'Kullanıcı ve yetki yönetimi',
            icon: 'ti-users',
            pages: ['kullanici-yonetimi', 'kisi-yetkileri', 'veritabani-baglantisi', 'aktivite-listesi']
        }
    ];

    const PLACEHOLDER_ICONS = {
        'Ters Bakiye Raporu': 'ti-arrows-exchange',
        'Nazım Hesapları Raporu': 'ti-file-analytics'
    };

    const SECTION_LABELS = {
        PORTAL: 'Portal',
        'SÜREÇ': 'Süreç',
        MUTABAKAT: 'Mutabakat',
        'PARAMETRE YÖNETİMİ': 'Parametre Yönetimi',
        'VERİ KALİTESİ': 'Veri Kalitesi',
        RAPORLAMA: 'Raporlama',
        AYARLAR: 'Ayarlar',
        YÖNETİM: 'Yönetim'
    };

    const PAGE_LINK_OVERRIDES = {
        'hizli-erisim': 'HomePage.html?view=hizli-erisim',
        'sistem-durumu': 'ayarlar.html?view=sistem-durumu',
        'ters-bakiye': 'ters-bakiye.html',
        nazim: 'nazim-hesaplari.html'
    };

    const PAGE_ICONS = {
        portal: 'ti-home',
        'hizli-erisim': 'ti-bolt',
        surec: 'ti-timeline',
        datasetler: 'ti-stack-2',
        'task-listesi': 'ti-list-check',
        mizan: 'ti-scale',
        'mutabakat-donem': 'ti-calendar',
        'fark-veren': 'ti-arrows-diff',
        kebir: 'ti-notebook',
        'vk-kurallar': 'ti-list-check',
        'vk-gunluk': 'ti-calendar-stats',
        'veritabani-sorgu': 'ti-database',
        'ters-bakiye': 'ti-arrows-exchange',
        nazim: 'ti-file-analytics',
        ayarlar: 'ti-settings',
        'sistem-durumu': 'ti-server',
        'kullanici-yonetimi': 'ti-users',
        'aktivite-listesi': 'ti-history'
        'kisi-yetkileri': 'ti-user-shield',
        'veritabani-baglantisi': 'ti-plug-connected'
    };

    const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    function hasAccess(pageId) {
        return window.PagePermissions?.hasAccess?.(pageId) ?? true;
    }

    function pageHref(pageId) {
        const menu = window.KullaniciShared?.PAGE_MENU || [];
        for (const group of menu) {
            const page = group.pages.find(p => p.id === pageId);
            if (page?.href) return page.href;
        }
        const quick = PORTAL_QUICK_LINKS.find(p => p.pageId === pageId);
        return quick?.href || null;
    }

    function formatYilAy(yilAy) {
        if (!yilAy || !/^\d{4}-\d{2}$/.test(yilAy)) return yilAy || '—';
        const [yil, ay] = yilAy.split('-');
        const monthIdx = parseInt(ay, 10) - 1;
        return `${MONTHS_TR[monthIdx] || ay} ${yil}`;
    }

    function getUserContext() {
        const name = localStorage.getItem('userName') || 'Kullanıcı';
        const roleId = localStorage.getItem('userRole') || '';
        const role = window.KullaniciShared?.roleMap?.[roleId];
        return {
            name,
            roleId,
            roleName: role?.name || roleId || 'Kullanıcı',
            badgeClass: role?.badgeClass || 'role-viewer'
        };
    }

    function buildWelcomeHeader(subtitle) {
        const user = getUserContext();
        return `<div class="portal-welcome">
            <div>
                <h2>Merhaba, ${escapeHtml(user.name)}</h2>
                <p class="portal-welcome-sub">${subtitle}</p>
            </div>
            <span class="portal-role-badge ${user.badgeClass}">${escapeHtml(user.roleName)}</span>
        </div>`;
    }

    function resolvePageMeta(page) {
        const quick = PORTAL_QUICK_LINKS.find(p => p.pageId === page.id);
        return {
            id: page.id,
            label: page.label,
            href: page.href || PAGE_LINK_OVERRIDES[page.id] || quick?.href || pageHref(page.id),
            icon: PAGE_ICONS[page.id] || quick?.icon || 'ti-file'
        };
    }

    function getMenuGroupsForTree() {
        const menu = window.KullaniciShared?.PAGE_MENU || [];
        const groups = [];

        for (const group of menu) {
            let pages = group.pages.filter(p => hasAccess(p.id));

            if (group.section === 'AYARLAR' && hasAccess('ayarlar')) {
                pages = [
                    ...pages,
                    { id: 'sistem-durumu', label: 'Sistem Durumu' }
                ];
            }

            if (group.section === 'PORTAL' && hasAccess('portal')) {
                const withoutPortal = pages.filter(p => p.id !== 'portal');
                pages = [
                    ...pages.filter(p => p.id === 'portal'),
                    { id: 'hizli-erisim', label: 'Hızlı Erişim', href: 'HomePage.html?view=hizli-erisim' },
                    ...withoutPortal
                ];
            }

            const seen = new Set();
            pages = pages.filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });

            if (!pages.length) continue;
            groups.push({ ...group, pages });
        }

        return groups;
    }

    function buildQuickAccessTreeHTML() {
        const groups = getMenuGroupsForTree();
        if (!groups.length) {
            return '<p class="portal-empty-hint">Erişilebilir menü yok.</p>';
        }

        const nodes = groups.map(group => {
            const sectionLabel = SECTION_LABELS[group.section] || group.section;
            const children = group.pages.map(page => {
                const meta = resolvePageMeta(page);
                const isCurrent = page.id === 'hizli-erisim';
                const searchText = `${sectionLabel} ${meta.label}`.toLowerCase();

                if (!meta.href) {
                    return `<li class="portal-tree-leaf portal-tree-leaf-disabled" data-search="${escapeHtml(searchText)}">
                        <span class="portal-tree-link is-disabled">
                            <span class="portal-tree-link-icon"><i class="ti ${meta.icon}"></i></span>
                            <span class="portal-tree-link-text">${escapeHtml(meta.label)}</span>
                            <span class="portal-tree-soon">Yakında</span>
                        </span>
                    </li>`;
                }

                return `<li class="portal-tree-leaf" data-search="${escapeHtml(searchText)}">
                    <a class="portal-tree-link${isCurrent ? ' is-current' : ''}" href="${meta.href}"${isCurrent ? ' aria-current="page"' : ''}>
                        <span class="portal-tree-link-icon"><i class="ti ${meta.icon}"></i></span>
                        <span class="portal-tree-link-text">${escapeHtml(meta.label)}</span>
                        <i class="ti ti-chevron-right portal-tree-link-arrow" aria-hidden="true"></i>
                    </a>
                </li>`;
            }).join('');

            return `<li class="portal-tree-node" data-section="${group.section}">
                <button type="button" class="portal-tree-group" aria-expanded="true">
                    <span class="portal-tree-group-icon"><i class="ti ${group.icon}"></i></span>
                    <span class="portal-tree-group-text">
                        <strong>${escapeHtml(sectionLabel)}</strong>
                        <span>${group.pages.length} sayfa</span>
                    </span>
                    <span class="portal-tree-count">${group.pages.length}</span>
                    <i class="ti ti-chevron-down portal-tree-chevron" aria-hidden="true"></i>
                </button>
                <ul class="portal-tree-children">${children}</ul>
            </li>`;
        }).join('');

        return `<div class="portal-tree-toolbar">
                <div class="portal-tree-search">
                    <i class="ti ti-search" aria-hidden="true"></i>
                    <input type="search" id="portalTreeSearch" placeholder="Menüde ara..." autocomplete="off">
                </div>
                <div class="portal-tree-actions">
                    <button type="button" class="portal-tree-action" id="portalTreeExpandAll">Tümünü aç</button>
                    <button type="button" class="portal-tree-action" id="portalTreeCollapseAll">Tümünü kapat</button>
                </div>
            </div>
            <nav class="portal-menu-tree" aria-label="Uygulama menüsü">
                <ul class="portal-tree-root">${nodes}</ul>
            </nav>
            <p class="portal-tree-empty" id="portalTreeEmpty" hidden>Eşleşen menü bulunamadı.</p>`;
    }

    function bindQuickAccessTree(root) {
        const scope = root || document;

        scope.querySelectorAll('.portal-tree-group').forEach(btn => {
            btn.addEventListener('click', () => {
                const node = btn.closest('.portal-tree-node');
                if (!node) return;
                const collapsed = node.classList.toggle('is-collapsed');
                btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            });
        });

        const searchInput = scope.querySelector('#portalTreeSearch');
        const emptyHint = scope.querySelector('#portalTreeEmpty');
        const treeRoot = scope.querySelector('.portal-tree-root');

        function applyTreeFilter(query) {
            const q = query.trim().toLowerCase();
            let visibleLeaves = 0;

            scope.querySelectorAll('.portal-tree-node').forEach(node => {
                let nodeVisible = 0;
                node.querySelectorAll('.portal-tree-leaf').forEach(leaf => {
                    const text = leaf.dataset.search || '';
                    const match = !q || text.includes(q);
                    leaf.hidden = !match;
                    if (match) nodeVisible++;
                });
                node.hidden = nodeVisible === 0;
                if (q && nodeVisible > 0) node.classList.remove('is-collapsed');
                visibleLeaves += nodeVisible;
            });

            if (treeRoot) treeRoot.hidden = visibleLeaves === 0;
            if (emptyHint) emptyHint.hidden = visibleLeaves !== 0;
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => applyTreeFilter(searchInput.value));
        }

        scope.querySelector('#portalTreeExpandAll')?.addEventListener('click', () => {
            scope.querySelectorAll('.portal-tree-node').forEach(node => {
                node.classList.remove('is-collapsed');
                node.querySelector('.portal-tree-group')?.setAttribute('aria-expanded', 'true');
            });
        });

        scope.querySelector('#portalTreeCollapseAll')?.addEventListener('click', () => {
            scope.querySelectorAll('.portal-tree-node').forEach(node => {
                node.classList.add('is-collapsed');
                node.querySelector('.portal-tree-group')?.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function buildQuickAccessContent() {
        return `<section class="dashboard portal-view-quick">
            ${buildWelcomeHeader('Yetkiniz olan tüm modüller — ağaç menü')}
            <div class="dashboard-panel portal-quick-panel portal-tree-panel">
                <div class="panel-head"><h4>Menü Ağacı</h4><span>Rolünüze göre erişilebilir sayfalar</span></div>
                <div class="portal-tree-scroll">${buildQuickAccessTreeHTML()}</div>
            </div>
        </section>`;
    }

    function formatDateOnly(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('tr-TR');
    }

    function buildVkKpiSectionHTML(vkKpi, isOffline) {
        const statMuted = isOffline ? ' stat-card-offline' : '';
        const vk = vkKpi || {};
        const toplam = isOffline ? '—' : (vk.toplamKuralSayisi ?? '—');
        const aktif = isOffline ? '—' : (vk.aktifKuralSayisi ?? '—');
        const hatali = isOffline ? '—' : (vk.sonCalistirmaHataliSayisi ?? '—');
        const basari = isOffline ? '—' : `${vk.basariYuzdesi ?? '—'}%`;
        const tarihLabel = isOffline
            ? 'Canlı veri yok'
            : (vk.sonCalistirmaTarihi
                ? `Son çalıştırma: ${formatDateOnly(vk.sonCalistirmaTarihi)}${vk.kaynak === 'tdutil' ? ' · TDUTIL' : ''}`
                : 'Henüz çalıştırma kaydı yok');

        return `<div class="dashboard-panel portal-vk-kpi-panel">
            <div class="panel-head"><h4>Veri Kalitesi</h4><span>${tarihLabel}</span></div>
            <div class="stat-grid portal-vk-stat-grid">
                <a class="stat-card stat-card-link${statMuted}" href="${VK_KPI_LINKS.kurallar}">
                    <div class="stat-card-header"><div class="stat-icon blue"><i class="ti ti-list-check"></i></div></div>
                    <p class="stat-value">${toplam}</p>
                    <p class="stat-label">Toplam Kural</p>
                </a>
                <a class="stat-card stat-card-link${statMuted}" href="${VK_KPI_LINKS.kurallar}">
                    <div class="stat-card-header"><div class="stat-icon green"><i class="ti ti-circle-check"></i></div></div>
                    <p class="stat-value">${aktif}</p>
                    <p class="stat-label">Aktif Kural</p>
                </a>
                <a class="stat-card stat-card-link${statMuted}" href="${VK_KPI_LINKS.gunluk}">
                    <div class="stat-card-header"><div class="stat-icon amber"><i class="ti ti-alert-triangle"></i></div></div>
                    <p class="stat-value">${hatali}</p>
                    <p class="stat-label">Hatalı Kural</p>
                </a>
                <a class="stat-card stat-card-link${statMuted}" href="${VK_KPI_LINKS.gunluk}">
                    <div class="stat-card-header"><div class="stat-icon purple"><i class="ti ti-percentage"></i></div></div>
                    <p class="stat-value">${basari}</p>
                    <p class="stat-label">Başarı Oranı</p>
                </a>
            </div>
        </div>`;
    }

    function buildHubHTML() {
        const cards = PORTAL_HUB.map(hub => {
            const allowed = hub.pages.filter(hasAccess);
            if (!allowed.length) return '';
            const href = pageHref(allowed[0]);
            if (!href) return '';
            return `
                <a class="portal-hub-card" href="${href}">
                    <span class="portal-hub-icon"><i class="ti ${hub.icon}"></i></span>
                    <strong>${hub.title}</strong>
                    <span>${hub.desc}</span>
                </a>
            `;
        }).filter(Boolean);

        if (!cards.length) return '';
        return `
            <div class="dashboard-panel portal-hub-panel">
                <div class="panel-head"><h4>Benim İşlerim</h4><span>Rolünüze göre modüller</span></div>
                <div class="portal-hub-grid">${cards.join('')}</div>
            </div>
        `;
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatApiError(message) {
        if (!message) return 'API bağlantısı kurulamadı.';
        if (/failed to fetch/i.test(message)) {
            return 'API sunucusuna ulaşılamıyor. Sunucunun çalıştığından emin olun.';
        }
        if (/network/i.test(message)) {
            return 'Ağ bağlantısı hatası oluştu.';
        }
        return message;
    }

    function buildOfflineBannerHTML(message) {
        const apiUrl = ApiClient?.baseUrl || 'http://localhost:5038/api';
        return `<div class="portal-offline-banner" role="alert">
            <i class="ti ti-plug-connected-x"></i>
            <div class="portal-offline-text">
                <strong>Canlı veri yüklenemedi</strong>
                <span>${escapeHtml(formatApiError(message))} · <code>${escapeHtml(apiUrl)}</code></span>
            </div>
            <button type="button" class="portal-retry-btn" id="portalRetryBtn">Yeniden dene</button>
        </div>`;
    }

    function buildOfflineDonemBand() {
        const cached = localStorage.getItem('mutabakatPeriod');
        if (cached && /^\d{4}-\d{2}$/.test(cached)) {
            return `<div class="portal-context-band portal-context-muted">
                <i class="ti ti-calendar-event"></i>
                <span><strong>${formatYilAy(cached)}</strong> · Önbellekten (API kapalı)</span>
            </div>`;
        }
        return `<div class="portal-context-band portal-context-muted">
            <i class="ti ti-calendar-off"></i>
            <span>Aktif dönem bilgisi API'den alınamadı</span>
        </div>`;
    }

    function offlineEmptyHint(text) {
        return `<p class="portal-empty-hint portal-offline-hint"><i class="ti ti-cloud-off"></i>${text}</p>`;
    }

    function buildSummaryStrip(kpi, veriKaynaklari, mutabakatPct, isOffline) {
        if (isOffline) {
            return 'Canlı özet verisi yok — hızlı erişim ve modüller kullanılabilir';
        }
        const online = veriKaynaklari.filter(v => v.durum === 'connected').length;
        const total = veriKaynaklari.length;
        const parts = [
            `${kpi.acikFarkSayisi ?? 0} açık fark`,
            `${kpi.bekleyenGorevSayisi ?? 0} bekleyen görev`,
            `%${mutabakatPct} mutabakat ilerlemesi`
        ];
        if (total) {
            parts.push(`${online}/${total} veri kaynağı çevrimiçi`);
        }
        return parts.join(' · ');
    }

    function buildLoadingHTML() {
        return `<section class="dashboard portal-loading">
            <div class="portal-welcome portal-welcome-skeleton">
                <div class="skeleton-line wide"></div>
                <div class="skeleton-line"></div>
            </div>
            <div class="stat-grid">
                ${[1, 2, 3, 4].map(() => '<article class="stat-card skeleton-card"></article>').join('')}
            </div>
            <div class="dashboard-grid">
                <div class="dashboard-main"><div class="dashboard-panel skeleton-panel"></div></div>
                <div class="dashboard-side"><div class="dashboard-panel skeleton-panel"></div></div>
            </div>
        </section>`;
    }

    function buildDashboardContent({ isOffline, offlineMessage, ozet }) {
        const kpi = isOffline ? {} : (ozet?.kpi || {});
        const aktifDonem = isOffline ? null : ozet?.aktifDonem;
        const ekipIlerleme = isOffline ? [] : (ozet?.ekipIlerleme || []);
        const ekipIsYuku = isOffline ? [] : (ozet?.ekipIsYuku || []);
        const veriKaynaklari = isOffline ? [] : (ozet?.sistemDurumu?.veriKaynaklari || []);
        const vkKpi = isOffline ? null : ozet?.veriKalitesiKpi;
        const user = getUserContext();

        if (!isOffline && aktifDonem?.yilAy) {
            localStorage.setItem('mutabakatPeriod', aktifDonem.yilAy);
        }

        const mutabakatPct = ekipIlerleme.length
            ? Math.round(ekipIlerleme.reduce((s, e) => s + e.ilerlemeYuzde, 0) / ekipIlerleme.length)
            : 0;

        const donemLabel = isOffline
            ? (localStorage.getItem('mutabakatPeriod') ? formatYilAy(localStorage.getItem('mutabakatPeriod')) : '')
            : (aktifDonem?.etiket || formatYilAy(aktifDonem?.yilAy));

        const offlineBanner = isOffline ? buildOfflineBannerHTML(offlineMessage) : '';
        const donemBand = isOffline
            ? buildOfflineDonemBand()
            : (aktifDonem
                ? `<div class="portal-context-band">
                    <i class="ti ti-calendar-event"></i>
                    <span><strong>${donemLabel}</strong> · Aktif mutabakat dönemi</span>
                   </div>`
                : `<div class="portal-context-band portal-context-muted">
                    <i class="ti ti-calendar-off"></i>
                    <span>Aktif mutabakat dönemi tanımlı değil</span>
                   </div>`);

        const chartRows = isOffline
            ? offlineEmptyHint('Ekip ilerleme verisi API bağlantısı gerektirir.')
            : (ekipIlerleme.length
                ? ekipIlerleme.map(e => `
                    <div class="chart-row">
                        <label>${e.ekipAdi}</label>
                        <div class="bar-track"><div class="bar-fill" style="width:${e.ilerlemeYuzde}%"></div></div>
                        <span class="pct">${e.ilerlemeYuzde}%</span>
                    </div>
                `).join('')
                : '<p class="portal-empty-hint">Ekip ilerleme verisi yok.</p>');

        const isYukuRows = isOffline
            ? ''
            : ekipIsYuku.map(e => {
                const maxIsYuku = Math.max(...ekipIsYuku.map(x => x.acikFarkSayisi + x.bekleyenAksiyonSayisi), 1);
                const total = e.acikFarkSayisi + e.bekleyenAksiyonSayisi;
                const pct = Math.round(total / maxIsYuku * 100);
                const level = pct > 70 ? 'high' : pct > 40 ? 'medium' : 'low';
                return `<div class="team-load-item">
                    <div class="team-load-header"><span>${e.ekipAdi}</span><span>${total} görev</span></div>
                    <div class="load-track"><div class="load-fill ${level}" style="width:${pct}%"></div></div>
                </div>`;
            }).join('');

        const summaryStrip = buildSummaryStrip(kpi, veriKaynaklari, mutabakatPct, isOffline);
        const datasetCard = (!isOffline && typeof buildPortalDatasetCardHTML === 'function')
            ? buildPortalDatasetCardHTML()
            : '';

        const statMuted = isOffline ? ' stat-card-offline' : '';
        const kpiFark = isOffline ? '—' : (kpi.acikFarkSayisi ?? '—');
        const kpiMutabakat = isOffline ? '—' : `${mutabakatPct}%`;
        const kpiGorev = isOffline ? '—' : (kpi.bekleyenGorevSayisi ?? '—');

        return `<section class="dashboard${isOffline ? ' portal-offline' : ''}">
            ${offlineBanner}
            <div class="portal-welcome">
                <div>
                    <h2>Merhaba, ${escapeHtml(user.name)}</h2>
                    <p class="portal-welcome-sub">${summaryStrip}</p>
                </div>
                <span class="portal-role-badge ${user.badgeClass}">${escapeHtml(user.roleName)}</span>
            </div>
            ${donemBand}
            <div class="stat-grid stat-grid-3">
                <a class="stat-card stat-card-link${statMuted}" href="${KPI_LINKS.fark}">
                    <div class="stat-card-header"><div class="stat-icon amber"><i class="ti ti-alert-triangle"></i></div></div>
                    <p class="stat-value">${kpiFark}</p>
                    <p class="stat-label">Açık Fark</p>
                </a>
                <a class="stat-card stat-card-link${statMuted}" href="${KPI_LINKS.mutabakat}">
                    <div class="stat-card-header"><div class="stat-icon green"><i class="ti ti-circle-check"></i></div></div>
                    <p class="stat-value">${kpiMutabakat}</p>
                    <p class="stat-label">Mutabakat Tamamlanma</p>
                </a>
                <a class="stat-card stat-card-link${statMuted}" href="${KPI_LINKS.gorev}">
                    <div class="stat-card-header"><div class="stat-icon purple"><i class="ti ti-list-check"></i></div></div>
                    <p class="stat-value">${kpiGorev}</p>
                    <p class="stat-label">Bekleyen Görev</p>
                </a>
            </div>
            ${buildVkKpiSectionHTML(vkKpi, isOffline)}
            <div class="dashboard-grid">
                <div class="dashboard-main">
                    <div class="dashboard-panel${isOffline ? ' panel-offline' : ''}">
                        <div class="panel-head"><h4>Mutabakat İlerlemesi — Ekip Bazlı</h4><span>${donemLabel || 'Güncel dönem'}</span></div>
                        <div class="chart-bars">${chartRows}</div>
                    </div>
                    ${datasetCard}
                </div>
                <div class="dashboard-side">
                    <div class="dashboard-panel${isOffline ? ' panel-offline' : ''}">
                        <div class="panel-head"><h4>Ekip İş Yükü</h4><span>Bekleyen görev</span></div>
                        <div class="team-load-list">${isYukuRows || (isOffline ? offlineEmptyHint('İş yükü verisi API bağlantısı gerektirir.') : '<p class="portal-empty-hint">İş yükü verisi yok.</p>')}</div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    async function buildDashboardHTML() {
        let ozet = null;
        let loadError = null;

        try {
            ozet = await ApiClient.getPortalOzet();
        } catch (err) {
            loadError = err.message;
            console.warn('Portal özeti yüklenemedi:', err.message);
        }

        const isOffline = !!loadError && !ozet;

        if (!isOffline && typeof loadSurecData === 'function') {
            try {
                await loadSurecData();
            } catch (err) {
                console.warn('Süreç verisi yüklenemedi:', err);
            }
        }

        const html = buildDashboardContent({
            isOffline,
            offlineMessage: loadError,
            ozet
        });

        return { html, error: isOffline, offline: isOffline };
    }

    function buildPlaceholderHTML(page) {
        const icon = PLACEHOLDER_ICONS[page] || 'ti-file';
        return `<div class="placeholder-page">
            <i class="ti ${icon}"></i>
            <p>${page}</p>
            <span>Bu sayfa için içerik buraya gelecek.</span>
        </div>`;
    }

    async function ensurePermissions() {
        if (!window.PagePermissions?.reload) return;
        const pages = window.PagePermissions.getAllowedPages();
        if (pages.size <= 1) {
            try {
                await window.PagePermissions.reload();
            } catch (err) {
                console.warn('Yetkiler yüklenemedi:', err);
            }
        }
    }

    function getPortalView() {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'hizli-erisim') return 'hizli-erisim';
        return 'kokpit';
    }

    function bindRetryButton(pageBody, retryFn) {
        const retryBtn = document.getElementById('portalRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => retryFn(pageBody));
        }
    }

    async function renderQuickAccess(pageBody) {
        pageBody.innerHTML = buildLoadingHTML();
        await ensurePermissions();
        pageBody.innerHTML = buildQuickAccessContent();
        bindQuickAccessTree(pageBody);
    }

    async function renderPortal(pageBody) {
        pageBody.innerHTML = buildLoadingHTML();

        await ensurePermissions();

        const result = await buildDashboardHTML();
        pageBody.innerHTML = result.html;

        if (result.error) {
            bindRetryButton(pageBody, renderPortal);
        }
    }

    function renderPortalView(pageBody) {
        const view = getPortalView();
        if (view === 'hizli-erisim') {
            renderQuickAccess(pageBody);
            return;
        }
        renderPortal(pageBody);
    }

    function initPortalPage(pageBody) {
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get('page');

        if (pageParam === 'ters-bakiye') {
            window.location.replace('ters-bakiye.html');
            return;
        }
        if (pageParam === 'nazim') {
            window.location.replace('nazim-hesaplari.html');
            return;
        }

        renderPortalView(pageBody);
    }

    window.initPortalPage = initPortalPage;

    document.addEventListener('ribbon-ready', async function (e) {
        const pageBody = document.getElementById('pageBody');
        if (!pageBody) return;

        await window.PagePermissions?.ready?.();

        initUserBar();
        initThemeMenu();

        const state = e.detail || (typeof detectRibbonState === 'function' ? detectRibbonState() : null);
        const page = state?.page || 'Portal';
        const portalPages = new Set(['Portal', 'Hızlı Erişim']);

        if (!portalPages.has(page)) {
            pageBody.innerHTML = buildPlaceholderHTML(page);
            return;
        }

        initPortalPage(pageBody);
    });
})();
