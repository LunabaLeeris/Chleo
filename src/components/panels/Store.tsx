import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';
import { getItemsConfig, setItemsConfig, ItemConfigEntry, ItemsConfig } from '../../items/items-registry';
import { getIconSrc } from '../../assets/icon-loader';
import { InventoryTarget } from '../../types/ipc';
import { Particle, ParticlePosition } from '../effects/Particle';

export type StoreTab = 'items' | 'groceries' | 'clothing';

export interface StoreProps extends PanelProps { }

export interface StoreItemEntry extends ItemConfigEntry {
  id: string;
}

export interface ActiveParticleData {
  id: string;
  icon?: string;
  emoji?: string;
  title?: string;
  startPos: ParticlePosition;
  endPos: ParticlePosition;
  delayMs?: number;
}

/**
 * Check if the last reset timestamp/date was from a previous calendar day or older.
 */
export const shouldReplenish = (lastReset: number | string | undefined): boolean => {
  if (!lastReset) return true;

  let resetDate: Date;
  if (typeof lastReset === 'number') {
    // If it's a small number like 124 (dummy seed value), it's not today's timestamp
    if (lastReset < 100000000000) {
      return true;
    }
    resetDate = new Date(lastReset);
  } else if (typeof lastReset === 'string') {
    const parsed = Date.parse(lastReset);
    if (isNaN(parsed)) return true;
    resetDate = new Date(parsed);
  } else {
    return true;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return resetDate.getTime() < startOfToday;
};

/**
 * Checks items/food categories for daily replenishment against daily_stock.
 */
export const checkAndReplenishStock = async (cfg: ItemsConfig): Promise<ItemsConfig> => {
  let modified = false;
  const updated: ItemsConfig = JSON.parse(JSON.stringify(cfg));
  const now = Date.now();

  // Replenish items category
  if (shouldReplenish(updated.items_last_reset)) {
    if (updated.items) {
      for (const key of Object.keys(updated.items)) {
        if (typeof updated.items[key].daily_stock === 'number') {
          updated.items[key].stock = updated.items[key].daily_stock;
          modified = true;
        }
      }
    }
    updated.items_last_reset = now;
    modified = true;
  }

  // Replenish groceries / food category
  if (shouldReplenish(updated.food_last_reset)) {
    if (updated.food) {
      for (const key of Object.keys(updated.food)) {
        if (typeof updated.food[key].daily_stock === 'number') {
          updated.food[key].stock = updated.food[key].daily_stock;
          modified = true;
        }
      }
    }
    updated.food_last_reset = now;
    modified = true;
  }

  if (modified) {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveMemoryFile) {
      try {
        await (window as any).electronAPI.saveMemoryFile(
          'items-config.json',
          JSON.stringify(updated, null, 2)
        );
      } catch (e) {
        console.warn('[Store] Failed to save replenished items-config:', e);
      }
    }
    setItemsConfig(updated);
  }

  return updated;
};

