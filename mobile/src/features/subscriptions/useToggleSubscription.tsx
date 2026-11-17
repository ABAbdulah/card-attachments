import { ExternalLink } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { useSetStatus } from '../../api/queries';
import type { Subscription } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { formatMoney } from '../../lib/format';
import { celebrateRewards, toast } from '../../store/ui';
import { useTheme } from '../../theme';

/**
 * Switching a subscription off cannot cancel it with the service, so the app
 * says so: the sheet links to the service's billing page and only marks it
 * cancelled once the user confirms they did it.
 */
export function useToggleSubscription(currency: string) {
  const setStatus = useSetStatus();
  const [pending, setPending] = useState<Subscription | null>(null);
  const { spacing } = useTheme();

  const apply = (sub: Subscription, status: 'ACTIVE' | 'CANCELLED') =>
    setStatus.mutate(
      { id: sub.id, status },
      {
        onSuccess: ({ rewards }) => {
          if (status === 'CANCELLED') {
            celebrateRewards(`${sub.name} cancelled`, rewards, `You’ll save ${formatMoney(sub.cost.monthly, currency)} a month. We’ll check your next statement to confirm.`);
          } else {
            toast(`${sub.name} is active again`);
          }
        },
        onError: (err) => toast(errorMessage(err), 'error'),
      },
    );

  const toggle = (sub: Subscription, active: boolean) => {
    if (active) apply(sub, 'ACTIVE');
    else setPending(sub);
  };

  const sheet = (
    <Sheet visible={pending !== null} onClose={() => setPending(null)} title={pending ? `Cancel ${pending.name}?` : undefined}>
      {pending ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="body" color="textMuted">
            We can’t cancel it for you. Cancel it with {pending.name} first, then mark it here. We’ll warn you if your next statement still shows a charge.
          </AppText>
          {pending.manageUrl ? (
            <Button
              label={`Open ${pending.name} billing`}
              variant="secondary"
              icon={ExternalLink}
              onPress={() => Linking.openURL(pending.manageUrl!).catch(() => toast('Could not open the link.', 'error'))}
            />
          ) : null}
          <Button
            label="I’ve cancelled it"
            onPress={() => {
              const sub = pending;
              setPending(null);
              apply(sub, 'CANCELLED');
            }}
          />
          <Button label="Not now" variant="ghost" onPress={() => setPending(null)} />
        </View>
      ) : null}
    </Sheet>
  );

  return { toggle, sheet, isPending: setStatus.isPending };
}
