import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./HomeScreen";
import MarketScreen from "./MarketScreen";
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
          tabBarShowLabel: false,
          headerTitleStyle: { color: 'white', fontWeight: 'bold' },
          headerTitle: 'KisanSAATHI',
          headerShown: false,
        }}
      />

      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          tabBarShowLabel: false,
          headerTitleStyle: { color: 'white', fontWeight: 'bold' },
          headerTitle: 'Market & Mandi Intelligence',
          headerShown: false,
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarShowLabel: false,
          headerTitleStyle: { color: 'black', fontWeight: 'bold' },
          headerTitle: 'Krishi Sahayak',
          headerShown: true,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarShowLabel: false,
          headerTitleStyle: { color: 'white', fontWeight: 'bold' },
          headerTitle: 'Profile',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
