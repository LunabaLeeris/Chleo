import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onBrowserActivity: (
    callback: (data: { url: string; title: string }) => void,
  ) => {
    ipcRenderer.on("browser-activity", (_event, data) => callback(data));
  },
  onSpriteApply: (callback: (data: unknown) => void) => {
    ipcRenderer.on("sprite-apply", (_event, data) => callback(data));
  },
  onSpriteReset: (callback: (data: unknown) => void) => {
    ipcRenderer.on("sprite-reset", (_event, data) => callback(data));
  },
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore, options);
  },
  dragWindow: (dx: number, dy: number) => {
    ipcRenderer.send("drag-window", dx, dy);
  },
  setDragging: (dragging: boolean) => {
    ipcRenderer.send("set-dragging", dragging);
  },
  saveMemoryFile: (filename: string, content: string) =>
    ipcRenderer.invoke("save-memory-file", filename, content),
  readMemoryFile: (filename: string) =>
    ipcRenderer.invoke("read-memory-file", filename),
});
