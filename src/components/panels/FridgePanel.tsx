import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';
import { getItemDefinition, ItemConfigEntry } from '../../items/items-registry';
import { getIconSrc, REGISTERED_ICONS } from '../../assets/icon-loader';
import type { UserItemsData } from '../../types/ipc';
import { processItemUsage } from '../../items/item-processor';
import { Particle, ParticlePosition } from '../effects/Particle';

/**
 * Global Default Fridge Grid Dimensions.
 * Configured as a 5x5 grid with 35 capacity.
 */
export const DEFAULT_FRIDGE_CONFIG = {
  columns: 5,
  rows: 5,
  totalSlots: 35,
};

export interface FridgePanelProps extends PanelProps {
  columns?: number;
  rows?: number;
  totalSlots?: number;
}

export interface FridgeItemDisplay {
  id: string;
  quantity: number;
  title: string;
  icon?: string;
  description?: string;
  cost?: number;
  definition?: ItemConfigEntry;
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

export const FridgePanel: React.FC<FridgePanelProps> = ({
  onClose,
  columns = DEFAULT_FRIDGE_CONFIG.columns,
  rows = DEFAULT_FRIDGE_CONFIG.rows,
  totalSlots,
}) => {
  const effectiveTotalSlots = totalSlots ?? DEFAULT_FRIDGE_CONFIG.totalSlots ?? (columns * rows);

  const [items, setItems] = useState<FridgeItemDisplay[]>([]);
  const [hoveredItem, setHoveredItem] = useState<FridgeItemDisplay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal and Item Usage State
  const [selectedItem, setSelectedItem] = useState<FridgeItemDisplay | null>(null);
  const [useAmount, setUseAmount] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [particles, setParticles] = useState<ActiveParticleData[]>([]);

  const loadFridgeItems = async () => {
    try {
      let data: UserItemsData | null = null;

      if (typeof window !== 'undefined' && (window as any).electronAPI?.getUserItems) {
        data = await (window as any).electronAPI.getUserItems();
      } else if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
        const raw = await (window as any).electronAPI.readMemoryFile('user-items.json');
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = null;
          }
        }
      }

      const rawFridge = data?.fridge || [];
      const parsedItems: FridgeItemDisplay[] = [];

      for (let i = 0; i < rawFridge.length; i++) {
        const entry = rawFridge[i];
        let id = '';
        let quantity = 1;

        if (Array.isArray(entry)) {
          id = String(entry[0] || '');
          quantity = typeof entry[1] === 'number' ? entry[1] : 1;
        } else if (entry && typeof entry === 'object') {
          id = String(entry.id || entry.itemId || '');
          quantity = typeof entry.quantity === 'number' ? entry.quantity : (entry.amount || 1);
        } else if (typeof entry === 'string') {
          id = entry;
          if (i + 1 < rawFridge.length && typeof rawFridge[i + 1] === 'number') {
            quantity = rawFridge[i + 1];
            i++; // skip quantity number
          } else {
            quantity = 1;
          }
        }

        if (id) {
          const def = getItemDefinition(id);
          parsedItems.push({
            id,
            quantity,
            title: def?.title || id,
            icon: def?.icon || id,
            description: def?.details || (def?.title || 'Food Item'),
            cost: def?.cost,
            definition: def,
          });
        }
      }

