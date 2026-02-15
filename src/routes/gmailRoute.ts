import { Router, Request, Response } from 'express';
import { pool } from '../infrastructure/database/connection';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import * as GmailClient from '../infrastructure/gmail/GmailClient';

const router = Router();
const pubSubTopic = process.env.GMAIL_PUBSUB_TOPIC;

function expirationToTimestamp(expirationMs: string): string {
  const ms = parseInt(expirationMs, 10);
  if (Number.isNaN(ms)) {
    return new Date().toISOString();
  }
  return new Date(ms).toISOString();
}

router.get('/gmail/status', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;

    const result = await pool.query(
      'SELECT gmail_address, watch_expiration FROM gmail_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      response.status(200).json({ connected: false });
      return;
    }

    const watchExpiration = result.rows[0].watch_expiration
      ? new Date(result.rows[0].watch_expiration)
      : null;
    const watchExpired = watchExpiration ? watchExpiration <= new Date() : false;

    response.status(200).json({
      connected: true,
      gmailAddress: result.rows[0].gmail_address,
      watchExpired
    });
  } catch (error) {
    console.error('Error obteniendo estado Gmail:', error);
    response.status(500).json({ error: 'Error al obtener estado de Gmail' });
  }
});

router.post('/gmail/disconnect', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;

    const result = await pool.query(
      'SELECT refresh_token FROM gmail_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      response.status(200).json({ message: 'Gmail no estaba conectado' });
      return;
    }

    const refreshToken = result.rows[0].refresh_token;

    try {
      await GmailClient.stopGmailWatch(refreshToken);
    } catch (watchError) {
      console.warn('Error al detener watch de Gmail (puede estar expirado):', watchError);
    }

    await pool.query('DELETE FROM gmail_connections WHERE user_id = $1', [userId]);

    response.status(200).json({ message: 'Gmail desconectado correctamente' });
  } catch (error) {
    console.error('Error desconectando Gmail:', error);
    response.status(500).json({ error: 'Error al desconectar Gmail' });
  }
});

router.post('/gmail/renew', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;

    if (!pubSubTopic) {
      response.status(500).json({ error: 'GMAIL_PUBSUB_TOPIC no está configurado' });
      return;
    }

    const result = await pool.query(
      'SELECT gmail_address, refresh_token FROM gmail_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      response.status(400).json({ error: 'Gmail no está conectado' });
      return;
    }

    const { gmail_address: gmailAddress, refresh_token: refreshToken } = result.rows[0];

    const watchResult = await GmailClient.watchGmail(refreshToken, pubSubTopic);
    const watchExpiration = expirationToTimestamp(watchResult.expiration);

    await pool.query(
      `UPDATE gmail_connections 
       SET history_id = $1, watch_expiration = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [watchResult.historyId, watchExpiration, userId]
    );

    console.log('[Gmail] Watch renovado para', gmailAddress, 'expira:', watchExpiration);
    response.status(200).json({
      message: 'Conexión renovada correctamente',
      gmailAddress,
      watchExpiresAt: watchExpiration
    });
  } catch (error) {
    console.error('Error renovando watch de Gmail:', error);
    response.status(500).json({ error: 'Error al renovar conexión con Gmail' });
  }
});

export default router;
