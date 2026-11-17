import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import type { ParsedStatement, ParsedTransaction } from '../types.js';

/**
 * Reads statements from banks without a dedicated parser. Personal details are
 * stripped from the text first (redactLines); only transaction lines reach the
 * model, and nothing is stored on the model side beyond the API's retention.
 */

export const aiParserEnabled = () => Boolean(env.ANTHROPIC_API_KEY);

const TransactionSchema = z.object({
  date: z.string().describe('Transaction date as YYYY-MM-DD'),
  description: z.string().describe('Merchant or payee text exactly as printed, minus personal names'),
  kind: z.enum(['card', 'transfer_in', 'transfer_out', 'top_up', 'other']),
  amount: z.number().describe('Signed amount in the account currency: negative when money left the account'),
  originalAmount: z.number().nullable().describe('Foreign-currency amount when the statement shows one, else null'),
  originalCurrency: z.string().nullable().describe('ISO 4217 code of originalAmount, else null'),
});

const StatementSchema = z.object({
  bank: z.string().nullable(),
  currency: z.string().describe('ISO 4217 code of the account currency'),
  periodStart: z.string().nullable().describe('YYYY-MM-DD'),
  periodEnd: z.string().nullable().describe('YYYY-MM-DD'),
  transactions: z.array(TransactionSchema),
});

const SYSTEM = `You convert bank statement text into structured transactions for a subscription tracker.

Rules:
- Return every transaction in the text, in order. Skip balances, totals, headers and footers.
- kind "card" is any card or online purchase; transfers between accounts or people are transfer_in / transfer_out; mobile top-ups are top_up.
- For transfers, replace any person's name in the description with "Transfer".
- Amounts are in the account currency. Debits are negative, credits positive.
- When a foreign amount is printed next to the charge (for example "USD 20.00"), put it in originalAmount and originalCurrency.
- Never invent a transaction. If a field is not printed, use null.`;

/** Lines per request: keeps each response well inside the output limit. */
const CHUNK_LINES = 220;

export async function parseWithAi(lines: string[]): Promise<ParsedStatement> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const clean = redactLines(lines);
  const chunks: string[][] = [];
  for (let i = 0; i < clean.length; i += CHUNK_LINES) chunks.push(clean.slice(i, i + CHUNK_LINES));

  const results: z.infer<typeof StatementSchema>[] = [];
  for (const [index, chunk] of chunks.entries()) {
    const response = await client.beta.messages.parse({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 16000,
      // Server-side fallback: a declined request is retried on another model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { format: betaZodOutputFormat(StatementSchema), effort: 'low' },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Statement text, part ${index + 1} of ${chunks.length}:\n\n${chunk.join('\n')}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') throw new Error('The AI reader declined this statement');
    if (response.stop_reason === 'max_tokens') throw new Error('Statement part too long for one AI request');
    if (!response.parsed_output) throw new Error('The AI reader returned no structured output');
    logger.info({ part: index + 1, input: response.usage.input_tokens, output: response.usage.output_tokens }, 'AI statement part read');
    results.push(response.parsed_output);
  }

  const first = results[0];
  if (!first) throw new Error('Empty statement');
  const transactions: ParsedTransaction[] = results
    .flatMap((r) => r.transactions)
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.amount !== 0)
    .map((t) => ({
      date: t.date,
      description: t.description.trim(),
      kind: t.kind,
      amountLocal: t.amount,
      amountOriginal: t.originalAmount ?? undefined,
      originalCurrency: t.originalCurrency ?? undefined,
    }));

  const dates = transactions.map((t) => t.date).sort();
  return {
    bank: first.bank ?? 'Bank statement',
    currency: /^[A-Z]{3}$/.test(first.currency) ? first.currency : 'PKR',
    periodStart: first.periodStart ?? dates[0] ?? '',
    periodEnd: results[results.length - 1]?.periodEnd ?? dates[dates.length - 1] ?? '',
    transactions,
  };
}

const DROP_LINE = /^\s*(name|customer( name)?|account (title|holder|name|number|no\.?)|address|iban|cnic|nic|mobile|phone|email|branch)\s*[:#]/i;

/** Removes personal identifiers before any text leaves the server. */
export function redactLines(lines: string[]): string[] {
  return lines
    .filter((line) => !DROP_LINE.test(line))
    .map((line) =>
      line
        .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g, '[IBAN]')
        .replace(/\b\d{5}-\d{7}-\d\b/g, '[ID]')
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
        .replace(/\+?\d(?:[\s-]?\d){9,18}/g, '[NUMBER]')
        .replace(/^(To|From)\s+[A-Z][A-Za-z .'/-]+?(?=\s*\(|$)/, '$1 [PERSON]'),
    );
}
