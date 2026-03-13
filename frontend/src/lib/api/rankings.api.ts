import api from './client';

export const rankingsApi = {
  get: (clubId: string, seasonId?: string) =>
    api.get(`/clubs/${clubId}/rankings`, { params: { seasonId } }).then((r) => r.data),

  recalculate: (clubId: string) =>
    api.post(`/clubs/${clubId}/rankings/recalculate`).then((r) => r.data),
};
