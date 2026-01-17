import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../src/infrastructure/swagger/swaggerConfig';

const outputDir = path.join(__dirname, '../docs');
const jsonPath = path.join(outputDir, 'openapi.json');
const yamlPath = path.join(outputDir, 'openapi.yaml');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(jsonPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`✅ OpenAPI JSON exportado a: ${jsonPath}`);

const yaml = require('js-yaml');
fs.writeFileSync(yamlPath, yaml.dump(swaggerSpec));
console.log(`✅ OpenAPI YAML exportado a: ${yamlPath}`);

