import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

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

interface ComponentRect {
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
}

let interactiveRects: { avatar?: ComponentRect; menu?: ComponentRect; panel?: ComponentRect } = {};

// IPC listener so the frontend can toggle click-through toggle when hovering over the avatar
ipcMain.on('set-ignore-mouse-events', (event: Electron.IpcMainEvent, ignore: boolean, options?: { forward?: boolean }) => {
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
ipcMain.on('set-interactive-rects', (_event: Electron.IpcMainEvent, rects) => {
  if (rects && typeof rects === 'object') {
    interactiveRects = rects;
  }
});

// IPC listener to notify main process of drag state
ipcMain.on('set-dragging', (event: Electron.IpcMainEvent, dragging: boolean) => {
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
  try {
    const filePath = path.join(app.getPath('userData'), filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Main] Failed to save memory file ${filename}:`, err);
    return false;
  }
});

ipcMain.handle('read-memory-file', (_event, filename: string) => {
  try {
    const filePath = path.join(app.getPath('userData'), filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  } catch (err) {
    console.error(`[Main] Failed to read memory file ${filename}:`, err);
    return null;
  }
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
