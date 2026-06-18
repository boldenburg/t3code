import { cn } from "~/lib/utils";
import {
  type AccountRateLimitWindowSnapshot,
  type ContextRemainingPercentages,
  type ContextWindowSnapshot,
  formatContextWindowTokens,
} from "~/lib/contextWindow";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

export function formatContextWindowPercentage(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  if (value < 10) {
    return `${value.toFixed(1).replace(/\.0$/, "")}%`;
  }
  return `${Math.round(value)}%`;
}

const percentageText = (value: number | null): string =>
  formatContextWindowPercentage(value) ?? "--";

const tokenText = (value: number | null): string =>
  value === null ? "--" : formatContextWindowTokens(value);

function formatWindowDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  if (value % 1440 === 0) {
    return `${value / 1440}d`;
  }
  if (value % 60 === 0) {
    return `${value / 60}h`;
  }
  return `${value}m`;
}

function formatRateLimitTime(value: number | string | null): string {
  if (value === null) {
    return "--";
  }
  const raw = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(raw)) {
    return "--";
  }
  const millis = typeof value === "number" && value < 1_000_000_000_000 ? value * 1000 : raw;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PercentageDetailRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] leading-4">
      <span className="text-muted-foreground/60">{props.label}</span>
      <span className="font-medium tabular-nums text-muted-foreground/80">{props.value}</span>
    </div>
  );
}

function RateLimitWindowDetails(props: {
  title: string;
  window: AccountRateLimitWindowSnapshot | null;
}) {
  const { title, window } = props;
  return (
    <div className="grid gap-1.5">
      <div className="font-medium text-muted-foreground text-xs">{title}</div>
      <PercentageDetailRow
        label="Remaining"
        value={percentageText(window?.remainingPercentage ?? null)}
      />
      <PercentageDetailRow label="Used" value={percentageText(window?.usedPercentage ?? null)} />
      <PercentageDetailRow label="Resets" value={formatRateLimitTime(window?.resetsAt ?? null)} />
      <PercentageDetailRow label="Updated" value={formatRateLimitTime(window?.updatedAt ?? null)} />
      <PercentageDetailRow
        label="Window"
        value={formatWindowDuration(window?.windowDurationMins ?? null)}
      />
    </div>
  );
}

