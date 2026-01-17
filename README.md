# Budget Backend

Backend desarrollado con Express y TypeScript.

## Instalación

```bash
npm install
```

## Configuración

1. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/budget_db
JWT_SECRET=tu_secreto_jwt_aqui
JWT_EXPIRES_IN=7d
```

2. Crea la base de datos PostgreSQL:

```bash
createdb budget_db
```

3. Ejecuta el script SQL para crear la tabla:

```bash
psql -d budget_db -f src/infrastructure/database/schema.sql
```

O ejecuta el SQL manualmente:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Desarrollo

```bash
npm run dev
```

El servidor se ejecutará en http://localhost:3000

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm start
```

## Documentación de API

### Swagger UI (Interactiva)

Una vez que el servidor esté corriendo, accede a la documentación interactiva en:

```
http://localhost:3000/api-docs
```

Aquí podrás:
- Ver todos los endpoints documentados
- Probar los endpoints directamente desde el navegador
- Ver ejemplos de requests y responses
- Ver los esquemas de datos

### Exportar especificación OpenAPI

Para exportar la especificación OpenAPI (útil para modelos de IA o herramientas externas):

```bash
npm run docs:export
```

Esto generará:
- `docs/openapi.json` - Especificación en formato JSON
- `docs/openapi.yaml` - Especificación en formato YAML

Puedes usar estos archivos con:
- Modelos de IA (ChatGPT, Claude, etc.) para generar frontend
- Postman (importar colección)
- Insomnia
- Herramientas de generación de código
- Validadores de API

**📖 Guía completa para generar frontend con IA**: Ver [docs/GUIA_FRONTEND.md](docs/GUIA_FRONTEND.md)

### Endpoints

#### POST /register

Registra un nuevo usuario y devuelve un token JWT.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "name": "Nombre Usuario"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- `400`: Campos requeridos faltantes o email inválido
- `409`: Email ya existe

#### POST /login

Inicia sesión con email y contraseña, devuelve un token JWT.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- `400`: Campos requeridos faltantes o email inválido
- `401`: Credenciales inválidas

#### GET /health

Verifica el estado del servidor.

**Response (200):**
```json
{
  "status": "ok"
}
```

### Endpoints de Gastos (Requieren Autenticación)

Todos los endpoints de `/expenses` requieren autenticación. Incluye el header:
```
Authorization: Bearer <token>
```

#### POST /expenses

Crea un nuevo gasto.

**Request Body:**
```json
{
  "merchant": "Supermercado XYZ",
  "amount": 125.50,
  "category": "Comida",
  "date": "2024-01-15"
}
```

**Response (201):**
```json
{
  "id": "uuid-del-gasto",
  "userId": "uuid-del-usuario",
  "merchant": "Supermercado XYZ",
  "amount": 125.50,
  "category": "Comida",
  "date": "2024-01-15",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errores:**
- `400`: Campos requeridos faltantes o monto inválido (debe ser mayor a 0)
- `401`: No autenticado

#### GET /expenses

Lista todos los gastos del usuario autenticado.

**Response (200):**
```json
[
  {
    "id": "uuid-del-gasto",
    "userId": "uuid-del-usuario",
    "merchant": "Supermercado XYZ",
    "amount": 125.50,
    "category": "Comida",
    "date": "2024-01-15",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**Errores:**
- `401`: No autenticado

#### GET /expenses/:id

Obtiene un gasto específico por ID.

**Response (200):**
```json
{
  "id": "uuid-del-gasto",
  "userId": "uuid-del-usuario",
  "merchant": "Supermercado XYZ",
  "amount": 125.50,
  "category": "Comida",
  "date": "2024-01-15",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errores:**
- `401`: No autenticado
- `403`: No autorizado (el gasto pertenece a otro usuario)
- `404`: Gasto no encontrado

#### PUT /expenses/:id

Actualiza un gasto existente.

**Request Body:**
```json
{
  "merchant": "Supermercado ABC",
  "amount": 150.00,
  "category": "Comida",
  "date": "2024-01-16"
}
```

**Response (200):** Mismo formato que GET /expenses/:id

**Errores:**
- `400`: Campos requeridos faltantes o monto inválido
- `401`: No autenticado
- `403`: No autorizado
- `404`: Gasto no encontrado

#### DELETE /expenses/:id

Elimina un gasto.

**Response (204):** Sin contenido

**Errores:**
- `401`: No autenticado
- `403`: No autorizado
- `404`: Gasto no encontrado

