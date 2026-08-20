import React from "react";

interface ContentQuoteProps {
  children: React.ReactNode;
  attribution?: string;
}

/**
 * Block quote with pixel-styled left border and optional attribution line.
 */
export const ContentQuote: React.FC<ContentQuoteProps> = ({
  children,
  attribution,
}) => {
  return (
    <blockquote className="cb-quote">
      <div className="cb-quote__text">{children}</div>
      {attribution && (
        <footer className="cb-quote__attribution">— {attribution}</footer>
      )}
    </blockquote>
  );
};
