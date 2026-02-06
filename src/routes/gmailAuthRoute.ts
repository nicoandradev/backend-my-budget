import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../infrastructure/database/connection';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { GmailAuth } from '../infrastructure/gmail/GmailAuth';
import * as GmailClient from '../infrastructure/gmail/GmailClient';

const router = Router();
const gmailAuth = new GmailAuth();

const gmailAuthStateSecret = process.env.JWT_SECRET;
const pubSubTopic = process.env.GMAIL_PUBSUB_TOPIC;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

function expirationToTimestamp(expirationMs: string): string {
  const ms = parseInt(expirationMs, 10);
  if (Number.isNaN(ms)) {
    return new Date().toISOString();
  }
  return new Date(ms).toISOString();
}

function createStateToken(userId: string): string {
  if (!gmailAuthStateSecret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  return jwt.sign({ userId }, gmailAuthStateSecret, { expiresIn: '5m' });
}

function verifyStateToken(state: string): string {
  if (!gmailAuthStateSecret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  const decoded = jwt.verify(state, gmailAuthStateSecret) as { userId: string };
  return decoded.userId;
}

router.get('/auth/gmail', authenticateToken, (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    console.log('[Gmail OAuth] Iniciando flujo para userId:', userId);
    const state = createStateToken(userId);
    const authUrl = gmailAuth.generateAuthUrl(state);
    console.log('[Gmail OAuth] URL de autorización generada, redirigiendo a Google');
    response.json({ redirectUrl: authUrl });
  } catch (error) {
    console.error('Error iniciando OAuth Gmail:', error);
    response.status(500).json({ error: 'Error al iniciar conexión con Gmail' });
  }
});

router.get('/auth/gmail/callback', async (request: Request, response: Response) => {
  try {
    const { code, state } = request.query;
    console.log('[Gmail OAuth] Callback recibido. Query params:', { hasCode: !!code, hasState: !!state });

    if (!code || typeof code !== 'string') {
      console.log('[Gmail OAuth] Error: falta code');
      response.redirect(`${frontendUrl}?gmail=error&message=code_missing`);
      return;
    }

    if (!state || typeof state !== 'string') {
      console.log('[Gmail OAuth] Error: falta state');
      response.redirect(`${frontendUrl}?gmail=error&message=state_missing`);
      return;
    }

    const userId = verifyStateToken(state);
    console.log('[Gmail OAuth] State verificado, userId:', userId);

    const { refreshToken } = await gmailAuth.getTokensFromCode(code);
    console.log('[Gmail OAuth] Tokens obtenidos de Google (refreshToken presente:', !!refreshToken, ')');

    const gmailAddress = await GmailClient.getProfileEmail(refreshToken);
    console.log('[Gmail OAuth] Perfil Gmail obtenido:', gmailAddress);

    if (!pubSubTopic) {
      throw new Error('GMAIL_PUBSUB_TOPIC no está configurado');
    }

    const watchResult = await GmailClient.watchGmail(refreshToken, pubSubTopic);
    console.log('[Gmail OAuth] Watch configurado:', { historyId: watchResult.historyId, expiration: watchResult.expiration });

    const existingConnection = await pool.query(
      'SELECT id FROM gmail_connections WHERE user_id = $1',
      [userId]
    );

    const watchExpiration = expirationToTimestamp(watchResult.expiration);

    if (existingConnection.rows.length > 0) {
      await pool.query(
        `UPDATE gmail_connections 
         SET gmail_address = $1, refresh_token = $2, history_id = $3, watch_expiration = $4, updated_at = NOW()
         WHERE user_id = $5`,
        [gmailAddress, refreshToken, watchResult.historyId, watchExpiration, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO gmail_connections (user_id, gmail_address, refresh_token, history_id, watch_expiration)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, gmailAddress, refreshToken, watchResult.historyId, watchExpiration]
      );
    }

    console.log('[Gmail OAuth] Conexión guardada. Redirigiendo a:', `${frontendUrl}?gmail=connected&email=...`);
    response.redirect(`${frontendUrl}?gmail=connected&email=${encodeURIComponent(gmailAddress)}`);
  } catch (error) {
    console.error('Error en callback Gmail OAuth:', error);
    const message = error instanceof Error ? encodeURIComponent(error.message) : 'unknown';
    response.redirect(`${frontendUrl}?gmail=error&message=${message}`);
  }
});

export default router;
