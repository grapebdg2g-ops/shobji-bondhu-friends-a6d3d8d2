# Project architecture rules

- Fetch reactions for all visible posts under one shared React Query key; this prevents one database request per post while preserving per-post optimistic updates.- Keep `.env` tracked in git (not in .gitignore); the hosted build reads VITE_SUPABASE_* from it — ignoring it breaks the preview with "Missing Supabase environment variable(s)".
