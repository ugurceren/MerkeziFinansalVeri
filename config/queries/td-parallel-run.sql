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
FROM [TDUTIL].[OPR].[ParallelRun] pr
LEFT JOIN [TDUTIL].[OPR].[TransferTypeDefinition] tt
    ON pr.TransferTypeId = tt.TransferTypeId
LEFT JOIN [TDUTIL].[OPR].[LoadPeriodTypeDefinition] lpt
    ON pr.LoadPeriodTypeId = lpt.LoadPeriodTypeId
ORDER BY pr.MainPackageName, pr.TargetTableName, pr.PackageName
