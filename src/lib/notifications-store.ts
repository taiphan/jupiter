import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from './use-notifications';

/**
 * Read state for notifications. Feed comes from activity (offline) or
 * GET /api/notifications when workspace persistence is online.
 */
interface NotificationsState {
  readByUser: Record<string, string[]>;
  /** Server-backed feed when persistence API is active */
  apiFeedByUser: Record<string, Notification[]>;
  apiUnreadByUser: Record<string, number>;

  markRead: (userId: string, activityId: string) => void;
  markAllRead: (userId: string, activityIds: string[]) => void;
  isRead: (userId: string, activityId: string) => boolean;
  setApiFeed: (userId: string, notifications: Notification[], unreadCount: number) => void;
  clearApiFeed: (userId: string) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      readByUser: {},
      apiFeedByUser: {},
      apiUnreadByUser: {},

      markRead: (userId, activityId) =>
        set((s) => {
          const current = s.readByUser[userId] ?? [];
          if (current.includes(activityId)) return s;
          const apiFeed = s.apiFeedByUser[userId];
          const nextApiFeed = apiFeed?.map((n) =>
            n.id === activityId ? { ...n, read: true } : n,
          );
          const unreadCount = nextApiFeed?.filter((n) => !n.read).length ?? s.apiUnreadByUser[userId] ?? 0;
          return {
            readByUser: { ...s.readByUser, [userId]: [...current, activityId] },
            ...(nextApiFeed
              ? {
                  apiFeedByUser: { ...s.apiFeedByUser, [userId]: nextApiFeed },
                  apiUnreadByUser: { ...s.apiUnreadByUser, [userId]: unreadCount },
                }
              : {}),
          };
        }),

      markAllRead: (userId, activityIds) =>
        set((s) => {
          const current = new Set(s.readByUser[userId] ?? []);
          activityIds.forEach((id) => current.add(id));
          const apiFeed = s.apiFeedByUser[userId]?.map((n) => ({ ...n, read: true }));
          return {
            readByUser: { ...s.readByUser, [userId]: Array.from(current) },
            ...(apiFeed
              ? {
                  apiFeedByUser: { ...s.apiFeedByUser, [userId]: apiFeed },
                  apiUnreadByUser: { ...s.apiUnreadByUser, [userId]: 0 },
                }
              : {}),
          };
        }),

      isRead: (userId, activityId) =>
        (get().readByUser[userId] ?? []).includes(activityId),

      setApiFeed: (userId, notifications, unreadCount) =>
        set((s) => {
          const readSet = new Set(s.readByUser[userId] ?? []);
          const merged = notifications.map((n) => ({
            ...n,
            read: n.read || readSet.has(n.id),
          }));
          return {
            apiFeedByUser: { ...s.apiFeedByUser, [userId]: merged },
            apiUnreadByUser: {
              ...s.apiUnreadByUser,
              [userId]: merged.filter((n) => !n.read).length,
            },
          };
        }),

      clearApiFeed: (userId) =>
        set((s) => {
          const { [userId]: _a, ...apiFeedByUser } = s.apiFeedByUser;
          const { [userId]: _b, ...apiUnreadByUser } = s.apiUnreadByUser;
          return { apiFeedByUser, apiUnreadByUser };
        }),
    }),
    { name: 'jupiter-notifications' },
  ),
);
