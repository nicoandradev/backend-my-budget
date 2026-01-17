import dotenv from 'dotenv';

dotenv.config();

const apiBaseUrl = process.env.BANCOCHILE_API_URL || 'https://gw.apistore.bancochile.cl/banco-chile/sandbox/v1/api-store/notificaciones/movimientos';
const clientId = process.env.BANCOCHILE_CLIENT_ID || '1eefa2540a7d25adf35dfbe9243e1ab4';
const clientSecret = process.env.BANCOCHILE_CLIENT_SECRET || '68d5456ffe7555920a724a361290a14d';

export interface GenerateNotificationRequest {
  publicKey: string;
}

export interface SendNotificationRequest {
  publicKey: string;
  url: string;
}

export interface CloudEvent {
  specVersion: string;
  type: string;
  source: string;
  id: string;
  time: string;
  dataContentType?: string;
  dataSchema?: string;
  subject?: string;
  data: any;
}

export class BancoChileClient {
  private getHeaders(): Record<string, string> {
    if (!clientId || !clientSecret) {
      throw new Error('BancoChile credentials missing. Please set BANCOCHILE_CLIENT_ID and BANCOCHILE_CLIENT_SECRET');
    }

    return {
      'Content-Type': 'application/json',
      'Client-Id': clientId,
      'Client-Secret': clientSecret
    };
  }

  async generateNotification(request: GenerateNotificationRequest): Promise<CloudEvent> {
    const response = await fetch(`${apiBaseUrl}/generar`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`BancoChile API error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json() as CloudEvent;
    return result;
  }

  async sendNotification(request: SendNotificationRequest): Promise<CloudEvent> {
    const response = await fetch(`${apiBaseUrl}/enviar`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`BancoChile API error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json() as CloudEvent;
    return result;
  }
}
