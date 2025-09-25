"use client";
import React, { useEffect, useRef, useState } from "react";
import type { FrameObject } from "../lib/gif";
import { parseFileToFrames, playGif } from "../lib/gif";
import GIF from "gif.js";
import { saveAs } from "file-saver";
import { Eye, EyeOff } from "lucide-react";

type Layer = {
  id: number;
  symbol: string;
  fg: string;
  bg: string;
  target: string;
  spread: number;
  visible: boolean;
};

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frames, setFrames] = useState<FrameObject[] | null>(null);
  const [blockSize, setBlockSize] = useState(8);
  const [scale, setScale] = useState(2);
  const [speed, setSpeed] = useState(10);
  const [canvasBg, setCanvasBg] = useState("#ffffff");
  const [layers, setLayers] = useState<Layer[]>(() => [
    { id: -1, symbol: "", fg: "#000000", bg: "#ffffff", target: "#000000", spread: 100, visible: false },
    { id: 0, symbol: "@", fg: "#000000", bg: "#ffffff", target: "#000000", spread: 100, visible: true },
    { id: 1, symbol: "#", fg: "#ffffff", bg: "#000000", target: "#ff0000", spread: 100, visible: true },
    { id: 2, symbol: "*", fg: "#000000", bg: "#ffffff", target: "#00ff00", spread: 100, visible: true },
    { id: 3, symbol: "%", fg: "#0000ff", bg: "#ffffff", target: "#0000ff", spread: 100, visible: false },
  ]);
  const [gifDims, setGifDims] = useState<{ w: number; h: number } | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifFiles, setGifFiles] = useState<string[]>([]);

  // ------------------------- API GIFs -------------------------
  useEffect(() => {
    fetch("/api/gifs")
      .then((res) => res.json())
      .then((urls: string[]) => {
        setGifFiles(urls);
        if (urls.length > 0) loadGifFromUrl(urls[0]);
      });
  }, []);

  async function loadGifFromUrl(url: string) {
    const res = await fetch(url);
    const blob = await res.blob();
    const parsed = await parseFileToFrames(new File([blob], "gif"));
    if (!parsed || parsed.length === 0) return;
    setFrames(parsed);
    setGifDims({ w: parsed[0].width, h: parsed[0].height });
    setGifUrl(url);
  }

  // ------------------------- Upload to Vercel Blob -------------------------
  async function uploadToVercelBlob(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Ошибка загрузки файла");
      const data = await res.json();
      return data.url || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // локальный preview
    setGifUrl(URL.createObjectURL(file));

    // парсим и показываем
    const parsed = await parseFileToFrames(file);
    if (!parsed || parsed.length === 0) {
      alert("Не удалось распарсить GIF или GIF пуст.");
      return;
    }
    setFrames(parsed);
    setGifDims({ w: parsed[0].width, h: parsed[0].height });

    // сразу загружаем в blob
    const uploadedUrl = await uploadToVercelBlob(file);
    if (uploadedUrl) {
      setGifUrl(uploadedUrl);
      setGifFiles((prev) => [uploadedUrl, ...prev]);
    }
  }

  // ------------------------- Цветовые функции -------------------------
  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  function colorDistance(a: [number, number, number], b: [number, number, number]) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // ------------------------- Render GIF -------------------------
  useEffect(() => {
    if (!frames || !canvasRef.current || !gifDims) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const outW = Math.floor(gifDims.w * scale);
    const outH = Math.floor(gifDims.h * scale);
    canvas.width = outW;
    canvas.height = outH;

    const layersRGB = layers.map((l) => ({ ...l, rgb: hexToRgb(l.target) as [number, number, number] }));

    function drawFrame(frame: FrameObject) {
      const { width: w, height: h, imageData } = frame;
      const sx = outW / w;
      const sy = outH / h;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, outW, outH);

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

          let chosen: Layer | null = null;
          for (let li = layersRGB.length - 1; li >= 0; li--) {
            const lay = layersRGB[li];
            if (!lay.visible || lay.id === -1) continue;
            const dist = colorDistance([pr, pg, pb], lay.rgb as [number, number, number]);
            if (dist <= lay.spread) {
              chosen = lay;
              break;
            }
          }

          if (chosen) {
            const cx = (bx * blockSize + blockSize / 2) * sx;
            const cy = (by * blockSize + blockSize / 2) * sy;
            ctx.fillStyle = chosen.bg;
            ctx.fillRect(cx - (blockSize * sx) / 2, cy - (blockSize * sy) / 2, blockSize * sx, blockSize * sy);
            ctx.fillStyle = chosen.fg;
            ctx.fillText(chosen.symbol, cx, cy);
          }
        }
      }
    }

    const stop = playGif(frames, drawFrame, speed);
    return () => stop();
  }, [frames, blockSize, layers, scale, gifDims, speed, canvasBg]);

  function updateLayer(id: number, patch: Partial<Layer>) {
    setLayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // ------------------------- Сохранение GIF -------------------------
  async function saveGif() {
  if (!frames || !canvasRef.current || !gifDims) return;

  const outW = Math.floor(gifDims.w * scale);
  const outH = Math.floor(gifDims.h * scale);
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: outW,
    height: outH,
    workerScript: "/gif.worker.js", // убедись, что файл есть в public
  });

  const layersRGB = layers.map((l) => ({ ...l, rgb: hexToRgb(l.target) as [number, number, number] }));
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = outW;
  tmpCanvas.height = outH;
  const tmpCtx = tmpCanvas.getContext("2d")!;

  frames.forEach((frame) => {
  const { width: w, height: h, imageData } = frame;

  // создаём временный canvas для кадра
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = outW;
  tmpCanvas.height = outH;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  
  // заливка фона
  tmpCtx.fillStyle = canvasBg;
  tmpCtx.fillRect(0, 0, outW, outH);

  // рисуем исходное изображение
  tmpCtx.putImageData(imageData, 0, 0);

  const cols = Math.ceil(w / blockSize);
  const rows = Math.ceil(h / blockSize);

  tmpCtx.textBaseline = "middle";
  tmpCtx.textAlign = "center";
  tmpCtx.font = `${Math.max(6, blockSize * scale)}px monospace`;

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

      let chosen: Layer | null = null;
      for (let li = layersRGB.length - 1; li >= 0; li--) {
        const lay = layersRGB[li];
        if (!lay.visible || lay.id === -1) continue;
        const dist = colorDistance([pr, pg, pb], lay.rgb as [number, number, number]);
        if (dist <= lay.spread) {
          chosen = lay;
          break;
        }
      }

      if (chosen) {
        const cx = (bx * blockSize + blockSize / 2) * (outW / w);
        const cy = (by * blockSize + blockSize / 2) * (outH / h);

        tmpCtx.fillStyle = chosen.bg;
        tmpCtx.fillRect(
          cx - (blockSize * (outW / w)) / 2,
          cy - (blockSize * (outH / h)) / 2,
          blockSize * (outW / w),
          blockSize * (outH / h)
        );

        tmpCtx.fillStyle = chosen.fg;
        tmpCtx.fillText(chosen.symbol, cx, cy);
      }
    }
  }

  const delay = (frame.delay || 100) / (speed / 10);

  // Передаём сам canvas, а не ctx
  gif.addFrame(tmpCanvas, { copy: true, delay });
});

  gif.on("finished", (blob: Blob) => {
    saveAs(blob, "ascii.gif");
  });

  gif.render();
}

  return (
    <div className="min-h-screen bg-gray-100 p-1">
      <div className="bg-white mx-auto flex rounded-lg border border-gray-200">
        {/* Панель превью GIF + загрузка */}
        <div className="p-2 border-r border-gray-200 w-32">
          {gifFiles.length > 0 && (
            <div className="flex flex-col gap-1 overflow-y-auto">
              {gifFiles.map((file) => (
                <div key={file} className="w-20 h-20">
                  <img
                    src={file}
                    className={`w-20 h-20 object-cover border-2 p-1 rounded cursor-pointer ${
                      file === gifUrl ? "border-blue-500" : "border-gray-100"
                    }`}
                    onClick={() => loadGifFromUrl(file)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Основной блок */}
        <div className="w-full bg-gray-200">
          {/* Настройки */}
          <div className="flex gap-3 p-4 bg-white border-b border-gray-200 pb-4">

            <div className="flex items-center gap-2">
              <span className="pr-2">Symbol size</span>
              <input type="range" min={4} max={32} value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} />
              <span className="w-12 text-sm">{blockSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="pr-2">Scale</span>
              <input type="range" min={0.5} max={2} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
              <span className="w-12 text-sm">{scale}×</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="pr-2">Speed</span>
              <input type="range" min={1} max={30} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              <span className="w-12 text-sm">{speed}×</span>
            </div>
            <div className="flex items-center gap-2 ms-auto">
              <span className="pr-2">Background</span>
              <div className="w-8 h-8 border relative border-gray-400 rounded-full overflow-hidden flex items-center justify-center z-20">
                <input
                  type="color"
                  className="w-16 h-16 absolute"
                  value={canvasBg}
                  onChange={(e) => setCanvasBg(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Канвас + сохранение */}
          <div className="relative h-[90%] flex items-center overflow-hidden">
            <div className="w-full flex justify-center items-center">
              
              <div className="absolute top-4 left-4 z-10">
                <label className="text-sm p-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-300 cursor-pointer">
                  Свой GIF
                  <input type="file" accept="image/gif" className="hidden" onChange={handleFile} />
                </label>
              </div>

              <div className="absolute top-4 right-4 z-10">
                <button
                  className="text-sm p-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-300 cursor-pointer"
                  onClick={saveGif}
                  disabled={!frames}
                >
                  Cохранить 💾
                </button>
              </div>
              
              <canvas ref={canvasRef} className="max-w-full" />
            </div>
          </div>
        </div>

        {/* Панель слоёв */}
        <aside className="w-[440px] border-l border-gray-200 flex flex-col justify-between">
          <div className="overflow-y-auto">
            {layers.slice(1).map((l) => (
              <div key={l.id} className="flex flex-col border-b border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-bold text-sm">#{l.id + 1}</div>
                  <button
                    className={`ml-auto text-sm ${l.visible ? "text-gray-700" : "text-gray-300"}`}
                    onClick={() => updateLayer(l.id, { visible: !l.visible })}
                  >
                    {l.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <label className="block text-sm pr-2 w-16">Symbol</label>
                  <input
                    className="w-8 h-8 p-1 border border-gray-400 rounded"
                    value={l.symbol}
                    onChange={(e) => updateLayer(l.id, { symbol: e.target.value || " " })}
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 border relative border-gray-400 rounded-full overflow-hidden flex items-center justify-center z-20">
                      <input type="color" className="w-16 h-16 absolute" value={l.fg} onChange={(e) => updateLayer(l.id, { fg: e.target.value })} />
                    </div>
                    <div className="w-8 h-8 border relative border-gray-400 rounded-full overflow-hidden flex items-center justify-center -translate-x-3 z-10">
                      <input type="color" className="w-16 h-16 absolute" value={l.bg} onChange={(e) => updateLayer(l.id, { bg: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="block text-sm pr-2 w-16">Target</label>
                  <div className="w-8 h-8 border relative border-gray-400 rounded-full overflow-hidden flex items-center justify-center z-20">
                    <input type="color" className="w-16 h-16 absolute" value={l.target} onChange={(e) => updateLayer(l.id, { target: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      className="w-20"
                      min={0}
                      max={500}
                      value={l.spread}
                      onChange={(e) => updateLayer(l.id, { spread: Number(e.target.value) })}
                    />
                    <div className="ml-2 text-xs text-gray-500">Spread: {l.spread.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {gifUrl && (
            <div className="p-4 flex flex-col items-center">
              <div className="w-full flex items-center gap-2 mb-2">
                <div className="font-bold text-sm">Original GIF</div>
                <button
                  className={`ml-auto text-sm ${layers.find((l) => l.id === -1)?.visible ? "text-gray-700" : "text-gray-300"}`}
                  onClick={() => updateLayer(-1, { visible: !(layers.find((l) => l.id === -1)?.visible) })}
                >
                  {layers.find((l) => l.id === -1)?.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              <img src={gifUrl} alt="original gif" className="max-w-full rounded" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}