import type { EmotionalState } from '../../avatar/emotions/emotion-types';

/**
 * Weights assigned to each primary emotion for calculating puzzle target scores.
 * - Positive emotions reduce the difficulty (lower target score).
 * - Negative emotions increase the difficulty (higher target score).
 */
export interface EmotionScoreWeights {
  joy: number;
  trust: number;
  anticipation: number;
  surprise: number;
  anger: number;
  sadness: number;
  disgust: number;
  fear: number;
}

export const DEFAULT_EMOTION_SCORE_WEIGHTS: EmotionScoreWeights = {
  // Positive emotions (make target score more lenient)
  joy: -1.2,
  trust: -1.0,
  anticipation: -0.6,
  surprise: 0.0, // Neutral

  // Negative emotions (make target score more demanding / punitive)
  anger: 1.5,
  disgust: 1.2,
  sadness: 1.0,
  fear: 0.8,
};

/**
 * Target score boundaries (minimum, neutral baseline, and maximum cap) for each puzzle.
 * All boundaries are multiples of 10.
 */
export interface PuzzleTargetBounds {
  minScore: number;
  baseScore: number;
  maxScore: number;
}

export const PUZZLE_TARGET_BOUNDS: Record<string, PuzzleTargetBounds> = {
  snake: {
    minScore: 30,  // 3 apples
    baseScore: 50, // 5 apples
    maxScore: 100, // 10 apples
  },
  typing: {
    minScore: 30,  // 3 words (30 pts)
    baseScore: 50, // 5 words (50 pts)
    maxScore: 100, // 10 words (100 pts)
  },
  matching: {
    minScore: 40,  // 4 pairs (40 pts)
    baseScore: 60, // 6 pairs (60 pts)
    maxScore: 100, // 10 pairs (100 pts)
  },
};

/**
 * Computes an emotional distress / difficulty factor in the range [-1.0, 1.0].
 * - Negative value: Good emotions outweigh bad emotions (avatar is happy/trusting).
 * - 0.0: Neutral emotional state.
 * - Positive value: Bad emotions outweigh good emotions (avatar is upset/angry).
 */
export function computeEmotionalDifficultyFactor(
  emotions?: Partial<EmotionalState> | null,
  weights: EmotionScoreWeights = DEFAULT_EMOTION_SCORE_WEIGHTS
): number {
  if (!emotions) return 0;

  const joy = Math.max(0, Math.min(1, emotions.joy ?? 0));
  const trust = Math.max(0, Math.min(1, emotions.trust ?? 0));
  const anticipation = Math.max(0, Math.min(1, emotions.anticipation ?? 0));
  const surprise = Math.max(0, Math.min(1, emotions.surprise ?? 0));

  const anger = Math.max(0, Math.min(1, emotions.anger ?? 0));
  const disgust = Math.max(0, Math.min(1, emotions.disgust ?? 0));
  const sadness = Math.max(0, Math.min(1, emotions.sadness ?? 0));
  const fear = Math.max(0, Math.min(1, emotions.fear ?? 0));

  const netStress =
    anger * weights.anger +
    disgust * weights.disgust +
    sadness * weights.sadness +
    fear * weights.fear +
    surprise * weights.surprise +
    joy * weights.joy +
    trust * weights.trust +
    anticipation * weights.anticipation;

  // Normalize factor into [-1.0, 1.0] (clamped)
  const normalized = netStress / 2.0;
  return Math.max(-1.0, Math.min(1.0, normalized));
}

/**
 * Calculates a dynamic puzzle target score based on avatar emotions.
 * The output is guaranteed to be a multiple of 10 within [minScore, maxScore].
 */
export function calculatePuzzleTargetScore(
  puzzleId: string,
  emotions?: Partial<EmotionalState> | null
): number {
  const normId = puzzleId.toLowerCase().trim();
  const bounds = PUZZLE_TARGET_BOUNDS[normId] || PUZZLE_TARGET_BOUNDS.snake;

  const factor = computeEmotionalDifficultyFactor(emotions);

  let rawScore: number;
  if (factor >= 0) {
    // Bad emotions dominate -> scale up from baseScore towards maxScore
    rawScore = bounds.baseScore + factor * (bounds.maxScore - bounds.baseScore);
  } else {
    // Good emotions dominate -> scale down from baseScore towards minScore
    rawScore = bounds.baseScore + factor * (bounds.baseScore - bounds.minScore);
  }

  // Round to the nearest multiple of 10
  const roundedTo10 = Math.round(rawScore / 10) * 10;

  // Clamp within puzzle bounds
  return Math.max(bounds.minScore, Math.min(bounds.maxScore, roundedTo10));
}

/**
 * Calculates target score for Retro Snake puzzle based on avatar emotional values.
 * Result is always a multiple of 10 (e.g. 30, 40, 50, 60, ..., 100).
 */
export function calculateSnakeTargetScore(emotions?: Partial<EmotionalState> | null): number {
  return calculatePuzzleTargetScore('snake', emotions);
}

/**
 * Calculates target score for Speed Typer puzzle based on avatar emotional values.
 * Result is always a multiple of 10 (e.g. 30, 40, 50, 60, ..., 100).
 */
export function calculateTypingTargetScore(emotions?: Partial<EmotionalState> | null): number {
  return calculatePuzzleTargetScore('typing', emotions);
}

/**
 * Calculates target score for Memory Match puzzle based on avatar emotional values.
 * Result is always a multiple of 10 (e.g. 40, 50, 60, 70, ..., 100).
 */
export function calculateMatchingTargetScore(emotions?: Partial<EmotionalState> | null): number {
  return calculatePuzzleTargetScore('matching', emotions);
}
