import type {
  PrimaryEmotion,
  EmotionalState,
} from "../avatar/emotions/emotion-types";

export type MemoryConsolidationReason =
  "threshold" | "day_change" | "memorable_event";

export interface ShortTermMemoryEvent {
  id: string;
  timestamp: number;
  type: string;
  domain?: string;
  details: string;
  formattedText?: string;
  emotionDelta?: Partial<Record<PrimaryEmotion, number>>;
}

export interface ActiveWarningState {
  domain: string;
  warnedAt: number;
  percentSpent: number;
}

export interface LongTermMemoryData {
  daysKnown: number;
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
  totalViolationsCount: number;
  totalRewardsEarned: number;
  totalPuzzlesCompleted: number;
  lastEmotionState: EmotionalState;
  pastMistakes: string[];
  pastAchievements: string[];
  userPreferences: {
    userName?: string;
    bedtime?: string;
    waketime?: string;
  };
}
