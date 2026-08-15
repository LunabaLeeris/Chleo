import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { InteractiveRects, IgnoreMouseEventsOptions } from './types/ipc';

import { LongTermMemory } from './memory/long-term-memory';
import { ShortTermMemory } from './memory/short-term-memory';
import { LLMService } from './monitoring/llm-service';
import { ResponseGenerator } from './monitoring/response-generator';
import { EmotionsOrchestrator } from './avatar/emotions/emotions-orchestrator';
import { BehavioralEngine } from './monitoring/behavioral-engine';
import { RuleStore } from './monitoring/rule-store';
import { ActivityTracker } from './monitoring/activity-tracker';
import type { StorageAdapter } from './memory/memory-types';
import type { MonitoringEventPayload } from './monitoring';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const getUserDataDir = (): string => {
  const dirPath = path.join(app.getAppPath(), 'src', 'user-data');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

const getConfigDir = (): string => {
  const dirPath = path.join(app.getAppPath(), 'src', 'monitoring', 'config');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

const resolveFilePath = (filename: string): string => {
  const configPath = path.join(getConfigDir(), filename);
  if (fs.existsSync(configPath)) {
    return configPath;
  }
  const userDataPath = path.join(getUserDataDir(), filename);
  if (fs.existsSync(userDataPath)) {
    return userDataPath;
  }
  // Default to config directory if it's a rule/config file, otherwise user data directory
  if (filename.includes('rules') || filename.includes('config')) {
    return configPath;
  }
  return userDataPath;
};

// Custom file storage adapter for Desktop Native Electron main process
const mainStorageAdapter: StorageAdapter = {
  readMemoryFile: (filename: string) => {
    try {
      const filePath = resolveFilePath(filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      return null;
    } catch (err) {
      console.error(`[MainStorageAdapter] Failed to read file ${filename}:`, err);
      return null;
    }
  },
  saveMemoryFile: (filename: string, content: string) => {
    try {
      const filePath = resolveFilePath(filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error(`[MainStorageAdapter] Failed to save file ${filename}:`, err);
      return false;
    }
  },
};

// Central logging endpoint from Main process to Frontend DebugLogger
export type MainLogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface MainLogPayload {
  type: MainLogLevel;
  source: string;
  description: string;
  details?: unknown;
}

const mainLogBuffer: MainLogPayload[] = [];
let mainWindowInstance: BrowserWindow | null = null;

export const sendMainLog = (
  type: MainLogLevel,
  source: string,
  description: string,
  details?: unknown
): void => {
  const payload: MainLogPayload = { type, source, description, details };
  mainLogBuffer.push(payload);
  if (mainLogBuffer.length > 200) {
    mainLogBuffer.shift();
  }

  // Also print to console
  console.log(`[MainLog:${type.toUpperCase()}][${source}] ${description}`);

  // Broadcast to renderer if window exists and is ready
  if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
    try {
      mainWindowInstance.webContents.send('main-log', payload);
    } catch (_) {
      /* ignore */
    }
  }
};

// Initialize CHLEO Core Modules in Main Process (Brain & Memory)
sendMainLog('info', 'main', 'Starting CHLEO core modules initialization in Main process...');
const longTermMemory = new LongTermMemory(mainStorageAdapter);

sendMainLog('success', 'long-term-memory', 'LongTermMemory initialized with native storage adapter', {
  firstSeenTimestamp: longTermMemory.getData()?.firstSeenTimestamp,
  daysKnown: longTermMemory.getData()?.daysKnown,
});
const shortTermMemory = new ShortTermMemory(longTermMemory, mainStorageAdapter);

sendMainLog('success', 'short-term-memory', 'ShortTermMemory initialized with working buffer', {
  eventsCount: shortTermMemory.getEvents()?.length ?? 0,
});
const llmService = new LLMService();
sendMainLog('info', 'llm-service', 'LLMService instance created and ready');

const responseGenerator = new ResponseGenerator(shortTermMemory, llmService);
sendMainLog('info', 'response-generator', 'ResponseGenerator connected to ShortTermMemory and LLMService');

const initialEmotionState = longTermMemory.getData().lastEmotionState;
const emotionsOrchestrator = new EmotionsOrchestrator(initialEmotionState);
sendMainLog('success', 'emotions', 'EmotionsOrchestrator initialized with persisted emotion baseline', {
  overallEmotion: emotionsOrchestrator.getOverallEmotion(),
});

const behavioralEngine = new BehavioralEngine(emotionsOrchestrator, responseGenerator, mainStorageAdapter);
sendMainLog('success', 'behavioral-engine', 'BehavioralEngine initialized with emotion orchestrator');

const ruleStore = new RuleStore(behavioralEngine, mainStorageAdapter);
sendMainLog('success', 'rule-store', 'RuleStore loaded site and behavioral rules', {
  siteRulesCount: ruleStore.getSiteRules()?.length ?? 0,
});

const activityTracker = new ActivityTracker(ruleStore, shortTermMemory);
sendMainLog('success', 'activity-tracker', 'ActivityTracker connected to RuleStore and ShortTermMemory');

console.log('[Main] CHLEO Brain & Memory modules successfully initialized.');
console.log(`[Main] Memory files located at: ${getUserDataDir()}`);
console.log(`[Main] Config files located at: ${getConfigDir()}`);
sendMainLog('success', 'main', 'All CHLEO Brain & Memory modules initialized successfully');

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const windowWidth = 750;
  const windowHeight = 420;

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 20,
    y: screenHeight - windowHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    icon: path.join(app.getAppPath(), 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindowInstance = mainWindow;

  // When webContents finishes loading, flush any initial buffered logs to frontend
  mainWindow.webContents.on('did-finish-load', () => {
    for (const logItem of mainLogBuffer) {
      try {
        mainWindow.webContents.send('main-log', logItem);
      } catch (_) {
        /* ignore */
      }
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  return mainWindow;
};

let isUserDragging = false;
let isCurrentlyIgnoring = false;
let isMenuOpen = false;

let interactiveRects: InteractiveRects = {};

// IPC listener so the frontend can toggle click-through toggle when hovering over the avatar
ipcMain.on('set-ignore-mouse-events', (event: Electron.IpcMainEvent, ignore: boolean, options?: IgnoreMouseEventsOptions) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (options && typeof options === 'object' && options !== null && typeof options.forward === 'boolean') {
      win.setIgnoreMouseEvents(ignore, { forward: options.forward });
    } else {
      win.setIgnoreMouseEvents(ignore);
    }
    isCurrentlyIgnoring = ignore;
  }
});

// IPC listener to track menu open state
ipcMain.on('set-menu-open', (_event: Electron.IpcMainEvent, open: boolean) => {
  isMenuOpen = open;
});

// IPC listener to receive dynamic element bounding boxes from renderer
ipcMain.on('set-interactive-rects', (_event: Electron.IpcMainEvent, rects: InteractiveRects) => {
  if (rects && typeof rects === 'object') {
    interactiveRects = rects;
  }
});

// IPC listener to notify main process of drag state
ipcMain.on('set-dragging', (event: Electron.IpcMainEvent, dragging: boolean) => {
  // If previously dragging then it must have been dragged
  if (isUserDragging) {
    const win = BrowserWindow.fromWebContents(event.sender);
    const [x, y] = win.getPosition();
    sendMainLog('info', 'main', `window moved`, {
      x_position: x,
      y_position: y
    });
  }

  isUserDragging = dragging;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && dragging) {
    win.setIgnoreMouseEvents(false);
    isCurrentlyIgnoring = false;
  }
});

// IPC listener to allow dragging frameless window
ipcMain.on('drag-window', (event: Electron.IpcMainEvent, dx: number, dy: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof dx === 'number' && typeof dy === 'number') {
    const [x, y] = win.getPosition();
    win.setPosition(Math.round(x + dx), Math.round(y + dy));
  }
});

// IPC handlers for Desktop Native memory file storage
ipcMain.handle('save-memory-file', (_event, filename: string, content: string) => {
  return mainStorageAdapter.saveMemoryFile(filename, content);
});

ipcMain.handle('read-memory-file', (_event, filename: string) => {
  return mainStorageAdapter.readMemoryFile(filename);
});

// CHLEO Brain & Emotion IPC routes
ipcMain.handle('get-overall-emotion', () => {
  return emotionsOrchestrator.getOverallEmotion();
});

ipcMain.handle('get-emotion-state', () => {
  return emotionsOrchestrator.getState();
});

ipcMain.handle('process-monitoring-event', async (_event, payload: MonitoringEventPayload) => {
  return await behavioralEngine.processEvent(payload);
});

ipcMain.handle('set-active-domain', (_event, url: string) => {
  return activityTracker.setActiveDomain(url);
});

ipcMain.handle('get-active-domain', () => {
  return activityTracker.getActiveDomain();
});

ipcMain.handle('get-site-rules', () => {
  return ruleStore.getSiteRules();
});

ipcMain.handle('get-behavioral-rules', () => {
  return behavioralEngine.getBehavioralRules();
});

ipcMain.handle('get-short-term-events', () => {
  return shortTermMemory.getEvents();
});

ipcMain.handle('get-long-term-memory', () => {
  return longTermMemory.getData();
});

ipcMain.handle('get-buffered-main-logs', () => {
  return mainLogBuffer;
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  const mainWindow = createWindow();

  // OS-level cursor tracking loop to ensure companion is always clickable when hovered
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || isUserDragging) return;

    const point = screen.getCursorScreenPoint();
    const bounds = mainWindow.getBounds();

    const relX = point.x - bounds.x;
    const relY = point.y - bounds.y;

    const isInsideWindow = relX >= 0 && relX <= bounds.width && relY >= 0 && relY <= bounds.height;
    if (!isInsideWindow) {
      if (!isCurrentlyIgnoring) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        isCurrentlyIgnoring = true;
      }
      return;
    }

    // Dynamic hit-testing based on actual element rects from renderer
    const avatar = interactiveRects.avatar;
    const menu = interactiveRects.menu;
    const panel = interactiveRects.panel;

    const isOverAvatar = avatar ? (
      relX >= avatar.x && relX <= avatar.x + avatar.width &&
      relY >= avatar.y && relY <= avatar.y + avatar.height
    ) : (relX >= 0 && relX <= bounds.width && relY >= 0 && relY <= bounds.height);

    const isOverMenu = (menu && menu.visible) ? (
      relX >= menu.x && relX <= menu.x + menu.width &&
      relY >= menu.y && relY <= menu.y + menu.height
    ) : false;

    const isOverPanel = (panel && panel.visible) ? (
      relX >= panel.x && relX <= panel.x + panel.width &&
      relY >= panel.y && relY <= panel.y + panel.height
    ) : false;

    if (isOverAvatar || isOverMenu || isOverPanel) {
      if (isCurrentlyIgnoring) {
        mainWindow.setIgnoreMouseEvents(false);
        isCurrentlyIgnoring = false;
      }
    } else {
      if (!isCurrentlyIgnoring) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        isCurrentlyIgnoring = true;
      }
    }
  }, 50);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
