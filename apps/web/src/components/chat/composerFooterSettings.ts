import {
  DEFAULT_CHAT_COMPOSER_FOOTER_ITEM_ORDER,
  DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS,
  type ChatComposerFooterItemId,
  type ChatComposerFooterSettings,
} from "@t3tools/contracts";

export type ComposerFooterItemSide = "left" | "right";

export const COMPOSER_FOOTER_ITEM_METADATA = [
  {
    id: "model",
    label: "Model",
    description: "Provider and model picker.",
    side: "left",
  },
  {
    id: "traits",
    label: "Model traits",
    description: "Model-specific options such as effort, thinking, or fast mode, when available.",
    side: "left",
  },
  {
    id: "runtimeMode",
    label: "Runtime access",
    description: "Command and file-change approval mode.",
    side: "left",
  },
  {
    id: "interactionMode",
    label: "Build / plan mode",
    description: "Toggle between normal build work and plan mode, when supported.",
    side: "left",
  },
  {
    id: "planSidebar",
    label: "Task panel toggle",
    description:
      "Button for showing or hiding the task panel, shown only when tasks or a plan exist.",
    side: "left",
  },
  {
    id: "contextWindow",
    label: "Context meter",
    description: "Current thread context window usage, shown when usage data is available.",
    side: "right",
  },
  {
    id: "contextPercentages",
    label: "Context percentages",
    description: "Weekly, 5h, and current context window remaining percentages.",
    side: "right",
  },
] as const satisfies ReadonlyArray<{
  readonly id: ChatComposerFooterItemId;
  readonly label: string;
  readonly description: string;
  readonly side: ComposerFooterItemSide;
}>;

export const COMPOSER_FOOTER_ITEM_BY_ID = new Map(
  COMPOSER_FOOTER_ITEM_METADATA.map((item) => [item.id, item]),
);

const KNOWN_ITEM_IDS = new Set(COMPOSER_FOOTER_ITEM_METADATA.map((item) => item.id));
const DEFAULT_HIDDEN_ITEM_IDS = new Set<ChatComposerFooterItemId>(["contextPercentages"]);

function normalizeItemIds(ids: ReadonlyArray<unknown>): ChatComposerFooterItemId[] {
  const seen = new Set<ChatComposerFooterItemId>();
  const normalized: ChatComposerFooterItemId[] = [];
  for (const id of ids) {
    if (!KNOWN_ITEM_IDS.has(id as ChatComposerFooterItemId)) continue;
    const itemId = id as ChatComposerFooterItemId;
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    normalized.push(itemId);
  }
  return normalized;
}

function normalizeItemOrder(ids: ReadonlyArray<unknown>): ChatComposerFooterItemId[] {
  const normalized = normalizeItemIds(ids);
  const seen = new Set(normalized);
  for (const itemId of DEFAULT_CHAT_COMPOSER_FOOTER_ITEM_ORDER) {
    if (seen.has(itemId)) continue;
    normalized.push(itemId);
  }
  return normalized;
}

export function normalizeChatComposerFooterSettings(
  settings: ChatComposerFooterSettings | null | undefined,
) {
  const itemOrder = normalizeItemOrder(
    settings?.itemOrder ?? DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS.itemOrder,
  );
  const hiddenItemIds = normalizeItemIds(
    settings?.hiddenItemIds ?? DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS.hiddenItemIds,
  );
  if (!settings?.itemOrder?.includes("contextPercentages")) {
    hiddenItemIds.push(
      ...[...DEFAULT_HIDDEN_ITEM_IDS].filter((itemId) => !hiddenItemIds.includes(itemId)),
    );
  }
  const hiddenItemIdSet = new Set(hiddenItemIds);
  const visibleItemIds = itemOrder.filter((itemId) => !hiddenItemIdSet.has(itemId));
  const leftItemIds = visibleItemIds.filter(
    (itemId) => COMPOSER_FOOTER_ITEM_BY_ID.get(itemId)?.side === "left",
  );
  const rightItemIds = visibleItemIds.filter(
    (itemId) => COMPOSER_FOOTER_ITEM_BY_ID.get(itemId)?.side === "right",
  );

  return {
    itemOrder,
    hiddenItemIds,
    hiddenItemIdSet,
    visibleItemIds,
    leftItemIds,
    rightItemIds,
  };
}

export function moveChatComposerFooterItem(
  itemOrder: ReadonlyArray<ChatComposerFooterItemId>,
  itemId: ChatComposerFooterItemId,
  direction: "up" | "down",
): ChatComposerFooterItemId[] {
  const next = normalizeItemOrder(itemOrder);
  const index = next.indexOf(itemId);
  const side = COMPOSER_FOOTER_ITEM_BY_ID.get(itemId)?.side;
  if (!side) {
    return next;
  }
  const step = direction === "up" ? -1 : 1;
  let targetIndex = index + step;
  while (
    targetIndex >= 0 &&
    targetIndex < next.length &&
    COMPOSER_FOOTER_ITEM_BY_ID.get(next[targetIndex]!)?.side !== side
  ) {
    targetIndex += step;
  }
  if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
    return next;
  }
  [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
  return next;
}
