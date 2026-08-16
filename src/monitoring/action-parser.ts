export type PanelOrientation = 'center' | 'left' | 'remain';
export type AvatarPosition = 'bottom-right' | 'top-right' | 'center-right';
export type Puzzles = 'snake' | 'chess' | 'sudoku';

export interface PuzzleSuccessConfig {
  status: 'unblock' | 'avoid';
  duration?: number;
}

export interface PromptPuzzleConfig {
  text: string;
  options: string[];
  onSuccess?: PuzzleSuccessConfig;
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
 * Normalizes on-success callback configuration for puzzle completions.
 */
export function normalizePuzzleSuccessConfig(
  success?: Partial<PuzzleSuccessConfig>
): PuzzleSuccessConfig | undefined {
  if (!success || typeof success !== 'object') {
    return undefined;
  }

  return {
    status: success.status === 'avoid' ? 'avoid' : 'unblock',
    duration: typeof success.duration === 'number' ? success.duration : undefined,
  };
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
    text: prompt.text || 'Do you want to solve a puzzle to unlock access?',
    options: Array.isArray(prompt.options) && prompt.options.length > 0 ? prompt.options : ['yes', 'no'],
    onSuccess: normalizePuzzleSuccessConfig(prompt.onSuccess),
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
      : ['snake', 'chess', 'sudoku'],
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
