# Project architecture rules

- Fetch reactions for all visible posts under one shared React Query key; this prevents one database request per post while preserving per-post optimistic updates.