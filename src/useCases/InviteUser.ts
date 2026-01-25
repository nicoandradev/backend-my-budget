import { pool } from '../infrastructure/database/connection';
import { EmailValidator } from '../infrastructure/validation/EmailValidator';
import { EmailService } from '../infrastructure/email/EmailService';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';

export class InviteUser {
  constructor(
    private emailValidator: EmailValidator,
    private emailService: EmailService,
    private passwordHasher: PasswordHasher
  ) {}

  async execute(inviterUserId: string, email: string): Promise<void> {
    if (!this.emailValidator.isValid(email)) {
      throw new Error('Email tiene formato inválido');
    }

    const existingUser = await pool.query(
      'SELECT id, active, pending_active FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.active && !user.pending_active) {
        throw new Error('El usuario ya está registrado y activo');
      }
      if (user.pending_active) {
        await this.emailService.sendInvitationEmail(email);
        return;
      }
    }

    const tempPassword = await this.passwordHasher.hash(`temp_${Date.now()}_${Math.random()}`);
    
    await pool.query(
      `INSERT INTO users (email, password, name, role, pending_active, active)
       VALUES ($1, $2, $3, $4, true, false)`,
      [email, tempPassword, '', 'user']
    );

    await this.emailService.sendInvitationEmail(email);
  }
}
