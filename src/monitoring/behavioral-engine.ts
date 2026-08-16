import { EmotionsOrchestrator } from '../avatar/emotions/emotions-orchestrator';
import { ResponseGenerator } from './response-generator';
import type { ResponseResult } from './response-generator';
import type { PrimaryEmotion } from '../avatar/emotions/emotion-types';
import type { MonitoringEventPayload } from './monitoring-types';
import type { StorageAdapter } from '../memory/memory-types';
import type { ShortTermMemory } from '../memory/short-term-memory';
import defaultBehavioralRules from './config/behavioral-rules.json';
import { normalizeBehavioralActions } from './action-parser';
import type {
  PuzzleSuccessConfig,
  PromptPuzzleConfig,
  BehavioralActions,
} from './action-parser';

export type {
  PuzzleSuccessConfig,
  PromptPuzzleConfig,
  BehavioralActions,
};
export { normalizeBehavioralActions };

// Behavioral types co-located with the engine that owns them
export interface BehavioralRule {
  id: string;
  name: string;
  conditions: {
    event: string;
    [key: string]: any;
  };
  emotionDeltas: Partial<Record<PrimaryEmotion, number>>;
  actions?: BehavioralActions;
  rewards?: {
    coins?: number;
    itemDrop?: string;
  };
  heuristicTemplates: string[];
  llmDirective: string;
}

export interface BehavioralConfig {
  rules: BehavioralRule[];
}

export interface BehavioralReactionResult {
  rule: BehavioralRule;
  speechText: string;
  responseType: ResponseResult['responseType'];
  emotionDeltas: BehavioralRule['emotionDeltas'];
  rewards?: BehavioralRule['rewards'];
  actions?: BehavioralActions;
}

/**
 * BehavioralEngine owns the behavioral rules config, matches events to rules,
 * resolves emotion deltas, and delegates speech/memory to ResponseGenerator.
 */
export class BehavioralEngine {
  private emotionOrchestrator: EmotionsOrchestrator;
  private responseGenerator: ResponseGenerator;
  private shortTermMemory: ShortTermMemory;
  private behavioralConfig: BehavioralConfig;
  private storageKeyBehavioral = 'chleo_behavioral_rules_v1';
  private storageAdapter?: StorageAdapter;

  constructor(
    emotionOrchestrator: EmotionsOrchestrator,
    responseGenerator: ResponseGenerator,
    shortTermMemory: ShortTermMemory,
    storageAdapter?: StorageAdapter
  ) {
    this.emotionOrchestrator = emotionOrchestrator;
    this.responseGenerator = responseGenerator;
    this.shortTermMemory = shortTermMemory;
    this.storageAdapter = storageAdapter;
    this.behavioralConfig = this.loadBehavioralConfig();
  }

