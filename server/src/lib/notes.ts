import { sql } from './db.js';

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content_markdown: string;
  created_at: Date;
  updated_at: Date;
}

export async function getNotesByUserId(userId: string): Promise<NoteRow[]> {
  const rows = await sql`
    SELECT id, user_id, title, content_markdown, created_at, updated_at
    FROM notes
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return rows as NoteRow[];
}

export async function getNoteById(id: string, userId: string): Promise<NoteRow | null> {
  const rows = await sql`
    SELECT id, user_id, title, content_markdown, created_at, updated_at
    FROM notes
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return (rows as NoteRow[])[0] ?? null;
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
  return row;
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
    return (rows as NoteRow[])[0] ?? null;
  }
  if (data.title !== undefined) {
    const rows = await sql`
      UPDATE notes SET title = ${data.title}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, title, content_markdown, created_at, updated_at
    `;
    return (rows as NoteRow[])[0] ?? null;
  }
  if (data.content_markdown !== undefined) {
    const rows = await sql`
      UPDATE notes SET content_markdown = ${data.content_markdown}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, user_id, title, content_markdown, created_at, updated_at
    `;
    return (rows as NoteRow[])[0] ?? null;
  }
  return getNoteById(id, userId);
}

export async function deleteNote(id: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM notes WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return (rows as { id: string }[]).length > 0;
}
