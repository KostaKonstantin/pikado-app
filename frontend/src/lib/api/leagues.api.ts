import api from './client';

export const leaguesApi = {
  getAll: (clubId: string, seasonId?: string) =>
    api.get(`/clubs/${clubId}/leagues`, { params: { seasonId } }).then((r) => r.data),

  getOne: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/leagues/${id}`).then((r) => r.data),

  create: (clubId: string, data: any) =>
    api.post(`/clubs/${clubId}/leagues`, data).then((r) => r.data),

  update: (clubId: string, id: string, data: any) =>
    api.patch(`/clubs/${clubId}/leagues/${id}`, data).then((r) => r.data),

  remove: (clubId: string, id: string) =>
    api.delete(`/clubs/${clubId}/leagues/${id}`).then((r) => r.data),

  addPlayer: (clubId: string, id: string, playerId: string) =>
    api.post(`/clubs/${clubId}/leagues/${id}/players`, { playerId }).then((r) => r.data),

  removePlayer: (clubId: string, id: string, playerId: string) =>
    api.delete(`/clubs/${clubId}/leagues/${id}/players/${playerId}`).then((r) => r.data),

  getPlayers: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/leagues/${id}/players`).then((r) => r.data),

  generateFixtures: (clubId: string, id: string) =>
    api.post(`/clubs/${clubId}/leagues/${id}/generate`).then((r) => r.data),

  getFixtures: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/leagues/${id}/fixtures`).then((r) => r.data),

  getStandings: (clubId: string, id: string) =>
    api.get(`/clubs/${clubId}/leagues/${id}/standings`).then((r) => r.data),

  updateMatch: (clubId: string, leagueId: string, matchId: string, homeSets: number, awaySets: number) =>
    api.patch(`/clubs/${clubId}/leagues/${leagueId}/matches/${matchId}`, { homeSets, awaySets }).then((r) => r.data),

  postponeMatch: (clubId: string, leagueId: string, matchId: string, data: { scheduledDate?: string | null; isPostponed?: boolean }) =>
    api.patch(`/clubs/${clubId}/leagues/${leagueId}/matches/${matchId}/postpone`, data).then((r) => r.data),

  previewSubstitutions: (clubId: string, leagueId: string, eveningNum: number, substitutions: { absentId: string; substituteId: string }[]) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/evenings/${eveningNum}/preview-substitutions`, { substitutions }).then((r) => r.data),

  applySubstitutions: (clubId: string, leagueId: string, eveningNum: number, substitutions: { absentId: string; substituteId: string }[]) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/evenings/${eveningNum}/apply-substitutions`, { substitutions }).then((r) => r.data),
};
