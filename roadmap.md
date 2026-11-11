# Tasks

## কৃষক বার্তা link previews
- [x] Show source-linked featured image and headline in home and community posts.
- [x] Collect publisher images for new posts and enrich the existing real post; verified publisher image and source opening at 384px and 1280px, with four passing tests.

## Notification reliability
- [x] Stop repeat permission prompts and silently refresh permitted device registration; granted-permission account reloaded twice without a prompt (preview does not register push).
- [x] Check scheduled delivery (06:00 Dhaka run delivered one push on Nov 10), preserve failed pushes for retry on subsequent dispatch, centralize crop push dispatch, and pass four focused tests.
- [ ] Verify locked-phone delivery after publishing — needs the user's physical device; browser preview cannot receive production pushes and exact arrival also depends on phone/network settings.

## কৃষক বার্তা troubleshooting
- [x] Diagnose missing posts: published run returns no news; local RSS/AI succeeds but bot creation fails because the Cloud backend hostname cannot resolve.
- [x] Cloud is reachable and a real news post is visible; enriched its source and image and verified it in the home feed.

## Dashboard weather
- [x] Show weather without a profile district using GPS or an explicit Dhaka fallback.
- [x] Allow guest-friendly district selection and verify actual forecasts.

## AI settings repair
- [x] Confirm and connect price extraction and transcription to saved settings, including disabled state.
- [x] Run focused regression tests and verify settings-driven requests.

- [x] Crop stages: close gaps, single current-stage logic, invariant tests.
- [x] PHI engine: first-harvest based, all chemicals, all plans; weather heat bug.
- [x] Chemical data: safety info for all guide medicines, carbofuran gated, brand removed, boron off late blight.
- [x] Tomato schedule: IPM-based, capped, no chemicals in harvest window.
- [x] Spray log with safety checklist, first-aid card, harvest-ban badge.
- [x] Plan creation: variety + land; Bangla calendar; land shared with spray section.
- [x] Plan page "today" card first; farming in bottom menu; duplicate plan list merged; friendly errors.
- [x] Variety-based timeline scaling, fertilizer reminders, weather-triggered IPM alerts, lint auto-fix (1673→44).
- [x] Stable task IDs (title-based; old ticks honoured and re-saved).

## UI/UX audit
- [x] Zoom, lang=bn, safe-area, 44px buttons
- [x] App-styled delete confirmation (chat, moderation)
- [x] District search; phone +880 normalization
- [x] Guest access: introduction homepage, today's prices, crop guides
- [x] Forecast range band + disclaimer; removed fake online dot in message list
- [x] Feed one-tap reaction; larger dose/money text; max-w-6xl page width + back button

## Current request
- [x] Highlight market prices and farmer social connections; remove planning promotion from introduction
- [x] Show up to 10 real social posts safely and add contact number (currently 7 real posts)
- [x] Match embedded finance header to brand gradient without visual glitches
- [x] Make the full spray schedule section collapsible
- [x] Verify public pages and anonymous writes; no current account plan available for live control check
