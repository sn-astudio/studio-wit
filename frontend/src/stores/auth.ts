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
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,

  verifyToken: async (idToken: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.verify({ id_token: idToken });
      setAccessToken(res.access_token);
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
    set({ token: null, user: null });
  },
}));
