import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { users } from '../db/schema.js';

const SALT_ROUNDS = 10;

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  kek_salt: string | null;
  encrypted_dek: string | null;
  created_at: Date;
}

function toUserRow(row: typeof users.$inferSelect): UserRow {
  return {
    id: row.id,
    username: row.username,
    password_hash: row.passwordHash,
    kek_salt: row.kekSalt,
    encrypted_dek: row.encryptedDek,
    created_at: row.createdAt,
  };
}

export interface UserMeRow {
  id: string;
  username: string;
  kek_salt: string | null;
  encrypted_dek: string | null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const row = rows[0];
  return row ? toUserRow(row) : null;
}

export async function findUserById(id: string): Promise<UserMeRow | null> {
  const rows = await db
    .select({ id: users.id, username: users.username, kekSalt: users.kekSalt, encryptedDek: users.encryptedDek })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    kek_salt: row.kekSalt,
    encrypted_dek: row.encryptedDek,
  };
}

export async function createUser(
  username: string,
  password: string,
  e2ee: { kek_salt: string; encrypted_dek: string }
): Promise<UserRow> {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const inserted = await db
    .insert(users)
    .values({
      username,
      passwordHash: password_hash,
      kekSalt: e2ee.kek_salt,
      encryptedDek: e2ee.encrypted_dek,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('Insert failed');
  return toUserRow(row);
}

export async function updateUserE2EE(
  userId: string,
  kek_salt: string,
  encrypted_dek: string
): Promise<void> {
  await db
    .update(users)
    .set({ kekSalt: kek_salt, encryptedDek: encrypted_dek })
    .where(eq(users.id, userId));
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
