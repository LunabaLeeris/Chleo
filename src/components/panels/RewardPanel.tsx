import React, { useState, useEffect, useRef } from 'react';
import type { PuzzleRewardItem } from '../../monitoring/behavioral-engine';

export interface RewardPanelProps {
  rewards: PuzzleRewardItem[];
  targetDomain?: string;
  timeoutSeconds?: number;
  urgePercent?: number;
  onSelectReward: (reward: PuzzleRewardItem) => void;
  onUrge?: () => void;
  onClose?: () => void;
}

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

  // Normalize fallback rewards if array is empty
  const activeRewards: PuzzleRewardItem[] =
    rewards && rewards.length > 0
      ? rewards
      : [
        {
          id: 'unblock_site',
          title: 'Unblock Site',
          description: 'Completely remove the block and restore access for today.',
          icon: '🔓',
          status: 'unblock',
        },
        {
          id: 'avoid_30m',
          title: 'Avoid Mode',
          description: 'Grant 30 minutes of temporary monitored access.',
          icon: '⏳',
          status: 'avoid',
          duration: 30,
        },
        {
          id: 'avoid_15m',
          title: 'Quick Pass',
          description: 'Grant 15 minutes of quick access to finish up.',
          icon: '⚡',
          status: 'avoid',
          duration: 15,
        },
      ];

  // Countdown timer with auto-pick and urge trigger
  useEffect(() => {
    const urgeThreshold = Math.floor(timeoutSeconds * (urgePercent / 100));

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;

        // Trigger halfway urge speech
        if (next <= urgeThreshold && !urgedRef.current) {
          urgedRef.current = true;
          onUrge?.();
        }

        // Timer runout: auto pick random reward
        if (next <= 0) {
          clearInterval(timer);
          if (!selectHandledRef.current) {
            selectHandledRef.current = true;
            const randomReward =
              activeRewards[Math.floor(Math.random() * activeRewards.length)] || activeRewards[0];
            setSelectedRewardId(randomReward.id || 'auto_picked');
            setTimeout(() => {
              onSelectReward(randomReward);
            }, 300);
          }
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeoutSeconds, urgePercent, activeRewards, onUrge, onSelectReward]);

  const handlePick = (reward: PuzzleRewardItem) => {
    if (selectHandledRef.current) return;
    selectHandledRef.current = true;
    setSelectedRewardId(reward.id || 'selected');
    setTimeout(() => {
      onSelectReward(reward);
    }, 200);
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / timeoutSeconds) * 100));
  const isUrgent = timeLeft <= 15;

  return (
    <div
      className="reward-panel-card"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="reward-panel-header">
        <div className="reward-panel-title-wrap">
          <span className="reward-panel-trophy"></span>
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
            <span className="timer-icon">⏳</span>
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

          const isImgIcon =
            typeof reward.icon === 'string' &&
            (reward.icon.endsWith('.png') ||
              reward.icon.endsWith('.svg') ||
              reward.icon.startsWith('http') ||
              reward.icon.startsWith('/'));

          return (
            <div
              key={reward.id || index}
              className={`reward-card-item ${isAvoid ? 'mode-avoid' : 'mode-unblock'} ${isSelected ? 'selected' : ''
                }`}
              onClick={() => handlePick(reward)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePick(reward);
                }
              }}
            >

              {/* Icon Container */}
              <div className="reward-card-icon-box">
                {isImgIcon ? (
                  <img
                    src={reward.icon}
                    alt={reward.title || 'reward'}
                    className="reward-icon-img"
                  />
                ) : (
                  <span className="reward-icon-emoji">{reward.icon || '🎁'}</span>
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
