import { pool } from '../infrastructure/database/connection';

export interface FinancialSummary {
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
}

export class GetFinancialSummary {
  async execute(userId: string, year?: number, month?: number): Promise<FinancialSummary> {
    let incomesQuery = `SELECT COALESCE(SUM(amount), 0) as total
                        FROM incomes
                        WHERE user_id = $1`;
    let expensesQuery = `SELECT COALESCE(SUM(amount), 0) as total
                         FROM expenses
                         WHERE user_id = $1`;
    
    const incomesParams: (string | number)[] = [userId];
    const expensesParams: (string | number)[] = [userId];

    if (year && month) {
      incomesQuery += ` AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`;
      expensesQuery += ` AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`;
      incomesParams.push(year, month);
      expensesParams.push(year, month);
    } else if (year) {
      incomesQuery += ` AND EXTRACT(YEAR FROM date) = $2`;
      expensesQuery += ` AND EXTRACT(YEAR FROM date) = $2`;
      incomesParams.push(year);
      expensesParams.push(year);
    }

    const incomesResult = await pool.query(incomesQuery, incomesParams);
    const expensesResult = await pool.query(expensesQuery, expensesParams);

    const totalIncomes = parseFloat(incomesResult.rows[0].total || '0');
    const totalExpenses = parseFloat(expensesResult.rows[0].total || '0');
    const balance = totalIncomes - totalExpenses;

    return {
      totalIncomes,
      totalExpenses,
      balance
    };
  }
}

