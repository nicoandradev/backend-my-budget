import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jwt';
process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/budget_test';

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
});

afterEach(async () => {
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
  await new Promise(resolve => setTimeout(resolve, 500));
});

describe('POST /register', () => {
  test('registra un usuario exitosamente y devuelve token JWT', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    const response = await request(app)
      .post('/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  test('devuelve 409 cuando el email ya existe', async () => {
    const userData = {
      email: 'duplicate@example.com',
      password: 'password123',
      name: 'Test User'
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(201);

    await request(app)
      .post('/register')
      .send(userData)
      .expect(409);
  });

  test('devuelve 400 cuando falta el email', async () => {
    const userData = {
      password: 'password123',
      name: 'Test User'
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(400);
  });

  test('devuelve 400 cuando falta el password', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User'
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(400);
  });

  test('devuelve 400 cuando falta el name', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123'
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(400);
  });

  test('devuelve 400 cuando el email tiene formato inválido', async () => {
    const userData = {
      email: 'email-invalido',
      password: 'password123',
      name: 'Test User'
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(400);
  });

  test('guarda la contraseña hasheada en la base de datos', async () => {
    const userData = {
      email: 'hash@example.com',
      password: 'password123',
      name: 'Test User'
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(201);

    const result = await pool.query(
      'SELECT password FROM users WHERE email = $1',
      [userData.email]
    );

    const storedPassword = result.rows[0].password;
    expect(storedPassword).not.toBe(userData.password);
    expect(storedPassword).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
  });

  test('devuelve un token JWT válido que contiene userId y email', async () => {
    const userData = {
      email: 'jwt@example.com',
      password: 'password123',
      name: 'Test User'
    };

    const response = await request(app)
      .post('/register')
      .send(userData)
      .expect(201);

    const token = response.body.token;
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };

    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('email', userData.email);
    expect(typeof decoded.userId).toBe('string');
  });
});

