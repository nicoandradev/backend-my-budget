#!/bin/bash

set -e

echo "🧪 Probando build local antes del deploy..."
echo ""

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado"
    exit 1
fi

# Verificar que el build de TypeScript funcione localmente
echo "📦 Verificando build de TypeScript..."
npm run build

if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no existe después del build"
    exit 1
fi

echo "✅ Build de TypeScript exitoso"
echo ""

# Construir imagen Docker localmente
echo "🐳 Construyendo imagen Docker..."
docker build -t budget-backend-test .

if [ $? -eq 0 ]; then
    echo "✅ Build de Docker exitoso"
    echo ""
    echo "💡 Puedes probar la imagen localmente con:"
    echo "   docker run -p 8080:8080 -e DATABASE_URL='tu-db-url' -e JWT_SECRET='tu-secret' budget-backend-test"
else
    echo "❌ Error en el build de Docker"
    exit 1
fi
