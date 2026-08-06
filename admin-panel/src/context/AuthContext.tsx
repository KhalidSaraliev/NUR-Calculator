import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { CurrentUser } from '../api/types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** true, пока идёт восстановление сессии из localStorage при первой загрузке */
  initializing: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<'ok' | 'forbidden' | 'not-found'>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nur_access_token');
    if (!token) {
      setInitializing(false);
      return;
    }
    fetchMe().finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMe() {
    const { data } = await api.get<CurrentUser>('/users/me');
    if (data.role !== 'OWNER' && data.role !== 'ADMIN') {
      logout();
      return;
    }
    setUser(data);
  }

  async function requestOtp(phone: string) {
    setLoading(true);
    try {
      await api.post('/auth/otp/request', { phone });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(phone: string, code: string) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { phone, code });
      if (data.isNewUser) return 'not-found';

      localStorage.setItem('nur_access_token', data.accessToken);
      localStorage.setItem('nur_refresh_token', data.refreshToken);

      const me = await api.get<CurrentUser>('/users/me');
      if (me.data.role !== 'OWNER' && me.data.role !== 'ADMIN') {
        localStorage.removeItem('nur_access_token');
        localStorage.removeItem('nur_refresh_token');
        return 'forbidden';
      }

      setUser(me.data);
      return 'ok';
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('nur_access_token');
    localStorage.removeItem('nur_refresh_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, initializing, requestOtp, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  return ctx;
}
