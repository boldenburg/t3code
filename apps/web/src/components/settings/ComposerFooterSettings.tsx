import {
  DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS,
  type ChatComposerFooterItemId,
  type ChatComposerFooterSettings,
} from "@t3tools/contracts";
import { ArrowDownIcon, ArrowUpIcon, SendHorizontalIcon } from "lucide-react";
import { useMemo } from "react";

import {
  COMPOSER_FOOTER_ITEM_BY_ID,
  moveChatComposerFooterItem,
  normalizeChatComposerFooterSettings,
} from "../chat/composerFooterSettings";
import { usePrimarySettings, useUpdatePrimarySettings } from "../../hooks/useSettings";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SettingResetButton, SettingsRow } from "./settingsLayout";

function sameOrder(
  left: ReadonlyArray<ChatComposerFooterItemId>,
  right: ReadonlyArray<ChatComposerFooterItemId>,
) {
  return left.length === right.length && left.every((itemId, index) => itemId === right[index]);
}

export function ComposerFooterSettings() {
  const footerSettings = usePrimarySettings((settings) => settings.chatComposerFooter);
  const updateSettings = useUpdatePrimarySettings();
  const normalized = useMemo(
    () => normalizeChatComposerFooterSettings(footerSettings),
    [footerSettings],
  );
  const isDirty =
    !sameOrder(normalized.itemOrder, DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS.itemOrder) ||
    normalized.hiddenItemIds.length > 0;
  const writeFooterSettings = (next: ChatComposerFooterSettings) =>
    updateSettings({ chatComposerFooter: next });
  const setItemVisible = (itemId: ChatComposerFooterItemId, visible: boolean) => {
    const hiddenItemIds = new Set(normalized.hiddenItemIds);
    if (visible) {
      hiddenItemIds.delete(itemId);
    } else {
      hiddenItemIds.add(itemId);
    }
    writeFooterSettings({
      itemOrder: normalized.itemOrder,
      hiddenItemIds: Array.from(hiddenItemIds),
    });
  };
  const moveItem = (itemId: ChatComposerFooterItemId, direction: "up" | "down") => {
    writeFooterSettings({
      itemOrder: moveChatComposerFooterItem(normalized.itemOrder, itemId, direction),
      hiddenItemIds: normalized.hiddenItemIds,
    });
  };
  const canMove = (itemId: ChatComposerFooterItemId, direction: "up" | "down") =>
    !sameOrder(
      normalized.itemOrder,
      moveChatComposerFooterItem(normalized.itemOrder, itemId, direction),
    );
  const renderPreviewItem = (itemId: ChatComposerFooterItemId) => {
    const item = COMPOSER_FOOTER_ITEM_BY_ID.get(itemId);
    if (!item) return null;
    return (
      <span
        key={itemId}
        data-composer-footer-preview-item={itemId}
        className="inline-flex h-7 shrink-0 items-center rounded-md bg-muted px-2 text-[11px] font-medium text-muted-foreground"
      >
        {item.label}
      </span>
    );
  };

  return (
    <SettingsRow
      title="Composer footer"
      description="Choose which secondary controls appear below the chat input."
      resetAction={
        isDirty ? (
          <SettingResetButton
            label="composer footer"
            onClick={() => writeFooterSettings(DEFAULT_CHAT_COMPOSER_FOOTER_SETTINGS)}
          />
        ) : null
      }
    >
      <div className="mt-3 grid gap-3 pb-4">
        <div className="grid gap-2">
          {normalized.itemOrder.map((itemId) => {
            const item = COMPOSER_FOOTER_ITEM_BY_ID.get(itemId);
            if (!item) return null;
            const visible = !normalized.hiddenItemIdSet.has(itemId);
            return (
              <div
                key={itemId}
                className={cn(
                  "flex min-w-0 items-center gap-2 py-1",
                  !visible && "text-muted-foreground/70",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{item.label}</div>
                  <div className="text-muted-foreground/70 text-xs leading-4">
                    {item.description}
                  </div>
                </div>
                <Switch
                  checked={visible}
                  onCheckedChange={(checked) => setItemVisible(itemId, Boolean(checked))}
                  aria-label={`Show ${item.label}`}
                />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={!canMove(itemId, "up")}
                        aria-label={`Move ${item.label} up`}
                        onClick={() => moveItem(itemId, "up")}
                      />
                    }
                  >
                    <ArrowUpIcon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipPopup side="top">Move up</TooltipPopup>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={!canMove(itemId, "down")}
                        aria-label={`Move ${item.label} down`}
                        onClick={() => moveItem(itemId, "down")}
                      />
                    }
                  >
                    <ArrowDownIcon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipPopup side="top">Move down</TooltipPopup>
                </Tooltip>
              </div>
            );
          })}
        </div>

        <div
          data-composer-footer-preview="true"
          className="overflow-hidden rounded-lg border bg-background"
        >
          <div className="min-h-17 px-3 py-2 text-sm text-muted-foreground/70">Ask anything...</div>
          <div className="flex min-w-0 items-center justify-between gap-2 border-t px-2.5 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {normalized.leftItemIds.map(renderPreviewItem)}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {normalized.rightItemIds.map(renderPreviewItem)}
              <Button type="button" size="icon-sm" disabled aria-label="Send preview message">
                <SendHorizontalIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsRow>
  );
}
