"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/auth";

export function useAuthSync() {
  const { data: session, status } = useSession();
  const { token, verifyToken, clearAuth, restoreToken } = useAuthStore();
  const didRestore = useRef(false);

  // 앱 시작 시 localStorage에서 토큰 복원
  useEffect(() => {
    if (!didRestore.current) {
      restoreToken();
      didRestore.current = true;
    }
  }, [restoreToken]);

  // NextAuth 세션 변경 감지 → 백엔드 JWT 발급
  useEffect(() => {
    console.log("[AuthSync]", { status, hasIdToken: !!session?.idToken, hasToken: !!token });

    if (status === "authenticated" && session?.idToken && !token) {
      verifyToken(session.idToken);
    }

    if (status === "unauthenticated" && token) {
      clearAuth();
    }
  }, [status, session?.idToken, token, verifyToken, clearAuth]);
}
