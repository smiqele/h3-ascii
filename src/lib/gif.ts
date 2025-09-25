import { parseGIF, decompressFrames } from "gifuct-js";

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

export async function parseFileToFrames(file: File): Promise<FrameObject[]> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  return frames.map((f: any) => {
    const { delay, disposalType, dims, patch } = f;
    const { width, height, left, top } = dims;
    const imageData = new ImageData(
      new Uint8ClampedArray(patch),
      width,
      height
    );

    return {
      delay,
      delayMs: delay * 10, // gifuct-js хранит задержку в сотых долях секунды
      disposalType,
      width,
      height,
      left,
      top,
      imageData,
    };
  });
}

export function playGif(
  frames: FrameObject[],
  drawFrame: (frame: FrameObject) => void,
  speed = 10
) {
  let i = 0;
  let timeout: NodeJS.Timeout;

  function renderNext() {
    drawFrame(frames[i]);
    const delay = (frames[i].delay || 10) * (10 / speed);
    i = (i + 1) % frames.length;
    timeout = setTimeout(renderNext, delay);
  }

  renderNext();

  return () => clearTimeout(timeout);
}