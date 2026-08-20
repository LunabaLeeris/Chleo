import type { LongTermMemoryData } from "./memory-types";
import type { EmotionalState } from "../avatar/emotions/emotion-types";

export const VIOLATION_CAP = 20;
export const REWARD_CAP = 20;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * LongTermMemory manages persistence across app restarts, storing companion statistics,
 * past rule violations, rewards earned, and user relationship history.
 */
export class LongTermMemory {
  private data: LongTermMemoryData;
  private storageKey: string = "chleo_long_term_memory";
  private violationCap: number = VIOLATION_CAP;
  private rewardCap: number = REWARD_CAP;

  constructor() {
    this.data = this.getDefaultData();
    this.load();
  }

  setViolationCap(cap: number): void {
    this.violationCap = cap;
  }

  getViolationCap(): number {
    return this.violationCap;
  }

  setRewardCap(cap: number): void {
    this.rewardCap = cap;
  }

  getRewardCap(): number {
    return this.rewardCap;
  }

  private getDefaultData(): LongTermMemoryData {
    const now = Date.now();
    return {
      daysKnown: 1,
      firstSeenTimestamp: now,
      lastSeenTimestamp: now,
      totalViolationsCount: 0,
      totalRewardsEarned: 0,
      totalPuzzlesCompleted: 0,
      lastEmotionState: {
        joy: 0.2,
        trust: 0.2,
        fear: 0,
        surprise: 0,
        sadness: 0,
        disgust: 0,
        anger: 0,
        anticipation: 0.1,
      },
      pastMistakes: [],
      pastAchievements: [],
      userPreferences: {},
    };
  }

  load(): void {
    try {
      const applyData = (raw: string) => {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this.data = { ...this.getDefaultData(), ...parsed };
          this.updateDaysKnown();
        }
      };

      // Desktop Native (Electron IPC) load check
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.readMemoryFile
      ) {
        (window as any).electronAPI
          .readMemoryFile("long_term_memory.json")
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
      console.warn("[LongTermMemory] Failed to load long-term memory:", e);
    }
  }

  save(): void {
    try {
      this.data.lastSeenTimestamp = Date.now();
      const jsonStr = JSON.stringify(this.data, null, 2);

      // Desktop Native (Electron IPC) save check
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.saveMemoryFile
      ) {
        (window as any).electronAPI.saveMemoryFile(
          "long_term_memory.json",
          jsonStr,
        );
      }

      // Browser localStorage fallback
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(this.storageKey, jsonStr);
      }
    } catch (e) {
      console.warn("[LongTermMemory] Failed to save to storage:", e);
    }
  }

  private updateDaysKnown(): void {
    const diffMs = Date.now() - (this.data.firstSeenTimestamp || Date.now());
    this.data.daysKnown = Math.max(1, Math.floor(diffMs / MS_PER_DAY) + 1);
  }

  getData(): LongTermMemoryData {
    return { ...this.data };
  }

  recordViolation(description: string): void {
    this.data.totalViolationsCount += 1;
    this.data.pastMistakes.unshift(
      `[${new Date().toLocaleDateString()}] ${description}`,
    );
    if (this.data.pastMistakes.length > this.violationCap) {
      this.data.pastMistakes.pop();
    }

    this.save();
  }

  recordReward(description: string): void {
    this.data.totalRewardsEarned += 1;
    this.data.pastAchievements.unshift(
      `[${new Date().toLocaleDateString()}] ${description}`,
    );
    if (this.data.pastAchievements.length > this.rewardCap) {
      this.data.pastAchievements.pop();
    }
    this.save();
  }

  recordPuzzleCompleted(domain: string): void {
    this.data.totalPuzzlesCompleted += 1;
    // [ADD] maybe add more like how fast and all
    this.save();
  }

  updateLastEmotion(state: EmotionalState): void {
    this.data.lastEmotionState = { ...state };
    this.save();
  }

  /**
   * Ingest a batch of short-term memory event summaries into long-term memory.
   */
  ingestConsolidatedBatch(summaries: string[]): void {
    if (!summaries || summaries.length === 0) return;
    summaries.forEach((summary) => {
      if (
        summary.toLowerCase().includes("exceeded") ||
        summary.toLowerCase().includes("blocked")
      ) {
        this.recordViolation(summary);
      } else if (
        summary.toLowerCase().includes("productive") ||
        summary.toLowerCase().includes("milestone")
      ) {
        this.recordReward(summary);
      }
    });
  }

  /**
   * Export long term memory state as formatted JSON string for file storage / LLM prompt context.
   */
  exportJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import long-term memory state from a JSON string.
   */
  importJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === "object") {
        this.data = { ...this.getDefaultData(), ...parsed };
        this.updateDaysKnown();
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      console.error("[LongTermMemory] Failed to import JSON:", e);
      return false;
    }
  }

  /**
   * Trigger browser file download of long-term memory state.
   */
  downloadJSON(filename: string = "long_term_memory.json"): void {
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
   * Reset long-term memory to initial defaults.
   */
  reset(): void {
    this.data = this.getDefaultData();
    this.save();
  }
}

export const defaultLongTermMemory = new LongTermMemory();
