import notifee, {
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import * as Keychain from 'react-native-keychain';
import type { Subscription } from '../api/types';
import { formatMoney } from './format';

const CHANNEL = 'renewals';
const PREFS = 'subtrack.prefs';
const DAYS_BEFORE = 3;
/** Trials get a little less notice: most are only 7 to 30 days long. */
const TRIAL_DAYS_BEFORE = 2;
const HOUR = 10;

export type Prefs = { reminders: boolean; checklistDismissed: boolean };
const DEFAULT_PREFS: Prefs = { reminders: true, checklistDismissed: false };

export async function getPrefs(): Promise<Prefs> {
  try {
    const stored = await Keychain.getGenericPassword({ service: PREFS });
    if (stored)
      return {
        ...DEFAULT_PREFS,
        ...(JSON.parse(stored.password) as Partial<Prefs>),
      };
  } catch {
    // fall through to defaults
  }
  return DEFAULT_PREFS;
}

export async function setPrefs(patch: Partial<Prefs>) {
  const next = { ...(await getPrefs()), ...patch };
  await Keychain.setGenericPassword('prefs', JSON.stringify(next), {
    service: PREFS,
  });
  return next;
}

/** Whether reminders are on in the app and allowed by the phone. */
export async function remindersActive(): Promise<boolean> {
  try {
    const [prefs, settings] = await Promise.all([
      getPrefs(),
      notifee.getNotificationSettings(),
    ]);
    return (
      prefs.reminders &&
      settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED
    );
  } catch {
    return false;
  }
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
export async function syncReminders(
  subscriptions: Subscription[],
  currency: string,
) {
  try {
    const prefs = await getPrefs();
    await notifee.cancelTriggerNotifications();
    if (!prefs.reminders) return;

    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) return;

    await notifee.createChannel({ id: CHANNEL, name: 'Renewal reminders' });
    const now = Date.now();

    const at = (iso: string, daysBefore: number) => {
      const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
      return new Date(y, m - 1, d - daysBefore, HOUR).getTime();
    };

    for (const sub of subscriptions) {
      if (sub.status !== 'ACTIVE') continue;

      // A trial's end is its first charge: one trial reminder replaces the renewal one.
      if (sub.trialEndsAt) {
        const when = at(sub.trialEndsAt, TRIAL_DAYS_BEFORE);
        if (when > now) {
          await notifee.createTriggerNotification(
            {
              id: `trial-${sub.id}`,
              title: `${sub.name} free trial ends in ${TRIAL_DAYS_BEFORE} days`,
              body: `It becomes a paid plan of about ${formatMoney(
                sub.cost.perCharge,
                currency,
              )}. Cancel before then if you don’t want it.`,
              data: { subscriptionId: sub.id },
              android: {
                channelId: CHANNEL,
                pressAction: { id: 'default' },
                smallIcon: 'ic_notification',
              },
            },
            { type: TriggerType.TIMESTAMP, timestamp: when },
          );
        }
        continue;
      }

      if (!sub.nextRenewal) continue;
      const when = at(sub.nextRenewal, DAYS_BEFORE);
      if (when <= now) continue;

      await notifee.createTriggerNotification(
        {
          id: `renewal-${sub.id}`,
          title: `${sub.name} renews in ${DAYS_BEFORE} days`,
          body: `About ${formatMoney(
            sub.cost.perCharge,
            currency,
          )} will be charged. Cancel now if you no longer use it.`,
          data: { subscriptionId: sub.id },
          android: {
            channelId: CHANNEL,
            pressAction: { id: 'default' },
            smallIcon: 'ic_notification',
          },
        },
        { type: TriggerType.TIMESTAMP, timestamp: when },
      );
    }
  } catch {
    // Reminders are a convenience: never break the app over them.
  }
}
