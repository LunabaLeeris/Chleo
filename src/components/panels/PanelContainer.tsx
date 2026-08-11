import React from 'react';

export interface PanelContainerProps {
  title: string;
  icon?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  title,
  icon,
  onClose,
  children,
}) => {
  return (
    <div className="feature-panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title-wrap">
          {icon && <span className="panel-card-icon">{icon}</span>}
          <h3 className="panel-card-title">{title}</h3>
        </div>
        {onClose && (
          <button className="panel-card-close-btn" onClick={onClose} title="Close Panel">
            ✕
          </button>
        )}
      </div>
      <div className="panel-card-body">{children}</div>
    </div>
  );
};
