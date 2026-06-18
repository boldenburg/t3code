# Make the chat composer footer customizable

This plan is a living document. The sections `Progress`, `Surprises and
Discoveries`, `Decision Log`, and `Outcomes and Retrospective` must be kept up
to date as work proceeds.

No repository-local `PLANS.md` exists as of 2026-06-18. This document follows
the Plans.md implementation plan format from the Codex planning skill.

## Purpose / Big Picture

The chat composer footer is the row under the prompt input that currently holds
the provider/model picker, model traits, runtime mode, build/plan mode, plan
panel toggle, context meter, and send/stop actions. Today that row is hardcoded
in `apps/web/src/components/chat/ChatComposer.tsx`. After this work, a user can
open Settings, choose which non-critical footer items appear, reorder those
items, and see an inert chat box preview that immediately reflects the current
customization settings.

The preview matters because footer density is visual. A user should not need to
return to a real thread to learn whether the selected footer items still fit.

## Plan Layout

This is a single-file plan:

    docs/plans/completed/2026-06-18-P1-chat-composer-footer-customizer/plan.md

No `record.md` is needed yet. If implementation produces screenshots, command
transcripts, or design notes that make this file hard to skim, add:

    docs/plans/completed/2026-06-18-P1-chat-composer-footer-customizer/record.md

## Work Boundaries

Expected files and modules:

- `packages/contracts/src/settings.ts`: add client-only settings schema and
  defaults for composer footer customization.
- `apps/web/src/hooks/useSettings.ts`: should need no structural change because
  unknown server keys already route to client settings. Touch it only if the new
  field does not route correctly.
- `apps/web/src/components/chat/ChatComposer.tsx`: replace the inline footer
  item order with a small reusable renderer driven by settings.
- `apps/web/src/components/chat/CompactComposerControlsMenu.tsx`: make compact
  mode respect hidden runtime, build/plan, traits, and plan panel items.
- `apps/web/src/components/chat/composerFooterSettings.ts`: new small helper
  module for item ids, defaults, normalization, labels, and filtering.
- `apps/web/src/components/settings/SettingsPanels.tsx`: add a General settings
  row or subsection that renders the customizer.
- `apps/web/src/components/settings/ComposerFooterSettings.tsx`: new settings
  UI with item toggles, up/down reorder buttons, reset, and preview.
- Focused tests next to the new helper and settings component.

Out of bounds for this plan:

- Do not let users inject arbitrary React components, arbitrary HTML, or custom
  template strings into the footer. That is plugin work and needs a separate
  trust model.
- Do not make send, stop, pending approval, pending answer, or plan
  implementation buttons hideable. They are primary task controls, not status
  line decoration.
- Do not add a new dependency for drag and drop. Up/down buttons are enough and
  already fit the existing settings UI.
- Do not change `.gitignore`.
- Do not edit files under `.repos/`.

## Definition Of Done

Done means a user can open Settings, customize the composer footer, and see the
same choice reflected in a preview and in the real chat composer after returning
to a thread.

The main validator is:

    vp check
    vp run typecheck

The fastest current check during implementation is:

    vp test apps/web/src/components/chat/composerFooterSettings.test.ts

Acceptance criteria:

- Client settings decode old localStorage without the new field and produce the
  current footer layout by default.
- The live composer footer uses the new settings without changing the default
  appearance.
- The customizer can hide and show these secondary footer items: model picker,
  model traits, runtime access mode, build/plan mode, plan panel toggle, and
  context window meter.
- The customizer can reorder visible secondary footer items within their natural
  side of the footer. Left-side items stay left; right-side meter items stay
  near the primary action.
- The send/stop/pending action area remains visible and functional regardless
  of customization.
- The settings preview renders a chat composer box using the current
  customization settings, updates immediately after a toggle or reorder, and
  uses the same footer item resolver as the live composer.
- Compact footer mode obeys the same hidden item settings in its overflow menu.
- Existing layout tests for footer overflow still pass, or are updated only
  where the new settings intentionally change the rendered item set.

## Progress

- [x] (2026-06-18 19:07Z) Inspected the current footer implementation in
      `ChatComposer.tsx`, provider-driven class hooks in
      `composerProviderState.tsx`, compact menu behavior in
      `CompactComposerControlsMenu.tsx`, and the settings split in
      `packages/contracts/src/settings.ts` plus `apps/web/src/hooks/useSettings.ts`.
- [x] (2026-06-18 19:07Z) Created this plan under `docs/plans/active/` because
      `.agents/` is read-only in the current workspace and there was no existing
      checked-in plan convention.
- [x] (2026-06-18 20:13Z) Add client-only settings schema and defaults for
      composer footer customization.
- [x] (2026-06-18 20:13Z) Add helper functions and tests that normalize footer
      item order and hidden item ids.
- [x] (2026-06-18 20:13Z) Extract a reusable composer footer item renderer and
      wire the live composer to the new settings.
