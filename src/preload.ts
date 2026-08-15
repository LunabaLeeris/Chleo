import { contextBridge, ipcRenderer } from 'electron';
import { InteractiveRects, IgnoreMouseEventsOptions } from './types/ipc';

export type { ComponentRect, InteractiveRects, IgnoreMouseEventsOptions, ElectronAPI } from './types/ipc';

contextBridge.exposeInMainWorld('electronAPI', {
    setIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => {
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
    setInteractiveRects: (rects: InteractiveRects) => {
        ipcRenderer.send('set-interactive-rects', rects);
    },
    saveMemoryFile: (filename: string, content: string) => ipcRenderer.invoke('save-memory-file', filename, content),
    readMemoryFile: (filename: string) => ipcRenderer.invoke('read-memory-file', filename),

    // Emotion & Brain APIs
    getOverallEmotion: () => ipcRenderer.invoke('get-overall-emotion'),
    getEmotionState: () => ipcRenderer.invoke('get-emotion-state'),
    processMonitoringEvent: (event: any) => ipcRenderer.invoke('process-monitoring-event', event),
    setActiveDomain: (url: string) => ipcRenderer.invoke('set-active-domain', url),
    getActiveDomain: () => ipcRenderer.invoke('get-active-domain'),

    // Rules & Memory APIs
    getSiteRules: () => ipcRenderer.invoke('get-site-rules'),
    getBehavioralRules: () => ipcRenderer.invoke('get-behavioral-rules'),
    getShortTermMemoryEvents: () => ipcRenderer.invoke('get-short-term-events'),
    getLongTermMemoryData: () => ipcRenderer.invoke('get-long-term-memory'),

    // Main -> Renderer Logging Stream
    onMainLog: (callback: (payload: any) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, log: any) => callback(log);
        ipcRenderer.on('main-log', listener);
        return () => {
            ipcRenderer.removeListener('main-log', listener);
        };
    },
    getBufferedMainLogs: () => ipcRenderer.invoke('get-buffered-main-logs'),
});


