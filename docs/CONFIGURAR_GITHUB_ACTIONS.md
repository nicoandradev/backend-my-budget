# Configurar GitHub Actions para Deploy

Esta guía explica paso a paso cómo configurar GitHub Actions para desplegar automáticamente el backend a Google Cloud Run.

## Prerrequisitos

- Repositorio del backend en GitHub
- Acceso a Google Cloud Console
- Permisos de administrador en el repositorio de GitHub

## Paso 1: Crear Service Account en Google Cloud

El service account permite que GitHub Actions se autentique con Google Cloud.

### Opción A: Script Automático (Recomendado)

Ejecuta el script que configura todo automáticamente:

```bash
npm run deploy:setup:sa
```

O directamente:

```bash
./scripts/setupServiceAccount.sh
```

Este script:
- Crea el service account si no existe
- Asigna todos los roles necesarios
- Genera la key JSON para GitHub

### Opción B: Manual

Si prefieres hacerlo manualmente:

#### 1.1. Crear el Service Account

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deploy" \
  --description="Service account para GitHub Actions deployments" \
  --project=my-personal-budget-483023
```

#### 1.2. Asignar Roles Necesarios

El service account necesita estos permisos:

```bash
PROJECT_ID="my-personal-budget-483023"
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Run Admin (para desplegar y gestionar servicios)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Storage Admin (para subir imágenes a Container Registry)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

# Service Account User (para usar el service account de Cloud Run)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Secret Manager Secret Accessor (para leer secrets en Cloud Run)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Service Usage Consumer (para habilitar APIs si es necesario)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

**Nota**: Si prefieres usar permisos más granulares en lugar de roles amplios, puedes usar:
- `roles/storage.objectCreator` en lugar de `roles/storage.admin` (solo para crear objetos en GCR)
- `roles/secretmanager.secretAccessor` ya está incluido arriba

### 1.3. Crear y Descargar la Key JSON

```bash
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=${SA_EMAIL} \
  --project=${PROJECT_ID}
```

**Importante**: Guarda este archivo de forma segura. Lo necesitarás en el siguiente paso.

## Paso 2: Configurar GitHub Secrets

### 2.1. Acceder a Secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings**
3. En el menú lateral, click en **Secrets and variables** > **Actions**
4. Click en **New repository secret**

### 2.2. Agregar Secrets

Crea estos secrets uno por uno:

#### GCP_PROJECT_ID
- **Name**: `GCP_PROJECT_ID`
- **Value**: `my-personal-budget-483023`

#### GCP_SA_KEY
- **Name**: `GCP_SA_KEY`
- **Value**: Copia y pega el contenido completo del archivo `github-actions-key.json` (todo el JSON)

**Ejemplo del formato**:
```json
{
  "type": "service_account",
  "project_id": "my-personal-budget-483023",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  ...
}
```

#### GCP_REGION (Opcional)
- **Name**: `GCP_REGION`
- **Value**: `us-central1`

Si no lo configuras, el workflow usará `us-central1` por defecto.

#### GCP_SERVICE_NAME (Opcional)
- **Name**: `GCP_SERVICE_NAME`
- **Value**: `budget-backend`

Si no lo configuras, el workflow usará `budget-backend` por defecto.

## Paso 3: Crear Secrets en Google Secret Manager

Los secrets de la aplicación deben estar en Google Secret Manager.

### Secrets Requeridos (Obligatorios)

Estos secrets **deben** existir para que el deploy funcione:

- `DATABASE_URL` - Connection string de Supabase/PostgreSQL
- `JWT_SECRET` - Secreto para firmar tokens JWT

### Secrets Opcionales

Estos secrets son opcionales. El workflow solo los usará si existen:

- `BANCOCHILE_CLIENT_ID` - Client ID de BancoChile (si usas webhooks)
- `BANCOCHILE_CLIENT_SECRET` - Client Secret de BancoChile
- `SMTP_HOST` - Host del servidor SMTP
- `SMTP_PORT` - Puerto SMTP
- `SMTP_USER` - Usuario SMTP
- `SMTP_PASSWORD` - Contraseña SMTP
- `SMTP_FROM_EMAIL` - Email remitente
- `SMTP_FROM_NAME` - Nombre remitente
- `FRONTEND_URL` - URL del frontend (para links en emails)

**Nota**: El workflow detecta automáticamente qué secrets existen y solo usa los disponibles.

### 3.1. Verificar qué secrets existen

Antes de crear secrets, verifica cuáles ya existen y cuáles faltan:

```bash
npm run deploy:secrets:check
```

### 3.2. Crear secrets desde .env

Si tienes un archivo `.env` con las variables:

```bash
cd backend-my-budget
npm run deploy:secrets:create
```

### 3.2. Manualmente

