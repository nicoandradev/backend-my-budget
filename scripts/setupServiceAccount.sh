#!/bin/bash

# Script para configurar el Service Account de GitHub Actions con todos los permisos necesarios

set -e

PROJECT_ID="${1:-my-personal-budget-483023}"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🔧 Configurando Service Account para GitHub Actions..."
echo "📋 Proyecto: ${PROJECT_ID}"
echo "👤 Service Account: ${SA_EMAIL}"
echo ""

# Verificar si el service account existe
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "📝 Creando service account..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="GitHub Actions Deploy" \
    --description="Service account para GitHub Actions deployments" \
    --project="${PROJECT_ID}"
  echo "✅ Service account creado"
else
  echo "✅ Service account ya existe"
fi

echo ""
echo "🔐 Asignando roles necesarios..."

# Cloud Run Admin (para desplegar y gestionar servicios)
echo "  - Cloud Run Admin..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin" \
  --condition=None \
  --quiet || echo "    ⚠️  Ya tiene este rol"

# Storage Admin (para subir imágenes a Container Registry)
echo "  - Storage Admin..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin" \
  --condition=None \
  --quiet || echo "    ⚠️  Ya tiene este rol"

# Service Account User (para usar el service account de Cloud Run)
echo "  - Service Account User..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None \
  --quiet || echo "    ⚠️  Ya tiene este rol"

# Secret Manager Secret Accessor (para leer secrets en Cloud Run)
echo "  - Secret Manager Secret Accessor..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None \
  --quiet || echo "    ⚠️  Ya tiene este rol"

# Service Usage Consumer (para habilitar APIs si es necesario)
echo "  - Service Usage Consumer..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --condition=None \
  --quiet || echo "    ⚠️  Ya tiene este rol"

echo ""
echo "📋 Verificando roles asignados..."
gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten="bindings[].members" \
  --filter="bindings.members:${SA_EMAIL}" \
  --format="table(bindings.role)" || true

echo ""
echo "🔑 Creando key JSON..."
KEY_FILE="github-actions-key.json"
if [ -f "${KEY_FILE}" ]; then
  echo "⚠️  El archivo ${KEY_FILE} ya existe. ¿Deseas sobrescribirlo? (s/N)"
  read -r response
  if [[ ! "$response" =~ ^[Ss]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
  fi
fi

gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT_ID}"

echo ""
echo "✅ Configuración completada!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Agrega el contenido de ${KEY_FILE} como secret 'GCP_SA_KEY' en GitHub"
echo "2. Configura los demás secrets en GitHub (GCP_PROJECT_ID, GCP_REGION, etc.)"
echo "3. ⚠️  NO commitees ${KEY_FILE} al repositorio (ya está en .gitignore)"
echo ""
echo "🔒 Para ver el contenido del key:"
echo "   cat ${KEY_FILE}"
