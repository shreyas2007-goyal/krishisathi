import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/customer/CustomerProfileScreen.js
// KisanSAATHI - Customer / Buyer Profile & Settings Screen

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';

export default function CustomerProfileScreen() {
  const { user, roleProfile, logout } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const handleLogout = () => {
    Alert.alert(
      lang === 'hi' ? 'लॉगआउट' : 'Logout',
      lang === 'hi' ? 'क्या आप निश्चित रूप से लॉगआउट करना चाहते हैं?' : 'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PROFILE HERO */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="cart-outline" size={36} color="#1565C0" />
          </View>
          <Text style={styles.userName}>{user?.fullName || 'Commodity Buyer'}</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.roleBadge}>
              {lang === 'hi' ? 'सत्यापित खरीदार / व्यापारी' : 'Verified Buyer / Trader'}
            </Text>
          </View>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MaterialCommunityIcons name="phone" size={13} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.userPhone}>{user?.phoneNumber || '+91 98765 43210'}</Text>
          </View>
        </View>

        {/* BUSINESS DETAILS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? 'व्यापारिक जानकारी' : 'Business Information'}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'प्रतिष्ठान का नाम' : 'Business Name'}:</Text>
            <Text style={styles.infoValue}>{roleProfile?.businessName || "Agros Trading Ltd."}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'व्यापार का प्रकार' : 'Business Type'}:</Text>
            <Text style={styles.infoValue}>{roleProfile?.businessType || 'Wholesale Buyer / Trader'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'पसंदीदा फसलें' : 'Target Commodities'}:</Text>
            <Text style={styles.infoValue}>
              {Array.isArray(roleProfile?.preferredCommodities)
                ? roleProfile.preferredCommodities.join(', ')
                : 'Wheat, Mustard, Soybean'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'संचालन क्षेत्र' : 'Operating Territory'}:</Text>
            <Text style={styles.infoValue}>{roleProfile?.district || 'Karnal'}, {roleProfile?.state || 'Haryana'}</Text>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={[styles.logoutBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={handleLogout} activeOpacity={0.85}>
          <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>
            {lang === 'hi' ? 'खाते से लॉगआउट करें' : 'Log Out of Account'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  badgeRow: {
    marginVertical: 4,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
