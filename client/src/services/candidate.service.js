import api from './api';

export async function uploadResumes(files, jdId) {
  const formData = new FormData();
  files.forEach((file) => formData.append('resumes', file));
  if (jdId) formData.append('jdId', jdId);
  const { data } = await api.post('/candidates/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listCandidates(page = 1, filters = {}) {
  const params = { page, limit: 20, ...filters };
  const { data } = await api.get('/candidates', { params });
  return data;
}

export async function getCandidate(id) {
  const { data } = await api.get(`/candidates/${id}`);
  return data;
}

export async function updateCandidate(id, payload) {
  const { data } = await api.put(`/candidates/${id}`, payload);
  return data;
}

export async function deleteCandidate(id) {
  const { data } = await api.delete(`/candidates/${id}`);
  return data;
}
