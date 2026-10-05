# Project architecture rules

- Fetch reactions for all visible posts under one shared React Query key; this prevents one database request per post while preserving per-post optimistic updates.- Keep `.env` tracked in git (not in .gitignore); the hosted build reads VITE_SUPABASE_* from it — ignoring it breaks the preview with "Missing Supabase environment variable(s)".
- Fetch comment author avatars in one scoped profile query per opened comment section; this avoids one request per comment and keeps profile photos current.
- Fetch visible post author avatars together for each feed surface; this avoids one database query per post while showing current profile photos.

- Lazy-load heavy, below-the-fold or on-demand UI (sheets, large crop data widgets) with React.lazy + Suspense, and use .webp for bundled images; keeps first-load bundles small as features grow.
- Keep crop availability and optional crop imagery in the master catalog, and render crop identity with CropIcon; shared selectors and adapters propagate new crops without duplicate lists.
