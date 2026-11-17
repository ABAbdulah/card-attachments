import type { ParsedStatement, ParsedTransaction, TransactionKind } from '../types.js';

/**
 * Generic CSV export reader. Finds the header row by column names, so it
 * handles most banks' "download as CSV" files without a per-bank parser.
 */

const HEADER = {
  date: /^(transaction |txn |value |posting |booking )?date$/i,
  description: /^(description|details|narration|particulars|merchant|remarks|transaction details|memo)$/i,
  amount: /^(amount|transaction amount|amount \([a-z]{3}\))$/i,
  debit: /^(debit|withdrawal|withdrawals|money out|paid out|debit amount)( \([a-z]{3}\))?$/i,
  credit: /^(credit|deposit|deposits|money in|paid in|credit amount)( \([a-z]{3}\))?$/i,
  type: /^(type|dr\/cr|cr\/dr|debit\/credit)$/i,
  currency: /^(currency|ccy)$/i,
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function looksLikeCsv(text: string): boolean {
  return findHeader(splitRows(text)) !== undefined;
}

export function parseCsv(text: string, fallbackCurrency: string): ParsedStatement {
  const rows = splitRows(text);
  const header = findHeader(rows);
  if (!header) throw new Error('No date/description/amount header row found');
  const { index, cols } = header;

  const currencyHint = rows[index]!.join(' ').match(/\(([A-Z]{3})\)/)?.[1];
  const transactions: ParsedTransaction[] = [];
  let currency = currencyHint ?? fallbackCurrency;

  for (const row of rows.slice(index + 1)) {
    const date = parseDate(row[cols.date] ?? '');
    const description = (row[cols.description] ?? '').trim();
    if (!date || !description) continue;

    let amount: number | undefined;
    if (cols.amount !== undefined) {
      amount = parseAmount(row[cols.amount]);
      const type = cols.type !== undefined ? row[cols.type]?.trim().toLowerCase() : undefined;
      if (amount !== undefined && type) amount = /^(dr|debit|d)/.test(type) ? -Math.abs(amount) : Math.abs(amount);
    } else {
      const debit = cols.debit !== undefined ? parseAmount(row[cols.debit]) : undefined;
      const credit = cols.credit !== undefined ? parseAmount(row[cols.credit]) : undefined;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (amount === undefined || amount === 0) continue;
    if (cols.currency !== undefined && /^[A-Z]{3}$/.test(row[cols.currency]?.trim() ?? '')) {
      currency = row[cols.currency]!.trim();
    }

    transactions.push({ date, description, kind: kindOf(description, amount), amountLocal: amount });
  }

  if (transactions.length === 0) throw new Error('No transactions found in the CSV');
  const dates = transactions.map((t) => t.date).sort();
  return { bank: 'CSV import', currency, periodStart: dates[0]!, periodEnd: dates[dates.length - 1]!, transactions };
}

function kindOf(description: string, amount: number): TransactionKind {
  if (/top-?up|recharge|easyload/i.test(description)) return 'top_up';
  if (/^(to|from)\s|transfer|\bibft\b|\braast\b|\bfunds? trf\b|a\/c\b/i.test(description)) {
    return amount < 0 ? 'transfer_out' : 'transfer_in';
  }
  return amount < 0 ? 'card' : 'other';
}

function findHeader(rows: string[][]) {
  for (let index = 0; index < Math.min(rows.length, 40); index++) {
    const cells = rows[index]!.map((c) => c.trim());
    const find = (re: RegExp) => {
      const i = cells.findIndex((c) => re.test(c));
      return i >= 0 ? i : undefined;
    };
    const cols = {
      date: find(HEADER.date),
      description: find(HEADER.description),
      amount: find(HEADER.amount),
      debit: find(HEADER.debit),
      credit: find(HEADER.credit),
      type: find(HEADER.type),
      currency: find(HEADER.currency),
    };
    if (cols.date !== undefined && cols.description !== undefined && (cols.amount !== undefined || cols.debit !== undefined)) {
      return { index, cols: cols as typeof cols & { date: number; description: number } };
    }
  }
  return undefined;
}

/** RFC 4180-style splitting: quoted fields may contain commas, quotes and newlines. */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const delimiter = (text.split('\n')[0] ?? '').split(';').length > (text.split('\n')[0] ?? '').split(',').length ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function parseAmount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^\d.,()-]/g, '');
  if (!/\d/.test(cleaned)) return undefined;
  const negative = cleaned.startsWith('-') || (cleaned.startsWith('(') && cleaned.endsWith(')'));
  const n = Number(cleaned.replace(/[(),-]/g, ''));
  return Number.isFinite(n) ? (negative ? -n : n) : undefined;
}

/** Accepts 2026-11-04, 04/11/2026 (day first), 4-Nov-2026, 4 Nov 2026 and "4 Nov, 2026". */
export function parseDate(raw: string): string | undefined {
  const value = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(value);
  if (m) return iso(fullYear(+m[3]!), +m[2]!, +m[1]!);
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*,?[\s-](\d{2,4})/.exec(value);
  if (m) {
    const month = MONTHS.indexOf(m[2]!.toLowerCase()) + 1;
    if (month) return iso(fullYear(+m[3]!), month, +m[1]!);
  }
  return undefined;
}

function fullYear(y: number) {
  return y < 100 ? 2000 + y : y;
}

function iso(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
