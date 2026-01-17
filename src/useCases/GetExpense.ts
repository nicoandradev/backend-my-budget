import { pool } from '../infrastructure/database/connection';
import { Expense } from '../domain/Expense';

function parseDateFromPostgres(dateValue: Date | string): Date {
  if (typeof dateValue === 'string') {
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const date = new Date(dateValue);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export class GetExpense {
  async execute(userId: string, expenseId: string): Promise<Expense> {
    const result = await pool.query(
      `SELECT id, user_id, merchant, amount, category, date, created_at, updated_at
       FROM expenses
       WHERE id = $1`,
      [expenseId]
    );

    if (result.rows.length === 0) {
      throw new Error('Gasto no encontrado');
    }

    const row = result.rows[0];

    if (row.user_id !== userId) {
      throw new Error('No autorizado para acceder a este gasto');
    }

    return {
      id: row.id,
      userId: row.user_id,
      merchant: row.merchant,
      amount: parseFloat(row.amount),
      category: row.category,
      date: parseDateFromPostgres(row.date),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

