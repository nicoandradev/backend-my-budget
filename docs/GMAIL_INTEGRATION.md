# Integración Gmail + ChatGPT para Anotación Automática de Gastos

Esta guía explica cómo configurar la integración que permite importar automáticamente los gastos desde los correos del Banco de Chile recibidos en Gmail.

## Arquitectura

```
Gmail → Cloud Pub/Sub → Backend Webhook → ChatGPT → Base de Datos
```

1. El usuario conecta su Gmail mediante OAuth2
2. Se configura un "watch" en Gmail que notifica a Cloud Pub/Sub cuando llega un correo
3. Pub/Sub envía un webhook al backend
4. El backend obtiene el correo, filtra los de Banco de Chile
5. ChatGPT extrae y clasifica las transacciones
6. Se crean los gastos/ingresos automáticamente

---

## Requisitos Previos en Google Cloud

### 1. Habilitar APIs

En [Google Cloud Console](https://console.cloud.google.com):

1. Ve a **APIs & Services > Enable APIs**
2. Habilita:
   - Gmail API
   - Cloud Pub/Sub API

### 2. Crear Tema Pub/Sub

1. Ve a **Pub/Sub > Topics**
2. Crea un tema: `gmail-bank-notifications`
3. Anota el nombre completo: `projects/TU_PROJECT_ID/topics/gmail-bank-notifications`

### 3. Dar Permisos a Gmail

Gmail necesita publicar en el tema:

1. Ve al tema creado
2. Pestaña **Permissions**
3. Añade:
   - Principal: `gmail-api-push@system.gserviceaccount.com`
   - Role: `Pub/Sub Publisher`

### 4. Crear Suscripción Push

1. Ve a **Pub/Sub > Subscriptions**
2. Crea suscripción para el tema anterior
3. Tipo: **Push**
4. Endpoint: `https://tu-dominio.com/webhooks/gmail`
   - En desarrollo, usa un túnel como ngrok: `https://xxx.ngrok.io/webhooks/gmail`

### 5. Configurar OAuth2

1. Ve a **APIs & Services > Credentials**
2. Crea **OAuth 2.0 Client ID** (tipo: Web application)
3. Añade Authorized redirect URI:
   - Producción: `https://tu-dominio.com/auth/gmail/callback`
   - Desarrollo: `http://localhost:3000/auth/gmail/callback`
4. Guarda el **Client ID** y **Client Secret**

**App móvil (React Native/Expo):** La app móvil usa el mismo flujo OAuth. El backend redirige a `budgetapp://gmail?status=connected&email=...` cuando el usuario inició el flujo con `?platform=mobile`. No es necesario añadir URI adicionales en Google; el redirect sigue yendo al backend, que luego redirige a la app vía deep link.

### 6. Configurar Pantalla de Consentimiento

1. Ve a **APIs & Services > OAuth consent screen**
2. Configura:
   - App name: Budget App
   - User support email: tu email
   - Scopes: `gmail.readonly`
3. Si es app interna, selecciona "Internal"
4. Si es externa, necesitarás verificación de Google

---

## Configurar OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com)
2. Crea una API Key
3. Guarda la clave

---

## Variables de Entorno

Añade al archivo `.env` del backend:

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GMAIL_AUTH_REDIRECT_URI=http://localhost:3000/auth/gmail/callback
GMAIL_PUBSUB_TOPIC=projects/tu-project-id/topics/gmail-bank-notifications

# Renovación automática del watch (cron)
CRON_SECRET=tu-secreto-aleatorio-largo

# OpenAI
OPENAI_API_KEY=sk-...
```

---

## Migración de Base de Datos

Ejecuta la migración para crear las tablas necesarias:

```bash
npm run db:migrate:supabase
```

O manualmente:

```sql
CREATE TABLE gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_address VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(1024) NOT NULL,
  history_id BIGINT,
  watch_expiration TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processed_emails (
  gmail_message_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Uso

### Conectar Gmail

1. El usuario va a la sección **Perfiles** en la app
2. Hace clic en **Conectar Gmail**
3. Autoriza el acceso en Google
4. Regresa a la app con Gmail conectado

### Procesamiento Automático

Cuando llega un correo del Banco de Chile:

1. Gmail notifica a Pub/Sub
2. Pub/Sub llama al webhook `/webhooks/gmail`
3. El backend:
   - Obtiene el correo
   - Verifica que sea de `@bancochile.cl`
   - Extrae transacciones con ChatGPT
   - Crea gastos/ingresos

---

## Endpoints

### GET /auth/gmail
Inicia el flujo OAuth. Requiere autenticación.

**Response:**
```json
{ "redirectUrl": "https://accounts.google.com/..." }
```

### GET /auth/gmail/callback
Callback de Google OAuth. Guarda tokens y configura watch.

### GET /gmail/status
Estado de conexión. Requiere autenticación.

**Response:**
```json
{ "connected": true, "gmailAddress": "usuario@gmail.com" }
```

### POST /gmail/disconnect
Desconecta Gmail. Requiere autenticación.

### POST /webhooks/gmail
Webhook para notificaciones de Pub/Sub. Sin autenticación.

---

## Renovación del Watch

El watch de Gmail expira en ~7 días. Si expira, Gmail deja de enviar notificaciones y el backend no recibe correos.

**Solución manual:**
- El usuario ve en Mi Perfil "suscripción expirada" y puede pulsar **Renovar conexión** (POST /gmail/renew)
- Alternativamente: desconectar y volver a conectar Gmail

**Renovación automática (cron):**

Añade al `.env`:
```env
CRON_SECRET=tu-secreto-largo-y-aleatorio
```

Crea un job en **Cloud Scheduler** que llame cada 5 días a:
- **URL**: `https://tu-dominio.com/cron/gmail-renew`
- **Método**: POST
- **Header**: `X-Cron-Secret: tu-secreto-largo-y-aleatorio`

O con query param: `POST /cron/gmail-renew?secret=tu-secreto`

El endpoint renueva todos los watches de Gmail conectados y devuelve `{ ok: true, total, renewed, errors? }`.

### Configurar Cloud Scheduler (Google Cloud)

1. Crea el secret en Secret Manager (si usas deploy con secrets):
   ```bash
   echo -n "tu-secreto-aleatorio-largo" | gcloud secrets create CRON_SECRET --data-file=-
   ```

2. En Cloud Console: **Cloud Scheduler** > **Create Job**
   - Name: `gmail-watch-renew`
   - Frequency: `0 2 * * 0,3` (cada domingo y miércoles a las 2:00) o `0 2 */5 * *` (cada 5 días)
   - Target: HTTP
   - URL: `https://tu-dominio.com/cron/gmail-renew`
   - HTTP method: POST
   - Auth header: Add header `X-Cron-Secret` = (el valor de CRON_SECRET)

---

## Costos

- **Gmail API**: Gratis (cuota generosa)
- **Pub/Sub**: ~$0.40/millón de mensajes
- **ChatGPT**: ~$0.01-0.05 por correo (gpt-4o-mini)

---

## Depuración

### Ver logs del webhook

```bash
npm run deploy:logs
```

### Probar extracción con ChatGPT

Puedes probar el extractor directamente:

```typescript
import { ExpenseExtractor } from './src/infrastructure/openai/ExpenseExtractor';

const extractor = new ExpenseExtractor();
const result = await extractor.extractTransactions(`
  Compra en SUPERMERCADO LIDER por $25.000 el 15/01/2024
`);
console.log(result);
```

---

## Seguridad

- Los refresh tokens se guardan en la base de datos (considera encriptarlos en producción)
- El webhook de Gmail no requiere autenticación JWT pero Pub/Sub puede verificarse por IP o token
- Solo se procesan correos de dominios de Banco de Chile

---

## Troubleshooting

**"No se obtuvo refresh token"**
- Asegúrate de usar `prompt: 'consent'` y `access_type: 'offline'` en el auth URL
- El usuario puede necesitar revocar el acceso y volver a conectar

**"GMAIL_PUBSUB_TOPIC no está configurado"**
- Añade la variable de entorno con el nombre completo del tema

**"No se encontró conexión para Gmail"**
- El usuario no ha conectado Gmail o usó una cuenta diferente
