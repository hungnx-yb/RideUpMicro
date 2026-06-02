import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import DriverTripsScreen from './src/screens/DriverTripsScreen';
import DriverProfileScreen from './src/screens/DriverProfileScreen';
import BookingChatScreen from './src/screens/BookingChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0' };

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'CreateTrip') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'DriverTrips') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DriverDashboardScreen} options={{ tabBarLabel: 'Tổng quan' }} />
      <Tab.Screen name="CreateTrip" component={CreateTripScreen} options={{ tabBarLabel: 'Tạo chuyến' }} />
      <Tab.Screen name="DriverTrips" component={DriverTripsScreen} options={{ tabBarLabel: 'Quản lý' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: 'Thông báo' }} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} options={{ tabBarLabel: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#F8FAFC' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Chat" component={BookingChatScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
