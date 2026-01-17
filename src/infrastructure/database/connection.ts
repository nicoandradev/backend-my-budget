import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let poolInstance: Pool | null = null;

function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está configurado');
    }
    poolInstance = new Pool({
      connectionString
    });
  }
  return poolInstance;
}

const pool = {
  query: (text: string, params?: any[]) => getPool().query(text, params),
  end: () => poolInstance?.end()
};

export { pool };

