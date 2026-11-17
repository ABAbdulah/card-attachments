export type Cadence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const SYMBOLS: Record<string, string> = {
  PKR: 'Rs ',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  BDT: '৳',
  TRY: '₺',
  NGN: '₦',
};

/**
 * Money for display. Large amounts drop the paisa/cents ("Rs 6,003"), small
 * ones keep two decimals ("$19.99") so a price is never shown wrong.
 */
export function formatMoney(
  amount: number,
  currency: string,
  options: { exact?: boolean } = {},
): string {
  const abs = Math.abs(amount);
  const whole = !options.exact && (abs >= 1000 || Number.isInteger(abs));
  const digits = whole ? 0 : 2;
  const number = abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${amount < 0 ? '-' : ''}${symbol}${number}`;
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Every 3 months',
  YEARLY: 'Yearly',
};

export const CADENCE_SHORT: Record<Cadence, string> = {
  WEEKLY: '/wk',
  MONTHLY: '/mo',
  QUARTERLY: '/qtr',
  YEARLY: '/yr',
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "8 Dec", or "8 Dec 2025" when not in the current year. */
export function formatDay(iso: string, now = new Date()): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const label = `${d} ${MONTHS[m - 1]}`;
  return y === now.getFullYear() ? label : `${label} ${y}`;
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return todayIso(new Date(y, m - 1, d + days));
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
  return todayIso(new Date(y, m - 1 + months, Math.min(d, lastDay)));
}

export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.round((target - today) / 86_400_000);
}

/** "Today", "Tomorrow", "In 5 days", or a date. */
export function relativeDay(iso: string, now = new Date()): string {
  const days = daysUntil(iso, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 14) return `In ${days} days`;
  if (days < 0 && days > -14) return `${-days} days ago`;
  return formatDay(iso, now);
}

export function isValidIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function initials(name: string): string {
  const words = name
    .replace(/^google play:\s*/i, '')
    .split(/[\s.:-]+/)
    .filter(Boolean);
  const letters =
    words.length > 1
      ? words[0]![0]! + words[1]![0]!
      : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
