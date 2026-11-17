import { toLines } from '../layout.js';
import type { PageText, ParsedStatement, ParsedTransaction, TransactionKind } from '../types.js';

/**
 * SadaPay account statement. Each page is a three-column table (date,
 * description, amount). Every description block ends with a type line such as
 * "(Card)", which is what separates one transaction from the next.
 */

const KINDS: Record<string, TransactionKind> = {
  '(Card)': 'card',
  '(Incoming transfer)': 'transfer_in',
  '(Outgoing transfer)': 'transfer_out',
  '(Mobile top-up)': 'top_up',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE = /^(\d{1,2}) ([A-Z][a-z]{2}), (\d{4})$/;
const AMOUNT = /^([+-]) ?([\d,]+\.\d{2})$/;
const FOREIGN = /^\(([A-Z]{3}) ([\d,]+\.\d{2})\)$/;
const PERIOD = /from (\d{1,2}) (\w+) (\d{4}) - (\d{1,2}) (\w+) (\d{4})/;

export function isSadapayStatement(pages: PageText[]): boolean {
  return pages[0]?.items.some((i) => /\bSADA\b/.test(i.text) && /^(IBAN|PK\d\d)/.test(i.text)) ?? false;
}

export function parseSadapay(pages: PageText[]): ParsedStatement {
  const transactions = pages.flatMap(parsePage);
  const period = pages[0]?.items.map((i) => PERIOD.exec(i.text)).find(Boolean);
  if (!period) throw new Error('Statement period not found');

  verifyTotals(pages[0]!, transactions);

  return {
    bank: 'SadaPay',
    currency: 'PKR',
    periodStart: isoDate(period[1]!, period[2]!, period[3]!),
    periodEnd: isoDate(period[4]!, period[5]!, period[6]!),
    transactions,
  };
}

function parsePage(page: PageText, pageIndex: number): ParsedTransaction[] {
  const header = (label: string) => page.items.find((i) => i.text === label);
  const dateHead = header('Date');
  const descHead = header('Description');
  const amountHead = header('Debit/Credit');
  if (!dateHead || !descHead || !amountHead) return [];

  const footer = page.items.find((i) => i.text.startsWith('Note:'));
  const rows = page.items.filter((i) => i.y < dateHead.y - 1 && (!footer || i.y > footer.y + 1));

  // Amounts are right-aligned under their header, so they start left of it.
  const amountStart = amountHead.x - page.width * 0.08;
  const dateLines = toLines(rows.filter((i) => i.x < descHead.x - 5));
  const descLines = toLines(rows.filter((i) => i.x >= descHead.x - 5 && i.x < amountStart));
  const amountLines = toLines(rows.filter((i) => i.x >= amountStart));

  const dates = dateLines.flatMap((l) => {
    const m = DATE.exec(l);
    return m ? [isoDate(m[1]!, m[2]!, m[3]!)] : [];
  });

  const blocks: { description: string; kind: TransactionKind }[] = [];
  let current: string[] = [];
  for (const line of descLines) {
    const kind = KINDS[line];
    if (kind) {
      blocks.push({ description: current.join(' '), kind });
      current = [];
    } else {
      current.push(line);
    }
  }

  const amounts: Pick<ParsedTransaction, 'amountLocal' | 'amountOriginal' | 'originalCurrency'>[] = [];
  for (const line of amountLines) {
    const amount = AMOUNT.exec(line);
    const foreign = FOREIGN.exec(line);
    if (amount) {
      amounts.push({ amountLocal: toNumber(amount[2]!) * (amount[1] === '-' ? -1 : 1) });
    } else if (foreign && amounts.length) {
      const last = amounts[amounts.length - 1]!;
      last.originalCurrency = foreign[1]!;
      last.amountOriginal = toNumber(foreign[2]!);
    }
  }

  if (current.length || dates.length !== blocks.length || blocks.length !== amounts.length) {
    throw new Error(
      `Page ${pageIndex + 1}: columns do not line up ` +
        `(${dates.length} dates, ${blocks.length} descriptions, ${amounts.length} amounts)`,
    );
  }

  return blocks.map((block, i) => ({ date: dates[i]!, ...block, ...amounts[i]! }));
}

/** The statement prints its own debit and credit totals: use them as a checksum. */
function verifyTotals(firstPage: PageText, transactions: ParsedTransaction[]) {
  const totalAfter = (label: string) => {
    const head = firstPage.items.find((i) => i.text === label);
    const value = head && firstPage.items.find((i) => /^\d+\.\d{2}$/.test(i.text) && Math.abs(i.x - head.x) < 5);
    return value ? Number(value.text) : undefined;
  };
  const sum = (sign: 1 | -1) =>
    transactions.filter((t) => Math.sign(t.amountLocal) === sign).reduce((s, t) => s + Math.abs(t.amountLocal), 0);

  for (const [label, actual] of [['Total debit', sum(-1)], ['Total credit', sum(1)]] as const) {
    const expected = totalAfter(label);
    if (expected === undefined) throw new Error(`"${label}" not found on the statement`);
    if (Math.abs(expected - actual) > 0.005) {
      throw new Error(`${label} mismatch: statement says ${expected}, parsed ${actual.toFixed(2)}`);
    }
  }
}

function isoDate(day: string, month: string, year: string): string {
  const m = MONTHS.indexOf(month.slice(0, 3)) + 1;
  if (m === 0) throw new Error(`Unknown month "${month}"`);
  return `${year}-${String(m).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function toNumber(text: string): number {
  return Number(text.replace(/,/g, ''));
}
