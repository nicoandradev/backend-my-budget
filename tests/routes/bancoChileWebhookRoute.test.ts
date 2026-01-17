import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jwt';
process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/budget_test';
process.env.BANCOCHILE_USER_EMAIL = 'test@example.com';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

import request from 'supertest';
import app from '../../src/app';

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
  await pool.query('DELETE FROM expenses');
  await pool.query('DELETE FROM incomes');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
  await new Promise(resolve => setTimeout(resolve, 500));
});

describe('POST /webhooks/bancochile', () => {
  test('rejects request with invalid CloudEvent format', async () => {
    const response = await request(app)
      .post('/webhooks/bancochile')
      .send({ invalid: 'format' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Formato de CloudEvent inválido');
  });

  test('rejects request without data field', async () => {
    const response = await request(app)
      .post('/webhooks/bancochile')
      .send({
        specVersion: '1.0',
        type: 'movimiento',
        source: 'bancochile.cl',
        id: 'event-123',
        time: '2024-01-15T10:00:00Z'
      })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Formato de CloudEvent inválido');
  });

  test('rejects request without required CloudEvent fields', async () => {
    const response = await request(app)
      .post('/webhooks/bancochile')
      .send({
        data: {
          monto: 10000
        }
      })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'CloudEvent incompleto. Campos requeridos: id, type, source');
  });

  test('processes valid CloudEvent with expense transaction', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'Test User']
    );

    const cloudEvent = {
      specVersion: '1.0',
      type: 'movimiento.cargo',
      source: 'bancochile.cl',
      id: 'event-123',
      time: '2024-01-15T10:00:00Z',
      data: {
        monto: 15000,
        comercio: 'Supermercado',
        fecha: '2024-01-15',
        email: email
      }
    };

    const response = await request(app)
      .post('/webhooks/bancochile')
      .send(cloudEvent)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);

    const expensesResult = await pool.query(
      'SELECT * FROM expenses WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      [email]
    );

    expect(expensesResult.rows.length).toBe(1);
    expect(expensesResult.rows[0].amount).toBe('15000.00');
    expect(expensesResult.rows[0].merchant).toBe('Supermercado');
  });

  test('processes valid CloudEvent with income transaction', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'Test User']
    );

    const cloudEvent = {
      specVersion: '1.0',
      type: 'movimiento.abono',
      source: 'bancochile.cl',
      id: 'event-456',
      time: '2024-01-15T10:00:00Z',
      data: {
        monto: 50000,
        comercio: 'Transferencia',
        fecha: '2024-01-15',
        email: email
      }
    };

    const response = await request(app)
      .post('/webhooks/bancochile')
      .send(cloudEvent)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);

    const incomesResult = await pool.query(
      'SELECT * FROM incomes WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      [email]
    );

    expect(incomesResult.rows.length).toBe(1);
    expect(incomesResult.rows[0].amount).toBe('50000.00');
  });

  test('returns 400 when user email cannot be determined', async () => {
    const cloudEvent = {
      specVersion: '1.0',
      type: 'movimiento.cargo',
      source: 'bancochile.cl',
      id: 'event-123',
      time: '2024-01-15T10:00:00Z',
      data: {
        monto: 10000
      }
    };

    delete process.env.BANCOCHILE_USER_EMAIL;

    const response = await request(app)
      .post('/webhooks/bancochile')
      .send(cloudEvent)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'No se pudo determinar el email del usuario');

    process.env.BANCOCHILE_USER_EMAIL = 'test@example.com';
  });

  test('uses default user email when provided', async () => {
    process.env.BANCOCHILE_USER_EMAIL = 'default@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      ['default@example.com', hashedPassword, 'Default User']
    );

    const cloudEvent = {
      specVersion: '1.0',
      type: 'movimiento.cargo',
      source: 'bancochile.cl',
      id: 'event-789',
      time: '2024-01-15T10:00:00Z',
      data: {
        monto: 20000
      }
    };

    const response = await request(app)
      .post('/webhooks/bancochile')
      .send(cloudEvent)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });

  test('extracts user email from query parameter', async () => {
    const email = 'query@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'Query User']
    );

    const cloudEvent = {
      specVersion: '1.0',
      type: 'movimiento.cargo',
      source: 'bancochile.cl',
      id: 'event-query',
      time: '2024-01-15T10:00:00Z',
      data: {
        monto: 25000
      }
    };

    const response = await request(app)
      .post(`/webhooks/bancochile?email=${email}`)
      .send(cloudEvent)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });

  test('returns 404 when user is not found', async () => {
    const cloudEvent = {
      specVersion: '1.0',
      type: 'movimiento.cargo',
      source: 'bancochile.cl',
      id: 'event-notfound',
      time: '2024-01-15T10:00:00Z',
      data: {
        monto: 10000,
        email: 'nonexistent@example.com'
      }
    };

    const response = await request(app)
      .post('/webhooks/bancochile')
      .send(cloudEvent)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Usuario no encontrado');
  });
});
