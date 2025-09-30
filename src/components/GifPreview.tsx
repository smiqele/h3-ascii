"use client";

import React, { useRef, useEffect } from "react";
import { saveGif, playGif } from "../lib/gif";
import type { FrameObject } from "../lib/gif";
import type { Layer } from "../types/layer";

type Props = {
  frames: FrameObject[] | null;
  layers: Layer[];
  scale: number;
  blockSize: number;
  canvasBg: string;
  gifDims: { w: number; h: number } | null;
  speed: number; // 1..10, оригинальная скорость = 3
};

export function GifPreview({
  frames,
  layers,
  scale,
  blockSize,
  canvasBg,
  gifDims,
  speed,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!frames || !canvasRef.current || !gifDims) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const outW = Math.floor(gifDims.w * scale);
    const outH = Math.floor(gifDims.h * scale);
    canvas.width = outW;
    canvas.height = outH;

    // Вся логика скорости внутри playGif
    const stop = playGif(
      frames,
      ctx,
      {
        outW,
        outH,
        blockSize,
        scale,
        canvasBg,
        layers,
      },
      speed // 1..10, оригинальная скорость = 3
    );

    return () => stop();
  }, [frames, layers, scale, blockSize, canvasBg, gifDims, speed]);

  return (
    <div className="relative h-full flex items-center overflow-hidden">
      <div className="w-full flex justify-center items-center">
        {/* Кнопка сохранения */}
        <div className="absolute top-4 right-4 z-10">
          <button
            className="text-sm p-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-300 cursor-pointer"
            onClick={() =>
              frames &&
              saveGif(frames, layers, {
                scale,
                blockSize,
                canvasBg,
                gifDims: gifDims!,
                speed, // передаём ту же шкалу, что и для playGif
              })
            }
            disabled={!frames}
          >
            Сохранить 💾
          </button>
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
    </div>
  );
}