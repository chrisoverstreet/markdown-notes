import { and, desc, eq } from 'drizzle-orm';
import { decryptLegacyIfPossible } from './crypto.js';
import { db } from './db.js';
import { notes as notesTable } from '../db/schema.js';

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content_markdown: string;
  created_at: Date;
  updated_at: Date;
}

function toNoteRow(row: typeof notesTable.$inferSelect): NoteRow {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    content_markdown: row.contentMarkdown,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
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
  const rows = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.userId, userId))
    .orderBy(desc(notesTable.updatedAt));
  return rows.map(toNoteRow).map(decryptLegacyNote);
}

export async function getNoteById(id: string, userId: string): Promise<NoteRow | null> {
  const rows = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? decryptLegacyNote(toNoteRow(row)) : null;
}

export async function createNote(
  userId: string,
  title: string,
  content_markdown: string
): Promise<NoteRow> {
  const inserted = await db
    .insert(notesTable)
    .values({
      userId,
      title,
      contentMarkdown: content_markdown,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('Insert failed');
  return decryptLegacyNote(toNoteRow(row));
}

export async function updateNote(
  id: string,
  userId: string,
  data: { title?: string; content_markdown?: string }
): Promise<NoteRow | null> {
  if (data.title !== undefined && data.content_markdown !== undefined) {
    const updated = await db
      .update(notesTable)
      .set({
        title: data.title,
        contentMarkdown: data.content_markdown,
        updatedAt: new Date(),
      })
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();
    const row = updated[0];
    return row ? decryptLegacyNote(toNoteRow(row)) : null;
  }
  if (data.title !== undefined) {
    const updated = await db
      .update(notesTable)
      .set({ title: data.title, updatedAt: new Date() })
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();
    const row = updated[0];
    return row ? decryptLegacyNote(toNoteRow(row)) : null;
  }
  if (data.content_markdown !== undefined) {
    const updated = await db
      .update(notesTable)
      .set({ contentMarkdown: data.content_markdown, updatedAt: new Date() })
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();
    const row = updated[0];
    return row ? decryptLegacyNote(toNoteRow(row)) : null;
  }
  return getNoteById(id, userId);
}

export async function deleteNote(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
    .returning({ id: notesTable.id });
  return deleted.length > 0;
}
