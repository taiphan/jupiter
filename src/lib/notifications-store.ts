import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Notifications are derived on the fly from the activity log (see useNotifications),
 * so this store only persists *read state* — a set of seen activity ids per user.
 */
interface NotificationsState {
  /** Map of userId → array of read activity ids */
  readByUser: Record<string, string[]>;
  markRead: (userId: string, activityId: string) => void;
  markAllRead: (userId: string, activityIds: string[]) => void;
  isRead: (userId: string, activityId: string) => boolean;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      readByUser: {},

      markRead: (userId, activityId) =>
        set((s) => {
          const current = s.readByUser[userId] ?? [];
          if (current.includes(activityId)) return s;
          return { readByUser: { ...s.readByUser, [userId]: [...current, activityId] } };
        }),

      markAllRead: (userId, activityIds) =>
        set((s) => {
          const current = new Set(s.readByUser[userId] ?? []);
          activityIds.forEach((id) => current.add(id));
          return { readByUser: { ...s.readByUser, [userId]: Array.from(current) } };
        }),

      isRead: (userId, activityId) =>
        (get().readByUser[userId] ?? []).includes(activityId),
    }),
    { name: 'jira-clone-notifications' },
  ),
);
