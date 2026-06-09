/*
    MGTV Application Schema — TDUTIL.VIB
    English table/column names, single schema (VIB)
    Recommended collation: Turkish_CI_AS
*/

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'TDUTIL')
BEGIN
    CREATE DATABASE [TDUTIL];
END
GO

USE [TDUTIL];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'VIB')
    EXEC('CREATE SCHEMA VIB');
GO

/* =============================================================================
   REFERENCE
   ============================================================================= */

IF OBJECT_ID(N'VIB.Team', N'U') IS NULL
CREATE TABLE VIB.Team (
    TeamId          INT             IDENTITY(1,1) NOT NULL,
    Name            NVARCHAR(100)   NOT NULL,
    IsActive        BIT             NOT NULL CONSTRAINT DF_Team_IsActive DEFAULT (1),
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_Team_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2       NULL,
    IsDeleted       BIT             NOT NULL CONSTRAINT DF_Team_IsDeleted DEFAULT (0),
    CONSTRAINT PK_Team PRIMARY KEY (TeamId)
);
GO

IF OBJECT_ID(N'VIB.Page', N'U') IS NULL
CREATE TABLE VIB.Page (
    PageId          NVARCHAR(50)    NOT NULL,
    Section         NVARCHAR(100)   NOT NULL,
    SectionIcon     NVARCHAR(50)    NULL,
    Label           NVARCHAR(200)   NOT NULL,
    Href            NVARCHAR(500)   NULL,
    SortOrder       INT             NOT NULL CONSTRAINT DF_Page_SortOrder DEFAULT (0),
    CONSTRAINT PK_Page PRIMARY KEY (PageId)
);
GO

IF OBJECT_ID(N'VIB.DataLayer', N'U') IS NULL
CREATE TABLE VIB.DataLayer (
    LayerCode       NVARCHAR(20)    NOT NULL,
    LayerRole       NVARCHAR(200)   NOT NULL,
    Theme           NVARCHAR(20)    NOT NULL,
    SortOrder       INT             NOT NULL CONSTRAINT DF_DataLayer_SortOrder DEFAULT (0),
    CONSTRAINT PK_DataLayer PRIMARY KEY (LayerCode)
);
GO

IF OBJECT_ID(N'VIB.DataDomain', N'U') IS NULL
CREATE TABLE VIB.DataDomain (
    DomainId        NVARCHAR(50)    NOT NULL,
    Name            NVARCHAR(100)   NOT NULL,
    Theme           NVARCHAR(20)    NOT NULL,
    SortOrder       INT             NOT NULL CONSTRAINT DF_DataDomain_SortOrder DEFAULT (0),
    CONSTRAINT PK_DataDomain PRIMARY KEY (DomainId)
);
GO

/* =============================================================================
   SECURITY
   ============================================================================= */

IF OBJECT_ID(N'VIB.Role', N'U') IS NULL
CREATE TABLE VIB.Role (
    RoleId          NVARCHAR(50)    NOT NULL,
    Name            NVARCHAR(100)   NOT NULL,
    Description     NVARCHAR(500)   NULL,
    BadgeClass      NVARCHAR(50)    NULL,
    CONSTRAINT PK_Role PRIMARY KEY (RoleId)
);
GO

IF OBJECT_ID(N'VIB.[User]', N'U') IS NULL
CREATE TABLE VIB.[User] (
    UserId          INT             NOT NULL,
    Name            NVARCHAR(200)   NOT NULL,
    Email           NVARCHAR(200)   NOT NULL,
    RoleId          NVARCHAR(50)    NOT NULL,
    Status          NVARCHAR(20)    NOT NULL CONSTRAINT DF_User_Status DEFAULT (N'active'),
    LastLoginAt     DATETIME2       NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_User_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2       NULL,
    IsDeleted       BIT             NOT NULL CONSTRAINT DF_User_IsDeleted DEFAULT (0),
    CONSTRAINT PK_User PRIMARY KEY (UserId),
    CONSTRAINT FK_User_Role FOREIGN KEY (RoleId) REFERENCES VIB.Role (RoleId)
);
GO

