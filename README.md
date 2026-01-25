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

## Desplegar en Supabase

Este proyecto soporta desplegar la base de datos en Supabase. Supabase es una plataforma que proporciona PostgreSQL como servicio con características adicionales.

### Prerrequisitos

1. **Instalar Supabase CLI**:

```bash
# macOS
brew install supabase/tap/supabase

# Windows (con Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
npm install -g supabase
```

2. **Crear un proyecto en Supabase**:
   - Ve a [supabase.com](https://supabase.com) y crea una cuenta
   - Crea un nuevo proyecto
   - Espera a que el proyecto esté listo (puede tomar unos minutos)

### Configuración

1. **Obtener la Connection String de Supabase**:
   - En el dashboard de Supabase, ve a **Settings** > **Database**
   - Busca la sección **Connection string**
   - Selecciona **URI** y copia la connection string
   - La connection string tiene el formato: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

2. **Configurar `.env`**:

Actualiza tu archivo `.env` con la connection string de Supabase:

```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=tu_secreto_jwt_aqui
JWT_EXPIRES_IN=7d
```

**Nota**: Reemplaza `[YOUR-PASSWORD]` con la contraseña de tu base de datos y `[PROJECT-REF]` con la referencia de tu proyecto.

### Ejecutar Migraciones

El proyecto incluye migraciones versionadas en `supabase/migrations/`. Para aplicar las migraciones a tu proyecto de Supabase:

1. **Autenticarte con Supabase CLI** (primera vez):

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte con tu cuenta de Supabase.

2. **Conectar tu proyecto local con Supabase**:

```bash
supabase link --project-ref [PROJECT-REF]
```

Necesitarás tu `project-ref` que puedes encontrar en la URL de tu proyecto de Supabase o en Settings > General.

3. **Aplicar migraciones**:

```bash
npm run db:migrate:supabase
```

O directamente con Supabase CLI:

```bash
supabase db push
```

4. **Resetear la base de datos** (útil para desarrollo):

```bash
npm run db:reset:supabase
```

O directamente:

```bash
supabase db reset
```

### Notas Importantes

- **SSL**: Las conexiones a Supabase requieren SSL. El código detecta automáticamente si estás usando Supabase (por la URL que contiene `supabase.co`) y configura SSL automáticamente.
- **Compatibilidad**: El código es retrocompatible. Si usas PostgreSQL local, funcionará sin SSL. Si usas Supabase, se configurará SSL automáticamente.
- **Migraciones**: Las migraciones están en `supabase/migrations/` y se ejecutan con Supabase CLI. El script `npm run db:schema` también funciona con Supabase gracias al soporte SSL automático.

### Alternativa: Usar el Script de Schema

Si prefieres no usar Supabase CLI, también puedes ejecutar el schema directamente:

```bash
npm run db:schema
```

Este script detectará automáticamente si estás usando Supabase y configurará SSL.

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

## Deploy a Producción

El deploy se realiza automáticamente mediante **GitHub Actions** cuando haces push a la rama `main`.

### Configuración Inicial

1. **Configurar GitHub Actions** (solo una vez):
   - Ver guía completa en [docs/CONFIGURAR_GITHUB_ACTIONS.md](docs/CONFIGURAR_GITHUB_ACTIONS.md)
   - Resumen: Crear service account en GCP y configurar secrets en GitHub

2. **Crear secrets en Google Secret Manager**:
   ```bash
   npm run deploy:secrets:create
   ```

### Deploy Automático

Cada push a `main` desplegará automáticamente:

```bash
git add .
git commit -m "Cambios en el backend"
git push origin main
```

### Deploy Manual

También puedes ejecutar el deploy manualmente desde GitHub:
1. Ve a **Actions** en tu repositorio
2. Selecciona **Deploy to Cloud Run**
3. Click en **Run workflow**

### Ver Documentación Completa

- [Guía de Deploy a Producción](docs/DEPLOY_PRODUCTION.md)
- [Configurar GitHub Actions](docs/CONFIGURAR_GITHUB_ACTIONS.md)

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

