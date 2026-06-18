# Add explicit context percentages to the chat composer footer

This plan is a living document. The sections `Progress`, `Surprises and
Discoveries`, `Decision Log`, and `Outcomes and Retrospective` must be kept up
to date as work proceeds.

No repository-local `PLANS.md` exists as of 2026-06-18. This document follows
the Plans.md implementation plan format from the Codex planning skill and uses
the existing repository convention under `docs/plans/active/`.

## Purpose / Big Picture

The chat composer footer can already show a compact context meter, but it does
not show the remaining percentages as plain numbers. After this work, a user
can enable a new footer item in Settings that shows three explicit values:
weekly percent remaining, five-hour percent remaining, and current context
window percent remaining.

The visible footer should read like compact status text, for example
`W 74% · 5h 31% · Ctx 82%`. The numbers must be real data from provider
events. Unknown values should render as `--` or be omitted in a way that does
not pretend the value is known.

## Plan Layout

This is a single-file plan:

    docs/plans/completed/2026-06-18-P1-composer-context-percentages/plan.md

No `record.md` is needed yet. If implementation produces screenshots, command
transcripts, or design notes that make this file hard to skim, add:

    docs/plans/completed/2026-06-18-P1-composer-context-percentages/record.md

## Work Boundaries

Expected files and modules:

- `packages/contracts/src/settings.ts`: add one new footer item id for the
  explicit percentage display.
- `apps/web/src/components/chat/composerFooterSettings.ts`: add metadata for
  the new right-side footer item and keep it hidden by default for existing
  users.
- `apps/web/src/components/chat/ChatComposer.tsx`: render right-side footer
  items from normalized footer settings instead of keeping the context meter as
  a special case inside primary actions.
- `apps/web/src/components/chat/ContextWindowMeter.tsx`: reuse or export the
  percentage formatting and add the small explicit percentage display near the
  existing meter code.
- `apps/web/src/lib/contextWindow.ts`: derive the latest current-window
  remaining percentage and the latest account rate-limit remaining percentages
  from thread activities.
- `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`: project
  provider `account.rate-limits.updated` events into a quiet thread activity
  that the web client can read.
- `apps/web/src/session-logic.ts`: keep account rate-limit update activities
  out of the work log, the same way context-window update activities are hidden
  today.
- Focused tests next to the touched modules.

Out of bounds for this plan:

- Do not add charts, history, polling, or a quota settings page.
- Do not add a dependency for formatting, tooltips, layout, or data parsing.
- Do not fake weekly or five-hour values when provider events do not include
  enough information.
- Do not change `.gitignore`.
- Do not edit files under `.repos/`.

## Definition Of Done

Done means a user can open Settings, enable the new composer footer item, return
to a chat, and see explicit percentage numbers for any known weekly, five-hour,
and current context windows. Existing users should not see a new footer item
until they opt in.

The main validators are:

    vp check
    vp run typecheck

The fastest current checks during implementation are:

    vp test apps/web/src/lib/contextWindow.test.ts
    vp test apps/web/src/components/chat/composerFooterSettings.test.ts
    vp test apps/web/src/session-logic.test.ts

Acceptance criteria:

- The new footer item appears in Settings as a configurable right-side item.
- The default live composer footer looks unchanged for fresh settings and for
  older localStorage settings that do not mention the new item.
- When the item is enabled, the live composer renders explicit remaining
  percentages for weekly, five-hour, and current context windows when those
  values are known.
- Weekly and five-hour remaining percentages come from provider
  `account.rate-limits.updated` events. The implementation maps windows by
  `windowDurationMins`: `10080` minutes for weekly and `300` minutes for five
  hours.
- Current window remaining percentage comes from the existing
  `context-window.updated` token usage activity and `maxTokens`.
- Percentage values are clamped to `0` through `100` and displayed with a `%`
  sign.
- Sparse provider updates do not erase previously known weekly or five-hour
  values while scanning recent thread activities.
- Account rate-limit update activities do not appear as normal work-log rows.

## Progress

