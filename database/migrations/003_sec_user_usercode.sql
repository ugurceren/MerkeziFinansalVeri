USE [TDUTIL];
GO

IF COL_LENGTH('VIB.sec_User', 'UserCode') IS NULL
BEGIN
    ALTER TABLE VIB.sec_User
    ADD UserCode NVARCHAR(50) NOT NULL
        CONSTRAINT DF_sec_User_UserCode DEFAULT (N'');
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_sec_User_UserCode'
      AND object_id = OBJECT_ID(N'VIB.sec_User')
)
BEGIN
    CREATE UNIQUE INDEX UX_sec_User_UserCode
    ON VIB.sec_User (UserCode)
    WHERE IsDeleted = 0 AND UserCode <> N'';
END
GO