- [x] (2026-06-18 20:13Z) Add the settings customizer and chat box preview.
- [x] (2026-06-18 20:13Z) Add focused tests for the settings UI and preview
      behavior.
- [x] (2026-06-18 20:13Z) Run `vp check` and `vp run typecheck`.

## Surprises and Discoveries

- Observation: `.agents/` exists but cannot be written in this workspace.
  Evidence: `mkdir -p .agents/plans/...` failed with `Read-only file system`.

- Observation: The current footer has no customization entry point. The visible
  row is assembled inline in `ChatComposer.tsx` around
  `data-chat-composer-footer="true"`, and compactness is controlled by fixed
  breakpoints in `apps/web/src/components/composerFooterLayout.ts`.
  Evidence: `ChatComposer.tsx` renders `ProviderModelPicker`, traits controls,
  `ComposerFooterModeControls`, `CompactComposerControlsMenu`, and
  `ComposerFooterPrimaryActions` directly.

- Observation: Provider model metadata can add trait controls, but not arbitrary
  footer items.
  Evidence: `ServerProviderModel.capabilities.optionDescriptors` feeds
  `TraitsPicker` and `renderProviderTraitsPicker`, while
  `composerProviderState.tsx` only adds special class names for the
  prompt-injected `ultrathink` state.

## Decision Log

- Decision: Store footer customization in `ClientSettingsSchema`, not server
  settings.
  Rationale: The feature only changes local browser presentation. The existing
  `useSettings` hook already stores client settings in localStorage under
  `t3code:client-settings:v1`, so no server migration or RPC change is needed.
  Date/Author: 2026-06-18 / Codex

- Decision: Implement v1 as hide/show plus up/down ordering of existing
  secondary footer items.
  Rationale: This satisfies the requested customization without creating a
  plugin API, arbitrary markup surface, or drag-and-drop dependency.
  Date/Author: 2026-06-18 / Codex

- Decision: Keep send, stop, pending approval, pending answer, and plan
  implementation controls outside the customization settings.
  Rationale: Hiding task controls would make the app harder to recover from
  during running sessions and approval flows.
  Date/Author: 2026-06-18 / Codex

- Decision: The preview must reuse the same normalized item list and item
  renderer as the live composer.
  Rationale: A separate mock preview would drift. Sharing the resolver keeps the
  preview honest with less code.
  Date/Author: 2026-06-18 / Codex

## Outcomes and Retrospective

Implemented the composer footer customizer.

- `packages/contracts/src/settings.ts` now stores `chatComposerFooter` in
  client settings only.
- `apps/web/src/components/chat/composerFooterSettings.ts` normalizes order,
  hidden item ids, side grouping, and side-preserving movement.
- `apps/web/src/components/chat/ChatComposer.tsx` renders the live footer from
  normalized settings while keeping primary send/stop controls outside
  customization.
- `apps/web/src/components/chat/CompactComposerControlsMenu.tsx` hides compact
  overflow items that the user disabled and disappears when the menu would be
  empty.
- `apps/web/src/components/settings/ComposerFooterSettings.tsx` adds toggles,
  up/down buttons, reset, and an inert preview.

Validation passed:

- `vp test apps/web/src/components/chat/composerFooterSettings.test.ts`
- `vp run --filter @t3tools/web test:browser`
- `vp check`
- `vp run typecheck`

Manual browser smoke was not run yet. The browser test project covered the
settings preview and compact menu behavior.

## Context and Orientation

The web app uses React and Vite under `apps/web`. The chat composer is the
prompt box at the bottom of a chat thread. Its footer is currently rendered in
`apps/web/src/components/chat/ChatComposer.tsx`, inside the element marked
`data-chat-composer-footer="true"`.

The footer has two visual areas. The left area currently contains the provider
and model picker, optional provider traits, runtime access mode, build/plan
mode, and a plan panel toggle. The right area contains a context window meter,
temporary "Preparing worktree..." text, and the primary send/stop controls.
The compact layout moves secondary controls into
`apps/web/src/components/chat/CompactComposerControlsMenu.tsx`.

Provider traits are the model-specific option controls such as effort,
thinking, fast mode, context window, or agent. They come from
`ProviderOptionDescriptor` values advertised on a model's
`capabilities.optionDescriptors`. The UI renders them through
`apps/web/src/components/chat/TraitsPicker.tsx`.

Settings are split between server settings and client settings. Server settings
live in `ServerSettings` and are persisted by the server. Client settings live
in `ClientSettingsSchema` and are persisted in browser localStorage. The
`useSettings` hook merges both shapes and `useUpdateSettings` routes unknown
server keys to client settings. Footer customization should use client settings.

## Proposed Settings Shape

Add a client setting named `chatComposerFooter`. Keep the shape small:

    ChatComposerFooterItemId:
      "model"
      "traits"
      "runtimeMode"
      "interactionMode"
      "planSidebar"
      "contextWindow"

    ChatComposerFooterSettings:
      itemOrder: ChatComposerFooterItemId[]
      hiddenItemIds: ChatComposerFooterItemId[]

