import { matchCatalog, type Billing } from './catalog.js';

export type ResolvedMerchant = {
  /** Stable grouping key: the catalog slug, or a normalised name. */
  key: string;
  name: string;
  slug?: string;
  billing?: Billing;
};

/** Payment-processor prefixes such as "Apg*", "Mob*" or "PAYPAL *". */
const PROCESSOR_PREFIX = /^[a-z0-9]{2,8}\s?\*\s?/i;
/** Any other "Google <app name>" charge is a Google Play purchase or app subscription. */
const GOOGLE_PLAY = /^google\s*\*?\s*(.+)$/i;

export function resolveMerchant(description: string): ResolvedMerchant {
  const raw = description.trim();
  const stripped = raw.replace(PROCESSOR_PREFIX, '');

  // Try the raw text first: some merchants put a "*" in their own name ("Anthropic* Claude").
  const known = matchCatalog(raw) ?? matchCatalog(stripped);
  if (known) return { key: known.slug, name: known.name, slug: known.slug, billing: known.billing };

  const play = GOOGLE_PLAY.exec(stripped);
  if (play) {
    const app = leadingWords(play[1]!, 2);
    return { key: `google-play:${app.toLowerCase()}`, name: `Google Play: ${app}` };
  }

  const name = leadingWords(stripped, 2);
  return { key: name.toLowerCase(), name };
}

/** Leading words of a descriptor, stopping where the address or reference number starts. */
function leadingWords(text: string, max: number): string {
  const words: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (words.length === max || /\d/.test(word)) break;
    words.push(word);
  }
  const joined = (words.length ? words : [text.split(/\s+/)[0] ?? text]).join(' ');
  return joined.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}
