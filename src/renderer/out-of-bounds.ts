import { logger } from '../logger';
import type {
  BubblePositionOptions,
  BubbleAdjustmentResult,
  ClampCompanionOptions,
  ClampedPositionResult,
} from './out-of-bounds-types';

export * from './out-of-bounds-types';

const DEFAULT_PADDING = 16;
const DEFAULT_ALLOWED_WIDTH = 160;

/**
 * Calculates out-of-bounds adjustments for speech bubbles relative to the viewport.
 */
export function calculateBubbleAdjustments(
  rect: DOMRect,
  options: BubblePositionOptions = {}
): BubbleAdjustmentResult {
  const padding = options.padding ?? DEFAULT_PADDING;
  const minAllowedWidth = options.minAllowedWidth ?? DEFAULT_ALLOWED_WIDTH;
  const viewportWidth = options.viewportWidth ?? window.innerWidth;

  const flipped = rect.top < padding;

  // Max width constraint if bubble is wider than viewport
  const maxAllowedWidth = Math.max(minAllowedWidth, viewportWidth - 2 * padding);
  let maxWidth: number | null = null;
  if (rect.width > maxAllowedWidth) {
    maxWidth = maxAllowedWidth;
  }

  // Calculate horizontal shift if bubble overflows right or left screen edges
  let shiftX = 0;
  if (rect.right > viewportWidth - padding) {
    shiftX = (viewportWidth - padding) - rect.right;
  }
  if (rect.left + shiftX < padding) {
    shiftX = padding - rect.left;
  }

  const tailOffset = shiftX !== 0 ? `${-shiftX}px` : null;

  return {
    flipped,
    maxWidth,
    shiftX,
    tailOffset,
  };
}

/**
 * Adjusts the DOM styles of the speech bubble to stay strictly within screen bounds.
 */
export function adjustBubblePosition(
  bubble: HTMLElement | null,
  options: BubblePositionOptions = {}
): void {
  if (!bubble || !bubble.classList.contains('visible')) return;

  const padding = options.padding ?? DEFAULT_PADDING;
  const minAllowedWidth = options.minAllowedWidth ?? DEFAULT_ALLOWED_WIDTH;
  const viewportWidth = options.viewportWidth ?? window.innerWidth;

  // 1. Reset any previous manual adjustments to measure natural layout
  bubble.style.transform = '';
  bubble.style.maxWidth = '';
  bubble.style.removeProperty('--tail-offset');
  bubble.classList.remove('bubble-flipped');

  // 2. Measure vertical bounds and flip if overflowing top
  const initialRect = bubble.getBoundingClientRect();
  if (initialRect.top < padding) {
    bubble.classList.add('bubble-flipped');
  }

  // 3. Measure updated bounds and calculate horizontal constraints
  const updatedRect = bubble.getBoundingClientRect();
  const maxAllowedWidth = Math.max(minAllowedWidth, viewportWidth - 2 * padding);
  if (updatedRect.width > maxAllowedWidth) {
    bubble.style.maxWidth = `${maxAllowedWidth}px`;
  }

  let shiftX = 0;
  if (updatedRect.right > viewportWidth - padding) {
    shiftX = (viewportWidth - padding) - updatedRect.right;
  }
  if (updatedRect.left + shiftX < padding) {
    shiftX = padding - updatedRect.left;
  }

  // 4. Apply horizontal shift and tail offset
  if (shiftX !== 0) {
    bubble.style.transform = `translateX(calc(-50% + ${shiftX}px)) translateY(0) scale(1)`;
    bubble.style.setProperty('--tail-offset', `${-shiftX}px`);
  }

  if (options.debug) {
    logger.debug('out-of-bounds', 'adjustBubblePosition calculation', {
      rect: updatedRect,
      shiftX,
      flipped: initialRect.top < padding,
      viewportWidth,
    });
  }
}

/**
 * Calculates clamped position for companion dragging so it never leaves screen boundaries.
 */
export function clampCompanionPosition(options: ClampCompanionOptions): ClampedPositionResult {
  const {
    currentPosX,
    currentPosY,
    dx,
    dy,
    wrapperRect,
    padding = DEFAULT_PADDING,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
    debug = false,
  } = options;

  const minX = currentPosX - (wrapperRect.left - padding);
  const maxX = currentPosX + (viewportWidth - padding - wrapperRect.right);
  const minY = currentPosY - (wrapperRect.top - padding);
  const maxY = currentPosY + (viewportHeight - padding - wrapperRect.bottom);

  let posX = currentPosX + dx;
  if (minX <= maxX) {
    posX = Math.max(minX, Math.min(maxX, posX));
  } else {
    posX = minX;
  }

  let posY = currentPosY + dy;
  if (minY <= maxY) {
    posY = Math.max(minY, Math.min(maxY, posY));
  } else {
    posY = minY;
  }

  if (debug) {
    logger.debug('out-of-bounds', 'clampCompanionPosition calculation', {
      input: { currentPosX, currentPosY, dx, dy },
      bounds: { minX, maxX, minY, maxY },
      result: { posX, posY },
    });
  }

  return { posX, posY, minX, maxX, minY, maxY };
}

/**
 * Ensures the companion wrapper is clamped strictly within screen bounds and adjusts the speech bubble.
 */
export function enforceCompanionInBounds(
  companionWrapper: HTMLElement | null,
  currentPosX: number,
  currentPosY: number,
  bubble: HTMLElement | null,
  options?: { padding?: number; debug?: boolean }
): { posX: number; posY: number } {
  if (!companionWrapper) return { posX: currentPosX, posY: currentPosY };

  const isCenter = companionWrapper.classList.contains('layout-center');
  let newPosX = currentPosX;
  let newPosY = currentPosY;

  if (!isCenter) {
    const wrapperRect = companionWrapper.getBoundingClientRect();
    const clamped = clampCompanionPosition({
      currentPosX,
      currentPosY,
      dx: 0,
      dy: 0,
      wrapperRect,
      padding: options?.padding ?? DEFAULT_PADDING,
      debug: options?.debug,
    });
    newPosX = clamped.posX;
    newPosY = clamped.posY;

    companionWrapper.style.transform = (newPosX !== 0 || newPosY !== 0)
      ? `translate(${newPosX}px, ${newPosY}px)`
      : '';
  }

  adjustBubblePosition(bubble, options);

  return { posX: newPosX, posY: newPosY };
}
