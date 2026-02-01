import jsonwebtoken from 'jsonwebtoken';

const secret = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const expiresIn = '1h';

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jsonwebtoken.sign({ userId }, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jsonwebtoken.verify(token, secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
