USE [TDUTIL];
GO

/*
    sec_RolePagePermission boş kaldıysa bu scripti çalıştırın.
    Önkoşul: VIB.ref_Page ve VIB.sec_Role dolu olmalı.
*/

DECLARE @RefPageCount INT;
DECLARE @SecRoleCount INT;
DECLARE @SecUserCount INT;
DECLARE @PermCount INT;

SELECT @RefPageCount = COUNT(*) FROM VIB.ref_Page;
SELECT @SecRoleCount = COUNT(*) FROM VIB.sec_Role;
SELECT @SecUserCount = COUNT(*) FROM VIB.sec_User WHERE IsDeleted = 0;
SELECT @PermCount = COUNT(*) FROM VIB.sec_RolePagePermission;

PRINT N'--- Teşhis ---';
PRINT N'ref_Page        : ' + CAST(@RefPageCount AS NVARCHAR(20));
PRINT N'sec_Role        : ' + CAST(@SecRoleCount AS NVARCHAR(20));
PRINT N'sec_User        : ' + CAST(@SecUserCount AS NVARCHAR(20));
PRINT N'RolePagePerm    : ' + CAST(@PermCount AS NVARCHAR(20));
GO

-- Eksik roller
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
WHEN NOT MATCHED BY TARGET THEN
    INSERT (RoleId, Name, Description, BadgeClass)
    VALUES (src.RoleId, src.Name, src.Description, src.BadgeClass);
GO

;WITH RolSayfa AS (
    SELECT RoleId, PageId FROM (VALUES
        (N'admin', N'portal'), (N'admin', N'surec'), (N'admin', N'datasetler'), (N'admin', N'task-listesi'),
        (N'admin', N'mizan'), (N'admin', N'mutabakat-donem'), (N'admin', N'fark-veren'), (N'admin', N'kebir'),
        (N'admin', N'vk-kurallar'), (N'admin', N'vk-gunluk'), (N'admin', N'veritabani-sorgu'),
        (N'admin', N'ters-bakiye'), (N'admin', N'nazim'), (N'admin', N'ayarlar'),
        (N'admin', N'kullanici-yonetimi'), (N'admin', N'kisi-yetkileri'), (N'admin', N'veritabani-baglantisi'),
        (N'mutabakat', N'portal'), (N'mutabakat', N'kebir'), (N'mutabakat', N'mizan'),
        (N'mutabakat', N'mutabakat-donem'), (N'mutabakat', N'fark-veren'),
        (N'rapor', N'portal'), (N'rapor', N'veritabani-sorgu'), (N'rapor', N'ters-bakiye'), (N'rapor', N'nazim'),
        (N'surec', N'portal'), (N'surec', N'surec'), (N'surec', N'datasetler'), (N'surec', N'task-listesi'),
        (N'veri-kalitesi', N'portal'), (N'veri-kalitesi', N'vk-kurallar'), (N'veri-kalitesi', N'vk-gunluk'),
        (N'viewer', N'portal')
    ) AS v(RoleId, PageId)
)
SELECT COUNT(*) AS EklenebilirIzinSayisi
FROM RolSayfa rs
WHERE EXISTS (SELECT 1 FROM VIB.sec_Role r WHERE r.RoleId = rs.RoleId)
  AND EXISTS (SELECT 1 FROM VIB.ref_Page p WHERE p.PageId = rs.PageId)
  AND NOT EXISTS (
      SELECT 1 FROM VIB.sec_RolePagePermission x
      WHERE x.RoleId = rs.RoleId AND x.PageId = rs.PageId
  );
GO

