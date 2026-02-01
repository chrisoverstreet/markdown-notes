import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemePreference } from '../lib/theme';

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const { preference, setPreference } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 px-4 dark:bg-gray-900">
      <div className="flex justify-end pt-4 shrink-0">
        <label htmlFor="theme-toggle-login" className="sr-only">
          Theme
        </label>
        <select
          id="theme-toggle-login"
          value={preference}
          onChange={(e) => setPreference(e.target.value as ThemePreference)}
          className="text-sm rounded border border-gray-200 bg-white py-1.5 pl-2 pr-7 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-gray-500"
          aria-label="Theme"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      <div className="flex-1 flex items-center justify-center -mt-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-medium text-gray-900 mb-6 text-center dark:text-gray-100">
            Markdown Notes
          </h1>
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
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-500 dark:focus:border-gray-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-500 dark:focus:border-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:opacity-50"
          >
            {isRegister ? 'Register' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isRegister ? 'Already have an account? Log in' : 'Create an account'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
