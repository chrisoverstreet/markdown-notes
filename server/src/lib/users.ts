import bcrypt from 'bcryptjs';
import { sql } from './db.js';

const SALT_ROUNDS = 10;

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  kek_salt: string | null;
  encrypted_dek: string | null;
  created_at: Date;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await sql`
    SELECT id, username, password_hash, kek_salt, encrypted_dek, created_at
    FROM users
    WHERE username = ${username}
    LIMIT 1
  `;
  return (rows as UserRow[])[0] ?? null;
}

export interface UserMeRow {
  id: string;
  username: string;
  kek_salt: string | null;
  encrypted_dek: string | null;
}

export async function findUserById(id: string): Promise<UserMeRow | null> {
  const rows = await sql`
    SELECT id, username, kek_salt, encrypted_dek
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return (rows as UserMeRow[])[0] ?? null;
}

export async function createUser(
  username: string,
  password: string,
  e2ee: { kek_salt: string; encrypted_dek: string }
): Promise<UserRow> {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const rows = await sql`
    INSERT INTO users (username, password_hash, kek_salt, encrypted_dek)
    VALUES (${username}, ${password_hash}, ${e2ee.kek_salt}, ${e2ee.encrypted_dek})
    RETURNING id, username, password_hash, kek_salt, encrypted_dek, created_at
  `;
  const row = (rows as UserRow[])[0];
  if (!row) throw new Error('Insert failed');
  return row;
}

export async function updateUserE2EE(
  userId: string,
  kek_salt: string,
  encrypted_dek: string
): Promise<void> {
  await sql`
    UPDATE users SET kek_salt = ${kek_salt}, encrypted_dek = ${encrypted_dek}
    WHERE id = ${userId}
  `;
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
