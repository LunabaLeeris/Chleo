import React from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';

export const MarketplacePanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Marketplace" icon="" onClose={onClose}>
      <p className="panel-card-desc">
        Browse new themes, extensions, and companion modules.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Marketplace Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
