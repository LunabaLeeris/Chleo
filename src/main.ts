import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import type { InteractiveRects, ChleoResponsePayload } from './types/ipc';

import { mainStorageAdapter, getUserDataDir, getConfigDir } from './main/storage';
import { registerIpcHandlers } from './main/ipc';
import { BrowserWebSocketServer } from './monitoring/browser-websocket-server';

import { LongTermMemory } from './memory/long-term-memory';
import { ShortTermMemory } from './memory/short-term-memory';
import { LLMService } from './monitoring/llm-service';
import { ResponseGenerator } from './monitoring/response-generator';
import { EmotionsOrchestrator } from './avatar/emotions/emotions-orchestrator';
import { BehavioralEngine } from './monitoring/behavioral-engine';
import { RuleStore } from './monitoring/rule-store';
import { ActivityTracker } from './monitoring/activity-tracker';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

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

const behavioralEngine = new BehavioralEngine(emotionsOrchestrator, responseGenerator, shortTermMemory, mainStorageAdapter);
sendMainLog('success', 'behavioral-engine', 'BehavioralEngine initialized with emotion orchestrator and memory');

const ruleStore = new RuleStore(behavioralEngine, mainStorageAdapter);
sendMainLog('success', 'rule-store', 'RuleStore loaded site and behavioral rules', {
  siteRulesCount: ruleStore.getSiteRules()?.length ?? 0,
});

const activityTracker = new ActivityTracker(ruleStore, shortTermMemory);
sendMainLog('success', 'activity-tracker', 'ActivityTracker connected to RuleStore and ShortTermMemory');

// Initialize Browser WebSocket Server
const browserWsServer = new BrowserWebSocketServer({
  port: 8080,
  activityTracker,
  ruleStore,
  onLog: sendMainLog,
});
browserWsServer.start();

// Configure RuleStore listeners to broadcast companion speech & rules changes to renderer
ruleStore.setListeners({
  onEventTriggered: (payload, speechText, reaction) => {
    sendMainLog('info', 'behavior', `Behavior triggered for ${payload.domain}: "${speechText}"`, {
      eventId: payload.eventId,
      domain: payload.domain,
      overallEmotion: emotionsOrchestrator.getOverallEmotion(),
      responseType: reaction?.responseType || 'declarative',
      actions: reaction?.actions,
    });

    const closeTabAction = reaction?.actions?.closeTab ?? (reaction?.rule as any)?.actions?.['close-tab'];
    if (closeTabAction) {
      browserWsServer.closeActiveTab(payload.domain);
      sendMainLog('info', 'behavior', `Executed closeActiveTab action for domain: ${payload.domain}`);
    }

    const redirectAction = reaction?.actions?.redirect ?? (reaction?.rule as any)?.actions?.['redirect'];
    if (redirectAction) {
      const redirectUrl = typeof redirectAction === 'string' ? redirectAction : 'about:blank';
      browserWsServer.broadcastCommand({ action: 'redirect_tab', url: redirectUrl, domain: payload.domain });
      sendMainLog('info', 'behavior', `Executed redirect_tab action to "${redirectUrl}" for domain: ${payload.domain}`);
    }

    if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
      const responsePayload: ChleoResponsePayload = {
        speechText,
        responseType: reaction?.responseType || 'declarative',
        overallEmotion: emotionsOrchestrator.getOverallEmotion(),
        emotionState: emotionsOrchestrator.getState(),
        domain: payload.domain,
        eventId: payload.eventId,
        actions: reaction?.actions,
      };
      try {
        mainWindowInstance.webContents.send('companion-speak', responsePayload);
      } catch (err: any) {
        sendMainLog('error', 'main', `Failed to send companion-speak IPC: ${err?.message || err}`);
      }
    }
  },
  onRuleChanged: () => {
    sendMainLog('debug', 'rule-store', 'Site rules modified, broadcasting rules-changed IPC');
    if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
      try {
        mainWindowInstance.webContents.send('rules-changed');
      } catch (_) {
        /* ignore */
      }
    }
  },
});

