import React from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';

const SNAKE_CONFIG: PuzzleConfig = {
  id: 'snake',
  name: 'Retro Snake',
  icon: '🐍',
  targetGoalScore: 50,
  goalDescription: 'Collect apples without hitting the wall',
  instructions: 'Use arrow keys or simulate your score below.',
};

export const SnakePuzzle: React.FC<PuzzleComponentProps> = ({
  targetDomain,
  onSuccess,
  onCancel,
}) => {
  return (
    <PuzzleContainer
      config={SNAKE_CONFIG}
      targetDomain={targetDomain}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <div className="puzzle-scaffold-preview">
        <div className="puzzle-mockup-screen snake-screen">
          <div className="snake-mock-board">
            <div className="snake-mock-cell cell-head">■</div>
            <div className="snake-mock-cell cell-body">■</div>
            <div className="snake-mock-cell cell-body">■</div>
            <div className="snake-mock-apple">🍎</div>
          </div>
          <div className="puzzle-mockup-hint">
            <span>Grid: 12x12 Arcade Arena</span>
            <span>Target: 5 Apples (50 pts)</span>
          </div>
        </div>
      </div>
    </PuzzleContainer>
  );
};