```bash
# DATABASE_URL
echo -n "postgresql://postgres:password@db.project.supabase.co:5432/postgres" | \
  gcloud secrets create DATABASE_URL --data-file=-

# JWT_SECRET
echo -n "tu-secreto-jwt" | \
  gcloud secrets create JWT_SECRET --data-file=-

# SMTP (opcionales)
echo -n "smtp.gmail.com" | \
  gcloud secrets create SMTP_HOST --data-file=-

echo -n "587" | \
  gcloud secrets create SMTP_PORT --data-file=-

echo -n "tu-email@gmail.com" | \
  gcloud secrets create SMTP_USER --data-file=-

echo -n "tu-app-password" | \
  gcloud secrets create SMTP_PASSWORD --data-file=-

echo -n "tu-email@gmail.com" | \
  gcloud secrets create SMTP_FROM_EMAIL --data-file=-

echo -n "Budget App" | \
  gcloud secrets create SMTP_FROM_NAME --data-file=-

echo -n "https://tu-frontend.com" | \
  gcloud secrets create FRONTEND_URL --data-file=-
```

### 3.3. Dar Permisos a Cloud Run

Cloud Run necesita acceso a los secrets:

```bash
PROJECT_NUMBER=$(gcloud projects describe my-personal-budget-483023 --format='value(projectNumber)')

gcloud projects add-iam-policy-binding my-personal-budget-483023 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Paso 4: Verificar el Workflow

### 4.1. Ver el Workflow

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Deberías ver el workflow **Deploy to Cloud Run**

### 4.2. Ejecutar Manualmente (Primera vez)

1. Click en **Deploy to Cloud Run**
2. Click en **Run workflow**
3. Selecciona la rama `main`
4. Click en **Run workflow**

### 4.3. Verificar que Funciona

Después de que el workflow termine:

1. Revisa los logs para ver si hubo errores
2. Al final de los logs verás la URL del servicio
3. Prueba el health check: `curl https://tu-url/health`

## Paso 5: Deploy Automático

Una vez configurado, cada push a `main` desplegará automáticamente:

```bash
git add .
git commit -m "Cambios en el backend"
git push origin main
```

El workflow se ejecutará automáticamente y desplegará la nueva versión.

## Troubleshooting

### Error: "Permission denied" o "Insufficient permissions"

**Causa común**: Faltan roles en el service account.

**Solución**: Ejecuta todos los comandos de la sección 1.2 para asignar todos los roles necesarios:

```bash
PROJECT_ID="my-personal-budget-483023"
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Verifica los roles actuales
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:${SA_EMAIL}" \
  --format="table(bindings.role)"

# Si faltan roles, ejecuta los comandos de la sección 1.2
```

**Errores específicos**:

- **"Permission denied on storage.objects.create"**: Falta `roles/storage.admin` o `roles/storage.objectCreator`
- **"Permission denied on run.services.create"**: Falta `roles/run.admin`
- **"Permission denied on secrets.access"**: Falta `roles/secretmanager.secretAccessor`
- **"Permission denied on serviceaccounts.use"**: Falta `roles/iam.serviceAccountUser`

### Error: "Secret not found" o "Secret requerido 'X' no existe"

**Causa común**: Faltan secrets requeridos en Google Secret Manager.

**Solución**:

1. **Verifica qué secrets existen**:
   ```bash
   npm run deploy:secrets:check
   ```

2. **Crea los secrets faltantes**:
   ```bash
   # Agrega las variables a tu .env primero
   npm run deploy:secrets:create
   ```

3. **O crea manualmente cada secret**:
   ```bash
   echo -n "valor-del-secret" | gcloud secrets create NOMBRE_SECRET --data-file=-
   ```

**Secrets requeridos mínimos**:
- `DATABASE_URL` - Obligatorio
- `JWT_SECRET` - Obligatorio

Los demás secrets son opcionales. El workflow solo usará los que existan.

### Error: "Permission denied on secrets.access"

- Verifica que Cloud Run tiene permisos para acceder a los secrets (sección 3.3)
- Verifica que el service account de GitHub Actions tiene `roles/secretmanager.secretAccessor`

### Error: "Secret not found"

- Verifica que los secrets existen en Google Secret Manager: `gcloud secrets list`
- Verifica que Cloud Run tiene permisos para acceder a los secrets

### Error: "Image not found"

- Verifica que el build de Docker fue exitoso
- Revisa los logs del workflow para ver errores de build

### El workflow no se ejecuta

- Verifica que el archivo `.github/workflows/deploy.yml` está en el repositorio
- Verifica que estás haciendo push a la rama `main`
- Revisa la pestaña Actions para ver si hay errores de sintaxis en el workflow

## Seguridad

- **Nunca** commitees el archivo `github-actions-key.json` al repositorio
- Agrega `github-actions-key.json` a `.gitignore`
- Rota las keys periódicamente (cada 90 días recomendado)
- Usa el mínimo de permisos necesarios para el service account

## Actualizar la Key del Service Account

Si necesitas rotar la key:

1. Crea una nueva key: `gcloud iam service-accounts keys create ...`
2. Actualiza el secret `GCP_SA_KEY` en GitHub con el nuevo JSON
3. Elimina la key antigua desde Google Cloud Console
