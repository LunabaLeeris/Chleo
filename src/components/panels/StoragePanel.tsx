import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';
import { getItemDefinition } from '../../items/items-registry';
import { getIconSrc } from '../../assets/icon-loader';
import type { UserItemsData } from '../../types/ipc';

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
            description: def?.status === 'avoid'
              ? `Avoid Mode (${def?.duration ? Math.round(def.duration / 60) : 30}m)`
              : (def?.title || 'Storage Item'),
            cost: def?.cost,
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

  // Build full slots array based on configured capacity
  const slots: (StorageItemDisplay | null)[] = Array.from({ length: effectiveTotalSlots }, (_, idx) => {
    return items[idx] || null;
  });

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
                title={item ? `${item.title} (x${item.quantity})` : undefined}
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
    </PanelContainer>
  );
};
