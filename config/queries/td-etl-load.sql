SELECT
    el.DataDate,
    pr.MainPackageName AS DataLayer,
    el.TargetTableName AS DatasetCode,
    COALESCE(NULLIF(pr.Description, ''), el.TargetTableName) AS DatasetName,
    el.PackageName AS StepName,
    el.ExecutionStatus
FROM OPR.ETLLoad el
INNER JOIN OPR.ParallelRun pr
    ON el.ParallelRunId = pr.ParallelRunId
ORDER BY pr.MainPackageName, el.TargetTableName, el.PackageName
