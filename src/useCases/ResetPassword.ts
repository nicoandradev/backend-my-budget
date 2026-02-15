import { pool } from '../infrastructure/database/connection';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';

export class ResetPassword {
  constructor(private passwordHasher: PasswordHasher) {}

  async execute(email: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.passwordHasher.hash(newPassword);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );
  }
}
