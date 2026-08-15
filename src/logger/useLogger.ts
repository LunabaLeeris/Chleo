import { useEffect, useState, useMemo, useCallback } from 'react';
import { logger, LogItem, LogLevel } from './logger';

export interface UseDebugLogsOptions {
  initialTypeFilter?: LogLevel | 'all';
  initialSourceFilter?: string;
}

export function useLogger(options?: UseDebugLogsOptions) {
  const [logs, setLogs] = useState<LogItem[]>(() => logger.getLogs());
  const [typeFilter, setTypeFilter] = useState<LogLevel | 'all'>(options?.initialTypeFilter || 'all');
  const [sourceFilter, setSourceFilter] = useState<string>(options?.initialSourceFilter || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsubscribe = logger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  // Compute unique sources for the source filter dropdown
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    logs.forEach((log) => {
      if (log.source) sources.add(log.source);
    });
    return Array.from(sources).sort();
  }, [logs]);

  // Compute statistics
  const stats = useMemo(() => {
    let errorCount = 0;
    let warnCount = 0;
    let infoCount = 0;
    let successCount = 0;
    let debugCount = 0;

    logs.forEach((log) => {
      if (log.type === 'error') errorCount++;
      else if (log.type === 'warn') warnCount++;
      else if (log.type === 'info') infoCount++;
      else if (log.type === 'success') successCount++;
      else if (log.type === 'debug') debugCount++;
    });

    return {
      total: logs.length,
      errorCount,
      warnCount,
      infoCount,
      successCount,
      debugCount,
    };
  }, [logs]);

  // Filter logs based on active filters
  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return logs.filter((log) => {
      // Level filter
      if (typeFilter !== 'all' && log.type !== typeFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && log.source !== sourceFilter) {
        return false;
      }

      // Text search query
      if (query) {
        const inDesc = log.description.toLowerCase().includes(query);
        const inSource = log.source.toLowerCase().includes(query);
        const inType = log.type.toLowerCase().includes(query);
        const inDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(query) : false;
        if (!inDesc && !inSource && !inType && !inDetails) {
          return false;
        }
      }

      return true;
    });
  }, [logs, typeFilter, sourceFilter, searchQuery]);

  const clearLogs = useCallback(() => {
    logger.clear();
  }, []);

  const addTestLog = useCallback((type: LogLevel = 'info') => {
    const sampleSources = ['speech-orchestrator', 'emotions', 'rule-store', 'ipc', 'avatar', 'renderer'];
    const randomSource = sampleSources[Math.floor(Math.random() * sampleSources.length)];
    const messages: Record<LogLevel, string> = {
      info: 'Speech synthesizer loaded voice packet',
      warn: 'Emotion threshold exceeded baseline (+15%)',
      error: 'Rule store failed to parse configuration line #4',
      success: 'IPC channel sync completed in 12ms',
      debug: 'Canvas render tick executed (60 FPS)',
    };

    logger.log(type, randomSource, messages[type], {
      sampleId: Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
    });
  }, []);

  return {
    logs: filteredLogs,
    allLogs: logs,
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
  };
}
