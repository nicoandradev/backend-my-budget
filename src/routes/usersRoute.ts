import { Router, Request, Response } from 'express';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { requireAdmin, requireRoot } from '../infrastructure/auth/authorizeMiddleware';
import { InviteUser } from '../useCases/InviteUser';
import { ListUsers } from '../useCases/ListUsers';
import { ToggleUserActive } from '../useCases/ToggleUserActive';
import { UpdateUserRole } from '../useCases/UpdateUserRole';
import { EmailValidator } from '../infrastructure/validation/EmailValidator';
import { EmailService } from '../infrastructure/email/EmailService';
import { PasswordHasher } from '../infrastructure/password/PasswordHasher';

const router = Router();

const emailValidator = new EmailValidator();
const emailService = new EmailService();
const passwordHasher = new PasswordHasher();
const inviteUser = new InviteUser(emailValidator, emailService, passwordHasher);
const listUsers = new ListUsers();
const toggleUserActive = new ToggleUserActive();
const updateUserRole = new UpdateUserRole();

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * @swagger
 * /users/invite:
 *   post:
 *     summary: Invita un nuevo usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Invitación enviada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere admin o root)
 */
router.post('/invite', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const { email } = request.body;

    if (!email) {
      response.status(400).json({ error: 'Email es requerido' });
      return;
    }

    await inviteUser.execute(userId, email);
    response.status(200).json({ message: 'Invitación enviada exitosamente' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Email tiene formato inválido') {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error.message === 'El usuario ya está registrado y activo') {
        response.status(409).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista todos los usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includePending
 *         schema:
 *           type: boolean
 *         description: Incluir usuarios con invitación pendiente
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere admin o root)
 */
router.get('/', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const includePending = request.query.includePending === 'true';
    const users = await listUsers.execute(includePending);

    response.status(200).json(
      users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        pendingActive: user.pendingActive,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /users/pending:
 *   get:
 *     summary: Lista usuarios con invitación pendiente
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios pendientes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere admin o root)
 */
router.get('/pending', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const users = await listUsers.execute(true);
    const pendingUsers = users.filter(user => user.pendingActive);

    response.status(200).json(
      pendingUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        pendingActive: user.pendingActive,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /users/{id}/active:
 *   put:
 *     summary: Activa o desactiva un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - active
 *             properties:
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.put('/:id/active', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const requesterUserId = request.userId!;
    const targetUserId = request.params.id;
    const { active } = request.body;

    if (typeof active !== 'boolean') {
      response.status(400).json({ error: 'Active debe ser un booleano' });
      return;
    }

    await toggleUserActive.execute(requesterUserId, targetUserId, active);
    response.status(200).json({ message: 'Estado actualizado exitosamente' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'No puedes cambiar tu propio estado') {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error.message === 'Usuario no encontrado') {
        response.status(404).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     summary: Cambia el rol de un usuario (solo root)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [root, admin, user]
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere root)
 */
router.put('/:id/role', authenticateToken, requireRoot, async (request: Request, response: Response) => {
  try {
    const requesterUserId = request.userId!;
    const targetUserId = request.params.id;
    const { role } = request.body;

    if (!role || !['root', 'admin', 'user'].includes(role)) {
      response.status(400).json({ error: 'Rol inválido. Debe ser root, admin o user' });
      return;
    }

    await updateUserRole.execute(requesterUserId, targetUserId, role);
    response.status(200).json({ message: 'Rol actualizado exitosamente' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'No puedes cambiar tu propio rol') {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error.message === 'Usuario no encontrado') {
        response.status(404).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

export default router;
