import { describe, expect, it } from "vite-plus/test";
import type { ServerProviderModel } from "@t3tools/contracts";

import {
  deriveDefaultModelOptions,
  deriveDefaultReasoningOptions,
  deriveProviderModelsForDisplay,
} from "./ProviderInstanceCard";

describe("deriveProviderModelsForDisplay", () => {
  it("uses current config custom models instead of stale live custom rows", () => {
    const liveModels: ReadonlyArray<ServerProviderModel> = [
      {
        slug: "server-model",
        name: "Server Model",
        isCustom: false,
        capabilities: null,
      },
      {
        slug: "removed-custom",
        name: "Removed Custom",
        isCustom: true,
        capabilities: null,
      },
      {
        slug: "kept-custom",
        name: "Kept Custom",
        isCustom: true,
        capabilities: null,
      },
    ];

    expect(
      deriveProviderModelsForDisplay({
        liveModels,
        customModels: ["kept-custom"],
      }).map((model) => model.slug),
    ).toEqual(["server-model", "kept-custom"]);
  });
});

describe("provider default setting options", () => {
  it("derives model and reasoning dropdown options from live models", () => {
    const liveModels: ReadonlyArray<ServerProviderModel> = [
      {
        slug: "gpt-5.4",
        name: "GPT-5.4",
        isCustom: false,
        capabilities: {
          optionDescriptors: [
            {
              id: "reasoningEffort",
              label: "Reasoning",
              type: "select",
              options: [
                { id: "medium", label: "Medium", isDefault: true },
                { id: "high", label: "High" },
              ],
            },
          ],
        },
      },
    ];

    expect(deriveDefaultModelOptions(liveModels)).toEqual([
      { value: "", label: "Use project default" },
      { value: "gpt-5.4", label: "GPT-5.4", description: "gpt-5.4" },
    ]);
    expect(deriveDefaultReasoningOptions({ models: liveModels, selectedModel: "gpt-5.4" })).toEqual(
      [
        { value: "", label: "Use model default" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    );
  });
});