;WITH RolSayfa AS (
    SELECT RoleId, PageId FROM (VALUES
        (N'admin', N'portal'), (N'admin', N'surec'), (N'admin', N'datasetler'), (N'admin', N'task-listesi'),
        (N'admin', N'mizan'), (N'admin', N'mutabakat-donem'), (N'admin', N'fark-veren'), (N'admin', N'kebir'),
        (N'admin', N'vk-kurallar'), (N'admin', N'vk-gunluk'), (N'admin', N'veritabani-sorgu'),
        (N'admin', N'ters-bakiye'), (N'admin', N'nazim'), (N'admin', N'ayarlar'),
        (N'admin', N'kullanici-yonetimi'), (N'admin', N'kisi-yetkileri'), (N'admin', N'veritabani-baglantisi'),
        (N'mutabakat', N'portal'), (N'mutabakat', N'kebir'), (N'mutabakat', N'mizan'),
        (N'mutabakat', N'mutabakat-donem'), (N'mutabakat', N'fark-veren'),
        (N'rapor', N'portal'), (N'rapor', N'veritabani-sorgu'), (N'rapor', N'ters-bakiye'), (N'rapor', N'nazim'),
        (N'surec', N'portal'), (N'surec', N'surec'), (N'surec', N'datasetler'), (N'surec', N'task-listesi'),
        (N'veri-kalitesi', N'portal'), (N'veri-kalitesi', N'vk-kurallar'), (N'veri-kalitesi', N'vk-gunluk'),
        (N'viewer', N'portal')
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

-- ref_Page'de bulunmayan PageId'ler
;WITH RolSayfa AS (
    SELECT RoleId, PageId FROM (VALUES
        (N'admin', N'portal'), (N'admin', N'surec'), (N'admin', N'datasetler'), (N'admin', N'task-listesi'),
        (N'admin', N'mizan'), (N'admin', N'mutabakat-donem'), (N'admin', N'fark-veren'), (N'admin', N'kebir'),
        (N'admin', N'vk-kurallar'), (N'admin', N'vk-gunluk'), (N'admin', N'veritabani-sorgu'),
        (N'admin', N'ters-bakiye'), (N'admin', N'nazim'), (N'admin', N'ayarlar'),
        (N'admin', N'kullanici-yonetimi'), (N'admin', N'kisi-yetkileri'), (N'admin', N'veritabani-baglantisi'),
        (N'mutabakat', N'portal'), (N'mutabakat', N'kebir'), (N'mutabakat', N'mizan'),
        (N'mutabakat', N'mutabakat-donem'), (N'mutabakat', N'fark-veren'),
        (N'rapor', N'portal'), (N'rapor', N'veritabani-sorgu'), (N'rapor', N'ters-bakiye'), (N'rapor', N'nazim'),
        (N'surec', N'portal'), (N'surec', N'surec'), (N'surec', N'datasetler'), (N'surec', N'task-listesi'),
        (N'veri-kalitesi', N'portal'), (N'veri-kalitesi', N'vk-kurallar'), (N'veri-kalitesi', N'vk-gunluk'),
        (N'viewer', N'portal')
    ) AS v(RoleId, PageId)
)
SELECT rs.RoleId, rs.PageId AS EksikPageId
FROM RolSayfa rs
WHERE NOT EXISTS (SELECT 1 FROM VIB.ref_Page p WHERE p.PageId = rs.PageId);
GO

-- ref_Page'deki mevcut PageId listesi (karşılaştırma için)
SELECT PageId, Label FROM VIB.ref_Page ORDER BY SortOrder;
GO

DECLARE @FinalPermCount INT;
SELECT @FinalPermCount = COUNT(*) FROM VIB.sec_RolePagePermission;
PRINT N'--- Sonuç ---';
PRINT N'sec_RolePagePermission kayit sayisi: ' + CAST(@FinalPermCount AS NVARCHAR(20));
GO

SELECT r.RoleId, r.Name, COUNT(p.PageId) AS SayfaSayisi
FROM VIB.sec_Role r
LEFT JOIN VIB.sec_RolePagePermission p ON p.RoleId = r.RoleId
GROUP BY r.RoleId, r.Name
ORDER BY r.RoleId;
GO
