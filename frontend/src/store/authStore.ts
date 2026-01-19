import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  bio?: string;
  pregnancy_stage?: string;
  due_date?: string;
  children_count: number;
  interests: string[];
  is_premium: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  login: (token: string, user: User) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync('auth_token', token);
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
    set({ token, isAuthenticated: !!token });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  login: async (token, user) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },
}));
