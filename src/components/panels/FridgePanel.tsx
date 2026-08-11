import React from 'react';
import { PanelContainer } from './PanelContainer';
import { PanelProps } from './CalendarPanel';

export const FridgePanel: React.FC<PanelProps> = ({ onClose }) => {
  return (
    <PanelContainer title="Fridge" icon="" onClose={onClose}>
      <p className="panel-card-desc">
        Food inventory, ingredients, and recipe suggestions.
      </p>
      <div className="panel-placeholder-box">
        <span className="placeholder-tag">[Fridge Component Placeholder]</span>
      </div>
    </PanelContainer>
  );
};
