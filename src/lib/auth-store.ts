import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEMO_ACCOUNTS } from './demo-users';
import type { UserRole } from './demo-users';
import {
  fetchSessionUser,
  loginViaApi,
  logoutViaApi,
} from './auth-api';

export type { UserRole };

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  title: string;
  emailVerified?: boolean;
}

/** @deprecated Use DEMO_ACCOUNTS — kept for existing imports. */
export const DEMO_USERS = DEMO_ACCOUNTS;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function loginLocally(email: string, password: string): { success: boolean; error?: string } {
  const match = DEMO_ACCOUNTS.find(
    (u) => normalizeEmail(u.user.email) === normalizeEmail(email) && u.password === password,
  );
  if (!match) return { success: false, error: 'Invalid email or password' };
  return { success: true };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hydrateSession: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; requires2fa?: boolean }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),

      hydrateSession: async () => {
        const sessionUser = await fetchSessionUser();
        if (sessionUser === undefined) return;
        if (sessionUser) {
          set({ user: sessionUser, isAuthenticated: true });
          return;
        }
        if (get().isAuthenticated) {
          set({ user: null, isAuthenticated: false });
        }
      },

      login: async (email, password) => {
        const api = await loginViaApi(email, password);
        if (api.ok && 'requires2fa' in api && api.requires2fa) {
          return { success: true, requires2fa: true };
        }
        if (api.ok && 'user' in api) {
          set({ user: api.user, isAuthenticated: true });
          return { success: true };
        }
        if (!('unavailable' in api) && !api.ok) {
          return { success: false, error: api.error };
        }

        const local = loginLocally(email, password);
        if (!local.success) return local;
        const match = DEMO_ACCOUNTS.find(
          (u) => normalizeEmail(u.user.email) === normalizeEmail(email),
        )!;
        set({
          user: { ...match.user, emailVerified: true },
          isAuthenticated: true,
        });
        return { success: true };
      },

      logout: async () => {
        await logoutViaApi();
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: 'jupiter-auth' },
  ),
);
