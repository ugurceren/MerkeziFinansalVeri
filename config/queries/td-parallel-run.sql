SELECT
    pr.MainPackageName,
    pr.PackageName,
    pr.TargetTableName,
    pr.Description,
    pr.Status,
    pr.LastExecutionDate,
    pr.TransferTypeId,
    tt.TransferTypeName,
    lpt.LoadPeriodTypeName AS LoadPeriodTypeName
FROM [TDUTIL].[OPR].[ParallelRun] pr
LEFT JOIN [TDUTIL].[OPR].[TransferTypeDefinition] tt
    ON pr.TransferTypeId = tt.TransferTypeId
LEFT JOIN [TDUTIL].[OPR].[LoadPeriodTypeDefinition] lpt
    ON pr.LoadPeriodTypeId = lpt.LoadPeriodTypeId
WHERE pr.ActiveFlag = 1
   OR pr.ActiveFlag IS NULL
ORDER BY pr.MainPackageName, pr.TargetTableName, pr.PackageName
