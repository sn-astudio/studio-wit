"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { useImageEditorStore } from "@/stores/imageEditor";
import { MAX_HISTORY } from "../const";
import { buildCssFilter, loadImage } from "../utils";
import type { CropRect } from "../types";
import type { EditorCanvasHandle, EditorCanvasProps } from "./types";
import { cssToCanvasCoords } from "./utils";

type DragMode = "draw" | "move" | "resize";
type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";

const CURSOR_MAP: Record<ResizeHandle, string> = {
  nw: "nwse-resize", se: "nwse-resize",
  ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize",
  w: "ew-resize", e: "ew-resize",
};

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  function EditorCanvas(
    { imageUrl, filterValues, isCropping, isFreeCrop = true, cropRect, onCropChange },
    ref,
  ) {
    const mainRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Undo/Redo 스냅샷 스택
    const snapshotsRef = useRef<ImageData[]>([]);
    const indexRef = useRef(-1);
    const setHistoryMeta = useImageEditorStore((s) => s.setHistoryMeta);

    const syncHistoryMeta = useCallback(() => {
      setHistoryMeta(indexRef.current, snapshotsRef.current.length);
    }, [setHistoryMeta]);

    const pushSnapshot = useCallback(() => {
      const canvas = mainRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // 현재 인덱스 이후의 스냅샷 제거 (redo 분기 제거)
      snapshotsRef.current = snapshotsRef.current.slice(
        0,
        indexRef.current + 1,
      );
      snapshotsRef.current.push(data);
      if (snapshotsRef.current.length > MAX_HISTORY) {
        snapshotsRef.current.shift();
      }
      indexRef.current = snapshotsRef.current.length - 1;
      syncHistoryMeta();
    }, [syncHistoryMeta]);

    // 캔버스 CSS 크기를 컨테이너에 맞춰 비율 유지
    const fitCanvas = useCallback(() => {
      const container = containerRef.current;
      const main = mainRef.current;
      const overlay = overlayRef.current;
      if (!container || !main) return;

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const iw = main.width;
      const ih = main.height;
      if (!iw || !ih) return;

      const scale = Math.min(cw / iw, ch / ih);
      const displayW = Math.round(iw * scale);
      const displayH = Math.round(ih * scale);

      main.style.width = `${displayW}px`;
      main.style.height = `${displayH}px`;

      if (overlay) {
        overlay.style.width = `${displayW}px`;
        overlay.style.height = `${displayH}px`;
        overlay.width = iw;
        overlay.height = ih;
        pixelRatioRef.current = displayW > 0 ? iw / displayW : 1;
      }
    }, []);

    const undo = useCallback(() => {
      if (indexRef.current <= 0) return;
      indexRef.current--;
      const canvas = mainRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const snapshot = snapshotsRef.current[indexRef.current];
      canvas.width = snapshot.width;
      canvas.height = snapshot.height;
      ctx.putImageData(snapshot, 0, 0);
      syncHistoryMeta();
      requestAnimationFrame(() => fitCanvas());
    }, [syncHistoryMeta, fitCanvas]);

    const redo = useCallback(() => {
      if (indexRef.current >= snapshotsRef.current.length - 1) return;
      indexRef.current++;
      const canvas = mainRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const snapshot = snapshotsRef.current[indexRef.current];
      canvas.width = snapshot.width;
      canvas.height = snapshot.height;
      ctx.putImageData(snapshot, 0, 0);
      syncHistoryMeta();
      requestAnimationFrame(() => fitCanvas());
    }, [syncHistoryMeta, fitCanvas]);

    const replaceMainCanvas = useCallback(
      (source: HTMLCanvasElement) => {
        const canvas = mainRef.current;
        if (!canvas) return;
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(source, 0, 0);
        pushSnapshot();
        requestAnimationFrame(() => fitCanvas());
      },
      [pushSnapshot, fitCanvas],
    );

    const applyCrop = useCallback(
      (rect: CropRect) => {
        const canvas = mainRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // undo용: 자르기 전 상태 저장
        pushSnapshot();

        const imageData = ctx.getImageData(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.putImageData(imageData, 0, 0);

        // 자른 결과를 새 체크포인트로 기록
        const croppedData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        snapshotsRef.current = snapshotsRef.current.slice(
          0,
          indexRef.current + 1,
        );
        snapshotsRef.current.push(croppedData);
        if (snapshotsRef.current.length > MAX_HISTORY) {
          snapshotsRef.current.shift();
        }
        indexRef.current = snapshotsRef.current.length - 1;
        syncHistoryMeta();
        requestAnimationFrame(() => fitCanvas());
      },
      [pushSnapshot, syncHistoryMeta, fitCanvas],
    );

    useImperativeHandle(
      ref,
      () => ({
        pushSnapshot,
        undo,
        redo,
        getMainCanvas: () => mainRef.current,
        replaceMainCanvas,
        applyCrop,
      }),
      [pushSnapshot, undo, redo, replaceMainCanvas, applyCrop],
    );

    // 이미지 로드 → 캔버스에 그리기
    useEffect(() => {
      let cancelled = false;
      loadImage(imageUrl).then((img) => {
        if (cancelled) return;
        const canvas = mainRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        // 초기 스냅샷
        snapshotsRef.current = [
          ctx.getImageData(0, 0, canvas.width, canvas.height),
        ];
        indexRef.current = 0;
        syncHistoryMeta();
        // 비율 맞춤
        requestAnimationFrame(() => fitCanvas());
      });
      return () => {
        cancelled = true;
      };
    }, [imageUrl, syncHistoryMeta, fitCanvas]);

    // 필터 CSS 프리뷰 적용
    useEffect(() => {
      const canvas = mainRef.current;
      if (!canvas) return;
      canvas.style.filter = buildCssFilter(filterValues);
    }, [filterValues]);

    // 오버레이 크기 동기화 + 리사이즈 대응
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const observer = new ResizeObserver(() => fitCanvas());
      observer.observe(container);
      return () => observer.disconnect();
    }, [fitCanvas]);

    // 크롭 드래그
    const dragRef = useRef<{
      startX: number;
      startY: number;
      dragging: boolean;
      mode: DragMode;
      handle?: ResizeHandle;
      origRect?: CropRect;
    } | null>(null);

    const pixelRatioRef = useRef(1);

    const getEdge = useCallback(() => {
      return 14 * pixelRatioRef.current;
    }, []);

    const getHandle = useCallback(
      (x: number, y: number): ResizeHandle | null => {
        if (!cropRect) return null;
        const EDGE = getEdge();
        const { x: cx, y: cy, width: cw, height: ch } = cropRect;
        const nearL = Math.abs(x - cx) < EDGE;
        const nearR = Math.abs(x - (cx + cw)) < EDGE;
        const nearT = Math.abs(y - cy) < EDGE;
        const nearB = Math.abs(y - (cy + ch)) < EDGE;
        const inX = x >= cx - EDGE && x <= cx + cw + EDGE;
        const inY = y >= cy - EDGE && y <= cy + ch + EDGE;

        if (nearT && nearL) return "nw";
        if (nearT && nearR) return "ne";
        if (nearB && nearL) return "sw";
        if (nearB && nearR) return "se";
        if (nearT && inX) return "n";
        if (nearB && inX) return "s";
        if (nearL && inY) return "w";
        if (nearR && inY) return "e";
        return null;
      },
      [cropRect, getEdge],
    );

    const drawCropOverlay = useCallback(
      (rect: CropRect) => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const pixelRatio = pixelRatioRef.current;

        // 어두운 오버레이
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, overlay.width, overlay.height);
        ctx.clearRect(rect.x, rect.y, rect.width, rect.height);

        // 얇은 테두리
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1 * pixelRatio;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        // L자 모서리 핸들 + 가장자리 중앙 바 (화면상 일정 크기 유지)
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3 * pixelRatio;
        ctx.lineCap = "round";
        const L = Math.min(16 * pixelRatio, rect.width / 4, rect.height / 4);
        const bar = Math.min(32 * pixelRatio, rect.width / 4, rect.height / 4);
        const { x: rx, y: ry, width: rw, height: rh } = rect;

        ctx.beginPath();
        // 좌상
        ctx.moveTo(rx, ry + L); ctx.lineTo(rx, ry); ctx.lineTo(rx + L, ry);
        // 우상
        ctx.moveTo(rx + rw - L, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + L);
        // 좌하
        ctx.moveTo(rx, ry + rh - L); ctx.lineTo(rx, ry + rh); ctx.lineTo(rx + L, ry + rh);
        // 우하
        ctx.moveTo(rx + rw - L, ry + rh); ctx.lineTo(rx + rw, ry + rh); ctx.lineTo(rx + rw, ry + rh - L);
        // 상 중앙
        ctx.moveTo(rx + rw / 2 - bar / 2, ry); ctx.lineTo(rx + rw / 2 + bar / 2, ry);
        // 하 중앙
        ctx.moveTo(rx + rw / 2 - bar / 2, ry + rh); ctx.lineTo(rx + rw / 2 + bar / 2, ry + rh);
        // 좌 중앙
        ctx.moveTo(rx, ry + rh / 2 - bar / 2); ctx.lineTo(rx, ry + rh / 2 + bar / 2);
        // 우 중앙
        ctx.moveTo(rx + rw, ry + rh / 2 - bar / 2); ctx.lineTo(rx + rw, ry + rh / 2 + bar / 2);
        ctx.stroke();
      },
      [],
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (!isCropping) return;
        const overlay = overlayRef.current;
        if (!overlay) return;
        overlay.setPointerCapture(e.pointerId);
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);

        // 1) 리사이즈 핸들
        const handle = getHandle(x, y);
        if (cropRect && handle) {
          dragRef.current = { startX: x, startY: y, dragging: true, mode: "resize", handle, origRect: { ...cropRect } };
          overlay.style.cursor = CURSOR_MAP[handle];
          return;
        }

        // 2) 내부 → 이동
        if (cropRect && x >= cropRect.x && x <= cropRect.x + cropRect.width && y >= cropRect.y && y <= cropRect.y + cropRect.height) {
          dragRef.current = { startX: x, startY: y, dragging: true, mode: "move", origRect: { ...cropRect } };
          overlay.style.cursor = "grabbing";
          return;
        }

        // 3) 외부 → 비율 고정이면 이동, 자유면 새로 그리기
        if (!isFreeCrop && cropRect) {
          dragRef.current = { startX: x, startY: y, dragging: true, mode: "move", origRect: { ...cropRect } };
          overlay.style.cursor = "grabbing";
          return;
        }
        dragRef.current = { startX: x, startY: y, dragging: true, mode: "draw" };
        onCropChange(null);
      },
      [isCropping, isFreeCrop, onCropChange, cropRect, getHandle],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isCropping) return;
        const overlay = overlayRef.current;
        const main = mainRef.current;
        if (!overlay || !main) return;
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);
        const mw = main.width;
        const mh = main.height;

        // hover 커서
        if (!dragRef.current?.dragging) {
          const handle = getHandle(x, y);
          if (handle) {
            overlay.style.cursor = CURSOR_MAP[handle];
          } else if (cropRect && x >= cropRect.x && x <= cropRect.x + cropRect.width && y >= cropRect.y && y <= cropRect.y + cropRect.height) {
            overlay.style.cursor = "grab";
          } else if (!isFreeCrop && cropRect) {
            overlay.style.cursor = "grab";
          } else {
            overlay.style.cursor = "crosshair";
          }
          return;
        }

        if (dragRef.current.mode === "resize" && dragRef.current.origRect && dragRef.current.handle) {
          const orig = dragRef.current.origRect;
          const h = dragRef.current.handle;
          let nx = orig.x, ny = orig.y, nw = orig.width, nh = orig.height;

          if (h.includes("w")) { nw = orig.x + orig.width - Math.max(0, x); nx = Math.max(0, x); }
          if (h.includes("e")) { nw = Math.min(mw, x) - orig.x; }
          if (h.includes("n")) { nh = orig.y + orig.height - Math.max(0, y); ny = Math.max(0, y); }
          if (h.includes("s")) { nh = Math.min(mh, y) - orig.y; }
          if (nw < 10) nw = 10;
          if (nh < 10) nh = 10;

          const newRect = { x: nx, y: ny, width: nw, height: nh };
          onCropChange(newRect);
          drawCropOverlay(newRect);
        } else if (dragRef.current.mode === "move" && dragRef.current.origRect) {
          const dx = x - dragRef.current.startX;
          const dy = y - dragRef.current.startY;
          const orig = dragRef.current.origRect;
          const newX = Math.max(0, Math.min(orig.x + dx, mw - orig.width));
          const newY = Math.max(0, Math.min(orig.y + dy, mh - orig.height));
          const newRect = { x: newX, y: newY, width: orig.width, height: orig.height };
          onCropChange(newRect);
          drawCropOverlay(newRect);
        } else {
          const sx = dragRef.current.startX;
          const sy = dragRef.current.startY;
          const newRect = { x: Math.min(sx, x), y: Math.min(sy, y), width: Math.abs(x - sx), height: Math.abs(y - sy) };
          onCropChange(newRect);
          drawCropOverlay(newRect);
        }
      },
      [isCropping, isFreeCrop, onCropChange, drawCropOverlay, cropRect, getHandle],
    );

    const handlePointerUp = useCallback(() => {
      dragRef.current = null;
    }, []);

    // 크롭 모드 해제 시 오버레이 클리어
    useEffect(() => {
      if (!isCropping) {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
    }, [isCropping]);

    // 크롭 모드 진입 시 cropRect가 있으면 오버레이에 그리기
    useEffect(() => {
      if (!isCropping || !cropRect) return;
      drawCropOverlay(cropRect);
    }, [isCropping, cropRect, drawCropOverlay]);

    return (
      <div
        ref={containerRef}
        className="relative flex size-full items-center justify-center overflow-hidden"
      >
        <canvas
          ref={mainRef}
          className="max-h-full max-w-full object-contain"
        />
        <canvas
          ref={overlayRef}
          className="absolute max-h-full max-w-full cursor-crosshair"
          style={{ pointerEvents: isCropping ? "auto" : "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    );
  },
);
