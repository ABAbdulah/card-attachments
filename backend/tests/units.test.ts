import { describe, expect, it } from 'vitest';
import { streakMonths } from '../src/modules/gamification/gamification.service.js';
import { resolveMerchant } from '../src/modules/merchants/resolve.js';
import { redactLines } from '../src/modules/statements/parsers/ai.js';
import { parseCsv, parseDate } from '../src/modules/statements/parsers/csv.js';
import { nextRenewal, renewalAt, renewalsBetween } from '../src/modules/subscriptions/schedule.js';

describe('renewal schedule', () => {
  it('keeps the billing day across short months', () => {
    expect(renewalAt('2026-01-31', 'MONTHLY', 1)).toBe('2026-02-28');
    expect(renewalAt('2026-01-31', 'MONTHLY', 2)).toBe('2026-03-31');
    expect(renewalsBetween('2026-01-31', 'MONTHLY', '2026-02-01', '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('finds the next renewal from past or future anchors', () => {
    expect(nextRenewal('2026-08-08', 'MONTHLY', '2026-11-15')).toBe('2026-12-08');
    expect(nextRenewal('2027-03-01', 'MONTHLY', '2026-11-15')).toBe('2026-12-01');
    expect(nextRenewal('2026-11-15', 'YEARLY', '2026-11-15')).toBe('2026-11-15');
    expect(nextRenewal('2026-11-01', 'WEEKLY', '2026-11-15')).toBe('2026-11-15');
  });
});

describe('merchant resolution', () => {
  it.each([
    ['Anthropic* Claude Sub San Francisco Ca Usa', 'claude'],
    ['OPENAI *CHATGPT SUBSCR', 'chatgpt'],
    ['Openai 1455 3rd Street San Francisco', 'openai-api'],
    ['GOOGLE*YOUTUBEPREMIUM', 'youtube-premium'],
    ['Google One Bishopsgate London', 'google-one'],
    ['PAYPAL *SPOTIFY', 'spotify'],
    ['Www.hostinger.com Larnaca Cyp', 'hostinger'],
    ['Upwork -944686031conne Dublin Irl', 'upwork'],
  ])('%s → %s', (description, key) => {
    expect(resolveMerchant(description).key).toBe(key);
  });

  it('names unknown merchants from the descriptor and groups Google Play apps', () => {
    expect(resolveMerchant('Apg*daewoo Pakist 231-ferozepur Road')).toMatchObject({ key: 'daewoo pakist', name: 'Daewoo Pakist' });
    expect(resolveMerchant('Google Noor Quran Pra 5 New Street')).toMatchObject({ key: 'google-play:noor quran' });
  });
});

describe('csv reader', () => {
  it('reads debit/credit columns and skips transfers as non-card', () => {
    const statement = parseCsv(
      [
        'Account statement',
        'Txn Date,Narration,Withdrawal,Deposit',
        '04/11/2026,"NETFLIX.COM, AMSTERDAM",1100.00,',
        '05/11/2026,IBFT to A/C 1234,2000,',
        '06/11/2026,Salary,,50000',
      ].join('\n'),
      'PKR',
    );
    expect(statement.transactions).toEqual([
      { date: '2026-11-04', description: 'NETFLIX.COM, AMSTERDAM', kind: 'card', amountLocal: -1100 },
      { date: '2026-11-05', description: 'IBFT to A/C 1234', kind: 'transfer_out', amountLocal: -2000 },
      { date: '2026-11-06', description: 'Salary', kind: 'other', amountLocal: 50000 },
    ]);
  });

  it('parses common date formats', () => {
    expect(parseDate('2026-11-04')).toBe('2026-11-04');
    expect(parseDate('4 Nov, 2026')).toBe('2026-11-04');
    expect(parseDate('04-Nov-26')).toBe('2026-11-04');
    expect(parseDate('31/12/2026')).toBe('2026-12-31');
    expect(parseDate('Total')).toBeUndefined();
  });
});

describe('redaction before AI parsing', () => {
  it('removes identifiers and people, keeps merchants and amounts', () => {
    const out = redactLines([
      'Name: Abdullah Tahir',
      'IBAN: PK93 SADA 0000 0031 87070410',
      'To MUHAMMAD AHMED (Mobilink Microfinance Bank (MMBL))',
      'Contact 03001234567 or me@example.com',
      'Spotify P48c35d205 Stockholm - 467.47',
    ]);
    expect(out).toEqual([
      'To [PERSON] (Mobilink Microfinance Bank (MMBL))',
      'Contact [NUMBER] or [EMAIL]',
      'Spotify P48c35d205 Stockholm - 467.47',
    ]);
  });
});

describe('streak', () => {
  const at = (iso: string) => ({ type: 'UPLOAD_STATEMENT', createdAt: new Date(iso) });
  it('counts consecutive months and survives until the month ends', () => {
    const now = new Date('2026-11-15T00:00:00Z');
    expect(streakMonths([at('2026-09-02'), at('2026-10-20'), at('2026-11-01')], now)).toEqual({ months: 3, activeThisMonth: true });
    expect(streakMonths([at('2026-09-02'), at('2026-10-20')], now)).toEqual({ months: 2, activeThisMonth: false });
    expect(streakMonths([at('2026-08-02'), at('2026-10-20')], now)).toEqual({ months: 1, activeThisMonth: false });
  });
});
