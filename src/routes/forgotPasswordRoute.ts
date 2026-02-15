import { Router, Request, Response } from 'express';
import { pool } from '../infrastructure/database/connection';
import { EmailValidator } from '../infrastructure/validation/EmailValidator';
import { EmailService } from '../infrastructure/email/EmailService';
import { RecoveryTokenGenerator } from '../infrastructure/jwt/RecoveryTokenGenerator';

const router = Router();
const emailValidator = new EmailValidator();
const emailService = new EmailService();
const recoveryTokenGenerator = new RecoveryTokenGenerator();

const successMessage = 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.';

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Solicita recuperación de contraseña por email
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Siempre 200 con mensaje genérico (no revela si el email existe)
 *       400:
 *         description: Email ausente o formato inválido
 */
router.post('/forgot-password', async (request: Request, response: Response) => {
  const { email } = request.body;

  if (!email) {
    response.status(400).json({ error: 'Email es requerido' });
    return;
  }

  if (!emailValidator.isValid(email)) {
    response.status(400).json({ error: 'Email tiene formato inválido' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND active = true AND pending_active = false',
      [email]
    );

    if (result.rows.length > 0) {
      const token = recoveryTokenGenerator.generate(email);
      try {
        await emailService.sendPasswordRecoveryEmail(email, token);
      } catch (sendError) {
        console.error('Error al enviar email de recuperación:', sendError);
      }
    }
  } catch (error) {
    console.error('Error en forgot-password:', error);
  }

  response.status(200).json({ message: successMessage });
});

export default router;
