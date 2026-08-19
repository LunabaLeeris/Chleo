import type { StorageAdapter } from '../memory/memory-types';
import type { UserItemsData } from '../types/ipc';

const USER_ITEMS_FILENAME = 'user-items.json';

const DEFAULT_USER_ITEMS: UserItemsData = {
  coins: 0,
  storage: [],
  fridge: [],
};

export type CoinsChangeListener = (newCoins: number, previousCoins: number) => void;

export class UserItemsStore {
  private storageAdapter: StorageAdapter;
  private cachedData: UserItemsData | null = null;
  private listeners: CoinsChangeListener[] = [];

  constructor(storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter;
    this.load();
  }

  /**
   * Load user items from storage or initialize defaults if missing.
   */
  public load(): UserItemsData {
    try {
      const raw = this.storageAdapter.readMemoryFile(USER_ITEMS_FILENAME);
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        this.cachedData = {
          ...DEFAULT_USER_ITEMS,
          ...parsed,
          coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
          storage: Array.isArray(parsed.storage) ? parsed.storage : [],
          fridge: Array.isArray(parsed.fridge) ? parsed.fridge : [],
        };
      } else {
        this.cachedData = { ...DEFAULT_USER_ITEMS };
        this.save();
      }
    } catch (err) {
      console.error('[UserItemsStore] Failed to parse user-items.json, using default structure:', err);
      this.cachedData = { ...DEFAULT_USER_ITEMS };
    }
    return this.cachedData;
  }

  /**
   * Save user items to storage.
   */
  public save(data?: UserItemsData): boolean {
    if (data) {
      this.cachedData = { ...this.cachedData, ...data };
    }
    if (!this.cachedData) {
      this.cachedData = { ...DEFAULT_USER_ITEMS };
    }
    try {
      return this.storageAdapter.saveMemoryFile(
        USER_ITEMS_FILENAME,
        JSON.stringify(this.cachedData, null, 2)
      );
    } catch (err) {
      console.error('[UserItemsStore] Failed to save user items:', err);
      return false;
    }
  }

  /**
   * Get complete user items data.
   */
  public getUserItems(): UserItemsData {
    const data = this.cachedData || this.load();
    return { ...data };
  }

  /**
   * Get current coin balance.
   */
  public getCoins(): number {
    const data = this.cachedData || this.load();
    return data.coins ?? 0;
  }

  /**
   * Set coin balance to a specific amount.
   */
  public setCoins(amount: number): number {
    const data = this.cachedData || this.load();
    const previousCoins = data.coins ?? 0;
    const safeAmount = Math.max(0, Math.floor(amount || 0));
    data.coins = safeAmount;
    this.cachedData = data;
    this.save();

    if (previousCoins !== safeAmount) {
      this.notifyCoinsChanged(safeAmount, previousCoins);
    }
    return safeAmount;
  }

  /**
   * Modify coin balance by delta (can be positive to add coins or negative to subtract coins).
   */
  public modifyCoins(delta: number): number {
    const current = this.getCoins();
    const target = current + (delta || 0);
    return this.setCoins(target);
  }

  /**
   * Subscribe to coin change events.
   */
  public onCoinsChange(listener: CoinsChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyCoinsChanged(newCoins: number, previousCoins: number): void {
    for (const listener of this.listeners) {
      try {
        listener(newCoins, previousCoins);
      } catch (err) {
        console.error('[UserItemsStore] Error in coins change listener:', err);
      }
    }
  }
}
