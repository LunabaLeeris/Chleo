export interface BubblePositionOptions {
  padding?: number;
  minAllowedWidth?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  debug?: boolean;
}

export interface BubbleAdjustmentResult {
  flipped: boolean;
  maxWidth: number | null;
  shiftX: number;
  tailOffset: string | null;
}

export interface ClampCompanionOptions {
  currentPosX: number;
  currentPosY: number;
  dx: number;
  dy: number;
  wrapperRect: DOMRect;
  padding?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  debug?: boolean;
}

export interface ClampedPositionResult {
  posX: number;
  posY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
