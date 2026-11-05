/** Who is signed in. Every screen can read it with useAuth(). */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '@smartpod/shared';
import { setToken } from './api';

interface AuthState {
  user: User | null;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const value: AuthState = {
    user,
    signIn: (token, u) => {
      setToken(token);
      setUserState(u);
    },
    signOut: () => {
      setToken(null);
      setUserState(null);
    },
    setUser: setUserState,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext)!;

/** Use inside signed-in screens: the user is always there. */
export const useUser = () => useAuth().user!;

/** First screen after sign-in for each role. */
export const homeFor = (role: string) => (role === 'patient' ? '/(patient)/today' : '/(care)/patients');
