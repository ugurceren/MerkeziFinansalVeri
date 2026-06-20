/*
    FAZ 2 — Kullanılmayan demo / legacy VIB tabloları

    Frontend ve servisler TDUTIL'e geçti; bu tablolara aktif okuma/yazma yok
    (yalnızca seed verisi ve kullanılmayan API fallback).

    Silinen tablolar:
      ops_ReportResultSnapshot   — hiçbir servis kullanmıyor (raporlar config+SP)
      ops_ReportDefinition       — seed placeholder; ters-bakiye/nazim json config kullanır
      ops_SavedQuery             — hiçbir controller kullanmıyor
      ops_DataQualityRuleResult  — VK ekranı TDUTIL DQ.* sorgularını kullanır
      ops_DataQualityRule        — aynı
      cfg_SystemParameter        — kodda okunmuyor (yalnızca seed)

    KIRILACAK (nadir/legacy):
      GET /api/veri-kalitesi/kurallar
      GET /api/veri-kalitesi/gunluk-sonuclar
      VeriKalitesiKpiService fallback (TDUTIL KPI çalışmazsa)

    FAZ 1 (004) önce çalıştırılmalı.
*/

USE [TDUTIL];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'VIB.ops_ReportResultSnapshot', N'U') IS NOT NULL
    DROP TABLE VIB.ops_ReportResultSnapshot;
GO

IF OBJECT_ID(N'VIB.ReportResultSnapshot', N'U') IS NOT NULL
    DROP TABLE VIB.ReportResultSnapshot;
GO

IF OBJECT_ID(N'VIB.ops_ReportDefinition', N'U') IS NOT NULL
    DROP TABLE VIB.ops_ReportDefinition;
GO

IF OBJECT_ID(N'VIB.ReportDefinition', N'U') IS NOT NULL
    DROP TABLE VIB.ReportDefinition;
GO

IF OBJECT_ID(N'VIB.ops_SavedQuery', N'U') IS NOT NULL
    DROP TABLE VIB.ops_SavedQuery;
GO

IF OBJECT_ID(N'VIB.SavedQuery', N'U') IS NOT NULL
    DROP TABLE VIB.SavedQuery;
GO

IF OBJECT_ID(N'VIB.ops_DataQualityRuleResult', N'U') IS NOT NULL
    DROP TABLE VIB.ops_DataQualityRuleResult;
GO

IF OBJECT_ID(N'VIB.DataQualityRuleResult', N'U') IS NOT NULL
    DROP TABLE VIB.DataQualityRuleResult;
GO

IF OBJECT_ID(N'VIB.ops_DataQualityRule', N'U') IS NOT NULL
    DROP TABLE VIB.ops_DataQualityRule;
GO

IF OBJECT_ID(N'VIB.DataQualityRule', N'U') IS NOT NULL
    DROP TABLE VIB.DataQualityRule;
GO

IF OBJECT_ID(N'VIB.cfg_SystemParameter', N'U') IS NOT NULL
    DROP TABLE VIB.cfg_SystemParameter;
GO

IF OBJECT_ID(N'VIB.SystemParameter', N'U') IS NOT NULL
    DROP TABLE VIB.SystemParameter;
GO

PRINT N'[FAZ 2] Legacy demo tabloları kaldırıldı.';
GO
