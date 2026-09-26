import type sqlTypes from 'mssql';

const sqlConfig = {
  connectionString: [
    `Driver={${process.env.DB_DRIVER ?? 'ODBC Driver 18 for SQL Server'}}`,
    `Server=${process.env.DB_SERVER ?? 'localhost\\SQLEXPRESS'}`,
    `Database=${process.env.DB_NAME ?? 'pc_store'}`,
    'Trusted_Connection=Yes',
    'Encrypt=Optional',
    'TrustServerCertificate=Yes'
  ].join(';'),
  driver: 'msnodesqlv8',
  options: { trustedConnection: true, trustServerCertificate: true }
} as sqlTypes.config & { connectionString: string };

export async function createPool(): Promise<sqlTypes.ConnectionPool> {
  const { default: sql } = await import('mssql/msnodesqlv8.js');
  return sql.connect(sqlConfig);
}
