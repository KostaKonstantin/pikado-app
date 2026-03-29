import api from './client';

export const invitesApi = {
  // Admin: club-scoped
  create: (clubId: string, email: string) =>
    api.post(`/clubs/${clubId}/invites`, { email }).then((r) => r.data),

  list: (clubId: string) =>
    api.get(`/clubs/${clubId}/invites`).then((r) => r.data),

  getMembers: (clubId: string) =>
    api.get(`/clubs/${clubId}/members`).then((r) => r.data),

  cancel: (clubId: string, inviteId: string) =>
    api.delete(`/clubs/${clubId}/invites/${inviteId}`).then((r) => r.data),

  resend: (clubId: string, inviteId: string) =>
    api.patch(`/clubs/${clubId}/invites/${inviteId}/resend`).then((r) => r.data),

  // Public: token-based
  getByToken: (token: string) =>
    api.get(`/invites/${token}`).then((r) => r.data),

  accept: (token: string, password?: string) =>
    api.post(`/invites/${token}/accept`, { password }).then((r) => r.data),
};
