SELECT
    Dataset_Name,
    Description_Scope,
    Layer,
    Staging_Table_Name,
    KT_Responsible_IT_Unit,
    Note,
    TD_Analyst,
    Tester,
    Data_Model,
    KT_SP_Name,
    Status,
    Status_Responsible,
    StatusChangeDate
FROM [DOC].[TDDataset]
ORDER BY Data_Model, Dataset_Name