IF OBJECT_ID(N'VIB.RolePagePermission', N'U') IS NULL
CREATE TABLE VIB.RolePagePermission (
    RoleId          NVARCHAR(50)    NOT NULL,
    PageId          NVARCHAR(50)    NOT NULL,
    CONSTRAINT PK_RolePagePermission PRIMARY KEY (RoleId, PageId),
    CONSTRAINT FK_RolePagePermission_Role FOREIGN KEY (RoleId) REFERENCES VIB.Role (RoleId),
    CONSTRAINT FK_RolePagePermission_Page FOREIGN KEY (PageId) REFERENCES VIB.Page (PageId)
);
GO

IF OBJECT_ID(N'VIB.UserPagePermission', N'U') IS NULL
CREATE TABLE VIB.UserPagePermission (
    UserId          INT             NOT NULL,
    PageId          NVARCHAR(50)    NOT NULL,
    IsGranted       BIT             NOT NULL CONSTRAINT DF_UserPagePermission_IsGranted DEFAULT (1),
    CONSTRAINT PK_UserPagePermission PRIMARY KEY (UserId, PageId),
    CONSTRAINT FK_UserPagePermission_User FOREIGN KEY (UserId) REFERENCES VIB.[User] (UserId),
    CONSTRAINT FK_UserPagePermission_Page FOREIGN KEY (PageId) REFERENCES VIB.Page (PageId)
);
GO

/* =============================================================================
   CONFIGURATION
   ============================================================================= */

IF OBJECT_ID(N'VIB.DataSource', N'U') IS NULL
CREATE TABLE VIB.DataSource (
    SourceId            INT             IDENTITY(1,1) NOT NULL,
    LayerCode           NVARCHAR(20)    NOT NULL,
    ServerName          NVARCHAR(200)   NOT NULL,
    DatabaseName        NVARCHAR(100)   NOT NULL,
    Port                INT             NOT NULL CONSTRAINT DF_DataSource_Port DEFAULT (1433),
    AuthenticationMode  NVARCHAR(20)    NOT NULL CONSTRAINT DF_DataSource_AuthMode DEFAULT (N'sql'),
    Username            NVARCHAR(100)   NULL,
    IsPasswordStored    BIT             NOT NULL CONSTRAINT DF_DataSource_IsPasswordStored DEFAULT (0),
    Status              NVARCHAR(20)    NOT NULL CONSTRAINT DF_DataSource_Status DEFAULT (N'unknown'),
    UpdatedAt           DATETIME2       NOT NULL CONSTRAINT DF_DataSource_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_DataSource PRIMARY KEY (SourceId),
    CONSTRAINT FK_DataSource_DataLayer FOREIGN KEY (LayerCode) REFERENCES VIB.DataLayer (LayerCode)
);
GO

IF OBJECT_ID(N'VIB.SystemParameter', N'U') IS NULL
CREATE TABLE VIB.SystemParameter (
    ParameterKey    NVARCHAR(100)   NOT NULL,
    ParameterValue  NVARCHAR(500)   NOT NULL,
    UpdatedAt       DATETIME2       NOT NULL CONSTRAINT DF_SystemParameter_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_SystemParameter PRIMARY KEY (ParameterKey)
);
GO

/* =============================================================================
   OPERATIONS
   ============================================================================= */

