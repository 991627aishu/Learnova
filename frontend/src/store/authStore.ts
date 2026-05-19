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
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
      clearUser: () => set({ user: null }),
      // Add function to fetch user data from token
      fetchUser: async () => {
        const token = get().token;
        if (!token) return;
        
        try {
          const response = await fetch("/api/auth/me", {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            set({ user: userData.user });
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      },
    }),
    { 
      name: "lms-auth", 
      partialize: (s) => ({ token: s.token }), // Only persist token, not user data
      onRehydrateStorage: () => (state) => {
        // Fetch user data when rehydrating with a token
        if (state?.token && !state?.user) {
          setTimeout(() => {
            state?.fetchUser?.();
          }, 0);
        }
      }
    }
  )
);
