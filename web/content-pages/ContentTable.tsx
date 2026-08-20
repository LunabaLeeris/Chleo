import React from "react";

export interface ColumnDef {
  /** Column header text or node */
  header: React.ReactNode;
  /** Text alignment for this column */
  align?: "left" | "center" | "right";
  /** Fixed or minimum width (e.g. '80px', '25%') */
  width?: string | number;
  /** Optional custom class for the column th */
  className?: string;
}

export type ColumnItem = string | React.ReactNode | ColumnDef;

export interface ContentTableProps {
  /** Optional heading title displayed above the table */
  title?: React.ReactNode;
  /** Optional subtitle or description text below title */
  subtitle?: React.ReactNode;
  /** Array of column headers (strings, React nodes, or ColumnDef objects) */
  columns: ColumnItem[];
  /** 2D array of row cells */
  data: React.ReactNode[][];
  /** Whether the table is vertically scrollable */
  scrollable?: boolean;
  /** Maximum height when scrollable (default: '320px') */
  maxHeight?: string | number;
  /** Optional badge text next to the title */
  badge?: string;
  /** Optional CSS class name for the container */
  className?: string;
  /** Optional CSS class name for the <table> element */
  tableClassName?: string;
  /** Optional footer content or count indicator */
  footer?: React.ReactNode;
}

function isColumnDef(col: ColumnItem): col is ColumnDef {
  return typeof col === "object" && col !== null && "header" in col;
}

/**
 * Styled table block matching the CHLEO pixel theme.
 * Supports customizable columns, data rows, optional titles, badges,
 * and scrollable vertical overflow with a sticky header.
 */
export const ContentTable: React.FC<ContentTableProps> = ({
  title,
  subtitle,
  columns,
  data,
  scrollable = false,
  maxHeight = "320px",
  badge,
  className = "",
  tableClassName = "",
  footer,
}) => {
  const normalizedColumns: ColumnDef[] = columns.map((col) => {
    if (isColumnDef(col)) {
      return col;
    }
    return {
      header: col,
      align: undefined,
      width: undefined,
      className: undefined,
    };
  });

  const parsedMaxHeight =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  return (
    <div className={`cb-table-container ${className}`.trim()}>
      {(title || badge || subtitle) && (
        <div className="cb-table-header-group">
          {title && (
            <div className="cb-table__title-row">
              <h4 className="cb-table__title">{title}</h4>
              {badge && <span className="cb-table__badge">{badge}</span>}
            </div>
          )}
          {subtitle && <p className="cb-table__subtitle">{subtitle}</p>}
        </div>
      )}

      <div
        className={`cb-table-wrapper ${scrollable ? "cb-table-wrapper--scrollable" : ""}`}
        style={scrollable ? { maxHeight: parsedMaxHeight } : undefined}
      >
        <table className={`cb-table ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {normalizedColumns.map((col, i) => (
                <th
                  key={i}
                  className={`cb-table__th ${col.className || ""}`.trim()}
                  style={{
                    textAlign: col.align,
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr className="cb-table__row cb-table__row--empty">
                <td
                  colSpan={normalizedColumns.length}
                  className="cb-table__td cb-table__td--empty"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="cb-table__row">
                  {row.map((cell, cellIndex) => {
                    const colDef = normalizedColumns[cellIndex];
                    return (
                      <td
                        key={cellIndex}
                        className="cb-table__td"
                        style={{ textAlign: colDef?.align }}
                      >
                        {cell ?? ""}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer && <div className="cb-table__footer">{footer}</div>}
    </div>
  );
};

export default ContentTable;
