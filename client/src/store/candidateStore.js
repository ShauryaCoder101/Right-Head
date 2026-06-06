import { create } from 'zustand';
import api from '../services/api';

export const useCandidateStore = create((set) => ({
  candidates: [],
  currentCandidate: null,
  total: 0,
  isLoading: false,

  fetchCandidates: async (page = 1, filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ page, limit: 20, ...filters });
      const { data } = await api.get(`/candidates?${params}`);
      set({ candidates: data.candidates, total: data.total, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchCandidate: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/candidates/${id}`);
      set({ currentCandidate: data, isLoading: false });
      return data;
    } catch { set({ isLoading: false }); }
  },

  uploadResumes: async (files, jdId) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('resumes', f));
    if (jdId) formData.append('jdId', jdId);
    const { data } = await api.post('/candidates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getBatchStatus: async (batchId) => {
    const { data } = await api.get(`/candidates/batch/${batchId}`);
    return data;
  },
}));
