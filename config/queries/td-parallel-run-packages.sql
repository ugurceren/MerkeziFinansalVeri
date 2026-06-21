WITH sa AS (
    SELECT
        pr.MainPackageName,
        COUNT(1) AS Sayi,
        CASE
            WHEN CHARINDEX('.STG', pr.TargetTableName) > 0 THEN 'STG'
            WHEN CHARINDEX('.LND', pr.TargetTableName) > 0 THEN 'LND'
            ELSE pr.MainPackageName
        END AS Target1
    FROM [TDUTIL].[OPR].[ParallelRun] pr
    WHERE pr.ActiveFlag = 1
    GROUP BY
        pr.MainPackageName,
        CASE
            WHEN CHARINDEX('.STG', pr.TargetTableName) > 0 THEN 'STG'
            WHEN CHARINDEX('.LND', pr.TargetTableName) > 0 THEN 'LND'
            ELSE pr.MainPackageName
        END
)
SELECT
    Target1,
    SUM(Sayi) AS PaketSayisi
FROM sa
GROUP BY Target1
