import sql from 'mssql';
import { createPool } from '../../../config/database.js';
import type { User } from '../../../shared/types.js';

type UserRow = User & { passwordHash?: string };
type UserImage = { data: Buffer; contentType: string };
type NewUser = Pick<User, 'email' | 'firstName' | 'lastName' | 'role'> & { passwordHash: string; imageData?: string | null };

function decodeImage(imageData?: string | null) {
  if (!imageData) return { data: null, contentType: null };
  const separator = imageData.indexOf(',');
  return { data: Buffer.from(imageData.slice(separator + 1), 'base64'), contentType: imageData.slice(5, imageData.indexOf(';')) };
}

const userSelect = `SELECT Id AS id, Email AS email, FirstName AS firstName, LastName AS lastName, Role AS role, CASE WHEN ImageData IS NULL THEN NULL ELSE '/api/users/' + CONVERT(nvarchar(36), Id) + '/image' END AS imageUrl FROM dbo.Users`;

export const userRepository = {
  async findAll(): Promise<User[]> {
    const pool = await createPool();
    const result = await pool.request().query<User>(`${userSelect} ORDER BY FirstName, LastName`);
    return result.recordset;
  },
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const pool = await createPool();
    const result = await pool.request().input('email', sql.NVarChar(255), email)
      .query<UserRow>(`SELECT Id AS id, Email AS email, FirstName AS firstName, LastName AS lastName, Role AS role, CASE WHEN ImageData IS NULL THEN NULL ELSE '/api/users/' + CONVERT(nvarchar(36), Id) + '/image' END AS imageUrl, PasswordHash AS passwordHash FROM dbo.Users WHERE Email = @email`);
    return result.recordset[0];
  },
  async findById(id: string): Promise<User | undefined> {
    const pool = await createPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query<User>(`${userSelect} WHERE Id = @id`);
    return result.recordset[0];
  },
  async findImageById(id: string): Promise<UserImage | undefined> {
    const pool = await createPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query<UserImage>('SELECT ImageData AS data, ImageContentType AS contentType FROM dbo.Users WHERE Id = @id AND ImageData IS NOT NULL');
    return result.recordset[0];
  },
  async create(input: NewUser): Promise<User> {
    const pool = await createPool();
    const image = decodeImage(input.imageData);
    const result = await pool.request()
      .input('email', sql.NVarChar(255), input.email)
      .input('firstName', sql.NVarChar(60), input.firstName)
      .input('lastName', sql.NVarChar(60), input.lastName)
      .input('passwordHash', sql.NVarChar(255), input.passwordHash)
      .input('role', sql.NVarChar(20), input.role)
      .input('imageData', sql.VarBinary(sql.MAX), image.data)
      .input('imageContentType', sql.NVarChar(100), image.contentType)
      .query<{ id: string }>('INSERT INTO dbo.Users (Email, FirstName, LastName, PasswordHash, Role, ImageData, ImageContentType) OUTPUT INSERTED.Id AS id VALUES (@email, @firstName, @lastName, @passwordHash, @role, @imageData, @imageContentType)');
    return (await this.findById(result.recordset[0].id))!;
  }
};
