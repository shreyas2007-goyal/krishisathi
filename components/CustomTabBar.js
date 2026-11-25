import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TAB_CONFIG = {
  Home: { icon: 'home-variant-outline', activeIcon: 'home-variant', label: 'होम / Home' },
  Chat: { icon: 'robot-happy-outline', activeIcon: 'robot-happy', label: 'सहायक / AI' },
  Weather: { icon: 'weather-partly-cloudy', activeIcon: 'weather-sunny', label: 'मौसम / Weather' },
  Market: { icon: 'storefront-outline', activeIcon: 'storefront', label: 'मंडी / Market' },
  Profile: { icon: 'account-outline', activeIcon: 'account', label: 'प्रोफ़ाइल / Profile' },
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  if (!state || !state.routes) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors && descriptors[route.key] ? descriptors[route.key] : {};
          const options = descriptor.options || {};
          const isFocused = state.index === index;

          const config = TAB_CONFIG[route.name] || {
            icon: 'circle-outline',
            activeIcon: 'circle',
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || config.label}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.activeTab]}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={isFocused ? config.activeIcon : config.icon}
                size={24}
                color={isFocused ? '#1B5E20' : '#4B5563'}
              />
              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D1E7D1',
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 6,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 52,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#E8F5E9',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 3,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#1B5E20',
    fontWeight: '800',
  },
});
