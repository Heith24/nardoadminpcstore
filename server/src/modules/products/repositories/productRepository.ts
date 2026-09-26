import sql from 'mssql';
import { createPool } from '../../../config/database.js';
import type { Product } from '../../../shared/types.js';

type ProductInput = Pick<Product, 'name' | 'categoryId' | 'price' | 'stock' | 'status'> & { imageData?: string | null };
type ProductRow = Product;
type ProductImage = { data: Buffer; contentType: string };

export interface ProductRepository {
  findAll: () => Promise<Product[]>;
  findById: (id: string) => Promise<Product | undefined>;
  findImageById: (id: string) => Promise<ProductImage | undefined>;
  create: (input: ProductInput) => Promise<Product>;
  update: (id: string, input: Partial<ProductInput>) => Promise<Product | undefined>;
  remove: (id: string) => Promise<boolean>;
}

function decodeImage(imageData?: string | null) {
  if (!imageData) return { data: null, contentType: null };
  const separator = imageData.indexOf(',');
  return {
    data: Buffer.from(imageData.slice(separator + 1), 'base64'),
    contentType: imageData.slice(5, imageData.indexOf(';'))
  };
}

const productSelect = `SELECT p.Id AS id, p.Name AS name, p.CategoryId AS categoryId, category.Name AS category, p.Price AS price, p.Stock AS stock, p.Status AS status, CASE WHEN p.ImageData IS NULL THEN NULL ELSE '/api/products/' + CONVERT(nvarchar(36), p.Id) + '/image' END AS imageUrl FROM dbo.Products AS p INNER JOIN dbo.Categories AS category ON category.Id = p.CategoryId`;

export const productRepository: ProductRepository = {
  async findAll() {
    const pool = await createPool();
    const result = await pool.request().query<ProductRow>(`${productSelect} ORDER BY p.Name`);
    return result.recordset;
  },
  async findById(id) {
    const pool = await createPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query<ProductRow>(`${productSelect} WHERE p.Id = @id`);
    return result.recordset[0];
  },
  async findImageById(id) {
    const pool = await createPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query<ProductImage>('SELECT ImageData AS data, ImageContentType AS contentType FROM dbo.Products WHERE Id = @id AND ImageData IS NOT NULL');
    return result.recordset[0];
  },
  async create(input) {
    const pool = await createPool();
    const image = decodeImage(input.imageData);
    const result = await pool.request()
      .input('name', sql.NVarChar(200), input.name)
      .input('categoryId', sql.Int, input.categoryId)
      .input('price', sql.Decimal(12, 2), input.price)
      .input('stock', sql.Int, input.stock)
      .input('status', sql.NVarChar(20), input.status)
      .input('imageData', sql.VarBinary(sql.MAX), image.data)
      .input('imageContentType', sql.NVarChar(100), image.contentType)
      .query<{ id: string }>('INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Status, ImageData, ImageContentType) OUTPUT INSERTED.Id AS id VALUES (@name, @categoryId, @price, @stock, @status, @imageData, @imageContentType)');
    return (await this.findById(result.recordset[0].id))!;
  },
  async update(id, input) {
    const current = await this.findById(id);
    if (!current) return undefined;
    const updated = { ...current, ...input };
    const image = decodeImage(input.imageData);
    const pool = await createPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar(200), updated.name)
      .input('categoryId', sql.Int, updated.categoryId)
      .input('price', sql.Decimal(12, 2), updated.price)
      .input('stock', sql.Int, updated.stock)
      .input('status', sql.NVarChar(20), updated.status)
      .input('imageProvided', sql.Bit, input.imageData !== undefined)
      .input('imageData', sql.VarBinary(sql.MAX), image.data)
      .input('imageContentType', sql.NVarChar(100), image.contentType)
      .query('UPDATE dbo.Products SET Name = @name, CategoryId = @categoryId, Price = @price, Stock = @stock, Status = @status, ImageData = CASE WHEN @imageProvided = 1 THEN @imageData ELSE ImageData END, ImageContentType = CASE WHEN @imageProvided = 1 THEN @imageContentType ELSE ImageContentType END, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id');
    return this.findById(id);
  },
  async remove(id) {
    const pool = await createPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query('DELETE FROM dbo.Products WHERE Id = @id');
    return (result.rowsAffected[0] ?? 0) > 0;
  }
};