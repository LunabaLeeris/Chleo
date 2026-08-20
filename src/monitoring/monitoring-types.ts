import type { PrimaryEmotion } from "../avatar/emotions/emotion-types";

export type SiteType = "blocked" | "avoid" | "productive" | "neutral";

export interface SiteRule {
  domain: string;
  type: SiteType;
  dailyLimitSeconds: number;
  spentTodaySeconds: number;
  warningThresholdPercent: number; // e.g. 80 for 80% limit warning
  requiresPuzzleToUnblock?: boolean;
}

export interface MonitoringConfig {
  rules: SiteRule[];
  productiveRewardIntervalSeconds: number;
  unblockPuzzlePenalty: Partial<Record<PrimaryEmotion, number>>;
}

export interface MonitoringEventPayload {
  eventId: string;
  domain: string;
  timeSpentSeconds: number;
  limitSeconds: number;
  percentSpent: number;
  remainingSeconds: number;
  siteType: SiteType;
  message?: string;
}

/**
 * Result returned by RuleStore.evaluateTick() to ActivityTracker.
 */
export interface TickResult {
  domain: string;
  spentTodaySeconds: number;
  isBlocked: boolean;
  ruleChanged: boolean;
  reaction?: {
    payload: MonitoringEventPayload;
    speechText: string;
  };
}
