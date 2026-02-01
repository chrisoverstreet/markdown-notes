import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../lib/auth';
import { encryptWithDEK, decryptWithDEK } from '../lib/e2ee';

export type MarkdownViewMode = 'plain' | 'formatted' | 'both';

const STORAGE_KEY_VIEW_MODE = 'markdown-notes-view-mode';

function getStoredViewMode(): MarkdownViewMode {
  if (typeof window === 'undefined') return 'both';
  const raw = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
  if (raw === 'plain' || raw === 'formatted' || raw === 'both') return raw;
  return 'both';
}

export interface Note {
  id: string;
  title: string;
  content_markdown: string;
  created_at: string;
  updated_at: string;
}

function formatLastSaved(updatedAt: string): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24 && date.getDate() === now.getDate()) return `${diffHr} hr ago`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const savedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.floor((today.getTime() - savedDay.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 0) return `today at ${timeStr}`;
  if (dayDiff === 1) return `yesterday at ${timeStr}`;
  if (date.getFullYear() === now.getFullYear()) return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
}

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dek, authFetch } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(true);
  const [viewMode, setViewMode] = useState<MarkdownViewMode>(getStoredViewMode);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleContentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || !e.shiftKey) return;
      const textarea = e.currentTarget;
      const value = content;
      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEndIdx = value.indexOf('\n', start);
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

      if (e.metaKey) {
        // Cmd+Shift+Enter: new line before current, cursor there
        e.preventDefault();
        const before = value.slice(0, lineStart);
        const after = value.slice(lineStart);
        const newContent = before + '\n' + after;
        const newCursor = before.length + 1;
        setContent(newContent);
        setTimeout(() => {
          contentTextareaRef.current?.focus();
          contentTextareaRef.current?.setSelectionRange(newCursor, newCursor);
        }, 0);
      } else {
        // Shift+Enter: new line below current, cursor there
        e.preventDefault();
        const before = value.slice(0, lineEnd);
        const after = value.slice(lineEnd);
        const newContent = before + '\n' + after;
        const newCursor = before.length + 1;
        setContent(newContent);
        setTimeout(() => {
          contentTextareaRef.current?.focus();
          contentTextareaRef.current?.setSelectionRange(newCursor, newCursor);
        }, 0);
      }
    },
    [content]
  );

  useEffect(() => {
    if (!id || !dek) return;
    authFetch(`/api/notes/${id}`)
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
  }, [id, dek, navigate, authFetch]);

  const save = useCallback(
    async (exitEditing = false) => {
      if (!id || !dek) return;
      setSaving(true);
      try {
        const encryptedTitle = await encryptWithDEK(dek, title);
        const encryptedContent = await encryptWithDEK(dek, content);
        const res = await authFetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
          if (exitEditing) setEditing(false);
        }
      } finally {
        setSaving(false);
      }
    },
    [id, dek, title, content, authFetch]
  );

  // Auto-save: debounced save when title or content change (stay in editing mode)
  const autoSaveDelayMs = 15000;
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editing || !note || !id || !dek) return;
    const hasChanges =
      title !== note.title || content !== note.content_markdown;
    if (!hasChanges) return;

    autoSaveTimeoutRef.current = setTimeout(() => {
      save(false);
    }, autoSaveDelayMs);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [editing, note, id, dek, title, content, save]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
  }, [viewMode]);

  const remove = async () => {
    if (!id || !confirm('Delete this note?')) return;
    const res = await authFetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) navigate('/');
  };

  if (loading || !note) return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;

  const hasChanges =
    note !== null &&
    (title !== note.title || content !== note.content_markdown);

  const showPlain = viewMode === 'plain' || viewMode === 'both';
  const showFormatted = viewMode === 'formatted' || viewMode === 'both';

  const panelMinHeight = showPlain && showFormatted ? 'min-h-[40vh] md:min-h-[320px]' : 'min-h-[40vh] md:min-h-[320px]';

  const plainPanel = (
    <div className={`flex flex-col ${panelMinHeight}`}>
      <div className="text-xs text-gray-500 mb-1.5 font-medium dark:text-gray-400">
        {showFormatted ? 'Plain' : null}
      </div>
      {editing ? (
        <textarea
          ref={contentTextareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleContentKeyDown}
          onBlur={() => save(true)}
          className="w-full flex-1 min-h-[200px] md:min-h-[280px] p-3 sm:p-4 border border-gray-200 rounded font-mono text-sm resize-y dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Write markdown here..."
        />
      ) : (
        <pre
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setEditing(true))}
          className="flex-1 p-3 sm:p-4 border border-gray-200 rounded bg-white font-mono text-sm whitespace-pre-wrap overflow-auto min-h-[200px] md:min-h-[280px] cursor-text dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        >
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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto">
                <table className="w-full min-w-full border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100 dark:bg-gray-700/60">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children, align, ...props }) => (
              <th
                align={align}
                className="border border-gray-200 px-3 py-2 text-sm font-semibold dark:border-gray-600 dark:text-gray-100"
                {...props}
              >
                {children}
              </th>
            ),
            td: ({ children, align, ...props }) => (
              <td
                align={align}
                className="border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
                {...props}
              >
                {children}
              </td>
            ),
          }}
        >
          {content || '*No content*'}
        </ReactMarkdown>
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
        <div
          className={`flex-1 min-w-0 ${!editing ? 'cursor-text' : ''}`}
          onClick={() => !editing && setEditing(true)}
          role="button"
          tabIndex={!editing ? 0 : undefined}
          onKeyDown={(e) => !editing && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setEditing(true))}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save(true)}
            disabled={!editing}
            className="w-full text-base sm:text-lg font-medium border-0 border-b border-transparent focus:border-gray-300 focus:outline-none bg-transparent py-2 sm:py-1 dark:text-gray-100 dark:focus:border-gray-500 dark:border-gray-800"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (editing ? save(true) : setEditing(true))}
            disabled={editing && (!hasChanges || saving)}
            className="flex-1 sm:flex-none py-2.5 px-4 text-sm text-gray-600 hover:text-gray-900 rounded border border-gray-200 sm:border-0 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:text-gray-100 dark:border-gray-600"
          >
            {editing ? 'Save' : 'Edit'}
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
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
        Last saved {formatLastSaved(note.updated_at)}
      </p>

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
