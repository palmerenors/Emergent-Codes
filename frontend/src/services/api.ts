import axios from 'axios';
import { storage } from '../utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getSessionData: (sessionId: string) =>
    axios.get(`${API_URL}/api/auth/session-data`, {
      headers: { 'X-Session-ID': sessionId },
    }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
};

// Post API
export const postAPI = {
  create: (data: any) => api.post('/posts', data),
  getAll: (params?: { category?: string; limit?: number; skip?: number }) =>
    api.get('/posts', { params }),
  getById: (id: string) => api.get(`/posts/${id}`),
  like: (id: string) => api.post(`/posts/${id}/like`),
};

// Comment API
export const commentAPI = {
  create: (data: { post_id: string; content: string }) =>
    api.post('/comments', data),
  getByPost: (postId: string) => api.get(`/posts/${postId}/comments`),
};

// Forum API
export const forumAPI = {
  getAll: () => api.get('/forums'),
  getById: (id: string) => api.get(`/forums/${id}`),
};

// Support Group API
export const groupAPI = {
  getAll: () => api.get('/support-groups'),
  join: (id: string) => api.post(`/support-groups/${id}/join`),
};

// Milestone API
export const milestoneAPI = {
  create: (data: any) => api.post('/milestones', data),
  getAll: () => api.get('/milestones'),
  complete: (id: string, notes?: string) =>
    api.put(`/milestones/${id}/complete`, { notes }),
};

// Resource API
export const resourceAPI = {
  getAll: (params?: { category?: string }) => api.get('/resources', { params }),
};

// Premium API
export const premiumAPI = {
  subscribe: () => api.post('/premium/subscribe'),
  getStatus: () => api.get('/premium/status'),
};

// Notification API
export const notificationAPI = {
  registerToken: (data: { token: string; platform: string }) =>
    api.post('/notifications/register-token', data),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: any) => api.put('/notifications/preferences', data),
};

// Seed data
export const seedData = () => api.post('/seed-data');
