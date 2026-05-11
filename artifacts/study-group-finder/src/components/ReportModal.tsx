import { useState } from "react";
import { useCreateReport } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Flag } from "lucide-react";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abuse" },
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "harassment", label: "Harassment" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
] as const;

type ReportType = "user" | "group" | "message";
type Reason = typeof REASONS[number]["value"];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportType;
  targetId: number;
  targetLabel?: string;
}

export function ReportModal({ open, onClose, targetType, targetId, targetLabel }: ReportModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<Reason | "">("");
  const [description, setDescription] = useState("");
  const createReport = useCreateReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    try {
      await createReport.mutateAsync({
        data: {
          type: targetType,
          targetId,
          reason,
          description: description.trim() || undefined,
        },
      });
      toast({ title: "Report submitted", description: "Our moderation team will review your report." });
      handleClose();
    } catch (err: any) {
      const msg = err?.data?.error || "Failed to submit report";
      toast({ variant: "destructive", title: "Report failed", description: msg });
    }
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onClose();
  };

  const typeLabels: Record<ReportType, string> = {
    user: "User",
    group: "Group",
    message: "Message",
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report {typeLabels[targetType]}
          </DialogTitle>
          <DialogDescription>
            {targetLabel
              ? `Reporting: "${targetLabel}"`
              : `Report this ${typeLabels[targetType].toLowerCase()} to our moderation team.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={v => setReason(v as Reason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Additional details <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in more detail..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!reason || createReport.isPending}
              className="gap-2"
            >
              <Flag className="h-4 w-4" />
              {createReport.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
