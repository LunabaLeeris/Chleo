import defaultItemsConfig from '../monitoring/config/items-config.json';
import type { PuzzleRewardItem } from '../monitoring/action-parser';

export interface ItemConfigEntry {
  title: string;
  icon?: string;
  status?: string;
  details?: string;
  duration?: number;
  cost?: number;
  deltas?: Record<string, number>;
  stock?: number;
  daily_stock?: number;
  [key: string]: any;
}

export interface ItemsConfig {
  items_last_reset?: number | string;
  food_last_reset?: number | string;
  items: Record<string, ItemConfigEntry>;
  wearables?: Record<string, ItemConfigEntry>;
  food?: Record<string, ItemConfigEntry>;
  [key: string]: any;
}

let cachedConfig: ItemsConfig = defaultItemsConfig as ItemsConfig;

/**
 * Update the global in-memory items configuration.
 */
export function setItemsConfig(config: ItemsConfig): void {
  if (config && typeof config === 'object' && config.items) {
    cachedConfig = config;
  }
}

/**
 * Get current items configuration.
 */
export function getItemsConfig(): ItemsConfig {
  return cachedConfig;
}

/**
 * Finds an item definition by ID across items, wearables, and food categories.
 */
export function getItemDefinition(
  itemId: string,
  config: ItemsConfig = cachedConfig
): ItemConfigEntry | undefined {
  if (!itemId) return undefined;
  return (
    config.items?.[itemId] ||
    config.wearables?.[itemId] ||
    config.food?.[itemId]
  );
}

/**
 * Resolves a reward item by merging base item attributes from items-config
 * with rule-specific descriptions or overrides.
 */
export function resolveRewardItem(
  item?: Partial<PuzzleRewardItem>,
  index = 0,
  config: ItemsConfig = cachedConfig
): PuzzleRewardItem {
  const id = item?.id;
  const def = id ? getItemDefinition(id, config) : undefined;

  const status = item?.status || def?.status || (id && id.startsWith('avoid') ? 'avoid' : 'unblock');
  const duration = typeof item?.duration === 'number' ? item.duration : def?.duration;
  const cost = typeof item?.cost === 'number' ? item.cost : def?.cost;

  const defaultTitle = def?.title || (status === 'avoid' ? (duration ? `Avoid (${Math.round(duration / 60)}m)` : 'Avoid') : 'Unblock');
  const defaultDesc = item?.description || (status === 'avoid' ? `Grant access for ${duration ? Math.round(duration / 60) : 30} minutes.` : 'Restore access for today.');
  const defaultIcon = def?.icon || (status === 'avoid' ? 'hourglass' : 'unblock');

  return {
    id: id || `${status}_${duration || index}`,
    title: item?.title || defaultTitle,
    description: item?.description || defaultDesc,
    icon: item?.icon || defaultIcon,
    status,
    duration,
    cost,
    ...(def ? { ...def, ...item } : (item && typeof item === 'object' ? item : {})),
  };
}
