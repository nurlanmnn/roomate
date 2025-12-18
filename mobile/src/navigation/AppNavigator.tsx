import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';

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
import { ShoppingListScreen } from '../screens/Shopping/ShoppingListScreen';
import { CalendarScreen } from '../screens/Calendar/CalendarScreen';
import { GoalsScreen } from '../screens/Goals/GoalsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { AccountSettingsScreen } from '../screens/Settings/AccountSettingsScreen';

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ color }) => <TabIcon name="dollar" color={color} />,
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingListScreen}
        options={{
          tabBarLabel: 'Shopping',
          tabBarIcon: ({ color }) => <TabIcon name="cart" color={color} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color }) => <TabIcon name="target" color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const TabIcon: React.FC<{ name: string; color: string }> = ({ name }) => {
  const icons: Record<string, string> = {
    home: '🏠',
    dollar: '💰',
    cart: '🛒',
    calendar: '📅',
    target: '🎯',
    settings: '⚙️',
  };
  return <Text style={{ fontSize: 24 }}>{icons[name] || '•'}</Text>;
};

const MainNavigator = () => {
  const { selectedHousehold } = useHousehold();

  return (
    <MainStack.Navigator
      initialRouteName={selectedHousehold ? 'Main' : 'HouseholdSelect'}
    >
      <MainStack.Screen
        name="HouseholdSelect"
        component={HouseholdSelectScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="CreateExpense"
        component={CreateExpenseScreen}
        options={{ title: 'Add Expense', presentation: 'modal' }}
      />
      <MainStack.Screen
        name="SettleUp"
        component={SettleUpScreen}
        options={{ title: 'Settle Up' }}
      />
      <MainStack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ title: 'Account Settings' }}
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

