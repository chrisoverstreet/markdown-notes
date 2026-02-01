import type { Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getNotesByUserId, getNoteById, createNote, updateNote, deleteNote } from '../lib/notes.js';

export const notesRouter: ReturnType<typeof Router> = Router();
notesRouter.use(requireAuth);

notesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const notes = await getNotesByUserId(userId);
  res.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      updated_at: n.updated_at,
    }))
  );
});

notesRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ message: 'Note id required' });
    return;
  }
  const note = await getNoteById(id, userId);
  if (!note) {
    res.status(404).json({ message: 'Note not found' });
    return;
  }
  res.json({
    id: note.id,
    title: note.title,
    content_markdown: note.content_markdown,
    created_at: note.created_at,
    updated_at: note.updated_at,
  });
});

notesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const { title = 'Untitled', content_markdown = '' } = req.body as {
    title?: string;
    content_markdown?: string;
  };
  const note = await createNote(userId, String(title), String(content_markdown));
  res.status(201).json({
    id: note.id,
    title: note.title,
    content_markdown: note.content_markdown,
    created_at: note.created_at,
    updated_at: note.updated_at,
  });
});

notesRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ message: 'Note id required' });
    return;
  }
  const { title, content_markdown } = req.body as { title?: string; content_markdown?: string };
  const note = await updateNote(id, userId, {
    title: title !== undefined ? String(title) : undefined,
    content_markdown: content_markdown !== undefined ? String(content_markdown) : undefined,
  });
  if (!note) {
    res.status(404).json({ message: 'Note not found' });
    return;
  }
  res.json({
    id: note.id,
    title: note.title,
    content_markdown: note.content_markdown,
    created_at: note.created_at,
    updated_at: note.updated_at,
  });
});

notesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ message: 'Note id required' });
    return;
  }
  const deleted = await deleteNote(id, userId);
  if (!deleted) {
    res.status(404).json({ message: 'Note not found' });
    return;
  }
  res.status(204).end();
});
