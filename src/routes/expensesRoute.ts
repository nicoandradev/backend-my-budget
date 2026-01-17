import { Router, Request, Response } from 'express';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { CreateExpense } from '../useCases/CreateExpense';
import { GetExpense } from '../useCases/GetExpense';
import { ListExpenses } from '../useCases/ListExpenses';
import { UpdateExpense } from '../useCases/UpdateExpense';
import { DeleteExpense } from '../useCases/DeleteExpense';

const router = Router();

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
const createExpense = new CreateExpense();
const getExpense = new GetExpense();
const listExpenses = new ListExpenses();
const updateExpense = new UpdateExpense();
const deleteExpense = new DeleteExpense();

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Crea un nuevo gasto
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseRequest'
 *           example:
 *             merchant: Supermercado XYZ
 *             amount: 125.50
 *             category: Comida
 *             date: 2024-01-15
 *     responses:
 *       201:
 *         description: Gasto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    const expense = await createExpense.execute(
      userId,
      merchant,
      parseFloat(amount),
      category,
      parseDate(date)
    );

    response.status(201).json({
      id: expense.id,
      userId: expense.userId,
      merchant: expense.merchant,
      amount: expense.amount,
      category: expense.category,
      date: formatDate(expense.date),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString()
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
 * /expenses:
 *   get:
 *     summary: Lista todos los gastos del usuario autenticado
 *     tags: [Gastos]
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
 *         description: Lista de gastos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const year = request.query.year ? parseInt(request.query.year as string, 10) : undefined;
    const month = request.query.month ? parseInt(request.query.month as string, 10) : undefined;
    const expenses = await listExpenses.execute(userId, year, month);

    response.status(200).json(
      expenses.map(expense => ({
        id: expense.id,
        userId: expense.userId,
        merchant: expense.merchant,
        amount: expense.amount,
        category: expense.category,
        date: formatDate(expense.date),
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString()
      }))
    );
  } catch (error) {
    throw error;
  }
});

/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Obtiene un gasto por ID
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del gasto
 *     responses:
 *       200:
 *         description: Gasto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No autorizado para acceder a este gasto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Gasto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const expenseId = request.params.id;

    const expense = await getExpense.execute(userId, expenseId);

    response.status(200).json({
      id: expense.id,
      userId: expense.userId,
      merchant: expense.merchant,
      amount: expense.amount,
      category: expense.category,
      date: expense.date.toISOString().split('T')[0],
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Gasto no encontrado') {
      response.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'No autorizado para acceder a este gasto') {
      response.status(403).json({ error: 'No autorizado para acceder a este gasto' });
      return;
    }
    throw error;
  }
});

/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Actualiza un gasto existente
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del gasto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExpenseRequest'
 *           example:
 *             merchant: Supermercado ABC
 *             amount: 150.00
 *             category: Comida
 *             date: 2024-01-16
 *     responses:
 *       200:
 *         description: Gasto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No autorizado para actualizar este gasto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Gasto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const expenseId = request.params.id;
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

    const expense = await updateExpense.execute(
      userId,
      expenseId,
      merchant,
      parseFloat(amount),
      category,
      parseDate(date)
    );

    response.status(200).json({
      id: expense.id,
      userId: expense.userId,
      merchant: expense.merchant,
      amount: expense.amount,
      category: expense.category,
      date: formatDate(expense.date),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'El monto debe ser mayor a cero') {
      response.status(400).json({ error: 'El monto debe ser mayor a cero' });
      return;
    }
    if (error instanceof Error && error.message === 'Gasto no encontrado') {
      response.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'No autorizado para actualizar este gasto') {
      response.status(403).json({ error: 'No autorizado para actualizar este gasto' });
      return;
    }
    throw error;
  }
});

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Elimina un gasto
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del gasto
 *     responses:
 *       204:
 *         description: Gasto eliminado exitosamente
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No autorizado para eliminar este gasto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Gasto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticateToken, async (request: Request, response: Response) => {
  try {
    const userId = request.userId!;
    const expenseId = request.params.id;

    await deleteExpense.execute(userId, expenseId);

    response.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Gasto no encontrado') {
      response.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'No autorizado para eliminar este gasto') {
      response.status(403).json({ error: 'No autorizado para eliminar este gasto' });
      return;
    }
    throw error;
  }
});

export default router;

