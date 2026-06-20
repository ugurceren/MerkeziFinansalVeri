SELECT
    el.DataDate,
    el.TargetDatabase AS DataLayer,
    el.TargetTableName AS DatasetCode,
    el.TargetTableName AS DatasetName,
    el.StepName AS StepName,
    el.ExecutionStatus
FROM OPR.ETLLoad el
ORDER BY el.TargetDatabase, el.TargetTableName, el.StepName
