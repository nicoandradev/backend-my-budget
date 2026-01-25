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

    let userRole: 'root' | 'admin' | 'user' = 'user';
    let isPendingInvitation = false;

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.pending_active) {
        isPendingInvitation = true;
        userRole = user.role || 'user';
      } else {
        throw new Error('Email ya existe');
      }
    } else {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      const firstUserIsRoot = process.env.FIRST_USER_IS_ROOT === 'true';
      
      if (firstUserIsRoot && parseInt(userCount.rows[0].count) === 0) {
        userRole = 'root';
      }
    }

    const hashedPassword = await this.passwordHasher.hash(password);
    
    if (isPendingInvitation) {
      const result = await pool.query(
        `UPDATE users 
         SET password = $1, name = $2, pending_active = false, active = true, updated_at = NOW()
         WHERE email = $3
         RETURNING id, email, role`,
        [hashedPassword, name, email]
      );
      const user = result.rows[0];
      return this.tokenGenerator.generate(user.id, user.email, user.role);
    } else {
      const result = await pool.query(
        `INSERT INTO users (email, password, name, role, pending_active, active) 
         VALUES ($1, $2, $3, $4, false, true) 
         RETURNING id, email, role`,
        [email, hashedPassword, name, userRole]
      );
      const user = result.rows[0];
      return this.tokenGenerator.generate(user.id, user.email, user.role);
    }
  }
}

