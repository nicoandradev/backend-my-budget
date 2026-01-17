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

export class CreateExpense {
  async execute(
    userId: string,
    merchant: string,
    amount: number,
    category: string,
    date: Date
  ): Promise<Expense> {
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    const dateString = formatDateForPostgres(date);
    const result = await pool.query(
      `INSERT INTO expenses (user_id, merchant, amount, category, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, merchant, amount, category, date, created_at, updated_at`,
      [userId, merchant, amount, category, dateString]
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

