import { useState } from 'react';
import { useAuth } from '../lib/auth';

export default function Unlock() {
  const { user, unlock } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await unlock(password);
    } catch {
      setError('Wrong password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-medium text-gray-900 mb-1 text-center dark:text-gray-100">
          Unlock notes
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center dark:text-gray-400">
          Signed in as {user?.username}. Enter your password to decrypt your notes.
        </p>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
        >
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded dark:text-red-400 dark:bg-red-900/30">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="unlock-password"
              className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="unlock-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-500 dark:focus:border-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
