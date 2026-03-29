'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  city?: string;
  country?: string;
  logoUrl?: string;
}

interface AuthState {
  user: User | null;
  club: Club | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, club: Club | null, token: string, role: string) => void;
  setClub: (club: Club) => void;
  updateUser: (data: Partial<User>) => void;
  updateClub: (data: Partial<Club>) => void;
  logout: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      club: null,
      token: null,
      role: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),
      setAuth: (user, club, token, role) => {
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
        set({ user, club, token, role, isAuthenticated: true });
      },
      setClub: (club) => set({ club }),
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      updateClub: (data) =>
        set((state) => ({ club: state.club ? { ...state.club, ...data } : null })),
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        set({ user: null, club: null, token: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: 'pikado-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
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