The default `itemOrder` should match today's footer order:

    ["model", "traits", "runtimeMode", "interactionMode", "planSidebar", "contextWindow"]

The default `hiddenItemIds` should be empty.

Normalize the setting at render time with a helper in
`apps/web/src/components/chat/composerFooterSettings.ts`. The helper should:

- Drop unknown ids from persisted arrays.
- Remove duplicates.
- Append any new default ids missing from older persisted settings.
- Keep default behavior when the whole setting is missing.
- Split normalized ids into left and right render groups by a hardcoded item
  metadata table. In v1, `contextWindow` is right-side; all other secondary
  items are left-side.

This avoids a localStorage migration. Old settings decode with defaults, and
future item ids can be appended by changing the defaults.

## Plan of Work

First, add the settings schema. In `packages/contracts/src/settings.ts`, define
`ChatComposerFooterItemId`, `ChatComposerFooterSettingsSchema`, its TypeScript
type, and `DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS`. Add
`chatComposerFooter` to `ClientSettingsSchema`, `DEFAULT_CLIENT_SETTINGS`, and
`ClientSettingsPatch`. Do not add it to `ServerSettingsPatch`.

Next, add `apps/web/src/components/chat/composerFooterSettings.ts`. Export the
item metadata, default order, `normalizeChatComposerFooterSettings`, and helpers
for moving an item up or down. Add
`apps/web/src/components/chat/composerFooterSettings.test.ts` with assertive
tests for missing settings, duplicate ids, unknown ids, hidden ids, and
up/down movement at list boundaries.

Then extract footer rendering from `ChatComposer.tsx` without changing default
behavior. Keep the existing `ComposerFooterModeControls` and
`ComposerFooterPrimaryActions` components. Add a small component or pure render
function that receives the normalized footer settings and the existing render
state, then renders each known item by id. The render branches should call the
same `ProviderModelPicker`, traits picker, mode controls, and context meter that
the current inline footer uses. Keep `ComposerFooterPrimaryActions` rendered
outside the customizable item loop.

After the live footer works, update compact mode. Pass hidden item information
to `CompactComposerControlsMenu`. The compact menu should omit hidden traits,
mode, runtime, and plan panel entries. If the user hides all compact menu
entries, do not render the ellipsis menu.

Next, add the settings UI. Create
`apps/web/src/components/settings/ComposerFooterSettings.tsx`. It should read
`settings.chatComposerFooter`, normalize it, and call `updateSettings` with the
new `chatComposerFooter` value. The UI should use existing settings primitives:
`SettingsRow`, `Switch`, `Button`, and icons from `lucide-react`. Each row
should show an item label, a visibility switch, and up/down icon buttons. The
reset button should write `DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS`.

In the same settings component, add the chat box preview. Render a disabled
composer-like box with placeholder prompt text and a footer preview based on
the current normalized settings. Reuse the same footer item resolver as the
live composer. For preview-only callbacks, use no-op handlers and disabled or
inert controls. The preview must visibly update when the user toggles or moves
an item. The primary send button should remain visible in the preview even when
all secondary footer items are hidden.

Finally, insert the customizer into `SettingsPanels.tsx`, likely inside the
General section near other UI preferences. Keep the settings page dense and
avoid a separate route unless the control list becomes too large.

## Validation Strategy

During development, run the focused helper test after changing normalization:

    vp test apps/web/src/components/chat/composerFooterSettings.test.ts

After wiring the settings component, add or update a browser/component test that
renders the customizer, toggles one footer item off, moves one footer item, and
asserts that the preview changed. A suitable location is near existing settings
browser tests in `apps/web/src/components/settings/SettingsPanels.browser.tsx`
or a new focused file next to `ComposerFooterSettings.tsx`.

Before considering the work complete, run:

    vp check
    vp run typecheck

Manual smoke check:

1. Start the web app using the repo's normal development command.
2. Open Settings > General.
3. In the composer footer customizer, hide "Runtime access" and move "Model"
   below "Traits".
4. Confirm the preview immediately reflects the hidden runtime item and new
   item order.
5. Open or create a chat thread.
6. Confirm the real composer footer matches the preview while send/stop actions
   still appear.
7. Reset the setting and confirm the default footer returns.

## Risks and Recovery Notes

The main risk is duplicating footer rendering for the preview and drifting from
the live composer. Avoid that by sharing the item resolver and render map. The
preview may still pass inert props, but it should not have its own independent
list of item ids or visibility rules.

The second risk is breaking narrow layouts. Keep the existing compact
breakpoints in `composerFooterLayout.ts`. Customization should reduce rendered
items or reorder existing items, not introduce a new layout algorithm.

If persisted settings become invalid during development, remove the
`t3code:client-settings:v1` localStorage entry in the browser devtools and
reload. The normalization helper should make this unnecessary for normal users,
but it is a useful development escape hatch.
