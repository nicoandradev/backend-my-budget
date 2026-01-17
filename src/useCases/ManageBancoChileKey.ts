import { pool } from '../infrastructure/database/connection';

export interface BancoChileKey {
  id: string;
  userId: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ManageBancoChileKey {
  async associateKey(userId: string, publicKey: string): Promise<BancoChileKey> {
    if (!publicKey || publicKey.trim().length === 0) {
      throw new Error('PublicKey es requerido');
    }

    const trimmedKey = publicKey.trim();

    const existingKey = await pool.query(
      'SELECT id, user_id FROM banco_chile_keys WHERE public_key = $1',
      [trimmedKey]
    );

    if (existingKey.rows.length > 0) {
      const existingUserId = existingKey.rows[0].user_id;
      if (existingUserId !== userId) {
        throw new Error('Esta publicKey ya está asociada a otro usuario');
      }
      return this.findKeyById(existingKey.rows[0].id);
    }

    const result = await pool.query(
      `INSERT INTO banco_chile_keys (user_id, public_key)
       VALUES ($1, $2)
       RETURNING id, user_id, public_key, created_at, updated_at`,
      [userId, trimmedKey]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async findUserByKey(publicKey: string): Promise<string | null> {
    if (!publicKey || publicKey.trim().length === 0) {
      return null;
    }

    const result = await pool.query(
      'SELECT user_id FROM banco_chile_keys WHERE public_key = $1',
      [publicKey.trim()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].user_id;
  }

  async listUserKeys(userId: string): Promise<BancoChileKey[]> {
    const result = await pool.query(
      `SELECT id, user_id, public_key, created_at, updated_at
       FROM banco_chile_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async removeKey(userId: string, keyId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM banco_chile_keys WHERE id = $1 AND user_id = $2',
      [keyId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Key no encontrada o no pertenece al usuario');
    }
  }

  private async findKeyById(keyId: string): Promise<BancoChileKey> {
    const result = await pool.query(
      `SELECT id, user_id, public_key, created_at, updated_at
       FROM banco_chile_keys
       WHERE id = $1`,
      [keyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Key no encontrada');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
