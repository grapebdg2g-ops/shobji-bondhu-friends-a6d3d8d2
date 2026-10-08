import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/user-context";
import { toast } from "sonner";
import { Loader2, Flag } from "lucide-react";

export type ReportContentType = "post" | "exchange" | "price" | "comment" | "user" | "group_chat";

const REASONS: Array<{ value: string; label: string; icon: string }> = [
  { value: "spam", label: "স্প্যাম বা বিজ্ঞাপন", icon: "🗑️" },
  { value: "misinformation", label: "ভুল বা বিভ্রান্তিকর তথ্য", icon: "❌" },
  { value: "offensive", label: "আপত্তিকর বা অশ্লীল", icon: "😡" },
  { value: "fraud", label: "জাল বা প্রতারণামূলক", icon: "🤥" },
  { value: "other", label: "অন্য কারণ", icon: "📋" },
];

export function ReportModal({
  open,
  onClose,
  contentType,
  contentId,
  reportedUserId,
}: {
  open: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId?: string | null;
  reportedUserId?: string | null;
}) {
  const { user } = useUser();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!user) {
      toast.error("লগইন প্রয়োজন");
      return;
    }
    if (!reason) {
      toast.error("একটি কারণ নির্বাচন করুন");
      return;
    }
    const trimmedDesc = description.trim();
    if (reason === "other" && trimmedDesc.length < 5) {
      toast.error("অনুগ্রহ করে বিস্তারিত লিখুন");
      return;
    }
    if (trimmedDesc.length > 500) {
      toast.error("বিবরণ ৫০০ অক্ষরের কম হতে হবে");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId ?? null,
      reported_user_id: reportedUserId ?? null,
      reason,
      description: trimmedDesc || null,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      toast.error("রিপোর্ট পাঠানো যায়নি");
      return;
    }
    toast.success("✅ রিপোর্ট পাঠানো হয়েছে। আমরা শীঘ্রই পর্যালোচনা করব।");
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-red-600" />
            কেন রিপোর্ট করছেন?
          </DialogTitle>
          <DialogDescription className="text-xs">
            আপনার রিপোর্ট গোপন রাখা হবে। আমরা ২৪ ঘণ্টার মধ্যে পর্যালোচনা করব।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {REASONS.map((r) => {
            const active = reason === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`w-full text-left p-3 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="text-2xl">{r.icon}</span>
                <span className="font-semibold text-sm text-foreground">{r.label}</span>
                <span
                  className={`ml-auto h-4 w-4 rounded-full border-2 ${
                    active ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}
                />
              </button>
            );
          })}

          {reason === "other" && (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="বিস্তারিত লিখুন..."
              maxLength={500}
              rows={3}
              className="text-sm"
            />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={submitting}>
            বাতিল
          </Button>
          <Button className="flex-1" onClick={submit} disabled={submitting || !reason}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> পাঠানো হচ্ছে...
              </>
            ) : (
              "রিপোর্ট পাঠান"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
