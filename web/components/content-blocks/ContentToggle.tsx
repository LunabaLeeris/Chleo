import React, { useState } from "react";

interface ContentToggleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Collapsible toggle block — click the header to expand/collapse content.
 * Pixel-styled with a rotating arrow indicator.
 */
export const ContentToggle: React.FC<ContentToggleProps> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`cb-toggle ${isOpen ? "cb-toggle--open" : ""}`}>
      <button
        type="button"
        className="cb-toggle__header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="cb-toggle__arrow">▶</span>
        <span className="cb-toggle__title">{title}</span>
      </button>
      {isOpen && <div className="cb-toggle__body">{children}</div>}
    </div>
  );
};
