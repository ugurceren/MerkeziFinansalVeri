WITH SonTarih AS (
    SELECT MAX(CAST(StartDate AS DATE)) AS Tarih
    FROM TDUTIL.DQ.RuleResult
),
SonGun AS (
    SELECT
        RR.RuleId,
        RR.FailCount,
        ROW_NUMBER() OVER (PARTITION BY RR.RuleId ORDER BY RR.StartDate DESC) AS rn
    FROM TDUTIL.DQ.RuleResult RR
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
    (SELECT COUNT(*) FROM TDUTIL.DQ.[Rule]) AS ToplamKuralSayisi,
    (SELECT COUNT(*) FROM TDUTIL.DQ.[Rule] WHERE [Status] = 1) AS AktifKuralSayisi,
    (SELECT Tarih FROM SonTarih) AS SonCalistirmaTarihi,
    ISNULL((SELECT SonCalistirmaHataliSayisi FROM Ozet), 0) AS SonCalistirmaHataliSayisi,
    ISNULL((SELECT SonCalistirmaGecenSayisi FROM Ozet), 0) AS SonCalistirmaGecenSayisi;
