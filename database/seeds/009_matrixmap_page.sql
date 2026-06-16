USE [TDUTIL];
GO

/*
    Matrix Map sayfasi (mutabakat menusu) — mevcut DB'ye ekler.
    Mutabakat sayfalarina (mizan, donem, fark-veren) erisen tum rollere matrixmap izni verilir.
*/

MERGE VIB.ref_Page AS tgt
USING (VALUES
    (N'matrixmap', N'MUTABAKAT', N'ti-scale', N'Matrix Map', N'mutabakat.html?view=matrixmap', 8)
) AS src(PageId, Section, SectionIcon, Label, Href, SortOrder)
ON tgt.PageId = src.PageId
WHEN MATCHED THEN
    UPDATE SET
        Section = src.Section,
        SectionIcon = src.SectionIcon,
        Label = src.Label,
        Href = src.Href,
        SortOrder = src.SortOrder
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PageId, Section, SectionIcon, Label, Href, SortOrder)
    VALUES (src.PageId, src.Section, src.SectionIcon, src.Label, src.Href, src.SortOrder);
GO

;WITH YeniIzin AS (
    SELECT DISTINCT rp.RoleId, N'matrixmap' AS PageId
    FROM VIB.sec_RolePagePermission rp
    WHERE rp.PageId IN (N'mizan', N'mutabakat-donem', N'fark-veren')
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

DELETE up
FROM VIB.sec_UserPagePermission up
INNER JOIN VIB.sec_User u ON u.UserId = up.UserId AND u.IsDeleted = 0
INNER JOIN VIB.sec_RolePagePermission rp ON rp.RoleId = u.RoleId AND rp.PageId = up.PageId
WHERE up.IsGranted = 0
  AND up.PageId = N'matrixmap';
GO
