import { create } from "zustand";

type AuthState = {
  user: any;
  setUser: (user: any) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));