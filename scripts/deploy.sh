#!/bin/bash

set -e

PROJECT_ID=${1:-"my-personal-budget-483023"}
REGION=${2:-"us-central1"}
SERVICE_NAME="budget-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Iniciando deploy a GCP..."
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI no está instalado"
    exit 1
fi

# Configurar proyecto
echo "📋 Configurando proyecto..."
gcloud config set project ${PROJECT_ID}

# Habilitar APIs necesarias
echo "🔧 Habilitando APIs necesarias..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Construir imagen
echo "🏗️  Construyendo imagen Docker..."
gcloud builds submit --tag ${IMAGE_NAME}

# Desplegar a Cloud Run
echo "🚢 Desplegando a Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,BANCOCHILE_CLIENT_ID=BANCOCHILE_CLIENT_ID:latest,BANCOCHILE_CLIENT_SECRET=BANCOCHILE_CLIENT_SECRET:latest,SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASSWORD=SMTP_PASSWORD:latest,SMTP_FROM_EMAIL=SMTP_FROM_EMAIL:latest,SMTP_FROM_NAME=SMTP_FROM_NAME:latest,FRONTEND_URL=FRONTEND_URL:latest

# Obtener URL del servicio
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo "✅ Deploy completado!"
echo "🌐 URL del servicio: ${SERVICE_URL}"
echo "📝 Webhook URL: ${SERVICE_URL}/webhooks/bancochile"
