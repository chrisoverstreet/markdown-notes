import type { Request, Response, NextFunction } from 'express';
import { verifyToken, signToken } from '../lib/jwt.js';

const RENEWED_TOKEN_HEADER = 'X-Renewed-Token';

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/** Parses JWT from Authorization header and sets req.userId (does not 401). Sliding session: sets X-Renewed-Token on response. */
export function parseAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      res.setHeader(RENEWED_TOKEN_HEADER, signToken(payload.userId));
    }
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
