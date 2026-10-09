# Project architecture rules

- Fetch reactions for all visible posts under one shared React Query key; this prevents one database request per post while preserving per-post optimistic updates.- Keep `.env` tracked in git (not in .gitignore); the hosted build reads VITE_SUPABASE_* from it — ignoring it breaks the preview with "Missing Supabase environment variable(s)".
- Fetch comment author avatars in one scoped profile query per opened comment section; this avoids one request per comment and keeps profile photos current.
- Fetch visible post author avatars together for each feed surface; this avoids one database query per post while showing current profile photos.

- Lazy-load heavy, below-the-fold or on-demand UI (sheets, large crop data widgets) with React.lazy + Suspense, and use .webp for bundled images; keeps first-load bundles small as features grow.
- Keep crop availability and optional crop imagery in the master catalog, and render crop identity with CropIcon; shared selectors and adapters propagate new crops without duplicate lists.
- Keep pesticide chemistry (IRAC/FRAC, PHI, safety), stage irrigation and IPM rules in src/data/crop-knowledge.ts layered on the master catalog; one lookup serves spray, plan and history views.

- Prices mentioned in posts/comments are captured as community price reports tagged with origin_type/origin_id; one AI extraction per saved post/comment, only for the author.
- Group chat membership changes go through security-definer RPCs (create_group_chat/add_group_members/remove_group_member) that only allow accepted friends; clients never write group_chat_members directly.
- Keep the expanded crop finance ledger in normal page flow and restrict scroll-reveal behavior to its collapsed bar; long ledgers must remain visible and fully scrollable.
