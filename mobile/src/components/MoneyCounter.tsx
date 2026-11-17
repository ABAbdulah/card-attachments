import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { formatMoney } from '../lib/format';
import type { TypographyVariant } from '../theme/tokens';
import type { ColorTokens } from '../theme/tokens';
import { AppText } from './AppText';

type Props = {
  value: number;
  currency: string;
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  suffix?: string;
};

const DURATION = 650;

/** Counts from the previous total to the new one, so a cancelled subscription visibly lowers the total. */
export function MoneyCounter({ value, currency, variant = 'display', color = 'text', suffix }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = Date.now();
    const initial = from.current;
    let frame = 0;
    const step = () => {
      const t = Math.min((Date.now() - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(initial + (value - initial) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value, reduced]);

  return (
    <AppText variant={variant} color={color} tabular accessibilityLabel={`${formatMoney(value, currency)}${suffix ?? ''}`} numberOfLines={1} adjustsFontSizeToFit>
      {formatMoney(shown, currency)}
      {suffix ? (
        <AppText variant="heading" color="textMuted">
          {suffix}
        </AppText>
      ) : null}
    </AppText>
  );
}
