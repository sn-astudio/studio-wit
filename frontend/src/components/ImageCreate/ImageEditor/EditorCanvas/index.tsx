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
    {
      imageUrl,
      filterValues,
      activeTool,
      cropRect,
      onCropChange,
      drawingSettings,
      shapeSettings,
      textSettings,
      onEyedropperPick,
    },
    ref,
  ) {
    const mainRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isCropping = activeTool === "crop";
    const isDrawing = activeTool === "draw";
    const isEraser = activeTool === "eraser";
    const isShape = activeTool === "shape";
    const isText = activeTool === "text";
    const isEyedropper = activeTool === "eyedropper";
    const isMosaic = activeTool === "mosaic";
    const isZoom = activeTool === "zoom";
    const needsOverlay =
      isCropping || isDrawing || isEraser || isShape || isText || isMosaic;

    const zoomPan = useImageEditorStore((s) => s.zoomPan);
    const setZoomPan = useImageEditorStore((s) => s.setZoomPan);

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
        getOverlayCanvas: () => overlayRef.current,
        replaceMainCanvas,
        applyCrop,
        bakeOverlay,
        clearOverlay,
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
      loadImage(imageUrl).then((img) => {
        if (cancelled) return;
        const canvas = mainRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

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
    } | null>(null);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        const overlay = overlayRef.current;
        if (!overlay) return;

        // 스포이드: main canvas에서 픽셀 추출
        if (isEyedropper) {
          const main = mainRef.current;
          if (!main) return;
          const { x, y } = cssToCanvasCoords(main, e.clientX, e.clientY);
          const ctx = main.getContext("2d");
          if (!ctx) return;
          const pixel = ctx.getImageData(
            Math.round(x),
            Math.round(y),
            1,
            1,
          ).data;
          const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
          onEyedropperPick?.(hex);
          return;
        }

        if (!needsOverlay) return;

        overlay.setPointerCapture(e.pointerId);
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);
        dragRef.current = {
          startX: x,
          startY: y,
          lastX: x,
          lastY: y,
          dragging: true,
        };

        if (isCropping) {
          onCropChange(null);
        }

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

        // 텍스트: 클릭 위치에 텍스트 그리기
        if (isText && textSettings.text.trim()) {
          const ctx = overlay.getContext("2d");
          if (!ctx) return;
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          const style = `${textSettings.bold ? "bold " : ""}${textSettings.italic ? "italic " : ""}`;
          ctx.font = `${style}${textSettings.fontSize}px ${textSettings.fontFamily}`;
          ctx.fillStyle = textSettings.color;
          ctx.fillText(textSettings.text, x, y);
        }
      },
      [
        isCropping,
        isDrawing,
        isEraser,
        isShape,
        isText,
        isEyedropper,
        needsOverlay,
        onCropChange,
        drawingSettings,
        textSettings,
        onEyedropperPick,
      ],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
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

        if (!dragRef.current?.dragging) return;
        const overlay = overlayRef.current;
        if (!overlay) return;
        const { x, y } = cssToCanvasCoords(overlay, e.clientX, e.clientY);

        // 크롭
        if (isCropping) {
          const sx = dragRef.current.startX;
          const sy = dragRef.current.startY;
          const rx = Math.min(sx, x);
          const ry = Math.min(sy, y);
          const rw = Math.abs(x - sx);
          const rh = Math.abs(y - sy);

          onCropChange({ x: rx, y: ry, width: rw, height: rh });

          const ctx = overlay.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(0, 0, overlay.width, overlay.height);
          ctx.clearRect(rx, ry, rw, rh);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, ry, rw, rh);
        }

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

        // 도형: 실시간 프리뷰
        if (isShape) {
          const ctx = overlay.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          ctx.strokeStyle = shapeSettings.color;
          ctx.fillStyle = shapeSettings.color;
          ctx.lineWidth = shapeSettings.strokeWidth;

          const sx = dragRef.current.startX;
          const sy = dragRef.current.startY;

          switch (shapeSettings.type) {
            case "rect": {
              const rx = Math.min(sx, x);
              const ry = Math.min(sy, y);
              const rw = Math.abs(x - sx);
              const rh = Math.abs(y - sy);
              if (shapeSettings.fill) {
                ctx.fillRect(rx, ry, rw, rh);
              } else {
                ctx.strokeRect(rx, ry, rw, rh);
              }
              break;
            }
            case "circle": {
              const cx = (sx + x) / 2;
              const cy = (sy + y) / 2;
              const rx = Math.abs(x - sx) / 2;
              const ry = Math.abs(y - sy) / 2;
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
              if (shapeSettings.fill) {
                ctx.fill();
              } else {
                ctx.stroke();
              }
              break;
            }
            case "line": {
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(x, y);
              ctx.stroke();
              break;
            }
            case "arrow": {
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(x, y);
              ctx.stroke();
              // 화살표 머리
              const angle = Math.atan2(y - sy, x - sx);
              const headLen = Math.max(10, shapeSettings.strokeWidth * 4);
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(
                x - headLen * Math.cos(angle - Math.PI / 6),
                y - headLen * Math.sin(angle - Math.PI / 6),
              );
              ctx.moveTo(x, y);
              ctx.lineTo(
                x - headLen * Math.cos(angle + Math.PI / 6),
                y - headLen * Math.sin(angle + Math.PI / 6),
              );
              ctx.stroke();
              break;
            }
          }
        }
      },
      [
        isCropping,
        isDrawing,
        isEraser,
        isShape,
        onCropChange,
        shapeSettings,
      ],
    );

    const handlePointerUp = useCallback(() => {
      // 모자이크 종료
      if (canvasMosaicRef.current) {
        canvasMosaicRef.current = false;
        // 모자이크 적용 후 snapshot은 이미 pushSnapshot으로 저장됨
        // 최종 상태를 새 snapshot으로 저장
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
    }, [isDrawing, isEraser]);

    // 크롭 모드 해제 시 오버레이 클리어
    useEffect(() => {
      if (!isCropping) {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;
        // 그리기 모드면 클리어하지 않음
        if (isDrawing || isEraser || isShape || isText) return;
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
    }, [isCropping, isDrawing, isEraser, isShape, isText]);

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

    // 줌 휠 핸들러
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        if (!isZoom) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(
          5,
          Math.max(0.1, zoomPan.scale * delta),
        );
        setZoomPan({ ...zoomPan, scale: newScale });
      },
      [isZoom, zoomPan, setZoomPan],
    );

    // 줌 모드 팬 드래그
    const panRef = useRef<{
      startX: number;
      startY: number;
      startOffsetX: number;
      startOffsetY: number;
      dragging: boolean;
    } | null>(null);

    const handlePanDown = useCallback(
      (e: React.PointerEvent) => {
        if (!isZoom) return;
        const container = containerRef.current;
        if (!container) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: zoomPan.offsetX,
          startOffsetY: zoomPan.offsetY,
          dragging: true,
        };
      },
      [isZoom, zoomPan],
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
      if (panRef.current) panRef.current.dragging = false;
    }, []);

    const cursorStyle = isZoom
      ? "grab"
      : isEyedropper
        ? "crosshair"
        : isDrawing || isEraser
          ? "crosshair"
          : isCropping
            ? "crosshair"
            : isText
              ? "text"
              : "default";

    return (
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onPointerDown={isZoom ? handlePanDown : undefined}
        onPointerMove={isZoom ? handlePanMove : undefined}
        onPointerUp={isZoom ? handlePanUp : undefined}
      >
        <div
          style={{
            transform: `translate(${zoomPan.offsetX}px, ${zoomPan.offsetY}px) scale(${zoomPan.scale})`,
            transformOrigin: "center center",
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
              pointerEvents:
                needsOverlay || isEyedropper ? "auto" : "none",
              cursor: cursorStyle,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      </div>
    );
  },
);
