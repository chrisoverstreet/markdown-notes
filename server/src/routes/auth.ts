import type { Request, Response } from 'express';
import { Router } from 'express';
import {
  findUserByUsername,
  createUser,
  verifyPassword,
  updateUserE2EE,
} from '../lib/users.js';
import { signToken } from '../lib/jwt.js';

export const authRouter: ReturnType<typeof Router> = Router();

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    username?: string;
    password?: string;
    kek_salt?: string;
    encrypted_dek?: string;
  };
  const { username, password, kek_salt, encrypted_dek } = body;
  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ message: 'Username and password required' });
    return;
  }
  if (!kek_salt || typeof kek_salt !== 'string' || !encrypted_dek || typeof encrypted_dek !== 'string') {
    res.status(400).json({ message: 'E2EE keys required (kek_salt, encrypted_dek)' });
    return;
  }
  const trimmed = username.trim();
  if (trimmed.length < 1) {
    res.status(400).json({ message: 'Username required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }
  const existing = await findUserByUsername(trimmed);
  if (existing) {
    res.status(409).json({ message: 'Username already taken' });
    return;
  }
  try {
    const user = await createUser(trimmed, password, { kek_salt, encrypted_dek });
    const token = signToken(user.id);
    res.status(201).json({
      token,
      id: user.id,
      username: user.username,
      kek_salt: user.kek_salt,
      encrypted_dek: user.encrypted_dek,
    });
  } catch {
    res.status(500).json({ message: 'Registration failed' });
  }
});

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ message: 'Username and password required' });
    return;
  }
  const user = await findUserByUsername(username.trim());
  if (!user) {
    res.status(401).json({ message: 'Invalid username or password' });
    return;
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ message: 'Invalid username or password' });
    return;
  }
  const token = signToken(user.id);
  res.json({
    token,
    id: user.id,
    username: user.username,
    kek_salt: user.kek_salt,
    encrypted_dek: user.encrypted_dek,
  });
});

authRouter.post('/setup-e2ee', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Not logged in' });
    return;
  }
  const { kek_salt, encrypted_dek } = req.body as { kek_salt?: string; encrypted_dek?: string };
  if (!kek_salt || typeof kek_salt !== 'string' || !encrypted_dek || typeof encrypted_dek !== 'string') {
    res.status(400).json({ message: 'kek_salt and encrypted_dek required' });
    return;
  }
  try {
    await updateUserE2EE(userId, kek_salt, encrypted_dek);
    res.json({ kek_salt, encrypted_dek });
  } catch {
    res.status(500).json({ message: 'Setup failed' });
  }
});

authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.status(204).end();
});

authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Not logged in' });
    return;
  }
  const { findUserById } = await import('../lib/users.js');
  const user = await findUserById(userId);
  if (!user) {
    res.status(401).json({ message: 'Token invalid' });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    kek_salt: user.kek_salt,
    encrypted_dek: user.encrypted_dek,
  });
});
