import { BrowserWindow } from "electron";
import { WebSocketServer, WebSocket } from "ws";
import {
  isSpriteApplyPayload,
  isSpriteResetPayload,
  mergeClipApply,
  mergeClipReset,
} from "./avatar/clip-store";
import { loadSpriteClipStore, saveSpriteClipStore } from "./clip-persist";

const startWebSocketServer = (mainWindow: BrowserWindow) => {
  const wss = new WebSocketServer({ host: "127.0.0.1", port: 8080 });

  console.log("WebSocket Server running on ws://127.0.0.1:8080");

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (raw: Buffer | string) => {
      try {
        const data = JSON.parse(raw.toString());

        if (isSpriteApplyPayload(data)) {
          const store = mergeClipApply(loadSpriteClipStore(), data);
          saveSpriteClipStore(store);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("sprite-apply", data);
          }
          return;
        }

        if (isSpriteResetPayload(data)) {
          const store = mergeClipReset(loadSpriteClipStore(), data);
          saveSpriteClipStore(store);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("sprite-reset", data);
          }
          return;
        }

        if (typeof data?.url === "string") {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("browser-activity", data);
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    });
  });
};

export { startWebSocketServer };
