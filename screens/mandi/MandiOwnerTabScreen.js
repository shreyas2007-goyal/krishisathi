import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/mandi/MandiOwnerTabScreen.js
// KisanSAATHI - Mandi Owner / APMC Bottom Tab Navigation

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions }
 from 'react-native';
import MandiOverviewScreen from './MandiOverviewScreen';
import MandiPricesScreen from './MandiPricesScreen';
import MandiEnquiriesScreen from './MandiEnquiriesScreen';
import MandiHistoryScreen from './MandiHistoryScreen';
import MandiProfileScreen from './MandiProfileScreen';

const Tab = createBottomTabNavigator();
const { width: windowWidth } = Dimensions.get('window');

function MandiCustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Overview', iconName: 'storefront-outline', activeIconName: 'storefront', label: 'Overview' },
    { name: 'Prices', iconName: 'chart-line', activeIconName: 'chart-box', label: 'Prices' },
    { name: 'Enquiries', iconName: 'message-text-outline', activeIconName: 'message-text', label: 'Enquiries' },
    { name: 'History', iconName: 'history', activeIconName: 'history', label: 'History' },
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
              color={isFocused ? '#E65100' : '#8D6E63'}
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

export default function MandiOwnerTabScreen() {
  return (
    <Tab.Navigator
      tabBar={(props) => <MandiCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Overview" component={MandiOverviewScreen} />
      <Tab.Screen name="Prices" component={MandiPricesScreen} />
      <Tab.Screen name="Enquiries" component={MandiEnquiriesScreen} />
      <Tab.Screen name="History" component={MandiHistoryScreen} />
      <Tab.Screen name="Profile" component={MandiProfileScreen} />
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
    borderColor: '#EFEBE9',
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
    backgroundColor: '#FFF3E0',
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#757575',
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#E65100',
    fontWeight: 'bold',
  },
});
