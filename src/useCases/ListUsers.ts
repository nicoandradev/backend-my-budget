import { pool } from '../infrastructure/database/connection';
import { User } from '../domain/User';

function parseDateFromPostgres(dateValue: Date | string): Date {
  if (typeof dateValue === 'string') {
    return new Date(dateValue);
  }
  return new Date(dateValue);
}

export class ListUsers {
  async execute(includePending: boolean = false): Promise<User[]> {
    let query = `
      SELECT id, email, name, role, pending_active, active, created_at, updated_at
      FROM users
    `;
    
    const params: any[] = [];
    
    if (!includePending) {
      query += ' WHERE pending_active = false';
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      password: '',
      name: row.name,
      role: row.role,
      pendingActive: row.pending_active,
      active: row.active,
      createdAt: parseDateFromPostgres(row.created_at),
      updatedAt: parseDateFromPostgres(row.updated_at),
    }));
  }
}
