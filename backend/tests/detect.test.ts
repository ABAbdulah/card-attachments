import { describe, expect, it } from 'vitest';
import { chargesFromParsed, detectSubscriptions } from '../src/modules/detection/detect.js';
import type { ParsedTransaction } from '../src/modules/statements/types.js';

const END = '2026-11-15';

const card = (date: string, description: string, amount: number, usd?: number): ParsedTransaction => ({
  date,
  kind: 'card',
  description,
  amountLocal: -amount,
  ...(usd ? { amountOriginal: usd, originalCurrency: 'USD' } : {}),
});

const detect = (transactions: ParsedTransaction[]) => detectSubscriptions(chargesFromParsed(transactions), END);
const verdictOf = (transactions: ParsedTransaction[], merchant: string) => detect(transactions).find((d) => d.merchant === merchant);

describe('detectSubscriptions', () => {
  it('confirms a known service charged monthly, even when the billing day drifts', () => {
    const d = verdictOf(
      [
        card('2026-08-08', 'Anthropic* Claude Sub San Francisco Ca Usa', 6017.53, 20),
        card('2026-09-12', 'Anthropic* Claude Sub San Francisco Ca Usa', 5991.84, 20),
        card('2026-10-13', 'Anthropic* Claude Sub 548 Market Street', 5995.11, 20),
        card('2026-11-04', 'Anthropic 548 Market Street Pmb 90375', 6002.51, 20),
      ],
      'Claude',
    );
    expect(d).toMatchObject({ verdict: 'CONFIRMED', cadence: 'MONTHLY', charges: 4, monthlyCostLocal: 6002.51 });
  });

  it('confirms usage-based services whose amount changes every month', () => {
    const d = verdictOf(
      [
        card('2026-08-18', 'Railway San Francisco Ca Usa', 2277.22, 7.57),
        card('2026-09-18', 'Railway 548 Market St Pmb 68956', 1802.89, 6.02),
        card('2026-10-20', 'Railway 548 Market St Pmb 68956', 2852.62, 9.53),
      ],
      'Railway',
    );
    expect(d?.verdict).toBe('CONFIRMED');
  });

  it('treats a recent single charge from a known service as a likely new subscription', () => {
    const d = verdictOf([card('2026-11-07', 'Vercel Inc. 440 N Barranca Ave', 6002.51, 20)], 'Vercel');
    expect(d).toMatchObject({ verdict: 'LIKELY', cadence: 'MONTHLY' });
  });

  it('asks the user to check an old single charge that never renewed', () => {
    const d = verdictOf([card('2026-09-22', 'Zoom.com 888-799-9666 55 Almaden', 5400.5, 18)], 'Zoom');
    expect(d?.verdict).toBe('CHECK');
    expect(d?.monthlyCostLocal).toBeUndefined();
  });

  it('flags a confirmed pattern that has stopped', () => {
    const d = verdictOf(
      [
        card('2026-06-01', 'Spotify P1 Stockholm', 467.47),
        card('2026-07-01', 'Spotify P2 Stockholm', 467.47),
        card('2026-08-01', 'Spotify P3 Stockholm', 467.47),
      ],
      'Spotify',
    );
    expect(d?.verdict).toBe('CHECK');
  });

  it('does not call repeated irregular purchases a subscription', () => {
    const d = verdictOf(
      [
        card('2026-08-23', 'Apg*daewoo Pakist Lahore Pak', 1670),
        card('2026-08-28', 'Apg*daewoo Pakist Lahore Pak', 1670),
        card('2026-09-06', 'Apg*daewoo Pakist Lahore Pak', 1670),
        card('2026-10-07', 'Apg*daewoo Pakist 231-ferozepur Road', 1610),
        card('2026-10-20', 'Apg*daewoo Pakist 231-ferozepur Road', 1570),
      ],
      'Daewoo Pakist',
    );
    expect(d).toMatchObject({ verdict: 'NOT_SUBSCRIPTION', charges: 5 });
  });

  it('finds an unknown merchant that charges the same amount every month', () => {
    const d = verdictOf(
      [
        card('2026-08-05', 'Localgym Lahore Pak', 3000),
        card('2026-09-05', 'Localgym Lahore Pak', 3000),
        card('2026-10-05', 'Localgym Lahore Pak', 3000),
        card('2026-11-05', 'Localgym Lahore Pak', 3000),
      ],
      'Localgym Lahore',
    );
    expect(d).toMatchObject({ verdict: 'LIKELY', cadence: 'MONTHLY' });
  });

  it('ignores transfers and top-ups', () => {
    const detections = detect(
      [
        { date: '2026-10-01', kind: 'transfer_out', description: 'To SOMEONE (Bank)', amountLocal: -500 },
        { date: '2026-11-01', kind: 'transfer_out', description: 'To SOMEONE (Bank)', amountLocal: -500 },
        { date: '2026-11-09', kind: 'top_up', description: 'Jazz Prepaid top-up', amountLocal: -200 },
      ],
    );
    expect(detections).toEqual([]);
  });
});
