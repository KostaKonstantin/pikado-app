import api from './client';

export const matchesApi = {
  getOne: (id: string) => api.get(`/matches/${id}`).then((r) => r.data),

  updateScore: (id: string, player1Score: number, player2Score: number) =>
    api.patch(`/matches/${id}/score`, { player1Score, player2Score }).then((r) => r.data),

  complete: (id: string, winnerId: string) =>
    api.post(`/matches/${id}/complete`, { winnerId }).then((r) => r.data),

  reset: (id: string) => api.post(`/matches/${id}/reset`).then((r) => r.data),
};
