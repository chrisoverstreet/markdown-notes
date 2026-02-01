import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Unlock from './pages/Unlock';
import NotesList from './pages/NotesList';
import NoteDetail from './pages/NoteDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, needsUnlock } = useAuth();
  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needsUnlock) return <Unlock />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<NotesList />} />
          <Route path="notes/:id" element={<NoteDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
