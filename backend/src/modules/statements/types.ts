export type TransactionKind = 'card' | 'transfer_in' | 'transfer_out' | 'top_up' | 'other';

export type ParsedTransaction = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  kind: TransactionKind;
  description: string;
  /** Negative for money leaving the account, in the account currency. */
  amountLocal: number;
  amountOriginal?: number;
  originalCurrency?: string;
};

export type ParsedStatement = {
  bank: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  transactions: ParsedTransaction[];
};

/** A run of text with its position on the page (PDF units, origin bottom-left). */
export type TextItem = { text: string; x: number; y: number };

export type PageText = { width: number; items: TextItem[] };
