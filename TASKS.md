# Task list by phase

Product plan: [PLAN.md](PLAN.md). Design guide: [DESIGN.md](DESIGN.md).

Each task has an ID so it can be picked individually (for example "implement P2-T3").

Status: `[x]` done and tested, `[~]` built but waiting on an account, key or more data, `[ ]` not started.

## Phase S: Project setup

- [x] **S-T1** Git repository, `mobile/` and `backend/` folders
- [x] **S-T2** React Native CLI app (0.88, TypeScript, no Expo), Android package `com.appletto.subtrack`
- [x] **S-T3** Mobile libraries: React Navigation, Reanimated, Gesture Handler, SVG, TanStack Query, Zustand, Lucide icons
- [x] **S-T4** Theme tokens (dark and light), `useTheme()`, contrast test
- [x] **S-T5** Navigation shell
- [x] **S-T6** Backend: Node.js + Express + TypeScript, env validation, logging, error handling, health endpoints, tests
- [x] **S-T7** Prisma schema and migrations
- [x] **S-T8** Local Postgres through Docker Compose (port 5440)

## Phase 0: Detection spike

- [~] **P0-T1** Real statements in the git-ignored `statements/` folder. 1 bank so far (SadaPay, 3.5 months). Needs more banks and a 12-month export.
- [x] **P0-T2** PDF text extraction (password-protected PDFs supported) and CSV reader; SadaPay parser checked against the statement's own totals
- [~] **P0-T3** Personal-data stripping and AI structuring. Built and unit-tested (redaction); the AI call is untested until `ANTHROPIC_API_KEY` is set.
- [x] **P0-T4** Recurring-charge detection (`backend/scripts/spike.ts`)
- [~] **P0-T5** Accuracy check. Needs your confirmation of which SadaPay results are right.

## Phase 1: Backend foundation

- [~] **P1-T1** Railway: `backend/railway.json` ready. Needs your Railway account to create the project.
- [x] **P1-T2** Email one-time code sign-in, JWT access tokens, rotating refresh tokens with reuse detection
- [ ] **P1-T3** Google and Apple sign-in (needs OAuth client IDs and Apple developer account)
- [x] **P1-T4** Auth middleware, rate limiting on code requests, request validation
- [x] **P1-T5** Profile, home currency, savings goal, export my data, delete my account
- [~] **P1-T6** Deploy pipeline (build, migrate, seed, health check) configured; production API URL to set after the first deploy
- [ ] **P1-T7** Error tracking (Sentry)

## Phase D: Design system and components

- [ ] **D-T1** Mobbin references (needs the Mobbin connector authorised)
- [x] **D-T2** IBM Plex Sans bundled for Android and iOS
- [x] **D-T3** Base components: AppText, Button, Surface, Input, Chip, Screen, HeaderButton
- [x] **D-T4** Subscription row, merchant avatar (brand colour + initials)
- [x] **D-T5** Animated active/cancelled toggle with spring and haptic
- [x] **D-T6** Animated money counter
- [x] **D-T7** Progress ring (SVG) and progress bar
- [x] **D-T8** Bottom sheet, toast, skeletons, empty and error states, segmented control, celebration overlay
- [ ] **D-T9** Component tests (only the theme contrast test exists)

## Phase 2: Core app

- [x] **P2-T1** API client with Keychain/Keystore token storage and automatic refresh
- [x] **P2-T2** Welcome, email, 6-digit code and currency onboarding screens
- [x] **P2-T3** Subscriptions endpoints (list, create, update, delete, toggle with rewards)
- [x] **P2-T4** Cards endpoints
- [x] **P2-T5** Exchange rates: daily refresh from open.er-api.com, cached in Postgres, offline fallback table
- [x] **P2-T6** Subscriptions list with active/cancelled toggle and honest cancel sheet
- [x] **P2-T7** Add/Edit with catalog search (98 services) and custom entry
- [x] **P2-T8** Subscription detail: real vs listed price, charge history, cancel guide
- [x] **P2-T9** Home dashboard: due this month (paid / still to come), monthly average, yearly, upcoming, categories, level and streak
- [x] **P2-T10** Settings: currency, reminders, plan, export, delete account, sign out

## Phase 3: Statement import

- [x] **P3-T1** Upload endpoint that parses in memory and never stores the file
- [x] **P3-T2** Extraction service (SadaPay PDF, password PDFs, generic CSV)
- [~] **P3-T3** AI reader for other banks (needs `ANTHROPIC_API_KEY`)
- [ ] **P3-T4** Job queue: not needed yet (an import takes about 5 seconds); revisit if the AI reader is slow for 12-month statements
- [x] **P3-T5** Import flow: file picker, password prompt, staged progress, result summary
- [x] **P3-T6** Review screen: confirm or reject each suggestion
- [x] **P3-T7** Duplicate handling for overlapping statements (identical same-day charges are kept)

## Phase 4: Detection quality

- [~] **P4-T1** Merchant catalog: 98 services (target 300)
- [x] **P4-T2** Recurrence engine: weekly, monthly, quarterly, yearly with tolerances
- [x] **P4-T3** Confidence scoring
- [~] **P4-T4** Hard cases: usage-based billing, one-off merchants and Google Play handled; Apple bundle splitting not built
- [~] **P4-T5** Regression tests on synthetic statements; real-statement fixtures need anonymised samples
- [x] **P4-T6** Price-increase alerts

## Phase 5: Gamification

- [x] **P5-T1** XP events (once per action), 11 levels, monthly streak, savings goal
- [x] **P5-T2** 11 badges evaluated on the server
- [x] **P5-T3** Progress screen: savings ring, level, streak, badge grid, recent XP
- [x] **P5-T4** Celebration: haptic, counting totals, confetti, +XP, new badges
- [ ] **P5-T5** First-run checklist on Home
- [~] **P5-T6** Share savings (text share works; image card not built)

## Phase 6: Retention

- [~] **P6-T1** Renewal reminders 3 days ahead, scheduled on the device with Notifee (no push server needed). Server push via Firebase not set up.
- [x] **P6-T2** Re-upload verification: still-charging alerts and confirmed-cancellation badge
- [x] **P6-T3** Cancel guides with billing links for catalog services
- [x] **P6-T4** Cards tab: every merchant that charged the card, filters, statements list
- [ ] **P6-T5** OCR for scanned statements and photos
- [ ] **P6-T6** Free-trial end alerts

## Phase 7: Monetization and launch

- [~] **P7-T1** RevenueCat webhook endpoint built; needs RevenueCat account, store products and the mobile SDK
- [x] **P7-T2** Paywall screen and free-plan limits (1 scan, 5 manual subscriptions), test-account Pro switch
- [ ] **P7-T3** Analytics (PostHog)
- [ ] **P7-T4** Privacy policy and terms
- [ ] **P7-T5** App icon, splash screen, final name
- [ ] **P7-T6** iOS cloud build and TestFlight
- [ ] **P7-T7** Android release signing and Play internal testing
- [ ] **P7-T8** Store listings
- [ ] **P7-T9** Beta round
