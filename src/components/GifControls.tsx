import React from "react";

type Props = {
  blockSize: number;
  scale: number;
  speed: number;
  canvasBg: string;
  setBlockSize: (v: number) => void;
  setScale: (v: number) => void;
  setSpeed: (v: number) => void;
  setCanvasBg: (v: string) => void;
};

export function GifControls({
  blockSize,
  scale,
  speed,
  canvasBg,
  setBlockSize,
  setScale,
  setSpeed,
  setCanvasBg,
}: Props) {
  return (
    <div className="flex items-center gap-6 p-2">
      {/* Размер блока */}
      <div className="flex items-center gap-2">
        <label className="text-sm w-20">Block size</label>
        <input
          type="range"
          min={2}
          max={16}
          value={blockSize}
          onChange={(e) => setBlockSize(Number(e.target.value))}
        />
        <span className="text-xs text-gray-500">{blockSize}</span>
      </div>

      {/* Масштаб */}
      <div className="flex items-center gap-2">
        <label className="text-sm w-12">Scale</label>
        <input
          type="range"
          min={1}
          max={2}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        />
        <span className="text-xs text-gray-500">{scale}×</span>
      </div>

      {/* Скорость */}
      <div className="flex items-center gap-2">
        <label className="text-sm w-12">Speed</label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span className="text-xs text-gray-500">{speed}</span>
      </div>

      {/* Цвет фона */}
      <div className="flex items-center gap-2">
        <label className="text-sm w-16">BG</label>
        <input
          type="color"
          value={canvasBg}
          onChange={(e) => setCanvasBg(e.target.value)}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
        />
      </div>
    </div>
  );
}