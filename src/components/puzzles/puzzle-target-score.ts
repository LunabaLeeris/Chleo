import type { EmotionalState } from '../../avatar/emotions/emotion-types';

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

export interface PuzzleTargetBounds {
  minScore: number;
  baseScore: number;
  maxScore: number;
  roundStep?: number;
  weights?: Partial<EmotionScoreWeights>;
  stressDivisor?: number;
}

export interface PuzzleTargetConfig {
  weights: EmotionScoreWeights;
  stressDivisor: number;
  bounds: Record<string, PuzzleTargetBounds>;
}

export const DEFAULT_PUZZLE_TARGET_CONFIG: PuzzleTargetConfig = {
  weights: {
    joy: -1.2,
    trust: -1.0,
    anticipation: -0.6,
    surprise: 0.0,
    anger: 1.5,
    disgust: 1.2,
    sadness: 1.0,
    fear: 0.8,
  },
  stressDivisor: 2.0,
  bounds: {
    snake: {
      minScore: 30,
      baseScore: 50,
      maxScore: 100,
      roundStep: 10,
    },
    typing: {
      minScore: 30,
      baseScore: 50,
      maxScore: 100,
      roundStep: 10,
    },
    matching: {
      minScore: 40,
      baseScore: 60,
      maxScore: 100,
      roundStep: 10,
    },
  },
};

// Cached in-memory active config (populated on load)
let activeConfig: PuzzleTargetConfig = {
  weights: { ...DEFAULT_PUZZLE_TARGET_CONFIG.weights },
  stressDivisor: DEFAULT_PUZZLE_TARGET_CONFIG.stressDivisor,
  bounds: JSON.parse(JSON.stringify(DEFAULT_PUZZLE_TARGET_CONFIG.bounds)),
};

/**
 * Returns the currently active target score configuration.
 */
export function getPuzzleTargetConfig(): PuzzleTargetConfig {
  return activeConfig;
}

/**
 * Sets or updates the active target score configuration in memory.
 */
export function setPuzzleTargetConfig(newConfig: Partial<PuzzleTargetConfig>): void {
  activeConfig = {
    weights: { ...activeConfig.weights, ...(newConfig.weights || {}) },
    stressDivisor: newConfig.stressDivisor ?? activeConfig.stressDivisor,
    bounds: { ...activeConfig.bounds, ...(newConfig.bounds || {}) },
  };
}

/**
 * Loads puzzle-target-config.json asynchronously via electronAPI if available.
 */
export async function loadPuzzleTargetConfig(): Promise<PuzzleTargetConfig> {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
      const raw = await (window as any).electronAPI.readMemoryFile('puzzle-target-config.json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          activeConfig = {
            weights: { ...DEFAULT_PUZZLE_TARGET_CONFIG.weights, ...(parsed.weights || {}) },
            stressDivisor: typeof parsed.stressDivisor === 'number' ? parsed.stressDivisor : DEFAULT_PUZZLE_TARGET_CONFIG.stressDivisor,
            bounds: { ...DEFAULT_PUZZLE_TARGET_CONFIG.bounds, ...(parsed.bounds || {}) },
          };
          return activeConfig;
        }
      }
    }
  } catch (e) {
    console.warn('[puzzle-target-score] Failed to load puzzle-target-config.json, using defaults:', e);
  }
  return activeConfig;
}

/**
 * Saves current configuration to puzzle-target-config.json via electronAPI.
 */
export async function savePuzzleTargetConfig(config: PuzzleTargetConfig): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveMemoryFile) {
      const success = await (window as any).electronAPI.saveMemoryFile(
        'puzzle-target-config.json',
        JSON.stringify(config, null, 2)
      );
      if (success) {
        activeConfig = { ...config };
      }
      return Boolean(success);
    }
  } catch (e) {
    console.warn('[puzzle-target-score] Failed to save puzzle-target-config.json:', e);
  }
  return false;
}

/**
 * Computes an emotional distress / difficulty factor in the range [-1.0, 1.0].
 * - Negative value: Good emotions outweigh bad emotions (avatar is happy/trusting).
 * - 0.0: Neutral emotional state.
 * - Positive value: Bad emotions outweigh good emotions (avatar is upset/angry).
 */
export function computeEmotionalDifficultyFactor(
  emotions?: Partial<EmotionalState> | null,
  weights: EmotionScoreWeights = activeConfig.weights,
  stressDivisor: number = activeConfig.stressDivisor
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

  const divisor = stressDivisor > 0 ? stressDivisor : 2.0;
  const normalized = netStress / divisor;
  return Math.max(-1.0, Math.min(1.0, normalized));
}

/**
 * Calculates a dynamic puzzle target score based on avatar emotions and config.
 * The output is guaranteed to be a multiple of roundStep (default 10) within [minScore, maxScore].
 */
export function calculatePuzzleTargetScore(
  puzzleId: string,
  emotions?: Partial<EmotionalState> | null,
  config: PuzzleTargetConfig = activeConfig
): number {
  const normId = puzzleId.toLowerCase().trim();
  const bounds = config.bounds[normId] || config.bounds.snake || DEFAULT_PUZZLE_TARGET_CONFIG.bounds.snake;

  const effectiveWeights = bounds.weights
    ? { ...config.weights, ...bounds.weights }
    : config.weights;
  const effectiveDivisor = bounds.stressDivisor ?? config.stressDivisor;

  const factor = computeEmotionalDifficultyFactor(emotions, effectiveWeights, effectiveDivisor);

  let rawScore: number;
  if (factor >= 0) {
    rawScore = bounds.baseScore + factor * (bounds.maxScore - bounds.baseScore);
  } else {
    rawScore = bounds.baseScore + factor * (bounds.baseScore - bounds.minScore);
  }

  const step = bounds.roundStep && bounds.roundStep > 0 ? bounds.roundStep : 10;
  const rounded = Math.round(rawScore / step) * step;

  return Math.max(bounds.minScore, Math.min(bounds.maxScore, rounded));
}

export function calculateSnakeTargetScore(
  emotions?: Partial<EmotionalState> | null,
  config?: PuzzleTargetConfig
): number {
  return calculatePuzzleTargetScore('snake', emotions, config);
}

export function calculateTypingTargetScore(
  emotions?: Partial<EmotionalState> | null,
  config?: PuzzleTargetConfig
): number {
  return calculatePuzzleTargetScore('typing', emotions, config);
}

export function calculateMatchingTargetScore(
  emotions?: Partial<EmotionalState> | null,
  config?: PuzzleTargetConfig
): number {
  return calculatePuzzleTargetScore('matching', emotions, config);
}
