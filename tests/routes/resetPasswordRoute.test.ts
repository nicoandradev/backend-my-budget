import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
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
import { RecoveryTokenGenerator } from '../../src/infrastructure/jwt/RecoveryTokenGenerator';

const passwordHasher = new PasswordHasher();
const recoveryTokenGenerator = new RecoveryTokenGenerator();

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

describe('POST /reset-password', () => {
  test('actualiza la contraseña y devuelve 200 con token válido', async () => {
    const email = 'reset@example.com';
    await createActiveUser(email, 'oldpass123', 'Test User');
    const token = recoveryTokenGenerator.generate(email);

    const response = await request(app)
      .post('/reset-password')
      .send({
        token,
        password: 'newpass456',
        passwordConfirm: 'newpass456'
      })
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Contraseña actualizada correctamente');

    const rows = await pool.query('SELECT password FROM users WHERE email = $1', [email]);
    const storedHash = rows.rows[0].password;
    expect(storedHash).not.toMatch(/oldpass123/);
    const matches = await passwordHasher.compare('newpass456', storedHash);
    expect(matches).toBe(true);
  });

  test('devuelve 400 cuando falta el token', async () => {
    await request(app)
      .post('/reset-password')
      .send({
        password: 'newpass456',
        passwordConfirm: 'newpass456'
      })
      .expect(400);
  });

  test('devuelve 400 cuando las contraseñas no coinciden', async () => {
    const email = 'mismatch@example.com';
    await createActiveUser(email, 'oldpass', 'User');
    const token = recoveryTokenGenerator.generate(email);

    await request(app)
      .post('/reset-password')
      .send({
        token,
        password: 'newpass456',
        passwordConfirm: 'other789'
      })
      .expect(400);
  });

  test('devuelve 400 cuando el token es inválido', async () => {
    await request(app)
      .post('/reset-password')
      .send({
        token: 'invalid-token',
        password: 'newpass456',
        passwordConfirm: 'newpass456'
      })
      .expect(400);
  });

  test('devuelve 400 cuando el token está expirado', async () => {
    const email = 'expired@example.com';
    await createActiveUser(email, 'oldpass', 'User');
    const secret = process.env.JWT_SECRET!;
    const expiredToken = jwt.sign(
      { email, purpose: 'password_reset' },
      secret,
      { expiresIn: '0s' }
    );

    await request(app)
      .post('/reset-password')
      .send({
        token: expiredToken,
        password: 'newpass456',
        passwordConfirm: 'newpass456'
      })
      .expect(400);
  });
});
