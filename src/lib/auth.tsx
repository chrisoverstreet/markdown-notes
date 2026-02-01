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

export interface User {
  id: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  dek: CryptoKey | null;
  needsUnlock: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const [kekSalt, setKekSalt] = useState<string | null>(null);
  const [encryptedDek, setEncryptedDek] = useState<string | null>(null);

  const needsUnlock = Boolean(user && kekSalt && encryptedDek && !dek);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
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
        setKekSalt(null);
        setEncryptedDek(null);
        setDek(null);
      }
    } catch {
      setUser(null);
      setKekSalt(null);
      setEncryptedDek(null);
      setDek(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
        kek_salt?: string | null;
        encrypted_dek?: string | null;
      };
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
        const setupRes = await fetch('/api/auth/setup-e2ee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        kek_salt?: string | null;
        encrypted_dek?: string | null;
      };
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