- [x] (2026-06-18 20:32Z) Inspected the existing footer customizer plan, current
      footer settings, `ContextWindowMeter`, context-window derivation, Codex
      and Claude account rate-limit event emission, and orchestration ingestion.
- [x] (2026-06-18 20:32Z) Created this active plan under `docs/plans/active/`.
- [x] (2026-06-18 20:44Z) Moved the completed plan to
      `docs/plans/completed/2026-06-18-P1-composer-context-percentages/`.
- [x] (2026-06-18 20:44Z) Add the new opt-in footer item id and
      default-hidden normalization.
- [x] (2026-06-18 20:44Z) Project account rate-limit updates into quiet thread
      activities.
- [x] (2026-06-18 20:44Z) Derive weekly, five-hour, and current remaining
      percentage values.
- [x] (2026-06-18 20:44Z) Render the explicit percentage footer item and update
      the Settings preview.
- [x] (2026-06-18 20:44Z) Add focused regression tests.
- [x] (2026-06-18 20:44Z) Run `vp check` and `vp run typecheck`.

## Surprises and Discoveries

- Observation: `apps/server/src/provider/Layers/CodexAdapter.ts` already emits
  `account.rate-limits.updated` runtime events for Codex
  `account/rateLimits/updated` notifications.
  Evidence: the adapter wraps the upstream payload under
  `payload.rateLimits`.

- Observation: `apps/server/src/provider/Layers/ClaudeAdapter.ts` also emits
  `account.rate-limits.updated` for SDK messages with `type ===
"rate_limit_event"`, but the shape differs from Codex.
  Evidence: the adapter stores the raw SDK message under `payload.rateLimits`.

- Observation: `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`
  currently projects `thread.token-usage.updated` into `context-window.updated`
  activities, but no case handles `account.rate-limits.updated`.
  Evidence: repository search found adapter emissions but no ingestion switch
  case for account rate limits.

- Observation: the current footer customizer has a right-side `contextWindow`
  item, but the live composer still renders the context meter inside
  `ComposerFooterPrimaryActions`.
  Evidence: `ChatComposer.tsx` filters `contextWindow` out of left items and
  passes `showContextWindow` into `ComposerFooterPrimaryActions`.

## Decision Log

- Decision: Add a new footer item instead of changing the existing context
  meter display.
  Rationale: The existing meter is compact and already shipped. A separate
  opt-in item satisfies the request for explicit numbers without changing the
  default composer density.
  Date/Author: 2026-06-18 / Codex

- Decision: Keep the new item hidden by default.
  Rationale: The footer customizer plan promised the default appearance would
  remain unchanged. Existing localStorage settings that predate this item must
  not suddenly show more footer text.
  Date/Author: 2026-06-18 / Codex

- Decision: Map weekly and five-hour windows by `windowDurationMins`, not by
  `primary` or `secondary` names alone.
  Rationale: The upstream schema names the duration explicitly. Relying on
  field position would be brittle if the provider changes which window is
  primary.
  Date/Author: 2026-06-18 / Codex

## Outcomes and Retrospective

Implemented on 2026-06-18.

The composer footer now has an opt-in `contextPercentages` right-side item that
renders weekly, five-hour, and current context remaining percentages as compact
text. The item is hidden by default for fresh settings and for older saved
footer settings that do not mention it.

Provider `account.rate-limits.updated` events are projected into quiet
`account-rate-limits.updated` thread activities. The web client derives weekly
and five-hour values from `windowDurationMins` `10080` and `300`, prefers
`rateLimitsByLimitId.codex`, clamps values to `0` through `100`, and keeps older
known values when newer updates are sparse.

Validation passed:

- `vp test apps/web/src/lib/contextWindow.test.ts`
- `vp test apps/web/src/components/chat/composerFooterSettings.test.ts`
- `vp test apps/web/src/session-logic.test.ts`
- `vp test apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.test.ts`
- `vp check`
- `vp run typecheck`

## Context and Orientation

