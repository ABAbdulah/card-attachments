# Subscription tracker from bank statements: product and implementation plan

## 1. The product in one line

**"Upload your bank statement. See every subscription charging your card and what it really costs you, with no bank login."**

The original pain is "I don't know where my card is saved", which is wider than subscriptions. So the app answers two questions:

1. **What is charging me repeatedly?** (subscriptions)
2. **Who has my card at all?** (every merchant that ever charged it, including one-time ones)

Platforms: iOS and Android, built with React Native.

## 2. Improvements on the raw idea

| Raw idea | Improved version |
|---|---|
| Upload 1-year statement | Accept PDF (including password-protected), CSV/Excel and photos of paper statements. Allow several cards or banks. |
| Detect subscriptions | Give each one a confidence level (Confirmed / Likely / Check this) and let the user confirm or reject it. Never silently guess. |
| Toggle off = unsubscribed | The toggle cannot actually cancel anything, so the app must say so. Toggling off opens a **cancel guide** (direct link and steps for that service). |
| (new) | **Verification:** when the next statement is uploaded, warn "You marked Spotify cancelled but it charged you again on 3 Dec". |
| Cost in local currency | Show both the original price ($20) and what the bank really charged (e.g. Rs 5,930 including FX markup and taxes). The statement is the only place that true number exists. |
| Monthly total | Show two numbers: **due this month** (real cash, including an annual plan renewing now) and **monthly average** (yearly plans ÷ 12). |
| Add or remove manually | Searchable catalog of about 300 services with logos and typical prices, plus custom entries. |
| (new) | Renewal reminders 3 days before a charge, price-increase alerts, free-trial end alerts, duplicate detection and "you've spent Rs X on this in total". |

## 3. Privacy is the main selling point

Competitors such as Rocket Money and Truebill require a bank connection, and those connections don't work in Pakistan and most of Asia, the Middle East and Africa. That gap is the market.

This is a market product with user accounts and a cloud database, so the promise is about what we never ask for and never keep:

- **No bank login and no card number, ever.** The app only reads a statement the user chooses to upload.
- The statement file is parsed in server memory and **deleted immediately**. It is never written to disk or storage.
- Name, account number, balance and address are stripped before any line reaches the AI model.
- Only transactions and subscriptions are stored, in Postgres, tied to the user's account.
- The user can export or permanently delete all their data from Settings (also required by both app stores).
- All traffic is HTTPS; the database is encrypted at rest and not publicly exposed.

## 4. How detection works

1. **Extract:** the app uploads the file to the API, which extracts PDF/CSV text in memory (including password-protected PDFs). Scanned statements and photos go through OCR. Doing this on the server means parsing can be improved without shipping an app update.
2. **Structure:** a small AI model turns messy lines into clean transactions (date, merchant, amount, currency). This handles any bank format without writing a parser per bank.
3. **Normalize merchants:** `OPENAI *CHATGPT SUBSCR`, `GOOGLE*YOUTUBEPREMIUM` and `APPLE.COM/BILL` are mapped through a merchant catalog of descriptor patterns to a name, logo, category and cancel link.
4. **Detect recurrence:** group by merchant and look for weekly, monthly or yearly cadence. Allow ±3 days and ±10% on amount, because FX rates shift the charge each month.
5. **Score:**
   - Known subscription merchant plus regular cadence: **Confirmed**
   - Unknown merchant with regular cadence: **Likely**
   - Known merchant with a single charge: **Check this** (it may be annual)

Known hard cases to design for:

- Apple and Google Play bundle many apps under one descriptor, so the app asks the user to split them.
- An annual plan appears only once in a 12-month statement.
- Usage-based charges (API credits, ride apps) are not subscriptions.

## 5. Screens

1. **Onboarding:** privacy promise, then choose currency.
2. **Import:** pick a file, enter the PDF password if needed, see progress.
3. **Review:** detected subscriptions as cards to confirm or reject.
4. **Dashboard:** due this month, monthly average, yearly total, upcoming renewals.
5. **Subscriptions list:** active/cancelled toggle, with savings shown ("You saved Rs 4,200/month").
6. **Subscription detail:** charge history, price changes, cancel guide.
7. **Card exposure:** every merchant that holds your card.
8. **Add/Edit**, **Settings** and **Paywall**.

## 6. Tech stack

| Layer | Choice |
|---|---|
| App | React Native CLI (bare, no Expo) + TypeScript |
| Navigation | React Navigation |
| App state and API | TanStack Query for server data, Zustand for UI state |
| Backend | Node.js + Express (TypeScript) REST API, hosted on Railway |
| Database | PostgreSQL on Railway, Prisma for schema and migrations |
| Auth | Email OTP plus Google and Apple sign-in; JWT access and refresh tokens |
| PDF/CSV text | pdf.js on the server (handles password PDFs) |
| OCR | Server-side OCR for scanned statements and photos |
| AI parsing | Claude Haiku with structured JSON output, at roughly a few cents per statement |
| Background jobs | Queue worker on Railway (BullMQ + Redis) for parsing and reminders |
| FX rates | Rates API, cached daily in Postgres |
| Reminders | Push notifications through Firebase Cloud Messaging |
| Payments | RevenueCat |
| Analytics and errors | PostHog and Sentry, events only and never financial data |

