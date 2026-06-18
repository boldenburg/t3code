import { describe, expect, it } from "vite-plus/test";
import type { ChatComposerFooterSettings } from "@t3tools/contracts";

import {
  moveChatComposerFooterItem,
  normalizeChatComposerFooterSettings,
} from "./composerFooterSettings";

describe("normalizeChatComposerFooterSettings", () => {
  it("uses the current footer layout when settings are missing", () => {
    expect(normalizeChatComposerFooterSettings(undefined).itemOrder).toEqual([
      "model",
      "traits",
      "runtimeMode",
      "interactionMode",
      "planSidebar",
      "contextWindow",
    ]);
  });

  it("drops unknown ids, removes duplicates, and appends missing defaults", () => {
    const normalized = normalizeChatComposerFooterSettings({
      itemOrder: ["model", "model", "contextWindow", "unknown"],
      hiddenItemIds: ["traits", "unknown", "traits"],
    } as unknown as ChatComposerFooterSettings);

    expect(normalized.itemOrder).toEqual([
      "model",
      "contextWindow",
      "traits",
      "runtimeMode",
      "interactionMode",
      "planSidebar",
    ]);
    expect(normalized.hiddenItemIds).toEqual(["traits"]);
    expect(normalized.visibleItemIds).toEqual([
      "model",
      "contextWindow",
      "runtimeMode",
      "interactionMode",
      "planSidebar",
    ]);
  });

  it("splits visible items by footer side", () => {
    const normalized = normalizeChatComposerFooterSettings({
      itemOrder: ["contextWindow", "model", "runtimeMode"],
      hiddenItemIds: ["runtimeMode"],
    });

    expect(normalized.leftItemIds).toEqual(["model", "traits", "interactionMode", "planSidebar"]);
    expect(normalized.rightItemIds).toEqual(["contextWindow"]);
  });
});

describe("moveChatComposerFooterItem", () => {
  it("moves items within the normalized order", () => {
    expect(
      moveChatComposerFooterItem(
        ["model", "traits", "runtimeMode", "interactionMode", "planSidebar", "contextWindow"],
        "runtimeMode",
        "up",
      ),
    ).toEqual([
      "model",
      "runtimeMode",
      "traits",
      "interactionMode",
      "planSidebar",
      "contextWindow",
    ]);
  });

  it("keeps boundary moves stable", () => {
    expect(
      moveChatComposerFooterItem(
        ["model", "traits", "runtimeMode", "interactionMode", "planSidebar", "contextWindow"],
        "model",
        "up",
      ),
    ).toEqual([
      "model",
      "traits",
      "runtimeMode",
      "interactionMode",
      "planSidebar",
      "contextWindow",
    ]);
  });
});