  private loadBehavioralConfig(): BehavioralConfig {
    const defaults = JSON.parse(JSON.stringify(defaultBehavioralRules)) as BehavioralConfig;

    const applyData = (raw: string): BehavioralConfig | null => {
      try {
        const parsed = JSON.parse(raw) as BehavioralConfig;
        if (parsed && Array.isArray(parsed.rules)) {
          defaults.rules.forEach((defRule) => {
            const storedRule = parsed.rules.find((r) => r.id === defRule.id);
            if (!storedRule) {
              parsed.rules.push(defRule);
            }
          });
          return parsed;
        }
      } catch (e) {
        console.warn('[BehavioralEngine] Failed to parse behavioral rules:', e);
      }
      return null;
    };

    try {
      // 1. Direct Node.js / Custom StorageAdapter (Electron Main process)
      if (this.storageAdapter) {
        const res = this.storageAdapter.readMemoryFile('behavioral-rules.json');
        if (typeof res === 'string') {
          const parsed = applyData(res);
          if (parsed) return parsed;
        } else if (res instanceof Promise) {
          res.then((raw) => {
            if (raw) {
              const parsed = applyData(raw);
              if (parsed) {
                this.behavioralConfig = parsed;
              }
            }
          });
        }
      }

      // 2. Desktop Native (Electron Renderer IPC) check
      if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
        (window as any).electronAPI.readMemoryFile('behavioral-rules.json').then((raw: string | null) => {
          if (raw) {
            const parsed = applyData(raw);
            if (parsed) this.behavioralConfig = parsed;
          } else if (window.localStorage) {
            const localRaw = window.localStorage.getItem(this.storageKeyBehavioral);
            if (localRaw) {
              const localParsed = applyData(localRaw);
              if (localParsed) this.behavioralConfig = localParsed;
            }
          }
        });
      }

      // 3. Browser localStorage fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKeyBehavioral);
        if (raw) {
          const parsed = applyData(raw);
          if (parsed) return parsed;
        }
      }
    } catch (e) {
      console.warn('[BehavioralEngine] Failed to load behavioral rules from storage:', e);
    }

    return defaults;
  }

  saveBehavioralConfig(): void {
    try {
      const jsonStr = JSON.stringify(this.behavioralConfig, null, 2);

      // Direct Node.js / Custom StorageAdapter (Electron Main process)
      if (this.storageAdapter) {
        this.storageAdapter.saveMemoryFile('behavioral-rules.json', jsonStr);
      }

      // Desktop Native (Electron Renderer IPC) save check
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveMemoryFile) {
        (window as any).electronAPI.saveMemoryFile('behavioral-rules.json', jsonStr);
      }

      // Browser localStorage fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKeyBehavioral, jsonStr);
      }
    } catch (e) {
      console.warn('[BehavioralEngine] Failed to save behavioral rules:', e);
    }
  }

  // --- Behavioral Rules Accessors ---

  getBehavioralRules(): BehavioralRule[] {
    return this.behavioralConfig.rules;
  }

  getBehavioralRule(id: string): BehavioralRule | undefined {
    return this.behavioralConfig.rules.find((r) => r.id === id);
  }

  updateBehavioralRule(id: string, updates: Partial<BehavioralRule>): BehavioralRule | undefined {
    const rule = this.getBehavioralRule(id);
    if (rule) {
      if (updates.emotionDeltas) rule.emotionDeltas = { ...rule.emotionDeltas, ...updates.emotionDeltas };
      if (updates.rewards) rule.rewards = { ...rule.rewards, ...updates.rewards };
      if (updates.heuristicTemplates) rule.heuristicTemplates = [...updates.heuristicTemplates];
      if (updates.llmDirective) rule.llmDirective = updates.llmDirective;
      this.saveBehavioralConfig();
    }
    return rule;
  }

  /**
   * Match an event to a behavioral rule, apply emotion deltas,
   * and delegate speech generation + memory recording to ResponseGenerator.
   */
  async processEvent(event: MonitoringEventPayload): Promise<BehavioralReactionResult | null> {
    const matchingRule = this.behavioralConfig.rules.find(
      (r) =>
        r.conditions.event === event.eventId ||
        r.id === event.eventId ||
        (event.eventId === 'SITE_BLOCKED_VISIT' && r.conditions.event === 'BLOCKED_SITE_ATTEMPT')
    );

    if (!matchingRule) {
      console.warn(`[BehavioralEngine] No behavioral rule defined for event: ${event.eventId}`);
      return null;
    }

    // Apply emotion deltas to EmotionsOrchestrator & persist to LongTermMemory via ShortTermMemory
    this.emotionOrchestrator.applyBehavioralData(matchingRule.emotionDeltas);
    this.shortTermMemory.updateLastEmotion(this.emotionOrchestrator.getState());

    // Delegate speech generation + memory recording to ResponseGenerator
    const response: ResponseResult = await this.responseGenerator.generateResponse(event, matchingRule);

    const normalizedActions = normalizeBehavioralActions(matchingRule.actions);

    return {
      rule: matchingRule,
      speechText: response.speechText,
      responseType: response.responseType,
      emotionDeltas: matchingRule.emotionDeltas,
      rewards: matchingRule.rewards,
      actions: normalizedActions,
    };
  }

  getEmotionState() {
    return this.emotionOrchestrator.getState();
  }

  getOverallEmotion() {
    return this.emotionOrchestrator.getOverallEmotion();
  }

  resetBehavioralRules(): void {
    this.behavioralConfig = JSON.parse(JSON.stringify(defaultBehavioralRules));
    this.saveBehavioralConfig();
  }
}
