# Merkezi Güvenilir Finansal Veri — Proje Özeti

Kurumsal finansal veri mutabakatı, süreç izleme ve raporlama için geliştirilen **Merkezi Güvenilir Finansal Veri** platformunun özet dokümantasyonu.

---

## Amaç

Banka ve merkezi sistemlerden gelen finansal verilerin tek bir merkezde toplanması, mutabakat süreçlerinin yönetilmesi ve raporlama katmanına aktarılması. Uygulama; **staging (TDSTG) → ana veri (TDMAIN) → raporlama (TDREPORT)** veri katmanları üzerine kurulu bir iş akışını destekler.

---

## Mimari Genel Bakış

Önyüz statik HTML/JS sayfalarından oluşur ve `api-client.js` üzerinden ASP.NET Core Web API ile konuşur. Uygulama verisi (kullanıcı/rol/yetki, kurumsal hesaplar, mutabakat dönemleri, aktivite logu) `TDUTIL.VIB` şemasında tutulur. Süreç, veri kalitesi ve rapor ekranları ise doğrudan **TDUTIL / TDREPORT** kaynak tablolarından ve stored procedure'lerinden beslenir. İstemci tarafında (`localStorage`) yalnızca tema ve oturum tercihleri kalır.

```
┌──────────────────┐     ┌───────────────────────┐     ┌──────────────────────────────┐
│ HTML/JS sayfalar │────▶│ MerkeziFinansalVeri   │────▶│ SQL Server                   │
│ api-client.js    │     │ .Api (ASP.NET Core 8) │     │ TDUTIL.VIB  (uygulama)        │
└──────────────────┘     │ config/*.json + *.sql │     │ TDUTIL DOC/OPR/DQ/PRM (kaynak)│
                         └───────────────────────┘     │ TDREPORT RCL.* (rapor SP'leri)│
                                                       └──────────────────────────────┘
```

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Web arayüzü** | HTML, CSS, JavaScript | Statik sayfalar; ortak ribbon kabuk (`ribbon-shell.js`) |
| **API** | ASP.NET Core 8, EF Core | REST endpoint'leri; sorgu ve rapor tanımları `config/` altından okunur |
| **Uygulama DB** | SQL Server — `TDUTIL.VIB` | ref/sec/cfg/ops/audit tabloları (İngilizce adlar) |
| **Kaynak veri** | SQL Server — TDUTIL, TDREPORT | Salt okunur dataset, ETL, veri kalitesi ve rapor verisi |
| **Masaüstü (eski)** | .NET 8 WPF (C#) | Bağımsız prototip; API'ye bağlı değil |

---

## Web Sayfaları ve Menü (Ribbon)

Tüm sayfalar aynı ribbon kabuğunu kullanır; sekme ve butonlar `ribbon-shell.js` içinde tanımlıdır. Bazı sayfalar `?view=` parametresiyle birden fazla ekran sunar.

| Sekme | Sayfa | Dosya | İşlev |
|-------|-------|-------|-------|
| **Portal** | Portal | `HomePage.html` | KPI kartları ve dashboard panelleri |
| | Hızlı Erişim | `HomePage.html?view=hizli-erisim` | Sık kullanılan sayfalara kısayollar |
| **Süreç** | Günlük Akış | `surec.html` | TDSTG / TDMAIN / TDREPORT ETL yükleme akışı (`OPR.ETLLoad`, `OPR.ParallelRun`) |
| | Datasetler | `surec.html?view=datasetler` | `DOC.TDDataset` envanteri — Katalog, Liste, Kartlar ve Statü görünümleri |
| | Paket Listesi | `surec.html?view=task-listesi` | Paralel çalışan paketler (`OPR.ParallelRun`) |
| **Mutabakat** | Mizan | `mizan.html` | Mizan yükleme/görev durumu |
| | Dönem | `mutabakat.html?view=donem` | Mutabakat dönemleri |
| | Fark Veren Hesaplar | `mutabakat.html?view=fark-veren` | Fark veren bakiyeler (`FarkVerenSyncService`) |
| | Matrix Map | `mutabakat.html?view=matrixmap` | `PRM.TDMatrixMap` eşleştirme tablosu |
| **Parametre Yönetimi** | Kebir Hesapları Sorumluluk Listesi | `kebir-hesaplari.html` | Kurumsal hesap sorumlulukları, CRUD |
| **Veri Kalitesi** | Veri Kalitesi Kuralları | `veri-kalitesi-kurallari.html` | `DQ.Rule` kural tanımları |
| | Günlük Kural Sonuçları | `gunluk-kural-sonuclari.html` | `DQ.RuleResult` günlük sonuçları |
| **Raporlama** | Ters Bakiye Raporu | `ters-bakiye.html` | `RCL.rpt_ReverseBalanceReconciliation*` SP'leri |
| | Nazım Hesapları Raporu | `nazim-hesaplari.html` | `RCL.rpt_OffBalanceAccountReconciliation` SP'si |
| | Veritabanı Sorgusu | `veritabani-sorgu.html` | TD bağlantılarına ad-hoc SQL, IntelliSense destekli |
| **Ayarlar** | Uygulama Ayarları | `ayarlar.html` | Tema ve uygulama tercihleri |
| | Sistem Durumu | `ayarlar.html?view=sistem-durumu` | API ve bağlantı sağlık durumu |
| **Yönetim** | Kullanıcı Yönetimi | `kullanici-yonetimi.html` | Kullanıcılar, roller ve sayfa erişim matrisi |
| | Kişi Bazlı Yetkiler | `kisi-yetkileri.html` | Rol yetkisinin kişi bazında override edilmesi |
| | Aktivite Listesi | `aktivite-listesi.html` | Kullanıcı aktivite logu |
| | Veritabanı Bağlantısı | `veritabani-baglantisi.html` | TD veri kaynağı (bağlantı) yönetimi |

Yardımcı sayfa: `logo-secim.html` — marka/logo alternatiflerinin karşılaştırılması.

---

## Veri Katmanları (Süreç)

| Katman | Rol |
|--------|-----|
| **TDSTG** | Staging — kaynak sistemlerden gelen ham veri |
| **TDMAIN** | Ana veri — kurumsal çekirdek (kebir, mizan, yevmiye, hesap planı) |
| **TDREPORT** | Raporlama — analitik ve mutabakat raporları |

Günlük Akış ekranı her katmandaki dataset/paket yüklemelerini statüleriyle gösterir (Success, In Progress, Not Started, Failed, LND Completed/Failed).

---

## Kullanıcı ve Yetki

Roller `database/seeds/002_sec_seed.sql` ile yüklenir:

- **Sistem Yöneticisi** — tüm modüllere tam erişim
- **Mutabakat Sorumlusu** — portal + mutabakat sayfaları
- **Raporlama Uzmanı** — portal + raporlama sayfaları
- **Süreç Koordinatörü** — portal + süreç yönetimi
- **Veri Kalitesi Sorumlusu** — portal + veri kalitesi sayfaları
- **Görüntüleyici** — yalnızca portal

Sayfa erişimi `RolePagePermission` ve kişi bazlı `UserPagePermission` tablolarıyla belirlenir; önyüzde `page-permissions.js` uygular.

**Kimlik:** Gerçek kimlik doğrulama henüz yok. `api-client.js` her isteğe `X-User-Id` başlığı ekler; API tarafında `CurrentUserMiddleware` bu değeri okur (başlık yoksa varsayılan kullanıcı). Geliştirmede kullanıcı `dev-user-switcher.js` ile değiştirilebilir.

---

## Veritabanı Şeması (TDUTIL.VIB)

Tam CREATE scriptleri: `database/migrations/002_tdutil_vib_schema_en.sql`. `004` ve `005` migration'ları, TDUTIL kaynak tablolarına geçildiği için artık kullanılmayan demo tablolarını kaldırır.

| Grup | Tablolar | Açıklama |
|------|----------|----------|
| Referans | `Team`, `Page`, `DataLayer` | Ekipler, menü sayfaları, veri katmanları |
| Güvenlik | `Role`, `User`, `RolePagePermission`, `UserPagePermission` | RBAC ve kişi bazlı yetki override |
| Konfigürasyon | `DataSource` | TD bağlantı tanımları |
| Operasyon | `CorporateAccount`, `ReconciliationPeriod`, `VarianceAccount` | Kebir sorumlulukları, mutabakat dönemleri, fark veren hesaplar |
| Audit | `ActivityLog`, `QueryExecutionLog` | Aktivite ve sorgu logları |
| View | `vw_TeamReconciliationProgress`, `vw_TeamWorkload` | Portal aggregate sorguları |

**Kaldırılan tablolar** (`004`/`005`): `ProcessDataset`, `ProcessTask*`, `DataDomain` → yerine `DOC.TDDataset`, `OPR.ETLLoad`, `OPR.ParallelRun`; `DataQualityRule*` → yerine `DQ.*`; `ReportDefinition`, `ReportResultSnapshot`, `SavedQuery`, `SystemParameter`, `vw_PortalSummary`.

Seed scriptleri (`database/seeds/`) rol, kullanıcı, sayfa ve yetki verilerini yükler.

---

## Konfigürasyon (`config/`)

Ekranların sorgu ve rapor tanımları koddan ayrı tutulur; değişiklik için API'nin yeniden derlenmesi gerekmez.

| Dosya | İçerik |
|-------|--------|
| `td-connections.json` | TD veritabanı bağlantıları |
| `datasets.json`, `gunluk-akis.json`, `task-listesi.json` | Süreç ekranlarının sorgu ayarları |
| `mizan-akis.json`, `matrixmap.json` | Mutabakat ekranları |
| `ters-bakiye.json`, `nazim-hesaplari.json` | Rapor SP adları, kolon sırası, satır/zaman aşımı limitleri |
| `vk-kurallar.json`, `vk-gunluk-sonuclar.json`, `vk-portal-kpi.json` | Veri kalitesi ekranları ve portal KPI'ları |
| `queries/*.sql` | Yukarıdaki ayarların çalıştırdığı SQL sorguları |

---

## Dosya Yapısı

```
MerkeziFinansalVeri/
├── MerkeziFinansalVeri.sln
├── baslat.bat                 # API + statik web sunucusunu birlikte başlatır
├── .editorconfig              # UTF-8, girinti ve satır sonu kuralları
│
├── config/                    # Ekran sorgu/rapor tanımları (JSON + SQL)
├── database/
│   ├── migrations/            # SQL şema scriptleri
│   ├── seeds/                 # Rol, kullanıcı, sayfa, yetki seed verileri
│   └── setup.ps1              # Kurulum scripti
│
├── src/
│   ├── MerkeziFinansalVeri.Api/            # ASP.NET Core Web API (13 controller)
│   ├── MerkeziFinansalVeri.Domain/         # Entity modelleri
│   └── MerkeziFinansalVeri.Infrastructure/ # EF Core, TD bağlantı ve rapor servisleri
│
├── *.html / *.js / *.css      # Önyüz sayfaları (kök dizinde)
├── api-client.js              # Önyüz HTTP katmanı (fetch wrapper)
├── ribbon-shell.js            # Ortak ribbon menü ve navigasyon
├── surec-cockpit.js           # Süreç: Günlük Akış, Datasetler, Paket Listesi
├── mutabakat-pages.js         # Dönem, Fark Veren, Matrix Map
├── veri-kalitesi-pages.js     # VK kurallar ve günlük sonuçlar
│
├── FinansalVeriApp/           # WPF masaüstü prototipi (eski)
├── README.md
└── PROJE-OZETI.md             # Bu dosya
```

---

## Ortak Bileşenler

| Bileşen | Dosya | Açıklama |
|---------|-------|----------|
| Ribbon kabuk | `ribbon-shell.js`, `ribbon.css` | Sekme menüsü, sayfa geçişleri, tema token'ları (`--rb-*`, `--tbl-*`) |
| Akıllı tablo | `smart-table.js`, `table-theme.css` | Sıralama, kolon filtresi, kolon genişliği ayarı |
| Filtre çubuğu | `filter-bar.js` | Debounce'lu arama/filtre alanları |
| Kayıt sayacı | `table-count.js` | "Gösterilen / Toplam" rozeti |
| SQL IntelliSense | `sql-intellisense.js` | Sorgu ekranında tablo/kolon önerileri |
| Tarih | `date-locale.js` | Türkçe tarih biçimi ve flatpickr tarih seçici |
| Durum çubuğu | `status-bar.js` | Alt bilgi çubuğu: kullanıcı, tarih, sürüm ve ortam |
| Tema | `theme-toggle.js` | Koyu/açık mod, `localStorage` ile kalıcı |
| Yetki | `page-permissions.js`, `user-session.js` | Sayfa erişim kontrolü ve oturum kullanıcısı |
| İkonlar | [Tabler Icons](https://tabler.io/icons) | CDN'den, sürümü sabit: `@tabler/icons-webfont@2.47.0` |

---

## Çalıştırma

En kolay yol: `baslat.bat` — API'yi (`http://localhost:5038`) ve statik web sunucusunu (`http://localhost:5500`) ayrı pencerelerde başlatıp portalı açar.

### 1. Veritabanı

```powershell
cd database
.\setup.ps1
```

### 2. API

```powershell
dotnet build MerkeziFinansalVeri.sln
dotnet run --project src/MerkeziFinansalVeri.Api
```

Swagger: `http://localhost:5038/swagger`

### 3. Web arayüzü

```bash
python -m http.server 5500
```

Tarayıcıda `http://localhost:5500/HomePage.html` açın. API adresi varsayılan olarak `http://localhost:5038/api`; değiştirmek için `localStorage.setItem('apiBaseUrl', '...')`.

### WPF masaüstü uygulaması (eski prototip)

```bash
dotnet run --project FinansalVeriApp/FinansalVeriApp.csproj
```

---

## Geliştirme Notları

- **İkon sürümü:** Tabler Icons v3'te CSS dosyası `dist/` altına taşındı ve bazı ikon adları değişti. v3'e geçmek için yol `@3.x/dist/tabler-icons.min.css` olmalı ve kullanılan `ti-*` adları kontrol edilmeli.
- **Encoding:** Tüm dosyalar UTF-8'dir (`.editorconfig`). Türkçe karakterlerin bozulmaması için dosyaları ANSI/Windows-1254 ile kaydetmeyin.
- **API:** Backend değişikliklerinden sonra API manuel olarak yeniden başlatılmalıdır.
- **Kimlik doğrulama:** `X-User-Id` başlığı yalnızca geliştirme içindir; gerçek ortamda JWT veya AD kimlik doğrulaması gerekir.

---

## Depo

GitHub: [ugurceren/MerkeziFinansalVeri](https://github.com/ugurceren/MerkeziFinansalVeri)
