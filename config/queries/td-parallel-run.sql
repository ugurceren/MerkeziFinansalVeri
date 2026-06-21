SELECT
    pr.MainPackageName,
    pr.PackageName,
    pr.TargetTableName,
    pr.Description,
    pr.ActiveFlag,
    pr.LastExecutionDate,
    pr.TransferTypeId,
    pr.LoadPeriodTypeId,
    tt.TransferTypeName,
    lpt.LoadPeriodTypeName
FROM [TDUTIL].[OPR].[ParallelRun] pr
LEFT JOIN [TDUTIL].[OPR].[TransferTypeDefinition] tt
    ON pr.TransferTypeId = tt.TransferTypeId
LEFT JOIN [TDUTIL].[OPR].[LoadPeriodTypeDefinition] lpt
    ON pr.LoadPeriodTypeId = lpt.LoadPeriodTypeId
ORDER BY pr.MainPackageName, pr.TargetTableName, pr.PackageName
