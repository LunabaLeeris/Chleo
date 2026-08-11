import React from 'react';
import { PanelContainer } from './PanelContainer';

export interface PanelProps {
  onClose?: () => void;
}

export const CalendarPanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Calendar" icon="" onClose={onClose}>
      <p className="panel-card-desc">
        Schedule, events, and daily reminder overview for CLEO.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Calendar Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
