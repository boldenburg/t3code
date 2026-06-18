import type { OrchestrationThreadActivity, ThreadTokenUsageSnapshot } from "@t3tools/contracts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

type NullableContextWindowUsage = {
  readonly [Key in keyof ThreadTokenUsageSnapshot]: undefined extends ThreadTokenUsageSnapshot[Key]
    ? Exclude<ThreadTokenUsageSnapshot[Key], undefined> | null
    : ThreadTokenUsageSnapshot[Key];
};

export type ContextWindowSnapshot = NullableContextWindowUsage & {
  readonly remainingTokens: number | null;
  readonly usedPercentage: number | null;
  readonly remainingPercentage: number | null;
  readonly updatedAt: string;
};

export interface ContextRemainingPercentages {
  readonly weeklyRemainingPercentage: number | null;
  readonly fiveHourRemainingPercentage: number | null;
  readonly currentWindowRemainingPercentage: number | null;
  readonly weeklyRateLimit: AccountRateLimitWindowSnapshot | null;
  readonly fiveHourRateLimit: AccountRateLimitWindowSnapshot | null;
  readonly currentWindow: ContextWindowSnapshot | null;
}

export interface AccountRateLimitWindowSnapshot {
  readonly usedPercentage: number | null;
  readonly remainingPercentage: number | null;
  readonly resetsAt: number | null;
  readonly windowDurationMins: number | null;
  readonly updatedAt: string;
}

const FIVE_HOUR_WINDOW_DURATION_MINS = 300;
const WEEKLY_WINDOW_DURATION_MINS = 10_080;

