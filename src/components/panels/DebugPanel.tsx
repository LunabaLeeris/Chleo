import React, { useState, useRef, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { useLogger } from '../../logger/useLogger';
import { LogItem, LogLevel } from '../../logger/logger';

export interface DebugPanelProps {
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onClose }) => {
  const {
    logs,
    allLogs,
    typeFilter,
    setTypeFilter,
    sourceFilter,
    setSourceFilter,
    searchQuery,
    setSearchQuery,
    availableSources,
    stats,
    clearLogs,
    addTestLog,
  } = useLogger();

  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, autoScroll]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyLogs = async () => {
    try {
      const formatted = logs
        .map(
          (l) =>
            `[${l.timeStr}] [${l.type.toUpperCase()}] [${l.source}] ${l.description}${l.details ? `\nDetails: ${JSON.stringify(l.details, null, 2)}` : ''
            }`
        )
        .join('\n\n');

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(formatted);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.warn('Failed to copy debug logs to clipboard:', e);
    }
  };

  const filterTabs: Array<{ id: LogLevel | 'all'; label: string; count?: number; color?: string }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'error', label: 'Errors', count: stats.errorCount, color: '#ef4444' },
    { id: 'warn', label: 'Warn', count: stats.warnCount, color: '#f59e0b' },
    { id: 'info', label: 'Info', count: stats.infoCount, color: '#0284c7' },
    { id: 'success', label: 'OK', count: stats.successCount, color: '#16a34a' },
    { id: 'debug', label: 'Debug', count: stats.debugCount, color: '#9333ea' },
  ];

  return (
    <PanelContainer title="Debug & Logs" icon="" className="debug-panel-card" onClose={onClose}>
      {/* Top Header Controls */}
      <div className="debug-controls-bar">
        <div className="debug-stats-wrap">
          <span className="debug-stat-pill" title="Total Logs">
            Total: <strong>{stats.total}</strong>
          </span>
          {stats.errorCount > 0 && (
            <span className="debug-stat-pill error-badge" title="Errors Encountered">
              {stats.errorCount}
            </span>
          )}
          {stats.warnCount > 0 && (
            <span className="debug-stat-pill warn-badge" title="Warnings">
              {stats.warnCount}
            </span>
          )}
        </div>

        <div className="debug-action-buttons">
          <button
            type="button"
            className="debug-btn"
            onClick={() => addTestLog('info')}
            title="Inject a test log entry across random subsystems"
          >
            Test
          </button>
          <button
            type="button"
            className="debug-btn"
            onClick={handleCopyLogs}
            title="Copy current filtered logs to clipboard"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            type="button"
            className="debug-btn clear-btn"
            onClick={clearLogs}
            title="Clear all stored logs (resets memory and storage)"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter Row: Type Pills */}
      <div className="debug-filter-pills">
        {filterTabs.map((tab) => {
          const isActive = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`debug-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => setTypeFilter(tab.id)}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className="pill-count"
                  style={tab.color ? { backgroundColor: tab.color } : undefined}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Source Filter Row */}
      <div className="debug-search-row">
        <input
          type="text"
          className="debug-search-input"
          placeholder="Filter logs / messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {availableSources.length > 0 && (
          <select
            className="debug-source-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            title="Filter by subsystem origin"
          >
            <option value="all">All Sources</option>
            {availableSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Logs Stream List */}
      <div className="debug-log-list">
        {logs.length === 0 ? (
          <div className="debug-empty-state">
            <span className="empty-icon"></span>
            <p className="empty-text">
              {allLogs.length === 0
                ? 'No debug events recorded yet.'
                : 'No logs match your current filter.'}
            </p>
          </div>
        ) : (
          logs.map((item: LogItem) => {
            const isExpanded = expandedLogIds.has(item.id);
            const hasDetails = item.details !== undefined && item.details !== null;

            return (
              <div key={item.id} className={`debug-log-item log-type-${item.type}`}>
                <div className="log-item-header">
                  <div className="log-item-tags">
                    <span className="log-time">{item.timeStr}</span>
                    <span className={`log-badge log-badge-${item.type}`}>
                      {item.type.toUpperCase()}
                    </span>
                    <span className="log-source">[{item.source}]</span>
                  </div>
                  {hasDetails && (
                    <button
                      type="button"
                      className="log-expand-btn"
                      onClick={() => toggleExpand(item.id)}
                      title="Toggle detailed payload"
                    >
                      {isExpanded ? '▲ Hide' : '▼ Details'}
                    </button>
                  )}
                </div>

                <div className="log-item-message">{item.description}</div>

                {hasDetails && isExpanded && (
                  <div className="log-details-block">
                    <pre className="log-details-json">
                      {typeof item.details === 'string'
                        ? item.details
                        : JSON.stringify(item.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Footer Helper */}
      <div className="debug-footer-bar">
        <label className="debug-autoscroll-toggle">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          <span>Auto-scroll</span>
        </label>
        <span className="debug-hint">
          Showing {logs.length} of {allLogs.length} events
        </span>
      </div>
    </PanelContainer>
  );
};
