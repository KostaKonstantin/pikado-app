import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  isOpen: boolean;       // mobile overlay open/close
  isCollapsed: boolean;  // desktop icon-only mode
  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleCollapse: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isOpen: false,
      isCollapsed: false,
      open:           () => set({ isOpen: true }),
      close:          () => set({ isOpen: false }),
      toggle:         () => set((s) => ({ isOpen: !s.isOpen })),
      toggleCollapse: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
    }),
    {
      name: 'pikado-sidebar',
      partialize: (s) => ({ isCollapsed: s.isCollapsed }), // only persist collapsed state
    },
  ),
);
