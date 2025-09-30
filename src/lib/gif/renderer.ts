import type { FrameObject } from "./parser";
import type { Layer } from "../../types/layer";
import { hexToRgb, colorDistance } from "../color/utils";

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: FrameObject,
  options: {
    outW: number;
    outH: number;
    blockSize: number;
    scale: number;
    canvasBg: string;
    layers: Layer[];
  }
) {
  const { width: w, height: h, imageData } = frame;
  const { outW, outH, blockSize, scale, canvasBg, layers } = options;

  const sx = outW / w;
  const sy = outH / h;

  // заливка фона канвы
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, outW, outH);

  // добавляем RGB для удобства
  const layersRGB = layers.map((l) => ({ ...l, rgb: hexToRgb(l.target) as [number, number, number] }));

  // оригинальный GIF слой
  const originalLayer = layersRGB.find((l) => l.id === -1 && l.visible);
  if (originalLayer) {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpCtx = tmpCanvas.getContext("2d");
    if (tmpCtx) tmpCtx.putImageData(frame.imageData, 0, 0);
    ctx.drawImage(tmpCanvas, 0, 0, outW, outH);
  }

  const cols = Math.ceil(w / blockSize);
  const rows = Math.ceil(h / blockSize);

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `${Math.max(6, blockSize * scale)}px monospace`;

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const sxPix = Math.min(w - 1, Math.floor(bx * blockSize + blockSize / 2));
      const syPix = Math.min(h - 1, Math.floor(by * blockSize + blockSize / 2));
      const idx = (syPix * w + sxPix) * 4;
      const pr = imageData.data[idx],
        pg = imageData.data[idx + 1],
        pb = imageData.data[idx + 2],
        pa = imageData.data[idx + 3];
      if (pa === 0) continue;

      let chosen: (Layer & { rgb: [number, number, number] }) | null = null;
      for (let li = layersRGB.length - 1; li >= 0; li--) {
        const lay = layersRGB[li];
        if (!lay.visible || lay.id === -1) continue;
        const dist = colorDistance([pr, pg, pb], lay.rgb);
        if (dist <= lay.spread) {
          chosen = lay;
          break;
        }
      }

      if (chosen) {
        const cx = (bx * blockSize + blockSize / 2) * sx;
        const cy = (by * blockSize + blockSize / 2) * sy;

        // рисуем фон только если включен bgEnabled (по умолчанию true)
        if ((chosen as any).bgEnabled ?? true) {
          ctx.fillStyle = chosen.bg;
          ctx.fillRect(cx - (blockSize * sx) / 2, cy - (blockSize * sy) / 2, blockSize * sx, blockSize * sy);
        }

        // рисуем символ
        ctx.fillStyle = chosen.fg;
        ctx.fillText(chosen.symbol, cx, cy);
      }
    }
  }
}