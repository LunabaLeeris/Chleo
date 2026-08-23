import { resolveRewardItem } from '../items/items-registry';

export type PanelOrientation = 'center' | 'left' | 'remain';
export type AvatarPosition = 'bottom-right' | 'top-right' | 'center-right';
export type Puzzles = 'snake' | 'typing' | 'matching';

export interface PuzzleRewardItem {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  status: 'unblock' | 'avoid' | string;
  duration?: number;
  cost?: number;
  [key: string]: any;
}

export type PuzzleSuccessConfig = PuzzleRewardItem[];

export interface PromptPuzzleConfig {
  text: string;
  options: string[];
  onSuccess?: PuzzleSuccessConfig;
  completionSpeech?: string;
  rewardTimeoutSeconds?: number;
  rewardUrgeSpeech?: string;
  rewardUrgePercent?: number;
  draggable: boolean;
  closeAllTabs: boolean;
  orientation: PanelOrientation | string;
}

export interface BehavioralActions {
  closeTab: boolean;
  promptPuzzle?: PromptPuzzleConfig;
  openPuzzle: Array<Puzzles>;
  orientation: PanelOrientation;
  avatarPosition: AvatarPosition;
  interactable: boolean;
  showReward: boolean;
  redirect?: string;
}

/**
 * Normalizes a single reward item into standard schema with sensible defaults and items-config resolution.
 */
export function normalizeRewardItem(
  item?: Partial<PuzzleRewardItem>,
  index = 0
): PuzzleRewardItem {
  return resolveRewardItem(item, index);
}

/**
 * Normalizes on-success callback configuration for puzzle completions into a list of reward items.
 */
export function normalizePuzzleSuccessConfig(
  success?: Partial<PuzzleRewardItem> | Array<Partial<PuzzleRewardItem>>
): PuzzleSuccessConfig | undefined {
  if (!success) {
    return undefined;
  }

  if (Array.isArray(success)) {
    if (success.length === 0) return undefined;
    return success.map((item, idx) => normalizeRewardItem(item, idx));
  }

  if (typeof success === 'object') {
    return [normalizeRewardItem(success, 0)];
  }

  return undefined;
}

/**
 * Normalizes prompt puzzle configuration with safe default values.
 */
export function normalizePromptPuzzleConfig(
  prompt?: Partial<PromptPuzzleConfig>
): PromptPuzzleConfig | undefined {
  if (!prompt || typeof prompt !== 'object') {
    return undefined;
  }

  return {
    text: prompt.text || 'Do you want to solve a puzzle to modify access?',
    options: Array.isArray(prompt.options) && prompt.options.length > 0 ? prompt.options : ['yes', 'no'],
    onSuccess: normalizePuzzleSuccessConfig(prompt.onSuccess),
    completionSpeech: prompt.completionSpeech || 'Fine, you win! Pick your reward.',
    rewardTimeoutSeconds: typeof prompt.rewardTimeoutSeconds === 'number' ? prompt.rewardTimeoutSeconds : 60,
    rewardUrgeSpeech: prompt.rewardUrgeSpeech || "Just pick one or else I'll pick one for you!",
    rewardUrgePercent: typeof prompt.rewardUrgePercent === 'number' ? prompt.rewardUrgePercent : 50,
    draggable: prompt.draggable ?? true,
    closeAllTabs: prompt.closeAllTabs ?? false,
    orientation: prompt.orientation || 'remain',
  };
}

/**
 * Normalizes behavioral action configurations, ensuring required defaults are populated.
 */
export function normalizeBehavioralActions(
  actions?: Partial<BehavioralActions>
): BehavioralActions | undefined {
  if (!actions || typeof actions !== 'object') {
    return undefined;
  }

  return {
    closeTab: actions.closeTab ?? false,
    promptPuzzle: normalizePromptPuzzleConfig(actions.promptPuzzle),
    openPuzzle: actions.openPuzzle && actions.openPuzzle.length > 0
      ? actions.openPuzzle
      : ['snake', 'typing', 'matching'],
    orientation: actions.orientation || 'center',
    avatarPosition: actions.avatarPosition || 'bottom-right',
    interactable: actions.interactable ?? true,
    showReward: actions.showReward ?? false,
    redirect: actions.redirect,
  };
}

// Aliases for compatibility
export const normaliseBehavioralActions = normalizeBehavioralActions;
export const parseBehavioralActions = normalizeBehavioralActions;
