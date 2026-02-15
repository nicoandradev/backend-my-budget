import { Router, Request, Response } from 'express';
import { RecoveryTokenGenerator } from '../infrastructure/jwt/RecoveryTokenGenerator';
import { ResetPassword } from '../useCases/ResetPassword';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';

const router = Router();
const recoveryTokenGenerator = new RecoveryTokenGenerator();
const passwordHasher = new PasswordHasher();
const resetPassword = new ResetPassword(passwordHasher);

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Restablece la contraseña con token de recuperación
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, passwordConfirm]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Token inválido/expirado o contraseñas no coinciden
 */
router.post('/reset-password', async (request: Request, response: Response) => {
  try {
    const { token, password, passwordConfirm } = request.body;

    if (!token) {
      response.status(400).json({ error: 'Token es requerido' });
      return;
    }

    if (!password) {
      response.status(400).json({ error: 'Password es requerido' });
      return;
    }

    if (!passwordConfirm) {
      response.status(400).json({ error: 'Confirmación de contraseña es requerida' });
      return;
    }

    if (password !== passwordConfirm) {
      response.status(400).json({ error: 'Las contraseñas no coinciden' });
      return;
    }

    let email: string;
    try {
      const decoded = recoveryTokenGenerator.verify(token);
      email = decoded.email;
    } catch {
      response.status(400).json({ error: 'Token inválido o expirado' });
      return;
    }

    await resetPassword.execute(email, password);

    response.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    throw error;
  }
});

export default router;
