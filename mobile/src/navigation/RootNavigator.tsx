import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreditCard, House, Repeat, Trophy } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';
import { useMe } from '../api/queries';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { errorMessage } from '../api/client';
import { CardsScreen } from '../features/cards/CardsScreen';
import { CodeScreen } from '../features/auth/CodeScreen';
import { EmailScreen } from '../features/auth/EmailScreen';
import { OnboardingScreen } from '../features/auth/OnboardingScreen';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { ImportScreen } from '../features/import/ImportScreen';
import { ReviewScreen } from '../features/import/ReviewScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { AlertsScreen } from '../features/settings/AlertsScreen';
import { PaywallScreen } from '../features/settings/PaywallScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { AddSubscriptionScreen } from '../features/subscriptions/AddSubscriptionScreen';
import { SubscriptionDetailScreen } from '../features/subscriptions/SubscriptionDetailScreen';
import { SubscriptionsScreen } from '../features/subscriptions/SubscriptionsScreen';
import { useSession } from '../store/session';
import { useTheme } from '../theme';
import { fonts, iconSize } from '../theme/tokens';
import type { AppStackParamList, AuthStackParamList, TabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type IconProps = { color: string };
const HomeIcon = ({ color }: IconProps) => <House color={color} size={iconSize.md} />;
const SubscriptionsIcon = ({ color }: IconProps) => <Repeat color={color} size={iconSize.md} />;
const CardsIcon = ({ color }: IconProps) => <CreditCard color={color} size={iconSize.md} />;
const ProgressIcon = ({ color }: IconProps) => <Trophy color={color} size={iconSize.md} />;

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: HomeIcon }} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ tabBarIcon: SubscriptionsIcon }} />
      <Tab.Screen name="Cards" component={CardsScreen} options={{ tabBarIcon: CardsIcon }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarIcon: ProgressIcon }} />
    </Tab.Navigator>
  );
}

function SignedInStack() {
  const me = useMe();
  const { colors } = useTheme();
  const signOut = useSession((s) => s.signOut);

  if (me.isLoading) return <Splash />;
  if (me.error || !me.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <AppText variant="heading" align="center">
          Couldn’t reach SubTrack
        </AppText>
        <AppText variant="body" color="textMuted" align="center">
          {errorMessage(me.error)}
        </AppText>
        <Button label="Try again" onPress={() => me.refetch()} />
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </View>
    );
  }

  const modal = { presentation: 'modal' as const, animation: 'slide_from_bottom' as const };
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {!me.data.user.onboarded ? (
        <AppStack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <AppStack.Screen name="Tabs" component={Tabs} />
          <AppStack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
          <AppStack.Screen name="Settings" component={SettingsScreen} />
          <AppStack.Screen name="Alerts" component={AlertsScreen} />
          <AppStack.Screen name="Import" component={ImportScreen} options={modal} />
          <AppStack.Screen name="Review" component={ReviewScreen} options={modal} />
          <AppStack.Screen name="AddSubscription" component={AddSubscriptionScreen} options={modal} />
          <AppStack.Screen name="Paywall" component={PaywallScreen} options={modal} />
        </>
      )}
    </AppStack.Navigator>
  );
}

function SignedOutStack() {
  const { colors } = useTheme();
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Email" component={EmailScreen} />
      <AuthStack.Screen name="Code" component={CodeScreen} />
    </AuthStack.Navigator>
  );
}

function Splash() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function RootNavigator() {
  const { isDark, colors } = useTheme();
  const status = useSession((s) => s.status);
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
      }}
    >
      {status === 'loading' ? <Splash /> : status === 'signedIn' ? <SignedInStack /> : <SignedOutStack />}
    </NavigationContainer>
  );
}
