import React, { useEffect, useState, useMemo } from 'react';
import { PanelContainer } from './PanelContainer';
import { logger } from '../../logger';
import defaultActivityRules from '../../monitoring/config/activity-rules.json';
import type { SiteRule, SiteType } from '../../monitoring/monitoring-types';
import type { ElectronAPI } from '../../types/ipc';

// [DUPLICATED PANEL FROM WEB]

interface CustomWindow {
  electronAPI?: ElectronAPI;
}

export interface PanelProps {
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  }
  return `${secs}s`;
}

export const MonitoringPanel: React.FC<PanelProps> = ({ onClose }) => {
  const [rules, setRules] = useState<SiteRule[]>(() => {
    return (defaultActivityRules as any).rules || [];
  });
  const [filterType, setFilterType] = useState<SiteType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    logger.debug('monitoring-panel', 'MonitoringPanel mounted');

    const fetchRules = async () => {
      try {
        const api = (window as unknown as CustomWindow).electronAPI;
        if (api?.getSiteRules) {
          const liveRules = await api.getSiteRules();
          if (Array.isArray(liveRules)) {
            setRules(liveRules);
            return;
          }
        }

        // Fallback to imported JSON config
        const fallbackRules = (defaultActivityRules as any).rules || [];
        setRules(fallbackRules);
      } catch (err: any) {
        logger.error('monitoring-panel', `Error loading monitoring rules: ${err?.message || err}`, err);
      }
    };

    fetchRules();

    // Refresh live time spent every 1 second while panel is open
    const interval = setInterval(fetchRules, 1000);

    // Subscribe to immediate rules change events from main process
    const api = (window as unknown as CustomWindow).electronAPI;
    const unsubscribe = api?.onRulesChanged ? api.onRulesChanged(() => fetchRules()) : undefined;

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
      logger.debug('monitoring-panel', 'MonitoringPanel unmounted');
    };
  }, []);

  const counts = useMemo(() => {
    return {
      all: rules.length,
      avoid: rules.filter((r) => r.type === 'avoid').length,
      blocked: rules.filter((r) => r.type === 'blocked').length,
      productive: rules.filter((r) => r.type === 'productive').length,
      neutral: rules.filter((r) => r.type === 'neutral').length,
    };
  }, [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesType = filterType === 'all' || rule.type === filterType;
      const matchesSearch = !searchQuery.trim() || rule.domain.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesType && matchesSearch;
    });
  }, [rules, filterType, searchQuery]);

  const handleFilterClick = (type: SiteType | 'all') => {
    setFilterType(type);
    logger.debug('monitoring-panel', `Filter changed to: "${type}"`);
  };

  const handleActionClick = (actionName: string, domain: string) => {
    logger.info('monitoring-panel', `Action triggered: "${actionName}" for ${domain} (UI preview)`);
  };

  return (
    <PanelContainer title="Site Monitoring" icon="" className="monitoring-panel-card" onClose={onClose}>
      {/* Top summary stats bar */}
      <div className="monitoring-stats-bar">
        <div className="monitoring-stat-pill">
          <span className="stat-label">Total</span>
          <span className="stat-value">{counts.all}</span>
        </div>
        <div className="monitoring-stat-pill avoid-stat">
          <span className="stat-label">Avoid</span>
          <span className="stat-value">{counts.avoid}</span>
        </div>
        <div className="monitoring-stat-pill blocked-stat">
          <span className="stat-label">Blocked</span>
          <span className="stat-value">{counts.blocked}</span>
        </div>
        <div className="monitoring-stat-pill productive-stat">
          <span className="stat-label">Productive</span>
          <span className="stat-value">{counts.productive}</span>
        </div>
      </div>

      {/* Filter pills & search */}
      <div className="monitoring-controls-row">
        <div className="monitoring-filter-pills">
          {(['all', 'avoid', 'blocked', 'productive', 'neutral'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`monitoring-pill-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => handleFilterClick(type)}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="monitoring-search-input"
          placeholder="Filter domains..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Rules list */}
      <div className="monitoring-rules-list">
        {filteredRules.length === 0 ? (
          <div className="monitoring-empty-state">
            <span className="empty-icon">🔍</span>
            <p className="empty-text">No monitoring rules found</p>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const hasLimit = rule.dailyLimitSeconds > 0;
            const percentSpent = hasLimit
              ? Math.min(100, (rule.spentTodaySeconds / rule.dailyLimitSeconds) * 100)
              : 0;

            const isOverLimit = hasLimit && rule.spentTodaySeconds >= rule.dailyLimitSeconds;
            const isNearLimit = hasLimit && percentSpent >= (rule.warningThresholdPercent || 75);

            return (
              <div key={rule.domain} className={`monitoring-rule-item type-${rule.type}`}>
                <div className="rule-item-header">
                  <div className="rule-domain-wrap">
                    <span className="rule-domain-name">{rule.domain}</span>
                    <span className={`rule-type-badge badge-${rule.type}`}>
                      {rule.type.toUpperCase()}
                    </span>
                  </div>

                  {/* UI Action buttons for future interaction */}
                  <div className="rule-item-actions">
                    {rule.type === 'blocked' ? (
                      <button
                        type="button"
                        className="rule-action-btn primary"
                        onClick={() => handleActionClick('unblock', rule.domain)}
                        title="Unblock site"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rule-action-btn danger"
                        onClick={() => handleActionClick('block', rule.domain)}
                        title="Block site"
                      >
                        Block
                      </button>
                    )}
                    <button
                      type="button"
                      className={`rule-action-btn ${rule.type === 'productive' ? 'active' : ''}`}
                      onClick={() => handleActionClick('toggle-productive', rule.domain)}
                      title={rule.type === 'productive' ? 'Productive active' : 'Mark productive'}
                    >
                      ★ Productive
                    </button>
                  </div>
                </div>

                {/* Time & Limit details */}
                <div className="rule-time-row">
                  <div className="rule-time-metric">
                    <span className="metric-label">Spent Today:</span>
                    <span className="metric-val">{formatDuration(rule.spentTodaySeconds)} ({rule.spentTodaySeconds}s)</span>
                  </div>
                  <div className="rule-time-metric">
                    <span className="metric-label">Daily Limit:</span>
                    <span className="metric-val">
                      {hasLimit ? `${formatDuration(rule.dailyLimitSeconds)} (${rule.dailyLimitSeconds}s)` : 'No Limit'}
                    </span>
                  </div>
                </div>

                {/* Progress bar for limited domains */}
                {hasLimit && (
                  <div className="rule-progress-wrap">
                    <div className="rule-progress-track">
                      <div
                        className={`rule-progress-fill ${isOverLimit ? 'over' : isNearLimit ? 'warn' : 'normal'}`}
                        style={{ width: `${percentSpent}%` }}
                      />
                    </div>
                    <span className="rule-progress-pct">{Math.round(percentSpent)}%</span>
                  </div>
                )}

                {/* Rule flags */}
                <div className="rule-flags-row">
                  {rule.warningThresholdPercent && hasLimit && (
                    <span className="rule-flag-pill">
                      Warn at {rule.warningThresholdPercent}%
                    </span>
                  )}
                  {rule.requiresPuzzleToUnblock && (
                    <span className="rule-flag-pill puzzle">
                      Puzzle Required
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </PanelContainer>
  );
};
