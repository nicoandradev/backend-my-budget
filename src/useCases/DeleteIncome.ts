import { pool } from '../infrastructure/database/connection';

export class DeleteIncome {
  async execute(userId: string, incomeId: string): Promise<void> {
    const existingResult = await pool.query(
      'SELECT user_id FROM incomes WHERE id = $1',
      [incomeId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('Ingreso no encontrado');
    }

    if (existingResult.rows[0].user_id !== userId) {
      throw new Error('No autorizado para eliminar este ingreso');
    }

    await pool.query('DELETE FROM incomes WHERE id = $1', [incomeId]);
  }
}

