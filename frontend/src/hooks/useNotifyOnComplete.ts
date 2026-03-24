"use client";

import { useCallback, useEffect, useRef } from "react";

// Badging API 타입 (Chrome 81+)
declare global {
  interface Navigator {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  }
}

/**
 * 작업 완료 시 크롬 탭 favicon 뱃지 + 브라우저 알림 + 타이틀 깜빡임.
 *
 * - favicon에 빨간 점 뱃지를 canvas로 그려서 교체
 * - Notification API: 데스크톱 알림 (탭 비활성 시)
 * - 탭 타이틀 깜빡임: 사용자가 다른 탭에 있을 때
 */
export function useNotifyOnComplete() {
  const originalTitleRef = useRef("");
  const originalFaviconRef = useRef("");
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const badgeActiveRef = useRef(false);

  // 권한 요청 (마운트 시 한 번)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
      }
    };
  }, []);

  /** 탭 포커스 시 뱃지/타이틀 해제 */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && badgeActiveRef.current) {
        clearBadge();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  /** favicon에 빨간 뱃지 점 추가 */
  const setFaviconBadge = useCallback(() => {
    if (typeof document === "undefined") return;

    const link: HTMLLinkElement | null =
      document.querySelector('link[rel~="icon"]');
    if (!link) return;

    // 원본 저장
    if (!originalFaviconRef.current) {
      originalFaviconRef.current = link.href;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 원본 favicon
      ctx.drawImage(img, 0, 0, size, size);

      // 빨간 뱃지 원
      const badgeRadius = size * 0.22;
      const cx = size - badgeRadius - 2;
      const cy = badgeRadius + 2;

      ctx.beginPath();
      ctx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      // 흰색 테두리
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // favicon 교체
      link.href = canvas.toDataURL("image/png");
    };
    img.src = link.href;
  }, []);

  /** 뱃지/타이틀 해제 */
  const clearBadge = useCallback(() => {
    badgeActiveRef.current = false;

    // 크롬 앱 뱃지 해제
    try {
      navigator?.clearAppBadge?.();
    } catch {
      // 지원하지 않는 브라우저
    }

    // favicon 복원
    if (originalFaviconRef.current) {
      const link: HTMLLinkElement | null =
        document.querySelector('link[rel~="icon"]');
      if (link) link.href = originalFaviconRef.current;
    }

    // 타이틀 복원
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
      document.title = originalTitleRef.current;
    }
  }, []);

  const notify = useCallback(
    (title: string, body?: string) => {
      badgeActiveRef.current = true;

      // 1) 크롬 앱 뱃지 (태스크바 아이콘에 뱃지 표시)
      try {
        navigator?.setAppBadge?.(1);
      } catch {
        // 지원하지 않는 브라우저
      }

      // 2) Favicon 뱃지 (탭에 빨간 점)
      setFaviconBadge();

      // 3) 데스크톱 알림 (탭 비활성 시)
      if (document.hidden && typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
            tag: "studio-wit-complete",
          });
        }
      }

      // 4) 타이틀 깜빡임 (탭 비활성 시)
      if (document.hidden && !blinkIntervalRef.current) {
        originalTitleRef.current = document.title;
        let toggle = false;
        blinkIntervalRef.current = setInterval(() => {
          document.title = toggle
            ? originalTitleRef.current
            : `✅ ${title}`;
          toggle = !toggle;
        }, 1000);
      }
    },
    [setFaviconBadge],
  );

  return notify;
}
