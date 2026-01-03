import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes, fontWeights } from '../theme';

// Auth Screens
import { LandingScreen } from '../screens/Auth/LandingScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { SignupScreen } from '../screens/Auth/SignupScreen';
import { VerifyEmailScreen } from '../screens/Auth/VerifyEmailScreen';

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
import { GoalsScreen } from '../screens/Goals/GoalsScreen';
import { CreateGoalScreen } from '../screens/Goals/CreateGoalScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { AccountSettingsScreen } from '../screens/Settings/AccountSettingsScreen';
import { HouseholdSettingsScreen } from '../screens/Settings/HouseholdSettingsScreen';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Landing">
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
  );
};

const MainTabs = () => {
  const colors = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { 
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          backgroundColor: colors.surface,
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 4,
          height: 70,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ color, focused }) => <TabIcon name="dollar" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingListScreen}
        options={{
          tabBarLabel: 'Shopping',
          tabBarIcon: ({ color, focused }) => <TabIcon name="cart" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color, focused }) => <TabIcon name="target" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabIcon name="settings" color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const TabIcon: React.FC<{ name: string; color: string; focused: boolean }> = ({ name, color, focused }) => {
  const icons: Record<string, { outline: React.ComponentProps<typeof Ionicons>['name']; filled: React.ComponentProps<typeof Ionicons>['name'] }> = {
    home: { outline: 'home-outline', filled: 'home' },
    dollar: { outline: 'cash-outline', filled: 'cash' },
    cart: { outline: 'cart-outline', filled: 'cart' },
    calendar: { outline: 'calendar-outline', filled: 'calendar' },
    target: { outline: 'flag-outline', filled: 'flag' },
    settings: { outline: 'settings-outline', filled: 'settings' },
  };
  const iconSet = icons[name] || { outline: 'ellipse-outline', filled: 'ellipse' };
  return <Ionicons name={focused ? iconSet.filled : iconSet.outline} size={22} color={color} />;
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

  return (
    <MainStack.Navigator
      initialRouteName={selectedHousehold ? 'Main' : 'HouseholdSelect'}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          fontWeight: fontWeights.extrabold,
          fontSize: fontSizes.lg,
          color: colors.text,
        },
        headerTintColor: colors.text,
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
          title: 'Add Expense',
          presentation: 'modal',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
        })}
      />
      <MainStack.Screen
        name="SettleUp"
        component={SettleUpScreen}
        options={{
          title: 'Settle Up',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="SettlementHistory"
        component={SettlementHistoryScreen}
        options={{ 
          title: 'Settlement History',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
          headerBackTitleVisible: false,
        }}
      />
      <MainStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: 'Add Event',
          presentation: 'modal',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
        }}
      />
      <MainStack.Screen
        name="CreateGoal"
        component={CreateGoalScreen}
        options={{
          title: 'New Goal',
          presentation: 'modal',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
        }}
      />
      <MainStack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{
          title: 'Account Settings',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
        }}
      />
      <MainStack.Screen
        name="HouseholdSettings"
        component={HouseholdSettingsScreen}
        options={{
          title: 'Household Settings',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontWeight: fontWeights.extrabold,
            fontSize: fontSizes.lg,
            color: colors.text,
          },
          headerTintColor: colors.text,
        }}
      />
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation, route }) => {
          const fromHouseholdSelect = route.params?.fromHouseholdSelect;
          return {
            title: 'Settings',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTitleStyle: {
              fontWeight: fontWeights.extrabold,
              fontSize: fontSizes.lg,
              color: colors.text,
            },
            headerTintColor: colors.text,
            headerBackTitleVisible: false,
            headerShown: true,
            gestureEnabled: true,
            headerBackVisible: true,
          };
        }}
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

