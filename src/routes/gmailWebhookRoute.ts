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

    if (!pubSubMessage.message?.data) {
      console.warn('Webhook Gmail: mensaje sin data');
      response.status(200).json({ ok: true, skipped: 'no data' });
      return;
    }

    const dataBuffer = Buffer.from(pubSubMessage.message.data, 'base64');
    const dataString = dataBuffer.toString('utf-8');
    const notification = JSON.parse(dataString) as GmailNotification;

    const { emailAddress, historyId } = notification;

    if (!emailAddress || !historyId) {
      console.warn('Webhook Gmail: notificación incompleta', notification);
      response.status(200).json({ ok: true, skipped: 'incomplete notification' });
      return;
    }

    console.log(`Procesando notificación Gmail: ${emailAddress}, historyId: ${historyId}`);

    await processGmailBankEmail.execute(emailAddress, String(historyId));

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error procesando webhook Gmail:', error);
    response.status(200).json({ ok: true, error: 'internal' });
  }
});

export default router;
