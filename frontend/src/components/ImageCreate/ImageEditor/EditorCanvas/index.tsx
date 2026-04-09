"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
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
    {
      imageUrl,
      filterValues,
      activeTool,
      cropRect,
      onCropChange,
      drawingSettings,
      textSettings,
      onTextPlace,
      freeRotateDegrees,
      resizePreviewScale,
      drawEraserMode,
    },
    ref,
  ) {
    const mainRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPanDragging, setIsPanDragging] = useState(false);

    const [cursorPos, setCursorPos] = useState<{
      cssX: number;
      cssY: number;
      cssDiameter: number;
      visible: boolean;
    }>({ cssX: 0, cssY: 0, cssDiameter: 0, visible: false });
    const rafIdRef = useRef<number>(0);

    const isCropping = activeTool === "crop";
    const isDrawing = activeTool === "draw";
    const isEraser = activeTool === "draw" && !!drawEraserMode;
    const isText = activeTool === "text";
    const isMosaic = activeTool === "mosaic";
    const isZoom = activeTool === "zoom";
    const needsOverlay =
      isCropping || isDrawing || isText || isMosaic;
    const showBrushCursor = isDrawing || isMosaic;

    const zoomPan = useImageEditorStore((s) => s.zoomPan);
    const setZoomPan = useImageEditorStore((s) => s.setZoomPan);
    const resetZoomPan = useImageEditorStore((s) => s.resetZoomPan);

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

    const bakeOverlay = useCallback(() => {
      const main = mainRef.current;
      const overlay = overlayRef.current;
      if (!main || !overlay) return;
      const ctx = main.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(overlay, 0, 0);
      pushSnapshot();
      // 오버레이 클리어
      const oCtx = overlay.getContext("2d");
      if (oCtx) oCtx.clearRect(0, 0, overlay.width, overlay.height);
    }, [pushSnapshot]);

    const clearOverlay = useCallback(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
    }, []);

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
        getOverlayCanvas: () => overlayRef.current,
        replaceMainCanvas,
        applyCrop,
        bakeOverlay,
        clearOverlay,
        hasOverlayContent: () => {
          const overlay = overlayRef.current;
          if (!overlay) return false;
          const ctx = overlay.getContext("2d");
          if (!ctx) return false;
          const data = ctx.getImageData(0, 0, overlay.width, overlay.height);
          return data.data.some((v, i) => i % 4 === 3 && v > 0);
        },
      }),
      [
        pushSnapshot,
        undo,
        redo,
        replaceMainCanvas,
        applyCrop,
        bakeOverlay,
        clearOverlay,
      ],
    );

    // 이미지 로드 → 캔버스에 그리기
    useEffect(() => {
      let cancelled = false;
      loadImage(imageUrl)
        .then((img) => {
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
        })
        .catch((err) => {
          if (!cancelled) {
            console.error("이미지 로드 실패:", err);
          }
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

    // --- 텍스트 도구: overlay에 텍스트 렌더링 ---
    const textHoverRef = useRef<{ x: number; y: number } | null>(null);

    const renderTextOnOverlay = useCallback(
      (x: number, y: number, ghost = false) => {
        const overlay = overlayRef.current;
        if (!overlay || !textSettings.text.trim()) return;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = ghost ? 0.5 : 1;
        const style = `${textSettings.bold ? "bold " : ""}${textSettings.italic ? "italic " : ""}`;
        ctx.font = `${style}${textSettings.fontSize}px ${textSettings.fontFamily}`;
        ctx.fillStyle = textSettings.color;
        ctx.fillText(textSettings.text, x, y);
        ctx.globalAlpha = 1;
      },
      [textSettings],
    );

    // 텍스트 설정이 변경될 때 배치된 텍스트 다시 그리기
    useEffect(() => {
      if (!isText) return;
      if (textSettings.placedX !== null && textSettings.placedY !== null) {
        renderTextOnOverlay(textSettings.placedX, textSettings.placedY, false);
      }
    }, [isText, textSettings, renderTextOnOverlay]);

    // --- 인터랙션 핸들러 ---
    const canvasMosaicRef = useRef(false);

    const applyMosaicAt = useCallback(
      (canvasX: number, canvasY: number) => {
        const main = mainRef.current;
        if (!main) return;
        const ctx = main.getContext("2d");
        if (!ctx) return;

        const blockSize = Math.max(8, drawingSettings.size * 2);
        const radius = drawingSettings.size * 2;

        // 브러시 반경 내 블록 단위로 모자이크 적용
        const startBlockX =
          Math.floor((canvasX - radius) / blockSize) * blockSize;
        const startBlockY =
          Math.floor((canvasY - radius) / blockSize) * blockSize;
        const endBlockX = canvasX + radius;
        const endBlockY = canvasY + radius;

        for (let bx = startBlockX; bx < endBlockX; bx += blockSize) {
          for (let by = startBlockY; by < endBlockY; by += blockSize) {
            const cx = bx + blockSize / 2;
            const cy = by + blockSize / 2;
            const dist = Math.sqrt(
              (cx - canvasX) ** 2 + (cy - canvasY) ** 2,
            );
            if (dist > radius) continue;

            const sx = Math.max(0, Math.round(bx));
            const sy = Math.max(0, Math.round(by));
            const sw = Math.min(blockSize, main.width - sx);
            const sh = Math.min(blockSize, main.height - sy);
            if (sw <= 0 || sh <= 0) continue;

            const blockData = ctx.getImageData(sx, sy, sw, sh);
            const d = blockData.data;
            let r = 0,
              g = 0,
              b = 0,
              count = 0;
            for (let i = 0; i < d.length; i += 4) {
              r += d[i];
              g += d[i + 1];
              b += d[i + 2];
              count++;
            }
            if (count === 0) continue;
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(sx, sy, sw, sh);
          }
        }
      },
      [drawingSettings.size],
    );

    const dragRef = useRef<{
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      dragging: boolean;
      mode?: DragMode;
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
        const overlay = overlayRef.current;
        if (!overlay) return;

        if (!needsOverlay) return;

        overlay.setPointerCapture(e.pointerId);
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);

        if (isCropping) {
          // 1) 리사이즈 핸들
          const handle = getHandle(x, y);
          if (cropRect && handle) {
            dragRef.current = { startX: x, startY: y, lastX: x, lastY: y, dragging: true, mode: "resize", handle, origRect: { ...cropRect } };
            overlay.style.cursor = CURSOR_MAP[handle];
            return;
          }

          // 2) 내부 → 이동
          if (cropRect && x >= cropRect.x && x <= cropRect.x + cropRect.width && y >= cropRect.y && y <= cropRect.y + cropRect.height) {
            dragRef.current = { startX: x, startY: y, lastX: x, lastY: y, dragging: true, mode: "move", origRect: { ...cropRect } };
            overlay.style.cursor = "grabbing";
            return;
          }

          // 3) 외부 → 새로 그리기
          dragRef.current = { startX: x, startY: y, lastX: x, lastY: y, dragging: true, mode: "draw" };
          onCropChange(null);
          return;
        }

        dragRef.current = {
          startX: x,
          startY: y,
          lastX: x,
          lastY: y,
          dragging: true,
          mode: "draw",
        };

        // 모자이크: main canvas에 직접 적용
        if (isMosaic) {
          pushSnapshot();
          canvasMosaicRef.current = true;
          const main = mainRef.current;
          if (!main) return;
          const { x: mx, y: my } = cssToCanvasCoords(
            main,
            e.clientX,
            e.clientY,
          );
          applyMosaicAt(mx, my);
          return;
        }

        // 그리기/지우개: 시작점 설정
        if (isDrawing || isEraser) {
          const ctx = overlay.getContext("2d");
          if (!ctx) return;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = drawingSettings.size;

          if (isEraser) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
          } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = drawingSettings.opacity / 100;
            ctx.strokeStyle = drawingSettings.color;
          }
          ctx.beginPath();
          ctx.moveTo(x, y);
        }

        // 텍스트: 클릭으로 배치
        if (isText && textSettings.text.trim()) {
          onTextPlace?.(x, y);
          renderTextOnOverlay(x, y, false);
          dragRef.current.dragging = false;
        }
      },
      [
        isCropping,
        isDrawing,
        isEraser,
        isText,
        isMosaic,
        needsOverlay,
        onCropChange,
        cropRect,
        getHandle,
        drawingSettings,
        textSettings,
        onTextPlace,
        renderTextOnOverlay,
        pushSnapshot,
        applyMosaicAt,
      ],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        // 브러시 커서 추적
        if (showBrushCursor) {
          const overlay = overlayRef.current;
          const main = mainRef.current;
          if (overlay && main) {
            const rect = overlay.getBoundingClientRect();
            const cssX = e.clientX - rect.left;
            const cssY = e.clientY - rect.top;
            const scaleX = main.width / rect.width;
            const canvasDiameter = isMosaic
              ? drawingSettings.size * 4
              : drawingSettings.size;
            const cssDiameter = canvasDiameter / scaleX;

            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
              setCursorPos({ cssX, cssY, cssDiameter, visible: true });
            });
          }
        }

        // 모자이크 이동
        if (isMosaic && canvasMosaicRef.current) {
          const main = mainRef.current;
          if (!main) return;
          const { x: mx, y: my } = cssToCanvasCoords(
            main,
            e.clientX,
            e.clientY,
          );
          applyMosaicAt(mx, my);
          return;
        }

        // 텍스트: 배치 전 커서 따라다니는 고스트 미리보기
        if (
          isText &&
          textSettings.text.trim() &&
          textSettings.placedX === null
        ) {
          const overlay = overlayRef.current;
          if (!overlay) return;
          const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);
          textHoverRef.current = { x, y };
          renderTextOnOverlay(x, y, true);
          return;
        }

        const overlay = overlayRef.current;
        const main = mainRef.current;
        if (!overlay || !main) return;
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);

        // 크롭: hover 커서 + drag 처리
        if (isCropping) {
          const mw = main.width;
          const mh = main.height;

          // hover 커서
          if (!dragRef.current?.dragging) {
            const handle = getHandle(x, y);
            if (handle) {
              overlay.style.cursor = CURSOR_MAP[handle];
            } else if (cropRect && x >= cropRect.x && x <= cropRect.x + cropRect.width && y >= cropRect.y && y <= cropRect.y + cropRect.height) {
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
          return;
        }

        if (!dragRef.current?.dragging) return;

        // 그리기/지우개
        if (isDrawing || isEraser) {
          const ctx = overlay.getContext("2d");
          if (!ctx) return;
          const midX = (dragRef.current.lastX + x) / 2;
          const midY = (dragRef.current.lastY + y) / 2;
          ctx.quadraticCurveTo(dragRef.current.lastX, dragRef.current.lastY, midX, midY);
          ctx.stroke();
          dragRef.current.lastX = x;
          dragRef.current.lastY = y;
        }

      },
      [
        isCropping,
        isDrawing,
        isEraser,
        isText,
        isMosaic,
        showBrushCursor,
        onCropChange,
        drawCropOverlay,
        cropRect,
        getHandle,
        drawingSettings.size,
        textSettings,
        renderTextOnOverlay,
        applyMosaicAt,
      ],
    );

    const handlePointerUp = useCallback(() => {
      // 모자이크 종료
      if (canvasMosaicRef.current) {
        canvasMosaicRef.current = false;
        const main = mainRef.current;
        if (main) {
          const ctx = main.getContext("2d");
          if (ctx) {
            const data = ctx.getImageData(0, 0, main.width, main.height);
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
          }
        }
        return;
      }

      if (!dragRef.current) return;

      // 그리기/지우개: 패스 종료
      if ((isDrawing || isEraser) && dragRef.current.dragging) {
        const overlay = overlayRef.current;
        if (overlay) {
          const ctx = overlay.getContext("2d");
          if (ctx) {
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
          }
        }
      }

      dragRef.current.dragging = false;
    }, [isDrawing, isEraser, syncHistoryMeta]);

    // 크롭 모드 해제 시 오버레이 클리어
    useEffect(() => {
      if (!isCropping) {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;
        // 그리기 모드면 클리어하지 않음
        if (isDrawing || isEraser || isText) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
    }, [isCropping, isDrawing, isEraser, isText]);

    // 크롭 모드 진입 시 cropRect가 있으면 오버레이에 그리기
    useEffect(() => {
      if (!isCropping || !cropRect) return;
      drawCropOverlay(cropRect);
    }, [isCropping, cropRect, drawCropOverlay]);

    // 줌 휠 핸들러
    // 팬 드래그
    const panRef = useRef<{
      startX: number;
      startY: number;
      startOffsetX: number;
      startOffsetY: number;
      dragging: boolean;
    } | null>(null);

    const handlePanDown = useCallback(
      (e: React.PointerEvent) => {
        if (zoomPan.scale <= 1) return;
        const container = containerRef.current;
        if (!container) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsPanDragging(true);
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: zoomPan.offsetX,
          startOffsetY: zoomPan.offsetY,
          dragging: true,
        };
      },
      [zoomPan],
    );

    const handlePanMove = useCallback(
      (e: React.PointerEvent) => {
        if (!panRef.current?.dragging) return;
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        setZoomPan({
          ...zoomPan,
          offsetX: panRef.current.startOffsetX + dx,
          offsetY: panRef.current.startOffsetY + dy,
        });
      },
      [zoomPan, setZoomPan],
    );

    const handlePanUp = useCallback(() => {
      if (panRef.current) {
        panRef.current.dragging = false;
        setIsPanDragging(false);
      }
    }, []);

    const handleCursorEnter = useCallback(
      (e: React.PointerEvent) => {
        if (!showBrushCursor) return;
        const overlay = overlayRef.current;
        const main = mainRef.current;
        if (!overlay || !main) return;
        const rect = overlay.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        const scaleX = main.width / rect.width;
        const canvasDiameter = isMosaic
          ? drawingSettings.size * 4
          : drawingSettings.size;
        const cssDiameter = canvasDiameter / scaleX;
        setCursorPos({ cssX, cssY, cssDiameter, visible: true });
      },
      [showBrushCursor, isMosaic, drawingSettings.size],
    );

    const handleCursorLeave = useCallback(() => {
      setCursorPos((prev) => ({ ...prev, visible: false }));
    }, []);

    // rAF cleanup
    useEffect(() => {
      return () => cancelAnimationFrame(rafIdRef.current);
    }, []);

    const cursorStyle = zoomPan.scale > 1 && !showBrushCursor && !isCropping && !isText
      ? "grab"
      : showBrushCursor
        ? "none"
        : isCropping
          ? "crosshair"
          : isText
            ? "text"
            : "default";

    return (
      <div
        ref={containerRef}
        className="relative flex size-full items-center justify-center overflow-hidden"
        style={{ cursor: zoomPan.scale > 1 ? (isPanDragging ? "grabbing" : "grab") : undefined }}
        onPointerDown={handlePanDown}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanUp}
      >
        <div
          style={{
            transform: `translate(${zoomPan.offsetX}px, ${zoomPan.offsetY}px) scale(${zoomPan.scale * (resizePreviewScale?.scaleX ?? 1)}, ${zoomPan.scale * (resizePreviewScale?.scaleY ?? 1)}) rotate(${freeRotateDegrees ?? 0}deg)`,
            transformOrigin: "center center",
            transition:
              freeRotateDegrees != null || resizePreviewScale
                ? "transform 0.15s ease"
                : undefined,
          }}
          className="relative"
        >
          <canvas
            ref={mainRef}
            className="max-h-full max-w-full object-contain"
          />
          <canvas
            ref={overlayRef}
            className="absolute left-0 top-0 max-h-full max-w-full"
            style={{
              pointerEvents: needsOverlay ? "auto" : "none",
              cursor: cursorStyle,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerEnter={handleCursorEnter}
            onPointerLeave={handleCursorLeave}
          />
          {showBrushCursor && cursorPos.visible && (
            <div
              style={{
                position: "absolute",
                left: cursorPos.cssX - cursorPos.cssDiameter / 2,
                top: cursorPos.cssY - cursorPos.cssDiameter / 2,
                width: Math.max(cursorPos.cssDiameter, 8),
                height: Math.max(cursorPos.cssDiameter, 8),
                borderRadius: "50%",
                border: `2px solid ${
                  isEraser
                    ? "rgba(255,255,255,0.8)"
                    : isMosaic
                      ? "rgba(255,255,0,0.6)"
                      : drawingSettings.color
                }`,
                background: isEraser
                  ? "rgba(255,255,255,0.15)"
                  : isMosaic
                    ? "rgba(255,255,0,0.1)"
                    : `${drawingSettings.color}20`,
                pointerEvents: "none",
                boxSizing: "border-box",
                transition: "width 0.1s, height 0.1s",
              }}
            />
          )}
        </div>
      </div>
    );
  },
);
