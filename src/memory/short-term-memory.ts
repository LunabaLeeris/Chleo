import type {
  ShortTermMemoryEvent,
  ActiveWarningState,
  MemoryConsolidationReason,
} from "./memory-types";
import { LongTermMemory } from "./long-term-memory";
import type { PrimaryEmotion } from "../avatar/emotions/emotion-types";

export const MAX_EVENT_HISTORY = 50;
export const MAX_RECENT_SPEECH_PHRASES = 10;

/**
 * ShortTermMemory keeps an in-memory & file/JSON rolling history of recent activities,
 * tab visits, warning states, and speech responses to prevent repetitive behavior.
 */
export class ShortTermMemory {
  private events: ShortTermMemoryEvent[] = [];
  private activeWarnings: Map<string, ActiveWarningState> = new Map();
  private recentSpeechPhrases: string[] = [];
  private currentActiveDomain: string | null = null;
  private currentDomainStartTime: number = Date.now();
  private maxEventHistory: number = MAX_EVENT_HISTORY;
  private maxRecentSpeechPhrases: number = MAX_RECENT_SPEECH_PHRASES;
  private storageKey: string = "chleo_short_term_memory_v1";

  // Easy-to-modify event template string for LLM feeding
  private eventTemplate: string = "[{time}] [{type}] {domain} - {details}";

  // Configurable list of memorable event types that trigger consolidation into LongTermMemory
  private memorableEventTypes: string[] = [
    "limit_exceeded",
    "blocked_attempt",
    "blocked_site_attempt",
    "puzzle_unblock",
    "puzzle_unblock_penalty",
    "site_blocked",
    "site_marked_productive",
    "site_unmarked_productive",
  ];

  private longTermMemory: LongTermMemory;

  constructor(longTermMemory: LongTermMemory) {
    this.longTermMemory = longTermMemory;
    this.load();
  }

  /**
   * Set custom template string for event formatting.
   * Placeholders supported: {time}, {timestamp}, {type}, {domain}, {details}
   */
  setEventTemplate(template: string): void {
    this.eventTemplate = template;
  }

  getEventTemplate(): string {
    return this.eventTemplate;
  }

  /**
   * Set configurable memorable event types triggering long term consolidation.
   */
  setMemorableEventTypes(types: string[]): void {
    this.memorableEventTypes = types;
  }

  getMemorableEventTypes(): string[] {
    return [...this.memorableEventTypes];
  }

  setMaxEventHistory(max: number): void {
    this.maxEventHistory = max;
  }

  getMaxEventHistory(): number {
    return this.maxEventHistory;
  }