console.log('[Main] CHLEO Brain & Memory modules successfully initialized.');
console.log(`[Main] Memory files located at: ${getUserDataDir()}`);
console.log(`[Main] Config files located at: ${getConfigDir()}`);
sendMainLog('success', 'main', 'All CHLEO Brain & Memory modules initialized successfully');

// State tracking for window dragging & dynamic click-through
let isUserDragging = false;
let isCurrentlyIgnoring = false;
let isMenuOpen = false;
let interactiveRects: InteractiveRects = {};

const flushAllMemoryAndRules = () => {
  try {
    sendMainLog('info', 'main', 'Flushing active rules and memory logs to user-data...');
    browserWsServer.stop();
    activityTracker.stopTicker();
    ruleStore.flush();
    longTermMemory.updateLastEmotion(emotionsOrchestrator.getState());
    longTermMemory.save();
    shortTermMemory.save();
    sendMainLog('success', 'main', 'Memory and rules successfully flushed to user-data');
  } catch (err: any) {
    console.error('[Main] Failed to flush data on exit:', err);
  }
};

// Register all modular IPC handlers
registerIpcHandlers({
  mainStorageAdapter,
  longTermMemory,
  shortTermMemory,
  emotionsOrchestrator,
  behavioralEngine,
  ruleStore,
  activityTracker,
  browserWsServer,
  getInteractiveRects: () => interactiveRects,
  setInteractiveRects: (rects) => { interactiveRects = rects; },
  getIsUserDragging: () => isUserDragging,
  setIsUserDragging: (dragging) => { isUserDragging = dragging; },
  getIsMenuOpen: () => isMenuOpen,
  setIsMenuOpen: (open) => { isMenuOpen = open; },
  getIsCurrentlyIgnoring: () => isCurrentlyIgnoring,
  setIsCurrentlyIgnoring: (ignoring) => { isCurrentlyIgnoring = ignoring; },
  getLogBuffer: () => mainLogBuffer,
  flushAllMemoryAndRules,
  sendMainLog,
});

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Create the fullscreen transparent companion overlay window
  const mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
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

  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return mainWindow;
};

app.on('before-quit', () => {
  flushAllMemoryAndRules();
});

app.on('will-quit', () => {
  flushAllMemoryAndRules();
});

// This method will be called when Electron has finished initialization
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
    const prompt = interactiveRects.prompt;
    const puzzle = interactiveRects.puzzle;
    const backdrop = interactiveRects.backdrop;

    const isBackdropActive = Boolean(backdrop && backdrop.visible);

    const isOverAvatar = avatar ? (
      relX >= avatar.x && relX <= avatar.x + avatar.width &&
      relY >= avatar.y && relY <= avatar.y + avatar.height
    ) : false;

    const isOverMenu = (menu && menu.visible) ? (
      relX >= menu.x && relX <= menu.x + menu.width &&
      relY >= menu.y && relY <= menu.y + menu.height
    ) : false;

    const isOverPanel = (panel && panel.visible) ? (
      relX >= panel.x && relX <= panel.x + panel.width &&
      relY >= panel.y && relY <= panel.y + panel.height
    ) : false;

    const isOverPrompt = (prompt && prompt.visible) ? (
      relX >= prompt.x && relX <= prompt.x + prompt.width &&
      relY >= prompt.y && relY <= prompt.y + prompt.height
    ) : false;

    const isOverPuzzle = (puzzle && puzzle.visible) ? (
      relX >= puzzle.x && relX <= puzzle.x + puzzle.width &&
      relY >= puzzle.y && relY <= puzzle.y + puzzle.height
    ) : false;

    if (isBackdropActive || isOverAvatar || isOverMenu || isOverPanel || isOverPrompt || isOverPuzzle) {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
