import type { PageText, TextItem } from './types.js';

/** Groups items into visual lines, top to bottom, each read left to right. */
export function toLines(items: TextItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];
  for (const item of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0]!.y - item.y) < 2) line.push(item);
    else lines.push([item]);
  }
  return lines.map((line) =>
    line
      .sort((a, b) => a.x - b.x)
      .map((i) => i.text)
      .join(' ')
      .replace(/\s+/g, ' '),
  );
}

export function pagesToLines(pages: PageText[]): string[] {
  return pages.flatMap((page) => toLines(page.items));
}