export const Store: React.FC<StoreProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<StoreTab>('items');
  const [config, setConfig] = useState<ItemsConfig>(getItemsConfig());
  const [selectedItem, setSelectedItem] = useState<StoreItemEntry | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [particles, setParticles] = useState<ActiveParticleData[]>([]);

  // Load items config and check for daily stock replenishment
  const loadStoreConfig = async () => {
    try {
      let currentCfg: ItemsConfig = getItemsConfig();
      if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
        const raw = await (window as any).electronAPI.readMemoryFile('items-config.json');
        if (raw) {
          try {
            currentCfg = JSON.parse(raw);
          } catch {
            // fallback to current
          }
        }
      }
      const finalCfg = await checkAndReplenishStock(currentCfg);
      setConfig(finalCfg);
    } catch (err) {
      console.warn('[Store] Failed to load items config:', err);
    }
  };

  useEffect(() => {
    loadStoreConfig();
  }, []);

  // Format category items
  const getTabItems = (): StoreItemEntry[] => {
    let source: Record<string, ItemConfigEntry> | undefined;
    if (activeTab === 'items') {
      source = config.items;
    } else if (activeTab === 'groceries') {
      source = config.food;
    } else if (activeTab === 'clothing') {
      source = config.wearables;
    }

    if (!source) return [];

    return Object.entries(source).map(([id, entry]) => ({
      id,
      ...entry,
    }));
  };

  const currentItems = getTabItems();
  const coinIconSrc = getIconSrc('coin');

  const handleCardClick = (item: StoreItemEntry) => {
    const stock = typeof item.stock === 'number' ? item.stock : (item.daily_stock ?? 0);
    if (stock <= 0) return;

    setSelectedItem(item);
    setPurchaseAmount(1);
    setErrorMessage(null);
  };

  const spawnParticleEffect = (item: StoreItemEntry, target: InventoryTarget, amount: number = 1) => {
    // Starting position: center of the Store panel
    const storeEl = document.querySelector('.store-panel-card');
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (storeEl) {
      const rect = storeEl.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }

    // Ending position: storage menu bar item (or target specific button if available)
    const targetBtn =
      document.querySelector(`.menu-item-btn[data-id="${target}"]`) ||
      document.querySelector('.menu-item-btn[data-id="storage"]');

    const menuListEl =
      document.querySelector('.menu-bar-list') ||
      document.querySelector('.menu-bar-panel') ||
      document.querySelector('#menu-bar');

    let endX = startX + 220;
    let endY = startY;

    if (menuListEl) {
      const menuRect = menuListEl.getBoundingClientRect();
      const marginY = 18; // Half-height of menu item button
      const minY = menuRect.top + marginY;
      const maxY = menuRect.bottom - marginY;

      if (targetBtn) {
        const btnRect = targetBtn.getBoundingClientRect();
        endX = btnRect.left + btnRect.width / 2;
        endY = btnRect.top + btnRect.height / 2;
      } else {
        endX = menuRect.left + menuRect.width / 2;
        endY = menuRect.top + menuRect.height / 2;
      }

      // Clamp vertical position so it never despawns outside the top or bottom of the menu bar
      if (endY < minY) {
        endY = minY;
      } else if (endY > maxY) {
        endY = maxY;
      }

      // Ensure horizontal position stays centered inside the menu bar
      const minX = menuRect.left + 16;
      const maxX = menuRect.right - 16;
      if (endX < minX) endX = minX;
      if (endX > maxX) endX = maxX;
    } else if (targetBtn) {
      const rect = targetBtn.getBoundingClientRect();
      endX = rect.left + rect.width / 2;
      endY = rect.top + rect.height / 2;
    }

    // Spawn 1 particle per item bought (capped at a max of 12 for smooth rendering on large bulk buys)
    const particleCount = Math.min(Math.max(1, amount), 12);
    const newParticles: ActiveParticleData[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Subtle spread so particles don't completely overlap
      const jitterX = particleCount > 1 ? (Math.random() - 0.5) * 24 : 0;
      const jitterY = particleCount > 1 ? (Math.random() - 0.5) * 24 : 0;

      newParticles.push({
        id: `particle-${item.id}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        icon: item.icon,
        title: item.title,
        startPos: { x: startX + jitterX, y: startY + jitterY },
        endPos: { x: endX, y: endY },
        delayMs: i * 85, // Stagger particle launch
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  };

  const handleParticleComplete = (particleId: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== particleId));
  };

  const handleConfirmPurchase = async () => {
    if (!selectedItem) return;

    // Destination category based on current store tab
    let target: InventoryTarget = 'storage';
    if (activeTab === 'groceries') {
      target = 'fridge';
    } else if (activeTab === 'clothing') {
      target = 'closet';
    }

    const itemToAnimate = selectedItem;
    const countToSpawn = purchaseAmount;
    const costPerUnit = typeof selectedItem.cost === 'number' ? selectedItem.cost : 0;

    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.purchaseItem) {
        const result = await (window as any).electronAPI.purchaseItem({
          target,
          itemId: selectedItem.id,
          amount: purchaseAmount,
          costPerUnit,
        });

        if (!result?.success) {
          setErrorMessage(result?.error || 'Not enough coins!');
          return;
        }
      }

      // Deduct stock in items-config
      const nextConfig: ItemsConfig = JSON.parse(JSON.stringify(config));
      let category: 'items' | 'food' | 'wearables' = 'items';
      if (activeTab === 'groceries' || nextConfig.food?.[itemToAnimate.id]) {
        category = 'food';
      } else if (activeTab === 'clothing' || nextConfig.wearables?.[itemToAnimate.id]) {
        category = 'wearables';
      }

      if (nextConfig[category] && nextConfig[category][itemToAnimate.id]) {
        const curStock = typeof nextConfig[category][itemToAnimate.id].stock === 'number'
          ? nextConfig[category][itemToAnimate.id].stock!
          : (nextConfig[category][itemToAnimate.id].daily_stock ?? countToSpawn);
        nextConfig[category][itemToAnimate.id].stock = Math.max(0, curStock - countToSpawn);

        if (typeof window !== 'undefined' && (window as any).electronAPI?.saveMemoryFile) {
          try {
            await (window as any).electronAPI.saveMemoryFile(
              'items-config.json',
              JSON.stringify(nextConfig, null, 2)
            );
          } catch (saveErr) {
            console.warn('[Store] Failed to save updated items-config:', saveErr);
          }
        }
        setItemsConfig(nextConfig);
        setConfig(nextConfig);
      }

      // Determine behavioral monitoring event (FOOD_BOUGHT vs ITEM_BOUGHT)
      const isFood = activeTab === 'groceries' || target === 'fridge' || Boolean(config.food && config.food[itemToAnimate.id]);
      const eventId = isFood ? 'FOOD_BOUGHT' : 'ITEM_BOUGHT';

      if (typeof window !== 'undefined' && (window as any).electronAPI?.processMonitoringEvent) {
        try {
          const reaction = await (window as any).electronAPI.processMonitoringEvent({
            eventId,
            domain: 'store',
            message: `Bought ${itemToAnimate.title} x${countToSpawn}`,
            timestamp: Date.now(),
          });

          if (reaction?.speechText && typeof (window as any).playCompanionSpeech === 'function') {
            (window as any).playCompanionSpeech(
              reaction.speechText,
              reaction.overallEmotion,
              reaction.responseType
            );
          }
        } catch (eventErr) {
          console.warn('[Store] Failed to dispatch behavioral event:', eventErr);
        }
      }

      // Trigger particle animation effect matching quantity purchased
      spawnParticleEffect(itemToAnimate, target, countToSpawn);

      setSelectedItem(null);
      setPurchaseAmount(1);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Purchase failed');
    }
  };

  const handleCancelPurchase = () => {
    setSelectedItem(null);
    setPurchaseAmount(1);
    setErrorMessage(null);
  };

  // Duration or Deltas or Status
  const renderRow3Meta = (item: StoreItemEntry, isOutOfStock: boolean) => {
    if (isOutOfStock) {
      return <span className="store-meta-badge badge-out-of-stock">Out of Stock</span>;
    }

    if (item.duration) {
      const minutes = Math.round(item.duration / 60);
      const label = minutes >= 1 ? `+${minutes}m` : `+${item.duration}s`;
      return <span className="store-meta-badge badge-duration">{label}</span>;
    }

    if (item.deltas && Object.keys(item.deltas).length > 0) {
      const deltaStrings = Object.entries(item.deltas).map(([emotion, val]) => {
        const sign = val > 0 ? `+${val}` : `${val}`;
        return `${sign} ${emotion}`;
      });
      return (
        <span className="store-meta-badge badge-deltas" title={deltaStrings.join(', ')}>
          {deltaStrings.join(', ')}
        </span>
      );
    }

    if (item.status) {
      return <span className="store-meta-badge badge-status">{item.status}</span>;
    }

    return <span className="store-meta-badge badge-neutral">Item</span>;
  };

  return (
    <PanelContainer title="Store" icon="store" className="store-panel-card" onClose={onClose}>
      {/* Top Header Controls: Tabs & Daily Stock Notice */}
      <div className="store-top-bar">
        <div className="store-tabs-wrap">
          <button
            type="button"
            className={`store-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items
          </button>
          <button
            type="button"
            className={`store-tab-btn ${activeTab === 'groceries' ? 'active' : ''}`}
            onClick={() => setActiveTab('groceries')}
          >
            Groceries
          </button>
          <button
            type="button"
            className={`store-tab-btn ${activeTab === 'clothing' ? 'active' : ''}`}
            onClick={() => setActiveTab('clothing')}
          >
            Clothing
          </button>
        </div>
      </div>
      <div className="store-replenish-hint">
        <span>Stock replenishes every day</span>
      </div>
      {/* Item Card Grid */}
      <div className="store-items-container">
        {currentItems.length === 0 ? (
          <div className="store-empty-message">
            <span className="store-empty-icon">🏪</span>
            <p>No items in this category yet.</p>
          </div>
        ) : (
          <div className="store-grid">
            {currentItems.map((item, index) => {
              const iconSrc = getIconSrc(item.icon) || (item.icon === 'avoid' ? getIconSrc('hourglass') : undefined);
              const cost = typeof item.cost === 'number' ? item.cost : 0;
              const stock = typeof item.stock === 'number' ? item.stock : (item.daily_stock ?? 0);
              const isOutOfStock = stock <= 0;

              return (
                <div
                  key={item.id || index}
                  className={`store-item-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                  onClick={isOutOfStock ? undefined : () => handleCardClick(item)}
                  role="button"
                  tabIndex={isOutOfStock ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!isOutOfStock && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleCardClick(item);
                    }
                  }}
                >
                  <div className="store-card-row-icon">
                    <div className="store-card-stock-badge">
                      <span>{stock} left</span>
                    </div>

                    <div className="store-card-cost-badge">
                      {coinIconSrc && <img src={coinIconSrc} alt="coin" className="store-cost-coin-img" />}
                      <span>{cost}</span>
                    </div>

                    <div className="store-card-icon-box">
                      {iconSrc ? (
                        <img src={iconSrc} alt={item.title} className="store-card-icon-img" />
                      ) : (
                        <span className="store-card-icon-emoji">{item.icon || '📦'}</span>
                      )}
                    </div>
                  </div>

                  <div className="store-card-row-details">
                    <h4 className="store-card-title">{item.title}</h4>
                    <p className="store-card-desc">{item.details || 'No description'}</p>
                  </div>

                  <div className="store-card-row-meta">
                    {renderRow3Meta(item, isOutOfStock)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Confirmation Modal */}
      {selectedItem && (
        <div className="store-purchase-overlay" onClick={handleCancelPurchase}>
          <div className="store-purchase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="store-purchase-prompt">
              <span>Buy <strong>{selectedItem.title}</strong> for</span>
              <span className="store-price-tag">
                {coinIconSrc && <img src={coinIconSrc} alt="coin" className="store-modal-coin-img" />}
                <span>{selectedItem.cost || 0}</span>
              </span>
              <span>coins?</span>
            </div>

            {/* Quantity Stepper */}
            {(() => {
              const availableStock = typeof selectedItem.stock === 'number'
                ? selectedItem.stock
                : (selectedItem.daily_stock ?? 1);

              return (
                <div className="store-stepper-wrap">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="store-stepper-label">Amount:</span>
                    <span className="store-modal-stock-hint">({availableStock} available)</span>
                  </div>
                  <div className="store-stepper-controls">
                    <button
                      type="button"
                      className="store-stepper-btn"
                      onClick={() => setPurchaseAmount((prev) => Math.max(1, prev - 1))}
                      disabled={purchaseAmount <= 1}
                    >
                      -
                    </button>
                    <span className="store-stepper-value">{purchaseAmount}</span>
                    <button
                      type="button"
                      className="store-stepper-btn"
                      onClick={() => setPurchaseAmount((prev) => Math.min(availableStock, prev + 1))}
                      disabled={purchaseAmount >= availableStock}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Total Cost Calculation */}
            <div className="store-modal-total-cost">
              <span>Total:</span>
              <span className="store-total-amount">
                {coinIconSrc && <img src={coinIconSrc} alt="coin" className="store-modal-coin-img" />}
                {(selectedItem.cost || 0) * purchaseAmount} coins
              </span>
            </div>

            {errorMessage && (
              <div className="store-modal-error">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="store-modal-actions">
              <button
                type="button"
                className="store-modal-btn cancel"
                onClick={handleCancelPurchase}
              >
                Cancel
              </button>
              <button
                type="button"
                className="store-modal-btn confirm"
                onClick={handleConfirmPurchase}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render active purchase animation particles */}
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          id={particle.id}
          icon={particle.icon}
          emoji={particle.emoji}
          title={particle.title}
          startPos={particle.startPos}
          endPos={particle.endPos}
          delayMs={particle.delayMs}
          onComplete={handleParticleComplete}
        />
      ))}
    </PanelContainer>
  );
};
