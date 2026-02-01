import bcrypt from 'bcryptjs';
import { sql } from './db.js';

const SALT_ROUNDS = 10;

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await sql`
    SELECT id, username, password_hash, created_at
    FROM users
    WHERE username = ${username}
    LIMIT 1
  `;
  return (rows as UserRow[])[0] ?? null;
}

export async function findUserById(id: string): Promise<Pick<UserRow, 'id' | 'username'> | null> {
  const rows = await sql`
    SELECT id, username
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return (rows as Pick<UserRow, 'id' | 'username'>[])[0] ?? null;
}

export async function createUser(username: string, password: string): Promise<UserRow> {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const rows = await sql`
    INSERT INTO users (username, password_hash)
    VALUES (${username}, ${password_hash})
    RETURNING id, username, password_hash, created_at
  `;
  const row = (rows as UserRow[])[0];
  if (!row) throw new Error('Insert failed');
  return row;
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