  /**
   * Save short-term memory state to storage (Desktop file I/O or browser localStorage).
   */
  save(): void {
    try {
      const payload = {
        events: this.events,
        recentSpeechPhrases: this.recentSpeechPhrases,
        activeWarnings: Array.from(this.activeWarnings.entries()),
        currentActiveDomain: this.currentActiveDomain,
        eventTemplate: this.eventTemplate,
        memorableEventTypes: this.memorableEventTypes,
      };
      const jsonStr = JSON.stringify(payload, null, 2);

      // Desktop Native (Electron IPC) save check
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.saveMemoryFile
      ) {
        (window as any).electronAPI.saveMemoryFile(
          "short_term_memory.json",
          jsonStr,
        );
      }

      // Browser localStorage backup/fallback
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(this.storageKey, jsonStr);
      }
    } catch (e) {
      console.warn("[ShortTermMemory] Failed to save to storage:", e);
    }
  }

  /**
   * Load short-term memory state from storage (Desktop file I/O or browser localStorage).
   */
  load(): void {
    try {
      const applyData = (raw: string) => {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.events)) this.events = parsed.events;
        if (Array.isArray(parsed.recentSpeechPhrases))
          this.recentSpeechPhrases = parsed.recentSpeechPhrases;
        if (Array.isArray(parsed.activeWarnings)) {
          this.activeWarnings = new Map(parsed.activeWarnings);
        }
        if (parsed.currentActiveDomain)
          this.currentActiveDomain = parsed.currentActiveDomain;
        if (parsed.eventTemplate) this.eventTemplate = parsed.eventTemplate;
        if (Array.isArray(parsed.memorableEventTypes))
          this.memorableEventTypes = parsed.memorableEventTypes;
      };

      // Desktop Native (Electron IPC) check
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.readMemoryFile
      ) {
        (window as any).electronAPI
          .readMemoryFile("short_term_memory.json")
          .then((raw: string | null) => {
            if (raw) {
              applyData(raw);
            } else if (window.localStorage) {
              const localRaw = window.localStorage.getItem(this.storageKey);
              if (localRaw) applyData(localRaw);
            }
          });
        return;
      }

      // Browser localStorage fallback
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) applyData(raw);
      }
    } catch (e) {
      console.warn("[ShortTermMemory] Failed to load from storage:", e);
    }
  }

  /**
   * Format a ShortTermMemoryEvent into a human/LLM readable string.
   */
  formatEvent(event: ShortTermMemoryEvent, customTemplate?: string): string {
    const template = customTemplate || this.eventTemplate;
    const timeStr = new Date(event.timestamp).toLocaleTimeString();
    return template
      .replace(/\{time\}/g, timeStr)
      .replace(/\{timestamp\}/g, event.timestamp.toString())
      .replace(/\{type\}/g, event.type.toUpperCase())
      .replace(/\{domain\}/g, event.domain || "general")
      .replace(/\{details\}/g, event.details);
  }

  /**
   * Record a short-term activity event.
   */
  recordEvent(
    event: Omit<ShortTermMemoryEvent, "id" | "timestamp">,
  ): ShortTermMemoryEvent {
    const timestamp = Date.now();
    const tempEvent: ShortTermMemoryEvent = {
      ...event,
      id: `stm_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp,
    };

    tempEvent.formattedText = this.formatEvent(tempEvent);

    this.events.unshift(tempEvent);
    if (this.events.length > this.maxEventHistory) {
      this.events.pop();
    }

    this.save();

    // Auto-check if this is a memorable event and write to long term memory without resetting STM
    if (this.memorableEventTypes.includes(event.type.toLowerCase())) {
      this.recordMemorableEventToLongTerm(tempEvent);
    }

    return tempEvent;
  }

  /**
   * Directly write a memorable memory event to long-term memory with a memorable mark,
   * without resetting active short-term memory events.
   */
  recordMemorableEventToLongTerm(event: ShortTermMemoryEvent): void {
    const text = event.formattedText || this.formatEvent(event);
    const markedSummary = `[MEMORABLE] ${text}`;
    this.longTermMemory.ingestConsolidatedBatch([markedSummary]);
    console.log(
      `[ShortTermMemory] Logged memorable event to LongTermMemory without resetting STM: ${markedSummary}`,
    );
  }

  /**
   * Consolidate short-term memory events into long-term memory.
   */
  consolidateToLongTermMemory(reason: MemoryConsolidationReason): void {
    if (this.events.length === 0) return;

    const summaries = this.events.map(
      (e) => e.formattedText || this.formatEvent(e),
    );
    this.longTermMemory.ingestConsolidatedBatch(summaries);

    console.log(
      `[ShortTermMemory] Consolidated ${summaries.length} events to LongTermMemory (Reason: ${reason})`,
    );

    // Reset/clear active event log after consolidation to prevent duplication
    this.events = [];
    this.save();
  }

  /**
   * Export active short term memory as JSON string.
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        events: this.events,
        recentSpeechPhrases: this.recentSpeechPhrases,
        activeWarnings: Array.from(this.activeWarnings.entries()),
        currentActiveDomain: this.currentActiveDomain,
        eventTemplate: this.eventTemplate,
        memorableEventTypes: this.memorableEventTypes,
      },
      null,
      2,
    );
  }

  /**
   * Import short-term memory from a JSON string (for disk upload/restore).
   */
  importJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.events)) this.events = parsed.events;
      if (Array.isArray(parsed.recentSpeechPhrases))
        this.recentSpeechPhrases = parsed.recentSpeechPhrases;
      if (Array.isArray(parsed.activeWarnings)) {
        this.activeWarnings = new Map(parsed.activeWarnings);
      }
      if (parsed.currentActiveDomain)
        this.currentActiveDomain = parsed.currentActiveDomain;
      if (parsed.eventTemplate) this.eventTemplate = parsed.eventTemplate;
      if (Array.isArray(parsed.memorableEventTypes))
        this.memorableEventTypes = parsed.memorableEventTypes;
      this.save();
      return true;
    } catch (e) {
      console.error("[ShortTermMemory] Failed to import JSON:", e);
      return false;
    }
  }

  /**
   * Trigger browser file download of short-term memory state.
   */
  downloadJSON(filename: string = "short_term_memory.json"): void {
    if (typeof window === "undefined") return;
    const jsonStr = this.exportJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get all events.
   */
  getAllEvents(): ShortTermMemoryEvent[] {
    return [...this.events];
  }

  /**
   * Get all recent events (newest first).
   */
  getRecentEvents(limit: number = 20): ShortTermMemoryEvent[] {
    return this.events.slice(0, limit);
  }

  /**
   * Update active domain and return time spent on previous domain in ms.
   */
  setActiveDomain(domain: string): {
    previousDomain: string | null;
    timeSpentMs: number;
  } {
    const now = Date.now();
    const previousDomain = this.currentActiveDomain;
    const timeSpentMs = previousDomain ? now - this.currentDomainStartTime : 0;

    this.currentActiveDomain = domain;
    this.currentDomainStartTime = now;

    return { previousDomain, timeSpentMs };
  }

  getCurrentActiveDomain(): string | null {
    return this.currentActiveDomain;
  }

  /**
   * Warning states tracking.
   */
  setWarning(domain: string, percentSpent: number): void {
    this.activeWarnings.set(domain, {
      domain,
      warnedAt: Date.now(),
      percentSpent,
    });
    this.save();
  }

  clearWarning(domain: string): void {
    this.activeWarnings.delete(domain);
    this.save();
  }

  isWarningActive(domain: string): boolean {
    return this.activeWarnings.has(domain);
  }

  /**
   * Recent speech tracking to prevent repetitive dialogue.
   */
  recordSpeech(phrase: string): void {
    this.recentSpeechPhrases.unshift(phrase);
    if (this.recentSpeechPhrases.length > this.maxRecentSpeechPhrases) {
      this.recentSpeechPhrases.pop();
    }
    this.save();
  }

  wasPhraseRecentlySaid(phrase: string): boolean {
    return this.recentSpeechPhrases.includes(phrase);
  }

  /**
   * Clear short-term memory session data.
   */
  clear(): void {
    this.events = [];
    this.activeWarnings.clear();
    this.recentSpeechPhrases = [];
    this.currentActiveDomain = null;
    this.save();
  }
}
