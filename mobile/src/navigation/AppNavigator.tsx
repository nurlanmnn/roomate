import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useLanguage } from '../context/LanguageContext';
import { spacing, useThemeColors, useTheme } from '../theme';
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
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Landing">
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
  );
};

// Frosted glass active tab accent (blue glow like reference)
const TAB_BAR_ACTIVE_COLOR = '#3478F6';

const MainTabs = () => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const horizontal = spacing.md;
  const bottomInset = Math.max(insets.bottom, spacing.sm);
  const isDark = theme === 'dark';

  const TabBarBackground = () => (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
      <BlurView
        intensity={isDark ? 5 : 10}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 24,
            backgroundColor: isDark ? 'rgba(40,40,40,0.65)' : 'rgba(255,255,255,0.7)',
          },
        ]}
      />
    </View>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_BAR_ACTIVE_COLOR,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.75)' : colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          left: horizontal,
          right: horizontal,
          bottom: bottomInset,
          borderRadius: 24,
          backgroundColor: 'transparent',
          paddingTop: 10,
          paddingBottom: Math.max(10, bottomInset / 2),
          paddingHorizontal: 8,
          height: 72,
          borderTopWidth: 0,
          elevation: 0,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          tabBarLabel: t('tabs.expenses'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="dollar" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingListScreen}
        options={{
          tabBarLabel: t('tabs.shopping'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="cart" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('tabs.calendar'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ color, focused }) => <TabIcon name="settings" color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Icon set: outline when inactive, filled when active (frosted glass style)
const TAB_ICONS: Record<string, { outline: React.ComponentProps<typeof Ionicons>['name']; filled: React.ComponentProps<typeof Ionicons>['name'] }> = {
  home: { outline: 'home-outline', filled: 'home' },
  dollar: { outline: 'cash-outline', filled: 'cash' },
  cart: { outline: 'cart-outline', filled: 'cart' },
  calendar: { outline: 'calendar-outline', filled: 'calendar' },
  settings: { outline: 'settings-outline', filled: 'settings' },
};

const TabIcon: React.FC<{ name: string; color: string; focused: boolean }> = ({ name, color, focused }) => {
  const iconSet = TAB_ICONS[name] || { outline: 'ellipse-outline', filled: 'ellipse' };
  const icon = (
    <Ionicons
      name={focused ? iconSet.filled : iconSet.outline}
      size={24}
      color={color}
    />
  );

  // Active tab: wrap in a view with soft blue glow
  if (focused) {
    return (
      <View style={tabIconStyles.glowWrap}>
        {icon}
      </View>
    );
  }

  return <View style={tabIconStyles.iconWrap}>{icon}</View>;
};

const tabIconStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: TAB_BAR_ACTIVE_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
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
  const { t } = useLanguage();

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
          title: t('expenses.addExpense'),
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
          title: t('expenses.settleUp'),
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
          title: t('expenses.settlementHistory'),
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
          title: t('events.addEvent'),
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
        name="ChoreRotation"
        component={ChoreRotationScreen}
        options={{
          title: t('chores.title'),
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
        name="CreateChore"
        component={CreateChoreScreen}
        options={({ route }) => ({
          title: route.params?.editingChore ? t('chores.editChore') : t('chores.addChore'),
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
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{
          title: t('accountSettingsScreen.title'),
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
          title: t('householdSettingsScreen.title'),
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
            title: t('settings.title'),
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