IF OBJECT_ID(N'VIB.CorporateAccount', N'U') IS NULL
CREATE TABLE VIB.CorporateAccount (
    AccountNo           INT             IDENTITY(1,1) NOT NULL,
    AccountId           INT             NOT NULL,
    AccountName         NVARCHAR(200)   NOT NULL,
    TeamId              INT             NOT NULL,
    ExpectedAction      NVARCHAR(100)   NULL,
    Source              NVARCHAR(50)    NULL,
    RecordDate          DATE            NOT NULL,
    UpdatedAt           DATETIME2       NOT NULL,
    CreatedByUserId     INT             NULL,
    UpdatedByUserId     INT             NULL,
    CreatedAt           DATETIME2       NOT NULL CONSTRAINT DF_CorporateAccount_CreatedAt DEFAULT (SYSUTCDATETIME()),
    IsDeleted           BIT             NOT NULL CONSTRAINT DF_CorporateAccount_IsDeleted DEFAULT (0),
    CONSTRAINT PK_CorporateAccount PRIMARY KEY (AccountNo),
    CONSTRAINT UQ_CorporateAccount_AccountId UNIQUE (AccountId),
    CONSTRAINT FK_CorporateAccount_Team FOREIGN KEY (TeamId) REFERENCES VIB.Team (TeamId),
    CONSTRAINT FK_CorporateAccount_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES VIB.[User] (UserId),
    CONSTRAINT FK_CorporateAccount_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES VIB.[User] (UserId)
);
GO

IF OBJECT_ID(N'VIB.ReconciliationPeriod', N'U') IS NULL
CREATE TABLE VIB.ReconciliationPeriod (
    PeriodId            INT             IDENTITY(1,1) NOT NULL,
    YearMonth           CHAR(7)         NOT NULL,
    Label               NVARCHAR(100)   NOT NULL,
    Status              NVARCHAR(20)    NOT NULL,
    AccountCount        INT             NOT NULL CONSTRAINT DF_ReconciliationPeriod_AccountCount DEFAULT (0),
    VarianceCount       INT             NOT NULL CONSTRAINT DF_ReconciliationPeriod_VarianceCount DEFAULT (0),
    ClosedDate          DATE            NULL,
    IsActive            BIT             NOT NULL CONSTRAINT DF_ReconciliationPeriod_IsActive DEFAULT (0),
    CreatedAt           DATETIME2       NOT NULL CONSTRAINT DF_ReconciliationPeriod_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt           DATETIME2       NULL,
    CONSTRAINT PK_ReconciliationPeriod PRIMARY KEY (PeriodId),
    CONSTRAINT UQ_ReconciliationPeriod_YearMonth UNIQUE (YearMonth)
);
GO

IF OBJECT_ID(N'VIB.VarianceAccount', N'U') IS NULL
CREATE TABLE VIB.VarianceAccount (
    VarianceId              INT             IDENTITY(1,1) NOT NULL,
    PeriodId                INT             NOT NULL,
    AccountCode             NVARCHAR(50)    NOT NULL,
    AccountName             NVARCHAR(200)   NOT NULL,
    TeamId                  INT             NOT NULL,
    TrialBalanceAmount      DECIMAL(18,2)   NOT NULL CONSTRAINT DF_VarianceAccount_TrialBalance DEFAULT (0),
    CardTableAmount         DECIMAL(18,2)   NOT NULL CONSTRAINT DF_VarianceAccount_CardTable DEFAULT (0),
    VarianceAmount          AS (TrialBalanceAmount - CardTableAmount) PERSISTED,
    Status                  NVARCHAR(20)    NOT NULL CONSTRAINT DF_VarianceAccount_Status DEFAULT (N'open'),
    CreatedAt               DATETIME2       NOT NULL CONSTRAINT DF_VarianceAccount_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt               DATETIME2       NULL,
    IsDeleted               BIT             NOT NULL CONSTRAINT DF_VarianceAccount_IsDeleted DEFAULT (0),
    CONSTRAINT PK_VarianceAccount PRIMARY KEY (VarianceId),
    CONSTRAINT UQ_VarianceAccount_PeriodAccount UNIQUE (PeriodId, AccountCode),
    CONSTRAINT FK_VarianceAccount_Period FOREIGN KEY (PeriodId) REFERENCES VIB.ReconciliationPeriod (PeriodId),
    CONSTRAINT FK_VarianceAccount_Team FOREIGN KEY (TeamId) REFERENCES VIB.Team (TeamId)
);
GO

