import type { ChleoExpression, PartName } from "../src/avatar";

const DESKTOP_WS = "ws://127.0.0.1:8080";

function sendDesktopMessage(payload: unknown): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    let ws: WebSocket;
    try {
      ws = new WebSocket(DESKTOP_WS);
    } catch {
      finish(false);
      return;
    }

    const timer = window.setTimeout(() => {
      ws.close();
      finish(false);
    }, 800);

    ws.onopen = () => {
      ws.send(JSON.stringify(payload));
      window.clearTimeout(timer);
      ws.close();
      finish(true);
    };
    ws.onerror = () => {
      window.clearTimeout(timer);
      finish(false);
    };
  });
}

export function pushSpriteApplyToDesktop(
  part: PartName,
  expression: ChleoExpression,
  frames: string[],
  fps: number,
): Promise<boolean> {
  return sendDesktopMessage({
    type: "sprite-apply",
    part,
    expression,
    frames,
    fps,
  });
}

export function pushSpriteResetToDesktop(
  part: PartName,
  expression: ChleoExpression,
): Promise<boolean> {
  return sendDesktopMessage({ type: "sprite-reset", part, expression });
}
