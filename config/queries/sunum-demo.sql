/*
================================================================================
  MERKEZİ GÜVENİLİR FİNANSAL VERİ — SUNUM DEMO SORGULARI
--------------------------------------------------------------------------------
  Amaç     : Sunum sırasında ekran ekran anlatımı destekleyen örnek SELECT'ler
  Veritabanı: TDUTIL (uygulama + operasyon metadata)
              TDSTG / TDMAIN / TDREPORT (kurumsal veri ambarı — canlı ortam)
  Kullanım : SSMS veya uygulama içi «Veritabanı Sorgusu» sayfasında bölüm bölüm
             çalıştırın. Her bölümdeki yorum satırları slayt konuşma notudur.
================================================================================
*/

USE [TDUTIL];
GO


/* =============================================================================
   BÖLÜM 1 — GİRİŞ & MİMARİ
   Sunum: «Neden bu platform?» — banka verisi tek merkezde, katmanlı DW
   Ekran : Mimari diyagram / Genel Bakış giriş slaytı
   ============================================================================= */

-- 1.1 Veri katmanları: ham veri → ana veri → raporlama (+ operasyon/util)
--     Süreç Kokpiti sütunları bu tablodan beslenir (ref_DataLayer)
SELECT
    LayerCode,          -- TDSTG | TDMAIN | TDREPORT | TDUTIL
    LayerRole,          -- Katmanın iş rolü (sunumda kısaca okuyun)
    Theme,              -- Arayüz renk teması
    SortOrder
FROM VIB.ref_DataLayer
ORDER BY SortOrder;

-- 1.2 Uygulama menüsü / ribbon sekmeleri (ref_Page)
--     «Hangi modüller var?» sorusunun cevabı
SELECT
    Section,            -- PORTAL, SÜREÇ, MUTABAKAT, VERİ KALİTESİ, RAPORLAMA, YÖNETİM
    Label,              -- Kullanıcıya görünen sayfa adı
    Href,               -- HTML dosyası
    SortOrder
FROM VIB.ref_Page
ORDER BY SortOrder;

-- 1.3 Katman bazlı bağlantı tanımları (cfg_DataSource)
--     Ekran: Veritabanı Bağlantısı — runtime'da config/td-connections.json öncelikli
SELECT
    LayerCode,
    ServerName,
    DatabaseName,
    Port,
    AuthenticationMode, -- sql | windows
    Status,
    UpdatedAt
FROM VIB.cfg_DataSource
ORDER BY LayerCode;


/* =============================================================================
   BÖLÜM 2 — PORTAL / GENEL BAKIŞ
   Sunum: KPI kartları — mutabakat, fark, süreç özeti tek bakışta
   Ekran : HomePage.html
   ============================================================================= */

-- 2.1 Portal özet view (API: GET /api/portal/ozet)
SELECT
    CorporateAccountCount,      -- Kebir sorumluluk listesindeki hesap sayısı
    ReconciliationPeriodCount,  -- Tanımlı mutabakat dönemi
    OpenVarianceCount,          -- Açık / incelenen fark (view İngilizce status bekler)
    PendingTaskCount            -- Bekleyen süreç görevi (Faz-1 sonrası genelde 0)
FROM VIB.vw_PortalSummary;

-- 2.2 Demo ortamı için gerçek açık fark sayısı (seed Türkçe status kullanır)
SELECT COUNT(*) AS AcikFarkSayisi
FROM VIB.ops_VarianceAccount
WHERE IsDeleted = 0
  AND Status IN (N'acik', N'inceleniyor', N'open', N'in_review');

-- 2.3 Ekip bazlı mutabakat ilerlemesi (dashboard paneli)
SELECT
    TeamName,
    TotalVarianceCount,
    ClosedVarianceCount,
    ProgressPercent             -- % tamamlanma
FROM VIB.vw_TeamReconciliationProgress
ORDER BY ProgressPercent DESC;


/* =============================================================================
   BÖLÜM 3 — SÜREÇ YÖNETİMİ / GÜNLÜK AKIŞ
   Sunum: ETL yükleri canlı izlenir — TDSTG→TDMAIN→TDREPORT hattı
   Ekran : surec.html (Günlük Akış, Datasetler, Paket Listesi)
   Kaynak: TDUTIL.OPR şeması (canlı DW)
   ============================================================================= */

