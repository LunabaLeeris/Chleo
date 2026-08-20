import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';
import { getItemsConfig, ItemConfigEntry, ItemsConfig } from '../../items/items-registry';
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

export const Store: React.FC<StoreProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<StoreTab>('items');
  const [config, setConfig] = useState<ItemsConfig>(getItemsConfig());
  const [selectedItem, setSelectedItem] = useState<StoreItemEntry | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [particles, setParticles] = useState<ActiveParticleData[]>([]);

  // Fetch initial item config
  useEffect(() => {
    setConfig(getItemsConfig());
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
  const renderRow3Meta = (item: StoreItemEntry) => {
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
      {/* Top Header Controls: Coin Balance & Tabs */}
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

              return (
                <div
                  key={item.id || index}
                  className="store-item-card"
                  onClick={() => handleCardClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(item);
                    }
                  }}
                >
                  <div className="store-card-row-icon">
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
                    {renderRow3Meta(item)}
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
            <div className="store-stepper-wrap">
              <span className="store-stepper-label">Amount:</span>
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
                  onClick={() => setPurchaseAmount((prev) => prev + 1)}
                >
                  +
                </button>
              </div>
            </div>

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
