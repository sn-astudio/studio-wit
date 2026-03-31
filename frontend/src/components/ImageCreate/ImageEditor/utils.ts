import type { FilterValues } from "./types";
import { DEFAULT_FILTER_VALUES } from "./const";

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
  return (Object.keys(values) as Array<keyof FilterValues>)
    .map((key) => {
      const value = values[key];
      const name = CSS_FILTER_NAME[key] ?? key;
      const unit = FILTER_UNITS[key] ?? "%";
      return `${name}(${value}${unit})`;
    })
    .join(" ");
}

const CSS_FILTER_NAME: Partial<Record<keyof FilterValues, string>> = {
  hueRotate: "hue-rotate",
};

export const FILTER_UNITS: Partial<Record<keyof FilterValues, string>> = {
  hueRotate: "deg",
  blur: "px",
};

export function hasFilterChanges(values: FilterValues): boolean {
  return (Object.keys(DEFAULT_FILTER_VALUES) as Array<keyof FilterValues>).some(
    (key) => values[key] !== DEFAULT_FILTER_VALUES[key],
  );
}

export function resizeCanvas(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return offscreen;
}

export function applySharpen(
  sourceCanvas: HTMLCanvasElement,
  amount: number,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = sourceCanvas.width;
  offscreen.height = sourceCanvas.height;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  const src = new Uint8ClampedArray(data);
  const factor = amount / 10;
  // 3x3 sharpen kernel: center = 1 + 4*factor, edges = -factor
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val =
          src[idx + c] * (1 + 4 * factor) -
          src[((y - 1) * w + x) * 4 + c] * factor -
          src[((y + 1) * w + x) * 4 + c] * factor -
          src[(y * w + (x - 1)) * 4 + c] * factor -
          src[(y * w + (x + 1)) * 4 + c] * factor;
        data[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return offscreen;
}

export function applyVignette(
  sourceCanvas: HTMLCanvasElement,
  intensity: number,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = sourceCanvas.width;
  offscreen.height = sourceCanvas.height;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const w = offscreen.width;
  const h = offscreen.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.sqrt(cx * cx + cy * cy);

  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  gradient.addColorStop(0, `rgba(0,0,0,0)`);
  gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  return offscreen;
}

export function applyNoise(
  sourceCanvas: HTMLCanvasElement,
  amount: number,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = sourceCanvas.width;
  offscreen.height = sourceCanvas.height;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = imageData.data;
  const strength = amount * 2.55; // 0-100 → 0-255

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * strength;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
  return offscreen;
}

export function rotateCanvasFree(
  sourceCanvas: HTMLCanvasElement,
  degrees: number,
): HTMLCanvasElement {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const newW = Math.ceil(w * cos + h * sin);
  const newH = Math.ceil(w * sin + h * cos);

  const offscreen = document.createElement("canvas");
  offscreen.width = newW;
  offscreen.height = newH;
  const ctx = offscreen.getContext("2d")!;
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(sourceCanvas, -w / 2, -h / 2);
  return offscreen;
}