-- 3.1 Günlük ETL adımları — config/queries/td-etl-load.sql ile aynı
--     Her satır bir paket çalıştırması; hata mesajı varsa kırmızı satır
SELECT
    el.DataDate,                        -- Veri tarihi (kokpit tarih filtresi)
    pr.MainPackageName AS DataLayer,    -- TDSTG / TDMAIN / TDREPORT grubu
    pr.TargetTableName AS LayerTableName,
    el.PackageName AS StepName,
    el.ExecutionStatus,                 -- Success | Running | Failed
    el.ExecutionStartTime,
    el.ExecutionEndTime,
    el.ExecutionRecordCount,
    el.ErrorMessageText
FROM [TDUTIL].[OPR].[ETLLoad] el
INNER JOIN [TDUTIL].[OPR].[ParallelRun] pr
    ON el.ParallelRunId = pr.ParallelRunId
WHERE CAST(el.DataDate AS DATE) = CAST(GETDATE() AS DATE)   -- sunum günü için
ORDER BY pr.MainPackageName, el.TargetTableName, el.PackageName;

-- 3.2 Katman özeti — bugün kaç adım başarılı / devam / hatalı?
SELECT
    pr.MainPackageName AS DataLayer,
    SUM(CASE WHEN el.ExecutionStatus = N'Success'  THEN 1 ELSE 0 END) AS BasariliAdim,
    SUM(CASE WHEN el.ExecutionStatus = N'Running'  THEN 1 ELSE 0 END) AS DevamEdenAdim,
    SUM(CASE WHEN el.ExecutionStatus = N'Failed'   THEN 1 ELSE 0 END) AS HataliAdim,
    COUNT(*) AS ToplamAdim
FROM [TDUTIL].[OPR].[ETLLoad] el
INNER JOIN [TDUTIL].[OPR].[ParallelRun] pr ON el.ParallelRunId = pr.ParallelRunId
WHERE CAST(el.DataDate AS DATE) = CAST(GETDATE() AS DATE)
GROUP BY pr.MainPackageName
ORDER BY pr.MainPackageName;

-- 3.3 Paket envanteri — Paket Listesi ekranı
SELECT
    pr.MainPackageName,
    pr.PackageName       AS [Paket Adı],
    pr.TargetTableName   AS [Hedef Tablo],
    pr.ActiveFlag,
    pr.LastExecutionDate,
    tt.TransferTypeName  AS [Transfer Tipi],
    lpt.LoadPeriodTypeName AS [Yükleme Periyodu]
FROM [TDUTIL].[OPR].[ParallelRun] pr
LEFT JOIN [TDUTIL].[OPR].[TransferTypeDefinition] tt
    ON pr.TransferTypeId = tt.TransferTypeId
LEFT JOIN [TDUTIL].[OPR].[LoadPeriodTypeDefinition] lpt
    ON pr.LoadPeriodTypeId = lpt.LoadPeriodTypeId
ORDER BY pr.MainPackageName, pr.TargetTableName, pr.PackageName;

-- 3.4 Dataset durum özeti — Datasetler görünümü (DOC kataloğu)
SELECT
    COALESCE(NULLIF(LTRIM(RTRIM(Data_Model)), ''), N'(Tanımsız)') AS Data_Model,
    Status,
    COUNT(*) AS DatasetCount,
    MAX(StatusChangeDate) AS LastStatusChangeDate
FROM [DOC].[TDDataset]
WHERE Status IS NOT NULL AND LTRIM(RTRIM(Status)) <> ''
GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(Data_Model)), ''), N'(Tanımsız)'), Status
ORDER BY Data_Model, Status;


/* =============================================================================
   BÖLÜM 4 — MUTABAKAT
   Sunum: Dönem yönetimi → fark veren hesaplar → ekip sorumluluğu
   Ekran : mutabakat.html, mizan.html, matrixmap
   ============================================================================= */

