import { create } from 'zustand';
import api from '../services/api';

export const useJdStore = create((set) => ({
  jds: [],
  currentJd: null,
  total: 0,
  isLoading: false,

  fetchJds: async (page = 1, filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ page, limit: 20, ...filters });
      const { data } = await api.get(`/jd?${params}`);
      set({ jds: data.jds, total: data.total, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchJd: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/jd/${id}`);
      set({ currentJd: data, isLoading: false });
      return data;
    } catch { set({ isLoading: false }); }
  },

  createJd: async (formData) => {
    const { data } = await api.post('/jd', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    set((s) => ({ jds: [data, ...s.jds] }));
    return data;
  },

  updateWeights: async (id, weights) => {
    const { data } = await api.put(`/jd/${id}/weights`, weights);
    set((s) => ({ currentJd: data, jds: s.jds.map((j) => (j.id === id ? data : j)) }));
    return data;
  },
}));
