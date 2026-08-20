import React from 'react';
import { createPortal } from 'react-dom';
import { getIconSrc } from '../../assets/icon-loader';

export interface ParticlePosition {
  x: number;
  y: number;
}

export interface ParticleProps {
  id: string;
  icon?: string;
  emoji?: string;
  title?: string;
  startPos: ParticlePosition;
  endPos: ParticlePosition;
  durationMs?: number; // Total animation duration in ms (default: 1100ms)
  delayMs?: number; // Stagger delay before animation starts in ms (default: 0)
  onComplete?: (id: string) => void;
}

export const Particle: React.FC<ParticleProps> = ({
  id,
  icon,
  emoji,
  title,
  startPos,
  endPos,
  durationMs = 1100,
  delayMs = 0,
  onComplete,
}) => {
  const iconSrc = getIconSrc(icon) || (icon === 'avoid' ? getIconSrc('hourglass') : undefined);

  const style: React.CSSProperties = {
    '--particle-start-x': `${startPos.x}px`,
    '--particle-start-y': `${startPos.y}px`,
    '--particle-end-x': `${endPos.x}px`,
    '--particle-end-y': `${endPos.y}px`,
    animationDuration: `${durationMs}ms`,
    animationDelay: delayMs ? `${delayMs}ms` : '0ms',
  } as React.CSSProperties;

  const handleAnimationEnd = () => {
    if (onComplete) {
      onComplete(id);
    }
  };

  const content = (
    <div
      className="chleo-particle-item"
      style={style}
      onAnimationEnd={handleAnimationEnd}
      aria-hidden="true"
    >
      <div className="chleo-particle-glow" />
      <div className="chleo-particle-badge">
        {iconSrc ? (
          <img src={iconSrc} alt={title || 'item'} className="chleo-particle-icon-img" />
        ) : (
          <span className="chleo-particle-emoji">{emoji || icon || '📦'}</span>
        )}
      </div>
    </div>
  );

  // Render to document.body to prevent parent transform clipping or coordinate distortion
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }

  return content;
};
