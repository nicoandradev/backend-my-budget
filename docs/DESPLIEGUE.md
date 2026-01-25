# Guía de Despliegue del Backend

Esta guía explica cómo desplegar el backend en diferentes plataformas, todas conectándose a Supabase.

## Opción 1: Google Cloud Run (Recomendado - Más Económico)

### Ventajas
- **Costo**: ~$0-5/mes (pay-per-use, muy económico)
- **Escalabilidad**: Escala automáticamente a 0 cuando no hay tráfico
- **Gratis**: 2 millones de requests gratis por mes
- **Sin cold starts**: Si configuras min-instances > 0

### Prerrequisitos
1. Cuenta de Google Cloud Platform
2. Proyecto creado en GCP
3. `gcloud` CLI instalado y autenticado

### Pasos

#### 1. Configurar Google Cloud

```bash
# Instalar gcloud CLI (si no lo tienes)
# macOS: brew install google-cloud-sdk

# Autenticarte
gcloud auth login

# Configurar proyecto
gcloud config set project TU-PROJECT-ID
```

#### 2. Habilitar APIs necesarias

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

#### 3. Crear secrets en Secret Manager

```bash
# Crear secret para DATABASE_URL
echo -n "postgresql://postgres:TU-PASSWORD@db.TU-PROJECT-REF.supabase.co:5432/postgres" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Crear secret para JWT_SECRET
echo -n "tu-secreto-jwt-aqui" | \
  gcloud secrets create JWT_SECRET --data-file=-

# Si usas BancoChile, crear esos secrets también
echo -n "tu-client-id" | \
  gcloud secrets create BANCOCHILE_CLIENT_ID --data-file=-

echo -n "tu-client-secret" | \
  gcloud secrets create BANCOCHILE_CLIENT_SECRET --data-file=-
```

#### 4. Dar permisos a Cloud Run

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 5. Desplegar

**Opción A: Usando el script de deploy**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh TU-PROJECT-ID us-central1
```

**Opción B: Usando Cloud Build (CI/CD)**

```bash
gcloud builds submit --config cloudbuild.yaml
```

**Opción C: Manual**

```bash
# Construir y subir imagen
gcloud builds submit --tag gcr.io/TU-PROJECT-ID/budget-backend

# Desplegar
gcloud run deploy budget-backend \
  --image gcr.io/TU-PROJECT-ID/budget-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest
```

#### 6. Obtener URL

```bash
gcloud run services describe budget-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

### Costos Estimados
- **Requests**: 2M gratis/mes, luego $0.40 por millón
- **CPU/Memoria**: ~$0.00002400 por GB-segundo
- **Tráfico**: 1GB gratis/mes, luego $0.12/GB

**Ejemplo**: Para 100K requests/mes y 10 horas de ejecución: **~$0.50/mes**

---

## Opción 2: Railway (Más Fácil)

### Ventajas
- **Muy fácil**: Deploy desde GitHub en minutos
- **Sin configuración compleja**: Todo desde la UI
- **$5 de crédito gratis** al mes

### Pasos

1. **Crear cuenta en Railway**: https://railway.app

2. **Conectar repositorio GitHub**

3. **Configurar variables de entorno** en Railway:
   - `DATABASE_URL`: Tu connection string de Supabase
   - `JWT_SECRET`: Tu secreto JWT
   - `PORT`: 3000 (Railway lo asigna automáticamente)
   - `NODE_ENV`: production

4. **Railway detecta automáticamente**:
   - Dockerfile (si existe)
   - package.json (si no hay Dockerfile)

5. **Deploy automático** en cada push a main

### Costos
- **Tier Hobby**: $5/mes (incluye $5 de crédito)
- **Pay-as-you-go**: Solo pagas por uso real

---

## Opción 3: Render (Gratis con limitaciones)

### Ventajas
- **Tier gratuito disponible**
- **Deploy desde GitHub automático**
- **Fácil configuración**

### Pasos

1. **Crear cuenta en Render**: https://render.com

2. **Nuevo Web Service** desde GitHub

3. **Configurar**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. **Variables de entorno**:
   - `DATABASE_URL`: Tu connection string de Supabase
   - `JWT_SECRET`: Tu secreto JWT
   - `NODE_ENV`: production

5. **Deploy**

### Costos
- **Tier Gratuito**: 
  - Sleep después de 15 min de inactividad
  - Cold start de ~30 segundos
- **Starter ($7/mes)**: Always-on, sin cold starts

---

## Comparación de Costos

| Plataforma | Costo/Mes | Ventajas | Desventajas |
|------------|-----------|----------|-------------|
| **Google Cloud Run** | $0-5 | Pay-per-use, escala a 0 | Configuración inicial compleja |
| **Railway** | $5+ | Muy fácil, sin cold starts | Costo fijo mínimo |
| **Render** | $0-7 | Gratis disponible | Sleep en tier gratuito |

---

## Recomendación Final

**Para desarrollo/proyectos pequeños**: **Render (tier gratuito)** - Fácil y gratis

**Para producción/mejor costo**: **Google Cloud Run** - Más económico a largo plazo

**Para máxima facilidad**: **Railway** - $5/mes pero muy simple

---

## Verificar Despliegue

Después de desplegar, verifica que todo funciona:

```bash
# Health check
curl https://tu-url.com/health

# Debería responder: {"status":"ok"}
```

---

## Actualizar Variables de Entorno

### Google Cloud Run
```bash
gcloud run services update budget-backend \
  --update-secrets DATABASE_URL=DATABASE_URL:latest \
  --region us-central1
```

### Railway / Render
Actualiza desde el dashboard de la plataforma.

---

## Troubleshooting

### Error de conexión a Supabase
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la IP de la plataforma esté permitida en Supabase (Settings > Database > Connection Pooling)

### Cold starts lentos
- En Google Cloud Run: Configura `--min-instances 1`
- En Render: Usa tier Starter ($7/mes) para always-on

### Errores de build
- Verifica que `Dockerfile` esté en la raíz del proyecto
- Revisa los logs de build en la plataforma