IF OBJECT_ID(N'VIB.ProcessDataset', N'U') IS NULL
CREATE TABLE VIB.ProcessDataset (
    DatasetId       INT             IDENTITY(1,1) NOT NULL,
    Code            NVARCHAR(50)    NOT NULL,
    Label           NVARCHAR(200)   NOT NULL,
    LayerCode       NVARCHAR(20)    NULL,
    DomainId        NVARCHAR(50)    NULL,
    SortOrder       INT             NOT NULL CONSTRAINT DF_ProcessDataset_SortOrder DEFAULT (0),
    CONSTRAINT PK_ProcessDataset PRIMARY KEY (DatasetId),
    CONSTRAINT UQ_ProcessDataset_Code UNIQUE (Code),
    CONSTRAINT FK_ProcessDataset_DataLayer FOREIGN KEY (LayerCode) REFERENCES VIB.DataLayer (LayerCode),
    CONSTRAINT FK_ProcessDataset_DataDomain FOREIGN KEY (DomainId) REFERENCES VIB.DataDomain (DomainId)
);
GO

IF OBJECT_ID(N'VIB.ProcessTaskDefinition', N'U') IS NULL
CREATE TABLE VIB.ProcessTaskDefinition (
    TaskDefinitionId    INT             IDENTITY(1,1) NOT NULL,
    DatasetId           INT             NOT NULL,
    Label               NVARCHAR(100)   NOT NULL,
    SortOrder           INT             NOT NULL CONSTRAINT DF_ProcessTaskDefinition_SortOrder DEFAULT (0),
    CONSTRAINT PK_ProcessTaskDefinition PRIMARY KEY (TaskDefinitionId),
    CONSTRAINT FK_ProcessTaskDefinition_Dataset FOREIGN KEY (DatasetId) REFERENCES VIB.ProcessDataset (DatasetId)
);
GO

IF OBJECT_ID(N'VIB.ProcessTaskStatus', N'U') IS NULL
CREATE TABLE VIB.ProcessTaskStatus (
    TaskStatusId        INT             IDENTITY(1,1) NOT NULL,
    TaskDefinitionId    INT             NOT NULL,
    PeriodId            INT             NULL,
    Status              NVARCHAR(20)    NOT NULL CONSTRAINT DF_ProcessTaskStatus_Status DEFAULT (N'pending'),
    LastUpdatedAt       DATETIME2       NOT NULL CONSTRAINT DF_ProcessTaskStatus_LastUpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ProcessTaskStatus PRIMARY KEY (TaskStatusId),
    CONSTRAINT UQ_ProcessTaskStatus_TaskPeriod UNIQUE (TaskDefinitionId, PeriodId),
    CONSTRAINT FK_ProcessTaskStatus_TaskDefinition FOREIGN KEY (TaskDefinitionId) REFERENCES VIB.ProcessTaskDefinition (TaskDefinitionId),
    CONSTRAINT FK_ProcessTaskStatus_Period FOREIGN KEY (PeriodId) REFERENCES VIB.ReconciliationPeriod (PeriodId)
);
GO

IF OBJECT_ID(N'VIB.ProcessTaskRestartLog', N'U') IS NULL
CREATE TABLE VIB.ProcessTaskRestartLog (
    LogId               INT             IDENTITY(1,1) NOT NULL,
    TaskDefinitionId    INT             NOT NULL,
    UserId              INT             NULL,
    CreatedAt           DATETIME2       NOT NULL CONSTRAINT DF_ProcessTaskRestartLog_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ProcessTaskRestartLog PRIMARY KEY (LogId),
    CONSTRAINT FK_ProcessTaskRestartLog_TaskDefinition FOREIGN KEY (TaskDefinitionId) REFERENCES VIB.ProcessTaskDefinition (TaskDefinitionId),
    CONSTRAINT FK_ProcessTaskRestartLog_User FOREIGN KEY (UserId) REFERENCES VIB.[User] (UserId)
);
GO

IF OBJECT_ID(N'VIB.DataQualityRule', N'U') IS NULL
CREATE TABLE VIB.DataQualityRule (
    RuleId          NVARCHAR(20)    NOT NULL,
    Name            NVARCHAR(200)   NOT NULL,
    Domain          NVARCHAR(100)   NOT NULL,
    Severity        NVARCHAR(20)    NOT NULL,
    Status          NVARCHAR(20)    NOT NULL CONSTRAINT DF_DataQualityRule_Status DEFAULT (N'Active'),
    SqlExpression   NVARCHAR(MAX)   NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_DataQualityRule_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2       NULL,
    CONSTRAINT PK_DataQualityRule PRIMARY KEY (RuleId)
);
GO

