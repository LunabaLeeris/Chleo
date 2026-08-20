import React, { useCallback, useEffect, useRef, useState } from "react";
import { PART_RENDER_ORDER } from "../../src/avatar";
import type { ChleoExpression, PartName } from "../../src/avatar";
import { Button, PanelSection, Select } from "./ui";

const SIZE = 64;
const FPS = 12;
const FRAME_MS = 1000 / FPS;
const ZOOM_MIN = 4;
const ZOOM_MAX = 24;
const ZOOM_DEFAULT = 8;
const STORAGE_KEY = "chleo-playground-sprite-clip";

const EXPRESSIONS: ChleoExpression[] = [
  "idle",
  "blink",
  "speak",
  "sleep",
  "close_eyes",
  "angry",
  "yawn",
  "focused",
  "happy",
  "question",
];

const EXPRESSION_PARTS: Record<ChleoExpression, PartName[]> = {
  idle: ["body", "eyes", "mouth", "eyebrows"],
  blink: ["eyes"],
  speak: ["mouth"],
  sleep: ["body", "eyes"],
  close_eyes: ["eyes"],
  angry: ["eyebrows"],
  yawn: ["mouth", "eyes"],
  focused: ["eyes", "eyebrows"],
  happy: ["eyes", "eyebrows"],
  question: ["eyes", "eyebrows"],
};

function expressionLabel(name: ChleoExpression): string {
  return name.replace("_", " ");
}

type Rgba = [number, number, number, number];
type Tool = "pencil" | "fill";

const PALETTE: { id: string; rgba: Rgba }[] = [
  { id: "erase", rgba: [0, 0, 0, 0] },
  { id: "ink", rgba: [45, 36, 36, 255] },
  { id: "white", rgba: [255, 255, 255, 255] },
  { id: "skin", rgba: [255, 214, 170, 255] },
  { id: "pink", rgba: [244, 114, 182, 255] },
  { id: "red", rgba: [220, 38, 38, 255] },
  { id: "orange", rgba: [249, 115, 22, 255] },
  { id: "yellow", rgba: [250, 204, 21, 255] },
  { id: "green", rgba: [34, 197, 94, 255] },
  { id: "cyan", rgba: [6, 182, 212, 255] },
  { id: "blue", rgba: [37, 99, 235, 255] },
  { id: "purple", rgba: [139, 92, 246, 255] },
  { id: "brown", rgba: [120, 53, 15, 255] },
  { id: "gray", rgba: [148, 163, 184, 255] },
];

type ClipMap = Record<PartName, string[]>;
type ExpressionClipMap = Record<ChleoExpression, ClipMap>;

interface StoredClipV3 {
  v: 3;
  expression: ChleoExpression;
  part: PartName;
  fps: number;
  clips: Partial<Record<ChleoExpression, Partial<ClipMap>>>;
}

interface SpriteEditorProps {
  onApply: (
    part: PartName,
    expression: ChleoExpression,
    frames: string[],
    fps: number,
  ) => void | string | Promise<void | string>;
  onResetPart: (
    part: PartName,
    expression: ChleoExpression,
  ) => void | string | Promise<void | string>;
  onExpressionChange?: (expression: ChleoExpression) => void;
}

function blankDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  return canvas.toDataURL("image/png");
}

function dataUrlFromImageData(data: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d")?.putImageData(data, 0, 0);
  return canvas.toDataURL("image/png");
}

function loadImageData(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d context"));
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      resolve(ctx.getImageData(0, 0, SIZE, SIZE));
    };
    img.onerror = () => reject(new Error("frame load failed"));
    img.src = src;
  });
}

function setPixel(data: ImageData, x: number, y: number, rgba: Rgba): void {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  data.data[i] = rgba[0];
  data.data[i + 1] = rgba[1];
  data.data[i + 2] = rgba[2];
  data.data[i + 3] = rgba[3];
}

function pixelAt(data: ImageData, x: number, y: number): Rgba {
  const i = (y * SIZE + x) * 4;
  return [data.data[i], data.data[i + 1], data.data[i + 2], data.data[i + 3]];
}

