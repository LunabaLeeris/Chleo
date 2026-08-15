import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { StorageAdapter } from '../memory/memory-types';

export const getUserDataDir = (): string => {
  const dirPath = path.join(app.getAppPath(), 'user-data');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

export const getConfigDir = (): string => {
  return path.join(app.getAppPath(), 'src', 'monitoring', 'config');
};

/**
 * Custom file storage adapter for Desktop Native Electron main process.
 * Reads from root user-data first (persisted runtime state), falling back to config templates.
 * Always writes to user-data (outside src to prevent Vite reload loops).
 */
export const mainStorageAdapter: StorageAdapter = {
  readMemoryFile: (filename: string) => {
    try {
      // Check root user-data first (persisted runtime state)
      const userFilePath = path.join(getUserDataDir(), filename);
      if (fs.existsSync(userFilePath)) {
        return fs.readFileSync(userFilePath, 'utf-8');
      }

      // Check config template as initial fallback (read-only default)
      const configFilePath = path.join(getConfigDir(), filename);
      if (fs.existsSync(configFilePath)) {
        return fs.readFileSync(configFilePath, 'utf-8');
      }

      return null;
    } catch (err) {
      console.error(`[MainStorageAdapter] Failed to read file ${filename}:`, err);
      return null;
    }
  },
  saveMemoryFile: (filename: string, content: string) => {
    try {
      // Always write to user-data (outside src to prevent Vite reload loops)
      const userFilePath = path.join(getUserDataDir(), filename);
      fs.writeFileSync(userFilePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error(`[MainStorageAdapter] Failed to save file ${filename}:`, err);
      return false;
    }
  },
};
