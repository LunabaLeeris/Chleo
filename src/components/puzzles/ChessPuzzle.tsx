import React from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';

const CHESS_CONFIG: PuzzleConfig = {
  id: 'chess',
  name: 'Pixel Chess',
  icon: '♟️',
  targetGoalScore: 100,
  goalDescription: 'Solve the Mate-in-1 Tactical Challenge',
  instructions: 'Find the winning tactic or test your tactical score.',
};

export const ChessPuzzle: React.FC<PuzzleComponentProps> = ({
  targetDomain,
  onSuccess,
  onCancel,
}) => {
  return (
    <PuzzleContainer
      config={CHESS_CONFIG}
      targetDomain={targetDomain}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <div className="puzzle-scaffold-preview">
        <div className="puzzle-mockup-screen chess-screen">
          <div className="chess-mock-board">
            <div className="chess-square sq-light">♔</div>
            <div className="chess-square sq-dark">.</div>
            <div className="chess-square sq-light">♛</div>
            <div className="chess-square sq-dark">♚</div>
          </div>
          <div className="puzzle-mockup-hint">
            <span>Tactic: Queen to E8# Checkmate</span>
            <span>Target: 100 pts Tactical Mastery</span>
          </div>
        </div>
      </div>
    </PuzzleContainer>
  );
};
