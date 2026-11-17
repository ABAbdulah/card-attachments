import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useUpdateMe } from '../../api/queries';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { toast } from '../../store/ui';
import { useTheme } from '../../theme';

export const CURRENCIES: { code: string; name: string }[] = [
  { code: 'PKR', name: 'Pakistani rupee' },
  { code: 'USD', name: 'US dollar' },
  { code: 'AED', name: 'UAE dirham' },
  { code: 'SAR', name: 'Saudi riyal' },
  { code: 'GBP', name: 'British pound' },
  { code: 'EUR', name: 'Euro' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'BDT', name: 'Bangladeshi taka' },
  { code: 'QAR', name: 'Qatari riyal' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'TRY', name: 'Turkish lira' },
];

export function CurrencyList({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
      {CURRENCIES.map((c) => {
        const selected = c.code === value;
        return (
          <Pressable
            key={c.code}
            onPress={() => onChange(c.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.row,
              { borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border, gap: spacing.md },
            ]}
          >
            <AppText variant="bodyStrong" style={styles.code}>
              {c.code}
            </AppText>
            <AppText variant="body" color="textMuted" style={styles.flex}>
              {c.name}
            </AppText>
            {selected ? <Check color={colors.primary} size={20} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function OnboardingScreen() {
  const [currency, setCurrency] = useState('PKR');
  const update = useUpdateMe();

  return (
    <Screen
      title="Which currency do you pay in?"
      subtitle="Totals are shown in this currency. Foreign prices like USD 20 are converted to what you actually pay."
      footer={
        <Button
          label="Continue"
          loading={update.isPending}
          onPress={() => update.mutate({ homeCurrency: currency, onboarded: true }, { onError: (e) => toast(errorMessage(e), 'error') })}
        />
      }
    >
      <CurrencyList value={currency} onChange={setCurrency} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, minHeight: 52 },
  code: { width: 44 },
});