Statement extraction is the least proven part of this stack and is what the Phase 0 spike tests.

### Development setup (no Expo)

- **Android:** Android Studio emulator, started once and then driven from the VS Code terminal with `npx react-native run-android`. Works fully on Windows.
- **Emulator inside VS Code:** the Radon IDE extension shows the device in a VS Code panel with debugging. Its Windows support should be confirmed before relying on it; the Android Studio emulator is the fallback.
- **iOS:** Apple only allows iOS builds on macOS. Without a Mac, iOS builds run on a cloud Mac service (Codemagic or GitHub Actions macOS runners) and are tested through TestFlight on a real iPhone. A Mac is needed for comfortable iOS debugging.
- **Plan:** develop and test on Android daily; build iOS in the cloud from the same code each week.

### Data model (PostgreSQL)

- **users:** id, email, auth_provider, home_currency, plan (free / pro), created_at
- **devices:** id, user_id, push_token, platform
- **cards:** id, user_id, nickname, bank, last4, currency
- **statements:** id, card_id, period_start, period_end, imported_at (metadata only; the file is not kept)
- **transactions:** id, statement_id, date, raw_description, merchant_id, amount_local, amount_original, original_currency
- **merchants:** id, name, logo, category, cancel_url, descriptor_patterns, is_subscription_service (shared catalog, updated centrally for all users)
- **subscriptions:** id, user_id, merchant_id, card_id, cadence, price_original, currency, last_charged_local, next_renewal, status (active / cancelled), source (detected / manual), confidence, cancelled_at

## 7. Monetization

- **Free:** one statement scan, all detected subscriptions visible, manual tracking of up to 5.
- **Pro:** unlimited scans and cards, reminders, verification alerts, price-increase alerts, card exposure list, export.
- **Pricing:** offer a **lifetime purchase** alongside a cheap yearly plan. An app that fights subscriptions will get pushback if it is subscription-only.
- **Hook:** the first scan shows "You're paying Rs 18,400/month across 11 subscriptions". That moment is the paywall trigger and the shareable screenshot.

## 8. Build plan (about 11 weeks solo)

The task-level breakdown with IDs is in [TASKS.md](TASKS.md); the design direction and gamification rules are in [DESIGN.md](DESIGN.md). The table below is the summary.

| Phase | Duration | Deliverable |
|---|---|---|
| **0. Spike** | 1 week | Collect 10–15 real statements from 5+ banks and prove extraction and detection reach 90% or better. Do this before building any UI. |
| **1. Backend foundation** | 2 weeks | Node.js + Express API and Postgres on Railway, Prisma schema, auth (OTP, Google, Apple), staging and production environments |
| **2. Core app** | 2 weeks | React Native CLI project, sign-in, manual add/edit/remove, toggle, dashboard totals, currency conversion |
| **3. Import pipeline** | 2 weeks | File upload, server extraction, PII stripping, AI parser, job queue, review screen |
| **4. Detection quality** | 1.5 weeks | Merchant catalog (300 services), recurrence engine, confidence levels, test suite on real statements |
| **5. Retention features** | 1.5 weeks | Push reminders, re-upload verification, cancel guides, card exposure, OCR |
| **6. Launch** | 1 week | Paywall, privacy policy, account deletion, cloud iOS build, store listings, beta via TestFlight and Play internal testing |

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Bank formats vary wildly | AI parsing instead of per-bank parsers, validated in Phase 0 |
| Wrong detections destroy trust | Confidence levels plus a user review step; nothing is added silently |
| Users fear uploading statements | File deleted right after parsing, PII stripping, no bank login, plain-language privacy screen |
| Financial data stored in the cloud | Store only transactions, never the file or full account numbers; encryption at rest, private database networking, daily backups, account deletion |
| No Mac for iOS builds | Cloud Mac builds (Codemagic or GitHub Actions) plus TestFlight; Android-first daily development |
| One-time-use app (scan once, leave) | Reminders, monthly re-upload verification and price alerts give reasons to return |
| Store review for a finance app | No bank connection and no money movement; clear privacy labels and policy |

## 10. Later versions

- Email receipt scanning (Gmail) to catch subscriptions between statements.
- Bank SMS alert parsing on Android for live tracking (Play Store restricts SMS permissions, so this needs a policy review first).
- Shared or family view.
- Web dashboard on the same API.

## 11. Open decisions

1. **Launch market:** recommended Pakistan first (PKR default; test with HBL, Meezan, UBL, Alfalah and SadaPay/NayaPay statements), with a global-ready design.
2. **Phase 0 material:** a real one-year statement, with sensitive parts hidden if preferred, is the best test case.
3. **App name and branding:** needed before Phase 6, not before.
4. **iOS builds:** confirm whether a Mac is available; if not, pick the cloud build service in Phase 1.

## 12. Next step

Phase 0: build the extraction and detection spike as a small Node script against a real statement, then set up the Railway project (API and Postgres) and the React Native CLI app in this folder.
