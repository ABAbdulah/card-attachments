import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  Email: undefined;
  Code: { email: string; devCode?: string };
};

export type TabParamList = {
  Home: undefined;
  Subscriptions: undefined;
  Cards: undefined;
  Progress: undefined;
};

export type AppStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  Import: undefined;
  Review: undefined;
  AddSubscription: { subscriptionId?: string } | undefined;
  SubscriptionDetail: { id: string };
  Settings: undefined;
  Paywall: { reason?: string } | undefined;
  Alerts: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;

declare global {
  namespace ReactNavigation {
    // Lets useNavigation() know every app route without casting.
    interface RootParamList extends AppStackParamList {}
  }
}
