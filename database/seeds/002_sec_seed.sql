USE [TDUTIL];
GO

/*
    Önkoşullar (sırayla çalıştırılmalı):
      1. database/migrations/001_initial_schema.sql
      2. database/seeds/001_ref_seed.sql   → VIB.ref_Page dolu olmalı
      3. bu dosya

    NOT: Eski İngilizce şema (002_tdutil_vib_schema_en.sql) kullanıyorsanız
    tablolar VIB.RolePagePermission / VIB.Page adındadır; bu seed VIB.sec_* yazar.
*/

-- VIB.sec_Role (ROLES)
MERGE VIB.sec_Role AS tgt
USING (VALUES
    (N'admin',          N'Sistem Yöneticisi',        N'Tüm modüllere tam erişim',              N'role-admin'),
    (N'mutabakat',      N'Mutabakat Sorumlusu',      N'Portal ve mutabakat sayfaları',         N'role-mutabakat'),
    (N'rapor',          N'Raporlama Uzmanı',         N'Portal ve raporlama sayfaları',         N'role-rapor'),
    (N'surec',          N'Süreç Koordinatörü',       N'Portal ve süreç yönetimi',              N'role-surec'),
    (N'veri-kalitesi',  N'Veri Kalitesi Sorumlusu',  N'Portal ve veri kalitesi sayfaları',     N'role-veri-kalitesi'),
    (N'viewer',         N'Görüntüleyici',            N'Yalnızca portal',                       N'role-viewer')
) AS src(RoleId, Name, Description, BadgeClass)
ON tgt.RoleId = src.RoleId
WHEN MATCHED THEN
    UPDATE SET Name = src.Name, Description = src.Description, BadgeClass = src.BadgeClass
WHEN NOT MATCHED BY TARGET THEN
    INSERT (RoleId, Name, Description, BadgeClass)
    VALUES (src.RoleId, src.Name, src.Description, src.BadgeClass);
GO

-- VIB.sec_User — Kuveyt Türk kullanıcıları (006_sec_users_kuveytturk.sql)

-- VIB.sec_RolePagePermission (role page permissions)
IF OBJECT_ID(N'VIB.sec_RolePagePermission', N'U') IS NULL
BEGIN
    RAISERROR(N'HATA: VIB.sec_RolePagePermission tablosu yok. Önce 001_initial_schema.sql çalıştırın. (Eski şema kullanıyorsanız tablo adı VIB.RolePagePermission olabilir.)', 16, 1);
END
GO

DECLARE @PageCount INT = (SELECT COUNT(*) FROM VIB.ref_Page);
IF @PageCount = 0
BEGIN
    RAISERROR(N'HATA: VIB.ref_Page boş. RolePagePermission eklenemez (FK). Önce 001_ref_seed.sql çalıştırın.', 16, 1);
END
GO

;WITH RolSayfa AS (
    SELECT RoleId, PageId FROM (VALUES
        (N'admin', N'portal'), (N'admin', N'surec'), (N'admin', N'datasetler'), (N'admin', N'task-listesi'),
        (N'admin', N'mizan'), (N'admin', N'mutabakat-donem'), (N'admin', N'fark-veren'), (N'admin', N'matrixmap'), (N'admin', N'kebir'),
        (N'admin', N'vk-kurallar'), (N'admin', N'vk-gunluk'), (N'admin', N'veritabani-sorgu'),
        (N'admin', N'ters-bakiye'), (N'admin', N'nazim'), (N'admin', N'ayarlar'),
        (N'admin', N'kullanici-yonetimi'), (N'admin', N'kisi-yetkileri'), (N'admin', N'veritabani-baglantisi'),
        (N'mutabakat', N'portal'), (N'mutabakat', N'kebir'), (N'mutabakat', N'mizan'),
        (N'mutabakat', N'mutabakat-donem'), (N'mutabakat', N'fark-veren'), (N'mutabakat', N'matrixmap'), (N'mutabakat', N'ayarlar'),
        (N'rapor', N'portal'), (N'rapor', N'veritabani-sorgu'), (N'rapor', N'ters-bakiye'), (N'rapor', N'nazim'),
        (N'rapor', N'mizan'), (N'rapor', N'mutabakat-donem'), (N'rapor', N'fark-veren'), (N'rapor', N'matrixmap'), (N'rapor', N'kebir'), (N'rapor', N'ayarlar'),
        (N'surec', N'portal'), (N'surec', N'surec'), (N'surec', N'datasetler'), (N'surec', N'task-listesi'),
        (N'surec', N'mizan'), (N'surec', N'mutabakat-donem'), (N'surec', N'fark-veren'), (N'surec', N'matrixmap'), (N'surec', N'ayarlar'),
        (N'veri-kalitesi', N'portal'), (N'veri-kalitesi', N'vk-kurallar'), (N'veri-kalitesi', N'vk-gunluk'), (N'veri-kalitesi', N'ayarlar'),
        (N'viewer', N'portal'), (N'viewer', N'ayarlar')
    ) AS v(RoleId, PageId)
)
INSERT INTO VIB.sec_RolePagePermission (RoleId, PageId)
SELECT rs.RoleId, rs.PageId
FROM RolSayfa rs
WHERE EXISTS (SELECT 1 FROM VIB.sec_Role r WHERE r.RoleId = rs.RoleId)
  AND EXISTS (SELECT 1 FROM VIB.ref_Page p WHERE p.PageId = rs.PageId)
  AND NOT EXISTS (
      SELECT 1 FROM VIB.sec_RolePagePermission x
      WHERE x.RoleId = rs.RoleId AND x.PageId = rs.PageId
  );
GO

DECLARE @PermCount INT = (SELECT COUNT(*) FROM VIB.sec_RolePagePermission);
PRINT CONCAT(N'sec_RolePagePermission kayit sayisi: ', @PermCount);
GO
