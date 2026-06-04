export type UserRole = 'admin' | 'lead' | 'member' | 'viewer';

export interface DemoUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  title: string;
}

/** Shared demo accounts for client login and Postgres seed. */
export const DEMO_ACCOUNTS: { username: string; password: string; user: DemoUser }[] = [
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
