import { Request, Response, NextFunction } from 'express';

export function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  const role = request.userRole;
  
  if (!role || (role !== 'admin' && role !== 'root')) {
    response.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    return;
  }
  
  next();
}

export function requireRoot(request: Request, response: Response, next: NextFunction): void {
  const role = request.userRole;
  
  if (role !== 'root') {
    response.status(403).json({ error: 'Acceso denegado. Se requiere rol de root' });
    return;
  }
  
  next();
}

export function requireAdminOrRoot(request: Request, response: Response, next: NextFunction): void {
  return requireAdmin(request, response, next);
}
