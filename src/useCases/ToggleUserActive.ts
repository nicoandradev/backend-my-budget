import { pool } from '../infrastructure/database/connection';

export class ToggleUserActive {
  async execute(requesterUserId: string, targetUserId: string, active: boolean): Promise<void> {
    if (requesterUserId === targetUserId) {
      throw new Error('No puedes cambiar tu propio estado');
    }

    const result = await pool.query(
      'UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [active, targetUserId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }
  }
}
