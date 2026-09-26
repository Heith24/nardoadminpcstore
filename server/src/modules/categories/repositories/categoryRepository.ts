import { createPool } from '../../../config/database.js';
import type { Category } from '../../../shared/types.js';

export const categoryRepository = {
  async findAll(): Promise<Category[]> {
    const pool = await createPool();
    const result = await pool.request().query<Category>('SELECT Id AS id, Name AS name FROM dbo.Categories ORDER BY Name');
    return result.recordset;
  }
};