import type { PuzzleSuccessConfig } from '../../monitoring/behavioral-engine';
import type { EmotionalState } from '../../avatar/emotions/emotion-types';

export interface PuzzleComponentProps {
  targetDomain: string;
  onSuccess: (score: number) => void;
  onCancel: () => void;
  onSuccessConfig?: PuzzleSuccessConfig;
  onHighScoreBeaten?: (puzzleId: string, newHighScore: number) => void;
  initialHighScore?: number;
  emotionalState?: Partial<EmotionalState>;
  targetScore?: number;
}

export interface PuzzleConfig {
  id: string;
  name: string;
  icon: string;
  targetGoalScore?: number;
  goalDescription: string;
  instructions: string;
}
