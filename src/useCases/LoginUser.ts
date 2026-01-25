import { pool } from '../infrastructure/database/connection';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';
import { TokenGenerator } from '../infrastructure/jwt/TokenGenerator';

export class LoginUser {
  constructor(
    private passwordHasher: PasswordHasher,
    private tokenGenerator: TokenGenerator
  ) {}

  async execute(email: string, password: string): Promise<string> {
    const result = await pool.query(
      'SELECT id, email, password, role, active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Credenciales inválidas');
    }

    const user = result.rows[0];

    if (!user.active) {
      throw new Error('Usuario desactivado');
    }

    const isPasswordValid = await this.passwordHasher.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    return this.tokenGenerator.generate(user.id, user.email, user.role);
  }
}

