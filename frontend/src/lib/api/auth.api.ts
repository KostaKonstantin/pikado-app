import api from './client';

export const authApi = {
  register: (data: { email: string; password: string; fullName?: string; clubName: string; clubCity?: string; clubCountry?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  getMe: () => api.get('/auth/me').then((r) => r.data),
};
