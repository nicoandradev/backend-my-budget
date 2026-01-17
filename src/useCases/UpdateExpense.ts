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

function formatDateForPostgres(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class UpdateExpense {
  async execute(
    userId: string,
    expenseId: string,
    merchant: string,
    amount: number,
    category: string,
    date: Date
  ): Promise<Expense> {
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    const existingResult = await pool.query(
      'SELECT user_id FROM expenses WHERE id = $1',
      [expenseId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('Gasto no encontrado');
    }

    if (existingResult.rows[0].user_id !== userId) {
      throw new Error('No autorizado para actualizar este gasto');
    }

    const dateString = formatDateForPostgres(date);
    const result = await pool.query(
      `UPDATE expenses
       SET merchant = $1, amount = $2, category = $3, date = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, user_id, merchant, amount, category, date, created_at, updated_at`,
      [merchant, amount, category, dateString, expenseId]
    );

    const row = result.rows[0];
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

