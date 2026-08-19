import STATUS_ICON from './icons/status.png';
import PUZZLES_ICON from './icons/puzzles.png';
import MONITORING_ICON from './icons/monitoring.png';
import DEBUG_ICON from './icons/debug.png';
import STAR_ICON from './icons/star.png';
import KEYBOARD_ICON from './icons/keyboard.png';
import SNAKE_ICON from './icons/snake.png';
import UNBLOCK_ICON from './icons/unblock.png';
import HOURGLASS_ICON from './icons/hourglass.png';
import LIGHTNING_ICON from './icons/lightning.png';
import CARDBG_ICON from './icons/cardbg.png';
import COIN_ICON from './icons/coin.png';
import CHEST_ICON from './icons/chest.png';

/**
 * Registry of all known/drawn icons.
 * When you draw and add new icons to `assets/icons/`, import and register them here.
 */
export const REGISTERED_ICONS: Record<string, string> = {
  status: STATUS_ICON,
  puzzle: PUZZLES_ICON,
  puzzles: PUZZLES_ICON,
  monitoring: MONITORING_ICON,
  debug: DEBUG_ICON,
  reward: STAR_ICON,
  rewards: STAR_ICON,
  star: STAR_ICON,
  coin: COIN_ICON,
  coins: COIN_ICON,
  typing: KEYBOARD_ICON,
  keyboard: KEYBOARD_ICON,
  snake: SNAKE_ICON,
  unblock: UNBLOCK_ICON,
  hourglass: HOURGLASS_ICON,
  avoid: HOURGLASS_ICON,
  lightning: LIGHTNING_ICON,
  quick_pass: LIGHTNING_ICON,
  quickpass: LIGHTNING_ICON,
  storage: CHEST_ICON,
  chest: CHEST_ICON,
  store: COIN_ICON,
  cardbg: CARDBG_ICON,
  matching: CARDBG_ICON,
};

/**
 * In-memory cache for preloaded HTMLImageElements.
 */
const iconImageCache: Map<string, HTMLImageElement> = new Map();

/**
 * Checks if a string is an image URL, path, or data URI.
 */
export function isImageSource(val?: string): boolean {
  if (!val || typeof val !== 'string') return false;
  return (
    val.endsWith('.png') ||
    val.endsWith('.svg') ||
    val.endsWith('.webp') ||
    val.endsWith('.gif') ||
    val.startsWith('data:image/') ||
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('/') ||
    val.startsWith('./')
  );
}

/**
 * Resolves an icon ID, image path, or returns undefined.
 */
export function getIconSrc(iconOrId?: string): string | undefined {
  if (!iconOrId) return undefined;
  if (REGISTERED_ICONS[iconOrId]) {
    return REGISTERED_ICONS[iconOrId];
  }
  if (isImageSource(iconOrId)) {
    return iconOrId;
  }
  return undefined;
}

/**
 * Preloads a single image into the memory cache.
 */
export function preloadIcon(src: string): Promise<HTMLImageElement> {
  if (iconImageCache.has(src)) {
    return Promise.resolve(iconImageCache.get(src)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      iconImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => {
      console.warn(`[IconLoader] Failed to preload icon: ${src}`, err);
      // Resolve anyway to avoid blocking Promise.all
      resolve(img);
    };
    img.src = src;
  });
}

/**
 * Preloads all registered icons in the background at startup.
 */
export async function preloadAllRegisteredIcons(): Promise<HTMLImageElement[]> {
  const iconUrls = Object.values(REGISTERED_ICONS).filter(Boolean);
  try {
    const results = await Promise.all(iconUrls.map(preloadIcon));
    console.log(`[IconLoader] Preloaded ${results.length} registered icons successfully.`);
    return results;
  } catch (err) {
    console.warn('[IconLoader] Error during icon preloading:', err);
    return [];
  }
}

export function renderIconHtml(
  iconOrId?: string,
  className = 'menu-icon-img',
  altText = 'icon'
): string {
  if (!iconOrId) return '';
  const src = getIconSrc(iconOrId);
  if (src) {
    return `<img src="${src}" class="${className}" alt="${altText}" />`;
  }
  return `<span class="icon-text">${iconOrId}</span>`;
}

export function registerIcon(id: string, src: string): void {
  REGISTERED_ICONS[id] = src;
  preloadIcon(src);
}
