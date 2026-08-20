import React from "react";

interface ContentListProps {
  items: string[];
  variant?: "bullet" | "numbered" | "checklist";
}

const MARKERS: Record<string, (i: number) => string> = {
  bullet: () => "•",
  numbered: (i) => `${i + 1}.`,
  checklist: () => "☐",
};

/**
 * Styled list block with bullet, numbered, or checklist variants.
 * Each item gets a pixel-styled marker.
 */
export const ContentList: React.FC<ContentListProps> = ({
  items,
  variant = "bullet",
}) => {
  const getMarker = MARKERS[variant];

  return (
    <ul className={`cb-list cb-list--${variant}`}>
      {items.map((item, i) => (
        <li key={i} className="cb-list__item">
          <span className="cb-list__marker">{getMarker(i)}</span>
          <span className="cb-list__text">{item}</span>
        </li>
      ))}
    </ul>
  );
};
