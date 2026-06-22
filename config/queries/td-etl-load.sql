SELECT
    el.DataDate,
    pr.MainPackageName AS DataLayer,
    pr.TargetTableName AS LayerTableName,
    el.TargetTableName,
    el.PackageName AS StepName,
    el.ExecutionStatus,
    el.ExecutionStartTime,
    el.ExecutionEndTime,
    el.ExecutionRecordCount,
    el.ErrorMessageText
FROM [TDUTIL].[OPR].[ETLLoad] el
INNER JOIN [TDUTIL].[OPR].[ParallelRun] pr
    ON el.ParallelRunId = pr.ParallelRunId
ORDER BY pr.MainPackageName, el.TargetTableName, el.PackageName
