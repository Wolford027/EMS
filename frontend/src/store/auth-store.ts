import { create } from "zustand";

export type UserRole = "owner" | "manager" | "employee";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));