import { create } from 'zustand';
import api from '../services/api';

/**
 * Extract a human-readable error message from an API error response.
 * The server returns errors in two shapes:
 *   - Simple: { error: "string" }
 *   - Structured: { success: false, error: { code, message, details } }
 */
function extractErrorMessage(err) {
  const data = err.response?.data;
  if (!data) return err.message || 'Something went wrong';

  // Structured error: { error: { message, details } }
  if (data.error && typeof data.error === 'object') {
    if (data.error.details?.length) {
      return data.error.details.map(d => d.message || d.field).join(', ');
    }
    return data.error.message || 'Request failed';
  }

  // Simple error: { error: "string" }
  if (typeof data.error === 'string') return data.error;

  return 'Something went wrong';
}

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('riq_user') || 'null'),
  token: localStorage.getItem('riq_token') || null,
  isAuthenticated: !!localStorage.getItem('riq_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('riq_token', data.token);
      localStorage.setItem('riq_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      localStorage.setItem('riq_token', data.token);
      localStorage.setItem('riq_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      const msg = extractErrorMessage(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('riq_token');
    localStorage.removeItem('riq_user');
    set({ user: null, token: null, isAuthenticated: false });
    api.post('/auth/logout').catch(() => {});
  },

  clearError: () => set({ error: null }),
}));
