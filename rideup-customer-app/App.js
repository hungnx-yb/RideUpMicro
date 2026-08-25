import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import CustomerDashboardScreen from './src/screens/CustomerDashboardScreen';
import SearchRideScreen from './src/screens/SearchRideScreen';
import MapScreen from './src/screens/MapScreen';
import BookingChatScreen from './src/screens/BookingChatScreen';
import MyTripsScreen from './src/screens/MyTripsScreen';
import RatingScreen from './src/screens/RatingScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import { NotificationProvider, NotificationContext } from './src/context/NotificationContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0' };

function MainTabNavigator() {
  const { unreadCount } = React.useContext(NotificationContext);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border || COLORS.background,
          borderTopWidth: 1,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SearchRide') {
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
      <Tab.Screen name="Dashboard" component={CustomerDashboardScreen} options={{ tabBarLabel: 'Tổng quan' }} />
      <Tab.Screen name="SearchRide" component={SearchRideScreen} options={{ tabBarLabel: 'Tìm chuyến' }} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} options={{ tabBarLabel: 'Lịch sử' }} />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ 
          tabBarLabel: 'Thông báo',
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 }
        }} 
      />
      <Tab.Screen name="Profile" component={CustomerProfileScreen} options={{ tabBarLabel: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}

const STRIPE_PUBLISHABLE_KEY = "pk_test_51Tnh1VCbDzrK5kTtfmmaD9oTXwuIzcgGGwn65xwB9vdB3JVuNQ7FALsVkad3s11A11MWmSqDwiV0Apq6GSWoqeLu00KUtkUqZ5";

export default function App() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <NotificationProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="SearchRide" component={SearchRideScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Bản đồ chuyến đi', headerBackTitle: 'Trở lại' }} />
            <Stack.Screen name="BookingChat" component={BookingChatScreen} options={{ title: 'Trò chuyện', headerBackTitle: 'Trở lại' }} />
            <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Đánh giá chuyến đi', headerBackTitle: 'Trở lại' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationProvider>
    </StripeProvider>
  );
}
