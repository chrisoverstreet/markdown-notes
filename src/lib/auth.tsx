import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  generateSalt,
  generateDEK,
  wrapDEK,
  unwrapDEK,
} from './e2ee';

const AUTH_TOKEN_KEY = 'markdown-notes-token';

export interface User {
  id: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  dek: CryptoKey | null;
  needsUnlock: boolean;
  getAuthHeaders: () => Record<string, string>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const [kekSalt, setKekSalt] = useState<string | null>(null);
  const [encryptedDek, setEncryptedDek] = useState<string | null>(null);

  const needsUnlock = Boolean(user && kekSalt && encryptedDek && !dek);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const t = token ?? localStorage.getItem(AUTH_TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [token]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as User & {
          kek_salt?: string | null;
          encrypted_dek?: string | null;
        };
        setUser({ id: data.id, username: data.username });
        setKekSalt(data.kek_salt ?? null);
        setEncryptedDek(data.encrypted_dek ?? null);
        setDek(null);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setKekSalt(null);
        setEncryptedDek(null);
        setDek(null);
      }
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setKekSalt(null);
      setEncryptedDek(null);
      setDek(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Login failed');
      }
      const data = (await res.json()) as User & {
        token?: string;
        kek_salt?: string | null;
        encrypted_dek?: string | null;
      };
      if (data.token) {
        setToken(data.token);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      setUser({ id: data.id, username: data.username });
      setKekSalt(data.kek_salt ?? null);
      setEncryptedDek(data.encrypted_dek ?? null);
      if (data.kek_salt && data.encrypted_dek) {
        const key = await unwrapDEK(data.encrypted_dek, password, data.kek_salt);
        setDek(key);
      } else {
        const salt = await generateSalt();
        const newDek = await generateDEK();
        const wrapped = await wrapDEK(newDek, password, salt);
        const authHeader = data.token ? { Authorization: `Bearer ${data.token}` } : {};
        const setupRes = await fetch('/api/auth/setup-e2ee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          credentials: 'include',
          body: JSON.stringify({ kek_salt: salt, encrypted_dek: wrapped }),
        });
        if (!setupRes.ok) throw new Error('E2EE setup failed');
        setKekSalt(salt);
        setEncryptedDek(wrapped);
        setDek(newDek);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setDek(null);
    setKekSalt(null);
    setEncryptedDek(null);
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      const salt = await generateSalt();
      const newDek = await generateDEK();
      const wrapped = await wrapDEK(newDek, password, salt);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          kek_salt: salt,
          encrypted_dek: wrapped,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Registration failed');
      }
      const data = (await res.json()) as User & {
        token?: string;
        kek_salt?: string | null;
        encrypted_dek?: string | null;
      };
      if (data.token) {
        setToken(data.token);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      setUser({ id: data.id, username: data.username });
      setKekSalt(data.kek_salt ?? null);
      setEncryptedDek(data.encrypted_dek ?? null);
      setDek(newDek);
    },
    []
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!kekSalt || !encryptedDek) throw new Error('Nothing to unlock');
      const key = await unwrapDEK(encryptedDek, password, kekSalt);
      setDek(key);
    },
    [kekSalt, encryptedDek]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dek,
        needsUnlock,
        getAuthHeaders,
        login,
        logout,
        register,
        unlock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
