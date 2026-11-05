/** Who is signed in, available to every screen through useUser(). */
import { createContext, useContext } from 'react';
import type { User } from '@smartpod/shared';

export const UserContext = createContext<User | null>(null);
export const useUser = () => useContext(UserContext)!;
