const { execSync } = require('child_process');

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'my-personal-budget-483023';

// Secrets requeridos (siempre necesarios)
const requiredSecrets = [
  'DATABASE_URL',
  'JWT_SECRET',
];

// Secrets opcionales (solo se incluyen si existen)
const optionalSecrets = [
  'BANCOCHILE_CLIENT_ID',
  'BANCOCHILE_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'FRONTEND_URL',
];

try {
  // Obtener lista de secrets existentes
  const output = execSync(
    `gcloud secrets list --project=${PROJECT_ID} --format="value(name)"`,
    { encoding: 'utf-8' }
  );
  
  const existingSecrets = output
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim());
  
  // Construir lista de secrets para --set-secrets
  const secretsToUse = [];
  
  // Agregar secrets requeridos
  requiredSecrets.forEach(secret => {
    if (existingSecrets.includes(secret)) {
      secretsToUse.push(`${secret}=${secret}:latest`);
    } else {
      console.error(`❌ Error: Secret requerido '${secret}' no existe en Secret Manager`);
      process.exit(1);
    }
  });
  
  // Agregar secrets opcionales solo si existen
  optionalSecrets.forEach(secret => {
    if (existingSecrets.includes(secret)) {
      secretsToUse.push(`${secret}=${secret}:latest`);
    }
  });
  
  // Imprimir la lista para usar en el workflow
  console.log(secretsToUse.join(','));
} catch (error) {
  console.error('❌ Error al verificar secrets:', error.message);
  process.exit(1);
}
