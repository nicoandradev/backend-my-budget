import { Router, Request, Response } from 'express';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { ManageBancoChileKey } from '../useCases/ManageBancoChileKey';

const router = Router();
const manageBancoChileKey = new ManageBancoChileKey();

/**
 * @swagger
 * /bancochile/keys:
 *   post:
 *     summary: Asocia un publicKey del Banco de Chile con el usuario autenticado
 *     tags: [Banco de Chile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicKey
 *             properties:
 *               publicKey:
 *                 type: string
 *                 description: PublicKey del Banco de Chile
 *                 example: "clave-publica-del-usuario"
 *     responses:
 *       201:
 *         description: PublicKey asociado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post('/', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const { publicKey } = request.body;

    if (!publicKey) {
      response.status(400).json({ error: 'PublicKey es requerido' });
      return;
    }

    const key = await manageBancoChileKey.associateKey(userId, publicKey);

    response.status(201).json({
      id: key.id,
      userId: key.userId,
      publicKey: key.publicKey,
      createdAt: key.createdAt.toISOString(),
      updatedAt: key.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Esta publicKey ya está asociada a otro usuario') {
        response.status(409).json({ error: error.message });
        return;
      }
      if (error.message === 'PublicKey es requerido') {
        response.status(400).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

/**
 * @swagger
 * /bancochile/keys:
 *   get:
 *     summary: Lista todos los publicKeys asociados al usuario autenticado
 *     tags: [Banco de Chile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de publicKeys
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;

    const keys = await manageBancoChileKey.listUserKeys(userId);

    response.status(200).json(
      keys.map(key => ({
        id: key.id,
        userId: key.userId,
        publicKey: key.publicKey,
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString()
      }))
    );
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /bancochile/keys/{id}:
 *   delete:
 *     summary: Elimina la asociación de un publicKey
 *     tags: [Banco de Chile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la asociación de key
 *     responses:
 *       204:
 *         description: Key eliminada exitosamente
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Key no encontrada
 */
router.delete('/:id', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const keyId = request.params.id;

    await manageBancoChileKey.removeKey(userId, keyId);

    response.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Key no encontrada o no pertenece al usuario') {
        response.status(404).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

export default router;
