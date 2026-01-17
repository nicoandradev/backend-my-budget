import { Router, Request, Response } from 'express';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { CreateIncome } from '../useCases/CreateIncome';
import { ListIncomes } from '../useCases/ListIncomes';
import { UpdateIncome } from '../useCases/UpdateIncome';
import { DeleteIncome } from '../useCases/DeleteIncome';

const router = Router();

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const createIncome = new CreateIncome();
const listIncomes = new ListIncomes();
const updateIncome = new UpdateIncome();
const deleteIncome = new DeleteIncome();

/**
 * @swagger
 * /incomes:
 *   post:
 *     summary: Crea un nuevo ingreso
 *     tags: [Ingresos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant
 *               - amount
 *               - category
 *               - date
 *             properties:
 *               merchant:
 *                 type: string
 *                 example: Salario
 *               amount:
 *                 type: number
 *                 example: 2500.00
 *               category:
 *                 type: string
 *                 example: Trabajo
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *     responses:
 *       201:
 *         description: Ingreso creado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post('/', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const { merchant, amount, category, date } = request.body;

    if (!merchant) {
      response.status(400).json({ error: 'Merchant es requerido' });
      return;
    }

    if (!amount) {
      response.status(400).json({ error: 'Amount es requerido' });
      return;
    }

    if (!category) {
      response.status(400).json({ error: 'Category es requerido' });
      return;
    }

    if (!date) {
      response.status(400).json({ error: 'Date es requerido' });
      return;
    }

    const income = await createIncome.execute(
      userId,
      merchant,
      parseFloat(amount),
      category,
      parseDate(date)
    );

    response.status(201).json({
      id: income.id,
      userId: income.userId,
      merchant: income.merchant,
      amount: income.amount,
      category: income.category,
      date: formatDate(income.date),
      createdAt: income.createdAt.toISOString(),
      updatedAt: income.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'El monto debe ser mayor a cero') {
      response.status(400).json({ error: 'El monto debe ser mayor a cero' });
      return;
    }
    throw error;
  }
});

/**
 * @swagger
 * /incomes:
 *   get:
 *     summary: Lista todos los ingresos del usuario autenticado
 *     tags: [Ingresos]
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
 *         description: Lista de ingresos
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const year = request.query.year ? parseInt(request.query.year as string, 10) : undefined;
    const month = request.query.month ? parseInt(request.query.month as string, 10) : undefined;

    const incomes = await listIncomes.execute(userId, year, month);

    response.status(200).json(
      incomes.map(income => ({
        id: income.id,
        userId: income.userId,
        merchant: income.merchant,
        amount: income.amount,
        category: income.category,
        date: formatDate(income.date),
        createdAt: income.createdAt.toISOString(),
        updatedAt: income.updatedAt.toISOString()
      }))
    );
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /incomes/{id}:
 *   put:
 *     summary: Actualiza un ingreso existente
 *     tags: [Ingresos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del ingreso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant
 *               - amount
 *               - category
 *               - date
 *             properties:
 *               merchant:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Ingreso actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Ingreso no encontrado
 */
router.put('/:id', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const incomeId = request.params.id;
    const { merchant, amount, category, date } = request.body;

    if (!merchant) {
      response.status(400).json({ error: 'Merchant es requerido' });
      return;
    }

    if (!amount) {
      response.status(400).json({ error: 'Amount es requerido' });
      return;
    }

    if (!category) {
      response.status(400).json({ error: 'Category es requerido' });
      return;
    }

    if (!date) {
      response.status(400).json({ error: 'Date es requerido' });
      return;
    }

    const income = await updateIncome.execute(
      userId,
      incomeId,
      merchant,
      parseFloat(amount),
      category,
      parseDate(date)
    );

    response.status(200).json({
      id: income.id,
      userId: income.userId,
      merchant: income.merchant,
      amount: income.amount,
      category: income.category,
      date: formatDate(income.date),
      createdAt: income.createdAt.toISOString(),
      updatedAt: income.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'El monto debe ser mayor a cero') {
      response.status(400).json({ error: 'El monto debe ser mayor a cero' });
      return;
    }
    if (error instanceof Error && error.message === 'Ingreso no encontrado') {
      response.status(404).json({ error: 'Ingreso no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'No autorizado para actualizar este ingreso') {
      response.status(403).json({ error: 'No autorizado para actualizar este ingreso' });
      return;
    }
    throw error;
  }
});

/**
 * @swagger
 * /incomes/{id}:
 *   delete:
 *     summary: Elimina un ingreso
 *     tags: [Ingresos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del ingreso
 *     responses:
 *       204:
 *         description: Ingreso eliminado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Ingreso no encontrado
 */
router.delete('/:id', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const incomeId = request.params.id;

    await deleteIncome.execute(userId, incomeId);

    response.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Ingreso no encontrado') {
      response.status(404).json({ error: 'Ingreso no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'No autorizado para eliminar este ingreso') {
      response.status(403).json({ error: 'No autorizado para eliminar este ingreso' });
      return;
    }
    throw error;
  }
});

export default router;

