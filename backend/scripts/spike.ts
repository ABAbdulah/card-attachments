/**
 * Phase 0 spike: read a statement and print the detected subscriptions.
 *
 *   npx tsx scripts/spike.ts ../statements/<file>.pdf [pdf-password]
 *
 * Only card charges are printed. Transfers, names and account numbers are
 * parsed (to verify the statement totals) but never shown.
 */
import { readFile } from 'node:fs/promises';
import { chargesFromParsed, detectSubscriptions } from '../src/modules/detection/detect.js';
import { extractPdfText } from '../src/modules/statements/extractText.js';
import { isSadapayStatement, parseSadapay } from '../src/modules/statements/parsers/sadapay.js';

const [file, password] = process.argv.slice(2);
if (!file) {
  console.error('Usage: npx tsx scripts/spike.ts <statement.pdf> [password]');
  process.exit(1);
}

const pages = await extractPdfText(new Uint8Array(await readFile(file)), password);
if (!isSadapayStatement(pages)) {
  console.error('Unsupported statement format (only SadaPay is handled by the spike).');
  process.exit(1);
}

const statement = parseSadapay(pages);
const card = statement.transactions.filter((t) => t.kind === 'card');
const detections = detectSubscriptions(chargesFromParsed(statement.transactions), statement.periodEnd);

console.log(`Period: ${statement.periodStart} to ${statement.periodEnd}`);
console.log(`Transactions: ${statement.transactions.length} (totals match the statement), card charges: ${card.length}\n`);

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

for (const d of detections) {
  const original = d.priceOriginal ? ` (${d.originalCurrency} ${money(d.priceOriginal)})` : '';
  console.log(`[${d.verdict}] ${d.merchant}`);
  console.log(`    last charge ${d.lastCharge}: ${statement.currency} ${money(d.lastAmountLocal)}${original}, ${d.charges} charge(s)`);
  console.log(`    ${d.reason}`);
}

const monthly = detections.reduce((sum, d) => sum + (d.monthlyCostLocal ?? 0), 0);
console.log(`\nEstimated monthly cost (confirmed + likely): ${statement.currency} ${money(monthly)}`);
