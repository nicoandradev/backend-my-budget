import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function authenticateToken(request: Request, response: Response, next: NextFunction): void {
  const authHeader = request.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    response.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    response.status(500).json({ error: 'Error de configuración del servidor' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    request.userId = decoded.userId;
    next();
  } catch (error) {
    response.status(401).json({ error: 'Token inválido o expirado' });
  }
}

