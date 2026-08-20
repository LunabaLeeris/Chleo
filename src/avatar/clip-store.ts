import type { AvatarCompositor } from "./avatar-compositor";
import type { ChleoExpression, PartName } from "./sprite-types";
import { PART_RENDER_ORDER } from "./sprite-types";

export const SPRITE_CLIP_FILE = "chleo-sprite-clips.json";

export const CLIP_EXPRESSIONS: ChleoExpression[] = [
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

export interface DesktopClipStore {
  v: 3;
  fps: number;
  clips: Partial<Record<ChleoExpression, Partial<Record<PartName, string[]>>>>;
}

export interface SpriteApplyPayload {
  type: "sprite-apply";
  part: PartName;
  expression: ChleoExpression;
  frames: string[];
  fps: number;
}

export interface SpriteResetPayload {
  type: "sprite-reset";
  part: PartName;
  expression: ChleoExpression;
}

export function emptyClipStore(fps: number = 12): DesktopClipStore {
  return { v: 3, fps, clips: {} };
}

export function isClipExpression(value: string): value is ChleoExpression {
  return CLIP_EXPRESSIONS.includes(value as ChleoExpression);
}

export function isPartName(value: string): value is PartName {
  return PART_RENDER_ORDER.includes(value as PartName);
}

export function parseClipStore(raw: string | null): DesktopClipStore {
  if (!raw) return emptyClipStore();
  try {
    const parsed = JSON.parse(raw) as DesktopClipStore;
    if (parsed?.v !== 3 || typeof parsed.clips !== "object" || !parsed.clips) {
      return emptyClipStore();
    }
    return {
      v: 3,
      fps: typeof parsed.fps === "number" ? parsed.fps : 12,
      clips: parsed.clips,
    };
  } catch {
    return emptyClipStore();
  }
}

export function mergeClipApply(
  store: DesktopClipStore,
  payload: SpriteApplyPayload,
): DesktopClipStore {
  const expressionClips = { ...(store.clips[payload.expression] ?? {}) };
  expressionClips[payload.part] = payload.frames;
  return {
    v: 3,
    fps: payload.fps || store.fps,
    clips: { ...store.clips, [payload.expression]: expressionClips },
  };
}

export function mergeClipReset(
  store: DesktopClipStore,
  payload: SpriteResetPayload,
): DesktopClipStore {
  const expressionClips = { ...(store.clips[payload.expression] ?? {}) };
  delete expressionClips[payload.part];
  const clips = { ...store.clips };
  if (Object.keys(expressionClips).length === 0) {
    delete clips[payload.expression];
  } else {
    clips[payload.expression] = expressionClips;
  }
  return { ...store, clips };
}

export function isSpriteApplyPayload(
  data: unknown,
): data is SpriteApplyPayload {
  if (!data || typeof data !== "object") return false;
  const msg = data as SpriteApplyPayload;
  return (
    msg.type === "sprite-apply" &&
    isPartName(msg.part) &&
    isClipExpression(msg.expression) &&
    Array.isArray(msg.frames) &&
    msg.frames.length > 0 &&
    msg.frames.length <= 24 &&
    msg.frames.every(
      (frame) =>
        typeof frame === "string" && frame.startsWith("data:image/png"),
    )
  );
}

export function isSpriteResetPayload(
  data: unknown,
): data is SpriteResetPayload {
  if (!data || typeof data !== "object") return false;
  const msg = data as SpriteResetPayload;
  return (
    msg.type === "sprite-reset" &&
    isPartName(msg.part) &&
    isClipExpression(msg.expression)
  );
}

export async function applyClipStore(
  compositor: AvatarCompositor,
  store: DesktopClipStore,
): Promise<void> {
  for (const expression of CLIP_EXPRESSIONS) {
    const byPart = store.clips[expression];
    if (!byPart) continue;
    for (const part of PART_RENDER_ORDER) {
      const frames = byPart[part];
      if (!frames || frames.length === 0) continue;
      await compositor.applyPartClip(part, expression, frames, store.fps);
    }
  }
  compositor.resetAll();
}
