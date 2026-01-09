import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { spacing, useThemeColors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes, fontWeights, radii } from '../theme';

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

const withAlpha = (hexColor: string, alpha: number) => {
  // expects #RRGGBB; falls back to original if format unexpected
  if (!hexColor || hexColor[0] !== '#' || (hexColor.length !== 7 && hexColor.length !== 9)) {
    return hexColor;
  }
  const clean = hexColor.slice(1, 7);
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
};

const MainTabs = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const horizontal = spacing.md;
  const bottomInset = Math.max(insets.bottom, spacing.sm);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { 
          position: 'absolute',
          left: horizontal,
          right: horizontal,
          bottom: bottomInset,
          borderRadius: 24,
          backgroundColor: withAlpha(colors.surface, 0.84),
          paddingTop: 8,
          paddingBottom: Math.max(8, bottomInset / 2),
          paddingHorizontal: 6,
          height: 76,
          borderTopWidth: 0,
          elevation: 14,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
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

// Telegram-style tab icon colors
const TAB_COLORS: Record<string, string> = {
  home: '#3478F6',      // Blue
  dollar: '#34C759',    // Green
  cart: '#FF9500',      // Orange
  calendar: '#AF52DE',  // Purple
  target: '#FF3B30',    // Red
  settings: '#8E8E93',  // Gray
};

const TabIcon: React.FC<{ name: string; color: string; focused: boolean }> = ({ name, color, focused }) => {
  const colors = useThemeColors();
  const icons: Record<string, { outline: React.ComponentProps<typeof Ionicons>['name']; filled: React.ComponentProps<typeof Ionicons>['name'] }> = {
    home: { outline: 'home-outline', filled: 'home' },
    dollar: { outline: 'cash-outline', filled: 'cash' },
    cart: { outline: 'cart-outline', filled: 'cart' },
    calendar: { outline: 'calendar-outline', filled: 'calendar' },
    target: { outline: 'flag-outline', filled: 'flag' },
    settings: { outline: 'settings-outline', filled: 'settings' },
  };
  const iconSet = icons[name] || { outline: 'ellipse-outline', filled: 'ellipse' };
  const bgColor = TAB_COLORS[name] || colors.textTertiary;
  
  return (
    <View style={[
      tabIconStyles.container,
      { backgroundColor: focused ? bgColor : `${bgColor}20` }
    ]}>
      <Ionicons 
        name={focused ? iconSet.filled : iconSet.outline} 
        size={18} 
        color={focused ? '#FFFFFF' : bgColor} 
      />
    </View>
  );
};

const tabIconStyles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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

