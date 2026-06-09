(function () {
    let RULES = [];
    let DAILY_RESULTS = [];

    const STATUS_BADGE = {
        ok: { class: 'ok', label: 'Başarılı' },
        warn: { class: 'warn', label: 'Uyarı' },
        fail: { class: 'fail', label: 'Hata' }
    };

    async function loadKurallar() {
        try {
            RULES = await ApiClient.getVkKurallar();
        } catch (err) {
            console.error('VK kuralları yüklenemedi:', err);
            RULES = [];
        }
    }

    async function loadGunlukSonuclar() {
        try {
            DAILY_RESULTS = await ApiClient.getVkGunlukSonuclar();
        } catch (err) {
            console.error('Günlük sonuçlar yüklenemedi:', err);
            DAILY_RESULTS = [];
        }
    }

    function ruleStatusBadge(status) {
        const active = status === 'Aktif';
        return `<span class="vk-badge ${active ? 'ok' : 'off'}">${status}</span>`;
    }

    function buildKurallarHTML() {
        const rows = RULES.map(r => `
            <tr>
                <td>${r.kuralId}</td>
                <td>${r.ad}</td>
                <td>${r.alan}</td>
                <td>${r.onem}</td>
                <td>${ruleStatusBadge(r.durum)}</td>
            </tr>`).join('');

        return `<section class="vk-layout">
            <div class="vk-head">
                <h3>Veri Kalitesi Kuralları</h3>
                <p>Tanımlı doğrulama kuralları ve durumları</p>
            </div>
            <div class="vk-card">
                <div class="vk-card-head">
                    <h4>Kural Listesi</h4>
                    <span>${RULES.length} kural · ${RULES.filter(r => r.durum === 'Aktif').length} aktif</span>
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
            const badge = STATUS_BADGE[r.sonuc] || { class: '', label: r.sonuc };
            return `
            <tr>
                <td>${r.calistirmaTarihi}</td>
                <td>${r.kuralId}</td>
                <td>${r.kuralAdi}</td>
                <td>${r.gecenSayi}</td>
                <td>${r.hataliSayi}</td>
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

    async function initVkPage(type, container) {
        const el = container || document.querySelector('[data-vk-page]') || document.getElementById('pageBody');
        if (!el) return;
        if (type === 'gunluk') {
            await loadGunlukSonuclar();
            el.innerHTML = buildGunlukSonuclarHTML();
        } else {
            await loadKurallar();
            el.innerHTML = buildKurallarHTML();
        }
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
