import type { ShortTermMemory } from "./short-term-memory";
import type { LongTermMemory } from "./long-term-memory";
import type { BehavioralEngine } from "../monitoring/behavioral-engine";

export interface LLMContextOptions {
  includeShortTermEvents?: boolean;
  maxShortTermCount?: number;
  includeLongTermStats?: boolean;
  includeBehavioralRules?: boolean;
  systemDirectivePrefix?: string;
}

/**
 * MemoryContextBuilder builds flexible, clean text & JSON context payloads
 * combining ShortTermMemory, LongTermMemory, and behavioral rules for LLM prompts.
 */
export class MemoryContextBuilder {
  private shortTermMemory: ShortTermMemory;
  private longTermMemory: LongTermMemory;
  private behavioralEngine: BehavioralEngine;

  constructor(
    shortTermMemory: ShortTermMemory,
    longTermMemory: LongTermMemory,
    behavioralEngine: BehavioralEngine,
  ) {
    this.shortTermMemory = shortTermMemory;
    this.longTermMemory = longTermMemory;
    this.behavioralEngine = behavioralEngine;
  }

  /**
   * Builds a structured markdown/text block ready to be injected into an LLM System Prompt.
   */
  buildPromptContext(options: LLMContextOptions = {}): string {
    const {
      includeShortTermEvents = true,
      maxShortTermCount = 10,
      includeLongTermStats = true,
      includeBehavioralRules = true,
      systemDirectivePrefix = "You are Chleo, an AI desktop companion observing user activity.",
    } = options;

    const sections: string[] = [systemDirectivePrefix];

    // Long-Term Memory Section
    if (includeLongTermStats) {
      const ltData = this.longTermMemory.getData();
      sections.push(
        `## Long-Term Companion Memory\n` +
          `- Days Known: ${ltData.daysKnown}\n` +
          `- Total Rule Violations: ${ltData.totalViolationsCount}\n` +
          `- Total Rewards Earned: ${ltData.totalRewardsEarned}\n` +
          `- Puzzles Completed: ${ltData.totalPuzzlesCompleted}\n` +
          `- Recent Mistakes/Violations: ${ltData.pastMistakes.slice(0, 5).join("; ") || "None"}\n` +
          `- Recent Achievements: ${ltData.pastAchievements.slice(0, 5).join("; ") || "None"}`,
      );
    }

    // Short-Term Recent Events Stream Section
    if (includeShortTermEvents) {
      const recentEvents =
        this.shortTermMemory.getRecentEvents(maxShortTermCount);
      const formattedEvents = recentEvents.map(
        (e) => e.formattedText || this.shortTermMemory.formatEvent(e),
      );
      sections.push(
        `## Recent Activity History (Short-Term Log)\n` +
          (formattedEvents.length > 0
            ? formattedEvents.join("\n")
            : "No recent activity recorded."),
      );
    }

    // Behavioral Rules Section
    if (includeBehavioralRules) {
      const rules = this.behavioralEngine.getBehavioralRules();
      const activeRulesSummary = rules
        .map(
          (r) =>
            `- [${r.id}] ${r.name}: ${r.llmDirective || "Standard reaction"}`,
        )
        .join("\n");

      sections.push(`## Behavioral Guidelines\n` + activeRulesSummary);
    }

    return sections.join("\n\n");
  }

  /**
   * Export raw JSON object containing combined memory context.
   */
  buildJSONContext(options: LLMContextOptions = {}): Record<string, unknown> {
    const maxCount = options.maxShortTermCount || 10;
    return {
      longTermMemory: this.longTermMemory.getData(),
      recentShortTermEvents: this.shortTermMemory.getRecentEvents(maxCount),
      behavioralRules: this.behavioralEngine.getBehavioralRules(),
      exportedAt: new Date().toISOString(),
    };
  }
}
