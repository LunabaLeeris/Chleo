import type { StorageAdapter } from '../memory/memory-types';
import type { UserItemsData, InventoryTarget } from '../types/ipc';

const USER_ITEMS_FILENAME = 'user-items.json';

const DEFAULT_USER_ITEMS: UserItemsData = {
  coins: 0,
  storage: [],
  fridge: [],
  closet: [],
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
          closet: Array.isArray(parsed.closet) ? parsed.closet : [],
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
   * Append an item to user inventory category (storage, fridge, closet).
   * Increments quantity if item already exists in that category.
   */
  public addItem(target: InventoryTarget, itemId: string, quantity = 1): boolean {
    const data = this.cachedData || this.load();
    if (!Array.isArray(data[target])) {
      data[target] = [];
    }

    const list = data[target] as any[];
    let found = false;

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (Array.isArray(entry) && entry[0] === itemId) {
        entry[1] = (typeof entry[1] === 'number' ? entry[1] : 0) + quantity;
        found = true;
        break;
      } else if (entry && typeof entry === 'object' && (entry.id === itemId || entry.itemId === itemId)) {
        entry.quantity = (typeof entry.quantity === 'number' ? entry.quantity : (entry.amount || 0)) + quantity;
        found = true;
        break;
      }
    }

    if (!found) {
      list.push([itemId, quantity]);
    }

    data[target] = list;
    this.cachedData = data;
    return this.save();
  }

  /**
   * Purchase item: validates coin balance, deducts coins, and deposits item into target inventory.
   */
  public purchaseItem(
    target: InventoryTarget,
    itemId: string,
    quantity = 1,
    costPerUnit = 0
  ): { success: boolean; error?: string; remainingCoins: number } {
    const totalCost = Math.max(0, costPerUnit * quantity);
    const currentCoins = this.getCoins();

    if (currentCoins < totalCost) {
      return {
        success: false,
        error: `Insufficient coins. Need ${totalCost}, have ${currentCoins}.`,
        remainingCoins: currentCoins,
      };
    }

    if (totalCost > 0) {
      this.modifyCoins(-totalCost);
    }

    this.addItem(target, itemId, quantity);

    return {
      success: true,
      remainingCoins: this.getCoins(),
    };
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
