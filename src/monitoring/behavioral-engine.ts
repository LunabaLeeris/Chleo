import { EmotionsOrchestrator } from "../avatar/emotions/emotions-orchestrator";
import { ResponseGenerator } from "./response-generator";
import type { ResponseResult } from "./response-generator";
import type { PrimaryEmotion } from "../avatar/emotions/emotion-types";
import type { MonitoringEventPayload } from "./monitoring-types";
import defaultBehavioralRules from "./config/behavioral-rules.json";

// Behavioral types co-located with the engine that owns them
export interface BehavioralRule {
  id: string;
  name: string;
  conditions: {
    event: string;
    [key: string]: any;
  };
  emotionDeltas: Partial<Record<PrimaryEmotion, number>>;
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
  responseType: ResponseResult["responseType"];
  emotionDeltas: BehavioralRule["emotionDeltas"];
  rewards?: BehavioralRule["rewards"];
}

/**
 * BehavioralEngine owns the behavioral rules config, matches events to rules,
 * resolves emotion deltas, and delegates speech/memory to ResponseGenerator.
 * Does NOT directly access ShortTermMemory or LongTermMemory.
 */
export class BehavioralEngine {
  private emotionOrchestrator: EmotionsOrchestrator;
  private responseGenerator: ResponseGenerator;
  private behavioralConfig: BehavioralConfig;
  private storageKeyBehavioral = "chleo_behavioral_rules_v1";

  constructor(
    emotionOrchestrator: EmotionsOrchestrator,
    responseGenerator: ResponseGenerator,
  ) {
    this.emotionOrchestrator = emotionOrchestrator;
    this.responseGenerator = responseGenerator;
    this.behavioralConfig = this.loadBehavioralConfig();
  }

  private loadBehavioralConfig(): BehavioralConfig {
    const defaults = JSON.parse(
      JSON.stringify(defaultBehavioralRules),
    ) as BehavioralConfig;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKeyBehavioral);
        if (raw) {
          const parsed = JSON.parse(raw) as BehavioralConfig;
          defaults.rules.forEach((defRule) => {
            const storedRule = parsed.rules.find((r) => r.id === defRule.id);
            if (storedRule) {
              storedRule.emotionDeltas = defRule.emotionDeltas;
              storedRule.conditions = defRule.conditions;
            } else {
              parsed.rules.push(defRule);
            }
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn(
        "[BehavioralEngine] Failed to load behavioral rules from storage:",
        e,
      );
    }
    return defaults;
  }

  saveBehavioralConfig(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          this.storageKeyBehavioral,
          JSON.stringify(this.behavioralConfig),
        );
      }
    } catch (e) {
      console.warn("[BehavioralEngine] Failed to save behavioral rules:", e);
    }
  }

  // --- Behavioral Rules Accessors ---

  getBehavioralRules(): BehavioralRule[] {
    return this.behavioralConfig.rules;
  }

  getBehavioralRule(id: string): BehavioralRule | undefined {
    return this.behavioralConfig.rules.find((r) => r.id === id);
  }

  updateBehavioralRule(
    id: string,
    updates: Partial<BehavioralRule>,
  ): BehavioralRule | undefined {
    const rule = this.getBehavioralRule(id);
    if (rule) {
      if (updates.emotionDeltas)
        rule.emotionDeltas = {
          ...rule.emotionDeltas,
          ...updates.emotionDeltas,
        };
      if (updates.rewards)
        rule.rewards = { ...rule.rewards, ...updates.rewards };
      if (updates.heuristicTemplates)
        rule.heuristicTemplates = [...updates.heuristicTemplates];
      if (updates.llmDirective) rule.llmDirective = updates.llmDirective;
      this.saveBehavioralConfig();
    }
    return rule;
  }

  // --- Event Processing ---

  /**
   * Match an event to a behavioral rule, apply emotion deltas,
   * and delegate speech generation + memory recording to ResponseGenerator.
   */
  async processEvent(
    event: MonitoringEventPayload,
  ): Promise<BehavioralReactionResult | null> {
    const matchingRule = this.behavioralConfig.rules.find(
      (r) =>
        r.conditions.event === event.eventId ||
        r.id === event.eventId ||
        (event.eventId === "SITE_BLOCKED_VISIT" &&
          r.conditions.event === "BLOCKED_SITE_ATTEMPT"),
    );

    if (!matchingRule) {
      console.warn(
        `[BehavioralEngine] No behavioral rule defined for event: ${event.eventId}`,
      );
      return null;
    }

    // Apply emotion deltas to EmotionsOrchestrator
    this.emotionOrchestrator.applyBehavioralData(matchingRule.emotionDeltas);

    // Delegate speech generation + memory recording to ResponseGenerator
    const response: ResponseResult =
      await this.responseGenerator.generateResponse(event, matchingRule);

    return {
      rule: matchingRule,
      speechText: response.speechText,
      responseType: response.responseType,
      emotionDeltas: matchingRule.emotionDeltas,
      rewards: matchingRule.rewards,
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
