"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type EditorAspect = { label: string; value: number | null };

type Props = {
  /** Original image source (object URL, data URL or remote URL). Never mutated. */
  src: string;
  title?: string;
  aspects?: EditorAspect[];
  initialAspect?: number;
  /** "circle" overlays the avatar mask so framing matches the final avatar shape. */
  shape?: "rect" | "circle";
  /** Long-edge pixel size of the exported image. */
  outputSize?: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function ImageEditor({
  src,
  title = "Adjust image",
  aspects = [{ label: "Square", value: 1 }],
  initialAspect = 0,
  shape = "rect",
  outputSize = 1200,
  onConfirm,
  onCancel,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [aspectIdx, setAspectIdx] = useState(initialAspect);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0); // quarter turns clockwise
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const iw0 = img?.naturalWidth ?? 1;
  const ih0 = img?.naturalHeight ?? 1;
  const swapped0 = rot % 2 === 1;
  const picked = aspects[aspectIdx]?.value;
  const aspect = picked ?? (img ? (swapped0 ? ih0 / iw0 : iw0 / ih0) : 1);

  // Load the source image (original is preserved; we only read pixels).
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => alive && setImg(image);
    image.onerror = () => alive && setLoadError(true);
    image.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCancel]);

  // Measure the crop viewport after layout / aspect changes.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setVpSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, img]);

  // Cover-fit base size of the image inside the viewport (accounts for rotation).
  const iw = img?.naturalWidth ?? 1;
  const ih = img?.naturalHeight ?? 1;
  const swapped = rot % 2 === 1;
  const rw = swapped ? ih : iw;
  const rh = swapped ? iw : ih;
  const cover = vpSize.w > 0 && vpSize.h > 0 ? Math.max(vpSize.w / rw, vpSize.h / rh) : 0;
  const baseW = iw * cover;
  const baseH = ih * cover;
  const drawnW = (swapped ? baseH : baseW) * scale;
  const drawnH = (swapped ? baseW : baseH) * scale;
  const maxX = Math.max(0, (drawnW - vpSize.w) / 2);
  const maxY = Math.max(0, (drawnH - vpSize.h) / 2);

  const clampOffset = useCallback(
    (x: number, y: number) => ({
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }),
    [maxX, maxY],
  );

  // Derived clamped offset — always keeps the image covering the viewport,
  // including right after zoom/rotation/aspect changes.
  const clampedOffset = clampOffset(offset.x, offset.y);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX - clampedOffset.x, y: e.clientY - clampedOffset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clampOffset(e.clientX - d.x, e.clientY - d.y));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const rotate = (dir: 1 | -1) => setRot((r) => (r + dir + 4) % 4);
  const reset = () => {
    setScale(1);
    setRot(0);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = async () => {
    if (!img || vpSize.w === 0 || saving) return;
    setSaving(true);
    try {
      const a = aspect;
      const outW = a >= 1 ? outputSize : Math.round(outputSize * a);
      const outH = a >= 1 ? Math.round(outputSize / a) : outputSize;
      const ratio = outW / vpSize.w;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-canvas");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      // Mirror the on-screen transform exactly: translate · rotate · scale.
      ctx.translate(outW / 2 + clampedOffset.x * ratio, outH / 2 + clampedOffset.y * ratio);
      ctx.rotate((rot * Math.PI) / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(img, (-baseW * ratio) / 2, (-baseH * ratio) / 2, baseW * ratio, baseH * ratio);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("encode-failed");
      onConfirm(blob);
    } catch {
      toast.error("Could not process this image. Try another one.");
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-veil fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade"
      onClick={onCancel}
    >
      <div
        className="glass-deep glass-sheen flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/7 px-5 py-4">
          <div>
            <h2 className="card-title text-lg font-bold">{title}</h2>
            <p className="text-faint text-xs">Drag to reposition · zoom to frame · exactly what you see is saved</p>
          </div>
          <button
            onClick={onCancel}
            className="glass-hair flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {aspects.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {aspects.map((a, i) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setAspectIdx(i);
                    setOffset({ x: 0, y: 0 });
                  }}
                  className="chip"
                  data-active={i === aspectIdx}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <div
              ref={viewportRef}
              onPointerDown={img ? onPointerDown : undefined}
              onPointerMove={img ? onPointerMove : undefined}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
              className={cn(
                "no-touch relative w-full cursor-grab overflow-hidden bg-black/50 active:cursor-grabbing",
                shape === "circle" ? "rounded-[26px]" : "rounded-2xl border border-white/10",
              )}
              style={{ aspectRatio: `${aspect}`, width: `min(100%, calc(46dvh * ${aspect}))` }}
            >
              {!img && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                </div>
              )}
              {loadError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <p className="text-sm text-white/70">Couldn&apos;t load this image. Please try another file.</p>
                </div>
              )}
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: baseW,
                    height: baseH,
                    transform: `translate(calc(-50% + ${clampedOffset.x}px), calc(-50% + ${clampedOffset.y}px)) rotate(${rot * 90}deg) scale(${scale})`,
                  }}
                />
              )}
              {/* framing guides */}
              {img && shape === "rect" && (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
                </div>
              )}
              {img && shape === "circle" && (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  <div
                    className="absolute inset-0 bg-black/55"
                    style={{
                      maskImage: "radial-gradient(circle at center, transparent 49.5%, black 50.5%)",
                      WebkitMaskImage: "radial-gradient(circle at center, transparent 49.5%, black 50.5%)",
                    }}
                  />
                  <div className="absolute inset-[3px] rounded-full border-2 border-dashed border-white/70" />
                </div>
              )}
            </div>
          </div>

          {/* controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - 0.25).toFixed(2)))}
                className="glass-hair flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#8fb9dc]"
                aria-label="Zoom"
              />
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + 0.25).toFixed(2)))}
                className="glass-hair flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => rotate(-1)} className="chip flex-1 justify-center !py-2">
                <RotateCcw className="h-3.5 w-3.5" /> Rotate
              </button>
              <button type="button" onClick={() => rotate(1)} className="chip flex-1 justify-center !py-2">
                <RotateCw className="h-3.5 w-3.5" /> Rotate
              </button>
              <button type="button" onClick={reset} className="chip flex-1 justify-center !py-2">
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/7 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={onCancel} className="btn-ghost text-sm">
            Cancel
          </button>
          <button onClick={confirm} disabled={!img || saving} className="btn-primary text-sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4" /> Use photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
