"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/auth";

/**
 * JWT 페이로드에서 만료 시간(exp)을 추출한다.
 * exp는 Unix timestamp (초 단위).
 */
function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

/** 만료 N분 전에 사전 갱신 (기본 5분) */
const PRE_REFRESH_MS = 5 * 60 * 1000;

export function useAuthSync() {
  const { data: session, status } = useSession();
  const { token, verifyToken, clearAuth, restoreToken } = useAuthStore();
  const didRestore = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 앱 시작 시 localStorage에서 토큰 복원
  useEffect(() => {
    if (!didRestore.current) {
      restoreToken();
      didRestore.current = true;
    }
  }, [restoreToken]);

  // NextAuth 세션 변경 감지 → 백엔드 JWT 발급
  useEffect(() => {
    if (status === "authenticated" && session?.idToken && !token) {
      verifyToken(session.idToken);
    }

    if (status === "unauthenticated" && token) {
      clearAuth();
    }
  }, [status, session?.idToken, token, verifyToken, clearAuth]);

  // 토큰 만료 5분 전 자동 갱신 타이머
  useEffect(() => {
    // 이전 타이머 정리
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!token || status !== "authenticated" || !session?.idToken) return;

    const exp = getTokenExp(token);
    if (!exp) return;

    const expiresAt = exp * 1000; // ms로 변환
    const now = Date.now();
    const refreshAt = expiresAt - PRE_REFRESH_MS; // 만료 5분 전
    const delay = refreshAt - now;

    if (delay <= 0) {
      // 이미 갱신 시점을 지남 → 즉시 갱신
      verifyToken(session.idToken);
    } else {
      // 갱신 시점에 타이머 설정
      refreshTimerRef.current = setTimeout(() => {
        const currentSession = session;
        if (currentSession?.idToken) {
          verifyToken(currentSession.idToken);
        }
      }, delay);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [token, status, session?.idToken, verifyToken]);
}
