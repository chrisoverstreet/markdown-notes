import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/auth';
import { encryptWithDEK, decryptWithDEK } from '../lib/e2ee';

export type MarkdownViewMode = 'plain' | 'formatted' | 'both';

export interface Note {
  id: string;
  title: string;
  content_markdown: string;
  created_at: string;
  updated_at: string;
}

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dek, getAuthHeaders } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(true);
  const [viewMode, setViewMode] = useState<MarkdownViewMode>('both');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !dek) return;
    fetch(`/api/notes/${id}`, { credentials: 'include', headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Note not found');
        return res.json();
      })
      .then(async (data: Note) => ({
        ...data,
        title: await decryptWithDEK(dek, data.title),
        content_markdown: await decryptWithDEK(dek, data.content_markdown),
      }))
      .then((decrypted) => {
        setNote(decrypted);
        setTitle(decrypted.title);
        setContent(decrypted.content_markdown);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, dek, navigate, getAuthHeaders]);

  const save = async () => {
    if (!id || !dek) return;
    setSaving(true);
    try {
      const encryptedTitle = await encryptWithDEK(dek, title);
      const encryptedContent = await encryptWithDEK(dek, content);
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          title: encryptedTitle,
          content_markdown: encryptedContent,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Note;
        const decrypted = {
          ...updated,
          title: await decryptWithDEK(dek, updated.title),
          content_markdown: await decryptWithDEK(dek, updated.content_markdown),
        };
        setNote(decrypted);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !confirm('Delete this note?')) return;
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) navigate('/');
  };

  if (loading || !note) return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;

  const showPlain =
    viewMode === 'plain' || viewMode === 'both' || (viewMode === 'formatted' && editing);
  const showFormatted = viewMode === 'formatted' || viewMode === 'both';

  const panelMinHeight = showPlain && showFormatted ? 'min-h-[40vh] md:min-h-[320px]' : 'min-h-[40vh] md:min-h-[320px]';

  const plainPanel = (
    <div className={`flex flex-col ${panelMinHeight}`}>
      <div className="text-xs text-gray-500 mb-1.5 font-medium dark:text-gray-400">
        {showFormatted ? 'Plain' : null}
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={save}
          className="w-full flex-1 min-h-[200px] md:min-h-[280px] p-3 sm:p-4 border border-gray-200 rounded font-mono text-sm resize-y dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Write markdown here..."
        />
      ) : (
        <pre className="flex-1 p-3 sm:p-4 border border-gray-200 rounded bg-white font-mono text-sm whitespace-pre-wrap overflow-auto min-h-[200px] md:min-h-[280px] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
          {content || ''}
        </pre>
      )}
    </div>
  );

  const formattedPanel = (
    <div className={`flex flex-col ${panelMinHeight}`}>
      <div className="text-xs text-gray-500 mb-1.5 font-medium dark:text-gray-400">
        {showPlain ? 'Formatted' : null}
      </div>
      <div className="flex-1 p-3 sm:p-4 border border-gray-200 rounded bg-white min-h-[200px] md:min-h-[280px] overflow-auto prose prose-sm max-w-none dark:bg-gray-800 dark:border-gray-600 dark:prose-invert prose-headings:dark:text-gray-100 prose-p:dark:text-gray-200 prose-code:dark:text-gray-200 prose-pre:dark:bg-gray-900 prose-pre:dark:text-gray-200 prose-a:dark:text-gray-300 prose-strong:dark:text-gray-100">
        <ReactMarkdown>{content || '*No content*'}</ReactMarkdown>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link
        to="/"
        className="md:hidden inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 -mt-1 touch-manipulation dark:text-gray-400 dark:hover:text-gray-100"
      >
        ← Notes
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          disabled={!editing}
          className="flex-1 min-w-0 text-base sm:text-lg font-medium border-0 border-b border-transparent focus:border-gray-300 focus:outline-none bg-transparent py-2 sm:py-1 dark:text-gray-100 dark:focus:border-gray-500 dark:border-gray-800"
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (editing ? save() : setEditing(true))}
            className="flex-1 sm:flex-none py-2.5 px-4 text-sm text-gray-600 hover:text-gray-900 rounded border border-gray-200 sm:border-0 touch-manipulation dark:text-gray-300 dark:hover:text-gray-100 dark:border-gray-600"
          >
            {editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
          </button>
          <button
            type="button"
            onClick={remove}
            className="py-2.5 px-4 text-sm text-red-600 hover:text-red-800 rounded border border-red-200 sm:border-0 touch-manipulation dark:text-red-400 dark:hover:text-red-300 dark:border-red-800"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex border border-gray-200 rounded-lg p-1 bg-gray-100 w-full sm:w-auto dark:border-gray-600 dark:bg-gray-800">
        {(['plain', 'formatted', 'both'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 text-xs sm:text-sm rounded-md capitalize touch-manipulation ${
              viewMode === mode
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div
        className={
          showPlain && showFormatted
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6'
            : ''
        }
      >
        {showPlain && plainPanel}
        {showFormatted && formattedPanel}
      </div>
    </div>
  );
}
