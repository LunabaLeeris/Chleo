import React, { useEffect, useRef, useState } from 'react';
import { PanelContainer } from './PanelContainer';
import { EmotionsOrchestrator } from '../../avatar';
import { PlutchikWheelGraphic } from '../../../web/components/EmotionsWheelVisualizer';
import type { LongTermMemoryData } from '../../memory/memory-types';
import type { ElectronAPI } from '../../types/ipc';

interface CustomWindow {
  electronAPI?: ElectronAPI;
}

export interface PanelProps {
  onClose: () => void;
}

function getRelationshipStatus(daysKnown: number, rewards: number, violations: number) {
  const netScore = rewards * 2 - violations * 3 + daysKnown;
  if (netScore >= 25) return { title: 'Boundless Synergy', badge: 'Tier 5', color: '#ec4899' };
  if (netScore >= 15) return { title: 'Cherished Companion', badge: 'Tier 4', color: '#a855f7' };
  if (netScore >= 8) return { title: 'Trusted Partner', badge: 'Tier 3', color: '#3b82f6' };
  if (netScore >= 3) return { title: 'Familiar Friend', badge: 'Tier 2', color: '#22c55e' };
  return { title: 'Budding Friendship', badge: 'Tier 1', color: '#eab308' };
}

function formatActiveTime(firstSeenMs?: number, lastSeenMs?: number, loaded?: boolean): string {
  if (!loaded || !firstSeenMs) return '0h 00m';
  const totalMs = Math.max(1000 * 60 * 5, (lastSeenMs || Date.now()) - firstSeenMs);
  const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor(totalMs / (1000 * 60)) % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export const StatusPanel: React.FC<PanelProps> = ({ onClose }) => {
  const emotionEngineRef = useRef<EmotionsOrchestrator>(new EmotionsOrchestrator());
  const [, setRefreshKey] = useState<number>(0);
  const [ltmData, setLtmData] = useState<LongTermMemoryData | null>(null);

  // Query real-time emotion state & long-term memory metrics from Electron main process
  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        const api = (window as unknown as CustomWindow).electronAPI;
        if (api) {
          const [state, ltm] = await Promise.all([
            api.getEmotionState ? api.getEmotionState() : Promise.resolve(null),
            api.getLongTermMemoryData ? api.getLongTermMemoryData() : Promise.resolve(null),
          ]);

          if (state) {
            emotionEngineRef.current.setState(state);
            setRefreshKey((prev) => prev + 1);
          }
          if (ltm) setLtmData(ltm);
        }
      } catch (err) {
        console.warn('[StatusPanel] Error fetching status metrics:', err);
      }
    };

    fetchStatusData();
    const interval = setInterval(fetchStatusData, 2500);
    return () => clearInterval(interval);
  }, []);

  const loaded = ltmData !== null;
  const daysKnown = loaded ? (ltmData?.daysKnown ?? 0) : 0;
  const rewards = loaded ? (ltmData?.totalRewardsEarned ?? 0) : 0;
  const violations = loaded ? (ltmData?.totalViolationsCount ?? 0) : 0;
  const puzzles = loaded ? (ltmData?.totalPuzzlesCompleted ?? 0) : 0;

  const rel = loaded
    ? getRelationshipStatus(daysKnown, rewards, violations)
    : { title: 'Not Loaded', badge: 'Tier 0', color: '#64748b' };

  return (
    <PanelContainer title="Companion Status" icon="status" className="status-panel-card" onClose={onClose}>
      <div className="status-wheel-box">
        <PlutchikWheelGraphic
          emotionEngine={emotionEngineRef.current}
          size={140}
        />
      </div>

      <div className="status-memory-card">
        <div className="status-metrics-row">
          <div className="status-metric-box">
            <span className="metric-label">Days Known</span>
            <span className="metric-value">{daysKnown}d</span>
          </div>

          <div className="status-metric-box">
            <span className="metric-label">Total Time Active</span>
            <span className="metric-value">{formatActiveTime(ltmData?.firstSeenTimestamp, ltmData?.lastSeenTimestamp, loaded)}</span>
          </div>
        </div>

        <div className="status-relationship-row">
          <div className="relationship-label-wrap">
            <span className="relationship-label">Relationship:</span>
            <span className="relationship-badge" style={{ backgroundColor: rel.color }}>
              {rel.badge}
            </span>
          </div>
          <div className="relationship-title" style={{ color: rel.color }}>
            {rel.title}
          </div>
        </div>

        <div className="status-mini-pills">
          <span className="mini-pill reward" title="Total Rewards Earned">
            🏆 {rewards}
          </span>
          <span className="mini-pill violation" title="Total Rule Violations">
            ⚠️ {violations}
          </span>
          <span className="mini-pill puzzle" title="Puzzles Completed">
            🧩 {puzzles}
          </span>
        </div>
      </div>
    </PanelContainer>
  );
};
