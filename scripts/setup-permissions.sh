#!/bin/bash

set -e

PROJECT_ID=${1:-"my-personal-budget-483023"}
ACCOUNT_EMAIL=${2:-"nicoandradev8@gmail.com"}

echo "🔐 Configurando permisos para Cloud Build..."
echo "Project ID: ${PROJECT_ID}"
echo "Account: ${ACCOUNT_EMAIL}"

# Configurar proyecto
echo "📋 Configurando proyecto..."
gcloud config set project ${PROJECT_ID}

# Verificar autenticación
echo "🔍 Verificando autenticación..."
CURRENT_ACCOUNT=$(gcloud config get-value account)
echo "Cuenta actual: ${CURRENT_ACCOUNT}"

if [ "${CURRENT_ACCOUNT}" != "${ACCOUNT_EMAIL}" ]; then
  echo "⚠️  La cuenta actual (${CURRENT_ACCOUNT}) no coincide con la esperada (${ACCOUNT_EMAIL})"
  echo "¿Deseas cambiar a ${ACCOUNT_EMAIL}? (s/n)"
  read -r response
  if [ "$response" = "s" ]; then
    gcloud config set account ${ACCOUNT_EMAIL}
  fi
fi

# Habilitar APIs necesarias
echo "🔧 Habilitando APIs necesarias..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Dar permisos al usuario actual
echo "🔑 Otorgando permisos necesarios..."

# Cloud Build Editor (para ejecutar builds)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${ACCOUNT_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Service Account User (para usar service accounts)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${ACCOUNT_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Cloud Run Admin (para desplegar servicios)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${ACCOUNT_EMAIL}" \
  --role="roles/run.admin"

# Storage Admin (para subir imágenes a Container Registry)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${ACCOUNT_EMAIL}" \
  --role="roles/storage.admin"

# Secret Manager Admin (para gestionar secrets)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.admin"

# Obtener PROJECT_NUMBER para configurar service accounts
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')

if [ -n "$PROJECT_NUMBER" ]; then
  echo ""
  echo "🔑 Configurando permisos para service accounts..."
  
  # Service account de Cloud Build - Storage permissions
  echo "📦 Otorgando permisos de Storage a Cloud Build service account..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/storage.admin"
  
  # Service account de Cloud Run - Secret Manager permissions
  echo "🔐 Otorgando permisos de Secret Manager a Cloud Run service account..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  
  # Service account de Cloud Build - Cloud Run permissions (para poder desplegar)
  echo "🚀 Otorgando permisos de Cloud Run a Cloud Build service account..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"
  
  # Service account de Cloud Build - Service Account User (para usar otros service accounts)
  echo "👤 Otorgando permisos de Service Account User a Cloud Build..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
fi

# Verificar permisos
echo ""
echo "✅ Permisos configurados"
echo ""
echo "📋 Verificando permisos actuales..."
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:${ACCOUNT_EMAIL}" \
  --format="table(bindings.role)"

echo ""
echo "🎉 Configuración completada!"
echo ""
echo "💡 Si aún tienes problemas, verifica que:"
echo "   1. Tu cuenta tenga permisos de Owner o Editor en el proyecto"
echo "   2. El proyecto tenga facturación habilitada"
echo "   3. Espera unos minutos para que los permisos se propaguen"
