import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'lead' | 'member' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  title: string;
}

export const DEMO_USERS: { username: string; password: string; user: User }[] = [
  {
    username: 'admin',
    password: 'admin123',
    user: {
      id: 'usr_admin',
      username: 'admin',
      name: 'Alex Pham',
      email: 'alex@acme.dev',
      role: 'admin',
      avatarColor: '#7c3aed',
      title: 'Workspace Admin',
    },
  },
  {
    username: 'lead',
    password: 'lead123',
    user: {
      id: 'usr_lead',
      username: 'lead',
      name: 'Maya Chen',
      email: 'maya@acme.dev',
      role: 'lead',
      avatarColor: '#0ea5e9',
      title: 'Engineering Lead',
    },
  },
  {
    username: 'member',
    password: 'member123',
    user: {
      id: 'usr_member',
      username: 'member',
      name: 'Jordan Reyes',
      email: 'jordan@acme.dev',
      role: 'member',
      avatarColor: '#10b981',
      title: 'Senior Engineer',
    },
  },
  {
    username: 'viewer',
    password: 'viewer123',
    user: {
      id: 'usr_viewer',
      username: 'viewer',
      name: 'Sam Brooks',
      email: 'sam@acme.dev',
      role: 'viewer',
      avatarColor: '#f59e0b',
      title: 'Stakeholder',
    },
  },
];

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (username, password) => {
        const match = DEMO_USERS.find(
          (u) => u.username === username && u.password === password,
        );
        if (!match) return { success: false, error: 'Invalid username or password' };
        set({ user: match.user, isAuthenticated: true });
        return { success: true };
      },

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'jupiter-auth' },
  ),
);
