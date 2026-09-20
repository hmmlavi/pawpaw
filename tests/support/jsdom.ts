import { vi } from "vitest";

export function mockObjectURLs() {
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-${++n}`);
  URL.revokeObjectURL = vi.fn();
}

export function mockMatchMedia(initialLight = false) {
  let matches = initialLight;
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mq = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: light)",
    addEventListener: vi.fn((_t: string, cb: (e: { matches: boolean }) => void) => {
      listeners.add(cb);
    }),
    removeEventListener: vi.fn((_t: string, cb: (e: { matches: boolean }) => void) => {
      listeners.delete(cb);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => mq),
  });
  return {
    mq,
    setLight(v: boolean) {
      matches = v;
      listeners.forEach((cb) => cb({ matches: v }));
    },
  };
}

export function mockImageSize(w: number, h: number, fail = false) {
  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = w;
    naturalHeight = h;
    _src = "";
    set src(v: string) {
      this._src = v;
      queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
    }
    get src() {
      return this._src;
    }
  }
  vi.stubGlobal("Image", MockImage);
}

export type CanvasCalls = {
  translate: number[][];
  rotate: number[];
  scale: number[][];
  drawImage: unknown[][];
  canvasSize: { w: number; h: number }[];
};

export function mockCanvas() {
  const calls: CanvasCalls = { translate: [], rotate: [], scale: [], drawImage: [], canvasSize: [] };
  const ctx = {
    translate: vi.fn((x: number, y: number) => {
      calls.translate.push([x, y]);
    }),
    rotate: vi.fn((r: number) => {
      calls.rotate.push(r);
    }),
    scale: vi.fn((x: number, y: number) => {
      calls.scale.push([x, y]);
    }),
    drawImage: vi.fn((...a: unknown[]) => {
      calls.drawImage.push(a);
    }),
    fillRect: vi.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high" as ImageSmoothingQuality,
    fillStyle: "",
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ) {
    calls.canvasSize.push({ w: this.width, h: this.height });
    cb(new Blob(["fake-jpeg"], { type: "image/jpeg" }));
  } as typeof HTMLCanvasElement.prototype.toBlob);
  return { ctx, calls };
}

export function mockViewportSize(w: number, h: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: w,
    height: h,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: w,
    bottom: h,
    toJSON: () => ({}),
  } as DOMRect);
  class MockRO {
    cb: () => void;
    constructor(cb: () => void) {
      this.cb = cb;
    }
    observe() {
      this.cb();
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", MockRO);
}
