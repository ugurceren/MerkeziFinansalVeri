SELECT
    Data_Model,
    Status,
    COUNT(*) AS DatasetCount,
    MAX(StatusChangeDate) AS LastStatusChangeDate
FROM DOC.TDDataset
WHERE LTRIM(RTRIM(Data_Model)) <> ''
GROUP BY Data_Model, Status
ORDER BY Data_Model, Status