IF OBJECT_ID(N'VIB.DataQualityRuleResult', N'U') IS NULL
CREATE TABLE VIB.DataQualityRuleResult (
    ResultId        INT             IDENTITY(1,1) NOT NULL,
    ExecutionDate   DATE            NOT NULL,
    RuleId          NVARCHAR(20)    NOT NULL,
    PassedCount     INT             NOT NULL CONSTRAINT DF_DataQualityRuleResult_PassedCount DEFAULT (0),
    FailedCount     INT             NOT NULL CONSTRAINT DF_DataQualityRuleResult_FailedCount DEFAULT (0),
    Result          NVARCHAR(20)    NOT NULL,
    DetailJson      NVARCHAR(MAX)   NULL,
    CONSTRAINT PK_DataQualityRuleResult PRIMARY KEY (ResultId),
    CONSTRAINT FK_DataQualityRuleResult_Rule FOREIGN KEY (RuleId) REFERENCES VIB.DataQualityRule (RuleId)
);
GO

CREATE NONCLUSTERED INDEX IX_DataQualityRuleResult_ExecutionDate
    ON VIB.DataQualityRuleResult (ExecutionDate DESC, RuleId);
GO

IF OBJECT_ID(N'VIB.SavedQuery', N'U') IS NULL
CREATE TABLE VIB.SavedQuery (
    QueryId             INT             IDENTITY(1,1) NOT NULL,
    Name                NVARCHAR(200)   NOT NULL,
    LayerCode           NVARCHAR(20)    NOT NULL,
    SqlText             NVARCHAR(MAX)   NOT NULL,
    CreatedByUserId     INT             NULL,
    CreatedAt           DATETIME2       NOT NULL CONSTRAINT DF_SavedQuery_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_SavedQuery PRIMARY KEY (QueryId),
    CONSTRAINT FK_SavedQuery_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES VIB.[User] (UserId)
);
GO

IF OBJECT_ID(N'VIB.ReportDefinition', N'U') IS NULL
CREATE TABLE VIB.ReportDefinition (
    ReportCode      NVARCHAR(50)    NOT NULL,
    Name            NVARCHAR(200)   NOT NULL,
    SourceLayer     NVARCHAR(20)    NOT NULL,
    ViewName        NVARCHAR(200)   NULL,
    StoredProcedureName NVARCHAR(200) NULL,
    CONSTRAINT PK_ReportDefinition PRIMARY KEY (ReportCode)
);
GO

IF OBJECT_ID(N'VIB.ReportResultSnapshot', N'U') IS NULL
CREATE TABLE VIB.ReportResultSnapshot (
    SnapshotId      INT             IDENTITY(1,1) NOT NULL,
    ReportCode      NVARCHAR(50)    NOT NULL,
    PeriodId        INT             NULL,
    JsonResult      NVARCHAR(MAX)   NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_ReportResultSnapshot_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ReportResultSnapshot PRIMARY KEY (SnapshotId),
    CONSTRAINT FK_ReportResultSnapshot_Report FOREIGN KEY (ReportCode) REFERENCES VIB.ReportDefinition (ReportCode),
    CONSTRAINT FK_ReportResultSnapshot_Period FOREIGN KEY (PeriodId) REFERENCES VIB.ReconciliationPeriod (PeriodId)
);
GO

/* =============================================================================
   AUDIT
   ============================================================================= */

IF OBJECT_ID(N'VIB.ActivityLog', N'U') IS NULL
CREATE TABLE VIB.ActivityLog (
    LogId           INT             IDENTITY(1,1) NOT NULL,
    EventType       NVARCHAR(50)    NOT NULL,
    Title           NVARCHAR(200)   NOT NULL,
    Detail          NVARCHAR(500)   NULL,
    UserId          INT             NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_ActivityLog_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ActivityLog PRIMARY KEY (LogId),
    CONSTRAINT FK_ActivityLog_User FOREIGN KEY (UserId) REFERENCES VIB.[User] (UserId)
);
GO

