const { execSync } = require('child_process');
require('dotenv').config();

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'my-personal-budget-483023';

// Secrets requeridos por el workflow
const requiredSecrets = [
  'DATABASE_URL',
  'JWT_SECRET',
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

console.log('🔍 Verificando secrets en Google Cloud Secret Manager...\n');
console.log(`📋 Proyecto: ${PROJECT_ID}\n`);

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
  
  console.log('📦 Secrets existentes:');
  existingSecrets.forEach(secret => {
    console.log(`  ✅ ${secret}`);
  });
  
  console.log('\n🔍 Verificando secrets requeridos por el workflow:\n');
  
  const missingSecrets = [];
  const foundSecrets = [];
  
  requiredSecrets.forEach(secret => {
    if (existingSecrets.includes(secret)) {
      foundSecrets.push(secret);
      console.log(`  ✅ ${secret} - Existe`);
    } else {
      missingSecrets.push(secret);
      console.log(`  ❌ ${secret} - FALTA`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Secrets encontrados: ${foundSecrets.length}/${requiredSecrets.length}`);
  console.log(`❌ Secrets faltantes: ${missingSecrets.length}/${requiredSecrets.length}`);
  
  if (missingSecrets.length > 0) {
    console.log('\n⚠️  Secrets que necesitas crear:');
    missingSecrets.forEach(secret => {
      console.log(`   - ${secret}`);
    });
    console.log('\n💡 Para crear los secrets faltantes:');
    console.log('   1. Agrega las variables a tu archivo .env');
    console.log('   2. Ejecuta: npm run deploy:secrets:create');
    console.log('\n   O crea cada secret manualmente:');
    console.log(`   echo -n "valor" | gcloud secrets create ${missingSecrets[0]} --data-file=- --project=${PROJECT_ID}`);
    process.exit(1);
  } else {
    console.log('\n✅ Todos los secrets requeridos están configurados!');
  }
} catch (error) {
  console.error('❌ Error al verificar secrets:', error.message);
  console.log('\n💡 Asegúrate de:');
  console.log('   1. Estar autenticado: gcloud auth login');
  console.log(`   2. Tener acceso al proyecto: ${PROJECT_ID}`);
  process.exit(1);
}
