CREATE TABLE IF NOT EXISTS bank_email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(100) NOT NULL,
  sender_patterns TEXT[] NOT NULL,
  extraction_instructions TEXT NOT NULL,
  example_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_email_configs_bank_name ON bank_email_configs(bank_name);

INSERT INTO bank_email_configs (bank_name, sender_patterns, extraction_instructions)
VALUES (
  'Banco de Chile',
  ARRAY['bancochile.cl', 'notificaciones.bancochile.cl', 'enviodigital@bancochile.cl'],
  'Extrae TODAS las transacciones del correo y devuelve un array JSON con cada transacción. Para cada transacción: merchant (nombre del comercio), amount (monto como número sin símbolos), date (YYYY-MM-DD), category (Deporte, Ropa, Recreacional, TC, Cursos, Supermercado, Transporte, Vacaciones, Ahorros, Salud, Hogar, Otros), type (expense para gastos, income para abonos). Si no encuentras transacciones válidas, devuelve [].'
);
