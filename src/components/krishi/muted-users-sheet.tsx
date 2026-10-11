import { BottomSheet } from "@/components/krishi/bottom-sheet";
import { useMutedListPaginated, useMuteMutation } from "@/hooks/use-muted-users";
import { BellOff, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { LazyImage } from "@/components/krishi/lazy-image";

export function MutedUsersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    totalCount,
    data: list,
    isLoading,
    PAGE_SIZE,
  } = useMutedListPaginated();
  const { unmute } = useMuteMutation();

  const showPagination = totalCount > PAGE_SIZE;

  return (
    <BottomSheet open={open} onClose={onClose} title="মিউট করা ব্যবহারকারীরা">
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="নাম বা জেলা দিয়ে খুঁজুন..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !list || list.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {search.trim() ? "কোনো ফলাফল পাওয়া যায়নি" : "আপনি কাউকে মিউট করেননি"}
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
              {list.map((row: any) => {
                const p = row.profile;
                const name = p?.name || "অজ্ঞাত ব্যবহারকারী";
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold overflow-hidden shrink-0">
                      {p?.avatar_url ? (
                        <LazyImage
                          src={p.avatar_url}
                          alt={name}
                          wrapperClassName="h-full w-full rounded-full"
                        />
                      ) : (
                        <span>{name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{name}</p>
                      {p?.district && (
                        <p className="text-[11px] text-muted-foreground truncate">{p.district}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => unmute.mutate(row.muted_id)}
                      disabled={unmute.isPending}
                      className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-bold active:scale-95 disabled:opacity-50"
                    >
                      আনমিউট
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {showPagination && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                  পেছনে
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95"
                >
                  সামনে
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
