import { ShortTermMemory } from '../memory/short-term-memory';
import { LLMService } from './llm-service';
import type { MonitoringEventPayload } from './monitoring-types';
import type { BehavioralRule } from './behavioral-engine';
import type { ResponseType } from '../avatar/emotions/emotion-types';

export interface ResponseResult {
  speechText: string;
  responseType: ResponseType;
}

export function cleanDomainName(rawDomain: string): string {
  if (!rawDomain) return 'this site';
  let cleaned = String(rawDomain).trim().toLowerCase();
  // Remove protocol if present
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  // Remove port or path/query
  cleaned = cleaned.split('/')[0].split(':')[0];
  // Remove leading www. or m.
  cleaned = cleaned.replace(/^(www\d?|m)\./i, '');

  // Extract base domain name without extension:
  const parts = cleaned.split('.').filter(Boolean);
  if (parts.length >= 2) {
    const knownShortSLD = ['co', 'com', 'org', 'net', 'edu', 'gov'];
    if (parts.length >= 3 && knownShortSLD.includes(parts[parts.length - 2])) {
      return parts[parts.length - 3] || parts[0];
    }
    return parts[parts.length - 2] || parts[0];
  }
  return cleaned || 'this site';
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

  getShortTermMemory(): ShortTermMemory {
    return this.shortTermMemory;
  }

  /**
   * Generate a speech response for the given event and behavioral rule.
   * Records the event and speech into ShortTermMemory.
   */
  async generateResponse(
    event: MonitoringEventPayload,
    rule: BehavioralRule
  ): Promise<ResponseResult> {
    // Try LLM first
    // COMPOSE memory context and place it in memory context 
    const memoryContext = "";
    const llmResult = await this.llmService.generate(event, rule.llmDirective, memoryContext);

    let speechText: string;
    let responseType: ResponseType;

    if (llmResult) {
      speechText = llmResult.text;
      responseType = llmResult.responseType;
    } else {
      // Fallback to heuristic template interpolation
      speechText = this.interpolateTemplate(rule.heuristicTemplates, event);
      responseType = 'exclamatory';
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

  private interpolateTemplate(templates: string[], event: MonitoringEventPayload): string {
    const displayDomain = cleanDomainName(event.domain);

    if (!templates || templates.length === 0) {
      return event.message || `Activity event on ${displayDomain}`;
    }

    // Pick template randomly to prevent repetitive phrasing
    const idx = Math.floor(Math.random() * templates.length);
    const template = templates[idx];

    const timeSpentFormatted =
      event.timeSpentSeconds >= 60
        ? `${Math.floor(event.timeSpentSeconds / 60)}m`
        : `${event.timeSpentSeconds}s`;

    return template
      .replace(/\{domain\}/g, displayDomain)
      .replace(/\{percent\}/g, Math.round(event.percentSpent).toString())
      .replace(/\{remainingSeconds\}/g, Math.round(event.remainingSeconds).toString())
      .replace(/\{limit\}/g, Math.round(event.limitSeconds / 60).toString())
      .replace(/\{timeSpent\}/g, timeSpentFormatted)
      .replace(/\{coins\}/g, '50');
  }
}
