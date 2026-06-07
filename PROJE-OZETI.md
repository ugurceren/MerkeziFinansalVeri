# Merkezi Güvenilir Finansal Veri — Proje Özeti

Kurumsal finansal veri mutabakatı, süreç izleme ve raporlama için geliştirilen **Merkezi Güvenilir Finansal Veri** platformunun özet dokümantasyonu.

---

## Amaç

Banka ve merkezi sistemlerden gelen finansal verilerin tek bir merkezde toplanması, mutabakat süreçlerinin yönetilmesi ve raporlama katmanına aktarılması. Uygulama; **staging (TDSTG) → ana veri (TDMAIN) → raporlama (TDREPORT)** veri katmanları üzerine kurulu bir iş akışını destekler.

---

## Mimari Genel Bakış

Proje iki ana yüzeyden oluşur:

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Web arayüzü** | HTML, CSS, JavaScript | Statik sayfalar; ribbon ve sidebar olmak üzere iki kabuk |
| **Masaüstü uygulaması** | .NET 8 WPF (C#) | Kurumsal hesap CRUD ve filtreleme prototipi |

Web tarafında backend/API yoktur; veriler JavaScript içinde statik/örnek olarak tutulur. Tema tercihi `localStorage` ile saklanır.

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

## Dosya Yapısı

```
MerkeziFinansalVeri/
├── HomePage.html              # Ribbon — Genel Bakış
├── surec.html                 # Ribbon — Süreç Kokpiti
├── kebir-hesaplari.html       # Ribbon — Mutabakat tablosu
├── kullanici-yonetimi.html    # Ribbon — Kullanıcı & rol yönetimi
├── index.html                 # Sidebar — Genel Bakış
├── logo-secim.html            # Logo karşılaştırma
│
├── ribbon.css                 # Ribbon ortak stiller
├── ribbon-shell.js            # Ribbon navigasyon ve kullanıcı çubuğu
├── homepage.css               # Ribbon sayfa özelleştirmeleri
├── surec-cockpit.js / .css    # Süreç kokpiti mantığı ve stilleri
├── kullanici-yonetimi.js / .css
├── theme-toggle.js / theme-menu.css   # Koyu/açık tema
├── styles.css / dashboard.css / script.js   # Sidebar arayüzü
│
├── FinansalVeriApp/           # WPF masaüstü uygulaması
│   ├── MainWindow.xaml(.cs)
│   ├── CorporateAccount.cs
│   └── FinansalVeriApp.csproj
│
├── README.md                  # WPF çalıştırma kılavuzu
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

### Web arayüzü

Statik dosyalar olduğu için herhangi bir HTTP sunucusu yeterlidir:

```bash
# Örnek: Python ile yerel sunucu
python -m http.server 8080
```

Tarayıcıda `http://localhost:8080/HomePage.html` adresini açın.

### WPF masaüstü uygulaması

```bash
dotnet build FinansalVeriApp/FinansalVeriApp.csproj
dotnet run --project FinansalVeriApp/FinansalVeriApp.csproj
```

---

## Geliştirme Notları

- Ribbon sayfaları birbirine `data-href` ile bağlanır; `HomePage.html` tek sayfa uygulama (SPA) davranışı da içerir.
- Mutabakat tablosu (`kebir-hesaplari.html`) satır ekleme, düzenleme, silme ve filtreleme destekler.
- Süreç kokpiti canlı saat gösterir; task durumları şu an statik örnek veridir — ileride API/WebSocket ile beslenebilir.
- Kullanıcı ve rol verileri demo amaçlıdır; gerçek ortamda kimlik doğrulama servisi gerekir.

---

## Depo

GitHub: [ugurceren/MerkeziFinansalVeri](https://github.com/ugurceren/MerkeziFinansalVeri)
