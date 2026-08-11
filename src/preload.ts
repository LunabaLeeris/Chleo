import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => {
        ipcRenderer.send('set-ignore-mouse-events', ignore, options);
    },
    dragWindow: (dx: number, dy: number) => {
        ipcRenderer.send('drag-window', dx, dy);
    },
    setDragging: (dragging: boolean) => {
        ipcRenderer.send('set-dragging', dragging);
    },
    setMenuOpen: (open: boolean) => {
        ipcRenderer.send('set-menu-open', open);
    },
    setInteractiveRects: (rects: any) => {
        ipcRenderer.send('set-interactive-rects', rects);
    },
    saveMemoryFile: (filename: string, content: string) => ipcRenderer.invoke('save-memory-file', filename, content),
    readMemoryFile: (filename: string) => ipcRenderer.invoke('read-memory-file', filename)
});

