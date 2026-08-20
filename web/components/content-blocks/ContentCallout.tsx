import React from "react";

interface ContentCalloutProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "info" | "tip" | "warning" | "note";
}

const CALLOUT_ICONS: Record<string, string> = {
  info: "☝️",
  tip: "💡",
  warning: "⚠️",
  note: "📝",
};

/**
 * Callout / highlight box — colored left-border card for tips, notes, warnings.
 * Styled with pixel borders to match the app theme.
 */
export const ContentCallout: React.FC<ContentCalloutProps> = ({
  children,
  icon,
  variant = "info",
}) => {
  const fallbackIcon = CALLOUT_ICONS[variant];

  return (
    <div className={`cb-callout cb-callout--${variant}`}>
      <span className="cb-callout__icon">{icon ?? fallbackIcon}</span>
      <div className="cb-callout__content">{children}</div>
    </div>
  );
};
