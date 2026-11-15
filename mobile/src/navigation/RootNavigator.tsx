import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { CreditCard, House, Repeat, Trophy } from 'lucide-react-native';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { useTheme } from '../theme';
import { iconSize } from '../theme/tokens';

export type RootTabParamList = {
  Home: undefined;
  Subscriptions: undefined;
  Cards: undefined;
  Progress: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const HomeScreen = () => (
  <PlaceholderScreen
    title="Home"
    note="Due this month, monthly average and upcoming renewals."
  />
);
const SubscriptionsScreen = () => (
  <PlaceholderScreen
    title="Subscriptions"
    note="Every subscription with its active/cancelled toggle."
  />
);
const CardsScreen = () => (
  <PlaceholderScreen
    title="Cards"
    note="Every merchant that holds your card."
  />
);
const ProgressScreen = () => (
  <PlaceholderScreen
    title="Progress"
    note="Savings, streak, level and badges."
  />
);

type IconProps = { color: string };
const HomeIcon = ({ color }: IconProps) => (
  <House color={color} size={iconSize.md} />
);
const SubscriptionsIcon = ({ color }: IconProps) => (
  <Repeat color={color} size={iconSize.md} />
);
const CardsIcon = ({ color }: IconProps) => (
  <CreditCard color={color} size={iconSize.md} />
);
const ProgressIcon = ({ color }: IconProps) => (
  <Trophy color={color} size={iconSize.md} />
);

export function RootNavigator() {
  const { isDark, colors } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: HomeIcon }}
        />
        <Tab.Screen
          name="Subscriptions"
          component={SubscriptionsScreen}
          options={{ tabBarIcon: SubscriptionsIcon }}
        />
        <Tab.Screen
          name="Cards"
          component={CardsScreen}
          options={{ tabBarIcon: CardsIcon }}
        />
        <Tab.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ tabBarIcon: ProgressIcon }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
