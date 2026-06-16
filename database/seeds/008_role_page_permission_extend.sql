USE [TDUTIL];
GO

/*
    Rol sayfa yetkileri genişletme:
      - Tüm roller: ayarlar
      - rapor + surec: mutabakat (mizan, mutabakat-donem, fark-veren)
      - rapor: kebir (parametre yönetimi)

    Mevcut DB'de çalıştırın (eksik izinleri ekler, mevcut kayıtları silmez).
*/

;WITH YeniIzin AS (
    SELECT RoleId, PageId FROM (VALUES
        (N'mutabakat', N'ayarlar'),
        (N'rapor', N'ayarlar'),
        (N'rapor', N'mizan'),
        (N'rapor', N'mutabakat-donem'),
        (N'rapor', N'fark-veren'),
        (N'rapor', N'matrixmap'),
        (N'rapor', N'kebir'),
        (N'surec', N'ayarlar'),
        (N'surec', N'mizan'),
        (N'surec', N'mutabakat-donem'),
        (N'surec', N'fark-veren'),
        (N'surec', N'matrixmap'),
        (N'veri-kalitesi', N'ayarlar'),
        (N'viewer', N'ayarlar')
    ) AS v(RoleId, PageId)
)
INSERT INTO VIB.sec_RolePagePermission (RoleId, PageId)
SELECT yi.RoleId, yi.PageId
FROM YeniIzin yi
WHERE EXISTS (SELECT 1 FROM VIB.sec_Role r WHERE r.RoleId = yi.RoleId)
  AND EXISTS (SELECT 1 FROM VIB.ref_Page p WHERE p.PageId = yi.PageId)
  AND NOT EXISTS (
      SELECT 1 FROM VIB.sec_RolePagePermission x
      WHERE x.RoleId = yi.RoleId AND x.PageId = yi.PageId
  );
GO

-- Rolde yeni izin var ama kullanici override ile reddedilmis kayitlari kaldir
DELETE up
FROM VIB.sec_UserPagePermission up
INNER JOIN VIB.sec_User u ON u.UserId = up.UserId AND u.IsDeleted = 0
INNER JOIN VIB.sec_RolePagePermission rp ON rp.RoleId = u.RoleId AND rp.PageId = up.PageId
WHERE up.IsGranted = 0
  AND up.PageId IN (N'ayarlar', N'mizan', N'mutabakat-donem', N'fark-veren', N'matrixmap', N'kebir');
GO

SELECT r.RoleId, r.Name, COUNT(p.PageId) AS SayfaSayisi
FROM VIB.sec_Role r
LEFT JOIN VIB.sec_RolePagePermission p ON p.RoleId = r.RoleId
GROUP BY r.RoleId, r.Name
ORDER BY r.RoleId;
GO
