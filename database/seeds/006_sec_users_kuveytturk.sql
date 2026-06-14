USE [TDUTIL];
GO

-- Kuveyt Türk kullanıcıları
MERGE VIB.sec_User AS tgt
USING (VALUES
    (5124, N'uceren',   N'Uğur Çeren',           N'ugur.ceren@kuveytturk.com.tr',           N'admin',          N'active'),
    (5853, N'myanik',   N'Mesut Yanık',         N'mesut.yanik@kuveytturk.com.tr',         N'rapor',          N'active'),
    (5067, N'selime',   N'Selim Eşki',           N'selim.eski@kuveytturk.com.tr',           N'surec',          N'active'),
    (9653, N'ibrahimt', N'İbrahim Tahtabiçen', N'ibrahim.tahtabicen@kuveytturk.com.tr', N'veri-kalitesi',  N'active')
) AS src (UserId, UserCode, Name, Email, RoleId, Status)
ON tgt.UserId = src.UserId
WHEN MATCHED THEN
    UPDATE SET
        UserCode  = src.UserCode,
        Name      = src.Name,
        Email     = src.Email,
        RoleId    = src.RoleId,
        Status    = src.Status,
        UpdatedAt = SYSUTCDATETIME(),
        IsDeleted = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (UserId, UserCode, Name, Email, RoleId, Status)
    VALUES (src.UserId, src.UserCode, src.Name, src.Email, src.RoleId, src.Status);
GO

-- Eski demo kullanıcıları pasifleştir
UPDATE VIB.sec_User
SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME()
WHERE UserId IN (1, 2, 3, 4, 5, 6, 7, 8, 9)
  AND UserId NOT IN (5124, 5853, 5067, 9653);
GO

-- UserId 9 (eski Uğur Çeren) referanslarını 5124'e taşı
IF EXISTS (SELECT 1 FROM VIB.sec_User WHERE UserId = 9 AND IsDeleted = 1)
BEGIN
    UPDATE VIB.sec_UserPagePermission SET UserId = 5124 WHERE UserId = 9;
    UPDATE VIB.audit_ActivityLog SET UserId = 5124 WHERE UserId = 9;
    UPDATE VIB.audit_QueryExecutionLog SET UserId = 5124 WHERE UserId = 9;

    IF COL_LENGTH('VIB.ops_CorporateAccount', 'CreatedByUserId') IS NOT NULL
        UPDATE VIB.ops_CorporateAccount SET CreatedByUserId = 5124 WHERE CreatedByUserId = 9;
    IF COL_LENGTH('VIB.ops_CorporateAccount', 'UpdatedByUserId') IS NOT NULL
        UPDATE VIB.ops_CorporateAccount SET UpdatedByUserId = 5124 WHERE UpdatedByUserId = 9;
    IF OBJECT_ID(N'VIB.ops_ProcessTaskRestartLog', N'U') IS NOT NULL
        UPDATE VIB.ops_ProcessTaskRestartLog SET UserId = 5124 WHERE UserId = 9;
    IF OBJECT_ID(N'VIB.ops_SavedQuery', N'U') IS NOT NULL
        UPDATE VIB.ops_SavedQuery SET CreatedByUserId = 5124 WHERE CreatedByUserId = 9;
END
GO
