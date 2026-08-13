import { create } from "zustand";
import { User } from "@/types";
import { api, clearToken, getToken, setToken } from "@/lib/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  loginWithUsername: (username: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<string>;
  verifyOtp: (phone: string, otp: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  hydrate: async () => {
    const token = getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await api.get<User>("/auth/me");
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      clearToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  loginWithUsername: async (username: string) => {
    const res = await api.post("/auth/login", { username });
    setToken(res.data.access_token);
    set({ user: res.data.user, isAuthenticated: true });
  },

  requestOtp: async (phone: string) => {
    const res = await api.post("/auth/request-otp", { phone_number: phone });
    return res.data.mock_otp as string;
  },

  verifyOtp: async (phone: string, otp: string, displayName?: string) => {
    const res = await api.post("/auth/verify-otp", {
      phone_number: phone,
      otp,
      display_name: displayName,
    });
    setToken(res.data.access_token);
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearToken();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (patch: Partial<User>) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...patch } });
  },
}));
