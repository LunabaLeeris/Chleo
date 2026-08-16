import { BrowserWindow, ipcMain } from 'electron';
import type { StorageAdapter } from '../memory/memory-types';
import type { LongTermMemory } from '../memory/long-term-memory';
import type { ShortTermMemory } from '../memory/short-term-memory';
import type { EmotionsOrchestrator } from '../avatar/emotions/emotions-orchestrator';
import type { BehavioralEngine } from '../monitoring/behavioral-engine';
import type { RuleStore } from '../monitoring/rule-store';
import type { ActivityTracker } from '../monitoring/activity-tracker';
import { InteractiveRects, IgnoreMouseEventsOptions } from '../types/ipc';
import { MonitoringEventPayload } from 'src/monitoring';

import type { BrowserWebSocketServer } from '../monitoring/browser-websocket-server';

export interface IpcHandlerContext {
  mainStorageAdapter: StorageAdapter;
  longTermMemory: LongTermMemory;
  shortTermMemory: ShortTermMemory;
  emotionsOrchestrator: EmotionsOrchestrator;
  behavioralEngine: BehavioralEngine;
  ruleStore: RuleStore;
  activityTracker: ActivityTracker;
  browserWsServer: BrowserWebSocketServer;
  getInteractiveRects: () => InteractiveRects;
  setInteractiveRects: (rects: InteractiveRects) => void;
  getIsUserDragging: () => boolean;
  setIsUserDragging: (dragging: boolean) => void;
  getIsMenuOpen: () => boolean;
  setIsMenuOpen: (open: boolean) => void;
  getIsCurrentlyIgnoring: () => boolean;
  setIsCurrentlyIgnoring: (ignoring: boolean) => void;
  getLogBuffer: () => any[];
  flushAllMemoryAndRules: () => void;
  sendMainLog: (type: any, source: string, description: string, details?: unknown) => void;
}

export function registerIpcHandlers(ctx: IpcHandlerContext): void {
  // Click-through toggle
  ipcMain.on('set-ignore-mouse-events', (event: Electron.IpcMainEvent, ignore: boolean, options?: IgnoreMouseEventsOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (options && typeof options === 'object' && options !== null && typeof options.forward === 'boolean') {
        win.setIgnoreMouseEvents(ignore, { forward: options.forward });
      } else {
        win.setIgnoreMouseEvents(ignore);
      }
      ctx.setIsCurrentlyIgnoring(ignore);
    }
  });

  // Menu open state
  ipcMain.on('set-menu-open', (_event: Electron.IpcMainEvent, open: boolean) => {
    ctx.setIsMenuOpen(open);
  });

  // Dynamic element bounding boxes
  ipcMain.on('set-interactive-rects', (_event: Electron.IpcMainEvent, rects: InteractiveRects) => {
    if (rects && typeof rects === 'object') {
      ctx.setInteractiveRects(rects);
    }
  });

  // Drag state
  ipcMain.on('set-dragging', (event: Electron.IpcMainEvent, dragging: boolean) => {
    if (ctx.getIsUserDragging()) {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        const [x, y] = win.getPosition();
        ctx.sendMainLog('info', 'main', 'window moved', { x_position: x, y_position: y });
      }
    }

    ctx.setIsUserDragging(dragging);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && dragging) {
      win.setIgnoreMouseEvents(false);
      ctx.setIsCurrentlyIgnoring(false);
    }
  });

  // Drag window
  ipcMain.on('drag-window', (event: Electron.IpcMainEvent, dx: number, dy: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && typeof dx === 'number' && typeof dy === 'number') {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + dx), Math.round(y + dy));
    }
  });

  // Storage IPC
  ipcMain.handle('save-memory-file', (_event, filename: string, content: string) => {
    return ctx.mainStorageAdapter.saveMemoryFile(filename, content);
  });

  ipcMain.handle('read-memory-file', (_event, filename: string) => {
    return ctx.mainStorageAdapter.readMemoryFile(filename);
  });

  // Emotion & Brain IPC
  ipcMain.handle('get-overall-emotion', () => {
    return ctx.emotionsOrchestrator.getOverallEmotion();
  });

  ipcMain.handle('get-emotion-state', () => {
    return ctx.emotionsOrchestrator.getState();
  });

  ipcMain.handle('process-monitoring-event', async (_event, payload: MonitoringEventPayload) => {
    return await ctx.behavioralEngine.processEvent(payload);
  });

  ipcMain.handle('set-active-domain', (_event, url: string) => {
    return ctx.activityTracker.setActiveDomain(url);
  });

  ipcMain.handle('get-active-domain', () => {
    return ctx.activityTracker.getActiveDomain();
  });

  // Rules & Memory IPC
  ipcMain.handle('get-site-rules', () => {
    return ctx.ruleStore.getSiteRules();
  });

  ipcMain.handle('get-behavioral-rules', () => {
    return ctx.behavioralEngine.getBehavioralRules();
  });

  ipcMain.handle('get-short-term-events', () => {
    return ctx.shortTermMemory.getEvents();
  });

  ipcMain.handle('get-long-term-memory', () => {
    return ctx.longTermMemory.getData();
  });

  ipcMain.handle('get-buffered-main-logs', () => {
    return ctx.getLogBuffer();
  });

  ipcMain.handle('flush-memory', () => {
    ctx.flushAllMemoryAndRules();
    return true;
  });

  ipcMain.handle('save-site-rules', () => {
    ctx.ruleStore.saveActivityConfig();
    return true;
  });

  // Action IPC handlers
  ipcMain.handle('close-active-tab', (_event, domain?: string) => {
    ctx.browserWsServer.closeActiveTab(domain);
    return true;
  });

  ipcMain.handle('unblock-domain-success', async (_event, domain: string, onSuccess?: { status: 'unblock' | 'avoid'; duration?: number }) => {
    if (!domain) return false;
    ctx.sendMainLog('info', 'behavior', `Unblocking domain via puzzle success: ${domain}`, { onSuccess });
    if (onSuccess?.status === 'avoid') {
      ctx.ruleStore.setSiteLimit(domain, onSuccess.duration || 30);
    } else {
      await ctx.ruleStore.setUnblockSite(domain);
    }
    return true;
  });
}
