import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isNoteDetail = location.pathname.startsWith('/notes/');

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="border-b border-gray-200 bg-white shrink-0 pt-[env(safe-area-inset-top)] dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex items-center justify-between gap-3 py-3 sm:py-4">
          <Link
            to="/"
            className="text-base sm:text-lg font-medium text-gray-900 truncate min-w-0 dark:text-gray-100"
          >
            Markdown Notes
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <ThemeToggle />
            <span className="text-sm text-gray-500 truncate max-w-[120px] sm:max-w-none dark:text-gray-400">
              {user?.username}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-gray-600 hover:text-gray-900 py-2 px-2 sm:px-3 -my-2 -mx-2 sm:mx-0 rounded touch-manipulation dark:text-gray-300 dark:hover:text-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 ${
          isNoteDetail ? 'max-w-6xl' : 'max-w-3xl'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
