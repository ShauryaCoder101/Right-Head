import api from './api';

export async function createJd(formData) {
  const { data } = await api.post('/jd', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listJds(page = 1, filters = {}) {
  const params = { page, limit: 12, ...filters };
  const { data } = await api.get('/jd', { params });
  return data;
}

export async function getJd(id) {
  const { data } = await api.get(`/jd/${id}`);
  return data;
}

export async function updateJd(id, payload) {
  const { data } = await api.put(`/jd/${id}`, payload);
  return data;
}

export async function updateWeights(id, weights) {
  const { data } = await api.patch(`/jd/${id}/weights`, { weights });
  return data;
}

export async function deleteJd(id) {
  const { data } = await api.delete(`/jd/${id}`);
  return data;
}
