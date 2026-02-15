import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export interface ExtractedTransaction {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  type: 'expense' | 'income';
}

const validCategories = [
  'Deporte',
  'Ropa',
  'Recreacional',
  'TC',
  'Cursos',
  'Supermercado',
  'Transporte',
  'Vacaciones',
  'Ahorros',
  'Salud',
  'Hogar',
  'Otros'
];

const defaultSystemPrompt = `Eres un asistente que extrae transacciones bancarias del contenido de correos electrónicos del Banco de Chile.

Extrae TODAS las transacciones del correo y devuelve un array JSON con cada transacción.

Para cada transacción:
- merchant: nombre del comercio o descripción de la transacción
- amount: monto como número (sin símbolos de moneda)
- date: fecha en formato YYYY-MM-DD (si no está clara, usa la fecha del correo)
- category: clasifica en UNA de estas categorías: Deporte, Ropa, Recreacional, TC, Cursos, Supermercado, Transporte, Vacaciones, Ahorros, Salud, Hogar, Otros
- type: "expense" para gastos/cargos, "income" para abonos/depósitos

Si no encuentras transacciones válidas, devuelve un array vacío [].`;

export class ExpenseExtractor {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurado');
    }
    this.client = new OpenAI({ apiKey });
  }

  async extractTransactions(
    emailBody: string,
    emailDate?: string,
    bankName?: string,
    extractionInstructions?: string
  ): Promise<ExtractedTransaction[]> {
    const systemPrompt =
      bankName && extractionInstructions
        ? `Eres un asistente que extrae transacciones bancarias del contenido de correos electrónicos de ${bankName}.\n\n${extractionInstructions}\n\nDevuelve un array JSON con cada transacción. Para cada transacción: merchant, amount (número), date (YYYY-MM-DD), category (Deporte, Ropa, Recreacional, TC, Cursos, Supermercado, Transporte, Vacaciones, Ahorros, Salud, Hogar, Otros), type (expense o income). Si no encuentras transacciones válidas, devuelve [].`
        : defaultSystemPrompt;

    const userPrompt = emailDate
      ? `Fecha del correo: ${emailDate}\n\nContenido del correo:\n${emailBody}`
      : `Contenido del correo:\n${emailBody}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    try {
      const parsed = JSON.parse(content);
      const transactions = Array.isArray(parsed) ? parsed : (parsed.transactions || []);
      return this.validateTransactions(transactions);
    } catch {
      console.error('Error parsing OpenAI response:', content);
      return [];
    }
  }

  private validateTransactions(transactions: unknown[]): ExtractedTransaction[] {
    const validated: ExtractedTransaction[] = [];

    for (const tx of transactions) {
      if (!this.isValidTransaction(tx)) {
        continue;
      }

      const category = validCategories.includes(tx.category) ? tx.category : 'Otros';
      const type = tx.type === 'income' ? 'income' : 'expense';

      validated.push({
        merchant: String(tx.merchant).trim(),
        amount: Number(tx.amount),
        date: String(tx.date),
        category,
        type
      });
    }

    return validated;
  }

  private isValidTransaction(tx: unknown): tx is {
    merchant: string;
    amount: number | string;
    date: string;
    category: string;
    type: string;
  } {
    if (typeof tx !== 'object' || tx === null) {
      return false;
    }
    const obj = tx as Record<string, unknown>;
    return (
      typeof obj.merchant === 'string' &&
      (typeof obj.amount === 'number' || typeof obj.amount === 'string') &&
      typeof obj.date === 'string' &&
      typeof obj.category === 'string' &&
      typeof obj.type === 'string'
    );
  }
}
