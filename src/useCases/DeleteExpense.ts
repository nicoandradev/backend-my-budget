import { pool } from '../infrastructure/database/connection';

export class DeleteExpense {
  async execute(userId: string, expenseId: string): Promise<void> {
    const existingResult = await pool.query(
      'SELECT user_id FROM expenses WHERE id = $1',
      [expenseId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('Gasto no encontrado');
    }

    if (existingResult.rows[0].user_id !== userId) {
      throw new Error('No autorizado para eliminar este gasto');
    }

    await pool.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
  }
}

