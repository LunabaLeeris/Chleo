import React from 'react';
import { SnakePuzzle } from './SnakePuzzle';
import { ChessPuzzle } from './ChessPuzzle';
import { SudokuPuzzle } from './SudokuPuzzle';
import { TypingPuzzle } from './TypingPuzzle';
import type { PuzzleSuccessConfig } from '../../monitoring/behavioral-engine';

export interface PuzzleHostProps {
  puzzleId: string;
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  onSuccessConfig?: PuzzleSuccessConfig;
  onHighScoreBeaten?: (puzzleId: string, newHighScore: number) => void;
  initialHighScore?: number;
}

export const PuzzleHost: React.FC<PuzzleHostProps> = ({
  puzzleId,
  targetDomain,
  onSuccess,
  onCancel,
  onSuccessConfig,
  onHighScoreBeaten,
  initialHighScore,
}) => {
  switch (puzzleId.toLowerCase()) {
    case 'typing':
      return (
        <TypingPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
          onHighScoreBeaten={onHighScoreBeaten}
          initialHighScore={initialHighScore}
        />
      );
    case 'chess':
      return (
        <ChessPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
          onHighScoreBeaten={onHighScoreBeaten}
          initialHighScore={initialHighScore}
        />
      );
    case 'sudoku':
      return (
        <SudokuPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
          onHighScoreBeaten={onHighScoreBeaten}
          initialHighScore={initialHighScore}
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
          onHighScoreBeaten={onHighScoreBeaten}
          initialHighScore={initialHighScore}
        />
      );
  }
};
