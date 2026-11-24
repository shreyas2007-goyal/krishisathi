import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/mandi/MandiProfileScreen.js
// KisanSAATHI - Mandi Owner Profile & Administrative Settings

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

export default function MandiProfileScreen() {
  const { user, roleProfile, logout } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const isApproved = roleProfile?.verificationStatus === 'approved';

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
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="storefront-outline" size={36} color="#E65100" />
          </View>
          <Text style={styles.mandiName}>{roleProfile?.mandiName || 'APMC Grain Market'}</Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.statusBadge, isApproved ? styles.statusApproved : styles.statusPending]}>
              {isApproved
                ? (lang === 'hi' ? 'सत्यापित एपीएमसी (Verified APMC)' : 'Verified APMC')
                : (lang === 'hi' ? 'सत्यापन समीक्षाधीन (Pending)' : 'Verification Pending')}
            </Text>
          </View>
          <Text style={styles.userName}>Admin: {user?.fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* MANDI REGISTRATION DETAILS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {lang === 'hi' ? 'लाइसेंस व पंजीयन विवरण' : 'Registration & Legal Info'}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'लाइसेंस नंबर' : 'APMC License'}:</Text>
            <Text style={styles.infoValue}>{roleProfile?.registrationDetails || 'APMC/HR/KRN/2026/092'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'मंडी यार्ड का पता' : 'Yard Address'}:</Text>
            <Text style={styles.infoValue}>{roleProfile?.mandiAddress || 'APMC Complex, GT Road'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'ज़िला व राज्य' : 'District & State'}:</Text>
            <Text style={styles.infoValue}>{roleProfile?.district || 'Karnal'}, {roleProfile?.state || 'Haryana'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'hi' ? 'सत्यापन स्थिति' : 'Verification Status'}:</Text>
            <Text style={[styles.infoValue, { color: isApproved ? '#2E7D32' : '#E65100' }]}>
              {roleProfile?.verificationStatus?.toUpperCase() || 'PENDING'}
            </Text>
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
    backgroundColor: '#FAF7F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFE0B2',
    marginBottom: 8,
  },
  mandiName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  badgeRow: {
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusPending: {
    backgroundColor: '#FFF8E1',
    color: '#E65100',
  },
  statusApproved: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  userName: {
    fontSize: 13,
    color: '#424242',
    marginTop: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#212121',
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
