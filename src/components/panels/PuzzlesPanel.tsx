import React from 'react';
import { PanelContainer } from './PanelContainer';

export interface PuzzleItem {
  id: 'snake' | 'chess' | 'sudoku';
  name: string;
  icon: string;
  badge: string;
  description: string;
  targetScore: number;
  highScore: number;
  timePlayed: string;
}

export const AVAILABLE_PUZZLES: PuzzleItem[] = [
  {
    id: 'snake',
    name: 'Retro Snake',
    icon: '🐍',
    badge: 'Arcade',
    description: 'Slither, collect apples, and dodge walls to score points!',
    targetScore: 50,
    highScore: 120,
    timePlayed: '18m',
  },
  {
    id: 'chess',
    name: 'Pixel Chess',
    icon: '♟️',
    badge: 'Tactics',
    description: 'Solve the Mate-in-1 Tactical challenge.',
    targetScore: 100,
    highScore: 100,
    timePlayed: '12m',
  },
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '🔢',
    badge: 'Logic',
    description: 'Fill the 4x4 quick logic grid without row/col repeats.',
    targetScore: 80,
    highScore: 80,
    timePlayed: '15m',
  },
];

export interface PuzzlesPanelProps {
  onClose: () => void;
  onSelectPuzzle?: (puzzleId: 'snake' | 'chess' | 'sudoku') => void;
}

export const PuzzlesPanel: React.FC<PuzzlesPanelProps> = ({ onClose, onSelectPuzzle }) => {
  return (
    <PanelContainer title="Puzzles & Games" icon="" className="puzzles-panel-card" onClose={onClose}>
      {/* Top summary stats bar */}
      <div className="puzzles-stats-bar">
        <div className="puzzles-stat-pill">
          <span className="stat-label">Total</span>
          <span className="stat-value">3</span>
        </div>
        <div className="puzzles-stat-pill">
          <span className="stat-label">Best Score</span>
          <span className="stat-value" style={{ color: '#d97706' }}>120</span>
        </div>
        <div className="puzzles-stat-pill">
          <span className="stat-label">Time Played</span>
          <span className="stat-value" style={{ color: '#16a34a' }}>45m</span>
        </div>
      </div>

      {/* Puzzles list */}
      <div className="puzzles-list">
        {AVAILABLE_PUZZLES.map((puzzle) => (
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
              {puzzle.icon}
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
                  Best: <span className="meta-val">{puzzle.highScore}</span>
                </span>
                <span className="puzzle-meta-chip">
                  Played: <span className="meta-val">{puzzle.timePlayed}</span>
                </span>
                <span className="puzzle-meta-chip">
                  Goal: <span className="meta-val">{puzzle.targetScore}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
};
