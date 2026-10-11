import { useState } from "react";
import { MoreVertical, Flag, BellOff, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportModal, type ReportContentType } from "./report-modal";
import { useUser } from "@/contexts/user-context";
import { useMuteMutation } from "@/hooks/use-muted-users";

export function ContentMenu({
  contentType,
  contentId,
  authorId,
  authorName,
  onEdit,
  onDelete,
  className,
}: {
  contentType: ReportContentType;
  contentId?: string | null;
  authorId: string | null | undefined;
  authorName?: string | null;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  className?: string;
}) {
  const { user } = useUser();
  const { mute } = useMuteMutation();
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [muteOpen, setMuteOpen] = useState(false);

  const isOwn = !!user && !!authorId && user.id === authorId;
  const canDelete = isOwn && !!onDelete;
  const canEdit = isOwn && !!onEdit;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="আরো অপশন"
            onClick={(e) => e.stopPropagation()}
            className={
              className ??
              "h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95"
            }
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isOwn ? (
            <>
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  সম্পাদনা করুন
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-red-600 focus:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  মুছে ফেলুন
                </DropdownMenuItem>
              )}
              {!canEdit && !canDelete && (
                <DropdownMenuItem disabled>কোনো অ্যাকশন নেই</DropdownMenuItem>
              )}
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => setReportOpen(true)}
                disabled={!user}
                className="text-red-600 focus:text-red-700"
              >
                <Flag className="h-4 w-4 mr-2" />
                রিপোর্ট করুন
              </DropdownMenuItem>
              {authorId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setMuteOpen(true)} disabled={!user}>
                    <BellOff className="h-4 w-4 mr-2" />
                    এই ব্যবহারকারীকে মিউট করুন
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        contentType={contentType}
        contentId={contentId}
        reportedUserId={authorId}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই কন্টেন্ট স্থায়ীভাবে মুছে যাবে। পুনরুদ্ধার করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                await onDelete?.();
                setDeleteOpen(false);
              }}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={muteOpen} onOpenChange={setMuteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>মিউট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {authorName ? `"${authorName}" এর` : "এই ব্যবহারকারীর"} পোস্ট আপনার ফিড থেকে লুকিয়ে
              যাবে। তিনি জানবেন না যে আপনি মিউট করেছেন। যেকোনো সময় আনমিউট করতে পারবেন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (authorId) mute.mutate(authorId);
                setMuteOpen(false);
              }}
            >
              মিউট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
