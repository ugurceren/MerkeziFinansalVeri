/*
    FAZ 1 — Süreç/dataset demo tabloları (TDUTIL OPR/DOC ile değiştirildi)

    Artık kullanılmayan kaynak:
      - Datasetler  → DOC.TDDataset
      - Paket Listesi → OPR.ParallelRun
      - Günlük Akış → OPR.ETLLoad + OPR.ParallelRun

    Silinen VIB tabloları:
      ops_ProcessTaskRestartLog
      ops_ProcessTaskStatus
      ops_ProcessTaskDefinition
      ops_ProcessDataset
      ref_DataDomain  (yalnızca ProcessDataset FK)

    KIRILACAK API/ekran (kod güncellenene kadar):
      GET /api/surec/cockpit, /domainler, /datasets, /gorevler
      GET /api/mizan/gorevler
      Portal BekleyenGorevSayisi (SurecGorevDurumlari)

    KALAN (dokunulmaz):
      ref_DataLayer — cfg_DataSource FK için gerekli
*/

USE [TDUTIL];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'VIB.vw_PortalSummary', N'V') IS NOT NULL
    DROP VIEW VIB.vw_PortalSummary;
GO

IF OBJECT_ID(N'VIB.ops_ProcessTaskRestartLog', N'U') IS NOT NULL
    DROP TABLE VIB.ops_ProcessTaskRestartLog;
GO

IF OBJECT_ID(N'VIB.ProcessTaskRestartLog', N'U') IS NOT NULL
    DROP TABLE VIB.ProcessTaskRestartLog;
GO

IF OBJECT_ID(N'VIB.ops_ProcessTaskStatus', N'U') IS NOT NULL
    DROP TABLE VIB.ops_ProcessTaskStatus;
GO

IF OBJECT_ID(N'VIB.ProcessTaskStatus', N'U') IS NOT NULL
    DROP TABLE VIB.ProcessTaskStatus;
GO

IF OBJECT_ID(N'VIB.ops_ProcessTaskDefinition', N'U') IS NOT NULL
    DROP TABLE VIB.ops_ProcessTaskDefinition;
GO

IF OBJECT_ID(N'VIB.ProcessTaskDefinition', N'U') IS NOT NULL
    DROP TABLE VIB.ProcessTaskDefinition;
GO

IF OBJECT_ID(N'VIB.ops_ProcessDataset', N'U') IS NOT NULL
    DROP TABLE VIB.ops_ProcessDataset;
GO

IF OBJECT_ID(N'VIB.ProcessDataset', N'U') IS NOT NULL
    DROP TABLE VIB.ProcessDataset;
GO

IF OBJECT_ID(N'VIB.ref_DataDomain', N'U') IS NOT NULL
    DROP TABLE VIB.ref_DataDomain;
GO

IF OBJECT_ID(N'VIB.DataDomain', N'U') IS NOT NULL
    DROP TABLE VIB.DataDomain;
GO

CREATE VIEW VIB.vw_PortalSummary AS
SELECT
    (SELECT COUNT(*) FROM VIB.ops_CorporateAccount WHERE IsDeleted = 0) AS CorporateAccountCount,
    (SELECT COUNT(*) FROM VIB.ops_ReconciliationPeriod) AS ReconciliationPeriodCount,
    (SELECT COUNT(*) FROM VIB.ops_VarianceAccount WHERE IsDeleted = 0 AND Status IN (N'open', N'in_review')) AS OpenVarianceCount,
    CAST(0 AS INT) AS PendingTaskCount;
GO

PRINT N'[FAZ 1] Süreç dataset tabloları kaldırıldı.';
GO
