SELECT
    pr.MainPackageName,
    COUNT(*) AS PaketSayisi
FROM OPR.ParallelRun pr
WHERE pr.ActiveFlag = 1
   OR pr.ActiveFlag IS NULL
GROUP BY pr.MainPackageName
