import React, { useState, useEffect, useRef } from 'react';
import type { PuzzleRewardItem } from '../../monitoring/behavioral-engine';
import { getIconSrc } from '../../assets/icon-loader';
import { resolveRewardItem } from '../../items/items-registry';

export interface RewardPanelProps {
  rewards: PuzzleRewardItem[];
  targetDomain?: string;
  timeoutSeconds?: number;
  urgePercent?: number;
  onSelectReward: (reward: PuzzleRewardItem) => void;
  onUrge?: () => void;
  onClose?: () => void;
}

const DEFAULT_FALLBACK_REWARDS: Partial<PuzzleRewardItem>[] = [
  {
    id: 'unblock_site',
    description: 'Restore access for today. Gives huge penalty on emotions.',
  },
  {
    id: 'avoid_30m',
    description: 'Grant 30 minutes access. Gives some penalty on emotions.',
  },
  {
    id: 'avoid_1m',
    description: 'Grant 1 minute access. Gives little penalty on emotions.',
  },
];

export const RewardPanel: React.FC<RewardPanelProps> = ({
  rewards,
  targetDomain,
  timeoutSeconds = 60,
  urgePercent = 50,
  onSelectReward,
  onUrge,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeoutSeconds);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const urgedRef = useRef<boolean>(false);
  const selectHandledRef = useRef<boolean>(false);

  // Normalize rewards using ItemsRegistry
  const rawList = rewards && rewards.length > 0 ? rewards : DEFAULT_FALLBACK_REWARDS;
  const activeRewards: PuzzleRewardItem[] = rawList.map((r, idx) => resolveRewardItem(r, idx));

  // Auto-countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Urge Trigger at percent threshold (default 50% left)
  useEffect(() => {
    const urgeThreshold = Math.floor((timeoutSeconds * urgePercent) / 100);
    if (timeLeft <= urgeThreshold && !urgedRef.current) {
      urgedRef.current = true;
      if (onUrge) {
        onUrge();
      }
    }
  }, [timeLeft, timeoutSeconds, urgePercent, onUrge]);

  // Timeout auto-selection: auto-pick the first available option
  const handleTimeout = () => {
    if (selectHandledRef.current) return;
    selectHandledRef.current = true;
    const defaultChoice = activeRewards[0];
    if (defaultChoice) {
      setSelectedRewardId(defaultChoice.id || `${defaultChoice.status}_${defaultChoice.duration || 0}`);
      setTimeout(() => {
        onSelectReward(defaultChoice);
      }, 300);
    }
  };

  const handleCardClick = (reward: PuzzleRewardItem, index: number) => {
    if (selectHandledRef.current) return;
    selectHandledRef.current = true;
    const chosenId = reward.id || `${reward.status}_${reward.duration || index}`;
    setSelectedRewardId(chosenId);

    // Brief delay to show active selection feedback
    setTimeout(() => {
      onSelectReward(reward);
    }, 200);
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / timeoutSeconds) * 100));
  const isUrgent = timeLeft <= 15;
  const rewardIconSrc = getIconSrc('reward') || getIconSrc('star');
  const timerIconSrc = getIconSrc('hourglass');

  return (
    <div
      className="reward-panel-card"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="reward-panel-header">
        <div className="reward-panel-title-wrap">
          {rewardIconSrc && (
            <img
              src={rewardIconSrc}
              alt="Victory Reward"
              className="panel-card-icon-img"
            />
          )}
          <div>
            <h3 className="reward-panel-title">VICTORY REWARDS</h3>
            {targetDomain && (
              <span className="reward-panel-domain">{targetDomain}</span>
            )}
          </div>
        </div>

        <div className="reward-header-actions">
          {/* Countdown timer pill */}
          <div className={`reward-timer-pill ${isUrgent ? 'urgent' : ''}`}>
            {timerIconSrc ? (
              <img
                src={timerIconSrc}
                alt="Timer"
                className="reward-timer-icon-img"
                style={{ width: '13px', height: '13px', objectFit: 'contain' }}
              />
            ) : (
              <span className="timer-icon">⏳</span>
            )}
            <span className="timer-digits">{timeLeft}s</span>
          </div>

          {onClose && (
            <button
              className="reward-panel-close-btn"
              type="button"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="reward-timer-bar-wrap">
        <div
          className={`reward-timer-bar-fill ${isUrgent ? 'urgent' : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3-Column Reward Grid */}
      <div className="reward-grid-3col">
        {activeRewards.map((reward, index) => {
          const isSelected = selectedRewardId === (reward.id || `${reward.status}_${reward.duration || index}`);
          const isAvoid = reward.status === 'avoid';
          const isQuickPass =
            reward.id === 'avoid_15m' ||
            reward.id === 'avoid_5m' ||
            reward.icon === 'lightning' ||
            reward.icon === '⚡' ||
            (typeof reward.title === 'string' &&
              (reward.title.toLowerCase().includes('blitz') ||
                reward.title.toLowerCase().includes('quick')));
          const possibleRewardSrc =
            getIconSrc(reward.icon) ||
            (isQuickPass
              ? getIconSrc('lightning')
              : isAvoid
              ? getIconSrc('hourglass')
              : getIconSrc('unblock'));

          return (
            <div
              key={reward.id || index}
              className={`reward-card-item ${isAvoid ? 'mode-avoid' : 'mode-unblock'} ${isSelected ? 'selected' : ''
                }`}
              style={{ animationDelay: `${index * 120 + 80}ms` }}
              onClick={() => handleCardClick(reward, index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(reward, index);
                }
              }}
            >

              {/* Icon Container */}
              <div className="reward-card-icon-box">
                {possibleRewardSrc ? (
                  <img
                    src={possibleRewardSrc}
                    alt={reward.title || (isQuickPass ? 'Blitz' : isAvoid ? 'Avoid' : 'Unblock')}
                    className="reward-icon-img"
                  />
                ) : (
                  <span className="reward-icon-emoji">{reward.icon || (isQuickPass ? '⚡' : isAvoid ? '⏳' : '🔓')}</span>
                )}
              </div>

              {/* Title & Description */}
              <div className="reward-card-content">
                <h4 className="reward-card-title">{reward.title}</h4>
                <p className="reward-card-desc">{reward.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
