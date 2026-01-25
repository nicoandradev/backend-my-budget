const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
require('dotenv').config();

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'my-personal-budget-483023';

const secrets = [
  { name: 'DATABASE_URL', envVar: 'DATABASE_URL' },
  { name: 'JWT_SECRET', envVar: 'JWT_SECRET' },
  { name: 'BANCOCHILE_CLIENT_ID', envVar: 'BANCOCHILE_CLIENT_ID', optional: true },
  { name: 'BANCOCHILE_CLIENT_SECRET', envVar: 'BANCOCHILE_CLIENT_SECRET', optional: true },
  { name: 'SMTP_HOST', envVar: 'SMTP_HOST', optional: true },
  { name: 'SMTP_PORT', envVar: 'SMTP_PORT', optional: true },
  { name: 'SMTP_USER', envVar: 'SMTP_USER', optional: true },
  { name: 'SMTP_PASSWORD', envVar: 'SMTP_PASSWORD', optional: true },
  { name: 'SMTP_FROM_EMAIL', envVar: 'SMTP_FROM_EMAIL', optional: true },
  { name: 'SMTP_FROM_NAME', envVar: 'SMTP_FROM_NAME', optional: true },
  { name: 'FRONTEND_URL', envVar: 'FRONTEND_URL', optional: true },
];

console.log('🔐 Actualizando secrets en Google Cloud Secret Manager...\n');

secrets.forEach(secret => {
  const value = process.env[secret.envVar];
  
  if (!value && !secret.optional) {
    console.error(`❌ Error: ${secret.envVar} no está configurado en .env`);
    process.exit(1);
  }
  
  if (!value && secret.optional) {
    console.log(`⏭️  Omitiendo ${secret.name} (opcional y no configurado)`);
    return;
  }

  const tempFile = path.join(tmpdir(), `secret-${secret.name}-${Date.now()}.txt`);
  
  try {
    fs.writeFileSync(tempFile, value, 'utf8');
    console.log(`📦 Actualizando secret: ${secret.name}...`);
    execSync(
      `gcloud secrets versions add ${secret.name} --data-file=${tempFile} --project=${PROJECT_ID}`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Secret ${secret.name} actualizado\n`);
  } catch (error) {
    console.error(`❌ Error al actualizar ${secret.name}:`, error.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
});

console.log('✅ Todos los secrets han sido actualizados');
