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
import usersRoute from './routes/usersRoute';
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
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(registerRoute);
app.use(loginRoute);
app.use('/expenses', expensesRoute);
app.use('/incomes', incomesRoute);
app.use('/summary', summaryRoute);
app.use('/webhooks', bancoChileWebhookRoute);
app.use('/bancochile/keys', bancoChileKeysRoute);
app.use('/users', usersRoute);

export default app;

