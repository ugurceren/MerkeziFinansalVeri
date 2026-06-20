SELECT
    Data_Model,
    Dataset_Name
FROM DOC.TDDataset
WHERE Data_Model IS NOT NULL
  AND LTRIM(RTRIM(Data_Model)) <> ''
  AND Dataset_Name IS NOT NULL
  AND LTRIM(RTRIM(Dataset_Name)) <> ''
ORDER BY Data_Model, Dataset_Name
