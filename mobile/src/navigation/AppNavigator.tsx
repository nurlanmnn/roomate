import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, useThemeColors } from '../theme';
import { fontSizes, fontWeights, radii } from '../theme';
import { MainTabBar } from './MainTabBar';
import {
  SanctuaryStackHeaderBackground,
  SanctuaryStackGlassBack,
} from '../components/sanctuary/SanctuaryStackHeaderBackground';

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
import { ShoppingListScreen } from '../screens/Shopping/ShoppingListScreen';
import { CalendarScreen } from '../screens/Calendar/CalendarScreen';
import { CreateEventScreen } from '../screens/Calendar/CreateEventScreen';
import { ChoreRotationScreen } from '../screens/Calendar/ChoreRotationScreen';
import { CreateChoreScreen } from '../screens/Calendar/CreateChoreScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { AccountSettingsScreen } from '../screens/Settings/AccountSettingsScreen';
import { HouseholdSettingsScreen } from '../screens/Settings/HouseholdSettingsScreen';

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

const MainTabs = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          tabBarLabel: t('tabs.expenses'),
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingListScreen}
        options={{
          tabBarLabel: t('tabs.shopping'),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('tabs.calendar'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
        }}
      />
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

const MAIN_STACK_FULL_BLEED_SCREENS = new Set(['HouseholdSelect', 'Main']);
/** Native headers that use the brighter “sanctuary” glass + custom back pill. */
const MAIN_STACK_IMMERSIVE_HEADER_SCREENS = new Set(['AccountSettings', 'HouseholdSettings']);

const MainNavigator = () => {
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useLanguage();

  return (
    <MainStack.Navigator
      initialRouteName={selectedHousehold ? 'Main' : 'HouseholdSelect'}
      screenOptions={({ route }) => {
        const fullBleed = MAIN_STACK_FULL_BLEED_SCREENS.has(route.name);
        const immersiveHeader = MAIN_STACK_IMMERSIVE_HEADER_SCREENS.has(route.name);
        return {
          contentStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
          ...(fullBleed
            ? {
                headerTransparent: false,
              }
            : Platform.select({
                ios: {
                  headerTransparent: true,
                  headerBackground: () => (
                    <SanctuaryStackHeaderBackground variant={immersiveHeader ? 'immersive' : 'default'} />
                  ),
                },
                default: {
                  headerTransparent: false,
                  headerStyle: {
                    backgroundColor: immersiveHeader
                      ? isDark
                        ? 'rgba(22, 40, 32, 0.88)'
                        : 'rgba(248, 252, 249, 0.92)'
                      : isDark
                        ? 'rgba(18, 26, 24, 0.96)'
                        : 'rgba(247, 252, 249, 0.96)',
                  },
                },
              })),
        };
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
          headerLeft: (props) => <SanctuaryStackGlassBack {...props} />,
        }}
      />
      <MainStack.Screen
        name="HouseholdSettings"
        component={HouseholdSettingsScreen}
        options={{
          title: t('householdSettingsScreen.title'),
          headerBackTitleVisible: false,
          headerLeft: (props) => <SanctuaryStackGlassBack {...props} />,
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

