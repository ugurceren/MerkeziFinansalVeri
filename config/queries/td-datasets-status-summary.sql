SELECT
    Status,
    COUNT(*) AS DatasetCount,
    MAX(StatusChangeDate) AS LastStatusChangeDate
FROM [DOC].[TDDataset]
WHERE Status IS NOT NULL
  AND LTRIM(RTRIM(Status)) <> ''
GROUP BY Status
ORDER BY COUNT(*) DESC, Status
