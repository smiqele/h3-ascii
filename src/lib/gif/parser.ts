import { parseGIF, decompressFrames } from "gifuct-js";
import type { Layer } from "../../types/layer";
import { drawFrame } from "./renderer";

export type FrameObject = {
  delay: number;
  delayMs: number;
  disposalType: number;
  height: number;
  width: number;
  left: number;
  top: number;
  imageData: ImageData;
};

// ------------------------- Парсинг GIF -------------------------
export async function parseFileToFrames(file: File): Promise<FrameObject[]> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  return frames.map((f: any, i: number) => {
    const { delay, disposalType, dims, patch } = f;
    const { width, height, left, top } = dims;
    const imageData = new ImageData(new Uint8ClampedArray(patch), width, height);

    // ⚡️ Нормализация задержки
    let delayMs = delay * 10;
    if (delayMs < 20) delayMs = 100;
    if (delayMs > 200) delayMs = 100;

    console.log(`Frame #${i}: delay=${delay}, normalized=${delayMs}ms`);

    return {
      delay,
      delayMs,
      disposalType,
      width,
      height,
      left,
      top,
      imageData,
    };
  });
}

// ------------------------- Воспроизведение GIF -------------------------
export function playGif(
  frames: FrameObject[],
  ctx: CanvasRenderingContext2D,
  options: {
    outW: number;
    outH: number;
    blockSize: number;
    scale: number;
    canvasBg: string;
    layers: Layer[];
  },
  speed = 5 // 1..10, 5 — оригинальная скорость
) {
  let i = 0;
  let timeout: NodeJS.Timeout;

  function calculateDelay(frame: FrameObject) {
    const baseDelay = normalizeDelay(frame.delayMs);
    const minDelay = 1000 / 60; // 16.67ms → 60fps
    let delay = baseDelay;

    if (speed < 5) {
      // 1..5 → замедление: линейная интерполяция baseDelay → baseDelay*2
      const t = (5 - speed) / 4; // 0..1
      delay = baseDelay * (1 + t);
    } else if (speed > 5) {
      // 5..10 → ускорение: линейная интерполяция baseDelay → minDelay
      const t = (speed - 5) / 5; // 0..1
      delay = baseDelay * (1 - t) + minDelay * t;
    }

    console.log(`Frame #${i}: baseDelay=${baseDelay}ms, speed=${speed}, calculatedDelay=${delay.toFixed(2)}ms`);
    return delay;
  }

  function renderNext() {
    drawFrame(ctx, frames[i], options);
    const delay = calculateDelay(frames[i]);
    i = (i + 1) % frames.length;
    timeout = setTimeout(renderNext, delay);
  }

  renderNext();

  return () => clearTimeout(timeout);
}

// ------------------------- Вспомогательные функции -------------------------
function normalizeDelay(delayMs: number) {
  if (!delayMs || delayMs < 20) return 100;
  return delayMs;
}