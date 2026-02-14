import { Router, Request, Response } from 'express';
import { authenticateToken } from '../infrastructure/auth/authMiddleware';
import { requireAdmin } from '../infrastructure/auth/authorizeMiddleware';
import { pool } from '../infrastructure/database/connection';

const router = Router();

interface BankEmailConfigRow {
  id: string;
  bank_name: string;
  sender_patterns: string[];
  extraction_instructions: string;
  example_image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToConfig(row: BankEmailConfigRow) {
  return {
    id: row.id,
    bankName: row.bank_name,
    senderPatterns: row.sender_patterns,
    extractionInstructions: row.extraction_instructions,
    exampleImageUrl: row.example_image_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

router.get('/', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, bank_name, sender_patterns, extraction_instructions, example_image_url, created_at, updated_at FROM bank_email_configs ORDER BY bank_name'
    );
    response.status(200).json((result.rows as BankEmailConfigRow[]).map(rowToConfig));
  } catch (error) {
    console.error('Error listando configs de correos bancarios:', error);
    response.status(500).json({ error: 'Error al listar configuraciones' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const { bankName, senderPatterns, extractionInstructions, exampleImageUrl } = request.body;

    if (!bankName || typeof bankName !== 'string' || bankName.trim() === '') {
      response.status(400).json({ error: 'bankName es requerido' });
      return;
    }
    if (!Array.isArray(senderPatterns) || senderPatterns.length === 0) {
      response.status(400).json({ error: 'senderPatterns debe ser un array no vacío' });
      return;
    }
    if (!extractionInstructions || typeof extractionInstructions !== 'string' || extractionInstructions.trim() === '') {
      response.status(400).json({ error: 'extractionInstructions es requerido' });
      return;
    }

    const patterns = senderPatterns.map((p: unknown) => String(p).trim()).filter(Boolean);
    if (patterns.length === 0) {
      response.status(400).json({ error: 'senderPatterns debe tener al menos un patrón válido' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO bank_email_configs (bank_name, sender_patterns, extraction_instructions, example_image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, bank_name, sender_patterns, extraction_instructions, example_image_url, created_at, updated_at`,
      [bankName.trim(), patterns, extractionInstructions.trim(), exampleImageUrl?.trim() || null]
    );

    response.status(201).json(rowToConfig(result.rows[0] as BankEmailConfigRow));
  } catch (error) {
    console.error('Error creando config de correos bancarios:', error);
    response.status(500).json({ error: 'Error al crear configuración' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const { id } = request.params;
    const { bankName, senderPatterns, extractionInstructions, exampleImageUrl } = request.body;

    if (!bankName || typeof bankName !== 'string' || bankName.trim() === '') {
      response.status(400).json({ error: 'bankName es requerido' });
      return;
    }
    if (!Array.isArray(senderPatterns) || senderPatterns.length === 0) {
      response.status(400).json({ error: 'senderPatterns debe ser un array no vacío' });
      return;
    }
    if (!extractionInstructions || typeof extractionInstructions !== 'string' || extractionInstructions.trim() === '') {
      response.status(400).json({ error: 'extractionInstructions es requerido' });
      return;
    }

    const patterns = senderPatterns.map((p: unknown) => String(p).trim()).filter(Boolean);
    if (patterns.length === 0) {
      response.status(400).json({ error: 'senderPatterns debe tener al menos un patrón válido' });
      return;
    }

    const result = await pool.query(
      `UPDATE bank_email_configs
       SET bank_name = $1, sender_patterns = $2, extraction_instructions = $3, example_image_url = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, bank_name, sender_patterns, extraction_instructions, example_image_url, created_at, updated_at`,
      [bankName.trim(), patterns, extractionInstructions.trim(), exampleImageUrl?.trim() || null, id]
    );

    if (result.rows.length === 0) {
      response.status(404).json({ error: 'Configuración no encontrada' });
      return;
    }

    response.status(200).json(rowToConfig(result.rows[0] as BankEmailConfigRow));
  } catch (error) {
    console.error('Error actualizando config de correos bancarios:', error);
    response.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (request: Request, response: Response) => {
  try {
    const { id } = request.params;

    const result = await pool.query('DELETE FROM bank_email_configs WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      response.status(404).json({ error: 'Configuración no encontrada' });
      return;
    }

    response.status(204).send();
  } catch (error) {
    console.error('Error eliminando config de correos bancarios:', error);
    response.status(500).json({ error: 'Error al eliminar configuración' });
  }
});

export default router;
