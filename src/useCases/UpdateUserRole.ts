import { pool } from '../infrastructure/database/connection';

export class UpdateUserRole {
  async execute(
    requesterUserId: string,
    targetUserId: string,
    newRole: 'root' | 'admin' | 'user'
  ): Promise<void> {
    if (requesterUserId === targetUserId) {
      throw new Error('No puedes cambiar tu propio rol');
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [newRole, targetUserId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }
  }
}
