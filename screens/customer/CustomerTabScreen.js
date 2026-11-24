import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CustomerHomeScreen from './CustomerHomeScreen';
import CustomerBrowseScreen from './CustomerBrowseScreen';
import CustomerOffersScreen from './CustomerOffersScreen';
import CustomerProfileScreen from './CustomerProfileScreen';
import B2CMarketplaceScreen from '../b2c/B2CMarketplaceScreen';
import B2CChatsListScreen from '../b2c/B2CChatsListScreen';

const Tab = createBottomTabNavigator();
const { width: windowWidth } = Dimensions.get('window');

function CustomerCustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Home', iconName: 'home-variant-outline', activeIconName: 'home-variant', label: 'Home' },
    { name: 'Direct B2C', iconName: 'handshake-outline', activeIconName: 'handshake', label: 'Direct B2C' },
    { name: 'Browse', iconName: 'store-search-outline', activeIconName: 'store-search', label: 'Wholesale' },
    { name: 'Chats', iconName: 'chat-processing-outline', activeIconName: 'chat-processing', label: 'Chats' },
    { name: 'Profile', iconName: 'account-outline', activeIconName: 'account', label: 'Profile' },
  ];

  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tabInfo = tabs[index] || { iconName: 'circle-outline', activeIconName: 'circle', label: route.name };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={isFocused ? tabInfo.activeIconName : tabInfo.iconName}
              size={22}
              color={isFocused ? '#1565C0' : '#64748B'}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tabInfo.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CustomerTabScreen() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomerCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} />
      <Tab.Screen name="Direct B2C" component={B2CMarketplaceScreen} />
      <Tab.Screen name="Browse" component={CustomerBrowseScreen} />
      <Tab.Screen name="Chats" component={B2CChatsListScreen} />
      <Tab.Screen name="Profile" component={CustomerProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 22,
    height: 60,
    width: windowWidth - 32,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
  },
  tabItemActive: {
    backgroundColor: '#EFF6FF',
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
});
