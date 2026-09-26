IF DB_ID(N'pc_store') IS NULL
BEGIN
  CREATE DATABASE pc_store;
END;
GO

USE pc_store;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(255) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
    FirstName NVARCHAR(60) NOT NULL,
    LastName NVARCHAR(60) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL CONSTRAINT CK_Users_Role CHECK (Role IN ('user', 'admin', 'superadmin')),
    ImageData VARBINARY(MAX) NULL,
    ImageContentType NVARCHAR(100) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF COL_LENGTH(N'dbo.Users', N'FirstName') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD FirstName NVARCHAR(60) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Users', N'LastName') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD LastName NVARCHAR(60) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Users', N'ImageData') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD ImageData VARBINARY(MAX) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Users', N'ImageContentType') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD ImageContentType NVARCHAR(100) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Users', N'Name') IS NOT NULL
BEGIN
  EXEC sys.sp_executesql N'UPDATE dbo.Users SET FirstName = LEFT(Name, CHARINDEX(N'' '', Name + N'' '') - 1), LastName = LTRIM(SUBSTRING(Name, CHARINDEX(N'' '', Name + N'' '') + 1, 120)) WHERE FirstName IS NULL OR LastName IS NULL';
  ALTER TABLE dbo.Users DROP COLUMN Name;
END;
GO

UPDATE dbo.Users SET FirstName = N'User' WHERE FirstName IS NULL;
UPDATE dbo.Users SET LastName = N'' WHERE LastName IS NULL;
ALTER TABLE dbo.Users ALTER COLUMN FirstName NVARCHAR(60) NOT NULL;
ALTER TABLE dbo.Users ALTER COLUMN LastName NVARCHAR(60) NOT NULL;
GO

IF OBJECT_ID(N'dbo.CK_Users_Role', N'C') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_Role;
END;
GO

UPDATE dbo.Users SET Role = N'user' WHERE Role = N'staff';
GO

ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('user', 'admin', 'superadmin'));
GO

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Categories (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categories PRIMARY KEY,
    Name NVARCHAR(80) NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE
  );
END;
GO

INSERT INTO dbo.Categories (Name)
SELECT names.Name
FROM (VALUES (N'Desktop'), (N'Laptop'), (N'Monitor'), (N'Accessory'), (N'Air Cooler'), (N'Case'), (N'Case Fans'), (N'CPU'), (N'GPU'), (N'Keyboard'), (N'Liquid Cooler'), (N'Motherboard'), (N'Mouse'), (N'PSU'), (N'RAM'), (N'SSD')) AS names(Name)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Categories AS category WHERE category.Name = names.Name);
GO

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Products (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Products PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(200) NOT NULL,
    CategoryId INT NOT NULL CONSTRAINT FK_Products_Categories REFERENCES dbo.Categories(Id),
    Price DECIMAL(12, 2) NOT NULL CONSTRAINT CK_Products_Price CHECK (Price >= 0),
    Stock INT NOT NULL CONSTRAINT CK_Products_Stock CHECK (Stock >= 0),
    Status NVARCHAR(20) NOT NULL CONSTRAINT CK_Products_Status CHECK (Status IN ('active', 'inactive')),
    ImageData VARBINARY(MAX) NULL,
    ImageContentType NVARCHAR(100) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Products_UpdatedAt DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF COL_LENGTH(N'dbo.Products', N'CategoryId') IS NULL
BEGIN
  ALTER TABLE dbo.Products ADD CategoryId INT NULL;
END;
GO

IF COL_LENGTH(N'dbo.Products', N'Category') IS NOT NULL
BEGIN
  EXEC sys.sp_executesql N'
    INSERT INTO dbo.Categories (Name)
    SELECT DISTINCT product.Category
    FROM dbo.Products AS product
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Categories AS category WHERE category.Name = product.Category);

    UPDATE product
    SET CategoryId = category.Id
    FROM dbo.Products AS product
    INNER JOIN dbo.Categories AS category ON category.Name = product.Category
    WHERE product.CategoryId IS NULL;';
END;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Products') AND name = N'CategoryId' AND is_nullable = 1)
BEGIN
  ALTER TABLE dbo.Products ALTER COLUMN CategoryId INT NOT NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Products_Categories')
BEGIN
  ALTER TABLE dbo.Products ADD CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id);
END;
GO

IF COL_LENGTH(N'dbo.Products', N'ImageData') IS NULL
BEGIN
  ALTER TABLE dbo.Products ADD ImageData VARBINARY(MAX) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Products', N'ImageContentType') IS NULL
BEGIN
  ALTER TABLE dbo.Products ADD ImageContentType NVARCHAR(100) NULL;
END;
GO

IF COL_LENGTH(N'dbo.Products', N'ImageUrl') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Products DROP COLUMN ImageUrl;
END;
GO

IF COL_LENGTH(N'dbo.Products', N'Category') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Products DROP COLUMN Category;
END;
GO

IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'admin@pcstore.local')
   AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'superadmin@example.com')
BEGIN
  UPDATE dbo.Users
  SET Email = N'superadmin@example.com', FirstName = N'Demo', LastName = N'Owner', Role = N'superadmin'
  WHERE Email = N'admin@pcstore.local';
END;
GO

IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'admin@pcstore.local')
BEGIN
  DELETE FROM dbo.Users WHERE Email = N'admin@pcstore.local';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'superadmin@example.com')
BEGIN
  INSERT INTO dbo.Users (Email, FirstName, LastName, PasswordHash, Role)
  VALUES (N'superadmin@example.com', N'Demo', N'Owner', N'$2a$10$27WgVBrCVPde7sm5f7p4RuaiEXiQU0csclF8Ap/fCC.7PDTDEGAKC', N'superadmin');
END;
GO

UPDATE dbo.Users SET Role = N'superadmin' WHERE Email = N'superadmin@example.com';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'admin@example.com')
BEGIN
  INSERT INTO dbo.Users (Email, FirstName, LastName, PasswordHash, Role)
  VALUES (N'admin@example.com', N'Demo', N'Admin', N'$2a$10$27WgVBrCVPde7sm5f7p4RuaiEXiQU0csclF8Ap/fCC.7PDTDEGAKC', N'admin');
END;
GO

UPDATE dbo.Users SET Role = N'admin' WHERE Email = N'admin@example.com';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Products)
BEGIN
  INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Status)
  VALUES
    (N'Nardo Pro X1', (SELECT Id FROM dbo.Categories WHERE Name = N'Desktop'), 1299.00, 12, N'active'),
    (N'Creator 27 Monitor', (SELECT Id FROM dbo.Categories WHERE Name = N'Monitor'), 449.00, 7, N'active');
END;
GO

SELECT DB_NAME() AS DatabaseName, (SELECT COUNT(*) FROM dbo.Users) AS UsersCount, (SELECT COUNT(*) FROM dbo.Products) AS ProductsCount;
GO