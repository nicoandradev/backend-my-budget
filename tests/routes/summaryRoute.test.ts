import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jwt';
process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/budget_test';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

import request from 'supertest';
import app from '../../src/app';

async function createTestUser(email: string, password: string, name: string): Promise<string> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id',
    [email, hashedPassword, name]
  );
  return result.rows[0].id;
}

async function getAuthToken(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/login')
    .send({ email, password });
  return response.body.token;
}

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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS incomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
    CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
  `);
});

afterEach(async () => {
  await pool.query('DELETE FROM incomes');
  await pool.query('DELETE FROM expenses');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
  await new Promise(resolve => setTimeout(resolve, 500));
});

describe('GET /summary', () => {
  test('devuelve resumen sin filtros (todo el historial)', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    await pool.query(
      'INSERT INTO incomes (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Salario', 2500.00, 'Trabajo', '2024-01-15']
    );

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Supermercado', 500.00, 'Comida', '2024-01-15']
    );

    const response = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('totalIncomes', 2500);
    expect(response.body).toHaveProperty('totalExpenses', 500);
    expect(response.body).toHaveProperty('balance', 2000);
  });

  test('devuelve resumen por año completo', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    await pool.query(
      'INSERT INTO incomes (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Salario', 2500.00, 'Trabajo', '2024-01-15']
    );

    await pool.query(
      'INSERT INTO incomes (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Freelance', 300.00, 'Trabajo', '2023-12-31']
    );

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Supermercado', 500.00, 'Comida', '2024-01-15']
    );

    const response = await request(app)
      .get('/summary?year=2024')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('totalIncomes', 2500);
    expect(response.body).toHaveProperty('totalExpenses', 500);
    expect(response.body).toHaveProperty('balance', 2000);
  });

  test('devuelve resumen por mes específico', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    await pool.query(
      'INSERT INTO incomes (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Salario', 2500.00, 'Trabajo', '2024-01-15']
    );

    await pool.query(
      'INSERT INTO incomes (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Freelance', 300.00, 'Trabajo', '2024-02-15']
    );

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Supermercado', 500.00, 'Comida', '2024-01-20']
    );

    const response = await request(app)
      .get('/summary?year=2024&month=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('totalIncomes', 2500);
    expect(response.body).toHaveProperty('totalExpenses', 500);
    expect(response.body).toHaveProperty('balance', 2000);
  });

  test('devuelve 400 cuando month está presente sin year', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    await request(app)
      .get('/summary?month=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  test('devuelve resumen con 0 registros', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const response = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('totalIncomes', 0);
    expect(response.body).toHaveProperty('totalExpenses', 0);
    expect(response.body).toHaveProperty('balance', 0);
  });
});

