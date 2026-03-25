import type { FilterValues } from "./types";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function exportCanvas(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function rotateCanvas90(
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  offscreen.width = h;
  offscreen.height = w;
  const ctx = offscreen.getContext("2d")!;
  ctx.translate(h, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(sourceCanvas, 0, 0);
  return offscreen;
}

export function flipCanvasH(
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = sourceCanvas.width;
  offscreen.height = sourceCanvas.height;
  const ctx = offscreen.getContext("2d")!;
  ctx.translate(offscreen.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sourceCanvas, 0, 0);
  return offscreen;
}

export function flipCanvasV(
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = sourceCanvas.width;
  offscreen.height = sourceCanvas.height;
  const ctx = offscreen.getContext("2d")!;
  ctx.translate(0, offscreen.height);
  ctx.scale(1, -1);
  ctx.drawImage(sourceCanvas, 0, 0);
  return offscreen;
}

export function applyFilterToCanvas(
  sourceCanvas: HTMLCanvasElement,
  values: FilterValues,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = sourceCanvas.width;
  offscreen.height = sourceCanvas.height;
  const ctx = offscreen.getContext("2d")!;
  ctx.filter = buildCssFilter(values);
  ctx.drawImage(sourceCanvas, 0, 0);
  return offscreen;
}

export function buildCssFilter(values: FilterValues): string {
  return `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturate}%)`;
}
