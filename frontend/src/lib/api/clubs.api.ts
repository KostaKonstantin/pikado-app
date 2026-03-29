import api from './client';

export const clubsApi = {
  update: (clubId: string, data: Partial<{ name: string; slug: string; city: string; country: string }>) =>
    api.patch(`/clubs/${clubId}`, data).then((r) => r.data),

  uploadLogo: (clubId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/clubs/${clubId}/logo`, form).then((r) => r.data);
  },
};
