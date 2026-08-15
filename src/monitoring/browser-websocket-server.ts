import { WebSocketServer, WebSocket } from 'ws';
import type { ActivityTracker } from './activity-tracker';
import type { RuleStore } from './rule-store';

export interface BrowserWebSocketServerOptions {
  port?: number;
  activityTracker: ActivityTracker;
  ruleStore: RuleStore;
  onLog?: (type: 'info' | 'warn' | 'error' | 'success' | 'debug', source: string, description: string, details?: unknown) => void;
}

/**
 * Manages WebSocket connection with the Chrome extension.
 * Parses tab navigation events and updates ActivityTracker and RuleStore in real-time.
 */
export class BrowserWebSocketServer {
  private wss: WebSocketServer | null = null;
  private options: BrowserWebSocketServerOptions;

  constructor(options: BrowserWebSocketServerOptions) {
    this.options = options;
  }

  start(): void {
    const port = this.options.port ?? 8080;
    const log = this.options.onLog ?? (() => {});

    try {
      this.wss = new WebSocketServer({ port });
      log('success', 'websocket', `Chrome extension WebSocket listener active on ws://localhost:${port}`);

      this.wss.on('connection', (ws: WebSocket) => {
        log('info', 'websocket', 'Chrome extension connected to WebSocket server');

        ws.on('message', async (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed && typeof parsed.url === 'string') {
              const domain = this.options.activityTracker.setActiveDomain(parsed.url);
              log('info', 'browser', `Active domain updated: ${domain}`, {
                url: parsed.url,
                title: parsed.title,
              });

              // Immediately evaluate visit for blocked sites or instant reactions
              await this.options.ruleStore.evaluateVisit(domain);
            }
          } catch (err: any) {
            log('warn', 'websocket', `Failed to parse message from extension: ${err?.message || err}`);
          }
        });

        ws.on('close', () => {
          log('info', 'websocket', 'Chrome extension disconnected from WebSocket server');
        });

        ws.on('error', (err) => {
          log('warn', 'websocket', `WebSocket client error: ${err?.message || err}`);
        });
      });

      this.wss.on('error', (err: any) => {
        log('error', 'websocket', `WebSocket server error on port ${port}: ${err?.message || err}`);
      });
    } catch (err: any) {
      log('error', 'websocket', `Failed to initialize WebSocket server on port ${port}: ${err?.message || err}`);
    }
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
