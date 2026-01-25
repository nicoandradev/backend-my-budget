# Configurar Frontend para Conectarse a Cloud Run

Esta guía explica cómo configurar tu frontend para que se conecte al backend desplegado en Google Cloud Run.

## URL del Backend

**URL de Producción (Cloud Run):**
```
https://budget-backend-732507362790.us-central1.run.app
```

## Configuración del Frontend

### Opción 1: Variable de Entorno (Recomendado)

Crea un archivo `.env` o `.env.production` en tu proyecto frontend:

```env
VITE_API_URL=https://budget-backend-732507362790.us-central1.run.app
# o si usas Create React App:
REACT_APP_API_URL=https://budget-backend-732507362790.us-central1.run.app
# o si usas Next.js:
NEXT_PUBLIC_API_URL=https://budget-backend-732507362790.us-central1.run.app
```

### Opción 2: Archivo de Configuración

Crea un archivo `config.ts` o `config.js`:

```typescript
// config.ts
const config = {
  apiUrl: import.meta.env.VITE_API_URL || 
          import.meta.env.REACT_APP_API_URL || 
          'https://budget-backend-732507362790.us-central1.run.app'
};

export default config;
```

### Opción 3: Cliente HTTP con Configuración

Actualiza tu cliente HTTP (axios, fetch, etc.):

#### Con Axios:

```typescript
// api/client.ts
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 
               import.meta.env.REACT_APP_API_URL || 
               'https://budget-backend-732507362790.us-central1.run.app';

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### Con Fetch API:

```typescript
// api/client.ts
const apiUrl = import.meta.env.VITE_API_URL || 
               import.meta.env.REACT_APP_API_URL || 
               'https://budget-backend-732507362790.us-central1.run.app';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export default apiRequest;
```

## Ejemplos de Uso

### Login

```typescript
// services/auth.ts
import api from '../api/client';

export const login = async (email: string, password: string) => {
  const response = await api.post('/login', { email, password });
  localStorage.setItem('token', response.data.token);
  return response.data;
};
```

### Obtener Gastos

```typescript
// services/expenses.ts
import api from '../api/client';

export const getExpenses = async () => {
  const response = await api.get('/expenses');
  return response.data;
};
```

### Crear Gasto

```typescript
// services/expenses.ts
import api from '../api/client';

export const createExpense = async (expense: {
  merchant: string;
  amount: number;
  category: string;
  date: string;
}) => {
  const response = await api.post('/expenses', expense);
  return response.data;
};
```

## CORS

El backend ya tiene CORS habilitado, por lo que tu frontend debería poder hacer requests sin problemas.

## Verificar la Conexión

Puedes verificar que el backend está funcionando con:

```bash
curl https://budget-backend-732507362790.us-central1.run.app/health
```

Debería responder:
```json
{"status":"ok"}
```

## Endpoints Disponibles

- `POST /register` - Registrar usuario
- `POST /login` - Iniciar sesión
- `GET /expenses` - Listar gastos
- `POST /expenses` - Crear gasto
- `PUT /expenses/:id` - Actualizar gasto
- `DELETE /expenses/:id` - Eliminar gasto
- `GET /incomes` - Listar ingresos
- `POST /incomes` - Crear ingreso
- `PUT /incomes/:id` - Actualizar ingreso
- `DELETE /incomes/:id` - Eliminar ingreso
- `GET /summary` - Resumen financiero
- `GET /api-docs` - Documentación Swagger

## Documentación de API

Puedes ver la documentación interactiva en:
```
https://budget-backend-732507362790.us-central1.run.app/api-docs
```

## Troubleshooting

### Error: CORS

Si tienes problemas de CORS, verifica que el backend tenga CORS habilitado (ya está configurado).

### Error: 401 Unauthorized

Asegúrate de incluir el token JWT en el header `Authorization`:
```
Authorization: Bearer <tu-token>
```

### Error: Network Error

Verifica que:
1. La URL del backend sea correcta
2. El backend esté desplegado y funcionando
3. No haya problemas de red/firewall

## Desarrollo Local vs Producción

Para desarrollo local, puedes usar:
- **Local**: `http://localhost:3000`
- **Producción**: `https://budget-backend-732507362790.us-central1.run.app`

Usa variables de entorno para cambiar entre ambientes fácilmente.
