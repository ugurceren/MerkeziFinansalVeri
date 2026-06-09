-- MGTV_Uygulama initial schema
-- Collation: Turkish_CI_AS recommended for production

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'MGTV_Uygulama')
BEGIN
    CREATE DATABASE [MGTV_Uygulama];
END
GO

USE [MGTV_Uygulama];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'ref') EXEC('CREATE SCHEMA ref');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'ops') EXEC('CREATE SCHEMA ops');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'sec') EXEC('CREATE SCHEMA sec');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'cfg') EXEC('CREATE SCHEMA cfg');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'audit') EXEC('CREATE SCHEMA audit');
GO

-- ref.Ekip
IF OBJECT_ID(N'ref.Ekip', N'U') IS NULL
CREATE TABLE ref.Ekip (
    EkipId          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(100) NOT NULL,
    Aktif           BIT NOT NULL DEFAULT 1,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    GuncellemeZamani DATETIME2 NULL,
    SilindiMi       BIT NOT NULL DEFAULT 0
);
GO

-- ref.Sayfa
IF OBJECT_ID(N'ref.Sayfa', N'U') IS NULL
CREATE TABLE ref.Sayfa (
    SayfaId         NVARCHAR(50) NOT NULL PRIMARY KEY,
    Bolum           NVARCHAR(100) NOT NULL,
    BolumIkon       NVARCHAR(50) NULL,
    Etiket          NVARCHAR(200) NOT NULL,
    Href            NVARCHAR(500) NULL,
    Sira            INT NOT NULL DEFAULT 0
);
GO

-- ref.VeriKatmani
IF OBJECT_ID(N'ref.VeriKatmani', N'U') IS NULL
CREATE TABLE ref.VeriKatmani (
    KatmanKodu      NVARCHAR(20) NOT NULL PRIMARY KEY,
    Rol             NVARCHAR(200) NOT NULL,
    Tema            NVARCHAR(20) NOT NULL,
    Sira            INT NOT NULL DEFAULT 0
);
GO

-- ref.VeriDomain
IF OBJECT_ID(N'ref.VeriDomain', N'U') IS NULL
CREATE TABLE ref.VeriDomain (
    DomainId        NVARCHAR(50) NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(100) NOT NULL,
    Tema            NVARCHAR(20) NOT NULL,
    Sira            INT NOT NULL DEFAULT 0
);
GO

-- sec.Rol
IF OBJECT_ID(N'sec.Rol', N'U') IS NULL
CREATE TABLE sec.Rol (
    RolId           NVARCHAR(50) NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(100) NOT NULL,
    Aciklama        NVARCHAR(500) NULL,
    RozetSinifi     NVARCHAR(50) NULL
);
GO

-- sec.Kullanici
IF OBJECT_ID(N'sec.Kullanici', N'U') IS NULL
CREATE TABLE sec.Kullanici (
    KullaniciId     INT NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(200) NOT NULL,
    Eposta          NVARCHAR(200) NOT NULL,
    RolId           NVARCHAR(50) NOT NULL REFERENCES sec.Rol(RolId),
    Durum           NVARCHAR(20) NOT NULL DEFAULT N'active',
    SonGiris        DATETIME2 NULL,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    GuncellemeZamani DATETIME2 NULL,
    SilindiMi       BIT NOT NULL DEFAULT 0
);
GO

-- sec.RolSayfaYetki
IF OBJECT_ID(N'sec.RolSayfaYetki', N'U') IS NULL
CREATE TABLE sec.RolSayfaYetki (
    RolId           NVARCHAR(50) NOT NULL REFERENCES sec.Rol(RolId),
    SayfaId         NVARCHAR(50) NOT NULL REFERENCES ref.Sayfa(SayfaId),
    PRIMARY KEY (RolId, SayfaId)
);
GO

-- sec.KullaniciSayfaYetki
IF OBJECT_ID(N'sec.KullaniciSayfaYetki', N'U') IS NULL
CREATE TABLE sec.KullaniciSayfaYetki (
    KullaniciId     INT NOT NULL REFERENCES sec.Kullanici(KullaniciId),
    SayfaId         NVARCHAR(50) NOT NULL REFERENCES ref.Sayfa(SayfaId),
    IzinVerildi     BIT NOT NULL DEFAULT 1,
    PRIMARY KEY (KullaniciId, SayfaId)
);
GO

