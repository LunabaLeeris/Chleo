import React, { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { getIconSrc } from '../../assets/icon-loader';
import { loadPuzzleData, formatPuzzleTime, PuzzleDataMap } from '../puzzles/puzzle-data-service';

export interface PuzzleItem {
  id: 'typing' | 'snake' | 'chess' | 'sudoku' | 'matching';
  name: string;
  icon: string;
  badge: string;
  description: string;
  targetScore: number;
  highScore: number;
  timePlayed?: string;
}

export const AVAILABLE_PUZZLES: PuzzleItem[] = [
  {
    id: 'matching',
    name: 'Memory Match',
    icon: 'cardbg',
    badge: 'Memory',
    description: 'Match pairs of pixel icons before time runs out!',
    targetScore: 60,
    highScore: 60,
  },
  {
    id: 'typing',
    name: 'Speed Typer',
    icon: 'keyboard',
    badge: 'Speed',
    description: 'Type words accurately and beat the high score within 30s!',
    targetScore: 50,
    highScore: 40,
  },
  {
    id: 'snake',
    name: 'Retro Snake',
    icon: 'snake',
    badge: 'Arcade',
    description: 'Slither, collect apples, and dodge walls to score points!',
    targetScore: 50,
    highScore: 40,
  },
  {
    id: 'chess',
    name: 'Pixel Chess',
    icon: '♟️',
    badge: 'Tactics',
    description: 'Solve the Mate-in-1 Tactical challenge.',
    targetScore: 100,
    highScore: 100,
  },
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '🔢',
    badge: 'Logic',
    description: 'Fill the 4x4 quick logic grid without row/col repeats.',
    targetScore: 80,
    highScore: 80,
  },
];

export interface PuzzlesPanelProps {
  onClose: () => void;
  onSelectPuzzle?: (puzzleId: 'typing' | 'snake' | 'chess' | 'sudoku' | 'matching') => void;
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

  const totalTimePlayedAll = AVAILABLE_PUZZLES.reduce((acc, puzzle) => {
    return acc + (puzzleStats[puzzle.id]?.totalTimeSeconds ?? 0);
  }, 0);

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
          const currentBest = puzzleStats[puzzle.id]?.highScore ?? puzzle.highScore;
          const timePlayedSeconds = puzzleStats[puzzle.id]?.totalTimeSeconds ?? 0;
          const formattedTimePlayed = formatPuzzleTime(timePlayedSeconds);

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
                    Best: <span className="meta-val">{currentBest}</span>
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
