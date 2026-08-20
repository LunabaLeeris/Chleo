import { BrowserWindow, ipcMain } from 'electron';
import type { StorageAdapter } from '../memory/memory-types';
import type { UserItemsStore } from './user-items-store';
import type { LongTermMemory } from '../memory/long-term-memory';
import type { ShortTermMemory } from '../memory/short-term-memory';
import type { EmotionsOrchestrator } from '../avatar/emotions/emotions-orchestrator';
import type { BehavioralEngine } from '../monitoring/behavioral-engine';
import type { RuleStore } from '../monitoring/rule-store';
import type { ActivityTracker } from '../monitoring/activity-tracker';
import { InteractiveRects, IgnoreMouseEventsOptions, PurchaseItemPayload, InventoryTarget } from '../types/ipc';
import { MonitoringEventPayload } from 'src/monitoring';
import { getItemDefinition } from '../items/items-registry';

import type { BrowserWebSocketServer } from '../monitoring/browser-websocket-server';

export interface IpcHandlerContext {
  mainStorageAdapter: StorageAdapter;
  userItemsStore: UserItemsStore;
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

  // Storage & Memory IPC
  ipcMain.handle('save-memory-file', (_event, filename: string, content: string) => {
    return ctx.mainStorageAdapter.saveMemoryFile(filename, content);
  });

  ipcMain.handle('read-memory-file', (_event, filename: string) => {
    return ctx.mainStorageAdapter.readMemoryFile(filename);
  });

  // User Items & Coins IPC
  ipcMain.handle('get-user-items', () => {
    return ctx.userItemsStore.getUserItems();
  });

  ipcMain.handle('save-user-items', (_event, data: any) => {
    return ctx.userItemsStore.save(data);
  });

  ipcMain.handle('get-coins', () => {
    return ctx.userItemsStore.getCoins();
  });

  ipcMain.handle('set-coins', (_event, amount: number) => {
    return ctx.userItemsStore.setCoins(amount);
  });

  ipcMain.handle('modify-coins', (_event, delta: number) => {
    return ctx.userItemsStore.modifyCoins(delta);
  });

  ipcMain.handle(
    'purchase-item',
    (_event, payload: PurchaseItemPayload) => {
      return ctx.userItemsStore.purchaseItem(
        payload.target,
        payload.itemId,
        payload.amount,
        payload.costPerUnit
      );
    }
  );

  ipcMain.handle('add-user-item', (_event, target: InventoryTarget, itemId: string, quantity?: number) => {
    return ctx.userItemsStore.addItem(target, itemId, quantity || 1);
  });

  // Emotion & Brain IPC
  ipcMain.handle('get-overall-emotion', () => {
    return ctx.emotionsOrchestrator.getOverallEmotion();
  });

  ipcMain.handle('get-emotion-state', () => {
    return ctx.emotionsOrchestrator.getState();
  });

  ipcMain.handle('process-monitoring-event', async (_event, payload: MonitoringEventPayload) => {
    const reaction = await ctx.behavioralEngine.processEvent(payload);
    if (reaction && !reaction.overallEmotion) {
      reaction.overallEmotion = ctx.emotionsOrchestrator.getOverallEmotion();
    }
    return reaction;
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

  ipcMain.handle('apply-item-effect', async (_event, itemId: string, amount: number, domain?: string, deduct?: boolean) => {
    ctx.sendMainLog('info', 'behavior', `Applying item effect for: ${itemId} (amount: ${amount})`);
    
    let itemDef = getItemDefinition(itemId);
    if (!itemDef) {
       const parts = itemId.split('_');
       if (parts[0] === 'avoid') {
          itemDef = { status: 'avoid', duration: parseInt(parts[1]) || 30, title: 'Avoid' };
       } else if (parts[0] === 'unblock') {
          itemDef = { status: 'unblock', title: 'Unblock' };
       }
    }

    if (itemDef) {
      if (itemDef.deltas) {
        const adjustedDeltas: Record<string, number> = {};
        for (const [key, val] of Object.entries(itemDef.deltas)) {
          adjustedDeltas[key] = (val as number) * amount;
        }
        ctx.emotionsOrchestrator.applyBehavioralData(adjustedDeltas);
        ctx.shortTermMemory.updateLastEmotion(ctx.emotionsOrchestrator.getState());
      }

      if (domain && itemDef.status === 'avoid') {
        ctx.ruleStore.setSiteLimit(domain, (itemDef.duration || 30) * amount, undefined, { skipEvent: true });
      } else if (domain && itemDef.status === 'unblock') {
        await ctx.ruleStore.setUnblockSite(domain, undefined, { skipEvent: true });
      }
    }

    if (deduct && (ctx.userItemsStore as any).removeItem) {
       (ctx.userItemsStore as any).removeItem(itemId, amount);
    }

    return true;
  });
}
