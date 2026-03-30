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

  // §8: неоправдан недолазак — walkoverId is the ABSENT player who forfeits
  recordWalkover: (clubId: string, leagueId: string, matchId: string, walkoverId: string) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/matches/${matchId}/walkover`, { walkoverId }).then((r) => r.data),

  // Dynamic schedule stats — all values derived from N players + format, never hardcoded
  getStats: (clubId: string, leagueId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/stats`).then((r) => r.data),

  getSubstitutions: (clubId: string, leagueId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/substitutions`).then((r) => r.data),

  // ─── Sessions ─────────────────────────────────────────────────────────────

  getSessions: (clubId: string, leagueId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/sessions`).then((r) => r.data),

  getSession: (clubId: string, leagueId: string, sessionId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/sessions/${sessionId}`).then((r) => r.data),

  getPoolInfo: (clubId: string, leagueId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/sessions/pool`).then((r) => r.data),

  previewSession: (clubId: string, leagueId: string, data: { presentPlayerIds: string[]; maxMatchesPerPlayer?: number }) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/sessions/preview`, data).then((r) => r.data),

  createSession: (clubId: string, leagueId: string, data: { presentPlayerIds: string[]; maxMatchesPerPlayer?: number; sessionDate?: string | null }) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/sessions`, data).then((r) => r.data),

  closeSession: (clubId: string, leagueId: string, sessionId: string) =>
    api.patch(`/clubs/${clubId}/leagues/${leagueId}/sessions/${sessionId}/close`, {}).then((r) => r.data),

  deleteSession: (clubId: string, leagueId: string, sessionId: string) =>
    api.delete(`/clubs/${clubId}/leagues/${leagueId}/sessions/${sessionId}`).then((r) => r.data),

  checkManualMatch: (clubId: string, leagueId: string, sessionId: string, homePlayerId: string, awayPlayerId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/sessions/${sessionId}/match-check`, {
      params: { homePlayerId, awayPlayerId },
    }).then((r) => r.data),

  addManualMatch: (clubId: string, leagueId: string, sessionId: string, homePlayerId: string, awayPlayerId: string) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/sessions/${sessionId}/matches`, {
      homePlayerId, awayPlayerId,
    }).then((r) => r.data),

  // ─── EvroLiga phases ───────────────────────────────────────────────────────

  initPhases: (clubId: string, leagueId: string) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/euroleague/init`).then((r) => r.data),

  getPhases: (clubId: string, leagueId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/phases`).then((r) => r.data),

  getPhaseFixtures: (clubId: string, leagueId: string, phaseId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/phases/${phaseId}/fixtures`).then((r) => r.data),

  getPhaseStandings: (clubId: string, leagueId: string, phaseId: string) =>
    api.get(`/clubs/${clubId}/leagues/${leagueId}/phases/${phaseId}/standings`).then((r) => r.data),

  updatePhaseMatch: (clubId: string, leagueId: string, phaseId: string, matchId: string, homeSets: number, awaySets: number) =>
    api.patch(`/clubs/${clubId}/leagues/${leagueId}/phases/${phaseId}/matches/${matchId}`, { homeSets, awaySets }).then((r) => r.data),

  advancePhase: (clubId: string, leagueId: string) =>
    api.post(`/clubs/${clubId}/leagues/${leagueId}/phases/advance`).then((r) => r.data),
};
