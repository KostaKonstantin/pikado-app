import api from './client';

export const playersApi = {
  getAll: (clubId: string, search?: string) =>
    api.get(`/clubs/${clubId}/players`, { params: { search } }).then((r) => r.data),

  getOne: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/players/${id}`).then((r) => r.data),

  create: (clubId: string, data: any) =>
    api.post(`/clubs/${clubId}/players`, data).then((r) => r.data),

  update: (clubId: string, id: string, data: any) =>
    api.patch(`/clubs/${clubId}/players/${id}`, data).then((r) => r.data),

  remove: (clubId: string, id: string) =>
    api.delete(`/clubs/${clubId}/players/${id}`).then((r) => r.data),

  getStats: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/players/${id}/stats`).then((r) => r.data),

  getHistory: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/players/${id}/history`).then((r) => r.data),
};
