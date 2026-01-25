#!/bin/bash

set -e

PROJECT_ID=${1:-"my-personal-budget-483023"}

echo "🔐 Creando secrets en Secret Manager..."
echo "Project ID: ${PROJECT_ID}"

# Configurar proyecto
gcloud config set project ${PROJECT_ID}

# Habilitar Secret Manager API
echo "🔧 Habilitando Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Leer valores desde .env
if [ -f .env ]; then
  echo "📖 Leyendo valores desde .env..."
  # Usar un método más seguro para leer .env
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  No se encontró .env"
fi

# Crear secret DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  echo "📝 Creando secret DATABASE_URL..."
  echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=- 2>/dev/null || \
    echo -n "$DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=-
  echo "✅ DATABASE_URL configurado"
else
  echo "⚠️  DATABASE_URL no encontrado. Creando placeholder..."
  echo -n "postgresql://postgres:password@localhost:5432/postgres" | \
    gcloud secrets create DATABASE_URL --data-file=- 2>/dev/null || \
    echo "⚠️  Secret DATABASE_URL ya existe, actualízalo manualmente con:"
  echo "   echo -n 'tu-database-url' | gcloud secrets versions add DATABASE_URL --data-file=-"
fi

# Crear secret JWT_SECRET
if [ -n "$JWT_SECRET" ]; then
  echo "📝 Creando secret JWT_SECRET..."
  echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=- 2>/dev/null || \
    echo -n "$JWT_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=-
  echo "✅ JWT_SECRET configurado"
else
  echo "⚠️  JWT_SECRET no encontrado. Creando placeholder..."
  echo -n "change-me-in-production" | \
    gcloud secrets create JWT_SECRET --data-file=- 2>/dev/null || \
    echo "⚠️  Secret JWT_SECRET ya existe, actualízalo manualmente con:"
  echo "   echo -n 'tu-jwt-secret' | gcloud secrets versions add JWT_SECRET --data-file=-"
fi

# Crear secrets de BancoChile (crear vacíos si no existen)
echo "📝 Creando secrets de BancoChile (opcionales)..."
if [ -n "$BANCOCHILE_CLIENT_ID" ]; then
  echo -n "$BANCOCHILE_CLIENT_ID" | gcloud secrets create BANCOCHILE_CLIENT_ID --data-file=- 2>/dev/null || \
    echo -n "$BANCOCHILE_CLIENT_ID" | gcloud secrets versions add BANCOCHILE_CLIENT_ID --data-file=-
  echo "✅ BANCOCHILE_CLIENT_ID configurado"
else
  echo -n "placeholder-client-id" | \
    gcloud secrets create BANCOCHILE_CLIENT_ID --data-file=- 2>/dev/null || \
    echo "⚠️  Secret BANCOCHILE_CLIENT_ID ya existe"
fi

if [ -n "$BANCOCHILE_CLIENT_SECRET" ]; then
  echo -n "$BANCOCHILE_CLIENT_SECRET" | gcloud secrets create BANCOCHILE_CLIENT_SECRET --data-file=- 2>/dev/null || \
    echo -n "$BANCOCHILE_CLIENT_SECRET" | gcloud secrets versions add BANCOCHILE_CLIENT_SECRET --data-file=-
  echo "✅ BANCOCHILE_CLIENT_SECRET configurado"
else
  echo -n "placeholder-client-secret" | \
    gcloud secrets create BANCOCHILE_CLIENT_SECRET --data-file=- 2>/dev/null || \
    echo "⚠️  Secret BANCOCHILE_CLIENT_SECRET ya existe"
fi

echo ""
echo "✅ Secrets creados!"
echo ""
echo "📋 Verificar secrets:"
echo "   gcloud secrets list"
echo ""
echo "💡 Si necesitas actualizar un secret:"
echo "   echo -n 'nuevo-valor' | gcloud secrets versions add SECRET_NAME --data-file=-"
