import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'BARBER' | 'ADMIN';
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),

  login: (token, user) => set({ accessToken: token, user }),

  logout: () => set({ accessToken: null, user: null }),

  isAuthenticated: () => !!get().accessToken,
}));
