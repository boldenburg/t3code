import { memo } from "react";
import { type PendingApproval } from "../../session-logic";

interface ComposerPendingApprovalPanelProps {
  approval: PendingApproval;
}

export const ComposerPendingApprovalPanel = memo(function ComposerPendingApprovalPanel({
  approval,
}: ComposerPendingApprovalPanelProps) {
  return approval.reason ? (
    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="text-sm leading-relaxed text-foreground/90">{approval.reason}</p>
    </div>
  ) : null;
});
