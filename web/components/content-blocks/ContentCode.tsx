import React from "react";

interface ContentCodeProps {
  code: string;
  language?: string;
  title?: string;
}

/**
 * Code snippet block — monospace box with pixel border and optional title/language label.
 */
export const ContentCode: React.FC<ContentCodeProps> = ({
  code,
  language,
  title,
}) => {
  return (
    <div className="cb-code">
      {(title || language) && (
        <div className="cb-code__header">
          {title && <span className="cb-code__title">{title}</span>}
          {language && <span className="cb-code__lang">{language}</span>}
        </div>
      )}
      <pre className="cb-code__pre">
        <code className="cb-code__content">{code}</code>
      </pre>
    </div>
  );
};
