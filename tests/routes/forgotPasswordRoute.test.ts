import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PasswordHasher } from '../../src/infrastructure/password/PasswordHasher';

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jwt';
process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/budget_test';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

import request from 'supertest';
import app from '../../src/app';

const passwordHasher = new PasswordHasher();

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_active BOOLEAN DEFAULT false NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true NOT NULL;
  `);
});

afterEach(async () => {
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
  await new Promise(resolve => setTimeout(resolve, 500));
});

async function createActiveUser(email: string, password: string, name: string): Promise<void> {
  const hash = await passwordHasher.hash(password);
  await pool.query(
    `INSERT INTO users (email, password, name, role, pending_active, active)
     VALUES ($1, $2, $3, $4, false, true)`,
    [email, hash, name, 'user']
  );
}

describe('POST /forgot-password', () => {
  test('devuelve 400 cuando falta el email', async () => {
    const response = await request(app)
      .post('/forgot-password')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Email es requerido');
  });

  test('devuelve 400 cuando el email tiene formato inválido', async () => {
    const response = await request(app)
      .post('/forgot-password')
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Email tiene formato inválido');
  });

  test('devuelve 200 con mensaje genérico cuando el email no existe', async () => {
    const response = await request(app)
      .post('/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/si el email está registrado|recibirás un enlace/i);
  });

  test('devuelve 200 con mensaje genérico cuando el usuario existe y está activo', async () => {
    await createActiveUser('recover@example.com', 'oldpass123', 'Test User');

    const response = await request(app)
      .post('/forgot-password')
      .send({ email: 'recover@example.com' })
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/si el email está registrado|recibirás un enlace/i);
  });
});
