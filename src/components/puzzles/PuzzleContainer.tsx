import React from 'react';
import type { PuzzleConfig } from './puzzle-types';
import { getIconSrc } from '../../assets/icon-loader';

export interface PuzzleContainerProps {
  config: PuzzleConfig;
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const PuzzleContainer: React.FC<PuzzleContainerProps> = ({
  config,
  onCancel,
  children,
}) => {
  const iconSrc = getIconSrc(config.icon);

  return (
    <div className="puzzle-panel-card">
      {/* Header: Icon + Title + Close Button */}
      <div className="puzzle-card-header">
        <div className="puzzle-card-title-wrap">
          {config.icon && (
            <span className="puzzle-card-icon">
              {iconSrc ? (
                <img src={iconSrc} alt={config.name} className="puzzle-card-icon-img" />
              ) : (
                config.icon
              )}
            </span>
          )}
          <h3 className="puzzle-card-title">{config.name}</h3>
        </div>
        <button
          type="button"
          className="puzzle-card-close-btn"
          onClick={onCancel}
          title="Close Puzzle"
        >
          ✕
        </button>
      </div>

      {/* Main Puzzle Area */}
      <div className="puzzle-card-body">
        {children}
      </div>
    </div>
  );
};
