import { Router, Request, Response } from 'express';
import { LoginUser } from '../useCases/LoginUser';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';
import { TokenGenerator } from '../infrastructure/jwt/TokenGenerator';
import { EmailValidator } from '../infrastructure/validation/EmailValidator';

const router = Router();
const passwordHasher = new PasswordHasher();
const tokenGenerator = new TokenGenerator();
const emailValidator = new EmailValidator();
const loginUser = new LoginUser(passwordHasher, tokenGenerator);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Inicia sesión con email y contraseña
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: usuario@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingField:
 *                 value:
 *                   error: Email es requerido
 *               invalidEmail:
 *                 value:
 *                   error: Email tiene formato inválido
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Credenciales inválidas
 */
router.post('/login', async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body;

    if (!email) {
      response.status(400).json({ error: 'Email es requerido' });
      return;
    }

    if (!password) {
      response.status(400).json({ error: 'Password es requerido' });
      return;
    }

    if (!emailValidator.isValid(email)) {
      response.status(400).json({ error: 'Email tiene formato inválido' });
      return;
    }

    const token = await loginUser.execute(email, password);

    response.status(200).json({ token });
  } catch (error) {
    if (error instanceof Error && error.message === 'Credenciales inválidas') {
      response.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    throw error;
  }
});

export default router;

