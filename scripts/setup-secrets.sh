#!/bin/bash

set -e

PROJECT_ID=${1:-"my-personal-budget-483023"}

echo "🔐 Configurando secrets en Secret Manager..."
echo "Project ID: ${PROJECT_ID}"

# Configurar proyecto
gcloud config set project ${PROJECT_ID}

# Habilitar Secret Manager API
echo "🔧 Habilitando Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Leer valores desde .env o pedirlos al usuario
if [ -f .env ]; then
  echo "📖 Leyendo valores desde .env..."
  source .env
else
  echo "⚠️  No se encontró .env, necesitarás proporcionar los valores manualmente"
fi

# Crear secret DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  echo "📝 Creando secret DATABASE_URL..."
  echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=- 2>/dev/null || \
    echo -n "$DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=-
  echo "✅ DATABASE_URL configurado"
else
  echo "⚠️  DATABASE_URL no encontrado en .env, créalo manualmente:"
  echo "   echo -n 'postgresql://...' | gcloud secrets create DATABASE_URL --data-file=-"
fi

# Crear secret JWT_SECRET
if [ -n "$JWT_SECRET" ]; then
  echo "📝 Creando secret JWT_SECRET..."
  echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=- 2>/dev/null || \
    echo -n "$JWT_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=-
  echo "✅ JWT_SECRET configurado"
else
  echo "⚠️  JWT_SECRET no encontrado en .env, créalo manualmente:"
  echo "   echo -n 'tu-secreto' | gcloud secrets create JWT_SECRET --data-file=-"
fi

# Crear secrets de BancoChile (opcionales)
if [ -n "$BANCOCHILE_CLIENT_ID" ]; then
  echo "📝 Creando secret BANCOCHILE_CLIENT_ID..."
  echo -n "$BANCOCHILE_CLIENT_ID" | gcloud secrets create BANCOCHILE_CLIENT_ID --data-file=- 2>/dev/null || \
    echo -n "$BANCOCHILE_CLIENT_ID" | gcloud secrets versions add BANCOCHILE_CLIENT_ID --data-file=-
  echo "✅ BANCOCHILE_CLIENT_ID configurado"
fi

if [ -n "$BANCOCHILE_CLIENT_SECRET" ]; then
  echo "📝 Creando secret BANCOCHILE_CLIENT_SECRET..."
  echo -n "$BANCOCHILE_CLIENT_SECRET" | gcloud secrets create BANCOCHILE_CLIENT_SECRET --data-file=- 2>/dev/null || \
    echo -n "$BANCOCHILE_CLIENT_SECRET" | gcloud secrets versions add BANCOCHILE_CLIENT_SECRET --data-file=-
  echo "✅ BANCOCHILE_CLIENT_SECRET configurado"
fi

# Dar permisos a Cloud Run
echo "🔑 Configurando permisos para Cloud Run..."
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None

echo "✅ Permisos configurados"
echo ""
echo "🎉 Secrets configurados correctamente!"
echo "📋 Puedes verificar los secrets con:"
echo "   gcloud secrets list"
