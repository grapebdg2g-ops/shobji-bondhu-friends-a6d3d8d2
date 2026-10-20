# Project architecture rules

- All AI entry points resolve per-feature settings at request time, preserve disabled rows, and use provider-specific text/audio protocols; prevents successful admin saves from being silently ignored.

- Serve the landing community preview through an anonymous, read-only server function with an explicit field allowlist and bounded latest-post query; never expose private profiles or use admin access for it.

- Keep the introduction, market prices and static crop guides public through the shared public-page matcher and navigation; anonymous database access is read-only for market data, while personal plans and write actions require authentication.

- Fetch reactions for all visible posts under one shared React Query key; this prevents one database request per post while preserving per-post optimistic updates.- Keep `.env` tracked in git (not in .gitignore); the hosted build reads VITE_SUPABASE_* from it — ignoring it breaks the preview with "Missing Supabase environment variable(s)".
- Fetch comment author avatars in one scoped profile query per opened comment section; this avoids one request per comment and keeps profile photos current.
- Fetch visible post author avatars together for each feed surface; this avoids one database query per post while showing current profile photos.

- Lazy-load heavy, below-the-fold or on-demand UI (sheets, large crop data widgets) with React.lazy + Suspense, and use .webp for bundled images; keeps first-load bundles small as features grow.
- Keep crop availability and optional crop imagery in the master catalog, and render crop identity with CropIcon; shared selectors and adapters propagate new crops without duplicate lists.
- Keep pesticide chemistry (IRAC/FRAC, PHI, safety), stage irrigation and IPM rules in src/data/crop-knowledge.ts layered on the master catalog; one lookup serves spray, plan and history views.

- Prices mentioned in posts/comments are captured as community price reports tagged with origin_type/origin_id; one AI extraction per saved post/comment, only for the author.
- Group chat membership changes go through security-definer RPCs (create_group_chat/add_group_members/remove_group_member) that only allow accepted friends; clients never write group_chat_members directly.
- Render crop finance below stage progress inside the plan header in normal page flow, without scroll listeners or sticky positioning; both the toggle and expanded ledger must remain stable and fully scrollable.
- Keep GAP (good agricultural practice) protocol rules in src/data/gap-protocol.ts keyed by Bangla crop name and gated by user_crop_plans.is_gap; GAP checklist completions reuse crop_task_completions with 'gap:' task ids.
- Compute the current crop stage only via `stageAtDay` and harvest start via `firstHarvestDay` (src/lib/crop-stage.ts); master stages are normalized to cover 0..totalDays so every screen agrees.
- Spray harvest-safety (PHI) uses the longest PHI of every offered chemical counted from first harvest, applied to all plans via `applyPhiSafety`; real sprays are recorded in `spray_logs` behind a safety checklist.
- Scale stage timelines to the chosen variety only via scaleGuide/varietyDays (src/lib/crop-timeline.ts), clamped ±30%; keeps every screen and reminder on one timeline.
- Save crop checklist ticks with stableTaskId (src/lib/task-id.ts, title-based) and read via isTaskDone, which also honours legacy index ids; reordering guide tasks must never move a farmer's tick.
