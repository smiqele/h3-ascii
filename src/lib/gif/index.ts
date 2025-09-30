// src/lib/gif/index.ts

// Типы
export type { FrameObject } from "./parser";

// Парсинг и воспроизведение
export { parseFileToFrames, playGif } from "./parser";

// Отрисовка на канвасе
export { drawFrame } from "./renderer";

// Сохранение GIF
export { saveGif } from "./saver";