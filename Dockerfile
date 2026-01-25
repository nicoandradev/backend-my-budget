FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar el resto del código
COPY . .

# Verificar que TypeScript esté disponible y hacer el build
RUN npm run build

# Verificar que el build fue exitoso
RUN test -f dist/index.js || (echo "Error: dist/index.js no existe después del build" && exit 1)

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "dist/index.js"]
