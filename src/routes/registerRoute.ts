import { Router, Request, Response } from 'express';
import { RegisterUser } from '../useCases/RegisterUser';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';
import { TokenGenerator } from '../infrastructure/jwt/TokenGenerator';
import { InviteTokenGenerator } from '../infrastructure/jwt/InviteTokenGenerator';

const router = Router();
const passwordHasher = new PasswordHasher();
const tokenGenerator = new TokenGenerator();
const inviteTokenGenerator = new InviteTokenGenerator();
const registerUser = new RegisterUser(passwordHasher, tokenGenerator);

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuevo usuario (solo con token de invitación)
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, name, password, passwordConfirm]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token JWT de invitación (en link del email)
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Error de validación (token inválido/expirado, contraseñas no coinciden, etc.)
 *       409:
 *         description: Email ya existe
 */
router.post('/register', async (request: Request, response: Response) => {
  try {
    const { token, name, password, passwordConfirm } = request.body;

    if (!token) {
      response.status(400).json({ error: 'Token de invitación es requerido' });
      return;
    }

    if (!name) {
      response.status(400).json({ error: 'Name es requerido' });
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
      const decoded = inviteTokenGenerator.verify(token);
      email = decoded.email;
    } catch {
      response.status(400).json({ error: 'Token de invitación inválido o expirado' });
      return;
    }

    const authToken = await registerUser.execute(email, password, name);

    response.status(201).json({ token: authToken });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Email ya existe') {
        response.status(409).json({ error: 'Email ya existe' });
        return;
      }
      if (error.message === 'Invitación inválida o ya utilizada') {
        response.status(400).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

export default router;
