#!/bin/bash

set -e

PROJECT_ID=${1:-"my-personal-budget-483023"}

echo "🔑 Configurando permisos de Cloud Build..."
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
echo "📋 Cloud Build Service Account: ${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Otorgar permisos al service account de Cloud Build
echo ""
echo "🔐 Otorgando permisos necesarios..."

# 1. Storage Admin (para acceder a buckets de GCS)
echo "📦 Otorgando roles/storage.admin..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"

# 2. Cloud Run Admin (para desplegar servicios)
echo "🚀 Otorgando roles/run.admin..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# 3. Service Account User (para usar otros service accounts)
echo "👤 Otorgando roles/iam.serviceAccountUser..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# 4. Secret Manager Secret Accessor para Cloud Run
echo "🔐 Otorgando roles/secretmanager.secretAccessor a Cloud Run..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 5. Storage permissions para Compute Engine service account (por si Cloud Build lo usa)
echo "📦 Otorgando roles/storage.admin a Compute Engine service account..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.admin"

echo ""
echo "✅ Permisos configurados correctamente!"
echo ""
echo "💡 Espera 1-2 minutos para que los permisos se propaguen, luego intenta el deploy:"
echo "   ./scripts/deploy.sh ${PROJECT_ID} us-central1"
