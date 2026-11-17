import { useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronRight, Crown, Download, LogOut, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import { useMe, useUpdateMe } from '../../api/queries';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { Surface } from '../../components/Surface';
import { Toggle } from '../../components/Toggle';
import { enableReminders, getPrefs, setPrefs } from '../../lib/reminders';
import type { AppScreenProps } from '../../navigation/types';
import { useSession } from '../../store/session';
import { toast } from '../../store/ui';
import { useTheme } from '../../theme';
import { CurrencyList } from '../auth/OnboardingScreen';

export function SettingsScreen({ navigation }: AppScreenProps<'Settings'>) {
  const { colors, spacing } = useTheme();
  const me = useMe();
  const update = useUpdateMe();
  const qc = useQueryClient();
  const session = useSession();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const user = me.data?.user;

  useEffect(() => {
    getPrefs().then((p) => setReminders(p.reminders));
  }, []);

  const toggleReminders = async (on: boolean) => {
    if (on && !(await enableReminders())) {
      toast('Allow notifications in your phone settings to get reminders.', 'error');
      return;
    }
    setReminders(on);
    await setPrefs({ reminders: on });
    await qc.invalidateQueries({ queryKey: ['subscriptions'] });
    toast(on ? 'Reminders on: 3 days before each renewal.' : 'Reminders off.');
  };

  const signOut = async () => {
    const refreshToken = session.session?.refreshToken;
    if (refreshToken) await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => undefined);
    qc.clear();
    await session.signOut();
  };

  const exportData = async () => {
    setBusy('export');
    try {
      const data = await api<unknown>('/me/export');
      await Share.share({ title: 'SubTrack data export', message: JSON.stringify(data, null, 2) });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, subscriptions, statements data, XP and badges. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await api('/me', { method: 'DELETE' });
              qc.clear();
              await session.signOut();
            } catch (err) {
              toast(errorMessage(err), 'error');
              setBusy(null);
            }
          },
        },
      ],
    );

  return (
    <Screen leading="back" title="Settings">
      <Surface padded={false}>
        <View style={[styles.row, { padding: spacing.lg, gap: spacing.md }]}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {user?.email ?? '…'}
            </AppText>
            <AppText variant="caption" color="textMuted">
              Signed in with an email code
            </AppText>
          </View>
          <Chip label={user?.plan === 'PRO' ? 'Pro' : 'Free'} tone={user?.plan === 'PRO' ? 'reward' : 'textMuted'} />
        </View>
        {user?.plan !== 'PRO' ? (
          <Row icon={Crown} label="Upgrade to Pro" detail="Unlimited scans and subscriptions" onPress={() => navigation.navigate('Paywall')} tint={colors.reward} />
        ) : null}
      </Surface>

      <Surface padded={false}>
        <Row icon={Wallet} label="Currency" detail={user?.homeCurrency ?? ''} onPress={() => setCurrencyOpen(true)} first />
        <View style={[styles.row, { padding: spacing.lg, gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <Bell color={colors.textMuted} size={20} />
          <View style={styles.flex}>
            <AppText variant="body">Renewal reminders</AppText>
            <AppText variant="caption" color="textMuted">
              3 days before each charge
            </AppText>
          </View>
          <Toggle value={reminders} onChange={toggleReminders} accessibilityLabel="Renewal reminders" />
        </View>
      </Surface>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Your data</AppText>
        <AppText variant="caption" color="textMuted">
          Statement files are never stored. We keep your card payments, subscriptions and progress so they follow you to a new phone.
        </AppText>
        <Surface padded={false}>
          <Row icon={Download} label={busy === 'export' ? 'Preparing export…' : 'Export my data'} onPress={exportData} first />
          <Row icon={Trash2} label={busy === 'delete' ? 'Deleting…' : 'Delete my account'} onPress={deleteAccount} tint={colors.danger} />
        </Surface>
      </View>

      <Button label="Sign out" variant="secondary" icon={LogOut} onPress={signOut} />
      <AppText variant="caption" color="textMuted" align="center">
        SubTrack 1.0.0
      </AppText>

      <Sheet visible={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Currency">
        <CurrencyList
          value={user?.homeCurrency ?? 'PKR'}
          onChange={(code) =>
            update.mutate({ homeCurrency: code }, { onSuccess: () => setCurrencyOpen(false), onError: (e) => toast(errorMessage(e), 'error') })
          }
        />
      </Sheet>
    </Screen>
  );
}

function Row({ icon: Icon, label, detail, onPress, tint, first }: { icon: typeof Bell; label: string; detail?: string; onPress: () => void; tint?: string; first?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => [
        styles.row,
        { padding: spacing.lg, gap: spacing.md, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : 'transparent' },
      ]}
    >
      <Icon color={tint ?? colors.textMuted} size={20} />
      <View style={styles.flex}>
        <AppText variant="body" style={tint ? { color: tint } : undefined}>
          {label}
        </AppText>
        {detail ? (
          <AppText variant="caption" color="textMuted">
            {detail}
          </AppText>
        ) : null}
      </View>
      <ChevronRight color={colors.textMuted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
});
