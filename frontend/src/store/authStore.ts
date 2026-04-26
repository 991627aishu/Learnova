import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "student" | "instructor" | "admin";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatar?: string | null;
  avatarTimestamp?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("lms_token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("lms_token");
        set({ user: null, token: null });
      },
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }), // Add function to clear user data
    }),
    { 
      name: "lms-auth", 
      partialize: (s) => ({ token: s.token }), // Only persist token, not user data
      onRehydrateStorage: () => (state) => {
        // Clear user data on rehydrate to force fresh fetch
        if (state?.user) {
          state.user = null;
        }
      }
    }
  )
);
