import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import registerRoute from './routes/registerRoute';
import loginRoute from './routes/loginRoute';
import forgotPasswordRoute from './routes/forgotPasswordRoute';
import resetPasswordRoute from './routes/resetPasswordRoute';
import expensesRoute from './routes/expensesRoute';
import incomesRoute from './routes/incomesRoute';
import summaryRoute from './routes/summaryRoute';
import bancoChileWebhookRoute from './routes/bancoChileWebhookRoute';
import bancoChileKeysRoute from './routes/bancoChileKeysRoute';
import usersRoute from './routes/usersRoute';
import gmailAuthRoute from './routes/gmailAuthRoute';
import gmailRoute from './routes/gmailRoute';
import gmailWebhookRoute from './routes/gmailWebhookRoute';
import bankEmailConfigRoute from './routes/bankEmailConfigRoute';
import { swaggerSpec } from './infrastructure/swagger/swaggerConfig';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json());
const allowedOrigins = [
  'https://fin-ko.com',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

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

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalizar el origen (remover trailing slash si existe)
    const normalizedOrigin = origin.replace(/\/$/, '');
    const normalizedAllowed = allowedOrigins.map(o => o?.replace(/\/$/, ''));
    
    if (normalizedAllowed.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin "${origin}" not allowed. Allowed origins:`, normalizedAllowed);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 horas
}));
app.use(registerRoute);
app.use(loginRoute);
app.use(forgotPasswordRoute);
app.use(resetPasswordRoute);
app.use('/expenses', expensesRoute);
app.use('/incomes', incomesRoute);
app.use('/summary', summaryRoute);
app.use('/webhooks', bancoChileWebhookRoute);
app.use('/webhooks', gmailWebhookRoute);
app.use('/bancochile/keys', bancoChileKeysRoute);
app.use('/users', usersRoute);
app.use('/bank-email-configs', bankEmailConfigRoute);
app.use(gmailAuthRoute);
app.use(gmailRoute);

export default app;

