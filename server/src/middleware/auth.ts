import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/** Parses JWT from Authorization header and sets req.userId (does not 401). */
export function parseAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.userId = payload.userId;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.userId) {
    next();
    return;
  }
  res.status(401).json({ message: 'Unauthorized' });
}
