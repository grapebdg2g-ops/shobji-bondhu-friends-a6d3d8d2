export function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    <img src={url} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-black text-primary">
      {name.charAt(0) || "ক"}
    </span>
  );
}

export function FriendPicker({
  friends,
  picked,
  setPicked,
}: {
  friends: Array<{ id: string; name: string; avatar_url: string | null; district: string | null }>;
  picked: string[];
  setPicked: (v: string[]) => void;
}) {
  if (!friends.length) return <p className="py-6 text-center text-sm text-muted-foreground">যোগ করার মতো কোনো বন্ধু নেই</p>;
  return (
    <div className="max-h-[50vh] divide-y divide-border overflow-y-auto">
      {friends.map((f) => {
        const on = picked.includes(f.id);
        return (
          <label key={f.id} className="flex cursor-pointer items-center gap-3 py-2.5">
            <Avatar name={f.name} url={f.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{f.name}</p>
              {f.district && <p className="text-[11px] text-muted-foreground">{f.district}</p>}
            </div>
            <input
              type="checkbox"
              checked={on}
              onChange={() => setPicked(on ? picked.filter((x) => x !== f.id) : [...picked, f.id])}
              className="h-5 w-5 accent-primary"
            />
          </label>
        );
      })}
    </div>
  );
}
