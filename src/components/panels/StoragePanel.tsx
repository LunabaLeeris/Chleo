import React from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';

export const StoragePanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Storage" icon="" onClose={onClose}>
      <p className="panel-card-desc">
        Items, collectibles, and long-term file archives.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Storage Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
