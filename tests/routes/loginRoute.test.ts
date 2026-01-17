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

describe('POST /login', () => {
  test('inicia sesión exitosamente y devuelve token JWT', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'Test User']
    );

    const response = await request(app)
      .post('/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  test('devuelve 401 cuando el email no existe', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
  });

  test('devuelve 401 cuando la contraseña es incorrecta', async () => {
    const email = 'test@example.com';
    const correctPassword = 'password123';
    const hashedPassword = await bcrypt.hash(correctPassword, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'Test User']
    );

    const response = await request(app)
      .post('/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
  });

  test('devuelve 400 cuando falta el email', async () => {
    await request(app)
      .post('/login')
      .send({ password: 'password123' })
      .expect(400);
  });

  test('devuelve 400 cuando falta el password', async () => {
    await request(app)
      .post('/login')
      .send({ email: 'test@example.com' })
      .expect(400);
  });

  test('devuelve 400 cuando el email tiene formato inválido', async () => {
    await request(app)
      .post('/login')
      .send({ email: 'email-invalido', password: 'password123' })
      .expect(400);
  });

  test('devuelve un token JWT válido que contiene userId y email', async () => {
    const email = 'jwt@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'Test User']
    );

    const response = await request(app)
      .post('/login')
      .send({ email, password })
      .expect(200);

    const token = response.body.token;
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };

    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('email', email);
    expect(typeof decoded.userId).toBe('string');
  });
});