      setItems(parsedItems);
    } catch (err) {
      console.warn('[FridgePanel] Failed to load user fridge items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFridgeItems();
  }, []);

  const handleSlotClick = (item: FridgeItemDisplay) => {
    setSelectedItem(item);
    setUseAmount(1);
  };

  const handleCancelUse = () => {
    setSelectedItem(null);
    setUseAmount(1);
  };

  const spawnParticleEffect = (item: FridgeItemDisplay, amountToSpawn: number = 1) => {
    // Start: Center of Fridge Panel
    const fridgeEl = document.querySelector('.fridge-panel-card');
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (fridgeEl) {
      const rect = fridgeEl.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }

    // End: Center of Companion Avatar
    const avatarEl = document.querySelector('#avatar') || document.querySelector('#avatar-canvas');
    let endX = window.innerWidth - 120;
    let endY = window.innerHeight - 120;

    if (avatarEl) {
      const rect = avatarEl.getBoundingClientRect();
      endX = rect.left + rect.width / 2;
      endY = rect.top + rect.height / 2;
    }

    const count = Math.min(amountToSpawn, 5);
    const newParticles: ActiveParticleData[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `fridge-particle-${baseTime}-${i}-${Math.random()}`,
        icon: item.icon,
        emoji: item.icon,
        title: item.title,
        startPos: {
          x: startX + (Math.random() * 24 - 12),
          y: startY + (Math.random() * 24 - 12),
        },
        endPos: {
          x: endX + (Math.random() * 16 - 8),
          y: endY + (Math.random() * 16 - 8),
        },
        delayMs: i * 90,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  };

  const handleParticleComplete = (particleId: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== particleId));
  };

  const handleUseItem = async () => {
    if (!selectedItem || isProcessing) return;

    setIsProcessing(true);
    try {
      // Spawn Particle Animation to Avatar
      spawnParticleEffect(selectedItem, useAmount);

      // Determine and dispatch behavioral monitoring event (FOOD_USED)
      const eventId = 'FOOD_USED';

      if (typeof window !== 'undefined' && (window as any).electronAPI?.processMonitoringEvent) {
        try {
          const reaction = await (window as any).electronAPI.processMonitoringEvent({
            eventId,
            domain: 'fridge',
            message: `Fed ${selectedItem.title} x${useAmount}`,
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
          console.warn('[FridgePanel] Failed to dispatch behavioral event:', eventErr);
        }
      }

      // Apply item effects (emotion deltas) and deduct from inventory
      await processItemUsage({
        itemId: selectedItem.id,
        amount: useAmount,
        domain: undefined,
        deduct: true,
      });

      // Reload fridge items & reset modal
      await loadFridgeItems();
      setSelectedItem(null);
      setUseAmount(1);
    } catch (err) {
      console.error('[FridgePanel] Failed to use food item:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderEffects = (def?: ItemConfigEntry) => {
    if (!def) return null;

    const badges = [];

    if (def.deltas && Object.keys(def.deltas).length > 0) {
      const deltaItems = Object.entries(def.deltas).map(([emotion, val]) => {
        const totalDelta = (val as number) * useAmount;
        const sign = totalDelta > 0 ? `+${totalDelta}` : `${totalDelta}`;
        return `${sign} ${emotion}`;
      });
      badges.push(
        <span key="deltas" className="store-meta-badge badge-deltas">
          {deltaItems.join(', ')}
        </span>
      );
    }

    if (badges.length === 0) {
      badges.push(
        <span key="neutral" className="store-meta-badge badge-neutral">
          Enjoy Treat
        </span>
      );
    }

    return (
      <div className="fridge-use-effects">
        <span className="fridge-effects-label">Effects:</span>
        <div className="fridge-effects-badges">{badges}</div>
      </div>
    );
  };

  // Build full slots array based on configured capacity
  const slots: (FridgeItemDisplay | null)[] = Array.from({ length: effectiveTotalSlots }, (_, idx) => {
    return items[idx] || null;
  });

  const selectedDef = selectedItem ? (selectedItem.definition || getItemDefinition(selectedItem.id)) : undefined;
  const selectedIconSrc = selectedItem ? getIconSrc(selectedItem.icon) : undefined;

  return (
    <PanelContainer title="Fridge" icon={REGISTERED_ICONS.fridge || '🧊'} className="fridge-panel-card" onClose={onClose}>
      {/* Item hover info bar */}
      <div className="fridge-hover-info">
        {hoveredItem ? (
          <>
            <span className="fridge-hover-name">{hoveredItem.title}</span>
            <span className="fridge-hover-desc">Amount: x{hoveredItem.quantity}</span>
          </>
        ) : (
          <span className="fridge-hover-desc">
            {loading ? 'Loading groceries...' : `${items.length} / ${effectiveTotalSlots} slots filled`}
          </span>
        )}
      </div>

      <div className="fridge-chest-frame">
        <div
          className="fridge-grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {slots.map((item, idx) => {
            const isFilled = Boolean(item);
            const iconSrc = item ? getIconSrc(item.icon) : undefined;

            return (
              <div
                key={idx}
                className={`fridge-slot ${isFilled ? 'filled' : 'empty'}`}
                onMouseEnter={() => {
                  if (item) setHoveredItem(item);
                }}
                onMouseLeave={() => {
                  if (hoveredItem === item) setHoveredItem(null);
                }}
                onClick={() => {
                  if (item) handleSlotClick(item);
                }}
                title={item ? `${item.title} (x${item.quantity}) - Click to eat` : undefined}
              >
                {item && (
                  <>
                    <div className="fridge-item-icon-wrap">
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={item.title}
                          className="fridge-item-icon-img"
                        />
                      ) : (
                        <span className="fridge-item-emoji">{item.icon || '🍫'}</span>
                      )}
                    </div>
                    <span className="fridge-item-count">{item.quantity}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Food Item Usage Modal */}
      {selectedItem && (
        <div className="fridge-use-overlay" onClick={handleCancelUse}>
          <div className="fridge-use-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fridge-use-header">
              <div className="fridge-use-icon-box">
                {selectedIconSrc ? (
                  <img src={selectedIconSrc} alt={selectedItem.title} className="fridge-use-icon-img" />
                ) : (
                  <span className="fridge-use-icon-emoji">{selectedItem.icon || '🍫'}</span>
                )}
              </div>
              <div className="fridge-use-title-wrap">
                <h4 className="fridge-use-title">{selectedItem.title}</h4>
                <p className="fridge-use-desc">{selectedItem.description || 'Feed this food to Chleo.'}</p>
              </div>
            </div>

            {/* Emotional / Behavioral Effects Summary */}
            {renderEffects(selectedDef)}

            {/* Quantity Stepper */}
            <div className="store-stepper-wrap">
              <span className="store-stepper-label">Amount:</span>
              <div className="store-stepper-controls">
                <button
                  type="button"
                  className="store-stepper-btn"
                  onClick={() => setUseAmount((prev) => Math.max(1, prev - 1))}
                  disabled={useAmount <= 1 || isProcessing}
                >
                  -
                </button>
                <span className="store-stepper-value">{useAmount}</span>
                <button
                  type="button"
                  className="store-stepper-btn"
                  onClick={() => setUseAmount((prev) => Math.min(selectedItem.quantity, prev + 1))}
                  disabled={useAmount >= selectedItem.quantity || isProcessing}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="store-modal-actions">
              <button
                type="button"
                className="store-modal-btn cancel"
                onClick={handleCancelUse}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="store-modal-btn confirm fridge-confirm-btn"
                onClick={handleUseItem}
                disabled={isProcessing}
              >
                {isProcessing ? 'Feeding...' : 'Eat / Feed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Animation Particles */}
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