export function ContextWindowPercentages(props: { percentages: ContextRemainingPercentages }) {
  const { percentages } = props;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex min-w-[9.75rem] shrink-0 justify-end gap-1.5 whitespace-nowrap rounded-md px-1 py-1 text-[11px] font-medium tabular-nums text-muted-foreground/75 outline-none transition-colors",
              "hover:bg-accent data-[pressed]:bg-accent",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            )}
            aria-label={`Context remaining percentages: weekly ${percentageText(
              percentages.weeklyRemainingPercentage,
            )}, five-hour ${percentageText(
              percentages.fiveHourRemainingPercentage,
            )}, current context ${percentageText(percentages.currentWindowRemainingPercentage)}`}
          >
            <span>W {percentageText(percentages.weeklyRemainingPercentage)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>5h {percentageText(percentages.fiveHourRemainingPercentage)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Ctx {percentageText(percentages.currentWindowRemainingPercentage)}</span>
          </button>
        }
      />
      <PopoverPopup tooltipStyle side="top" align="end" className="w-72 max-w-none p-0">
        <div className="grid gap-3 p-3">
          <RateLimitWindowDetails title="Weekly Limit" window={percentages.weeklyRateLimit} />
          <RateLimitWindowDetails title="5h Limit" window={percentages.fiveHourRateLimit} />
          <div className="grid gap-1.5">
            <div className="font-medium text-muted-foreground text-xs">Current Context Window</div>
            <PercentageDetailRow
              label="Remaining"
              value={percentageText(percentages.currentWindow?.remainingPercentage ?? null)}
            />
            <PercentageDetailRow
              label="Used"
              value={percentageText(percentages.currentWindow?.usedPercentage ?? null)}
            />
            <PercentageDetailRow
              label="Used tokens"
              value={tokenText(percentages.currentWindow?.usedTokens ?? null)}
            />
            <PercentageDetailRow
              label="Max tokens"
              value={tokenText(percentages.currentWindow?.maxTokens ?? null)}
            />
            <PercentageDetailRow
              label="Remaining tokens"
              value={tokenText(percentages.currentWindow?.remainingTokens ?? null)}
            />
            <PercentageDetailRow
              label="Total processed"
              value={tokenText(percentages.currentWindow?.totalProcessedTokens ?? null)}
            />
            <PercentageDetailRow
              label="Updated"
              value={formatRateLimitTime(percentages.currentWindow?.updatedAt ?? null)}
            />
            <PercentageDetailRow
              label="Auto compacts"
              value={
                percentages.currentWindow === null
                  ? "--"
                  : percentages.currentWindow.compactsAutomatically
                    ? "Yes"
                    : "No"
              }
            />
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

export function ContextWindowMeter(props: {
  usage: ContextWindowSnapshot;
  providerDisplayName?: string | null;
}) {
  const { usage, providerDisplayName } = props;
  const usedPercentage = formatContextWindowPercentage(usage.usedPercentage);
  const normalizedPercentage = Math.max(0, Math.min(100, usage.usedPercentage ?? 0));
  const radius = 9.75;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalizedPercentage / 100) * circumference;
  const totalProcessedTokens = usage.totalProcessedTokens ?? null;
  const showTotalProcessed = totalProcessedTokens !== null && totalProcessedTokens > 0;
  const isOverloaded = normalizedPercentage > 90;
  const usageColor = isOverloaded ? "var(--color-red-500)" : "var(--color-blue-500)";

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={0}
        render={
          <button
            type="button"
            className={cn(
              "inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-transparent text-muted-foreground outline-none transition-colors",
              "hover:bg-accent data-[pressed]:bg-accent",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            )}
            aria-label={
              usage.maxTokens !== null && usedPercentage
                ? `Context window ${usedPercentage} used`
                : `Context window ${formatContextWindowTokens(usage.usedTokens)} tokens used`
            }
          >
            <span className="relative flex size-4 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="-rotate-90 absolute inset-0 size-full transform-gpu"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke="color-mix(in oklab, var(--color-muted-foreground) 35%, transparent)"
                  strokeWidth="3"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke={usageColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
                />
              </svg>
            </span>
          </button>
        }
      />
      <PopoverPopup tooltipStyle side="top" align="end" className="w-64 max-w-none p-0">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-muted-foreground text-xs">Context Window</div>
            {usage.maxTokens !== null && usedPercentage ? (
              <div className="text-[11px] tabular-nums text-muted-foreground/70">
                <span>{usedPercentage}</span>
                <span className="mx-1">·</span>
                <span>
                  {formatContextWindowTokens(usage.usedTokens)}/
                  {formatContextWindowTokens(usage.maxTokens ?? null)}
                </span>
              </div>
            ) : (
              <div className="text-[11px] tabular-nums text-muted-foreground/70">
                {formatContextWindowTokens(usage.usedTokens)}
              </div>
            )}
          </div>
          {usage.maxTokens !== null ? (
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(normalizedPercentage)}
              aria-label="Context window usage"
            >
              <div
                className="h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${normalizedPercentage}%`, backgroundColor: usageColor }}
              />
            </div>
          ) : null}
          {showTotalProcessed ? (
            <div className="flex items-center justify-between gap-3 text-[11px] leading-4">
              <span className="text-muted-foreground/60">Total processed</span>
              <span className="font-medium tabular-nums text-muted-foreground/80">
                {formatContextWindowTokens(totalProcessedTokens)}
              </span>
            </div>
          ) : null}
          {usage.compactsAutomatically ? (
            <div className="mt-1 text-pretty text-[11px] font-medium text-muted-foreground/70">
              {providerDisplayName ?? "It"} automatically compacts its context when needed.
            </div>
          ) : null}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
