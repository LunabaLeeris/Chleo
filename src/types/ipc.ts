export interface ComponentRect {
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
}

export interface InteractiveRects {
  avatar?: ComponentRect;
  menu?: ComponentRect;
  panel?: ComponentRect;
}

export interface IgnoreMouseEventsOptions {
  forward?: boolean;
}

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: IgnoreMouseEventsOptions) => void;
  dragWindow: (dx: number, dy: number) => void;
  setDragging: (dragging: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setInteractiveRects: (rects: InteractiveRects) => void;
  saveMemoryFile: (filename: string, content: string) => Promise<any>;
  readMemoryFile: (filename: string) => Promise<any>;
}
