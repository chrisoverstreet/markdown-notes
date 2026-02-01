import { decryptLegacyIfPossible } from './crypto.js';
import { sql } from './db.js';

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content_markdown: string;
  created_at: Date;
  updated_at: Date;
}

/** Decrypt only legacy server-encrypted ("enc:") fields; E2EE and plaintext pass through. */
function decryptLegacyNote(row: NoteRow): NoteRow {
  return {
    ...row,
    title: decryptLegacyIfPossible(row.title),
    content_markdown: decryptLegacyIfPossible(row.content_markdown),
  };
}

export async function getNotesByUserId(userId: string): Promise<NoteRow[]> {
  const rows = await sql`
    SELECT id, user_id, title, content_markdown, created_at, updated_at
    FROM notes
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return (rows as NoteRow[]).map(decryptLegacyNote);
}

export async function getNoteById(id: string, userId: string): Promise<NoteRow | null> {
  const rows = await sql`
    SELECT id, user_id, title, content_markdown, created_at, updated_at
    FROM notes
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  const row = (rows as NoteRow[])[0] ?? null;
  return row ? decryptLegacyNote(row) : null;
}

export async function createNote(
  userId: string,
  title: string,
  content_markdown: string
): Promise<NoteRow> {
  const rows = await sql`
    INSERT INTO notes (user_id, title, content_markdown)
    VALUES (${userId}, ${title}, ${content_markdown})
    RETURNING id, user_id, title, content_markdown, created_at, updated_at
  `;
  const row = (rows as NoteRow[])[0];
  if (!row) throw new Error('Insert failed');
  return decryptLegacyNote(row);
}

export async function updateNote(
  id: string,
  userId: string,
  data: { title?: string; content_markdown?: string }
): Promise<NoteRow | null> {
  if (data.title !== undefined && data.content_markdown !== undefined) {
    const rows = await sql`
      UPDATE notes
      SET title = ${data.title}, content_markdown = ${data.content_markdown}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, title, content_markdown, created_at, updated_at
    `;
    const row = (rows as NoteRow[])[0] ?? null;
    return row ? decryptLegacyNote(row) : null;
  }
  if (data.title !== undefined) {
    const rows = await sql`
      UPDATE notes SET title = ${data.title}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, title, content_markdown, created_at, updated_at
    `;
    const row = (rows as NoteRow[])[0] ?? null;
    return row ? decryptLegacyNote(row) : null;
  }
  if (data.content_markdown !== undefined) {
    const rows = await sql`
      UPDATE notes SET content_markdown = ${data.content_markdown}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, title, content_markdown, created_at, updated_at
    `;
    const row = (rows as NoteRow[])[0] ?? null;
    return row ? decryptLegacyNote(row) : null;
  }
  return getNoteById(id, userId);
}

export async function deleteNote(id: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM notes WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return (rows as { id: string }[]).length > 0;
}
