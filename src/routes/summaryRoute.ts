import { Router, Request, Response } from 'express';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { GetFinancialSummary } from '../useCases/GetFinancialSummary';

const router = Router();

const getFinancialSummary = new GetFinancialSummary();

/**
 * @swagger
 * /summary:
 *   get:
 *     summary: Obtiene el resumen financiero del usuario
 *     tags: [Resumen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Año para filtrar (opcional)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Mes para filtrar (opcional, requiere year)
 *     responses:
 *       200:
 *         description: Resumen financiero
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalIncomes:
 *                   type: number
 *                 totalExpenses:
 *                   type: number
 *                 balance:
 *                   type: number
 *       400:
 *         description: Error de validación (month sin year)
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const year = request.query.year ? parseInt(request.query.year as string, 10) : undefined;
    const month = request.query.month ? parseInt(request.query.month as string, 10) : undefined;

    if (month !== undefined && year === undefined) {
      response.status(400).json({ error: 'El parámetro month requiere que year esté presente' });
      return;
    }

    const summary = await getFinancialSummary.execute(userId, year, month);

    response.status(200).json(summary);
  } catch (error) {
    throw error;
  }
});

export default router;

