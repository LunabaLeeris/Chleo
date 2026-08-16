import React from 'react';
import { PuzzleContainer } from './PuzzleContainer';
import type { PuzzleComponentProps, PuzzleConfig } from './puzzle-types';

const SUDOKU_CONFIG: PuzzleConfig = {
  id: 'sudoku',
  name: 'Mini Sudoku',
  icon: '🔢',
  targetGoalScore: 80,
  goalDescription: 'Fill the 4x4 Mini Grid correctly',
  instructions: 'Ensure each row and 2x2 box contains numbers 1-4.',
};

export const SudokuPuzzle: React.FC<PuzzleComponentProps> = ({
  targetDomain,
  onSuccess,
  onCancel,
}) => {
  return (
    <PuzzleContainer
      config={SUDOKU_CONFIG}
      targetDomain={targetDomain}
      onSuccess={onSuccess}
      onCancel={onCancel}
    >
      <div className="puzzle-scaffold-preview">
        <div className="puzzle-mockup-screen sudoku-screen">
          <div className="sudoku-mock-grid">
            <div className="sudoku-cell">1</div>
            <div className="sudoku-cell cell-empty">?</div>
            <div className="sudoku-cell">3</div>
            <div className="sudoku-cell">4</div>
            <div className="sudoku-cell cell-empty">?</div>
            <div className="sudoku-cell">4</div>
            <div className="sudoku-cell">1</div>
            <div className="sudoku-cell cell-empty">?</div>
          </div>
          <div className="puzzle-mockup-hint">
            <span>Pattern: 4x4 Quick Puzzle</span>
            <span>Target: Complete grid (80 pts)</span>
          </div>
        </div>
      </div>
    </PuzzleContainer>
  );
};
