import notifee, { AuthorizationStatus, TriggerType } from '@notifee/react-native';
import * as Keychain from 'react-native-keychain';
import type { Subscription } from '../api/types';
import { formatMoney } from './format';

const CHANNEL = 'renewals';
const PREFS = 'subtrack.prefs';
const DAYS_BEFORE = 3;
const HOUR = 10;

type Prefs = { reminders: boolean };

export async function getPrefs(): Promise<Prefs> {
  try {
    const stored = await Keychain.getGenericPassword({ service: PREFS });
    if (stored) return { reminders: true, ...(JSON.parse(stored.password) as Partial<Prefs>) };
  } catch {
    // fall through to defaults
  }
  return { reminders: true };
}

export async function setPrefs(prefs: Prefs) {
  await Keychain.setGenericPassword('prefs', JSON.stringify(prefs), { service: PREFS });
}

/** Asks for notification permission. Returns whether reminders can be shown. */
export async function enableReminders(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/**
 * Schedules a local reminder 3 days before each active renewal. Runs on the
 * device, so it needs no push server. Re-running replaces earlier reminders.
 */
export async function syncReminders(subscriptions: Subscription[], currency: string) {
  try {
    const prefs = await getPrefs();
    await notifee.cancelTriggerNotifications();
    if (!prefs.reminders) return;

    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) return;

    await notifee.createChannel({ id: CHANNEL, name: 'Renewal reminders' });
    const now = Date.now();

    for (const sub of subscriptions) {
      if (sub.status !== 'ACTIVE' || !sub.nextRenewal) continue;
      const [y, m, d] = sub.nextRenewal.split('-').map(Number) as [number, number, number];
      const at = new Date(y, m - 1, d - DAYS_BEFORE, HOUR).getTime();
      if (at <= now) continue;

      await notifee.createTriggerNotification(
        {
          id: `renewal-${sub.id}`,
          title: `${sub.name} renews in ${DAYS_BEFORE} days`,
          body: `About ${formatMoney(sub.cost.perCharge, currency)} will be charged. Cancel now if you no longer use it.`,
          data: { subscriptionId: sub.id },
          android: { channelId: CHANNEL, pressAction: { id: 'default' }, smallIcon: 'ic_launcher' },
        },
        { type: TriggerType.TIMESTAMP, timestamp: at },
      );
    }
  } catch {
    // Reminders are a convenience: never break the app over them.
  }
}
