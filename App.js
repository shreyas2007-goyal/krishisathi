// App.js
// KisanSAATHI - Role-Based Root Navigation & Protected Routing

import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, Dimensions, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Context
import { AuthProvider, useAuth } from './services/AuthContext';
import { USER_ROLES } from './services/authService';

// Auth Screens
import AuthEntryScreen from './screens/auth/AuthEntryScreen';
import RoleSelectScreen from './screens/auth/RoleSelectScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Role Dashboards
import TabScreen from './screens/TabScreen'; // Farmer Flow
import CustomerTabScreen from './screens/customer/CustomerTabScreen'; // Customer/Buyer Flow
import MandiOwnerTabScreen from './screens/mandi/MandiOwnerTabScreen'; // Mandi Owner Flow
import DataScraperScreen from './screens/admin/DataScraperScreen'; // Data Scraper Bot (Admin)

// B2C Direct Platform & Farmer-Customer Chat
import B2CMarketplaceScreen from './screens/b2c/B2CMarketplaceScreen';
import B2CChatDetailScreen from './screens/b2c/B2CChatDetailScreen';
import B2CChatsListScreen from './screens/b2c/B2CChatsListScreen';

// Web3 Traceability & Smart Contract Escrow
import Web3TraceabilityScreen from './screens/web3/Web3TraceabilityScreen';

const Stack = createNativeStackNavigator();
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

// Inject Web Scrollbar & Smooth Scrolling CSS on Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const existing = document.getElementById('kisansaathi-global-scroll-style');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'kisansaathi-global-scroll-style';
    style.textContent = `
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #F1F8F1;
      }
      ::-webkit-scrollbar-thumb {
        background: #A5D6A7;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #2E7D32;
      }
      html, body, #root {
        height: 100%;
        overflow-x: hidden;
      }
    `;
    document.head.appendChild(style);
  }
}

function AppNavigator() {
  const { user, role, isLoading } = useAuth();

  // Loading / Splash Screen
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogoCircle}>
          <Image
            source={require('./assets/farm.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.splashTitle}>KisanSAATHI</Text>
        <Text style={styles.splashSubtitle}>कृषि एवं मंडी सेवा</Text>
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          // ==================== UNAUTHENTICATED AUTH STACK ====================
          <Stack.Group>
            <Stack.Screen name="AuthEntry" component={AuthEntryScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : (
          // ==================== AUTHENTICATED ROLE STACKS ====================
          <Stack.Group>
            {role === USER_ROLES.CUSTOMER ? (
              // Customer / Buyer Experience
              <Stack.Screen name="CustomerDashboard" component={CustomerTabScreen} />
            ) : role === USER_ROLES.MANDI_OWNER ? (
              // Mandi Owner / APMC Experience
              <Stack.Screen name="MandiDashboard" component={MandiOwnerTabScreen} />
            ) : (
              // Farmer Experience (Default & Primary)
              <Stack.Screen name="FarmerDashboard" component={TabScreen} />
            )}
            {/* Dedicated Internal Administration: KisanSAATHI Data Scraper */}
            <Stack.Screen name="DataScraper" component={DataScraperScreen} />

            {/* B2C Direct Farmer-to-Consumer & Negotiation Chat Stack */}
            <Stack.Screen name="B2CMarketplace" component={B2CMarketplaceScreen} />
            <Stack.Screen name="B2CChatDetail" component={B2CChatDetailScreen} />
            <Stack.Screen name="B2CChatsList" component={B2CChatsListScreen} />

            {/* Web3 Decentralized Traceability & Escrow */}
            <Stack.Screen name="Web3Traceability" component={Web3TraceabilityScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#F7FAF7',
    alignItems: 'center',
    justifyContent: 'center',
    width: windowWidth,
    height: windowHeight,
  },
  splashLogoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C8E6C9',
    shadowColor: '#1B5E20',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  splashLogo: {
    width: 100,
    height: 100,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 18,
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#4E6D4E',
    fontWeight: '600',
    marginTop: 4,
  },
});
