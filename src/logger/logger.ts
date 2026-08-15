export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface LogItem {
  id: string;
  timestamp: number;
  timeStr: string;
  type: LogLevel;
  source: string;
  description: string;
  details?: any;
}

const MAX_LOGS = 300;

// [check] I have a function like this already
function formatTimestamp(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

// [check] repeated function
function safeSerializeDetails(details: any): any {
  if (details === undefined || details === null) return undefined;
  if (details instanceof Error) {
    return {
      message: details.message,
      name: details.name,
      stack: details.stack,
    };
  }
  if (typeof details === 'object') {
    try {
      // Test JSON serializability to prevent circular structures
      return JSON.parse(JSON.stringify(details));
    } catch {
      return String(details);
    }
  }
  return details;
}

export class DebugLogger {
  private logs: LogItem[] = [];
  private listeners: Set<(logs: LogItem[]) => void> = new Set();

  constructor() {
    // Purge any legacy stored logs from previous sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('cleo_debug_logs');
      } catch (_) {
        /* ignore */
      }
    }
    this.setupGlobalErrorHandlers();
    this.setupIpcLogListener();
  }

  private setupIpcLogListener(): void {
    if (typeof window === 'undefined') return;

    const initListener = () => {
      const api = (window as any).electronAPI;
      if (api?.onMainLog) {
        api.onMainLog((log: { type: LogLevel; source: string; description: string; details?: unknown }) => {
          this.log(log.type, log.source, log.description, log.details);
        });
      }

      if (api?.getBufferedMainLogs) {
        api.getBufferedMainLogs().then((buffered: any[]) => {
          if (Array.isArray(buffered)) {
            buffered.forEach((b) => {
              const alreadyExists = this.logs.some(
                (l) => l.source === b.source && l.description === b.description
              );
              if (!alreadyExists) {
                this.log(b.type, b.source, b.description, b.details);
              }
            });
          }
        }).catch(() => {
          /* ignore */
        });
      }
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initListener);
    } else {
      initListener();
    }
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error(
        'window-error',
        event.message || 'Uncaught Script Error',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack || event.error,
        }
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.error(
        'promise-rejection',
        typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection'),
        reason?.stack || reason
      );
    });
  }

  public log(type: LogLevel, source: string, description: string, details?: any): LogItem {
    const now = new Date();
    const item: LogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.getTime(),
      timeStr: formatTimestamp(now),
      type,
      source: source || 'system',
      description: String(description),
      details: safeSerializeDetails(details),
    };

    this.logs.push(item);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.notifyListeners();

    // Mirror to browser console for developer convenience
    this.mirrorToConsole(item);

    return item;
  }

  public info(source: string, description: string, details?: any): LogItem {
    return this.log('info', source, description, details);
  }

  public warn(source: string, description: string, details?: any): LogItem {
    return this.log('warn', source, description, details);
  }

  public error(source: string, description: string, details?: any): LogItem {
    return this.log('error', source, description, details);
  }

  public success(source: string, description: string, details?: any): LogItem {
    return this.log('success', source, description, details);
  }

  public debug(source: string, description: string, details?: any): LogItem {
    return this.log('debug', source, description, details);
  }

  public clear(): void {
    this.logs = [];
    this.notifyListeners();
    console.log('[DebugLogger] Logs cleared.');
  }

  public getLogs(): LogItem[] {
    return [...this.logs];
  }

  public subscribe(listener: (logs: LogItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const current = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('[DebugLogger] Listener notification error:', err);
      }
    });
  }

  public exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public exportAsText(): string {
    return this.logs
      .map(
        (l) =>
          `[${l.timeStr}] [${l.type.toUpperCase()}] [${l.source}] ${l.description}${l.details ? ` | Details: ${JSON.stringify(l.details)}` : ''
          }`
      )
      .join('\n');
  }

  private mirrorToConsole(item: LogItem): void {
    const tag = `[${item.timeStr}] [${item.source}]`;
    const label = `${tag} ${item.description}`;
    const payload = item.details !== undefined ? [item.details] : [];

    switch (item.type) {
      case 'error':
        console.error(`%c${label}`, 'color: #ef4444; font-weight: bold;', ...payload);
        break;
      case 'warn':
        console.warn(`%c${label}`, 'color: #f59e0b; font-weight: bold;', ...payload);
        break;
      case 'success':
        console.log(`%c${label}`, 'color: #10b981; font-weight: bold;', ...payload);
        break;
      case 'debug':
        console.debug(`%c${label}`, 'color: #8b5cf6;', ...payload);
        break;
      case 'info':
      default:
        console.log(`%c${label}`, 'color: #0ea5e9;', ...payload);
        break;
    }
  }
}

// Singleton Instance for Renderer Application
export const logger = new DebugLogger();

/**
 * Helper to wrap IPC promises and automatically log results/errors.
 */
export async function trackIpcCall<T>(
  source: string,
  actionName: string,
  promise: Promise<T>,
  logSuccessDetails = false
): Promise<T> {
  try {
    const result = await promise;
    logger.success(
      source,
      `${actionName} succeeded`,
      logSuccessDetails ? result : undefined
    );
    return result;
  } catch (err: any) {
    logger.error(
      source,
      `${actionName} failed: ${err?.message || err}`,
      err?.stack || err
    );
    throw err;
  }
}
