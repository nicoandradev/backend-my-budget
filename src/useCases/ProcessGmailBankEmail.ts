import { pool } from '../infrastructure/database/connection';
import * as GmailClient from '../infrastructure/gmail/GmailClient';
import { ExpenseExtractor } from '../infrastructure/openai/ExpenseExtractor';
import { CreateExpense } from './CreateExpense';
import { CreateIncome } from './CreateIncome';

const bancoChileDomains = ['bancochile.cl', 'notificaciones.bancochile.cl'];

export class ProcessGmailBankEmail {
  private expenseExtractor: ExpenseExtractor;
  private createExpense: CreateExpense;
  private createIncome: CreateIncome;

  constructor() {
    this.expenseExtractor = new ExpenseExtractor();
    this.createExpense = new CreateExpense();
    this.createIncome = new CreateIncome();
  }

  async execute(gmailAddress: string, historyId: string): Promise<void> {
    const connection = await this.findConnection(gmailAddress);
    if (!connection) {
      console.log(`No se encontró conexión para Gmail: ${gmailAddress}`);
      return;
    }

    const { userId, refreshToken, lastHistoryId } = connection;

    const startHistoryId = lastHistoryId || historyId;
    const messageIds = await GmailClient.listHistoryMessageIds(refreshToken, startHistoryId);

    if (messageIds.length === 0) {
      console.log(`No hay mensajes nuevos para ${gmailAddress}`);
      return;
    }

    for (const messageId of messageIds) {
      await this.processMessage(userId, refreshToken, messageId);
    }

    await pool.query(
      'UPDATE gmail_connections SET history_id = $1, updated_at = NOW() WHERE gmail_address = $2',
      [historyId, gmailAddress]
    );
  }

  private async findConnection(gmailAddress: string): Promise<{
    userId: string;
    refreshToken: string;
    lastHistoryId: string | null;
  } | null> {
    const result = await pool.query(
      'SELECT user_id, refresh_token, history_id FROM gmail_connections WHERE gmail_address = $1',
      [gmailAddress]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      userId: result.rows[0].user_id,
      refreshToken: result.rows[0].refresh_token,
      lastHistoryId: result.rows[0].history_id ? String(result.rows[0].history_id) : null
    };
  }

  private async processMessage(userId: string, refreshToken: string, messageId: string): Promise<void> {
    const alreadyProcessed = await this.isAlreadyProcessed(messageId);
    if (alreadyProcessed) {
      console.log(`Mensaje ${messageId} ya procesado, saltando`);
      return;
    }

    const message = await GmailClient.getMessage(refreshToken, messageId);
    if (!message) {
      console.log(`No se pudo obtener mensaje ${messageId}`);
      return;
    }

    const isBancoChile = this.isBancoChileEmail(message.from);
    if (!isBancoChile) {
      console.log(`Mensaje ${messageId} no es de Banco de Chile (from: ${message.from})`);
      return;
    }

    const emailBody = message.body || message.snippet;
    if (!emailBody) {
      console.log(`Mensaje ${messageId} no tiene contenido`);
      return;
    }

    const transactions = await this.expenseExtractor.extractTransactions(emailBody);
    console.log(`Extraídas ${transactions.length} transacciones del mensaje ${messageId}`);

    for (const tx of transactions) {
      const date = this.parseDate(tx.date);

      if (tx.type === 'expense') {
        await this.createExpense.execute(userId, tx.merchant, tx.amount, tx.category, date);
      } else {
        await this.createIncome.execute(userId, tx.merchant, tx.amount, tx.category, date);
      }
    }

    await pool.query(
      'INSERT INTO processed_emails (gmail_message_id, user_id) VALUES ($1, $2)',
      [messageId, userId]
    );
  }

  private async isAlreadyProcessed(messageId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM processed_emails WHERE gmail_message_id = $1',
      [messageId]
    );
    return result.rows.length > 0;
  }

  private isBancoChileEmail(from: string): boolean {
    const fromLower = from.toLowerCase();
    return bancoChileDomains.some(domain => fromLower.includes(domain));
  }

  private parseDate(dateString: string): Date {
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    return new Date();
  }
}
