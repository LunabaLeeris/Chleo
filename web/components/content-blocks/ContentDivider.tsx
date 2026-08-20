import React from "react";

interface ContentDividerProps {
  label?: string;
}

/**
 * Pixel-styled horizontal divider with optional centered label.
 */
export const ContentDivider: React.FC<ContentDividerProps> = ({ label }) => {
  return (
    <div className="cb-divider">
      <div className="cb-divider__line" />
      {label && <span className="cb-divider__label">{label}</span>}
      {label && <div className="cb-divider__line" />}
    </div>
  );
};
