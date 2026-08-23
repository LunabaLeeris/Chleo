import React, { useEffect } from 'react';
import { SnakePuzzle } from './SnakePuzzle';
import { TypingPuzzle } from './TypingPuzzle';
import { MatchingPuzzle } from './MatchingPuzzle';
import { addPuzzleTimeSpent } from './puzzle-data-service';
import type { PuzzleSuccessConfig } from '../../monitoring/behavioral-engine';
import type { EmotionalState } from '../../avatar/emotions/emotion-types';

export interface PuzzleHostProps {
  puzzleId: string;
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  onSuccessConfig?: PuzzleSuccessConfig;
  onHighScoreBeaten?: (puzzleId: string, newHighScore: number) => void;
  initialHighScore?: number;
  emotionalState?: Partial<EmotionalState>;
  targetScore?: number;
}

export const PuzzleHost: React.FC<PuzzleHostProps> = ({
  puzzleId,
  targetDomain,
  onSuccess,
  onCancel,
  onSuccessConfig,
  onHighScoreBeaten,
  initialHighScore,
  emotionalState,
  targetScore,
}) => {
  useEffect(() => {
    let lastFlushedTime = Date.now();

    const flushTime = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastFlushedTime) / 1000);
      if (elapsedSeconds > 0) {
        lastFlushedTime += elapsedSeconds * 1000;
        addPuzzleTimeSpent(puzzleId, elapsedSeconds);
      }
    };

    // Periodic flush every 5 seconds so time is not lost
    const intervalId = setInterval(flushTime, 5000);

    return () => {
      clearInterval(intervalId);
      flushTime();
    };
  }, [puzzleId]);
  switch (puzzleId.toLowerCase()) {
    case 'matching':
    case 'memory':
      return (
        <MatchingPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
          onHighScoreBeaten={onHighScoreBeaten}
          initialHighScore={initialHighScore}
          emotionalState={emotionalState}
          targetScore={targetScore}
        />
      );
    case 'typing':
      return (
        <TypingPuzzle
          targetDomain={targetDomain}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onSuccessConfig={onSuccessConfig}
          onHighScoreBeaten={onHighScoreBeaten}
          initialHighScore={initialHighScore}
          emotionalState={emotionalState}
          targetScore={targetScore}
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
          emotionalState={emotionalState}
          targetScore={targetScore}
        />
      );
  }
};
