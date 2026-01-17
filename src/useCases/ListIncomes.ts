import { pool } from '../infrastructure/database/connection';
import { Income } from '../domain/Income';

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

export class ListIncomes {
  async execute(userId: string, year?: number, month?: number): Promise<Income[]> {
    let query = `SELECT id, user_id, merchant, amount, category, date, created_at, updated_at
                 FROM incomes
                 WHERE user_id = $1`;
    const params: (string | number)[] = [userId];

    if (year && month) {
      query += ` AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`;
      params.push(year, month);
    } else if (year) {
      query += ` AND EXTRACT(YEAR FROM date) = $2`;
      params.push(year);
    }

    query += ` ORDER BY date DESC, created_at DESC`;

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      merchant: row.merchant,
      amount: parseFloat(row.amount),
      category: row.category,
      date: parseDateFromPostgres(row.date),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }
}

