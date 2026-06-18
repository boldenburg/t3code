import { describe, expect, it } from "vite-plus/test";
import { EventId, type OrchestrationThreadActivity, TurnId } from "@t3tools/contracts";

import {
  deriveContextRemainingPercentages,
  deriveLatestContextWindowSnapshot,
  formatContextWindowTokens,
} from "./contextWindow";

function makeActivity(id: string, kind: string, payload: unknown): OrchestrationThreadActivity {
  return {
    id: EventId.make(id),
    tone: "info",
    kind,
    summary: kind,
    payload,
    turnId: TurnId.make("turn-1"),
    createdAt: "2026-03-23T00:00:00.000Z",
  };
}

describe("contextWindow", () => {
  it("derives the latest valid context window snapshot", () => {
    const snapshot = deriveLatestContextWindowSnapshot([
      makeActivity("activity-1", "context-window.updated", {
        usedTokens: 1000,
      }),
      makeActivity("activity-2", "tool.started", {}),
      makeActivity("activity-3", "context-window.updated", {
        usedTokens: 14_000,
        maxTokens: 258_000,
        compactsAutomatically: true,
      }),
    ]);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.usedTokens).toBe(14_000);
    expect(snapshot?.totalProcessedTokens).toBeNull();
    expect(snapshot?.maxTokens).toBe(258_000);
    expect(snapshot?.compactsAutomatically).toBe(true);
  });

  it("ignores malformed payloads", () => {
    const snapshot = deriveLatestContextWindowSnapshot([
      makeActivity("activity-1", "context-window.updated", {}),
    ]);

    expect(snapshot).toBeNull();
  });

  it("keeps valid zero-usage snapshots", () => {
    const snapshot = deriveLatestContextWindowSnapshot([
      makeActivity("activity-1", "context-window.updated", {
        usedTokens: 0,
        maxTokens: 100_000,
      }),
    ]);

    expect(snapshot).toMatchObject({
      usedTokens: 0,
      maxTokens: 100_000,
      remainingTokens: 100_000,
      usedPercentage: 0,
      remainingPercentage: 100,
    });
  });

  it("formats compact token counts", () => {
    expect(formatContextWindowTokens(999)).toBe("999");
    expect(formatContextWindowTokens(1400)).toBe("1.4k");
    expect(formatContextWindowTokens(14_000)).toBe("14k");
    expect(formatContextWindowTokens(258_000)).toBe("258k");
  });

  it("includes total processed tokens when available", () => {
    const snapshot = deriveLatestContextWindowSnapshot([
      makeActivity("activity-1", "context-window.updated", {
        usedTokens: 81_659,
        totalProcessedTokens: 748_126,
        maxTokens: 258_400,
        lastUsedTokens: 81_659,
      }),
    ]);

    expect(snapshot?.usedTokens).toBe(81_659);
    expect(snapshot?.totalProcessedTokens).toBe(748_126);
  });

  it("derives explicit remaining percentages from Codex rate limits and context window", () => {
    const snapshot = deriveContextRemainingPercentages([
      makeActivity("activity-1", "account-rate-limits.updated", {
        rateLimits: {
          rateLimits: {
            primary: { usedPercent: 26, resetsAt: 1_766_000_000, windowDurationMins: 10_080 },
            secondary: { usedPercent: 69, resetsAt: 1_765_000_000, windowDurationMins: 300 },
          },
        },
      }),
      makeActivity("activity-2", "context-window.updated", {
        usedTokens: 18,
        maxTokens: 100,
      }),
    ]);

    expect(snapshot).toMatchObject({
      weeklyRemainingPercentage: 74,
      fiveHourRemainingPercentage: 31,
      currentWindowRemainingPercentage: 82,
      weeklyRateLimit: {
        usedPercentage: 26,
        remainingPercentage: 74,
        resetsAt: 1_766_000_000,
        windowDurationMins: 10_080,
      },
      fiveHourRateLimit: {
        usedPercentage: 69,
        remainingPercentage: 31,
        resetsAt: 1_765_000_000,
        windowDurationMins: 300,
      },
      currentWindow: {
        usedTokens: 18,
        maxTokens: 100,
      },
    });
  });

  it("prefers Codex limit-id snapshots over the legacy rateLimits snapshot", () => {
    expect(
      deriveContextRemainingPercentages([
        makeActivity("activity-1", "account-rate-limits.updated", {
          rateLimits: {
            rateLimits: {
              primary: { usedPercent: 99, windowDurationMins: 10_080 },
              secondary: { usedPercent: 99, windowDurationMins: 300 },
            },
            rateLimitsByLimitId: {
              codex: {
                primary: { usedPercent: 20, windowDurationMins: 10_080 },
                secondary: { usedPercent: 40, windowDurationMins: 300 },
              },
            },
          },
        }),
      ]),
    ).toMatchObject({
      weeklyRemainingPercentage: 80,
      fiveHourRemainingPercentage: 60,
    });
  });

  it("keeps older known rate-limit values when newer updates are sparse", () => {
    expect(
      deriveContextRemainingPercentages([
        makeActivity("activity-1", "account-rate-limits.updated", {
          rateLimits: {
            primary: { usedPercent: 45, windowDurationMins: 10_080 },
            secondary: { usedPercent: 70, windowDurationMins: 300 },
          },
        }),
        makeActivity("activity-2", "account-rate-limits.updated", {
          rateLimits: {
            secondary: { usedPercent: 25, windowDurationMins: 300 },
          },
        }),
      ]),
    ).toMatchObject({
      weeklyRemainingPercentage: 55,
      fiveHourRemainingPercentage: 75,
    });
  });

  it("ignores malformed windows and clamps remaining percentages", () => {
    expect(
      deriveContextRemainingPercentages([
        makeActivity("activity-1", "account-rate-limits.updated", {
          rateLimits: {
            primary: { usedPercent: 110, windowDurationMins: 10_080 },
            secondary: { usedPercent: -5, windowDurationMins: 300 },
          },
        }),
        makeActivity("activity-2", "account-rate-limits.updated", {
          rateLimits: {
            primary: { usedPercent: "70", windowDurationMins: 10_080 },
          },
        }),
      ]),
    ).toMatchObject({
      weeklyRemainingPercentage: 0,
      fiveHourRemainingPercentage: 100,
    });
  });
});
