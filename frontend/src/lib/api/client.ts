import axios from 'axios';
import { useLoadingStore } from '@/store/loading.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token + handle multipart uploads + track global loading
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  // For FormData, remove the default Content-Type so the browser can set
  // multipart/form-data with the correct boundary automatically.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  useLoadingStore.getState().start();
  return config;
});

// Handle 401 → redirect to login + always stop global loading
api.interceptors.response.use(
  (res) => {
    useLoadingStore.getState().stop();
    return res;
  },
  (err) => {
    useLoadingStore.getState().stop();
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
