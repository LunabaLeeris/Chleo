import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  SPRITE_CLIP_FILE,
  emptyClipStore,
  parseClipStore,
  type DesktopClipStore,
} from "./avatar/clip-store";

export function spriteClipPath(): string {
  return path.join(app.getPath("userData"), SPRITE_CLIP_FILE);
}

export function loadSpriteClipStore(): DesktopClipStore {
  try {
    const filePath = spriteClipPath();
    if (!fs.existsSync(filePath)) return emptyClipStore();
    return parseClipStore(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("[Clips] Failed to read sprite clip store:", err);
    return emptyClipStore();
  }
}

export function saveSpriteClipStore(store: DesktopClipStore): void {
  try {
    fs.writeFileSync(spriteClipPath(), JSON.stringify(store), "utf-8");
  } catch (err) {
    console.error("[Clips] Failed to write sprite clip store:", err);
  }
}
