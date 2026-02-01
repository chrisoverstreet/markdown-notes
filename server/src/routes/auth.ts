import type { Request, Response } from 'express';
import { Router } from 'express';
import { findUserByUsername, createUser, verifyPassword } from '../lib/users.js';

export const authRouter: ReturnType<typeof Router> = Router();

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ message: 'Username and password required' });
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
    const user = await createUser(trimmed, password);
    req.session!.userId = user.id;
    res.status(201).json({ id: user.id, username: user.username });
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
  req.session!.userId = user.id;
  res.json({ id: user.id, username: user.username });
});

authRouter.post('/logout', (req: Request, res: Response): void => {
  req.session?.destroy(() => {});
  res.status(204).end();
});

authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Not logged in' });
    return;
  }
  const { findUserById } = await import('../lib/users.js');
  const user = await findUserById(userId);
  if (!user) {
    req.session?.destroy(() => {});
    res.status(401).json({ message: 'Session invalid' });
    return;
  }
  res.json({ id: user.id, username: user.username });
});
