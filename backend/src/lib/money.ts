/** Prisma Decimal, or a plain value. */
type DecimalLike = { toNumber(): number } | number | string;

export function num(value: DecimalLike): number;
export function num(value: DecimalLike | null | undefined): number | undefined;
export function num(value: DecimalLike | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** YYYY-MM-DD for a Date stored as a calendar date. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
