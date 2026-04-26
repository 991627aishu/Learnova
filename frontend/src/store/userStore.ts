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
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      
      setUser: (user) => set({ user: user || null }),
      
      clearUser: () => set({ user: null }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      fetchUser: async () => {
        const { setLoading, setUser } = get();
        
        try {
          setLoading(true);
          
          const token = localStorage.getItem("lms_token");
          if (!token) {
            setUser(null);
            return;
          }
          
          const response = await fetch("/api/auth/me", {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok) {
            throw new Error("Failed to fetch user");
          }
          
          const data = await response.json();
          
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: "user-store",
      partialize: (state) => ({ 
        // Only persist token, not user data to ensure fresh fetch
        user: null 
      }),
    }
  )
);
