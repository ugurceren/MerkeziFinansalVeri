SELECT
    COALESCE(NULLIF(LTRIM(RTRIM(Data_Model)), ''), N'(Tanımsız)') AS Data_Model,
    Status,
    COUNT(*) AS DatasetCount,
    MAX(StatusChangeDate) AS LastStatusChangeDate
FROM [DOC].[TDDataset]
WHERE Status IS NOT NULL
  AND LTRIM(RTRIM(Status)) <> ''
GROUP BY
    COALESCE(NULLIF(LTRIM(RTRIM(Data_Model)), ''), N'(Tanımsız)'),
    Status
ORDER BY Data_Model, Status
