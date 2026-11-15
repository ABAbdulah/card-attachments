import { ColorTokens, darkColors, lightColors } from '../src/theme/tokens';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG AA: 4.5:1 for body text.
describe.each([
  ['dark', darkColors],
  ['light', lightColors],
])('%s theme contrast', (_name, c: ColorTokens) => {
  const onSurfaces = [
    'text',
    'textMuted',
    'success',
    'reward',
    'danger',
  ] as const;

  it.each(onSurfaces)('%s is readable on background and surface', token => {
    expect(contrast(c[token], c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c[token], c.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('onPrimary is readable on primary', () => {
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
