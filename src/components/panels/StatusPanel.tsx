import React from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';

export const StatusPanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Status" icon="📊" onClose={onClose}>
      <p className="panel-card-desc">
        CLEO status metrics, mood levels, and active statistics.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Status Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
