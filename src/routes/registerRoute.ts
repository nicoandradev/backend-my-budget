import { Router, Request, Response } from 'express';
import { RegisterUser } from '../useCases/RegisterUser';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';
import { TokenGenerator } from '../infrastructure/jwt/TokenGenerator';
import { EmailValidator } from '../infrastructure/validation/EmailValidator';

const router = Router();
const passwordHasher = new PasswordHasher();
const tokenGenerator = new TokenGenerator();
const emailValidator = new EmailValidator();
const registerUser = new RegisterUser(passwordHasher, tokenGenerator);

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: usuario@example.com
 *             password: password123
 *             name: Juan Pérez
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
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
 *       409:
 *         description: Email ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Email ya existe
 */
router.post('/register', async (request: Request, response: Response) => {
  try {
    const { email, password, name } = request.body;

    if (!email) {
      response.status(400).json({ error: 'Email es requerido' });
      return;
    }

    if (!password) {
      response.status(400).json({ error: 'Password es requerido' });
      return;
    }

    if (!name) {
      response.status(400).json({ error: 'Name es requerido' });
      return;
    }

    if (!emailValidator.isValid(email)) {
      response.status(400).json({ error: 'Email tiene formato inválido' });
      return;
    }

    const token = await registerUser.execute(email, password, name);

    response.status(201).json({ token });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email ya existe') {
      response.status(409).json({ error: 'Email ya existe' });
      return;
    }
    throw error;
  }
});

export default router;

