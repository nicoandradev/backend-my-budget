import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Budget Backend API',
      version: '1.0.0',
      description: 'API para gestión de presupuestos',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Servidor de producción' : 'Servidor de desarrollo'
      },
      {
        url: 'https://budget-backend-732507362790.us-central1.run.app',
        description: 'Servidor de producción (Cloud Run)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo local'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'usuario@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña del usuario',
              minLength: 6,
              example: 'password123'
            },
            name: {
              type: 'string',
              description: 'Nombre del usuario',
              example: 'Juan Pérez'
            }
          }
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token JWT para autenticación',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'usuario@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña del usuario',
              example: 'password123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token JWT para autenticación',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        CreateExpenseRequest: {
          type: 'object',
          required: ['merchant', 'amount', 'category', 'date'],
          properties: {
            merchant: {
              type: 'string',
              description: 'Nombre del comercio',
              example: 'Supermercado XYZ'
            },
            amount: {
              type: 'number',
              description: 'Monto del gasto',
              minimum: 0.01,
              example: 125.50
            },
            category: {
              type: 'string',
              description: 'Categoría del gasto',
              example: 'Comida'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Fecha del gasto',
              example: '2024-01-15'
            }
          }
        },
        UpdateExpenseRequest: {
          type: 'object',
          required: ['merchant', 'amount', 'category', 'date'],
          properties: {
            merchant: {
              type: 'string',
              description: 'Nombre del comercio',
              example: 'Supermercado ABC'
            },
            amount: {
              type: 'number',
              description: 'Monto del gasto',
              minimum: 0.01,
              example: 150.00
            },
            category: {
              type: 'string',
              description: 'Categoría del gasto',
              example: 'Comida'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Fecha del gasto',
              example: '2024-01-16'
            }
          }
        },
        Expense: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID del gasto'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID del usuario propietario'
            },
            merchant: {
              type: 'string',
              description: 'Nombre del comercio'
            },
            amount: {
              type: 'number',
              description: 'Monto del gasto'
            },
            category: {
              type: 'string',
              description: 'Categoría del gasto'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Fecha del gasto'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/app.ts']
};

export const swaggerSpec = swaggerJsdoc(options);

