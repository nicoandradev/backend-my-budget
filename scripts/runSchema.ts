import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runSchema() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('Error: DATABASE_URL no está configurado en las variables de entorno');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString
  });

  try {
    const schemaPath = join(__dirname, '../src/infrastructure/database/schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');

    console.log('Ejecutando schema SQL...');
    await pool.query(schemaSQL);
    console.log('✅ Schema ejecutado exitosamente. Todas las tablas han sido creadas.');
  } catch (error) {
    console.error('❌ Error al ejecutar el schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSchema();

