/*
    VIB şema envanteri — silme öncesi/sonrası kontrol.
    SSMS'te TDUTIL üzerinde çalıştırın.
*/

USE [TDUTIL];
GO

-- Tüm VIB tabloları
SELECT
    t.name AS TableName,
    p.rows AS ApproxRowCount
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
WHERE s.name = N'VIB'
ORDER BY t.name;
GO

-- Process/dataset zincirine referans veren FK'ler (kalmamalı)
SELECT
    OBJECT_SCHEMA_NAME(fk.parent_object_id) + '.' + OBJECT_NAME(fk.parent_object_id) AS ReferencingTable,
    fk.name AS ForeignKeyName,
    OBJECT_SCHEMA_NAME(fk.referenced_object_id) + '.' + OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable
FROM sys.foreign_keys fk
WHERE OBJECT_SCHEMA_NAME(fk.referenced_object_id) = N'VIB'
  AND OBJECT_NAME(fk.referenced_object_id) IN (
      N'ops_ProcessDataset', N'ProcessDataset',
      N'ops_ProcessTaskDefinition', N'ProcessTaskDefinition',
      N'ref_DataDomain', N'DataDomain'
  )
ORDER BY ReferencedTable, ReferencingTable;
GO

-- View'lar
SELECT v.name AS ViewName
FROM sys.views v
INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
WHERE s.name = N'VIB'
ORDER BY v.name;
GO
