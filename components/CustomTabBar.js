import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';

const windowWidth = Dimensions.get('window').width;

const ICONS = {
    Home: require('../assets/home.png'),
    Market: require('../assets/basket.png'),
    Diagnosis: require('../assets/diagnosis.png'),
    Chat: require('../assets/chat.png'),
    Profile: require('../assets/profile.png'),
};

function getTabIcon(name) {
    if (ICONS[name]) return ICONS[name];
    const lower = String(name || '').toLowerCase();
    if (lower.includes('home')) return ICONS.Home;
    if (lower.includes('market') || lower.includes('basket')) return ICONS.Market;
    if (lower.includes('diag')) return ICONS.Diagnosis;
    if (lower.includes('chat')) return ICONS.Chat;
    if (lower.includes('prof')) return ICONS.Profile;
    return ICONS.Home;
}

export default function CustomTabBar({ state, descriptors, navigation }) {
  if (!state || !state.routes) return null;

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors && descriptors[route.key] ? descriptors[route.key] : {};
        const options = descriptor.options || {};
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconSource = getTabIcon(route.name || label);

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={[styles.tabItem, isFocused ? styles.activeTab : null]}
          >
            <Image
                source={iconSource}
                style={{
                    width: isFocused ? 26 : 22,
                    height: isFocused ? 26 : 22,
                    tintColor: isFocused ? '#134E17' : '#557A55',
                }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#B9F2AF',
    marginHorizontal: 20,
    marginVertical: 25,
    borderRadius: 25,
    height: 60,
    width: windowWidth - 40,
    alignSelf: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,

    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
  },
  activeTab: {
    backgroundColor: '#9BE490',
  },
});
