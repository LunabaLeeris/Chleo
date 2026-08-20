import React from "react";

interface FeatureModuleCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  locked?: boolean;
  onClick?: () => void;
}

/**
 * Reusable feature module card for the Features/Blog page.
 * Supports three states:
 *   - enabled (clickable, full color)
 *   - locked (visible but greyed out with lock badge, not clickable)
 */
export const FeatureModuleCard: React.FC<FeatureModuleCardProps> = ({
  id,
  title,
  description,
  icon,
  locked = false,
  onClick,
}) => {
  const handleClick = () => {
    if (!locked && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !locked && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      id={id}
      className={`feature-module-card ${locked ? "feature-module-card--locked" : "feature-module-card--enabled"}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={locked ? undefined : "button"}
      tabIndex={locked ? undefined : 0}
      aria-disabled={locked}
    >
      <div className="feature-card-header">
        <div className="feature-card-icon-wrap">
          <img src={icon} alt={title} className="feature-card-icon-img" />
        </div>
        {locked && <span className="badge-coming-soon">🔒 Locked</span>}
      </div>
      <div className="feature-card-body">
        <h4 className="feature-card-title">{title}</h4>
        <p className="feature-card-desc">{description}</p>
      </div>
    </div>
  );
};
