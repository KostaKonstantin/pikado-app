import api from './client';

export const seasonsApi = {
  getAll: (clubId: string) =>
    api.get(`/clubs/${clubId}/seasons`).then((r) => r.data),

  create: (clubId: string, data: any) =>
    api.post(`/clubs/${clubId}/seasons`, data).then((r) => r.data),

  activate: (clubId: string, id: string) =>
    api.post(`/clubs/${clubId}/seasons/${id}/activate`).then((r) => r.data),
};
