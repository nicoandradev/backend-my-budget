import { pool } from '../infrastructure/database/connection';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';
import { TokenGenerator } from '../infrastructure/jwt/TokenGenerator';

export class RegisterUser {
  constructor(
    private passwordHasher: PasswordHasher,
    private tokenGenerator: TokenGenerator
  ) {}

  async execute(email: string, password: string, name: string): Promise<string> {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email ya existe');
    }

    const hashedPassword = await this.passwordHasher.hash(password);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email',
      [email, hashedPassword, name]
    );

    const user = result.rows[0];
    return this.tokenGenerator.generate(user.id, user.email);
  }
}

