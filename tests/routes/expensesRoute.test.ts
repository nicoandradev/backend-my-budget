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

describe('POST /expenses', () => {
  test('crea un gasto exitosamente', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const expenseData = {
      merchant: 'Supermercado XYZ',
      amount: 125.50,
      category: 'Comida',
      date: '2024-01-15'
    };

    const response = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(expenseData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId', userId);
    expect(response.body).toHaveProperty('merchant', expenseData.merchant);
    expect(response.body).toHaveProperty('amount', expenseData.amount);
    expect(response.body).toHaveProperty('category', expenseData.category);
    expect(response.body).toHaveProperty('date', expenseData.date);
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
  });

  test('devuelve 401 cuando no se proporciona token', async () => {
    const expenseData = {
      merchant: 'Supermercado XYZ',
      amount: 125.50,
      category: 'Comida',
      date: '2024-01-15'
    };

    await request(app)
      .post('/expenses')
      .send(expenseData)
      .expect(401);
  });

  test('devuelve 400 cuando falta merchant', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const expenseData = {
      amount: 125.50,
      category: 'Comida',
      date: '2024-01-15'
    };

    await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(expenseData)
      .expect(400);
  });

  test('devuelve 400 cuando falta amount', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const expenseData = {
      merchant: 'Supermercado XYZ',
      category: 'Comida',
      date: '2024-01-15'
    };

    await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(expenseData)
      .expect(400);
  });

  test('devuelve 400 cuando falta category', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const expenseData = {
      merchant: 'Supermercado XYZ',
      amount: 125.50,
      date: '2024-01-15'
    };

    await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(expenseData)
      .expect(400);
  });

  test('devuelve 400 cuando falta date', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const expenseData = {
      merchant: 'Supermercado XYZ',
      amount: 125.50,
      category: 'Comida'
    };

    await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(expenseData)
      .expect(400);
  });

  test('devuelve 400 cuando el amount es cero o negativo', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const expenseData = {
      merchant: 'Supermercado XYZ',
      amount: 0,
      category: 'Comida',
      date: '2024-01-15'
    };

    await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(expenseData)
      .expect(400);
  });
});

describe('GET /expenses', () => {
  test('lista todos los gastos del usuario autenticado', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'Gasolinera ABC', 50.00, 'Transporte', '2024-01-16']
    );

    const response = await request(app)
      .get('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('merchant');
  });

  test('devuelve lista vacía cuando el usuario no tiene gastos', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const response = await request(app)
      .get('/expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  test('solo devuelve gastos del usuario autenticado', async () => {
    const userId1 = await createTestUser('test1@example.com', 'password123', 'Test User 1');
    const userId2 = await createTestUser('test2@example.com', 'password123', 'Test User 2');
    const token1 = await getAuthToken('test1@example.com', 'password123');

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId1, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );

    await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5)',
      [userId2, 'Gasolinera ABC', 50.00, 'Transporte', '2024-01-16']
    );

    const response = await request(app)
      .get('/expenses')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].merchant).toBe('Supermercado XYZ');
  });

  test('devuelve 401 cuando no se proporciona token', async () => {
    await request(app)
      .get('/expenses')
      .expect(401);
  });
});

describe('GET /expenses/:id', () => {
  test('obtiene un gasto por ID exitosamente', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    const response = await request(app)
      .get(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', expenseId);
    expect(response.body).toHaveProperty('merchant', 'Supermercado XYZ');
    expect(response.body).toHaveProperty('amount', 125.50);
    expect(response.body).toHaveProperty('category', 'Comida');
  });

  test('devuelve 404 cuando el gasto no existe', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app)
      .get(`/expenses/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  test('devuelve 403 cuando el gasto pertenece a otro usuario', async () => {
    const userId1 = await createTestUser('test1@example.com', 'password123', 'Test User 1');
    await createTestUser('test2@example.com', 'password123', 'Test User 2');
    const token2 = await getAuthToken('test2@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId1, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    await request(app)
      .get(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);
  });

  test('devuelve 401 cuando no se proporciona token', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app)
      .get(`/expenses/${fakeId}`)
      .expect(401);
  });
});

describe('PUT /expenses/:id', () => {
  test('actualiza un gasto exitosamente', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    const updateData = {
      merchant: 'Supermercado ABC',
      amount: 150.00,
      category: 'Comida',
      date: '2024-01-16'
    };

    const response = await request(app)
      .put(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(200);

    expect(response.body).toHaveProperty('id', expenseId);
    expect(response.body).toHaveProperty('merchant', updateData.merchant);
    expect(response.body).toHaveProperty('amount', updateData.amount);
    expect(response.body).toHaveProperty('date', updateData.date);
  });

  test('devuelve 404 cuando el gasto no existe', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const fakeId = '00000000-0000-0000-0000-000000000000';

    const updateData = {
      merchant: 'Supermercado ABC',
      amount: 150.00,
      category: 'Comida',
      date: '2024-01-16'
    };

    await request(app)
      .put(`/expenses/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(404);
  });

  test('devuelve 403 cuando el gasto pertenece a otro usuario', async () => {
    const userId1 = await createTestUser('test1@example.com', 'password123', 'Test User 1');
    await createTestUser('test2@example.com', 'password123', 'Test User 2');
    const token2 = await getAuthToken('test2@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId1, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    const updateData = {
      merchant: 'Supermercado ABC',
      amount: 150.00,
      category: 'Comida',
      date: '2024-01-16'
    };

    await request(app)
      .put(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send(updateData)
      .expect(403);
  });

  test('devuelve 400 cuando falta merchant', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    const updateData = {
      amount: 150.00,
      category: 'Comida',
      date: '2024-01-16'
    };

    await request(app)
      .put(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(400);
  });

  test('devuelve 400 cuando el amount es cero o negativo', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    const updateData = {
      merchant: 'Supermercado ABC',
      amount: -10,
      category: 'Comida',
      date: '2024-01-16'
    };

    await request(app)
      .put(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData)
      .expect(400);
  });

  test('devuelve 401 cuando no se proporciona token', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app)
      .put(`/expenses/${fakeId}`)
      .send({ merchant: 'Test', amount: 100, category: 'Test', date: '2024-01-15' })
      .expect(401);
  });
});

describe('DELETE /expenses/:id', () => {
  test('elimina un gasto exitosamente', async () => {
    const userId = await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    await request(app)
      .delete(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const checkResult = await pool.query('SELECT id FROM expenses WHERE id = $1', [expenseId]);
    expect(checkResult.rows).toHaveLength(0);
  });

  test('devuelve 404 cuando el gasto no existe', async () => {
    await createTestUser('test@example.com', 'password123', 'Test User');
    const token = await getAuthToken('test@example.com', 'password123');

    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app)
      .delete(`/expenses/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  test('devuelve 403 cuando el gasto pertenece a otro usuario', async () => {
    const userId1 = await createTestUser('test1@example.com', 'password123', 'Test User 1');
    await createTestUser('test2@example.com', 'password123', 'Test User 2');
    const token2 = await getAuthToken('test2@example.com', 'password123');

    const result = await pool.query(
      'INSERT INTO expenses (user_id, merchant, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId1, 'Supermercado XYZ', 125.50, 'Comida', '2024-01-15']
    );
    const expenseId = result.rows[0].id;

    await request(app)
      .delete(`/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);
  });

  test('devuelve 401 cuando no se proporciona token', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app)
      .delete(`/expenses/${fakeId}`)
      .expect(401);
  });
});

