import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PageText } from './types.js';

/** Reads positioned text from a PDF held in memory. Nothing is written to disk. */
export async function extractPdfText(data: Uint8Array, password?: string): Promise<PageText[]> {
  const task = getDocument({ data, password, useSystemFonts: true });
  const doc = await task.promise;
  const pages: PageText[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push({
      width: page.getViewport({ scale: 1 }).width,
      items: content.items.flatMap((item) =>
        'str' in item && item.str.trim()
          ? [{ text: item.str.trim(), x: item.transform[4] as number, y: item.transform[5] as number }]
          : [],
      ),
    });
  }

  await task.destroy();
  return pages;
}
