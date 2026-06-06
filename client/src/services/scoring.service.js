import api from './api';

export async function runScoring(jdId, candidateIds = []) {
  const { data } = await api.post('/scoring/run', { jdId, candidateIds });
  return data;
}

export async function getResults(jdId, page = 1, sort = 'score', filters = {}) {
  const params = { page, limit: 20, sort, ...filters };
  const { data } = await api.get(`/scoring/results/${jdId}`, { params });
  return data;
}

export async function rescreen(jdId, filters = {}) {
  const { data } = await api.post(`/scoring/rescreen/${jdId}`, filters);
  return data;
}

export async function rerank(jdId, weights) {
  const { data } = await api.post(`/scoring/rerank/${jdId}`, { weights });
  return data;
}

export async function getScoringStatus(jdId) {
  const { data } = await api.get(`/scoring/status/${jdId}`);
  return data;
}
