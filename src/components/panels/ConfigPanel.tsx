import React from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';

export const ConfigPanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Config" icon="" onClose={onClose}>
      <p className="panel-card-desc">
        Companion preferences, system settings, and behavior toggles.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Config Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
