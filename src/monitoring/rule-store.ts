import type {
  SiteRule,
  SiteType,
  MonitoringConfig,
  MonitoringEventPayload,
  TickResult,
} from "./monitoring-types";
import { BehavioralEngine } from "./behavioral-engine";
import defaultActivityRules from "./config/activity-rules.json";
import { parseMonitoringCommand, ParsedCommand } from "./command-parser";

export interface RuleStoreListeners {
  onEventTriggered?: (
    payload: MonitoringEventPayload,
    speechText: string,
  ) => void;
  onRuleChanged?: () => void;
}

/**
 * RuleStore manages site rules only: reading, writing, and updating domain rules
 * at runtime. Delegates behavioral reactions to BehavioralEngine.
 */
//[ADD] rules should be saved and loaded for persistence
export class RuleStore {
  private activityConfig: MonitoringConfig;
  private behavioralEngine: BehavioralEngine;
  private storageKeyActivity = "chleo_activity_rules_v1";
  private cumulativeProductiveSeconds: number = 0;
  private listeners?: RuleStoreListeners;

  constructor(
    behavioralEngine: BehavioralEngine,
    listeners?: RuleStoreListeners,
  ) {
    this.behavioralEngine = behavioralEngine;
    this.activityConfig = this.loadActivityConfig();
    this.listeners = listeners;
  }

  setListeners(listeners?: RuleStoreListeners): void {
    this.listeners = listeners;
  }

