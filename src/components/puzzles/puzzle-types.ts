import type { PuzzleSuccessConfig } from '../../monitoring/behavioral-engine';

export interface PuzzleComponentProps {
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  onSuccessConfig?: PuzzleSuccessConfig;
  onHighScoreBeaten?: (puzzleId: string, newHighScore: number) => void;
  initialHighScore?: number;
}

export interface PuzzleConfig {
  id: string;
  name: string;
  icon: string;
  targetGoalScore: number;
  goalDescription: string;
  instructions: string;
}