/** Map a provider driver kind to a user-facing display name. */
export function formatProviderDisplayName(provider: string | null | undefined): string {
  if (!provider) return "This agent";
  switch (provider) {
    case "claudeAgent":
    case "claude":
      return "Claude";
    case "codex":
      return "Codex";
    case "cursor":
      return "Cursor";
    case "opencode":
      return "OpenCode";
    default: {
      // Title-case unknown driver kinds so they read reasonably.
      const trimmed = provider.replace(/Agent$/i, "").trim();
      if (trimmed.length === 0) return provider;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
  }
}

export function deriveLatestContextWindowSnapshot(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): ContextWindowSnapshot | null {
  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const activity = activities[index];
    if (!activity || activity.kind !== "context-window.updated") {
      continue;
    }

    const payload = asRecord(activity.payload);
    const usedTokens = asFiniteNumber(payload?.usedTokens);
    if (usedTokens === null || usedTokens < 0) {
      continue;
    }

    const maxTokens = asFiniteNumber(payload?.maxTokens);
    const usedPercentage =
      maxTokens !== null && maxTokens > 0 ? Math.min(100, (usedTokens / maxTokens) * 100) : null;
    const remainingTokens =
      maxTokens !== null ? Math.max(0, Math.round(maxTokens - usedTokens)) : null;
    const remainingPercentage = usedPercentage !== null ? Math.max(0, 100 - usedPercentage) : null;

    return {
      usedTokens,
      totalProcessedTokens: asFiniteNumber(payload?.totalProcessedTokens),
      maxTokens,
      remainingTokens,
      usedPercentage,
      remainingPercentage,
      inputTokens: asFiniteNumber(payload?.inputTokens),
      cachedInputTokens: asFiniteNumber(payload?.cachedInputTokens),
      outputTokens: asFiniteNumber(payload?.outputTokens),
      reasoningOutputTokens: asFiniteNumber(payload?.reasoningOutputTokens),
      lastUsedTokens: asFiniteNumber(payload?.lastUsedTokens),
      lastInputTokens: asFiniteNumber(payload?.lastInputTokens),
      lastCachedInputTokens: asFiniteNumber(payload?.lastCachedInputTokens),
      lastOutputTokens: asFiniteNumber(payload?.lastOutputTokens),
      lastReasoningOutputTokens: asFiniteNumber(payload?.lastReasoningOutputTokens),
      toolUses: asFiniteNumber(payload?.toolUses),
      durationMs: asFiniteNumber(payload?.durationMs),
      compactsAutomatically: asBoolean(payload?.compactsAutomatically) ?? false,
      updatedAt: activity.createdAt,
    };
  }

  return null;
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function accountRateLimitWindowSnapshot(
  value: unknown,
  updatedAt: string,
): AccountRateLimitWindowSnapshot | null {
  const window = asRecord(value);
  const usedPercent = asFiniteNumber(window?.usedPercent);
  if (usedPercent === null) {
    return null;
  }
  return {
    usedPercentage: clampPercentage(usedPercent),
    remainingPercentage: clampPercentage(100 - usedPercent),
    resetsAt: asFiniteNumber(window?.resetsAt),
    windowDurationMins: asFiniteNumber(window?.windowDurationMins),
    updatedAt,
  };
}

function findWindowSnapshot(
  snapshot: Record<string, unknown>,
  windowDurationMins: number,
  updatedAt: string,
): AccountRateLimitWindowSnapshot | null {
  for (const key of ["primary", "secondary"] as const) {
    const window = asRecord(snapshot[key]);
    if (asFiniteNumber(window?.windowDurationMins) !== windowDurationMins) {
      continue;
    }
    const rateLimitWindow = accountRateLimitWindowSnapshot(window, updatedAt);
    if (rateLimitWindow !== null) {
      return rateLimitWindow;
    }
  }
  return null;
}

function rateLimitSnapshotCandidates(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const nested = asRecord(root?.rateLimits);
  const candidates: Record<string, unknown>[] = [];
  for (const snapshot of [root, nested]) {
    if (!snapshot) continue;
    const byLimitId = asRecord(snapshot.rateLimitsByLimitId);
    const codexSnapshot = asRecord(byLimitId?.codex);
    if (codexSnapshot) candidates.push(codexSnapshot);
    const rateLimits = asRecord(snapshot.rateLimits);
    if (rateLimits) candidates.push(rateLimits);
    if (asRecord(snapshot.primary) || asRecord(snapshot.secondary)) candidates.push(snapshot);
  }
  return candidates;
}

function latestAccountRemainingPercentages(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): Pick<ContextRemainingPercentages, "weeklyRateLimit" | "fiveHourRateLimit"> {
  let weeklyRateLimit: AccountRateLimitWindowSnapshot | null = null;
  let fiveHourRateLimit: AccountRateLimitWindowSnapshot | null = null;

  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const activity = activities[index];
    if (!activity || activity.kind !== "account-rate-limits.updated") continue;

    for (const snapshot of rateLimitSnapshotCandidates(activity.payload)) {
      if (weeklyRateLimit === null) {
        weeklyRateLimit = findWindowSnapshot(
          snapshot,
          WEEKLY_WINDOW_DURATION_MINS,
          activity.createdAt,
        );
      }
      if (fiveHourRateLimit === null) {
        fiveHourRateLimit = findWindowSnapshot(
          snapshot,
          FIVE_HOUR_WINDOW_DURATION_MINS,
          activity.createdAt,
        );
      }
      if (weeklyRateLimit !== null && fiveHourRateLimit !== null) {
        return { weeklyRateLimit, fiveHourRateLimit };
      }
    }
  }

  return { weeklyRateLimit, fiveHourRateLimit };
}

export function deriveContextRemainingPercentages(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): ContextRemainingPercentages {
  const contextWindow = deriveLatestContextWindowSnapshot(activities);
  const accountRateLimits = latestAccountRemainingPercentages(activities);
  return {
    ...accountRateLimits,
    weeklyRemainingPercentage: accountRateLimits.weeklyRateLimit?.remainingPercentage ?? null,
    fiveHourRemainingPercentage: accountRateLimits.fiveHourRateLimit?.remainingPercentage ?? null,
    currentWindowRemainingPercentage: contextWindow?.remainingPercentage ?? null,
    currentWindow: contextWindow,
  };
}

export function formatContextWindowTokens(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0";
  }
  if (value < 1_000) {
    return `${Math.round(value)}`;
  }
  if (value < 10_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  if (value < 1_000_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}
