import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';
import { getItemsConfig, ItemConfigEntry, ItemsConfig } from '../../items/items-registry';
import { getIconSrc } from '../../assets/icon-loader';
import { InventoryTarget } from '../../types/ipc';

export type StoreTab = 'items' | 'groceries' | 'clothing';

export interface StoreProps extends PanelProps {
  onPurchase?: (itemId: string, amount: number, target: InventoryTarget) => void;
}

export interface StoreItemEntry extends ItemConfigEntry {
  id: string;
}

export const Store: React.FC<StoreProps> = ({ onClose, onPurchase }) => {
  const [activeTab, setActiveTab] = useState<StoreTab>('items');
  const [config, setConfig] = useState<ItemsConfig>(getItemsConfig());
  const [selectedItem, setSelectedItem] = useState<StoreItemEntry | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleConfirmPurchase = async () => {
    if (!selectedItem) return;

    // Destination category based on current store tab
    let target: InventoryTarget = 'storage';
    if (activeTab === 'groceries') {
      target = 'fridge';
    } else if (activeTab === 'clothing') {
      target = 'closet';
    }

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

      if (onPurchase) {
        onPurchase(selectedItem.id, purchaseAmount, target);
      }

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
    </PanelContainer>
  );
};
