'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName?: string;
}

interface Club {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  club: Club | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, club: Club | null, token: string, role: string) => void;
  setClub: (club: Club) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      club: null,
      token: null,
      role: null,
      isAuthenticated: false,
      setAuth: (user, club, token, role) => {
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
        set({ user, club, token, role, isAuthenticated: true });
      },
      setClub: (club) => set({ club }),
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        set({ user: null, club: null, token: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: 'pikado-auth',
      partialize: (state) => ({
        user: state.user,
        club: state.club,
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