IF OBJECT_ID(N'VIB.QueryExecutionLog', N'U') IS NULL
CREATE TABLE VIB.QueryExecutionLog (
    LogId           INT             IDENTITY(1,1) NOT NULL,
    QueryId         INT             NULL,
    LayerCode       NVARCHAR(20)    NOT NULL,
    ExecutedAt      DATETIME2       NOT NULL CONSTRAINT DF_QueryExecutionLog_ExecutedAt DEFAULT (SYSUTCDATETIME()),
    RowCount        INT             NULL,
    DurationMs      INT             NULL,
    ErrorMessage    NVARCHAR(MAX)   NULL,
    UserId          INT             NULL,
    CONSTRAINT PK_QueryExecutionLog PRIMARY KEY (LogId),
    CONSTRAINT FK_QueryExecutionLog_User FOREIGN KEY (UserId) REFERENCES VIB.[User] (UserId)
);
GO

/* =============================================================================
   PORTAL VIEWS
   ============================================================================= */

IF OBJECT_ID(N'VIB.vw_PortalSummary', N'V') IS NOT NULL
    DROP VIEW VIB.vw_PortalSummary;
GO

CREATE VIEW VIB.vw_PortalSummary AS
SELECT
    (SELECT COUNT(*) FROM VIB.CorporateAccount WHERE IsDeleted = 0) AS CorporateAccountCount,
    (SELECT COUNT(*) FROM VIB.ReconciliationPeriod) AS ReconciliationPeriodCount,
    (SELECT COUNT(*) FROM VIB.VarianceAccount WHERE IsDeleted = 0 AND Status IN (N'open', N'in_review')) AS OpenVarianceCount,
    (SELECT COUNT(*) FROM VIB.ProcessTaskStatus WHERE Status IN (N'running', N'pending')) AS PendingTaskCount;
GO

IF OBJECT_ID(N'VIB.vw_TeamReconciliationProgress', N'V') IS NOT NULL
    DROP VIEW VIB.vw_TeamReconciliationProgress;
GO

CREATE VIEW VIB.vw_TeamReconciliationProgress AS
SELECT
    t.TeamId,
    t.Name AS TeamName,
    COUNT(v.VarianceId) AS TotalVarianceCount,
    SUM(CASE WHEN v.Status = N'closed' THEN 1 ELSE 0 END) AS ClosedVarianceCount,
    CASE
        WHEN COUNT(v.VarianceId) = 0 THEN 100
        ELSE CAST(SUM(CASE WHEN v.Status = N'closed' THEN 1 ELSE 0 END) * 100.0 / COUNT(v.VarianceId) AS INT)
    END AS ProgressPercent
FROM VIB.Team t
LEFT JOIN VIB.VarianceAccount v ON v.TeamId = t.TeamId AND v.IsDeleted = 0
WHERE t.IsActive = 1 AND t.IsDeleted = 0
GROUP BY t.TeamId, t.Name;
GO

IF OBJECT_ID(N'VIB.vw_TeamWorkload', N'V') IS NOT NULL
    DROP VIEW VIB.vw_TeamWorkload;
GO

CREATE VIEW VIB.vw_TeamWorkload AS
SELECT
    t.TeamId,
    t.Name AS TeamName,
    SUM(CASE WHEN v.Status IN (N'open', N'in_review') THEN 1 ELSE 0 END) AS OpenVarianceCount,
    SUM(CASE WHEN v.Status = N'open' THEN 1 ELSE 0 END) AS PendingActionCount
FROM VIB.Team t
LEFT JOIN VIB.VarianceAccount v ON v.TeamId = t.TeamId AND v.IsDeleted = 0
WHERE t.IsActive = 1 AND t.IsDeleted = 0
GROUP BY t.TeamId, t.Name;
GO