-- 4.1 Mutabakat dönemleri — aktif dönem vurgulanır
SELECT
    YearMonth,          -- 2026-06
    Label,              -- Haziran 2026
    Status,             -- aktif | kapali | onay
    AccountCount,
    VarianceCount,
    ClosedDate,
    IsActive
FROM VIB.ops_ReconciliationPeriod
ORDER BY YearMonth DESC;

-- 4.2 Aktif dönem sistem parametresi
SELECT ParameterKey, ParameterValue, UpdatedAt
FROM VIB.cfg_SystemParameter
WHERE ParameterKey = N'AktifMutabakatDonemId';

-- 4.3 Fark veren hesaplar — Mizan vs kart tablosu karşılaştırması
SELECT
    p.Label              AS Donem,
    v.AccountCode,
    v.AccountName,
    t.Name               AS SorumluEkip,
    v.TrialBalanceAmount AS MizanTutari,
    v.CardTableAmount    AS KartTablosuTutari,
    v.VarianceAmount,    -- Hesaplanmış fark (persisted column)
    v.Status             -- acik | inceleniyor | kapatildi
FROM VIB.ops_VarianceAccount v
INNER JOIN VIB.ops_ReconciliationPeriod p ON p.PeriodId = v.PeriodId
INNER JOIN VIB.ref_Team t ON t.TeamId = v.TeamId
WHERE v.IsDeleted = 0
  AND p.IsActive = 1
ORDER BY ABS(v.VarianceAmount) DESC;

-- 4.4 Matrix Map — hangi kaynak kolon hangi TD tablosuna map ediliyor? (TDMAIN)
SELECT TOP 20
    SourceName,
    MatrixTableName,
    MatrixColumnName,
    BalanceTypeName,
    TDInscopeFlag
FROM [TDMAIN].[PRM].[TrustedDataMatrixMap]
ORDER BY MatrixTableName, MatrixColumnName;


/* =============================================================================
   BÖLÜM 5 — PARAMETRE YÖNETİMİ / KEBİR HESAPLARI
   Sunum: Kurumsal hesapların ekip ve aksiyon sorumluluğu
   Ekran : kebir-hesaplari.html
   ============================================================================= */

-- 5.1 Kebir sorumluluk listesi (CRUD — API üzerinden güncellenir)
SELECT
    ca.AccountId,
    ca.AccountName,
    t.Name              AS SorumluEkip,
    ca.ExpectedAction,  -- Beklenen aksiyon (Ödeme, Doğrulama vb.)
    ca.Source,          -- Banka Sistemi | Merkezi Sistem
    ca.RecordDate,
    ca.UpdatedAt,
    uo.Name             AS SonGuncelleyen
FROM VIB.ops_CorporateAccount ca
INNER JOIN VIB.ref_Team t ON t.TeamId = ca.TeamId
LEFT JOIN VIB.sec_User uo ON uo.UserId = ca.UpdatedByUserId
WHERE ca.IsDeleted = 0
ORDER BY ca.AccountId;

-- 5.2 Ekip başına hesap dağılımı
SELECT
    t.Name AS Ekip,
    COUNT(*) AS HesapSayisi
FROM VIB.ops_CorporateAccount ca
INNER JOIN VIB.ref_Team t ON t.TeamId = ca.TeamId
WHERE ca.IsDeleted = 0
GROUP BY t.Name
ORDER BY HesapSayisi DESC;


/* =============================================================================
   BÖLÜM 6 — VERİ KALİTESİ
   Sunum: Kurallar tanımlanır → günlük sonuçlar izlenir → portal KPI
   Ekran : veri-kalitesi-kurallari.html, gunluk-kural-sonuclari.html
   Kaynak: TDUTIL.DQ şeması
   ============================================================================= */

-- 6.1 Veri kalitesi kural kataloğu
SELECT
    RuleId,
    RuleDesc,
    QualityLevel,       -- Öncelik / ciddiyet
    Status,             -- 1 = aktif
    ActiveFlag,
    ResponsibleAnalystName,
    UpdatedDate
FROM [TDUTIL].[DQ].[Rule]
ORDER BY QualityLevel, RuleId;

