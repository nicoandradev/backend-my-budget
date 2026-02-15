import { Router, Request, Response } from 'express';
import { pool } from '../infrastructure/database/connection';
import * as GmailClient from '../infrastructure/gmail/GmailClient';

const router = Router();
const pubSubTopic = process.env.GMAIL_PUBSUB_TOPIC;
const cronSecret = process.env.CRON_SECRET;

function expirationToTimestamp(expirationMs: string): string {
  const ms = parseInt(expirationMs, 10);
  if (Number.isNaN(ms)) {
    return new Date().toISOString();
  }
  return new Date(ms).toISOString();
}

function isValidCronRequest(request: Request): boolean {
  if (!cronSecret || cronSecret.trim() === '') {
    return false;
  }
  const provided =
    request.headers['x-cron-secret'] ||
    request.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    request.query.secret;
  return typeof provided === 'string' && provided === cronSecret;
}

router.post('/gmail-renew', async (request: Request, response: Response) => {
  if (!isValidCronRequest(request)) {
    response.status(401).json({ error: 'No autorizado' });
    return;
  }

  if (!pubSubTopic) {
    response.status(500).json({ error: 'GMAIL_PUBSUB_TOPIC no está configurado' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT user_id, gmail_address, refresh_token FROM gmail_connections'
    );
    const connections = result.rows as { user_id: string; gmail_address: string; refresh_token: string }[];

    let renewed = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      try {
        const watchResult = await GmailClient.watchGmail(conn.refresh_token, pubSubTopic);
        const watchExpiration = expirationToTimestamp(watchResult.expiration);

        await pool.query(
          `UPDATE gmail_connections 
           SET history_id = $1, watch_expiration = $2, updated_at = NOW()
           WHERE user_id = $3`,
          [watchResult.historyId, watchExpiration, conn.user_id]
        );

        renewed++;
        console.log('[Cron Gmail] Watch renovado para', conn.gmail_address);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${conn.gmail_address}: ${message}`);
        console.error('[Cron Gmail] Error renovando watch para', conn.gmail_address, err);
      }
    }

    response.status(200).json({
      ok: true,
      total: connections.length,
      renewed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[Cron Gmail] Error en renovación masiva:', error);
    response.status(500).json({ error: 'Error al renovar watches de Gmail' });
  }
});

export default router;
