import { Router, Request, Response } from 'express';
import { ProcessGmailBankEmail } from '../useCases/ProcessGmailBankEmail';

const router = Router();
const processGmailBankEmail = new ProcessGmailBankEmail();

interface PubSubMessage {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: number;
}

router.post('/gmail', async (request: Request, response: Response) => {
  try {
    const pubSubMessage = request.body as PubSubMessage;
    console.log('[Webhook Gmail] Request recibido. Keys:', Object.keys(pubSubMessage || {}));
    console.log('[Webhook Gmail] messageId:', pubSubMessage?.message?.messageId, 'publishTime:', pubSubMessage?.message?.publishTime);

    if (!pubSubMessage.message?.data) {
      console.warn('[Webhook Gmail] Mensaje sin data. Body:', JSON.stringify(pubSubMessage).slice(0, 200));
      response.status(200).json({ ok: true, skipped: 'no data' });
      return;
    }

    const dataBuffer = Buffer.from(pubSubMessage.message.data, 'base64');
    const dataString = dataBuffer.toString('utf-8');
    const notification = JSON.parse(dataString) as GmailNotification;

    console.log('[Webhook Gmail] Notificación decodificada:', notification);

    const { emailAddress, historyId } = notification;

    if (!emailAddress || !historyId) {
      console.warn('[Webhook Gmail] Notificación incompleta:', notification);
      response.status(200).json({ ok: true, skipped: 'incomplete notification' });
      return;
    }

    console.log('[Webhook Gmail] Procesando:', { emailAddress, historyId });

    await processGmailBankEmail.execute(emailAddress, String(historyId));

    console.log('[Webhook Gmail] Procesamiento completado correctamente');
    response.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Webhook Gmail] Error procesando:', error);
    response.status(200).json({ ok: true, error: 'internal' });
  }
});

export default router;
