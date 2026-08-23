import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { getIconSrc } from '../../assets/icon-loader';
import { loadPuzzleData, formatPuzzleTime, PuzzleDataMap } from '../puzzles/puzzle-data-service';

export interface PuzzleItem {
  id: 'typing' | 'snake' | 'matching';
  name: string;
  icon: string;
  badge: string;
  description: string;
  targetScore: number;
}

export const AVAILABLE_PUZZLES: PuzzleItem[] = [
  {
    id: 'matching',
    name: 'Memory Match',
    icon: 'cardbg',
    badge: 'Memory',
    description: 'Match pairs of pixel icons before time runs out!',
    targetScore: 60,
  },
  {
    id: 'typing',
    name: 'Speed Typer',
    icon: 'keyboard',
    badge: 'Speed',
    description: 'Type words accurately and beat the high score within 30s!',
    targetScore: 50,
  },
  {
    id: 'snake',
    name: 'Retro Snake',
    icon: 'snake',
    badge: 'Arcade',
    description: 'Slither, collect apples, and dodge walls to score points!',
    targetScore: 50,
  },
];

export interface PuzzlesPanelProps {
  onClose: () => void;
  onSelectPuzzle?: (puzzleId: 'typing' | 'snake' | 'matching') => void;
}

export const PuzzlesPanel: React.FC<PuzzlesPanelProps> = ({ onClose, onSelectPuzzle }) => {
  const [puzzleStats, setPuzzleStats] = useState<PuzzleDataMap>({});

  useEffect(() => {
    let isMounted = true;
    const fetchPuzzleData = async () => {
      try {
        const data = await loadPuzzleData();
        if (isMounted) {
          setPuzzleStats(data);
        }
      } catch (e) {
        console.warn('[PuzzlesPanel] Failed to load puzzle data:', e);
      }
    };
    fetchPuzzleData();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadedPuzzlesWithTime = AVAILABLE_PUZZLES.filter(
    (p) => puzzleStats[p.id]?.totalTimeSeconds !== undefined
  );
  const totalTimePlayedAll =
    loadedPuzzlesWithTime.length > 0
      ? loadedPuzzlesWithTime.reduce(
          (acc, puzzle) => acc + (puzzleStats[puzzle.id]?.totalTimeSeconds || 0),
          0
        )
      : undefined;

  return (
    <PanelContainer title="Puzzles & Games" icon="puzzles" className="puzzles-panel-card" onClose={onClose}>
      {/* Top summary stats bar */}
      <div className="puzzles-stats-bar">
        <div className="puzzles-stat-pill">
          <span className="stat-label">Total Games</span>
          <span className="stat-value">{AVAILABLE_PUZZLES.length}</span>
        </div>
        <div className="puzzles-stat-pill">
          <span className="stat-label">Time Played</span>
          <span className="stat-value" style={{ color: '#16a34a' }}>
            {formatPuzzleTime(totalTimePlayedAll)}
          </span>
        </div>
      </div>

      {/* Puzzles list */}
      <div className="puzzles-list">
        {AVAILABLE_PUZZLES.map((puzzle) => {
          const stats = puzzleStats[puzzle.id];
          const bestDisplay = stats?.highScore !== undefined ? stats.highScore : 'n/a';
          const formattedTimePlayed = formatPuzzleTime(stats?.totalTimeSeconds);

          return (
            <div
              key={puzzle.id}
              className={`puzzle-select-item type-${puzzle.id}`}
              onClick={() => onSelectPuzzle?.(puzzle.id)}
              title={`Launch ${puzzle.name}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPuzzle?.(puzzle.id);
                }
              }}
            >
              {/* Left: Game Icon Box */}
              <div className="puzzle-item-icon-box">
                {getIconSrc(puzzle.icon) ? (
                  <img
                    src={getIconSrc(puzzle.icon)}
                    alt={puzzle.name}
                    className="puzzle-item-icon-img"
                  />
                ) : (
                  puzzle.icon
                )}
              </div>

              {/* Right: Info, Title, Description, Meta */}
              <div className="puzzle-item-content">
                <div className="puzzle-item-header">
                  <span className="puzzle-item-name">{puzzle.name}</span>
                  <span className={`puzzle-badge badge-${puzzle.id}`}>{puzzle.badge}</span>
                </div>

                <p className="puzzle-item-desc">{puzzle.description}</p>

                <div className="puzzle-item-meta-row">
                  <span className="puzzle-meta-chip">
                    Best: <span className="meta-val">{bestDisplay}</span>
                  </span>
                  <span className="puzzle-meta-chip">
                    Played: <span className="meta-val">{formattedTimePlayed}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
};
