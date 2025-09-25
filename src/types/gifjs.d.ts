// src/types/gifjs.d.ts
declare module "gif.js" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    workerScript?: string;
    width?: number;
    height?: number;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
  }

  export default class GIF {
    constructor(options?: GIFOptions);

    addFrame(image: CanvasImageSource, options?: AddFrameOptions): void;

    on(event: "finished", callback: (blob: Blob) => void): void;

    render(): void;
  }
}