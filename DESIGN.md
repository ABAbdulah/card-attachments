# Design guide

Direction: **modern, minimalist, gamified**. The app handles money, so it must feel calm and trustworthy first. The game layer is a reward for good decisions, not decoration.

Tokens live in [mobile/src/theme/tokens.ts](mobile/src/theme/tokens.ts). Screens read them through `useTheme()` and never hardcode a colour, spacing value or radius.

## Sources

| Source | Status | What it gave us |
|---|---|---|
| UI/UX Pro Max skill | Used | Fintech base: dark-first style, trust blue plus profit green palette, IBM Plex Sans, accessibility and touch rules below |
| Watermelon UI | Used as reference only | Its components are web (React + Tailwind + Motion) and cannot be installed in React Native. The patterns listed under "Reference components" are rebuilt with Reanimated and SVG. |
| Mobbin | Not connected | The Mobbin connector needs to be authorised before it can be searched. Task D-T1 covers pulling real-app references once it is. |

## Principles

1. **One number per screen.** Each screen leads with a single figure (due this month, saved so far) in the display size. Everything else is secondary.
2. **Dark first, light supported.** Both themes are defined together and both pass WCAG AA contrast (checked by `mobile/__tests__/tokens.test.ts`).
3. **Three functional colours only.** Blue is action, green is money saved, amber is game reward. Red is reserved for destructive actions and "still charging you" warnings.
4. **Flat surfaces.** Depth comes from surface colour steps and 1px borders, not shadows or blur.
5. **Motion explains a change.** Totals count down when a subscription is switched off; nothing animates purely for decoration.

## Tokens

### Colour

| Role | Dark | Light | Use |
|---|---|---|---|
| background | `#0B1120` | `#F8FAFC` | Screen background |
| surface | `#131C2E` | `#FFFFFF` | Cards, tab bar |
| surfaceRaised | `#1B2640` | `#EEF2F7` | Selected tabs, secondary buttons, ring tracks |
| text | `#F8FAFC` | `#0F172A` | Primary text |
| textMuted | `#94A3B8` | `#475569` | Secondary text |
| primary | `#2563EB` | `#1E40AF` | Buttons, active tab |
| success | `#10B981` | `#047857` | Savings, cancelled state |
| reward | `#F59E0B` | `#B45309` | Streak, XP, badges |
| danger | `#F87171` | `#DC2626` | Delete, charge warnings |

### Type

IBM Plex Sans, bundled in `mobile/assets/fonts` (Regular, Medium, SemiBold, Bold). Scale: display 40, title 24, heading 18, body 16, label 14, caption 12. Every money figure uses tabular numbers so digits do not shift while animating.

### Spacing, shape, motion

- Spacing on a 4pt grid: 4, 8, 12, 16, 24, 32, 48.
- Radius: 8 (chips), 12 (inputs), 16 (cards), 24 (sheets), full (pills, toggles).
- Motion: 150ms fast, 220ms base, 320ms slow; springs for presses, toggles and celebrations. Reduced-motion setting is respected everywhere.
- Touch targets at least 48dp. Icons from Lucide only, one stroke weight, never emoji.

## Gamification

The game layer rewards the three behaviours that make the product valuable: reviewing, cancelling and coming back.

| Mechanic | Rule | Where it shows |
|---|---|---|
| **Savings ring** | Money saved per month from cancelled subscriptions, against a goal the user sets | Home (small), Progress (large) |
| **XP and level** | XP for confirming a detected subscription, cancelling one, uploading a statement, adding one manually | Progress |
| **Monthly streak** | One upload or full review per calendar month keeps the streak | Progress, Home chip |
| **Badges** | First scan, First cancel, Clean sweep (all detections reviewed), Saved 10k / 50k / 100k, 3 / 6 / 12-month streak, Verified (a cancellation confirmed by a later statement) | Progress |
| **Celebration** | Toggling a subscription off: haptic, total counts down, short confetti burst, "+XP" chip | Subscriptions list and detail |

Rules that keep it minimalist and honest:

- The game lives on the **Progress** tab and in short moments after an action. It never covers financial information.
- No lost-streak guilt notifications, no fake urgency, no rewards for subscribing to anything.
- All game values are computed on the server so they follow the account across devices.

## Navigation

Four bottom tabs, each with icon and label: **Home**, **Subscriptions**, **Cards**, **Progress**. Settings opens from the Home header. Import, Review, Add/Edit and Paywall are modal flows above the tabs.

## Reference components (Watermelon UI, to port)

| Watermelon entry | Used for |
|---|---|
| Subscription Calendar | Upcoming renewals view on Home |
| Labeled Progress Indicator | Statement import progress (extracting, reading, detecting) |
| Onboarding Checklist | First-run checklist that also awards the first XP |
| Switch Mode | Spring feel of the active/cancelled toggle |
| Returns Calculator Snippet | Animated number counting on totals |

## Screen checklist (apply before a screen is called done)

- One primary action per screen.
- Both themes checked; text contrast at least 4.5:1.
- Safe areas respected; list content not hidden behind the tab bar.
- Loading shows skeletons, empty states explain the next step, errors offer retry.
- Every tappable element has a pressed state and an accessibility label.
- Works at the largest system text size and with reduced motion on.
