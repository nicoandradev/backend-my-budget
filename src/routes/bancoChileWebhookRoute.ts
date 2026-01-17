import { Router, Request, Response } from 'express';
import { ProcessBankEmail } from '../useCases/ProcessBankEmail';
import { CloudEvent } from '../infrastructure/bancochile/CloudEventParser';
import { ManageBancoChileKey } from '../useCases/ManageBancoChileKey';
import { pool } from '../infrastructure/database/connection';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const processBankEmail = new ProcessBankEmail();
const manageBancoChileKey = new ManageBancoChileKey();

const defaultUserEmail = process.env.BANCOCHILE_USER_EMAIL;

async function findUserId(cloudEvent: CloudEvent, request: Request): Promise<string | null> {
  const publicKey = extractPublicKey(cloudEvent);
  
  if (publicKey) {
    const userId = await manageBancoChileKey.findUserByKey(publicKey);
    if (userId) {
      return userId;
    }
  }

  const userEmail = extractUserEmail(cloudEvent, request);
  if (userEmail) {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
  }

  return null;
}

function extractPublicKey(cloudEvent: CloudEvent): string | null {
  if (cloudEvent.data && cloudEvent.data.publicKey && typeof cloudEvent.data.publicKey === 'string') {
    return cloudEvent.data.publicKey.trim();
  }

  if (cloudEvent.data && cloudEvent.data.accountKey && typeof cloudEvent.data.accountKey === 'string') {
    return cloudEvent.data.accountKey.trim();
  }

  if (cloudEvent.subject && typeof cloudEvent.subject === 'string') {
    const trimmedSubject = cloudEvent.subject.trim();
    if (trimmedSubject.length > 0 && !trimmedSubject.includes('@')) {
      return trimmedSubject;
    }
  }

  return null;
}

function extractUserEmail(cloudEvent: CloudEvent, request: Request): string | null {
  if (cloudEvent.data && cloudEvent.data.email && typeof cloudEvent.data.email === 'string') {
    return cloudEvent.data.email;
  }

  if (cloudEvent.data && cloudEvent.data.userEmail && typeof cloudEvent.data.userEmail === 'string') {
    return cloudEvent.data.userEmail;
  }

  if (cloudEvent.subject && typeof cloudEvent.subject === 'string') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(cloudEvent.subject)) {
      return cloudEvent.subject;
    }
  }

  if (request.query.email && typeof request.query.email === 'string') {
    return request.query.email;
  }

  if (defaultUserEmail) {
    return defaultUserEmail;
  }

  return null;
}

router.post('/bancochile', async (request: Request, response: Response) => {
  try {
    const cloudEvent = request.body as CloudEvent;

    if (!cloudEvent || !cloudEvent.data) {
      response.status(400).json({ error: 'Formato de CloudEvent inválido' });
      return;
    }

    if (!cloudEvent.id || !cloudEvent.type || !cloudEvent.source) {
      response.status(400).json({ error: 'CloudEvent incompleto. Campos requeridos: id, type, source' });
      return;
    }

    const userId = await findUserId(cloudEvent, request);
    if (!userId) {
      response.status(404).json({ error: 'Usuario no encontrado. Asegúrate de haber asociado tu publicKey o email' });
      return;
    }

    const userEmail = await getUserEmailById(userId);
    if (!userEmail) {
      response.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await processBankEmail.execute(cloudEvent, userEmail);

    response.status(200).json({ success: true, message: 'Evento procesado exitosamente' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No se pudo parsear')) {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error.message.includes('Usuario no encontrado')) {
        response.status(404).json({ error: error.message });
        return;
      }
    }
    console.error('Error procesando evento del banco:', error);
    response.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function getUserEmailById(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].email;
}

export default router;
