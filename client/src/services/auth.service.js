import api from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.token) {
    localStorage.setItem('riq_token', data.token);
    localStorage.setItem('riq_user', JSON.stringify(data.user));
  }
  return data;
}

export async function register(email, password, name) {
  const { data } = await api.post('/auth/register', { email, password, name });
  if (data.token) {
    localStorage.setItem('riq_token', data.token);
    localStorage.setItem('riq_user', JSON.stringify(data.user));
  }
  return data;
}

export function logout() {
  localStorage.removeItem('riq_token');
  localStorage.removeItem('riq_user');
}

export async function refreshToken() {
  const { data } = await api.post('/auth/refresh');
  if (data.token) {
    localStorage.setItem('riq_token', data.token);
  }
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}
