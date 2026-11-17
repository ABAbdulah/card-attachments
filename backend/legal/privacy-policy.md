# CardSweep privacy policy

Last updated: [DATE]

CardSweep helps you find and manage the subscriptions charged to your bank card. This policy explains what we collect, why, and what you can do about it. CardSweep is operated by [COMPANY NAME] ("we").

## The short version

- We never ask for your bank login, card number or bank password.
- When you upload a statement, we read it in memory and delete the file straight away. We never store the file.
- We keep only your card payments (date, merchant name, amount). Transfers, balances and other people's names are thrown away.
- We do not sell your data or use it for advertising.
- You can export or permanently delete everything from Settings at any time.

## What we collect

**Account details.** Your email address, which we use to send sign-in codes. Optionally a display name, your home currency and a monthly savings goal.

**Card payments from statements you upload.** For each card payment: the date, the merchant text printed on the statement (for example "Spotify P48c35d205 Stockholm"), the amount charged and, when the statement shows it, the original foreign-currency amount. We also keep the name of the bank and the period the statement covers.

**What we do not keep from statements.** The statement file itself, your name, address, account number, IBAN, card number, balances, transfers to or from other people, and mobile top-ups. These are discarded while the file is being read and are never stored.

**Subscriptions and progress.** The subscriptions you confirm or add, their prices and renewal dates, which ones you cancelled, and your in-app progress (XP, level, streak and badges).

**Device information.** If you allow notifications, reminders are scheduled on your phone. We do not collect your contacts, photos, location or files other than the statement you choose.

## How statements are read

1. You pick a statement file (PDF or CSV) on your phone.
2. It is sent to our server over an encrypted connection.
3. Our server reads it in memory. For most supported banks this happens entirely on our server.
4. For banks we do not yet support directly, the text of the statement may be sent to our AI provider, Anthropic, to be converted into a list of transactions. Before that, we remove names, account numbers, IBANs, card numbers, ID numbers, phone numbers and email addresses from the text. Anthropic processes it under its commercial terms and does not use it to train its models.
5. The file is deleted from memory as soon as reading finishes.

## Why we use your data

- To show your subscriptions, what they cost in your currency and when they renew.
- To detect new subscriptions, price increases and charges after you cancelled something.
- To send sign-in codes.
- To run your progress features (XP, streaks and badges).
- To keep the service secure and fix problems.

We process this data to provide the service you asked for. We do not use it for advertising, and we do not sell or rent it.

## Who we share it with

Only the service providers we need to run CardSweep, each limited to their job:

| Provider | What they do | What they receive |
|---|---|---|
| Railway | Hosts our server and database | All stored data, encrypted at rest |
| Resend | Sends sign-in emails | Your email address and the code |
| Anthropic | Reads statements from unsupported banks (when used) | Statement text with personal details removed |
| RevenueCat, Apple, Google | Process purchases (when you buy Pro) | Your account ID and purchase details |
| open.er-api.com | Exchange rates | Nothing about you |

We will disclose data if the law requires it, and we will tell you when we are allowed to.

## How long we keep it

We keep your data while your account exists. When you delete your account in Settings, everything is deleted from our database immediately and from backups within [30] days.

## Your choices and rights

- **Export:** Settings → Export my data gives you everything we store about you.
- **Delete:** Settings → Delete my account permanently deletes your account and data.
- **Correct:** you can edit or remove any subscription in the app.
- **Remove a statement:** Cards → Statements scanned → remove deletes the payments that statement added.
- **Notifications:** turn reminders off in Settings or in your phone settings.

Depending on where you live, you may have further rights, such as asking what we hold about you or objecting to how it is used. Contact us at [SUPPORT EMAIL] and we will reply within 30 days.

## Security

Data travels over encrypted connections (HTTPS). Sign-in tokens are stored in your phone's secure storage (Keychain on iPhone, Keystore on Android). Our database is not publicly reachable. No system is perfectly secure, and we will tell you promptly if a breach affects your data.

## Children

CardSweep is not intended for anyone under 16, and we do not knowingly collect their data.

## Changes

If we change this policy in a way that matters, we will tell you in the app before the change applies.

## Contact

[COMPANY NAME], [ADDRESS]
[SUPPORT EMAIL]
