import React from "react";

interface ContentParagraphProps {
  children: React.ReactNode;
  variant?: "default" | "lead" | "muted";
}

/**
 * Styled paragraph block. Use 'lead' for intro text, 'muted' for secondary info.
 */
export const ContentParagraph: React.FC<ContentParagraphProps> = ({
  children,
  variant = "default",
}) => {
  return <p className={`cb-paragraph cb-paragraph--${variant}`}>{children}</p>;
};
