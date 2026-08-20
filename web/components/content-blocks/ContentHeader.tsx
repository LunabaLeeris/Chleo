import React from "react";

interface ContentHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  level?: 1 | 2 | 3;
}

/**
 * Page-level heading block with pixel-themed typography.
 * Supports h1/h2/h3 levels, optional subtitle, badge, and icon.
 */
export const ContentHeader: React.FC<ContentHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  level = 1,
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <div className={`cb-header cb-header--level-${level}`}>
      <div className="cb-header__title-row">
        {icon && <span className="cb-header__icon">{icon}</span>}
        <Tag className="cb-header__title">{title}</Tag>
        {badge && <span className="cb-header__badge">{badge}</span>}
      </div>
      {subtitle && <p className="cb-header__subtitle">{subtitle}</p>}
    </div>
  );
};
