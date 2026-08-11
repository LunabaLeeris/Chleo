import React from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';

export const ClosetPanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Closet" icon="" onClose={onClose}>
      <p className="panel-card-desc">
        Outfits, accessories, and sprite customization options.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Closet Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
