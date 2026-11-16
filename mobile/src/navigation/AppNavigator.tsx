import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights } from '../theme';

// Auth Screens
import { LandingScreen } from '../screens/Auth/LandingScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { SignupScreen } from '../screens/Auth/SignupScreen';
import { VerifyEmailScreen } from '../screens/Auth/VerifyEmailScreen';
import { ForgotPasswordScreen } from '../screens/Auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/Auth/ResetPasswordScreen';

// Household Screen
import { HouseholdSelectScreen } from '../screens/Household/HouseholdSelectScreen';

// Main Screens
import { HomeScreen } from '../screens/Home/HomeScreen';
import { ExpensesScreen } from '../screens/Expenses/ExpensesScreen';
import { CreateExpenseScreen } from '../screens/Expenses/CreateExpenseScreen';
import { SettleUpScreen } from '../screens/Expenses/SettleUpScreen';
import { SettlementHistoryScreen } from '../screens/Expenses/SettlementHistoryScreen';
import { BalanceHistoryScreen } from '../screens/Expenses/BalanceHistoryScreen';
import { ShoppingListScreen } from '../screens/Shopping/ShoppingListScreen';
import { CalendarScreen } from '../screens/Calendar/CalendarScreen';
import { CreateEventScreen } from '../screens/Calendar/CreateEventScreen';
import { ChoreRotationScreen } from '../screens/Calendar/ChoreRotationScreen';
import { CreateChoreScreen } from '../screens/Calendar/CreateChoreScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { AccountSettingsScreen } from '../screens/Settings/AccountSettingsScreen';
import { HouseholdSettingsScreen } from '../screens/Settings/HouseholdSettingsScreen';
import { NotificationSettingsScreen } from '../screens/Settings/NotificationSettingsScreen';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
      initialRouteName="Landing"
    >
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
};

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { on: TabIconName; off: TabIconName }> = {
  Home: { on: 'home', off: 'home-outline' },
  Expenses: { on: 'wallet', off: 'wallet-outline' },
  Shopping: { on: 'cart', off: 'cart-outline' },
  Calendar: { on: 'calendar', off: 'calendar-outline' },
};

/** Four top-level sections on the standard docked tab bar. Settings lives behind the Home avatar. */
const MainTabs = () => {
  const { t } = useLanguage();
  const colors = useThemeColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: fontWeights.semibold,
        },
        tabBarIcon: ({ focused, color }) => {
          const set = TAB_ICONS[route.name] ?? TAB_ICONS.Home;
          return <Ionicons name={focused ? set.on : set.off} size={25} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} options={{ tabBarLabel: t('tabs.money') }} />
      <Tab.Screen name="Shopping" component={ShoppingListScreen} options={{ tabBarLabel: t('tabs.shopping') }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: t('tabs.calendar') }} />
    </Tab.Navigator>
  );
};

// Wrapper component for MainTabs that redirects if no household
const MainTabsWithGuard = () => {
  const { selectedHousehold } = useHousehold();
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Redirect to HouseholdSelect if no household is selected or household is invalid
    if (!selectedHousehold || !selectedHousehold._id) {
      // Use requestAnimationFrame to ensure navigation happens after render
      const frameId = requestAnimationFrame(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'HouseholdSelect' }],
        });
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [selectedHousehold, navigation]);

  // Don't render tabs if no household
  if (!selectedHousehold || !selectedHousehold._id) {
    return null;
  }

  return <MainTabs />;
};

const MainNavigator = () => {
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <MainStack.Navigator
      initialRouteName={selectedHousehold ? 'Main' : 'HouseholdSelect'}
      screenOptions={{
        // Plain native header on the porcelain ground: ink title, enamel-tinted controls.
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          fontWeight: fontWeights.semibold,
          fontSize: fontSizes.md + 1,
          color: colors.text,
        },
        headerTintColor: colors.primary,
        headerBackTitleVisible: false,
      }}
    >
      <MainStack.Screen
        name="HouseholdSelect"
        component={HouseholdSelectScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Main"
        component={MainTabsWithGuard}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="CreateExpense"
        component={CreateExpenseScreen}
        options={({ route }) => ({
          title: (route.params as { expense?: unknown } | undefined)?.expense
            ? t('expenses.editExpense')
            : t('expenses.addExpense'),
          presentation: 'modal',
          // Default native-stack dismiss is horizontal; vertical restores iOS sheet “pull down” feel.
          ...(Platform.OS === 'ios' ? { gestureDirection: 'vertical' as const } : {}),
        })}
      />
      <MainStack.Screen
        name="SettleUp"
        component={SettleUpScreen}
        options={{
          title: t('expenses.settleUp'),
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="SettlementHistory"
        component={SettlementHistoryScreen}
        options={{
          title: t('expenses.settlementHistory'),
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="BalanceHistory"
        component={BalanceHistoryScreen}
        options={{
          title: t('expenses.balanceHistory'),
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={({ route }) => ({
          title: (route.params as { editingEvent?: unknown } | undefined)?.editingEvent
            ? t('events.editEvent')
            : t('events.addEvent'),
          presentation: 'modal',
          ...(Platform.OS === 'ios' ? { gestureDirection: 'vertical' as const } : {}),
        })}
      />
      <MainStack.Screen
        name="ChoreRotation"
        component={ChoreRotationScreen}
        options={{
          title: t('chores.title'),
        }}
      />
      <MainStack.Screen
        name="CreateChore"
        component={CreateChoreScreen}
        options={({ route }) => ({
          title: (route.params as { editingChore?: unknown } | undefined)?.editingChore
            ? t('chores.editChore')
            : t('chores.addChore'),
          presentation: 'modal',
          ...(Platform.OS === 'ios' ? { gestureDirection: 'vertical' as const } : {}),
        })}
      />
      <MainStack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{
          title: t('accountSettingsScreen.title'),
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="HouseholdSettings"
        component={HouseholdSettingsScreen}
        options={{
          title: t('householdSettingsScreen.title'),
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: t('notificationsScreen.title'),
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={() => ({
          title: t('settings.title'),
          headerBackTitleVisible: false,
          headerShown: true,
          gestureEnabled: true,
          headerBackVisible: true,
        })}
      />
    </MainStack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