function sameRgba(a: Rgba, b: Rgba): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function paintLine(
  data: ImageData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgba: Rgba,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  let plotting = true;
  while (plotting) {
    setPixel(data, x, y, rgba);
    if (x === x1 && y === y1) {
      plotting = false;
      continue;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function floodFill(data: ImageData, x: number, y: number, rgba: Rgba): void {
  const target = pixelAt(data, x, y);
  if (sameRgba(target, rgba)) return;
  const stack: number[] = [x, y];
  while (stack.length) {
    const cy = stack.pop() as number;
    const cx = stack.pop() as number;
    if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) continue;
    if (!sameRgba(pixelAt(data, cx, cy), target)) continue;
    setPixel(data, cx, cy, rgba);
    stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
  }
}

function emptyClips(): ClipMap {
  const blank = blankDataUrl();
  return {
    body: [blank],
    eyes: [blank],
    mouth: [blank],
    eyebrows: [blank],
  };
}

function patchClip(
  map: ExpressionClipMap,
  expr: ChleoExpression,
  partName: PartName,
  frames: string[],
): ExpressionClipMap {
  return {
    ...map,
    [expr]: {
      ...map[expr],
      [partName]: frames,
    },
  };
}

function emptyExpressionClips(): ExpressionClipMap {
  const out = {} as ExpressionClipMap;
  for (const expression of EXPRESSIONS) {
    out[expression] = emptyClips();
  }
  return out;
}

const HIST_MAX = 40;

interface HistSnap {
  clips: ExpressionClipMap;
  expression: ChleoExpression;
  part: PartName;
  index: number;
}

function cloneClips(map: ExpressionClipMap): ExpressionClipMap {
  return JSON.parse(JSON.stringify(map)) as ExpressionClipMap;
}

function loadStore(): {
  expression: ChleoExpression;
  part: PartName;
  clips: ExpressionClipMap;
} {
  const clips = emptyExpressionClips();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { expression: "idle", part: "body", clips };
    const parsed = JSON.parse(raw) as StoredClipV3 & {
      v?: number;
      frames?: string[];
      clips?: unknown;
    };
    if (parsed.v === 3 && parsed.clips) {
      for (const expression of EXPRESSIONS) {
        const byPart = parsed.clips[expression];
        if (!byPart) continue;
        for (const name of PART_RENDER_ORDER) {
          const frames = byPart[name];
          if (Array.isArray(frames) && frames.length > 0)
            clips[expression][name] = frames;
        }
      }
      const expression = EXPRESSIONS.includes(parsed.expression)
        ? parsed.expression
        : "idle";
      const allowed = EXPRESSION_PARTS[expression];
      const part = allowed.includes(parsed.part) ? parsed.part : allowed[0];
      return { expression, part, clips };
    }
    if (parsed.v === 2 && parsed.clips && typeof parsed.clips === "object") {
      const v2 = parsed.clips as Partial<ClipMap>;
      for (const name of PART_RENDER_ORDER) {
        const frames = v2[name];
        if (Array.isArray(frames) && frames.length > 0)
          clips.idle[name] = frames;
      }
      const part = PART_RENDER_ORDER.includes(parsed.part)
        ? parsed.part
        : "body";
      return { expression: "idle", part, clips };
    }
    if (Array.isArray(parsed.frames) && parsed.frames.length > 0) {
      const part = PART_RENDER_ORDER.includes(parsed.part)
        ? parsed.part
        : "body";
      clips.idle[part] = parsed.frames;
      return { expression: "idle", part, clips };
    }
  } catch {
    void 0;
  }
  return { expression: "idle", part: "body", clips };
}

function scratchFrom(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d")?.putImageData(data, 0, 0);
  return canvas;
}

export const SpriteEditor: React.FC<SpriteEditorProps> = ({
  onApply,
  onResetPart,
  onExpressionChange,
}) => {
  const initial = useRef(loadStore()).current;
  const [clips, setClips] = useState<ExpressionClipMap>(initial.clips);
  const [expression, setExpression] = useState<ChleoExpression>(
    initial.expression,
  );
  const [part, setPart] = useState<PartName>(initial.part);
  const [index, setIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(ZOOM_DEFAULT);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<Rgba>(PALETTE[1].rgba);
  const [onionPrev, setOnionPrev] = useState<boolean>(true);
  const [onionNext, setOnionNext] = useState<boolean>(true);
  const [onionParts, setOnionParts] = useState<boolean>(true);
  const [playing, setPlaying] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  const frames = clips[expression]?.[part] ?? [blankDataUrl()];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pixelsRef = useRef<ImageData>(new ImageData(SIZE, SIZE));
  const onionLayersRef = useRef<{
    prev: ImageData | null;
    next: ImageData | null;
    parts: ImageData[];
  }>({
    prev: null,
    next: null,
    parts: [],
  });
  const drawingRef = useRef<boolean>(false);
  const panningRef = useRef<boolean>(false);
  const spaceRef = useRef<boolean>(false);
  const lastPixRef = useRef<{ x: number; y: number } | null>(null);
  const panLastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const playTimerRef = useRef<number | null>(null);
  const skipReloadRef = useRef<boolean>(false);
  const historyRef = useRef<{ undo: HistSnap[]; redo: HistSnap[] }>({
    undo: [],
    redo: [],
  });
  const undoRef = useRef<(() => void) | null>(null);
  const redoRef = useRef<(() => void) | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const indexRef = useRef(index);
  const framesRef = useRef(frames);
  const expressionRef = useRef(expression);
  const partRef = useRef(part);
  const clipsRef = useRef(clips);

  indexRef.current = index;
  framesRef.current = frames;
  expressionRef.current = expression;
  partRef.current = part;
  clipsRef.current = clips;
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    onExpressionChange?.(expression);
  }, []);

  const viewportSize = () => {
    const vp = viewportRef.current;
    if (!vp) return { w: 0, h: 0 };
    return { w: vp.clientWidth, h: vp.clientHeight };
  };

  const clampPan = (x: number, y: number, z: number) => {
    const { w, h } = viewportSize();
    const world = SIZE * z;
    const next = { x, y };
    if (world <= w) next.x = (w - world) / 2;
    else next.x = Math.min(0, Math.max(w - world, x));
    if (world <= h) next.y = (h - world) / 2;
    else next.y = Math.min(0, Math.max(h - world, y));
    return next;
  };

  const applyPan = (x: number, y: number, z: number = zoomRef.current) => {
    const next = clampPan(x, y, z);
    panRef.current = next;
    setPan(next);
    return next;
  };

  const zoomAt = (nextZoom: number, viewX: number, viewY: number) => {
    const z = zoomRef.current;
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    if (clamped === z) return;
    const px = (viewX - panRef.current.x) / z;
    const py = (viewY - panRef.current.y) / z;
    zoomRef.current = clamped;
    setZoom(clamped);
    applyPan(viewX - px * clamped, viewY - py * clamped, clamped);
  };

  const persist = useCallback(
    (
      nextClips: ExpressionClipMap,
      nextPart: PartName,
      nextExpression: ChleoExpression,
    ) => {
      try {
        const payload: StoredClipV3 = {
          v: 3,
          expression: nextExpression,
          part: nextPart,
          fps: FPS,
          clips: nextClips,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        void 0;
      }
    },
    [],
  );

  const writeClips = useCallback(
    (
      nextClips: ExpressionClipMap,
      nextPart: PartName = part,
      nextExpression: ChleoExpression = expression,
    ) => {
      setClips(nextClips);
      persist(nextClips, nextPart, nextExpression);
    },
    [part, expression, persist],
  );

  const bumpHist = () => {
    setCanUndo(historyRef.current.undo.length > 0);
    setCanRedo(historyRef.current.redo.length > 0);
  };

  const takeSnap = (): HistSnap => ({
    clips: cloneClips(clipsRef.current),
    expression: expressionRef.current,
    part: partRef.current,
    index: indexRef.current,
  });

  const pushHistory = () => {
    const hist = historyRef.current;
    hist.undo.push(takeSnap());
    if (hist.undo.length > HIST_MAX) hist.undo.shift();
    hist.redo = [];
    bumpHist();
  };

  const restoreSnap = (snap: HistSnap) => {
    skipReloadRef.current = false;
    writeClips(snap.clips, snap.part, snap.expression);
    setExpression(snap.expression);
    setPart(snap.part);
    setIndex(snap.index);
    onExpressionChange?.(snap.expression);
  };

  const paintCanvas = useCallback((pixels: ImageData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const onion = onionLayersRef.current;
    const drawGhost = (data: ImageData, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(scratchFrom(data), 0, 0);
    };

    for (const layer of onion.parts) drawGhost(layer, 0.28);
    if (onion.prev) drawGhost(onion.prev, 0.4);
    if (onion.next) drawGhost(onion.next, 0.4);
    ctx.globalAlpha = 1;
    ctx.drawImage(scratchFrom(pixels), 0, 0);
  }, []);

  const commitFrame = useCallback(
    (pixels: ImageData, frameIndex: number, srcs: string[]) => {
      const next = srcs.slice();
      next[frameIndex] = dataUrlFromImageData(pixels);
      skipReloadRef.current = true;
      const nextClips = patchClip(
        clipsRef.current,
        expressionRef.current,
        partRef.current,
        next,
      );
      writeClips(nextClips);
      return next;
    },
    [writeClips],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const srcs = frames;
      const showOnion = !playing;

      const loadOnion = async () => {
        const layers = {
          prev: null as ImageData | null,
          next: null as ImageData | null,
          parts: [] as ImageData[],
        };
        if (!showOnion) return layers;
        if (onionPrev && index > 0) {
          layers.prev = await loadImageData(srcs[index - 1]);
        }
        if (onionNext && index < srcs.length - 1) {
          layers.next = await loadImageData(srcs[index + 1]);
        }
        if (onionParts) {
          const map = clipsRef.current[expressionRef.current];
          for (const name of PART_RENDER_ORDER) {
            if (name === partRef.current) continue;
            const other = map?.[name];
            if (!other || other.length === 0) continue;
            const src = other[Math.min(index, other.length - 1)] ?? other[0];
            if (!src) continue;
            try {
              layers.parts.push(await loadImageData(src));
            } catch {
              void 0;
            }
          }
        }
        return layers;
      };

      if (skipReloadRef.current) {
        skipReloadRef.current = false;
        onionLayersRef.current = await loadOnion();
        if (!cancelled) paintCanvas(pixelsRef.current);
        return;
      }

      const pixels = await loadImageData(srcs[index] ?? blankDataUrl());
      const layers = await loadOnion();
      if (cancelled) return;
      pixelsRef.current = pixels;
      onionLayersRef.current = layers;
      paintCanvas(pixels);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [frames, index, onionPrev, onionNext, onionParts, playing, paintCanvas]);

  useEffect(() => {
    return () => {
      if (playTimerRef.current !== null)
        window.clearInterval(playTimerRef.current);
    };
  }, []);

  const canvasPixel = (e: React.PointerEvent) => {
    const vp = viewportRef.current;
    if (!vp) return null;
    const rect = vp.getBoundingClientRect();
    const z = zoomRef.current;
    const p = panRef.current;
    const x = Math.floor((e.clientX - rect.left - p.x) / z);
    const y = Math.floor((e.clientY - rect.top - p.y) / z);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panMode = e.button === 1 || e.button === 2 || spaceRef.current;
    if (panMode) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      panningRef.current = true;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (playing || e.button !== 0) return;
    const pt = canvasPixel(e);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPixRef.current = pt;
    pushHistory();
    const pixels = pixelsRef.current;
    if (tool === "fill") {
      floodFill(pixels, pt.x, pt.y, color);
    } else {
      setPixel(pixels, pt.x, pt.y, color);
    }
    paintCanvas(pixels);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panningRef.current) {
      const dx = e.clientX - panLastRef.current.x;
      const dy = e.clientY - panLastRef.current.y;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      applyPan(panRef.current.x + dx, panRef.current.y + dy);
      return;
    }
    if (!drawingRef.current || playing || tool !== "pencil") return;
    const pt = canvasPixel(e);
    if (!pt) return;
    const last = lastPixRef.current ?? pt;
    paintLine(pixelsRef.current, last.x, last.y, pt.x, pt.y, color);
    lastPixRef.current = pt;
    paintCanvas(pixelsRef.current);
  };

  const handlePointerUp = () => {
    if (panningRef.current) {
      panningRef.current = false;
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPixRef.current = null;
    commitFrame(pixelsRef.current, index, frames);
  };

  const fitView = () => {
    const { w, h } = viewportSize();
    if (!w || !h) return;
    const z = Math.max(
      ZOOM_MIN,
      Math.min(ZOOM_MAX, Math.floor(Math.min(w, h) / SIZE)),
    );
    zoomRef.current = z;
    setZoom(z);
    applyPan(0, 0, z);
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const step = e.deltaY < 0 ? 1 : -1;
      zoomAt(
        zoomRef.current + step,
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "SELECT" ||
          e.target.tagName === "TEXTAREA");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redoRef.current?.();
        else undoRef.current?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        redoRef.current?.();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        spaceRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === "undefined") {
      fitView();
      return;
    }
    const ro = new ResizeObserver(() => {
      if (vp.clientWidth > 0) applyPan(panRef.current.x, panRef.current.y);
    });
    ro.observe(vp);
    requestAnimationFrame(() => fitView());
    return () => ro.disconnect();
  }, []);

  const stopPlay = () => {
    if (playTimerRef.current !== null) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setPlaying(false);
  };

  const undo = () => {
    const hist = historyRef.current;
    const prev = hist.undo.pop();
    if (!prev) return;
    if (playing) stopPlay();
    hist.redo.push(takeSnap());
    restoreSnap(prev);
    bumpHist();
  };

  const redo = () => {
    const hist = historyRef.current;
    const next = hist.redo.pop();
    if (!next) return;
    if (playing) stopPlay();
    hist.undo.push(takeSnap());
    restoreSnap(next);
    bumpHist();
  };

  undoRef.current = undo;
  redoRef.current = redo;

  const goTo = (nextIndex: number) => {
    if (playing) stopPlay();
    setIndex(Math.max(0, Math.min(frames.length - 1, nextIndex)));
  };

  const addFrame = () => {
    if (playing) stopPlay();
    pushHistory();
    const next = frames.slice();
    next.splice(index + 1, 0, blankDataUrl());
    writeClips(patchClip(clips, expression, part, next));
    setIndex(index + 1);
  };

  const duplicateFrame = () => {
    if (playing) stopPlay();
    pushHistory();
    const next = frames.slice();
    next.splice(index + 1, 0, frames[index] ?? blankDataUrl());
    writeClips(patchClip(clips, expression, part, next));
    setIndex(index + 1);
  };

  const deleteFrame = () => {
    if (playing) stopPlay();
    pushHistory();
    if (frames.length <= 1) {
      writeClips(patchClip(clips, expression, part, [blankDataUrl()]));
      setIndex(0);
      return;
    }
    const next = frames.filter((_, i) => i !== index);
    writeClips(patchClip(clips, expression, part, next));
    setIndex(Math.min(index, next.length - 1));
  };

  const clearFrame = () => {
    if (playing) stopPlay();
    pushHistory();
    const blank = new ImageData(SIZE, SIZE);
    pixelsRef.current = blank;
    paintCanvas(blank);
    commitFrame(blank, index, frames);
  };

  const resetClip = async () => {
    stopPlay();
    pushHistory();
    skipReloadRef.current = false;
    writeClips(patchClip(clips, expression, part, [blankDataUrl()]));
    setIndex(0);
    const note = await onResetPart(part, expression);
    setStatus(note || `Reset ${part} ${expressionLabel(expression)}`);
  };

  const changePart = (nextPart: PartName) => {
    if (nextPart === part) return;
    if (playing) stopPlay();
    const committed = frames.slice();
    committed[index] = dataUrlFromImageData(pixelsRef.current);
    skipReloadRef.current = false;
    writeClips(patchClip(clips, expression, part, committed), nextPart);
    setPart(nextPart);
    setIndex(0);
  };

  const changeExpression = (nextExpression: ChleoExpression) => {
    if (nextExpression === expression) return;
    if (playing) stopPlay();
    const committed = frames.slice();
    committed[index] = dataUrlFromImageData(pixelsRef.current);
    skipReloadRef.current = false;
    const allowed = EXPRESSION_PARTS[nextExpression];
    const nextPart = allowed.includes(part) ? part : allowed[0];
    writeClips(
      patchClip(clips, expression, part, committed),
      nextPart,
      nextExpression,
    );
    setExpression(nextExpression);
    setPart(nextPart);
    setIndex(0);
    onExpressionChange?.(nextExpression);
  };

  const nudgeZoom = (delta: number) => {
    const { w, h } = viewportSize();
    zoomAt(zoomRef.current + delta, w / 2, h / 2);
  };

  const togglePlay = () => {
    if (playing) {
      stopPlay();
      return;
    }
    setPlaying(true);
    playTimerRef.current = window.setInterval(() => {
      const srcs = framesRef.current;
      const next = (indexRef.current + 1) % srcs.length;
      indexRef.current = next;
      setIndex(next);
    }, FRAME_MS);
  };

  const handleApply = async () => {
    if (playing) stopPlay();
    const committed = commitFrame(pixelsRef.current, index, frames);
    const note = await onApply(part, expression, committed, FPS);
    setStatus(
      note ||
        `Applied ${committed.length}f → ${part} / ${expressionLabel(expression)}`,
    );
  };

  const handleApplyAll = async () => {
    if (playing) stopPlay();
    const committed = commitFrame(pixelsRef.current, index, frames);
    const map = patchClip(clipsRef.current, expression, part, committed);
    const parts = EXPRESSION_PARTS[expression];
    let offline = false;
    for (const name of parts) {
      const srcs = map[expression]?.[name] ?? [blankDataUrl()];
      const note = await onApply(name, expression, srcs, FPS);
      if (note?.includes("offline")) offline = true;
    }
    const label = `${parts.join(", ")} / ${expressionLabel(expression)}`;
    setStatus(
      offline
        ? `Applied ${label} · overlay offline`
        : `Applied ${label} · overlay updated`,
    );
  };

  return (
    <PanelSection title="Sprite" bgVariant="activity">
      <div className="sprite-editor">
        <div
          ref={viewportRef}
          className="sprite-editor-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="sprite-editor-stage"
            style={{
              width: SIZE * zoom,
              height: SIZE * zoom,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              ["--grid-cell" as string]: `${zoom}px`,
            }}
          >
            <canvas
              ref={canvasRef}
              className="sprite-editor-canvas"
              width={SIZE}
              height={SIZE}
            />
            <div className="sprite-editor-grid" aria-hidden="true" />
          </div>
        </div>

        <div className="sprite-editor-row">
          <Button
            variant="secondary"
            onClick={() => nudgeZoom(-1)}
            disabled={zoom <= ZOOM_MIN}
            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
          >
            −
          </Button>
          <span className="sprite-frame-label">{zoom}×</span>
          <Button
            variant="secondary"
            onClick={() => nudgeZoom(1)}
            disabled={zoom >= ZOOM_MAX}
            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
          >
            +
          </Button>
          <Button
            variant="secondary"
            onClick={fitView}
            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
          >
            Fit
          </Button>
          <span className="sprite-frame-label">
            scroll zoom · right-drag pan
          </span>
          <Button
            variant={tool === "pencil" ? "primary" : "secondary"}
            onClick={() => setTool("pencil")}
            style={{ flex: 1, padding: "6px 4px", fontSize: "0.75rem" }}
          >
            Pencil
          </Button>
          <Button
            variant={tool === "fill" ? "primary" : "secondary"}
            onClick={() => setTool("fill")}
            style={{ flex: 1, padding: "6px 4px", fontSize: "0.75rem" }}
          >
            Fill
          </Button>
        </div>
        <div className="sprite-editor-row">
          <span className="sprite-frame-label">Onion</span>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={onionPrev}
              onChange={(e) => setOnionPrev(e.target.checked)}
              disabled={playing}
            />
            Prev frame
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={onionNext}
              onChange={(e) => setOnionNext(e.target.checked)}
              disabled={playing}
            />
            Next frame
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={onionParts}
              onChange={(e) => setOnionParts(e.target.checked)}
              disabled={playing}
            />
            Other parts
          </label>
        </div>

        <div
          className="sprite-palette"
          role="listbox"
          aria-label="Color palette"
        >
          {PALETTE.map((swatch) => {
            const isErase = swatch.rgba[3] === 0;
            const selected = sameRgba(color, swatch.rgba);
            return (
              <button
                key={swatch.id}
                type="button"
                className={`sprite-swatch ${selected ? "active" : ""} ${isErase ? "erase" : ""}`}
                title={swatch.id}
                style={
                  isErase
                    ? undefined
                    : { backgroundColor: `rgba(${swatch.rgba.join(",")})` }
                }
                onClick={() => setColor(swatch.rgba)}
              />
            );
          })}
        </div>

        <div className="sprite-timeline" aria-label="Frame strip">
          {frames.map((src, i) => (
            <button
              key={i}
              type="button"
              className={`sprite-thumb ${i === index ? "active" : ""}`}
              onClick={() => goTo(i)}
              title={`Frame ${i + 1}`}
            >
              <img src={src} alt="" width={SIZE} height={SIZE} />
            </button>
          ))}
        </div>

        <div className="sprite-editor-row">
          <Button
            variant="secondary"
            onClick={() => goTo(index - 1)}
            disabled={index <= 0}
            style={{ padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            onClick={() => goTo(index + 1)}
            disabled={index >= frames.length - 1}
            style={{ padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Next
          </Button>
          <Button
            variant="secondary"
            onClick={addFrame}
            style={{ padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Add
          </Button>
          <Button
            variant="secondary"
            onClick={duplicateFrame}
            style={{ padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Dup
          </Button>
          <Button
            variant="secondary"
            onClick={deleteFrame}
            style={{ padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Del
          </Button>
        </div>
        <div className="sprite-frame-label">
          Frame {index + 1} / {frames.length} · {FPS} fps · {part} /{" "}
          {expressionLabel(expression)}
        </div>

        <div className="sprite-editor-row">
          <Button
            variant={playing ? "accent" : "primary"}
            onClick={togglePlay}
            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
          >
            {playing ? "Stop" : "Play"}
          </Button>
          <Button
            variant="secondary"
            onClick={clearFrame}
            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Clear
          </Button>
          <Button
            variant="secondary"
            onClick={resetClip}
            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Reset
          </Button>
          <Button
            variant="secondary"
            onClick={undo}
            disabled={!canUndo}
            title="Ctrl+Z"
            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Undo
          </Button>
          <Button
            variant="secondary"
            onClick={redo}
            disabled={!canRedo}
            title="Ctrl+Shift+Z"
            style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
          >
            Redo
          </Button>
        </div>

        <Select
          id="sprite-expression-picker"
          label="Expression"
          value={expression}
          options={EXPRESSIONS.map((name) => ({
            value: name,
            label: expressionLabel(name),
          }))}
          onChange={(value) => changeExpression(value as ChleoExpression)}
        />

        <Select
          id="sprite-part-picker"
          label="Part"
          value={part}
          options={EXPRESSION_PARTS[expression].map((name) => ({
            value: name,
            label: name,
          }))}
          onChange={(value) => changePart(value as PartName)}
        />

        <div className="sprite-editor-row">
          <Button
            variant="primary"
            onClick={handleApply}
            style={{ flex: 1, padding: "8px 6px", fontSize: "0.8rem" }}
          >
            Apply
          </Button>
          <Button
            variant="accent"
            onClick={handleApplyAll}
            title={`Apply ${EXPRESSION_PARTS[expression].join(", ")}`}
            style={{ flex: 1, padding: "8px 6px", fontSize: "0.8rem" }}
          >
            Apply all
          </Button>
        </div>
        {status && <div className="sprite-status">{status}</div>}
      </div>
    </PanelSection>
  );
};
