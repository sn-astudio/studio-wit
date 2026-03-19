/**
 * 인증 상태 관리 (Zustand)
 * - NextAuth 세션의 ID Token → 백엔드 JWT 발급
 * - JWT 자동 관리
 */

import { create } from "zustand";

import type { UserInfo } from "@/types/api";
import { authApi, setAccessToken } from "@/services/api";

interface AuthState {
  /** 백엔드 JWT */
  token: string | null;
  /** 백엔드 유저 정보 */
  user: UserInfo | null;
  /** 인증 진행 중 */
  isLoading: boolean;

  /** Google ID Token으로 백엔드 JWT 발급 */
  verifyToken: (idToken: string) => Promise<void>;
  /** 로그아웃 (JWT 초기화) */
  clearAuth: () => void;
  /** localStorage에서 토큰 복원 */
  restoreToken: () => void;
}

const STORAGE_KEY = "wit_auth";

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,

  verifyToken: async (idToken: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.verify({ id_token: idToken });
      setAccessToken(res.access_token);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token: res.access_token, user: res.user }),
      );
      set({
        token: res.access_token,
        user: res.user,
        isLoading: false,
      });
    } catch {
      set({ token: null, user: null, isLoading: false });
    }
  },

  clearAuth: () => {
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },

  restoreToken: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { token, user } = JSON.parse(raw);
      if (token) {
        setAccessToken(token);
        set({ token, user });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));
