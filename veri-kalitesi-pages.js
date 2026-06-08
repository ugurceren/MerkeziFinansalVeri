(function () {
    const RULES = [
        { id: 'DQ-001', name: 'Bakiye işareti kontrolü', domain: 'Mutabakat', severity: 'Kritik', status: 'Aktif' },
        { id: 'DQ-002', name: 'Hesap kodu formatı', domain: 'Parametre', severity: 'Yüksek', status: 'Aktif' },
        { id: 'DQ-003', name: 'Boş alan kontrolü — IBAN', domain: 'Hazine', severity: 'Orta', status: 'Aktif' },
        { id: 'DQ-004', name: 'Tarih aralığı tutarlılığı', domain: 'Süreç', severity: 'Yüksek', status: 'Aktif' },
        { id: 'DQ-005', name: 'Duplicate kayıt tespiti', domain: 'Mevduat', severity: 'Kritik', status: 'Pasif' },
        { id: 'DQ-006', name: 'Referans tablo eşleşmesi', domain: 'Masraf', severity: 'Orta', status: 'Aktif' }
    ];

    const DAILY_RESULTS = [
        { date: '2026-06-07', rule: 'DQ-001', ruleName: 'Bakiye işareti kontrolü', passed: 248, failed: 3, status: 'warn' },
        { date: '2026-06-07', rule: 'DQ-002', ruleName: 'Hesap kodu formatı', passed: 512, failed: 0, status: 'ok' },
        { date: '2026-06-07', rule: 'DQ-003', ruleName: 'Boş alan kontrolü — IBAN', passed: 89, failed: 7, status: 'fail' },
        { date: '2026-06-07', rule: 'DQ-004', ruleName: 'Tarih aralığı tutarlılığı', passed: 156, failed: 1, status: 'warn' },
        { date: '2026-06-06', rule: 'DQ-001', ruleName: 'Bakiye işareti kontrolü', passed: 247, failed: 4, status: 'warn' },
        { date: '2026-06-06', rule: 'DQ-006', ruleName: 'Referans tablo eşleşmesi', passed: 320, failed: 0, status: 'ok' }
    ];

    const STATUS_BADGE = {
        ok: { class: 'ok', label: 'Başarılı' },
        warn: { class: 'warn', label: 'Uyarı' },
        fail: { class: 'fail', label: 'Hata' }
    };

    function ruleStatusBadge(status) {
        const active = status === 'Aktif';
        return `<span class="vk-badge ${active ? 'ok' : 'off'}">${status}</span>`;
    }

    function buildKurallarHTML() {
        const rows = RULES.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.name}</td>
                <td>${r.domain}</td>
                <td>${r.severity}</td>
                <td>${ruleStatusBadge(r.status)}</td>
            </tr>`).join('');

        return `<section class="vk-layout">
            <div class="vk-head">
                <h3>Veri Kalitesi Kuralları</h3>
                <p>Tanımlı doğrulama kuralları ve durumları</p>
            </div>
            <div class="vk-card">
                <div class="vk-card-head">
                    <h4>Kural Listesi</h4>
                    <span>${RULES.length} kural · ${RULES.filter(r => r.status === 'Aktif').length} aktif</span>
                </div>
                <div class="vk-scroll">
                    <table class="vk-table">
                        <thead>
                            <tr>
                                <th>Kural Kodu</th>
                                <th>Kural Adı</th>
                                <th>Alan</th>
                                <th>Önem</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function buildGunlukSonuclarHTML() {
        const rows = DAILY_RESULTS.map(r => {
            const badge = STATUS_BADGE[r.status];
            return `
            <tr>
                <td>${r.date}</td>
                <td>${r.rule}</td>
                <td>${r.ruleName}</td>
                <td>${r.passed}</td>
                <td>${r.failed}</td>
                <td><span class="vk-badge ${badge.class}">${badge.label}</span></td>
            </tr>`;
        }).join('');

        return `<section class="vk-layout">
            <div class="vk-head">
                <h3>Günlük Kural Sonuçları</h3>
                <p>Kuralların günlük çalışma özeti ve hata sayıları</p>
            </div>
            <div class="vk-card">
                <div class="vk-card-head">
                    <h4>Son Çalıştırmalar</h4>
                    <span>Son 2 gün</span>
                </div>
                <div class="vk-scroll">
                    <table class="vk-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Kural Kodu</th>
                                <th>Kural Adı</th>
                                <th>Geçen</th>
                                <th>Hatalı</th>
                                <th>Sonuç</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </section>`;
    }

    function initVkPage(type, container) {
        const el = container || document.querySelector('[data-vk-page]') || document.getElementById('pageBody');
        if (!el) return;
        el.innerHTML = type === 'gunluk' ? buildGunlukSonuclarHTML() : buildKurallarHTML();
    }

    window.buildVeriKalitesiKurallariHTML = buildKurallarHTML;
    window.buildGunlukKuralSonuclariHTML = buildGunlukSonuclarHTML;
    window.initVeriKalitesiKurallariPage = (c) => initVkPage('kurallar', c);
    window.initGunlukKuralSonuclariPage = (c) => initVkPage('gunluk', c);

    document.addEventListener('DOMContentLoaded', () => {
        const host = document.querySelector('[data-vk-page]');
        if (!host) return;
        initVkPage(host.dataset.vkPage, host);
    });
})();
