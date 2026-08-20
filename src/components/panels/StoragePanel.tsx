import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';
import { getItemDefinition, ItemConfigEntry } from '../../items/items-registry';
import { getIconSrc } from '../../assets/icon-loader';
import type { UserItemsData } from '../../types/ipc';
import type { SiteRule } from '../../monitoring/monitoring-types';
import { processItemUsage } from '../../items/item-processor';
import { Particle, ParticlePosition } from '../effects/Particle';

/**
 * Global Default Storage Grid Dimensions.
 * Modify these to easily adjust the grid layout and total capacity.
 */
export const DEFAULT_STORAGE_CONFIG = {
  columns: 5,
  rows: 5,
  totalSlots: 35,
};

export interface StoragePanelProps extends PanelProps {
  columns?: number;
  rows?: number;
  totalSlots?: number;
}

export interface StorageItemDisplay {
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

export const StoragePanel: React.FC<StoragePanelProps> = ({
  onClose,
  columns = DEFAULT_STORAGE_CONFIG.columns,
  rows = DEFAULT_STORAGE_CONFIG.rows,
  totalSlots,
}) => {
  const effectiveTotalSlots = totalSlots ?? DEFAULT_STORAGE_CONFIG.totalSlots ?? (columns * rows);

  const [items, setItems] = useState<StorageItemDisplay[]>([]);
  const [hoveredItem, setHoveredItem] = useState<StorageItemDisplay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal and Item Usage State
  const [selectedItem, setSelectedItem] = useState<StorageItemDisplay | null>(null);
  const [useAmount, setUseAmount] = useState<number>(1);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [particles, setParticles] = useState<ActiveParticleData[]>([]);

  const isUnblockItem = (def?: ItemConfigEntry, id?: string): boolean => {
    return def?.status === 'unblock' || id === 'unblock_site';
  };

  const isAvoidItem = (def?: ItemConfigEntry, id?: string): boolean => {
    return (
      def?.status === 'avoid' ||
      (typeof id === 'string' && id.startsWith('avoid')) ||
      (typeof def?.duration === 'number' && def.duration > 0)
    );
  };

  const requiresDomain = (def?: ItemConfigEntry, id?: string): boolean => {
    return isUnblockItem(def, id) || isAvoidItem(def, id);
  };

  const loadStorageItems = async () => {
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

      const rawStorage = data?.storage || [];
      const parsedItems: StorageItemDisplay[] = [];

      rawStorage.forEach((entry: any) => {
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
          quantity = 1;
        }

        if (id) {
          const def = getItemDefinition(id);
          parsedItems.push({
            id,
            quantity,
            title: def?.title || id,
            icon: def?.icon || id,
            description: def?.details || (def?.status === 'avoid'
              ? `Avoid Mode (${def?.duration ? Math.round(def.duration / 60) : 30}m)`
              : (def?.title || 'Storage Item')),
            cost: def?.cost,
            definition: def,
          });
        }
      });

      setItems(parsedItems);
    } catch (err) {
      console.warn('[StoragePanel] Failed to load user storage items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorageItems();
  }, []);

