import { HttpError } from '../../middleware/error.js';
import { extractPdfText } from './extractText.js';
import { pagesToLines } from './layout.js';
import { aiParserEnabled, parseWithAi } from './parsers/ai.js';
import { looksLikeCsv, parseCsv } from './parsers/csv.js';
import { isSadapayStatement, parseSadapay } from './parsers/sadapay.js';
import type { ParsedStatement } from './types.js';

type Input = { buffer: Buffer; filename: string; mimetype: string; password?: string; fallbackCurrency: string };

const UNSUPPORTED =
  'We cannot read this statement yet. Download it from your bank as a CSV file, or send us a sample so we can add your bank.';

/** Picks a reader for the uploaded file. The file only ever lives in memory. */
export async function parseStatementFile(input: Input): Promise<ParsedStatement> {
  const isPdf = input.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  const statement = isPdf ? await parsePdf(input) : await parseText(input);

  if (statement.transactions.length === 0) {
    throw new HttpError(422, 'No transactions were found in this file.', 'NO_TRANSACTIONS');
  }
  return statement;
}

async function parsePdf({ buffer, password }: Input): Promise<ParsedStatement> {
  let pages;
  try {
    pages = await extractPdfText(new Uint8Array(buffer), password || undefined);
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') {
      const code = (err as Error & { code?: number }).code;
      throw code === 2
        ? new HttpError(422, 'That password did not open the file.', 'PASSWORD_INCORRECT')
        : new HttpError(422, 'This statement is password protected.', 'PASSWORD_REQUIRED');
    }
    throw new HttpError(422, 'This PDF could not be opened.', 'UNREADABLE');
  }

  if (isSadapayStatement(pages)) {
    try {
      return parseSadapay(pages);
    } catch (err) {
      // A layout change at the bank: fall back to the AI reader rather than failing.
      if (!aiParserEnabled()) throw new HttpError(422, `${UNSUPPORTED} (${(err as Error).message})`, 'UNSUPPORTED_FORMAT');
    }
  }

  const lines = pagesToLines(pages);
  if (lines.length === 0) {
    throw new HttpError(422, 'This PDF has no text, so it is probably a scan. Download the original from your bank app.', 'SCANNED_PDF');
  }
  if (!aiParserEnabled()) throw new HttpError(422, UNSUPPORTED, 'UNSUPPORTED_FORMAT');
  return parseWithAi(lines);
}

async function parseText({ buffer, filename, mimetype, fallbackCurrency }: Input): Promise<ParsedStatement> {
  const looksText = /csv|text|excel/.test(mimetype) || /\.(csv|txt)$/i.test(filename);
  if (!looksText) throw new HttpError(415, 'Upload a PDF or CSV statement.', 'UNSUPPORTED_FILE');

  const text = buffer.toString('utf8').replace(/^﻿/, '');
  if (looksLikeCsv(text)) {
    try {
      return parseCsv(text, fallbackCurrency);
    } catch {
      // fall through to the AI reader
    }
  }
  if (!aiParserEnabled()) throw new HttpError(422, UNSUPPORTED, 'UNSUPPORTED_FORMAT');
  return parseWithAi(text.split(/\r?\n/).filter((l) => l.trim()));
}