  private loadActivityConfig(): MonitoringConfig {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKeyActivity);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(
        "[RuleStore] Failed to load activity rules from storage:",
        e,
      );
    }
    return JSON.parse(JSON.stringify(defaultActivityRules)) as MonitoringConfig;
  }

  saveActivityConfig(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          this.storageKeyActivity,
          JSON.stringify(this.activityConfig),
        );
      }
    } catch (e) {
      console.warn("[RuleStore] Failed to save activity rules:", e);
    }
  }

  // --- Site Rules Methods ---

  getSiteRules(): SiteRule[] {
    return this.activityConfig.rules;
  }

  findRuleForDomain(domain: string): SiteRule | undefined {
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0];
    return this.activityConfig.rules.find((r) => {
      const cleanRuleDomain = r.domain
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .split("/")[0];
      return (
        cleanDomain === cleanRuleDomain ||
        cleanDomain.endsWith("." + cleanRuleDomain)
      );
    });
  }

  async setBlockSite(
    domain: string,
    useThisRule?: SiteRule,
    options?: { skipEvent?: boolean },
  ): Promise<SiteRule> {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: "blocked",
        dailyLimitSeconds: 0,
        spentTodaySeconds: 0,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: true,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = "blocked";
      rule.requiresPuzzleToUnblock = true;
    }
    this.saveActivityConfig();

    if (!options?.skipEvent) {
      const payload: MonitoringEventPayload = {
        eventId: "SITE_BLOCKED",
        domain,
        timeSpentSeconds: rule.spentTodaySeconds,
        limitSeconds: rule.dailyLimitSeconds,
        percentSpent: 100,
        remainingSeconds: 0,
        siteType: "blocked",
      };
      const result = await this.behavioralEngine.processEvent(payload);
      if (result && this.listeners?.onEventTriggered) {
        this.listeners.onEventTriggered(payload, result.speechText);
      }
      if (this.listeners?.onRuleChanged) {
        this.listeners.onRuleChanged();
      }
    }

    return rule;
  }

  async setUnblockSite(
    domain: string,
    useThisRule?: SiteRule,
    options?: { skipEvent?: boolean },
  ): Promise<SiteRule> {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: "neutral",
        dailyLimitSeconds: 0,
        spentTodaySeconds: 0,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = "neutral";
      rule.requiresPuzzleToUnblock = false;
    }
    this.saveActivityConfig();

    if (!options?.skipEvent) {
      const payload: MonitoringEventPayload = {
        eventId: "PUZZLE_UNBLOCK_PENALTY",
        domain,
        timeSpentSeconds: rule.spentTodaySeconds,
        limitSeconds: rule.dailyLimitSeconds,
        percentSpent: 0,
        remainingSeconds: 0,
        siteType: "neutral",
      };
      const result = await this.behavioralEngine.processEvent(payload);
      if (result && this.listeners?.onEventTriggered) {
        this.listeners.onEventTriggered(payload, result.speechText);
      }
      if (this.listeners?.onRuleChanged) {
        this.listeners.onRuleChanged();
      }
    }

    return rule;
  }

  setSiteLimit(
    domain: string,
    dailyLimitSeconds: number,
    useThisRule?: SiteRule,
  ): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: "avoid",
        dailyLimitSeconds,
        spentTodaySeconds: 0,
        warningThresholdPercent: 75,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = "avoid";
      rule.dailyLimitSeconds = dailyLimitSeconds;
      rule.spentTodaySeconds = 0; // reset for new limit testing
    }
    this.saveActivityConfig();
    if (this.listeners?.onRuleChanged) {
      this.listeners.onRuleChanged();
    }
    return rule;
  }

  async setSiteProductive(
    domain: string,
    isProductive: boolean,
    useThisRule?: SiteRule,
    options?: { skipEvent?: boolean },
  ): Promise<SiteRule> {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: isProductive ? "productive" : "neutral",
        dailyLimitSeconds: 0,
        spentTodaySeconds: 0,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.type = isProductive ? "productive" : "neutral";
    }
    this.saveActivityConfig();

    if (!options?.skipEvent) {
      const eventId = isProductive
        ? "SITE_MARKED_PRODUCTIVE"
        : "SITE_UNMARKED_PRODUCTIVE";
      const payload: MonitoringEventPayload = {
        eventId,
        domain,
        timeSpentSeconds: rule.spentTodaySeconds,
        limitSeconds: rule.dailyLimitSeconds,
        percentSpent: 0,
        remainingSeconds: 0,
        siteType: isProductive ? "productive" : "neutral",
      };
      const result = await this.behavioralEngine.processEvent(payload);
      if (result && this.listeners?.onEventTriggered) {
        this.listeners.onEventTriggered(payload, result.speechText);
      }
      if (this.listeners?.onRuleChanged) {
        this.listeners.onRuleChanged();
      }
    }

    return rule;
  }

  updateSpentTime(
    domain: string,
    deltaSeconds: number,
    useThisRule?: SiteRule,
  ): SiteRule {
    let rule = useThisRule ? useThisRule : this.findRuleForDomain(domain);
    if (!rule) {
      rule = {
        domain,
        type: "neutral",
        dailyLimitSeconds: 0,
        spentTodaySeconds: deltaSeconds,
        warningThresholdPercent: 80,
        requiresPuzzleToUnblock: false,
      };
      this.activityConfig.rules.push(rule);
    } else {
      rule.spentTodaySeconds += deltaSeconds;
    }

    this.saveActivityConfig();
    return rule;
  }

  getProductiveRewardIntervalSeconds(): number {
    return this.activityConfig.productiveRewardIntervalSeconds;
  }

  setProductiveRewardIntervalSeconds(seconds: number): void {
    this.activityConfig.productiveRewardIntervalSeconds = seconds;
    this.saveActivityConfig();
  }

  // --- Tick Evaluation (moved from ActivityTracker.onTick) ---

  /**
   * Evaluate a single tick for the given domain. Handles rule lookup,
   * time increment, warning/exceeded/milestone checks, and behavioral reactions.
   */
  async evaluateTick(
    domain: string,
    deltaSeconds: number,
    isWarningActive: (d: string) => boolean,
    setWarning: (d: string, percent: number) => void,
  ): Promise<TickResult> {
    let rule = this.findRuleForDomain(domain);

    // Blocked: don't increment time
    if (rule && rule.type === "blocked") {
      return {
        domain,
        spentTodaySeconds: rule.spentTodaySeconds,
        isBlocked: true,
        ruleChanged: false,
      };
    }

    // Increment spent time
    rule = this.updateSpentTime(domain, deltaSeconds, rule);

    if (!rule) {
      return {
        domain,
        spentTodaySeconds: 0,
        isBlocked: false,
        ruleChanged: false,
      };
    }

    // Avoid: check warning/exceeded
    if (rule.type === "avoid" && rule.dailyLimitSeconds > 0) {
      const spent = rule.spentTodaySeconds;
      const limit = rule.dailyLimitSeconds;
      const percent = (spent / limit) * 100;
      const remaining = Math.max(0, limit - spent);

      // Exceeded
      if (spent >= limit) {
        rule = await this.setBlockSite(domain, rule, { skipEvent: true });

        const payload: MonitoringEventPayload = {
          eventId: "LIMIT_EXCEEDED",
          domain,
          timeSpentSeconds: spent,
          limitSeconds: limit,
          percentSpent: 100,
          remainingSeconds: 0,
          siteType: "blocked",
        };

        const result = await this.behavioralEngine.processEvent(payload);
        if (result && this.listeners?.onEventTriggered) {
          this.listeners.onEventTriggered(payload, result.speechText);
        }
        if (this.listeners?.onRuleChanged) {
          this.listeners.onRuleChanged();
        }
        return {
          domain,
          spentTodaySeconds: spent,
          isBlocked: true,
          ruleChanged: true,
          reaction: result
            ? { payload, speechText: result.speechText }
            : undefined,
        };
      }

      // Warning threshold
      if (percent >= rule.warningThresholdPercent && !isWarningActive(domain)) {
        setWarning(domain, percent);

        const payload: MonitoringEventPayload = {
          eventId: "LIMIT_WARNING",
          domain,
          timeSpentSeconds: spent,
          limitSeconds: limit,
          percentSpent: remaining,
          remainingSeconds: remaining,
          siteType: "avoid",
        };

        const result = await this.behavioralEngine.processEvent(payload);
        if (result && this.listeners?.onEventTriggered) {
          this.listeners.onEventTriggered(payload, result.speechText);
        }
        return {
          domain,
          spentTodaySeconds: spent,
          isBlocked: false,
          ruleChanged: false,
          reaction: result
            ? { payload, speechText: result.speechText }
            : undefined,
        };
      }
    }

    // Productive: check milestone
    if (rule.type === "productive") {
      this.cumulativeProductiveSeconds += deltaSeconds;
      const rewardInterval = this.getProductiveRewardIntervalSeconds();

      if (
        this.cumulativeProductiveSeconds > 0 &&
        this.cumulativeProductiveSeconds % rewardInterval === 0
      ) {
        const payload: MonitoringEventPayload = {
          eventId: "PRODUCTIVE_MILESTONE",
          domain,
          timeSpentSeconds: this.cumulativeProductiveSeconds,
          limitSeconds: rewardInterval,
          percentSpent: 100,
          remainingSeconds: 0,
          siteType: "productive",
        };

        const result = await this.behavioralEngine.processEvent(payload);
        if (result && this.listeners?.onEventTriggered) {
          this.listeners.onEventTriggered(payload, result.speechText);
        }
        return {
          domain,
          spentTodaySeconds: rule.spentTodaySeconds,
          isBlocked: false,
          ruleChanged: false,
          reaction: result
            ? { payload, speechText: result.speechText }
            : undefined,
        };
      }
    }

    return {
      domain,
      spentTodaySeconds: rule.spentTodaySeconds,
      isBlocked: false,
      ruleChanged: false,
    };
  }

  /**
   * Evaluate a site visit.
   */
  async evaluateVisit(domain: string): Promise<TickResult> {
    const rule = this.findRuleForDomain(domain);

    if (rule && rule.type === "blocked") {
      const payload: MonitoringEventPayload = {
        eventId: "SITE_BLOCKED_VISIT",
        domain,
        timeSpentSeconds: rule.spentTodaySeconds,
        limitSeconds: rule.dailyLimitSeconds,
        percentSpent: 100,
        remainingSeconds: 0,
        siteType: "blocked",
      };

      const result = await this.behavioralEngine.processEvent(payload);
      if (result && this.listeners?.onEventTriggered) {
        this.listeners.onEventTriggered(payload, result.speechText);
      }
      return {
        domain,
        spentTodaySeconds: rule.spentTodaySeconds,
        isBlocked: true,
        ruleChanged: false,
        reaction: result
          ? { payload, speechText: result.speechText }
          : undefined,
      };
    }

    return {
      domain,
      spentTodaySeconds: rule?.spentTodaySeconds || 0,
      isBlocked: false,
      ruleChanged: false,
    };
  }

  /**
   * Evaluate puzzle unblock.
   */
  async evaluatePuzzleUnblock(domain: string): Promise<TickResult> {
    const rule = await this.setUnblockSite(domain, undefined, {
      skipEvent: true,
    });

    const payload: MonitoringEventPayload = {
      eventId: "PUZZLE_UNBLOCK_PENALTY",
      domain,
      timeSpentSeconds: rule.spentTodaySeconds,
      limitSeconds: rule.dailyLimitSeconds,
      percentSpent: 0,
      remainingSeconds: 0,
      siteType: "neutral",
    };

    const result = await this.behavioralEngine.processEvent(payload);
    if (result && this.listeners?.onEventTriggered) {
      this.listeners.onEventTriggered(payload, result.speechText);
    }
    if (this.listeners?.onRuleChanged) {
      this.listeners.onRuleChanged();
    }

    return {
      domain,
      spentTodaySeconds: rule.spentTodaySeconds,
      isBlocked: false,
      ruleChanged: true,
      reaction: result ? { payload, speechText: result.speechText } : undefined,
    };
  }

  /**
   * Process natural language text commands (e.g. "block facebook.com", "limit youtube.com to 1 min").
   */
  async processCommand(
    textCommand: string,
  ): Promise<{ parsed: ParsedCommand; responseText: string }> {
    const parsed = parseMonitoringCommand(textCommand);
    let responseText = "";

    switch (parsed.action) {
      case "BLOCK": {
        if (parsed.domain) {
          await this.setBlockSite(parsed.domain);
          responseText = `Okay, I have completely blocked ${parsed.domain}!`;
        }
        break;
      }

      case "UNBLOCK": {
        if (parsed.domain) {
          responseText = `To unblock ${parsed.domain}, you must finish my puzzle challenge! Click the puzzle unblock button below.`;
        }
        break;
      }

      case "LIMIT": {
        if (parsed.domain && parsed.seconds) {
          this.setSiteLimit(parsed.domain, parsed.seconds);
          const formatted =
            parsed.seconds >= 60
              ? `${Math.round(parsed.seconds / 60)} minutes`
              : `${parsed.seconds} seconds`;
          responseText = `Got it! Set a daily limit of ${formatted} for ${parsed.domain}.`;
        }
        break;
      }

      case "MARK_PRODUCTIVE": {
        if (parsed.domain) {
          await this.setSiteProductive(parsed.domain, true);
          responseText = `Marked ${parsed.domain} as productive! You will earn rewards for staying focused there.`;
        }
        break;
      }

      case "UNMARK_PRODUCTIVE": {
        if (parsed.domain) {
          await this.setSiteProductive(parsed.domain, false);
          responseText = `Removed ${parsed.domain} from productive sites.`;
        }
        break;
      }

      default: {
        responseText = `I didn't understand that monitoring command. Try: 'block twitter.com', 'limit youtube.com to 1 minute', or 'mark github.com productive'.`;
      }
    }

    if (this.listeners?.onRuleChanged) this.listeners.onRuleChanged();

    return { parsed, responseText };
  }

  /**
   * Trigger day-change consolidation through the behavioral engine's chain.
   */
  triggerDayChangeConsolidation(): void {
    // Reach into the chain: BehavioralEngine → ResponseGenerator → ShortTermMemory → LTM
    // For now, we expose this as a pass-through. The ShortTermMemory handles consolidation internally.
    // This is called by ActivityTracker when a date change is detected.
    console.log("[RuleStore] Day change consolidation triggered via chain");
  }

  getBehavioralEngine(): BehavioralEngine {
    return this.behavioralEngine;
  }

  resetAllRules(): void {
    this.activityConfig = JSON.parse(JSON.stringify(defaultActivityRules));
    this.saveActivityConfig();
    this.behavioralEngine.resetBehavioralRules();
  }
}