  const handleSlotClick = async (item: StorageItemDisplay) => {
    setSelectedItem(item);
    setUseAmount(1);

    const def = item.definition || getItemDefinition(item.id);
    const needsDomain = requiresDomain(def, item.id);

    if (needsDomain) {
      try {
        let siteRules: SiteRule[] = [];
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSiteRules) {
          siteRules = await (window as any).electronAPI.getSiteRules();
        }

        let candidateRules: SiteRule[] = [];
        if (isUnblockItem(def, item.id)) {
          candidateRules = siteRules.filter((r) => r.type === 'blocked' || r.type === 'avoid');
        } else if (isAvoidItem(def, item.id)) {
          candidateRules = siteRules.filter((r) => r.type === 'avoid');
        }

        const domainList = candidateRules.map((r) => r.domain);
        setAvailableDomains(domainList);
        setSelectedDomain(domainList[0] || '');
      } catch (err) {
        console.warn('[StoragePanel] Failed to fetch site rules:', err);
        setAvailableDomains([]);
        setSelectedDomain('');
      }
    } else {
      setAvailableDomains([]);
      setSelectedDomain('');
    }
  };

  const handleCancelUse = () => {
    setSelectedItem(null);
    setUseAmount(1);
    setSelectedDomain('');
    setAvailableDomains([]);
  };

  const spawnParticleEffect = (item: StorageItemDisplay, amountToSpawn: number = 1) => {
    // Start: Center of Storage Panel
    const storageEl = document.querySelector('.storage-panel-card');
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (storageEl) {
      const rect = storageEl.getBoundingClientRect();
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
        id: `storage-particle-${baseTime}-${i}-${Math.random()}`,
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

    const def = selectedItem.definition || getItemDefinition(selectedItem.id);
    const needsDomain = requiresDomain(def, selectedItem.id);

    if (needsDomain && availableDomains.length > 0 && !selectedDomain) {
      return;
    }

    setIsProcessing(true);
    try {
      // Spawn Particle Animation to Avatar
      spawnParticleEffect(selectedItem, useAmount);

      // Determine and dispatch behavioral monitoring event
      let eventId = 'FOOD_USED';
      if (isAvoidItem(def, selectedItem.id)) {
        eventId = 'AVOID_ITEM_USED';
      } else if (isUnblockItem(def, selectedItem.id)) {
        eventId = 'UNBLOCK_ITEM_USED';
      } else if (def?.deltas) {
        eventId = 'FOOD_USED';
      }

      if (typeof window !== 'undefined' && (window as any).electronAPI?.processMonitoringEvent) {
        try {
          const reaction = await (window as any).electronAPI.processMonitoringEvent({
            eventId,
            domain: selectedDomain || 'storage',
            message: `Used ${selectedItem.title} x${useAmount}`,
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
          console.warn('[StoragePanel] Failed to dispatch behavioral event:', eventErr);
        }
      }

      // Apply item effects and deduct from storage
      await processItemUsage({
        itemId: selectedItem.id,
        amount: useAmount,
        domain: selectedDomain || undefined,
        deduct: true,
      });

      // Reload storage items & reset modal
      await loadStorageItems();
      setSelectedItem(null);
      setUseAmount(1);
      setSelectedDomain('');
      setAvailableDomains([]);
    } catch (err) {
      console.error('[StoragePanel] Failed to use item:', err);
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

    if (def.status === 'avoid' || def.duration) {
      const totalSeconds = (def.duration || 30) * useAmount;
      const minutes = Math.round(totalSeconds / 60);
      const label = minutes >= 1 ? `+${minutes}m Access` : `+${totalSeconds}s Access`;
      badges.push(
        <span key="avoid" className="store-meta-badge badge-duration">
          {label}
        </span>
      );
    } else if (def.status === 'unblock') {
      badges.push(
        <span key="unblock" className="store-meta-badge badge-status">
          Unblock for today
        </span>
      );
    }

    if (badges.length === 0) {
      badges.push(
        <span key="neutral" className="store-meta-badge badge-neutral">
          Apply Effect
        </span>
      );
    }

    return (
      <div className="storage-use-effects">
        <span className="storage-effects-label">Effects:</span>
        <div className="storage-effects-badges">{badges}</div>
      </div>
    );
  };

  // Build full slots array based on configured capacity
  const slots: (StorageItemDisplay | null)[] = Array.from({ length: effectiveTotalSlots }, (_, idx) => {
    return items[idx] || null;
  });

  const selectedDef = selectedItem ? (selectedItem.definition || getItemDefinition(selectedItem.id)) : undefined;
  const selectedNeedsDomain = selectedItem ? requiresDomain(selectedDef, selectedItem.id) : false;
  const selectedIconSrc = selectedItem
    ? (getIconSrc(selectedItem.icon) || (selectedItem.icon === 'avoid' ? getIconSrc('hourglass') : undefined))
    : undefined;

  return (
    <PanelContainer title="Storage" icon="storage" className="storage-panel-card" onClose={onClose}>
      {/* Item hover info bar */}
      <div className="storage-hover-info">
        {hoveredItem ? (
          <>
            <span className="storage-hover-name">{hoveredItem.title}</span>
            <span className="storage-hover-desc">Amount: x{hoveredItem.quantity}</span>
          </>
        ) : (
          <span className="storage-hover-desc">
            {loading ? 'Loading inventory...' : `${items.length} / ${effectiveTotalSlots} slots occupied`}
          </span>
        )}
      </div>

      <div className="storage-chest-frame">
        <div
          className="storage-grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {slots.map((item, idx) => {
            const isFilled = Boolean(item);
            const iconSrc = item ? (getIconSrc(item.icon) || (item.icon === 'avoid' ? getIconSrc('hourglass') : undefined)) : undefined;

            return (
              <div
                key={idx}
                className={`storage-slot ${isFilled ? 'filled' : 'empty'}`}
                onMouseEnter={() => {
                  if (item) setHoveredItem(item);
                }}
                onMouseLeave={() => {
                  if (hoveredItem === item) setHoveredItem(null);
                }}
                onClick={() => {
                  if (item) handleSlotClick(item);
                }}
                title={item ? `${item.title} (x${item.quantity}) - Click to use` : undefined}
              >
                {item && (
                  <>
                    <div className="storage-item-icon-wrap">
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={item.title}
                          className="storage-item-icon-img"
                        />
                      ) : (
                        <span className="storage-item-emoji">{item.icon || '📦'}</span>
                      )}
                    </div>
                    <span className="storage-item-count">{item.quantity}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Usage Modal */}
      {selectedItem && (
        <div className="storage-use-overlay" onClick={handleCancelUse}>
          <div className="storage-use-modal" onClick={(e) => e.stopPropagation()}>
            <div className="storage-use-header">
              <div className="storage-use-icon-box">
                {selectedIconSrc ? (
                  <img src={selectedIconSrc} alt={selectedItem.title} className="storage-use-icon-img" />
                ) : (
                  <span className="storage-use-icon-emoji">{selectedItem.icon || '📦'}</span>
                )}
              </div>
              <div className="storage-use-title-wrap">
                <h4 className="storage-use-title">{selectedItem.title}</h4>
                <p className="storage-use-desc">{selectedItem.description || 'Use item to apply its effects.'}</p>
              </div>
            </div>

            {/* Effects Summary */}
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

            {/* Target Domain Selector (when applicable) */}
            {selectedNeedsDomain && (
              <div className="storage-domain-select-wrap">
                <label className="storage-domain-label">Target Domain:</label>
                {availableDomains.length > 0 ? (
                  <select
                    className="storage-domain-select"
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    disabled={isProcessing}
                  >
                    {availableDomains.map((dom) => (
                      <option key={dom} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="storage-domain-empty">
                    No matching {isUnblockItem(selectedDef, selectedItem.id) ? 'blocked or avoid' : 'avoid'} sites configured.
                  </span>
                )}
              </div>
            )}

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
                className="store-modal-btn confirm"
                onClick={handleUseItem}
                disabled={isProcessing || (selectedNeedsDomain && availableDomains.length === 0)}
              >
                {isProcessing ? 'Using...' : 'Use'}
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

