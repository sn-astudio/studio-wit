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

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  function EditorCanvas(
    { imageUrl, filterValues, isCropping, cropRect, onCropChange },
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
    }, [syncHistoryMeta]);

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
    }, [syncHistoryMeta]);

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
      },
      [pushSnapshot],
    );

    const applyCrop = useCallback(
      (rect: CropRect) => {
        const canvas = mainRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        pushSnapshot(); // save pre-crop state — wait, pushSnapshot saves current, but we want it before crop
        // Actually pushSnapshot already saved the current state above.
        // Let's redo: we push a snapshot of the current canvas, then mutate.

        const imageData = ctx.getImageData(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.putImageData(imageData, 0, 0);

        // Push the cropped state as new snapshot
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
      },
      [pushSnapshot, syncHistoryMeta],
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
      });
      return () => {
        cancelled = true;
      };
    }, [imageUrl, syncHistoryMeta]);

    // 필터 CSS 프리뷰 적용
    useEffect(() => {
      const canvas = mainRef.current;
      if (!canvas) return;
      canvas.style.filter = buildCssFilter(filterValues);
    }, [filterValues]);

    // 오버레이 크기 동기화
    useEffect(() => {
      const main = mainRef.current;
      const overlay = overlayRef.current;
      if (!main || !overlay) return;
      const observer = new ResizeObserver(() => {
        const rect = main.getBoundingClientRect();
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.width = main.width;
        overlay.height = main.height;
      });
      observer.observe(main);
      return () => observer.disconnect();
    }, []);

    // 크롭 드래그
    const dragRef = useRef<{
      startX: number;
      startY: number;
      dragging: boolean;
    } | null>(null);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (!isCropping) return;
        const overlay = overlayRef.current;
        if (!overlay) return;
        overlay.setPointerCapture(e.pointerId);
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);
        dragRef.current = { startX: x, startY: y, dragging: true };
        onCropChange(null);
      },
      [isCropping, onCropChange],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!dragRef.current?.dragging || !isCropping) return;
        const overlay = overlayRef.current;
        if (!overlay) return;
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);
        const sx = dragRef.current.startX;
        const sy = dragRef.current.startY;
        const rx = Math.min(sx, x);
        const ry = Math.min(sy, y);
        const rw = Math.abs(x - sx);
        const rh = Math.abs(y - sy);

        onCropChange({ x: rx, y: ry, width: rw, height: rh });

        // 오버레이에 크롭 사각형 그리기
        const ctx = overlay.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // 어두운 오버레이
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, overlay.width, overlay.height);

        // 크롭 영역 투명하게
        ctx.clearRect(rx, ry, rw, rh);

        // 크롭 테두리
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);
      },
      [isCropping, onCropChange],
    );

    const handlePointerUp = useCallback(() => {
      if (dragRef.current) {
        dragRef.current.dragging = false;
      }
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
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, overlay.width, overlay.height);
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }, [isCropping, cropRect]);

    return (
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
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
