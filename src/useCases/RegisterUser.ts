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
      'SELECT id, pending_active, role FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length === 0) {
      throw new Error('Invitación inválida o ya utilizada');
    }

    const user = existingUser.rows[0];
    if (!user.pending_active) {
      throw new Error('Email ya existe');
    }

    const userRole = (user.role || 'user') as 'root' | 'admin' | 'user';
    const hashedPassword = await this.passwordHasher.hash(password);

    const result = await pool.query(
      `UPDATE users 
       SET password = $1, name = $2, pending_active = false, active = true, updated_at = NOW()
       WHERE email = $3
       RETURNING id, email, role`,
      [hashedPassword, name, email]
    );
    const updated = result.rows[0];
    return this.tokenGenerator.generate(updated.id, updated.email, updated.role);
  }
}

