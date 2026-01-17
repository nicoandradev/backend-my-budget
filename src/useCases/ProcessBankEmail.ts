import { CloudEventParser, CloudEvent, ParsedTransaction } from '../infrastructure/bancochile/CloudEventParser';
import { CreateExpense } from './CreateExpense';
import { CreateIncome } from './CreateIncome';
import { pool } from '../infrastructure/database/connection';

export class ProcessBankEmail {
  private cloudEventParser: CloudEventParser;
  private createExpense: CreateExpense;
  private createIncome: CreateIncome;

  constructor() {
    this.cloudEventParser = new CloudEventParser();
    this.createExpense = new CreateExpense();
    this.createIncome = new CreateIncome();
  }

  async execute(cloudEvent: CloudEvent, userEmail: string): Promise<void> {
    const parsedTransaction = this.cloudEventParser.parse(cloudEvent);
    if (!parsedTransaction) {
      throw new Error('No se pudo parsear la transacción del evento');
    }

    const userId = await this.findUserIdByEmail(userEmail);
    if (!userId) {
      throw new Error(`Usuario no encontrado para el email: ${userEmail}`);
    }

    const defaultCategory = parsedTransaction.type === 'expense' ? 'Otros' : 'Ingresos';

    if (parsedTransaction.type === 'expense') {
      await this.createExpense.execute(
        userId,
        parsedTransaction.merchant,
        parsedTransaction.amount,
        defaultCategory,
        parsedTransaction.date
      );
    } else {
      await this.createIncome.execute(
        userId,
        parsedTransaction.merchant,
        parsedTransaction.amount,
        defaultCategory,
        parsedTransaction.date
      );
    }
  }

  private async findUserIdByEmail(email: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  }
}