The web app lives under `apps/web`. The chat composer is implemented in
`apps/web/src/components/chat/ChatComposer.tsx`. Its footer is the element with
`data-chat-composer-footer="true"`.

Footer customization already exists. Client settings live in
`packages/contracts/src/settings.ts` under `chatComposerFooter`. The helper in
`apps/web/src/components/chat/composerFooterSettings.ts` normalizes saved item
order, hidden item ids, and left/right grouping. The Settings UI in
`apps/web/src/components/settings/ComposerFooterSettings.tsx` renders toggles,
up/down buttons, reset, and a preview from that same metadata.

The current context meter is `apps/web/src/components/chat/ContextWindowMeter.tsx`.
It receives a `ContextWindowSnapshot` derived in
`apps/web/src/lib/contextWindow.ts`. Today that snapshot only comes from
`context-window.updated` activities, which are produced when providers emit
`thread.token-usage.updated`.

Codex account rate-limit events already reach the provider runtime as
`account.rate-limits.updated`. The upstream Codex shape has a `rateLimits`
snapshot with `primary` and `secondary` windows. Each window can include
`usedPercent`, `resetsAt`, and `windowDurationMins`. The explicit footer item
needs remaining percentages, so calculate `100 - usedPercent` and clamp the
result.

## Plan of Work

First, extend the footer settings model. Add `"contextPercentages"` to
`ChatComposerFooterItemId` in `packages/contracts/src/settings.ts`, place it
after `"contextWindow"` in the default order, and treat it as default-hidden.
Update `normalizeChatComposerFooterSettings` so a newly appended default-hidden
item stays hidden for older saved settings that do not mention it. Add tests in
`apps/web/src/components/chat/composerFooterSettings.test.ts` for the new item
order, default hidden behavior, and side-preserving movement with two right-side
items.

Second, persist account quota updates as quiet activities. In
`ProviderRuntimeIngestion.ts`, add a switch case for
`account.rate-limits.updated` that writes an activity with kind
`account-rate-limits.updated`, tone `info`, summary `Account rate limits
updated`, the event id and created time, and the provider payload as `payload`.
Add a test in `ProviderRuntimeIngestion.test.ts` that emits a Codex-shaped
event with five-hour and weekly windows and observes the stored activity.
Update `apps/web/src/session-logic.ts` and `session-logic.test.ts` so this
activity is excluded from the work log.

Third, derive the numbers in one small helper. In `apps/web/src/lib/contextWindow.ts`,
add a type such as `ContextTrackingSnapshot` with `weeklyRemainingPercentage`,
`fiveHourRemainingPercentage`, and `currentWindowRemainingPercentage`. Iterate
activities from newest to oldest. Reuse the existing context-window parser for
the current value, and scan `account-rate-limits.updated` payloads until both
weekly and five-hour values are found. Accept both the Codex nested shape
`payload.rateLimits.primary` / `payload.rateLimits.secondary` and a direct
snapshot shape if ingestion later stores only the inner snapshot. Prefer
`rateLimitsByLimitId.codex` when present, then fall back to `rateLimits`. Add
tests for normal Codex data, sparse updates, malformed values, and clamping.

Fourth, render the opt-in footer item. Move the existing context meter rendering
out of `ComposerFooterPrimaryActions` into a right-side footer item renderer in
`ChatComposer.tsx`. Add a compact explicit percentage component near
`ContextWindowMeter.tsx` so it can share the existing percentage formatter. The
component should render stable-width, tabular-number text and should show a
clear placeholder such as `--` for unknown values. Keep send, stop, pending
approval, pending answer, and plan implementation buttons outside footer
customization.

Fifth, update the Settings preview. The metadata entry in
`composerFooterSettings.ts` should label the item `Context percentages` and
describe it as `Weekly, 5h, and current context window remaining percentages`.
The existing preview should pick it up automatically from the metadata. If it
does not, keep the change local to `ComposerFooterSettings.tsx`; do not add a
second preview implementation.

Finally, run the focused tests while iterating, then run `vp check` and
`vp run typecheck` before marking this plan complete.
