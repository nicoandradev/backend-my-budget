import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import registerRoute from './routes/registerRoute';
import loginRoute from './routes/loginRoute';
import expensesRoute from './routes/expensesRoute';
import incomesRoute from './routes/incomesRoute';
import summaryRoute from './routes/summaryRoute';
import bancoChileWebhookRoute from './routes/bancoChileWebhookRoute';
import bancoChileKeysRoute from './routes/bancoChileKeysRoute';
import { swaggerSpec } from './infrastructure/swagger/swaggerConfig';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json());

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica el estado del servidor
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }'
}));

app.get('/api-docs.json', (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.send(swaggerSpec);
});
app.use(cors())
app.use(registerRoute);
app.use(loginRoute);
app.use('/expenses', expensesRoute);
app.use('/incomes', incomesRoute);
app.use('/summary', summaryRoute);
app.use('/webhooks', bancoChileWebhookRoute);
app.use('/bancochile/keys', bancoChileKeysRoute);

export default app;

