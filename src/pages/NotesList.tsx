import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { encryptWithDEK, decryptWithDEK } from '../lib/e2ee';

export interface NoteSummary {
  id: string;
  title: string;
  updated_at: string;
}

export default function NotesList() {
  const { dek } = useAuth();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dek) return;
    fetch('/api/notes', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load notes');
        return res.json();
      })
      .then(async (data: NoteSummary[]) => {
        const decrypted = await Promise.all(
          data.map(async (n) => ({
            ...n,
            title: await decryptWithDEK(dek, n.title),
          }))
        );
        setNotes(decrypted);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [dek]);

  const createNote = async () => {
    if (!dek) return;
    const encryptedTitle = await encryptWithDEK(dek, 'Untitled');
    const encryptedContent = await encryptWithDEK(dek, '');
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: encryptedTitle, content_markdown: encryptedContent }),
    });
    if (!res.ok) return;
    const note = (await res.json()) as NoteSummary & { content_markdown?: string };
    window.location.href = `/notes/${note.id}`;
  };

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading notes...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-100">Notes</h2>
        <button
          type="button"
          onClick={createNote}
          className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 touch-manipulation shrink-0 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          New note
        </button>
      </div>
      <ul className="space-y-0.5 sm:space-y-1">
        {notes.length === 0 ? (
          <li className="text-gray-500 dark:text-gray-400 py-8 sm:py-10 text-center sm:text-left">
            No notes yet. Create one to get started.
          </li>
        ) : (
          notes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/notes/${note.id}`}
                className="block py-3 px-4 sm:py-2.5 sm:px-3 rounded-lg hover:bg-gray-100 active:bg-gray-100 touch-manipulation dark:hover:bg-gray-800 dark:active:bg-gray-800"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {note.title || 'Untitled'}
                </span>
                <span className="text-gray-500 text-sm block sm:inline sm:ml-2 mt-0.5 sm:mt-0 dark:text-gray-400">
                  {new Date(note.updated_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