-- 6.2 Portal VK KPI — config/queries/vk-portal-kpi.sql ile aynı
WITH SonTarih AS (
    SELECT MAX(CAST(StartDate AS DATE)) AS Tarih
    FROM [TDUTIL].[DQ].[RuleResult]
),
SonGun AS (
    SELECT
        RR.RuleId,
        RR.FailCount,
        ROW_NUMBER() OVER (PARTITION BY RR.RuleId ORDER BY RR.StartDate DESC) AS rn
    FROM [TDUTIL].[DQ].[RuleResult] RR
    CROSS JOIN SonTarih ST
    WHERE ST.Tarih IS NOT NULL
      AND CAST(RR.StartDate AS DATE) = ST.Tarih
),
Ozet AS (
    SELECT
        SUM(CASE WHEN FailCount > 0 THEN 1 ELSE 0 END) AS SonCalistirmaHataliSayisi,
        SUM(CASE WHEN FailCount = 0 OR FailCount IS NULL THEN 1 ELSE 0 END) AS SonCalistirmaGecenSayisi
    FROM SonGun
    WHERE rn = 1
)
SELECT
    (SELECT COUNT(*) FROM [TDUTIL].[DQ].[Rule]) AS ToplamKuralSayisi,
    (SELECT COUNT(*) FROM [TDUTIL].[DQ].[Rule] WHERE [Status] = 1) AS AktifKuralSayisi,
    (SELECT Tarih FROM SonTarih) AS SonCalistirmaTarihi,
    ISNULL((SELECT SonCalistirmaHataliSayisi FROM Ozet), 0) AS SonCalistirmaHataliSayisi,
    ISNULL((SELECT SonCalistirmaGecenSayisi FROM Ozet), 0) AS SonCalistirmaGecenSayisi;

-- 6.3 Bugünkü kural ihlalleri (Günlük Kural Sonuçları ekranı)
WITH RuleResultSum AS (
    SELECT
        RuleId,
        CAST(DataDate AS DATE) AS DataDate,
        FailCount,
        ErrorDescription,
        ROW_NUMBER() OVER (PARTITION BY RuleId ORDER BY StartDate DESC) AS rn
    FROM [TDUTIL].[DQ].[RuleResult] RR
    WHERE CAST(StartDate AS DATE) = CAST(GETDATE() AS DATE)
)
SELECT TOP 50
    RR.DataDate,
    F.SystemName + '.' + F.SchemaName + '.' + F.DatasetName AS TableName,
    F.FieldName,
    R.ExactValue,
    RR.ErrorDescription,
    R.QualityLevel,
    R.RuleId
FROM RuleResultSum RR
JOIN [TDUTIL].[DQ].[Rule] R ON RR.RuleId = R.RuleId
JOIN [TDUTIL].[DQ].[RelTermField] RTF ON R.RelTermFieldId = RTF.RelTermFieldId
JOIN [TDUTIL].[DQ].[Field] F ON RTF.FieldId = F.FieldId
WHERE rn = 1
  AND RR.FailCount <> 0
  AND R.[Status] = 1
ORDER BY QualityLevel ASC;


/* =============================================================================
   BÖLÜM 7 — RAPORLAMA
   Sunum: Analitik katmandan regülasyon / kontrol raporları
   Ekran : ters-bakiye.html, nazim-hesaplari.html, veritabani-sorgu.html
   ============================================================================= */

-- 7.1 Ters Bakiye — stored procedure çağrısı örneği (TDREPORT)
--     Uygulama config/ters-bakiye.json içindeki SP'yi kullanır
--     Sunumda: «Filtreler API'ye gider, sonuç tablo olarak döner»
/*
EXEC [TDREPORT].[RCL].[rpt_ReverseBalanceReconciliationByAccount]
    @DataDate = '2026-06-13',
    @BranchId = NULL;
*/

-- 7.2 Nazım hesapları rapor tanımı (ops_ReportDefinition)
SELECT
    ReportCode,
    Name,
    SourceLayer,            -- TDREPORT
    StoredProcedureName
FROM VIB.ops_ReportDefinition
ORDER BY ReportCode;

