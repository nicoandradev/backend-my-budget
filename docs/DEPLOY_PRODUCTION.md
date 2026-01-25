# Guía de Deploy a Producción

Esta guía explica cómo desplegar el backend a producción en Google Cloud Run usando **GitHub Actions**.

## Sistema de Deploy

El deploy se realiza automáticamente mediante **GitHub Actions** cuando:
- Haces push a la rama `main`
- Ejecutas el workflow manualmente desde GitHub

No necesitas tener `gcloud` CLI instalado localmente. Todo se gestiona desde GitHub.

## Prerrequisitos

1. **Repositorio en GitHub**: El código debe estar en un repositorio de GitHub

2. **Secrets configurados en GitHub** (ver sección "Configuración Inicial")

3. **Secrets configurados en Google Cloud Secret Manager**:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=tu-secreto
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASSWORD=tu-app-password
   SMTP_FROM_EMAIL=tu-email@gmail.com
   SMTP_FROM_NAME=Budget App
   FRONTEND_URL=https://tu-frontend.com
   ```

## Configuración Inicial (Solo una vez)

### 1. Crear Service Account en Google Cloud

Necesitas crear un service account para que GitHub Actions pueda desplegar:

```bash
# Crear service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deploy" \
  --project=my-personal-budget-483023

# Asignar roles necesarios
gcloud projects add-iam-policy-binding my-personal-budget-483023 \
  --member="serviceAccount:github-actions@my-personal-budget-483023.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding my-personal-budget-483023 \
  --member="serviceAccount:github-actions@my-personal-budget-483023.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding my-personal-budget-483023 \
  --member="serviceAccount:github-actions@my-personal-budget-483023.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Crear y descargar key JSON
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@my-personal-budget-483023.iam.gserviceaccount.com \
  --project=my-personal-budget-483023
```

### 2. Configurar GitHub Secrets

Ve a tu repositorio en GitHub: **Settings > Secrets and variables > Actions**

Agrega estos secrets:

- `GCP_PROJECT_ID`: `my-personal-budget-483023`
- `GCP_SA_KEY`: Contenido completo del archivo `github-actions-key.json` (el JSON completo)
- `GCP_REGION`: `us-central1` (opcional, tiene valor por defecto)
- `GCP_SERVICE_NAME`: `budget-backend` (opcional, tiene valor por defecto)

### 3. Crear Secrets en Google Cloud Secret Manager

Los secrets de la aplicación (DATABASE_URL, JWT_SECRET, etc.) deben estar en Google Secret Manager:

```bash
# Desde tu máquina local (solo primera vez)
npm run deploy:secrets:create
```

O manualmente:

```bash
echo -n "tu-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "tu-jwt-secret" | gcloud secrets create JWT_SECRET --data-file=-
# ... etc para los demás secrets
```

## Proceso de Deploy

### Deploy Automático

Cada vez que hagas push a `main`, GitHub Actions automáticamente:

1. Construye la imagen Docker
2. La sube a Google Container Registry
3. Despliega a Cloud Run
4. Actualiza el servicio con la nueva versión

**Solo necesitas hacer**:
```bash
git add .
git commit -m "Tu mensaje"
git push origin main
```

### Deploy Manual

Si quieres desplegar manualmente sin hacer push:

1. Ve a tu repositorio en GitHub
2. Click en **Actions**
3. Selecciona el workflow **Deploy to Cloud Run**
4. Click en **Run workflow**
5. Selecciona la rama (generalmente `main`)
6. Click en **Run workflow**

### Ejecutar Migraciones

Antes de desplegar, asegúrate de que las migraciones estén aplicadas:

```bash
npm run db:migrate:supabase
```

## Comandos Disponibles

### Secrets (Setup inicial)
- `npm run deploy:secrets:create` - Crear secrets en Google Cloud desde .env
- `npm run deploy:secrets:update` - Actualizar secrets existentes

### Monitoreo
- `npm run deploy:status` - Obtener URL del servicio desplegado
- `npm run deploy:logs` - Ver últimos 50 logs del servicio

### Deploy Manual (Alternativa)
- `npm run deploy:manual` - Deploy manual usando script local (requiere gcloud CLI)

## Verificar el Deploy

Después del deploy (automático o manual), verifica que todo funciona:

### Desde GitHub Actions

1. Ve a **Actions** en tu repositorio
2. Click en el último workflow ejecutado
3. Revisa los logs para ver la URL del servicio

### Desde la terminal

```bash
# Obtener URL del servicio
npm run deploy:status

# Probar health check
curl https://tu-url-aqui/health

# Ver logs
npm run deploy:logs
```

## Actualizar Secrets

Si necesitas actualizar algún secret en Google Secret Manager:

1. Actualiza el valor en tu `.env` local
2. Ejecuta: `npm run deploy:secrets:update`
3. El próximo deploy usará automáticamente la nueva versión del secret

**Nota**: Los secrets se referencian como `:latest`, así que Cloud Run siempre usa la versión más reciente.

## Troubleshooting

### Error: Secret no encontrado
- Verifica que el secret existe: `gcloud secrets list`
- Crea el secret: `npm run deploy:secrets:create`

### Error: Permisos insuficientes
- Verifica que tienes los roles necesarios:
  ```bash
  gcloud projects get-iam-policy my-personal-budget-483023
  ```

### Error: Build falla
- Verifica que Dockerfile está correcto
- Revisa los logs: `gcloud builds list --limit=5`

### El servicio no inicia
- Revisa los logs: `npm run deploy:logs`
- Verifica que todos los secrets están configurados
- Verifica que DATABASE_URL es correcta y accesible desde Cloud Run

## Variables de Entorno Requeridas

### Obligatorias
- `DATABASE_URL` - Connection string de Supabase
- `JWT_SECRET` - Secreto para firmar JWT

### Opcionales (pero recomendadas)
- `SMTP_HOST` - Host del servidor SMTP
- `SMTP_PORT` - Puerto SMTP (587 para TLS, 465 para SSL)
- `SMTP_USER` - Usuario SMTP
- `SMTP_PASSWORD` - Contraseña SMTP
- `SMTP_FROM_EMAIL` - Email remitente
- `SMTP_FROM_NAME` - Nombre remitente
- `FRONTEND_URL` - URL del frontend (para links en emails)
- `BANCOCHILE_CLIENT_ID` - Client ID de BancoChile (si usas webhooks)
- `BANCOCHILE_CLIENT_SECRET` - Client Secret de BancoChile

## Costos Estimados

- **Cloud Run**: ~$0-5/mes (pay-per-use)
- **Secret Manager**: Gratis hasta 6 secrets, luego $0.06/secret/mes
- **Cloud Build**: 120 minutos gratis/mes, luego $0.003/minuto

**Total estimado**: ~$0-10/mes para tráfico bajo-medio
