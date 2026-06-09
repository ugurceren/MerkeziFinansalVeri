# Merkezi Güvenilir Finansal Veri — Proje Özeti

Kurumsal finansal veri mutabakatı, süreç izleme ve raporlama için geliştirilen **Merkezi Güvenilir Finansal Veri** platformunun özet dokümantasyonu.

---

## Amaç

Banka ve merkezi sistemlerden gelen finansal verilerin tek bir merkezde toplanması, mutabakat süreçlerinin yönetilmesi ve raporlama katmanına aktarılması. Uygulama; **staging (TDSTG) → ana veri (TDMAIN) → raporlama (TDREPORT)** veri katmanları üzerine kurulu bir iş akışını destekler.

---

## Mimari Genel Bakış

> **Önemli:** Proje **SQL Server veritabanı altyapısına** dönmüştür. İş verisi (kurumsal hesaplar, mutabakat dönemleri, kullanıcı/yetki, süreç görevleri, veri kalitesi kuralları vb.) artık veritabanında tutulur; önyüz `api-client.js` üzerinden ASP.NET Core Web API ile konuşur. Yalnızca tema ve kullanıcı tercihleri istemci tarafında (`localStorage`) kalabilir.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  HTML/JS Sayfalar│────▶│  MerkeziFinansalVeri │────▶│  SQL Server         │
│  api-client.js  │     │  .Api (ASP.NET Core 8)│     │  TDUTIL.VIB (uygulama)│
└─────────────────┘     └──────────────────────┘     │  TDMAIN/TDREPORT (DW)│
                                                        └─────────────────────┘
