import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import SearchRideScreen from './src/screens/SearchRideScreen';
import MapScreen from './src/screens/MapScreen';
import BookingChatScreen from './src/screens/BookingChatScreen';
import MyTripsScreen from './src/screens/MyTripsScreen';
import RatingScreen from './src/screens/RatingScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = { background: '#121212', surface: '#1E1E1E', primary: '#FFD700', text: '#FFFFFF', textMuted: '#A0A0A0' };

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SearchRide"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.background,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'SearchRide') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'MyTrips') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="SearchRide" component={SearchRideScreen} options={{ tabBarLabel: 'Tìm chuyến' }} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} options={{ tabBarLabel: 'Lịch sử' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: 'Thông báo' }} />
      <Tab.Screen name="Profile" component={CustomerProfileScreen} options={{ tabBarLabel: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#121212' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Chat" component={BookingChatScreen} />
        <Stack.Screen name="Rating" component={RatingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
