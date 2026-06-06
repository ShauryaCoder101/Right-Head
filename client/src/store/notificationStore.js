import { create } from 'zustand';
import api from '../services/api';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/notifications?page=${page}`);
      set({ notifications: data.notifications, unreadCount: data.unreadCount, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  markRead: async (id) => {
    await api.put(`/notifications/${id}/read`);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.put('/notifications/read-all');
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
