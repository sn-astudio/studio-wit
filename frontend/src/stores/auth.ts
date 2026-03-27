/**
 * 인증 상태 관리 (Zustand)
 * - NextAuth 세션의 ID Token → 백엔드 JWT 발급
 * - JWT 자동 관리
 */

import { create } from "zustand";
import { toast } from "sonner";

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

// 토큰 이벤트 구독
if (typeof window !== "undefined") {
  // 401 갱신 실패 → 자동 로그아웃
  window.addEventListener("auth:expired", () => {
    useAuthStore.getState().clearAuth();
    toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
  });

  // 401 자동 갱신 성공 → 스토어 동기화
  window.addEventListener("auth:refreshed", ((e: CustomEvent) => {
    const { token, user } = e.detail;
    if (token) {
      setAccessToken(token);
      useAuthStore.setState({ token, user });
    }
  }) as EventListener);

  // ── 다중 탭 동기화 (storage 이벤트) ──
  // 다른 탭에서 localStorage가 변경되면 이 탭에서도 동기화
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;

    if (e.newValue === null) {
      // 다른 탭에서 로그아웃 → 이 탭도 로그아웃
      setAccessToken(null);
      useAuthStore.setState({ token: null, user: null });
      toast.info("다른 탭에서 로그아웃되었습니다.");
    } else {
      // 다른 탭에서 토큰 갱신 → 이 탭도 동기화
      try {
        const { token, user } = JSON.parse(e.newValue);
        if (token) {
          setAccessToken(token);
          useAuthStore.setState({ token, user });
        }
      } catch {}
    }
  });
}
