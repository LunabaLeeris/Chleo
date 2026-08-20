import { ShortTermMemory } from "../memory/short-term-memory";
import { LLMService } from "./llm-service";
import type { MonitoringEventPayload } from "./monitoring-types";
import type { BehavioralRule } from "./behavioral-engine";
import type { ResponseType } from "../avatar/emotions/emotion-types";

export interface ResponseResult {
  speechText: string;
  responseType: ResponseType;
}

/**
 * ResponseGenerator produces speech text for behavioral reactions.
 * Tries LLM first, falls back to heuristic template interpolation.
 * Records the finalized event and speech into ShortTermMemory.
 */
export class ResponseGenerator {
  private shortTermMemory: ShortTermMemory;
  private llmService: LLMService;

  constructor(shortTermMemory: ShortTermMemory, llmService: LLMService) {
    this.shortTermMemory = shortTermMemory;
    this.llmService = llmService;
  }

  /**
   * Generate a speech response for the given event and behavioral rule.
   * Records the event and speech into ShortTermMemory.
   */
  async generateResponse(
    event: MonitoringEventPayload,
    rule: BehavioralRule,
  ): Promise<ResponseResult> {
    // Try LLM first
    // COMPOSE memory context and place it in memory context
    const memoryContext: string = "";
    const llmResult = await this.llmService.generate(
      event,
      rule.llmDirective,
      memoryContext,
    );

    let speechText: string;
    let responseType: ResponseType;

    if (llmResult) {
      speechText = llmResult.text;
      responseType = llmResult.responseType;
    } else {
      // Fallback to heuristic template interpolation
      speechText = this.interpolateTemplate(rule.heuristicTemplates, event);
      responseType = "exclamatory";
    }

    // Record in Short-Term Memory
    this.shortTermMemory.recordEvent({
      type: event.eventId.toLowerCase(),
      domain: event.domain,
      details: speechText,
      emotionDelta: rule.emotionDeltas,
    });
    this.shortTermMemory.recordSpeech(speechText);

    return { speechText, responseType };
  }

  private interpolateTemplate(
    templates: string[],
    event: MonitoringEventPayload,
  ): string {
    if (!templates || templates.length === 0) {
      return event.message || `Activity event on ${event.domain}`;
    }

    // Pick template randomly to prevent repetitive phrasing
    const idx = Math.floor(Math.random() * templates.length);
    let template = templates[idx];

    const timeSpentFormatted =
      event.timeSpentSeconds >= 60
        ? `${Math.floor(event.timeSpentSeconds / 60)}m`
        : `${event.timeSpentSeconds}s`;

    return template
      .replace(/\{domain\}/g, event.domain || "this site")
      .replace(/\{percent\}/g, Math.round(event.percentSpent).toString())
      .replace(
        /\{remainingSeconds\}/g,
        Math.round(event.remainingSeconds).toString(),
      )
      .replace(/\{limit\}/g, Math.round(event.limitSeconds / 60).toString())
      .replace(/\{timeSpent\}/g, timeSpentFormatted)
      .replace(/\{coins\}/g, "50");
  }
}
