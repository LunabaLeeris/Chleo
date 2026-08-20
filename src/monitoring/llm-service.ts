import type { LLMEmotionOutput } from "../avatar/emotions/emotion-types";
import type { MonitoringEventPayload } from "./monitoring-types";

/**
 * LLMService is a scaffolded stub for future LLM API integration (Gemini, OpenAI, etc).
 * For now, generate() returns null so the ResponseGenerator falls back to heuristic templates.
 *
 * When implemented, this service will:
 * - Accept the event payload, behavioral directive, and memory context
 * - Call an LLM API to generate dynamic speech, response type, and emotion adjustments
 * - Return a structured LLMEmotionOutput
 */
export class LLMService {
  /**
   * Generate a response using an LLM.
   * Returns null to signal fallback to heuristic template interpolation.
   */
  async generate(
    _event: MonitoringEventPayload,
    _directive: string,
    _memoryContext?: string,
  ): Promise<LLMEmotionOutput | null> {
    // TODO: Implement LLM API call here
    // Example future implementation:
    // const response = await fetch('https://api.openai.com/...', { ... });
    // return { text: response.text, responseType: 'declarative', behavioralData: { ... } };
    return null;
  }
}
