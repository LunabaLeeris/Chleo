import { RuleStore } from "./rule-store";
import { ShortTermMemory } from "../memory/short-term-memory";
import type { TickResult } from "./monitoring-types";

export interface ActivityTrackerListeners {
  onTick?: (activeDomain: string, spentTodaySeconds: number) => void;
}

/**
 * ActivityTracker manages the 1-second tick loop, active domain tracking,
 * and date-change detection for memory consolidation.
 */
export class ActivityTracker {
  private ruleStore: RuleStore;
  private shortTermMemory: ShortTermMemory;
  private listeners: ActivityTrackerListeners;

  private tickerInterval: number | null = null;
  private activeDomain: string = "localhost";
  private lastCheckedDate: string = new Date().toDateString();

  constructor(
    ruleStore: RuleStore,
    shortTermMemory: ShortTermMemory,
    listeners: ActivityTrackerListeners = {},
  ) {
    this.ruleStore = ruleStore;
    this.shortTermMemory = shortTermMemory;
    this.listeners = listeners;

    this.startTicker();
  }

  /**
   * Start 1-second monitoring tick loop.
   */
  startTicker(): void {
    if (this.tickerInterval !== null) return;

    this.tickerInterval = window.setInterval(() => {
      this.onTick();
    }, 1000);
  }

  stopTicker(): void {
    if (this.tickerInterval !== null) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  /**
   * Track current active domain from Chrome Extension or Simulator.
   */
  setActiveDomain(url: string): string {
    let domain = url;
    try {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        domain = new URL(url).hostname;
      }
    } catch (_) {}

    this.activeDomain = domain;
    this.shortTermMemory.setActiveDomain(domain);
    return domain;
  }

  getActiveDomain(): string {
    return this.activeDomain;
  }

  /**
   * Main 1-second tick loop evaluation.
   * Interacts with RuleStore for tick evaluation — behavioral/memory logic is handled downstream.
   */
  private async onTick(): Promise<void> {
    if (!this.activeDomain) return;

    // Check end-of-day date change for memory consolidation
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastCheckedDate) {
      this.lastCheckedDate = currentDate;
      this.shortTermMemory.consolidateToLongTermMemory("day_change");
    }

    const result: TickResult = await this.ruleStore.evaluateTick(
      this.activeDomain,
      1,
      (d) => this.shortTermMemory.isWarningActive(d),
      (d, p) => this.shortTermMemory.setWarning(d, p),
    );

    if (this.listeners.onTick) {
      this.listeners.onTick(result.domain, result.spentTodaySeconds);
    }
  }
}
