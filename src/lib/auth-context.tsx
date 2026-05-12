'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

/** User shape returned by the FastAPI backend */
interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
}

/** Shape of the auth context value */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; bio?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  /** Convenience fetch that auto-attaches the Bearer token */
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

/** Auth state */
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

/** Auth actions */
type AuthAction =
  | { type: 'SET_AUTH'; user: User; token: string }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'UPDATE_USER'; user: Partial<User> };

const TOKEN_KEY = 'learnhub_token';

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTH':
      return { user: action.user, token: action.token, isLoading: false };
    case 'CLEAR_AUTH':
      localStorage.removeItem(TOKEN_KEY);
      return { user: null, token: null, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.user } : state.user };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isLoading: true,
  });

  const tokenRef = useRef<string | null>(null);

  /** Keep the ref in sync with state */
  useEffect(() => {
    tokenRef.current = state.token;
  }, [state.token]);

  /** Login with email & password */
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.error || 'Login failed');
    }

    const { token: newToken, user: newUser } = data;
    localStorage.setItem(TOKEN_KEY, newToken);
    dispatch({ type: 'SET_AUTH', user: newUser, token: newToken });
  }, []);

  /** Register a new account and auto-login */
  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await apiFetch('/api/auth/register', null, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.error || 'Registration failed');
    }

    const { token: newToken, user: newUser } = data;
    localStorage.setItem(TOKEN_KEY, newToken);
    dispatch({ type: 'SET_AUTH', user: newUser, token: newToken });
  }, []);

  /** Logout: notify backend, then clear local state */
  const logout = useCallback(() => {
    // Best-effort backend call
    if (tokenRef.current) {
      apiFetch('/api/auth/logout', tokenRef.current, { method: 'POST' }).catch(() => {});
    }
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  /** Update profile (name, bio) */
  const updateProfile = useCallback(async (data: { name?: string; bio?: string }) => {
    if (!tokenRef.current) throw new Error('Not authenticated');

    const res = await apiFetch('/api/user/profile', tokenRef.current, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    const responseData = await res.json();

    if (!res.ok) {
      throw new Error(responseData.detail || responseData.error || 'Failed to update profile');
    }

    dispatch({ type: 'UPDATE_USER', user: responseData });
  }, []);

  /** Upload a new avatar image */
  const uploadAvatar = useCallback(async (file: File) => {
    if (!tokenRef.current) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('avatar', file);

    const res = await apiFetch('/api/user/avatar', tokenRef.current, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.error || 'Failed to upload avatar');
    }

    dispatch({ type: 'UPDATE_USER', user: { avatar: data.avatar || data.avatarUrl } });
  }, []);

  /** Convenience fetch wrapper that auto-attaches the token */
  const authedFetch = useCallback((path: string, options: RequestInit = {}) => {
    return apiFetch(path, tokenRef.current, options);
  }, []);

  /** On mount, check localStorage for an existing token and validate it */
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      return;
    }

    let cancelled = false;

    async function validateToken() {
      try {
        const res = await apiFetch('/api/auth/me', savedToken);
        if (!res.ok) {
          if (!cancelled) dispatch({ type: 'CLEAR_AUTH' });
          return;
        }
        const userData = await res.json();
        if (!cancelled) {
          dispatch({ type: 'SET_AUTH', user: userData, token: savedToken });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'CLEAR_AUTH' });
      }
    }

    validateToken();

    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isLoading: state.isLoading,
        login,
        register,
        logout,
        updateProfile,
        uploadAvatar,
        apiFetch: authedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access the auth context */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
