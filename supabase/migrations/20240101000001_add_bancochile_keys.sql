CREATE TABLE IF NOT EXISTS banco_chile_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banco_chile_keys_public_key ON banco_chile_keys(public_key);
CREATE INDEX IF NOT EXISTS idx_banco_chile_keys_user_id ON banco_chile_keys(user_id);
