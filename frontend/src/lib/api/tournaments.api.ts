import api from './client';

export const tournamentsApi = {
  getAll: (clubId: string, seasonId?: string) =>
    api.get(`/clubs/${clubId}/tournaments`, { params: { seasonId } }).then((r) => r.data),

  getOne: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/tournaments/${id}`).then((r) => r.data),

  create: (clubId: string, data: any) =>
    api.post(`/clubs/${clubId}/tournaments`, data).then((r) => r.data),

  update: (clubId: string, id: string, data: any) =>
    api.patch(`/clubs/${clubId}/tournaments/${id}`, data).then((r) => r.data),

  remove: (clubId: string, id: string) =>
    api.delete(`/clubs/${clubId}/tournaments/${id}`).then((r) => r.data),

  addPlayer: (clubId: string, id: string, playerId: string) =>
    api.post(`/clubs/${clubId}/tournaments/${id}/players`, { playerId }).then((r) => r.data),

  removePlayer: (clubId: string, id: string, playerId: string) =>
    api.delete(`/clubs/${clubId}/tournaments/${id}/players/${playerId}`).then((r) => r.data),

  getPlayers: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/tournaments/${id}/players`).then((r) => r.data),

  updateSeeds: (clubId: string, id: string, seeds: any[]) =>
    api.patch(`/clubs/${clubId}/tournaments/${id}/players/seed`, { seeds }).then((r) => r.data),

  generate: (clubId: string, id: string) =>
    api.post(`/clubs/${clubId}/tournaments/${id}/generate`).then((r) => r.data),

  start: (clubId: string, id: string) =>
    api.post(`/clubs/${clubId}/tournaments/${id}/start`).then((r) => r.data),

  getBracket: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/tournaments/${id}/bracket`).then((r) => r.data),
};
