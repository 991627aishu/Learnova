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

interface UserState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      
      setUser: (user) => set({ user: user || null }),
      
      setToken: (token) => {
        if (token) {
          localStorage.setItem("lms_token", token);
        } else {
          localStorage.removeItem("lms_token");
        }
        set({ token });
      },
      
      clearAuth: () => {
        localStorage.removeItem("lms_token");
        set({ user: null, token: null });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => {
        localStorage.removeItem("lms_token");
        set({ user: null, token: null });
      },
      
      fetchUser: async () => {
        const { setLoading, setUser, setToken } = get();
        
        try {
          setLoading(true);
          
          const token = localStorage.getItem("lms_token");
          if (!token) {
            setUser(null);
            setToken(null);
            return;
          }
          
          const response = await fetch("/api/auth/me", {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              // Token is invalid, clear it
              setUser(null);
              setToken(null);
              return;
            }
            throw new Error("Failed to fetch user");
          }
          
          const data = await response.json();
          
          if (data.success && data.user) {
            setUser(data.user);
            setToken(token);
          } else {
            setUser(null);
            setToken(null);
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          setUser(null);
          setToken(null);
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: "lms-auth",
      partialize: (state) => ({ 
        // Only persist token, not user data to ensure fresh fetch
        token: state.token 
      }),
      onRehydrateStorage: () => (state) => {
        // Clear user data on rehydrate to force fresh fetch
        if (state?.user) {
          state.user = null;
        }
      }
    }
  )
);
