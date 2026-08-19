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

    // User Items & Coins APIs
    getUserItems: () => ipcRenderer.invoke('get-user-items'),
    saveUserItems: (data: any) => ipcRenderer.invoke('save-user-items', data),
    getCoins: () => ipcRenderer.invoke('get-coins'),
    setCoins: (amount: number) => ipcRenderer.invoke('set-coins', amount),
    modifyCoins: (delta: number) => ipcRenderer.invoke('modify-coins', delta),
    onCoinsChanged: (callback: (coins: number) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, coins: number) => callback(coins);
        ipcRenderer.on('coins-changed', listener);
        return () => {
            ipcRenderer.removeListener('coins-changed', listener);
        };
    },

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
    saveSiteRules: () => ipcRenderer.invoke('save-site-rules'),
    flushMemory: () => ipcRenderer.invoke('flush-memory'),

    // Actions & Puzzle APIs
    closeActiveTab: (domain?: string) => ipcRenderer.invoke('close-active-tab', domain),
    modifyBlockSuccess: (domain: string, onSuccess?: any) => ipcRenderer.invoke('modify-block-success', domain, onSuccess),

    // Main -> Renderer Logging Stream
    onMainLog: (callback: (payload: any) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, log: any) => callback(log);
        ipcRenderer.on('main-log', listener);
        return () => {
            ipcRenderer.removeListener('main-log', listener);
        };
    },
    getBufferedMainLogs: () => ipcRenderer.invoke('get-buffered-main-logs'),

    // Companion Broadcast Events
    onCompanionSpeak: (callback: (payload: any) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
        ipcRenderer.on('companion-speak', listener);
        return () => {
            ipcRenderer.removeListener('companion-speak', listener);
        };
    },
    onRulesChanged: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on('rules-changed', listener);
        return () => {
            ipcRenderer.removeListener('rules-changed', listener);
        };
    },
});


