USE [TDUTIL];
GO

MERGE VIB.ref_Page AS tgt
USING (VALUES
    (N'aktivite-listesi', N'YÖNETİM', N'ti-history', N'Aktivite Listesi', N'aktivite-listesi.html', 19)
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

INSERT INTO VIB.sec_RolePagePermission (RoleId, PageId)
SELECT N'admin', N'aktivite-listesi'
WHERE EXISTS (SELECT 1 FROM VIB.sec_Role WHERE RoleId = N'admin')
  AND EXISTS (SELECT 1 FROM VIB.ref_Page WHERE PageId = N'aktivite-listesi')
  AND NOT EXISTS (
      SELECT 1 FROM VIB.sec_RolePagePermission
      WHERE RoleId = N'admin' AND PageId = N'aktivite-listesi'
  );
GO
