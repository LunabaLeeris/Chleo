import React from 'react';

export interface PanelContainerProps {
  title: string;
  icon?: string;
  className?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  title,
  icon,
  className = '',
  onClose,
  children,
}) => {
  return (
    <div className={`feature-panel-card ${className}`.trim()}>
      <div className="panel-card-header">
        <div className="panel-card-title-wrap">
          {icon && <span className="panel-card-icon">{icon}</span>}
          <h3 className="panel-card-title">{title}</h3>
        </div>
        {onClose && (
          <button className="panel-card-close-btn" type="button" onClick={onClose} title="Close Panel">
            ✕
          </button>
        )}
      </div>
      <div className="panel-card-body">{children}</div>
    </div>
  );
};
