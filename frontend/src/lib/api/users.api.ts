import api from './client';

export const usersApi = {
  updateProfile: (data: { fullName?: string }) =>
    api.patch('/users/me', data).then((r) => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/me/password', data).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/me/avatar', form).then((r) => r.data);
  },
};
