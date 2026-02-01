import { Router, Request, Response } from 'express';
import { pool } from '../infrastructure/database/connection';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import * as GmailClient from '../infrastructure/gmail/GmailClient';

const router = Router();

router.get('/gmail/status', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;

    const result = await pool.query(
      'SELECT gmail_address FROM gmail_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      response.status(200).json({ connected: false });
      return;
    }

    response.status(200).json({
      connected: true,
      gmailAddress: result.rows[0].gmail_address
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

export default router;
