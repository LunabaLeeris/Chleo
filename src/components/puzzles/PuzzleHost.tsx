import React from 'react';
import { SnakePuzzle } from './SnakePuzzle';
import { ChessPuzzle } from './ChessPuzzle';
import { SudokuPuzzle } from './SudokuPuzzle';
import type { PuzzleSuccessConfig } from '../../monitoring/behavioral-engine';

export interface PuzzleHostProps {
  puzzleId: string;
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  onSuccessConfig?: PuzzleSuccessConfig;
}

export const PuzzleHost: React.FC<PuzzleHostProps> = ({
  puzzleId,
  targetDomain,
  onSuccess,
  onCancel,
  onSuccessConfig,
}) => {
  switch (puzzleId.toLowerCase()) {
    case 'chess':
      return (
        <ChessPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
        />
      );
    case 'sudoku':
      return (
        <SudokuPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
        />
      );
    case 'snake':
    default:
      return (
        <SnakePuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
        />
      );
  }
};
