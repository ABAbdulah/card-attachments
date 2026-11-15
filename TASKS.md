# Task list by phase

Product plan: [PLAN.md](PLAN.md). Design guide: [DESIGN.md](DESIGN.md).

Each task has an ID so it can be picked individually (for example "implement P2-T3"). Tasks inside a phase are listed in the order they should be built. "Needs" names tasks that must be finished first.

Status: `[x]` done, `[ ]` not started.

## Phase S: Project setup (done)

- [x] **S-T1** Git repository, `mobile/` and `backend/` folders
- [x] **S-T2** React Native CLI app (0.88, TypeScript, no Expo), Android package `com.appletto.subtrack`
- [x] **S-T3** Mobile libraries: React Navigation, Reanimated, Gesture Handler, SVG, TanStack Query, Zustand, Lucide icons
- [x] **S-T4** Theme tokens (dark and light), `useTheme()`, contrast test
- [x] **S-T5** Four-tab navigation shell with placeholder screens
- [x] **S-T6** Backend: Node.js + Express + TypeScript, env validation, logging, error handling, health endpoints, tests
- [x] **S-T7** Prisma schema for the full data model and first migration
- [x] **S-T8** Local Postgres through Docker Compose (port 5440)

## Phase 0: Detection spike

Goal: prove statements can be read accurately before building features on top.

- [ ] **P0-T1** Collect 10–15 real statements from 5+ banks into a private, git-ignored folder
- [ ] **P0-T2** Script: extract text from PDF (including password-protected) and CSV
- [ ] **P0-T3** Script: strip personal data, send lines to the AI model, get structured transactions back
- [ ] **P0-T4** Script: group by merchant and detect recurring charges
- [ ] **P0-T5** Measure accuracy against a hand-labelled answer sheet; target 90% or better. Decide go / adjust.

## Phase 1: Backend foundation

- [ ] **P1-T1** Railway project: API service and Postgres, staging and production environments
- [ ] **P1-T2** Auth: email one-time code (send, verify), JWT access and refresh tokens
- [ ] **P1-T3** Auth: Google and Apple sign-in (Needs P1-T2)
- [ ] **P1-T4** Auth middleware, rate limiting, request validation helper
- [ ] **P1-T5** User endpoints: profile, home currency, export my data, delete my account
- [ ] **P1-T6** Deploy pipeline: build, run migrations, health check; set the production API URL in the app
- [ ] **P1-T7** Error tracking (Sentry) on the API

## Phase D: Design system and components

Can run alongside Phase 1.

- [ ] **D-T1** Pull real-app references from Mobbin for dashboard, subscription list, review and paywall (needs the Mobbin connector authorised)
- [ ] **D-T2** Bundle IBM Plex Sans and wire it into the typography tokens
- [ ] **D-T3** Base components: Text, Button, Card, Input, Chip, Screen wrapper
- [ ] **D-T4** List components: subscription row, merchant logo with fallback initials, section header
- [ ] **D-T5** Animated toggle (active/cancelled) with spring and haptic
- [ ] **D-T6** Animated money counter (tabular numbers, counts up and down)
- [ ] **D-T7** Progress ring (SVG) and progress bar
- [ ] **D-T8** Bottom sheet, toast, skeleton loader, empty-state and error-state blocks
- [ ] **D-T9** Component test setup (React Native Testing Library, Jest config for native libraries)

## Phase 2: Core app (manual tracking)

Needs Phase 1 (auth) and D-T3 to D-T6.

- [ ] **P2-T1** API client with token storage (Keychain/Keystore) and automatic refresh
- [ ] **P2-T2** Onboarding and sign-in screens
- [ ] **P2-T3** Backend: subscriptions endpoints (list, create, update, delete, toggle status)
- [ ] **P2-T4** Backend: cards endpoints
- [ ] **P2-T5** Backend: currency rates (daily fetch, cache, conversion with configurable bank markup)
- [ ] **P2-T6** Subscriptions list screen with active/cancelled toggle (Needs P2-T3)
- [ ] **P2-T7** Add/Edit subscription screen with catalog search and custom entry (Needs P2-T3)
- [ ] **P2-T8** Subscription detail screen
- [ ] **P2-T9** Home dashboard: due this month, monthly average, yearly total, upcoming renewals (Needs P2-T5)
- [ ] **P2-T10** Settings screen: currency, theme, account, data export and deletion

## Phase 3: Statement import

Needs Phase 0 result and Phase 2.

- [ ] **P3-T1** Backend: upload endpoint that parses in memory and never stores the file
- [ ] **P3-T2** Backend: extraction service (PDF, password PDF, CSV/Excel), productionised from P0-T2
- [ ] **P3-T3** Backend: personal-data stripping and AI structuring service, from P0-T3
- [ ] **P3-T4** Backend: job queue (BullMQ + Redis) with job status endpoint
- [ ] **P3-T5** App: import flow (file picker, password prompt, staged progress)
- [ ] **P3-T6** App: review screen to confirm or reject each detected subscription
- [ ] **P3-T7** Duplicate handling when overlapping statements are uploaded

## Phase 4: Detection quality

- [ ] **P4-T1** Merchant catalog seed: about 300 services with descriptor patterns, logo, category, cancel link
- [ ] **P4-T2** Recurrence engine: weekly, monthly, quarterly, yearly; date and amount tolerance
- [ ] **P4-T3** Confidence scoring (Confirmed / Likely / Check this)
- [ ] **P4-T4** Hard cases: Apple and Google Play bundles, single annual charge, usage-based charges
- [ ] **P4-T5** Regression test suite built from the Phase 0 statements
- [ ] **P4-T6** Price-increase and duplicate-subscription detection

## Phase 5: Gamification

Needs Phase 2; verification badge needs P6-T2.

- [ ] **P5-T1** Backend: XP events, level calculation, monthly streak, savings goal
- [ ] **P5-T2** Backend: badge rules and award endpoint
- [ ] **P5-T3** Progress screen: savings ring, level, streak, badge grid (Needs D-T7)
- [ ] **P5-T4** Cancel celebration: haptic, count-down total, confetti, "+XP" chip
- [ ] **P5-T5** First-run checklist on Home that awards the first XP
- [ ] **P5-T6** Shareable savings card (image) for social sharing

## Phase 6: Retention

- [ ] **P6-T1** Push notifications: Firebase setup, device registration, renewal reminders 3 days ahead
- [ ] **P6-T2** Re-upload verification: "you marked this cancelled but it charged again"
- [ ] **P6-T3** Cancel guides per merchant (steps and direct link)
- [ ] **P6-T4** Cards tab: every merchant that holds the card, with last charge date
- [ ] **P6-T5** OCR for scanned statements and photos
- [ ] **P6-T6** Free-trial end alerts

## Phase 7: Monetization and launch

- [ ] **P7-T1** RevenueCat: products (yearly, lifetime), entitlement checks on the API
- [ ] **P7-T2** Paywall screen and free-plan limits
- [ ] **P7-T3** Analytics events (PostHog) with no financial data
- [ ] **P7-T4** Privacy policy, terms, in-app privacy explainer
- [ ] **P7-T5** App icon, splash screen, final name and branding
- [ ] **P7-T6** iOS cloud build (Codemagic or GitHub Actions) and TestFlight
- [ ] **P7-T7** Android release signing and Play internal testing
- [ ] **P7-T8** Store listings: screenshots, descriptions, data-safety forms
- [ ] **P7-T9** Beta round with 10–20 users, fix list, public release

## Suggested order

Phase 0 → Phase 1 and Phase D together → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7.

Phase 0 comes first because every later phase depends on statement reading being accurate.
