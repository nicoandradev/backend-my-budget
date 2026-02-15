import { pool } from '../infrastructure/database/connection';
import * as GmailClient from '../infrastructure/gmail/GmailClient';
import { ExpenseExtractor } from '../infrastructure/openai/ExpenseExtractor';
import { CreateExpense } from './CreateExpense';
import { CreateIncome } from './CreateIncome';

interface BankEmailConfig {
  bankName: string;
  senderPatterns: string[];
  extractionInstructions: string;
}

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
    console.log('[ProcessGmail] Iniciando. emailAddress:', gmailAddress, 'historyId:', historyId);

    const connection = await this.findConnection(gmailAddress);
    if (!connection) {
      console.log('[ProcessGmail] No se encontró conexión para Gmail:', gmailAddress);
      return;
    }

    const { userId, refreshToken, lastHistoryId } = connection;
    console.log('[ProcessGmail] Conexión encontrada. userId:', userId, 'lastHistoryId:', lastHistoryId);

    const startHistoryId = lastHistoryId || historyId;
    const messageIds = await GmailClient.listHistoryMessageIds(refreshToken, startHistoryId);
    console.log('[ProcessGmail] IDs de mensajes obtenidos:', messageIds.length, messageIds);

    const bankConfigs = await this.loadBankConfigs();

    if (messageIds.length > 0) {
      for (const messageId of messageIds) {
        await this.processMessage(userId, refreshToken, messageId, bankConfigs);
      }
    } else {
      console.log('[ProcessGmail] No hay mensajes nuevos para', gmailAddress);
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

  private async processMessage(
    userId: string,
    refreshToken: string,
    messageId: string,
    bankConfigs: BankEmailConfig[]
  ): Promise<void> {
    const alreadyProcessed = await this.isAlreadyProcessed(messageId);
    if (alreadyProcessed) {
      console.log('[ProcessGmail] Mensaje', messageId, 'ya procesado, saltando');
      return;
    }

    const metadata = await GmailClient.getMessageMetadata(refreshToken, messageId);
    if (!metadata) {
      console.log('[ProcessGmail] No se pudo obtener metadata del mensaje', messageId);
      return;
    }

    const bankConfig = this.findMatchingBank(metadata.from, bankConfigs);
    if (!bankConfig) {
      console.log('[ProcessGmail] Mensaje', messageId, 'no coincide con ningún banco configurado. from:', metadata.from);
      return;
    }

    const message = await GmailClient.getMessage(refreshToken, messageId);
    if (!message) {
      console.log('[ProcessGmail] No se pudo obtener mensaje completo', messageId);
      return;
    }

    console.log('[ProcessGmail] Mensaje', bankConfig.bankName, 'obtenido:', { id: message.id, from: message.from, snippet: message.snippet?.slice(0, 80) });

    const emailBody = message.body || message.snippet;
    if (!emailBody) {
      console.log('[ProcessGmail] Mensaje', messageId, 'no tiene contenido');
      return;
    }

    console.log('[ProcessGmail] Cuerpo del correo (primeros 200 chars):', emailBody.slice(0, 200));

    const emailDate = message.date ? this.formatEmailDateForExtractor(message.date) : undefined;
    const transactions = await this.expenseExtractor.extractTransactions(
      emailBody,
      emailDate,
      bankConfig.bankName,
      bankConfig.extractionInstructions
    );
    console.log('[ProcessGmail] Transacciones extraídas:', transactions.length, JSON.stringify(transactions, null, 2));
    if (transactions.length === 0) {
      console.warn('[ProcessGmail] Cero transacciones extraídas. Revisa extraction_instructions para este banco. from:', metadata.from, 'snippet:', message.snippet?.slice(0, 100));
    }

    for (const tx of transactions) {
      const date = this.parseDate(tx.date);

      if (tx.type === 'expense') {
        await this.createExpense.execute(userId, tx.merchant, tx.amount, tx.category, date);
        console.log('[ProcessGmail] Gasto creado:', tx.merchant, tx.amount, tx.category);
      } else {
        await this.createIncome.execute(userId, tx.merchant, tx.amount, tx.category, date);
        console.log('[ProcessGmail] Ingreso creado:', tx.merchant, tx.amount, tx.category);
      }
    }

    await pool.query(
      'INSERT INTO processed_emails (gmail_message_id, user_id) VALUES ($1, $2)',
      [messageId, userId]
    );
    console.log('[ProcessGmail] Mensaje', messageId, 'marcado como procesado');
  }

  private async isAlreadyProcessed(messageId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM processed_emails WHERE gmail_message_id = $1',
      [messageId]
    );
    return result.rows.length > 0;
  }

  private async loadBankConfigs(): Promise<BankEmailConfig[]> {
    const result = await pool.query(
      'SELECT bank_name, sender_patterns, extraction_instructions FROM bank_email_configs'
    );
    const rows = result.rows as { bank_name: string; sender_patterns: string[]; extraction_instructions: string }[];
    return rows.map((row) => ({
      bankName: row.bank_name,
      senderPatterns: row.sender_patterns,
      extractionInstructions: row.extraction_instructions
    }));
  }

  private findMatchingBank(from: string, configs: BankEmailConfig[]): BankEmailConfig | null {
    const fromLower = from.toLowerCase().trim();
    return configs.find((config) => config.senderPatterns.some((pattern) => fromLower.includes(pattern.toLowerCase()))) ?? null;
  }

  private formatEmailDateForExtractor(dateValue: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return dateValue;
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
