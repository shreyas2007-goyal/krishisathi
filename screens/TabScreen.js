import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./HomeScreen";
import MarketScreen from "./MarketScreen";
import WeatherScreen from "./WeatherScreen";
import CustomTabBar from "../components/CustomTabBar";
import ChatScreen from "./ChatScreen";
import ProfileScreen from "./ProfileScreen";

export default function TabScreen() {
  const Tab = createBottomTabNavigator();
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerTitleStyle: { color: '#1B5E20', fontWeight: 'bold' },
          headerTitle: 'AI कृषि सहायक (Krishi Sahayak)',
          headerShown: true,
        }}
      />

      <Tab.Screen
        name="Weather"
        component={WeatherScreen}
        options={{
          headerShown: false,
        }}
      />

      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          headerShown: false,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
