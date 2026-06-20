SELECT
    Data_Model,
    Dataset_Name,
    Staging_Table_Name
FROM [DOC].[TDDataset]
WHERE LTRIM(RTRIM(Data_Model)) <> ''
  AND LTRIM(RTRIM(Dataset_Name)) <> ''
ORDER BY Data_Model, Dataset_Name
