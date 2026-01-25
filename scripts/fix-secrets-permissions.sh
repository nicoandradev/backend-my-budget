#!/bin/bash

set -e

PROJECT_ID=${1:-"my-personal-budget-483023"}

echo "🔑 Configurando permisos de Secret Manager para Cloud Run..."
echo "Project ID: ${PROJECT_ID}"

# Configurar proyecto
gcloud config set project ${PROJECT_ID}

# Obtener PROJECT_NUMBER
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')

if [ -z "$PROJECT_NUMBER" ]; then
  echo "❌ Error: No se pudo obtener el PROJECT_NUMBER"
  exit 1
fi

echo "📋 Project Number: ${PROJECT_NUMBER}"
echo "📋 Service Account: ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Otorgar permisos al service account de Cloud Run
echo "🔐 Otorgando rol 'Secret Manager Secret Accessor' a Cloud Run..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Otorgar permisos al service account de Cloud Build
echo "📦 Otorgando permisos de Storage a Cloud Build..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"

echo "🚀 Otorgando permisos de Cloud Run a Cloud Build..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

echo "👤 Otorgando permisos de Service Account User a Cloud Build..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

echo ""
echo "✅ Permisos configurados correctamente!"
echo ""
echo "💡 Ahora puedes intentar el deploy de nuevo:"
echo "   ./scripts/deploy.sh ${PROJECT_ID} us-central1"
echo "   o"
echo "   gcloud builds submit --config cloudbuild.yaml"
