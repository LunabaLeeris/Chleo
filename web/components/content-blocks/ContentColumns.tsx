import React from "react";

interface ContentColumnsProps {
  columns?: 2 | 3;
  children: React.ReactNode;
}

/**
 * Multi-column layout block. Each direct child becomes a column.
 * Wraps to a single column on mobile.
 */
export const ContentColumns: React.FC<ContentColumnsProps> = ({
  columns = 2,
  children,
}) => {
  return (
    <div className={`cb-columns cb-columns--${columns}`}>
      {React.Children.map(children, (child, i) => (
        <div key={i} className="cb-columns__col">
          {child}
        </div>
      ))}
    </div>
  );
};