-- 7.3 Veritabanı Sorgu — katman keşfi (varsayılan sorgu, TDSTG örneği)
--     Canlı sunumda Veritabanı Sorgu sayfasında Ctrl+Enter ile çalıştırın
SELECT
    name AS TableName,
    create_date AS CreateDate,
    modify_date AS ModifyDate
FROM sys.tables
ORDER BY name;


/* =============================================================================
   BÖLÜM 8 — GÜVENLİK & YÖNETİM
   Sunum: RBAC — rol bazlı sayfa erişimi + kişi bazlı override
   Ekran : kullanici-yonetimi.html, kisi-yetkileri.html
   ============================================================================= */

-- 8.1 Roller ve açıklamaları
SELECT RoleId, Name, Description
FROM VIB.sec_Role
ORDER BY Name;

-- 8.2 Aktif kullanıcılar
SELECT
    UserCode,
    Name,
    Email,
    r.Name AS Rol
FROM VIB.sec_User u
INNER JOIN VIB.sec_Role r ON r.RoleId = u.RoleId
WHERE u.IsDeleted = 0
ORDER BY u.Name;

-- 8.3 «Mutabakat Sorumlusu» rolünün erişebildiği sayfalar
SELECT
    p.Section,
    p.Label,
    p.Href
FROM VIB.sec_RolePagePermission rp
INNER JOIN VIB.ref_Page p ON p.PageId = rp.PageId
WHERE rp.RoleId = N'mutabakat'
ORDER BY p.SortOrder;

-- 8.4 Kişi bazlı ek yetki (override) örneği
SELECT
    u.Name AS Kullanici,
    p.Label AS Sayfa,
    up.CanView,
    up.CanEdit
FROM VIB.sec_UserPagePermission up
INNER JOIN VIB.sec_User u ON u.UserId = up.UserId
INNER JOIN VIB.ref_Page p ON p.PageId = up.PageId
WHERE u.IsDeleted = 0
ORDER BY u.Name, p.SortOrder;


/* =============================================================================
   BÖLÜM 9 — DENETİM / AKTİVİTE
   Sunum: Kim ne yaptı? — şeffaflık ve izlenebilirlik
   Ekran : aktivite-listesi.html
   ============================================================================= */

-- 9.1 Son aktiviteler (tarih aralığı — Aktivite Listesi sayfası ile aynı mantık)
DECLARE @Baslangic DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
DECLARE @Bitis     DATE = CAST(GETDATE() AS DATE);

SELECT TOP 50
    al.EventType,       -- edit | alert | ok | export
    al.Title,
    al.Detail,
    u.Name AS Kullanici,
    al.CreatedAt
FROM VIB.audit_ActivityLog al
LEFT JOIN VIB.sec_User u ON u.UserId = al.UserId
WHERE CAST(al.CreatedAt AS DATE) BETWEEN @Baslangic AND @Bitis
ORDER BY al.CreatedAt DESC;

-- 9.2 Ad hoc sorgu çalıştırma logları (Veritabanı Sorgu denetimi)
SELECT TOP 20
    LayerCode,
    ExecutedAt,
    RowCount,
    DurationMs,
    ErrorMessage
FROM VIB.audit_QueryExecutionLog
ORDER BY ExecutedAt DESC;


/* =============================================================================
   BÖLÜM 10 — KAPANIŞ / TEK SLAYT ÖZET
   Sunum: «Platformun sağladığı değer» — sayılarla özet
   ============================================================================= */

SELECT
    (SELECT COUNT(*) FROM VIB.ref_Page)                    AS ModulSayisi,
    (SELECT COUNT(*) FROM VIB.ref_DataLayer)               AS VeriKatmaniSayisi,
    (SELECT COUNT(*) FROM VIB.sec_User WHERE IsDeleted = 0) AS AktifKullanici,
    (SELECT COUNT(*) FROM VIB.ops_CorporateAccount WHERE IsDeleted = 0) AS KebirHesap,
    (SELECT COUNT(*) FROM VIB.ops_VarianceAccount WHERE IsDeleted = 0
        AND Status IN (N'acik', N'inceleniyor'))           AS AcikMutabakatFarki,
    (SELECT COUNT(*) FROM [TDUTIL].[DQ].[Rule] WHERE [Status] = 1) AS AktifVkKurali;

GO
