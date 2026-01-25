ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL,
ADD COLUMN IF NOT EXISTS pending_active BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_pending_active ON users(pending_active);