-- cfg.VeriKaynagi
IF OBJECT_ID(N'cfg.VeriKaynagi', N'U') IS NULL
CREATE TABLE cfg.VeriKaynagi (
    KaynakId        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    KatmanKodu      NVARCHAR(20) NOT NULL REFERENCES ref.VeriKatmani(KatmanKodu),
    Sunucu          NVARCHAR(200) NOT NULL,
    Veritabani      NVARCHAR(100) NOT NULL,
    Port            INT NOT NULL DEFAULT 1433,
    KimlikDogrulama NVARCHAR(20) NOT NULL DEFAULT N'sql',
    KullaniciAdi    NVARCHAR(100) NULL,
    SifreSaklandi   BIT NOT NULL DEFAULT 0,
    Durum           NVARCHAR(20) NOT NULL DEFAULT N'unknown',
    GuncellemeZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- cfg.SistemParametre
IF OBJECT_ID(N'cfg.SistemParametre', N'U') IS NULL
CREATE TABLE cfg.SistemParametre (
    Anahtar         NVARCHAR(100) NOT NULL PRIMARY KEY,
    Deger           NVARCHAR(500) NOT NULL,
    GuncellemeZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- ops.KurumsalHesap
IF OBJECT_ID(N'ops.KurumsalHesap', N'U') IS NULL
CREATE TABLE ops.KurumsalHesap (
    HesapNo         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    HesapId         INT NOT NULL,
    HesapAdi        NVARCHAR(200) NOT NULL,
    EkipId          INT NOT NULL REFERENCES ref.Ekip(EkipId),
    BeklenenAksiyon NVARCHAR(100) NULL,
    Kaynak          NVARCHAR(50) NULL,
    KayitTarihi     DATE NOT NULL,
    GuncellemeTarihi DATETIME2 NOT NULL,
    OlusturanKullaniciId INT NULL REFERENCES sec.Kullanici(KullaniciId),
    GuncelleyenKullaniciId INT NULL REFERENCES sec.Kullanici(KullaniciId),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SilindiMi       BIT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_KurumsalHesap_HesapId UNIQUE (HesapId)
);
GO

-- ops.MutabakatDonem
IF OBJECT_ID(N'ops.MutabakatDonem', N'U') IS NULL
CREATE TABLE ops.MutabakatDonem (
    DonemId         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    YilAy           CHAR(7) NOT NULL,
    Etiket          NVARCHAR(100) NOT NULL,
    Durum           NVARCHAR(20) NOT NULL,
    HesapSayisi     INT NOT NULL DEFAULT 0,
    FarkVerenSayisi INT NOT NULL DEFAULT 0,
    KapanisTarihi   DATE NULL,
    AktifMi         BIT NOT NULL DEFAULT 0,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    GuncellemeZamani DATETIME2 NULL,
    CONSTRAINT UQ_MutabakatDonem_YilAy UNIQUE (YilAy)
);
GO

-- ops.FarkVerenHesap
IF OBJECT_ID(N'ops.FarkVerenHesap', N'U') IS NULL
CREATE TABLE ops.FarkVerenHesap (
    FarkId          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    DonemId         INT NOT NULL REFERENCES ops.MutabakatDonem(DonemId),
    HesapKodu       NVARCHAR(50) NOT NULL,
    HesapAdi        NVARCHAR(200) NOT NULL,
    EkipId          INT NOT NULL REFERENCES ref.Ekip(EkipId),
    MizanBakiye     DECIMAL(18,2) NOT NULL DEFAULT 0,
    KartonBakiye    DECIMAL(18,2) NOT NULL DEFAULT 0,
    Fark            AS (MizanBakiye - KartonBakiye) PERSISTED,
    Durum           NVARCHAR(20) NOT NULL DEFAULT N'acik',
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    GuncellemeZamani DATETIME2 NULL,
    SilindiMi       BIT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_FarkVerenHesap_DonemHesap UNIQUE (DonemId, HesapKodu)
);
GO

-- ops.SurecDataset
IF OBJECT_ID(N'ops.SurecDataset', N'U') IS NULL
CREATE TABLE ops.SurecDataset (
    DatasetId       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Kod             NVARCHAR(50) NOT NULL,
    Etiket          NVARCHAR(200) NOT NULL,
    KatmanKodu      NVARCHAR(20) NULL REFERENCES ref.VeriKatmani(KatmanKodu),
    DomainId        NVARCHAR(50) NULL REFERENCES ref.VeriDomain(DomainId),
    Sira            INT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_SurecDataset_Kod UNIQUE (Kod)
);
GO

-- ops.SurecGorevTanim
IF OBJECT_ID(N'ops.SurecGorevTanim', N'U') IS NULL
CREATE TABLE ops.SurecGorevTanim (
    GorevTanimId    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    DatasetId       INT NOT NULL REFERENCES ops.SurecDataset(DatasetId),
    Etiket          NVARCHAR(100) NOT NULL,
    Sira            INT NOT NULL DEFAULT 0
);
GO

-- ops.SurecGorevDurum
IF OBJECT_ID(N'ops.SurecGorevDurum', N'U') IS NULL
CREATE TABLE ops.SurecGorevDurum (
    GorevDurumId    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    GorevTanimId    INT NOT NULL REFERENCES ops.SurecGorevTanim(GorevTanimId),
    DonemId         INT NULL REFERENCES ops.MutabakatDonem(DonemId),
    Durum           NVARCHAR(20) NOT NULL DEFAULT N'pending',
    SonGuncelleme   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_SurecGorevDurum UNIQUE (GorevTanimId, DonemId)
);
GO

-- ops.SurecGorevYenidenBaslatmaLog
IF OBJECT_ID(N'ops.SurecGorevYenidenBaslatmaLog', N'U') IS NULL
CREATE TABLE ops.SurecGorevYenidenBaslatmaLog (
    LogId           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    GorevTanimId    INT NOT NULL REFERENCES ops.SurecGorevTanim(GorevTanimId),
    KullaniciId     INT NULL REFERENCES sec.Kullanici(KullaniciId),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- ops.VeriKalitesiKural
IF OBJECT_ID(N'ops.VeriKalitesiKural', N'U') IS NULL
CREATE TABLE ops.VeriKalitesiKural (
    KuralId         NVARCHAR(20) NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(200) NOT NULL,
    Alan            NVARCHAR(100) NOT NULL,
    Onem            NVARCHAR(20) NOT NULL,
    Durum           NVARCHAR(20) NOT NULL DEFAULT N'Aktif',
    SqlIfade        NVARCHAR(MAX) NULL,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    GuncellemeZamani DATETIME2 NULL
);
GO

-- ops.VeriKalitesiKuralSonuc
IF OBJECT_ID(N'ops.VeriKalitesiKuralSonuc', N'U') IS NULL
CREATE TABLE ops.VeriKalitesiKuralSonuc (
    SonucId         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CalistirmaTarihi DATE NOT NULL,
    KuralId         NVARCHAR(20) NOT NULL REFERENCES ops.VeriKalitesiKural(KuralId),
    GecenSayi       INT NOT NULL DEFAULT 0,
    HataliSayi      INT NOT NULL DEFAULT 0,
    Sonuc           NVARCHAR(20) NOT NULL,
    DetayJson       NVARCHAR(MAX) NULL
);
GO
CREATE NONCLUSTERED INDEX IX_VeriKalitesiKuralSonuc_Tarih ON ops.VeriKalitesiKuralSonuc (CalistirmaTarihi DESC, KuralId);
GO

-- ops.KayitliSorgu
IF OBJECT_ID(N'ops.KayitliSorgu', N'U') IS NULL
CREATE TABLE ops.KayitliSorgu (
    SorguId         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(200) NOT NULL,
    KatmanKodu      NVARCHAR(20) NOT NULL,
    SqlMetin        NVARCHAR(MAX) NOT NULL,
    OlusturanKullaniciId INT NULL REFERENCES sec.Kullanici(KullaniciId),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- ops.RaporTanim
IF OBJECT_ID(N'ops.RaporTanim', N'U') IS NULL
CREATE TABLE ops.RaporTanim (
    RaporKodu       NVARCHAR(50) NOT NULL PRIMARY KEY,
    Ad              NVARCHAR(200) NOT NULL,
    KaynakKatman    NVARCHAR(20) NOT NULL,
    ViewAdi         NVARCHAR(200) NULL,
    SpAdi           NVARCHAR(200) NULL
);
GO

-- ops.RaporSonucSnapshot
IF OBJECT_ID(N'ops.RaporSonucSnapshot', N'U') IS NULL
CREATE TABLE ops.RaporSonucSnapshot (
    SnapshotId      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    RaporKodu       NVARCHAR(50) NOT NULL REFERENCES ops.RaporTanim(RaporKodu),
    DonemId         INT NULL REFERENCES ops.MutabakatDonem(DonemId),
    JsonSonuc       NVARCHAR(MAX) NULL,
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- audit.AktiviteLog
IF OBJECT_ID(N'audit.AktiviteLog', N'U') IS NULL
CREATE TABLE audit.AktiviteLog (
    LogId           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OlayTipi        NVARCHAR(50) NOT NULL,
    Baslik          NVARCHAR(200) NOT NULL,
    Detay           NVARCHAR(500) NULL,
    KullaniciId     INT NULL REFERENCES sec.Kullanici(KullaniciId),
    OlusturmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- audit.SorguCalistirmaLog
IF OBJECT_ID(N'audit.SorguCalistirmaLog', N'U') IS NULL
CREATE TABLE audit.SorguCalistirmaLog (
    LogId           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SorguId         INT NULL,
    KatmanKodu      NVARCHAR(20) NOT NULL,
    CalistirmaZamani DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SatirSayisi     INT NULL,
    SureMs          INT NULL,
    Hata            NVARCHAR(MAX) NULL,
    KullaniciId     INT NULL REFERENCES sec.Kullanici(KullaniciId)
);
GO

-- Portal views
IF OBJECT_ID(N'dbo.vw_PortalOzet', N'V') IS NOT NULL DROP VIEW dbo.vw_PortalOzet;
GO
CREATE VIEW dbo.vw_PortalOzet AS
SELECT
    (SELECT COUNT(*) FROM ops.KurumsalHesap WHERE SilindiMi = 0) AS KurumsalHesapSayisi,
    (SELECT COUNT(*) FROM ops.MutabakatDonem) AS MutabakatDonemSayisi,
    (SELECT COUNT(*) FROM ops.FarkVerenHesap WHERE SilindiMi = 0 AND Durum IN (N'acik', N'inceleniyor')) AS AcikFarkSayisi,
    (SELECT COUNT(*) FROM ops.SurecGorevDurum WHERE Durum IN (N'running', N'pending')) AS BekleyenGorevSayisi;
GO

IF OBJECT_ID(N'dbo.vw_EkipMutabakatIlerleme', N'V') IS NOT NULL DROP VIEW dbo.vw_EkipMutabakatIlerleme;
GO
CREATE VIEW dbo.vw_EkipMutabakatIlerleme AS
SELECT
    e.EkipId,
    e.Ad AS EkipAdi,
    COUNT(f.FarkId) AS ToplamFark,
    SUM(CASE WHEN f.Durum = N'kapatildi' THEN 1 ELSE 0 END) AS KapatilanFark,
    CASE WHEN COUNT(f.FarkId) = 0 THEN 100
         ELSE CAST(SUM(CASE WHEN f.Durum = N'kapatildi' THEN 1 ELSE 0 END) * 100.0 / COUNT(f.FarkId) AS INT)
    END AS IlerlemeYuzde
FROM ref.Ekip e
LEFT JOIN ops.FarkVerenHesap f ON f.EkipId = e.EkipId AND f.SilindiMi = 0
WHERE e.Aktif = 1 AND e.SilindiMi = 0
GROUP BY e.EkipId, e.Ad;
GO

IF OBJECT_ID(N'dbo.vw_EkipIsYuku', N'V') IS NOT NULL DROP VIEW dbo.vw_EkipIsYuku;
GO
CREATE VIEW dbo.vw_EkipIsYuku AS
SELECT
    e.EkipId,
    e.Ad AS EkipAdi,
    SUM(CASE WHEN f.Durum IN (N'acik', N'inceleniyor') THEN 1 ELSE 0 END) AS AcikFarkSayisi,
    SUM(CASE WHEN f.Durum = N'acik' THEN 1 ELSE 0 END) AS BekleyenAksiyonSayisi
FROM ref.Ekip e
LEFT JOIN ops.FarkVerenHesap f ON f.EkipId = e.EkipId AND f.SilindiMi = 0
WHERE e.Aktif = 1 AND e.SilindiMi = 0
GROUP BY e.EkipId, e.Ad;
GO
