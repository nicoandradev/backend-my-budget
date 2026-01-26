import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jwt';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/budget_test';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

import request from 'supertest';
import app from '../../src/app';
import { InviteTokenGenerator } from '../../src/infrastructure/jwt/InviteTokenGenerator';
import { PasswordHasher } from '../../src/infrastructure/password/PasswordHasher';

const inviteTokenGenerator = new InviteTokenGenerator();
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

async function createPendingUser(email: string): Promise<void> {
  const tempPassword = await passwordHasher.hash(`temp_${Date.now()}`);
  await pool.query(
    `INSERT INTO users (email, password, name, role, pending_active, active)
     VALUES ($1, $2, $3, $4, true, false)`,
    [email, tempPassword, '', 'user']
  );
}

describe('POST /register', () => {
  test('registra un usuario invitado con token válido y devuelve JWT', async () => {
    const email = 'test@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    const response = await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');

    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET!) as { userId: string; email: string };
    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('email', email);
  });

  test('devuelve 409 cuando el usuario ya está registrado y activo', async () => {
    const email = 'duplicate@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(201);

    await pool.query(
      'UPDATE users SET pending_active = false, active = true WHERE email = $1',
      [email]
    );

    const inviteToken2 = inviteTokenGenerator.generate(email);
    await request(app)
      .post('/register')
      .send({
        token: inviteToken2,
        name: 'Other Name',
        password: 'other456',
        passwordConfirm: 'other456'
      })
      .expect(409);
  });

  test('devuelve 400 cuando falta el token', async () => {
    await request(app)
      .post('/register')
      .send({
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(400);
  });

  test('devuelve 400 cuando falta el name', async () => {
    const email = 'noname@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(400);
  });

  test('devuelve 400 cuando falta el password', async () => {
    const email = 'nopass@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        passwordConfirm: 'password123'
      })
      .expect(400);
  });

  test('devuelve 400 cuando falta la confirmación de contraseña', async () => {
    const email = 'noconfirm@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        password: 'password123'
      })
      .expect(400);
  });

  test('devuelve 400 cuando las contraseñas no coinciden', async () => {
    const email = 'mismatch@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password456'
      })
      .expect(400);
  });

  test('devuelve 400 cuando el token es inválido', async () => {
    await request(app)
      .post('/register')
      .send({
        token: 'invalid-token',
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(400);
  });

  test('devuelve 400 cuando el token está expirado', async () => {
    const email = 'expired@example.com';
    await createPendingUser(email);
    const secret = process.env.JWT_SECRET!;
    const expiredToken = jwt.sign(
      { email, purpose: 'invite' },
      secret,
      { expiresIn: '0s' }
    );

    await request(app)
      .post('/register')
      .send({
        token: expiredToken,
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(400);
  });

  test('devuelve 400 cuando el token es válido pero el email no tiene invitación pendiente', async () => {
    const email = 'noinvite@example.com';
    const inviteToken = inviteTokenGenerator.generate(email);

    const response = await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(400);

    expect(response.body.error).toMatch(/invitación inválida|ya utilizada/i);
  });

  test('guarda la contraseña hasheada en la base de datos', async () => {
    const email = 'hash@example.com';
    await createPendingUser(email);
    const inviteToken = inviteTokenGenerator.generate(email);

    await request(app)
      .post('/register')
      .send({
        token: inviteToken,
        name: 'Test User',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      .expect(201);

    const result = await pool.query(
      'SELECT password FROM users WHERE email = $1',
      [email]
    );

    const storedPassword = result.rows[0].password;
    expect(storedPassword).not.toBe('password123');
    expect(storedPassword).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
  });
});