```

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Web arayüzü** | HTML, CSS, JavaScript | Statik sayfalar; ribbon kabuk |
| **API** | ASP.NET Core 8, EF Core | REST endpoint'leri, JWT-ready middleware |
| **Uygulama DB** | SQL Server — `TDUTIL.VIB` | ref/ops/sec/cfg/audit tabloları (İngilizce adlar) |
| **Kaynak DW** | SQL Server — TDSTG/TDMAIN/TDREPORT | Salt okunur finansal bakiyeler ve rapor verisi |
| **Masaüstü (eski)** | .NET 8 WPF (C#) | Bağımsız prototip; API'ye henüz bağlı değil |

---

## Web Sayfaları

### Ribbon kabuk (ana arayüz)

Üst marka çubuğu, sekme menüsü ve ribbon butonları ile çalışan sayfalar:

| Sayfa | Dosya | İşlev |
|-------|-------|-------|
| Genel Bakış | `HomePage.html` | KPI kartları, dashboard panelleri, SPA iç navigasyon |
| Süreç Kokpiti | `surec.html` | TDSTG / TDMAIN / TDREPORT canlı süreç izleme |
| Kebir Hesapları | `kebir-hesaplari.html` | Sorumluluk listesi, filtreleme, CRUD tablosu |
| Kullanıcı Yönetimi | `kullanici-yonetimi.html` | Yetkili kullanıcılar, roller ve sayfa erişim matrisi |

### Sidebar kabuk (alternatif arayüz)

| Sayfa | Dosya | İşlev |
|-------|-------|-------|
| Genel Bakış | `index.html` | Yan menülü dashboard görünümü |

### Yardımcı sayfalar

| Sayfa | Dosya | İşlev |
|-------|-------|-------|
| Logo Seçimi | `logo-secim.html` | Marka/logo alternatiflerinin karşılaştırılması |

---

## Menü Yapısı (Ribbon)

| Sekme | Alt sayfalar / modüller |
|-------|-------------------------|
| **Genel** | Genel Bakış |
| **Süreç** | Süreç Kokpiti |
| **Mutabakat** | Kebir Hesapları Sorumluluk Listesi, Mizan, Yevmiye Defteri, Masraf Hesapları |
| **Raporlama** | Bilanço, Gelir Tablosu, Ters Bakiye Raporu, Nazım Hesapları, Excel Dışa Aktar |
| **Ayarlar** | Tema ve uygulama ayarları |
| **Yönetim** | Kullanıcı Yönetimi |

---

## Veri Katmanları (Süreç Kokpiti)

Süreç kokpiti (`surec-cockpit.js`) üç sütun halinde dataset ve task akışlarını gösterir:

| Katman | Rol | Örnek dataset'ler |
|--------|-----|-------------------|
| **TDSTG** | Staging — ham veri | Banka Ham Veri, Muhasebe Raw, Döviz Kurları |
| **TDMAIN** | Ana veri — kurumsal çekirdek | Kebir Defteri, Mizan, Yevmiye, Hesap Planı |
| **TDREPORT** | Raporlama — analitik | Bilanço, Gelir Tablosu, Ters Bakiye, Nazım Hesapları |

Her dataset için task durumları: **tamamlandı (✓)**, **devam ediyor (◉)**, **bekliyor (○)**.

---

## Kullanıcı Yönetimi

`kullanici-yonetimi.js` içinde tanımlı roller:

- **Sistem Yöneticisi** — tüm modüllere erişim
- **Mutabakat Sorumlusu** — genel bakış + mutabakat sayfaları
- **Raporlama Uzmanı** — genel bakış + raporlama sayfaları
- **Süreç Koordinatörü** — genel bakış + süreç yönetimi
- **Görüntüleyici** — yalnızca genel bakış

---

## Veritabanı Şeması (TDUTIL.VIB)

Uygulama verisi tek şemada toplanır. Tam CREATE scriptleri: `database/migrations/002_tdutil_vib_schema_en.sql`

| Grup | Tablolar | Açıklama |
|------|----------|----------|
| Referans | `Team`, `Page`, `DataLayer`, `DataDomain` | Ekipler, menü sayfaları, veri katmanları |
| Güvenlik | `Role`, `User`, `RolePagePermission`, `UserPagePermission` | RBAC ve kişi bazlı yetki override |
| Konfigürasyon | `DataSource`, `SystemParameter` | TD bağlantıları, sistem parametreleri |
| Operasyon | `CorporateAccount`, `ReconciliationPeriod`, `VarianceAccount`, `ProcessDataset`, `ProcessTaskDefinition`, `ProcessTaskStatus`, `DataQualityRule`, `DataQualityRuleResult`, `SavedQuery`, `ReportDefinition` | İş verisi |
| Audit | `ActivityLog`, `QueryExecutionLog` | Aktivite ve sorgu logları |
| View | `vw_PortalSummary`, `vw_TeamReconciliationProgress`, `vw_TeamWorkload` | Portal aggregate sorguları |

Seed scriptleri (`database/seeds/`) demo kullanıcı, rol, süreç dataset ve mutabakat verilerini yükler.

## Dosya Yapısı

```
MerkeziFinansalVeri/
├── MerkeziFinansalVeri.sln
├── api-client.js              # Önyüz HTTP katmanı (fetch wrapper)
│
├── database/
│   ├── migrations/            # SQL şema scriptleri
│   ├── seeds/                 # Demo seed verileri
│   └── setup.ps1              # Kurulum scripti
│
├── src/
│   ├── MerkeziFinansalVeri.Api/           # ASP.NET Core Web API
│   ├── MerkeziFinansalVeri.Domain/        # Entity modelleri
│   └── MerkeziFinansalVeri.Infrastructure/ # EF Core, TD servisleri
│
├── HomePage.html              # Ribbon — Genel Bakış (portal API)
├── surec.html                 # Ribbon — Süreç Kokpiti
├── kebir-hesaplari.html/js    # Kurumsal hesap CRUD (API)
├── mutabakat-pages.js         # Dönem + fark veren (API)
├── mizan.js                   # Mizan görev durumu (API)
├── kullanici-yonetimi.js      # Kullanıcı/rol (API)
├── kisi-yetkileri.js          # Kişi bazlı yetki (API)
├── veri-kalitesi-pages.js     # VK kurallar/sonuçlar (API)
├── veritabani-baglantisi.js   # Veri kaynağı yönetimi (API)
│
├── FinansalVeriApp/           # WPF masaüstü prototipi (eski)
│
├── README.md
└── PROJE-OZETI.md             # Bu dosya
```

---

## Ortak Bileşenler

- **Tema:** Koyu / açık mod; ribbon sekmeleri satırında toggle, `localStorage` ile kalıcı
- **Marka:** Merkezi Güvenilir Finansal Veri — kalkan + veri çizgisi SVG logosu
- **İkonlar:** [Tabler Icons](https://tabler.io/icons) (CDN)
- **Kullanıcı adı:** `localStorage.userName` veya varsayılan "Ahmet Yılmaz"

---

## Çalıştırma

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

Statik dosyalar için HTTP sunucusu gerekir. API çalışır durumda olmalıdır:

```bash
python -m http.server 8080
```

Tarayıcıda `http://localhost:8080/HomePage.html` açın.

### WPF masaüstü uygulaması (eski prototip)

```bash
dotnet run --project FinansalVeriApp/FinansalVeriApp.csproj
```

---

## Geliştirme Notları

- **SQL altyapısı:** Tüm iş modülleri `TDUTIL.VIB` şemasındaki tablolardan beslenir; önyüz `api-client.js` ile REST API'ye bağlanır.
- Ribbon sayfaları birbirine `data-href` ile bağlanır; `HomePage.html` portal özetini `/api/portal/ozet` endpoint'inden alır.
- Mutabakat, mizan, süreç kokpiti ve kullanıcı yönetimi sayfaları API entegrasyonu tamamlanmıştır.
- TDMAIN/TDREPORT bağlantıları `VIB.DataSource` tablosundan okunur; fark veren bakiyeler `FarkVerenSyncService` ile senkronize edilir.
- Tema tercihi istemci tarafında kalır; gerçek ortamda JWT veya AD kimlik doğrulama önerilir.

---

## Depo

GitHub: [ugurceren/MerkeziFinansalVeri](https://github.com/ugurceren/MerkeziFinansalVeri)
