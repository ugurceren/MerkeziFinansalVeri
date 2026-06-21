SELECT
    pr.MainPackageName,
    pr.PackageName AS [Paket Adı],
    pr.TargetTableName AS [Hedef Tablo],
    pr.ActiveFlag,
    pr.LastExecutionDate,
    pr.TransferTypeId,
    pr.LoadPeriodTypeId,
    tt.TransferTypeName AS TransferTypeName,
    lpt.LoadPeriodTypeName AS LoadPeriodTypeName,
    pr.Description
FROM [OPR].[ParallelRun] pr
LEFT JOIN [OPR].[TransferTypeDefinition] tt
    ON pr.TransferTypeId = tt.TransferTypeId
LEFT JOIN [OPR].[LoadPeriodTypeDefinition] lpt
    ON pr.LoadPeriodTypeId = lpt.LoadPeriodTypeId
ORDER BY pr.MainPackageName, pr.TargetTableName, pr.PackageName
