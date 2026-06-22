SELECT
    el.DataDate,
    el.TargetTableName,
    el.PackageName AS StepName,
    el.ExecutionStatus,
    el.ExecutionRecordCount,
    el.ErrorMessageText
FROM [TDUTIL].[OPR].[ETLLoad] el
WHERE el.TargetTableName IN (
    N'TDSTG.STG.LedgerBalance',
    N'TDSTG.LND.LedgerBalance',
    N'TDMAIN.COR.LedgerBalance'
)
ORDER BY el.TargetTableName, el.PackageName
