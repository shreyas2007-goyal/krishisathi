import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/auth/RoleSelectScreen.js
// KisanSAATHI - Role Selection Interface

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { USER_ROLES } from '../../services/authService';

export default function RoleSelectScreen({ navigation, route }) {
  const lang = route.params?.lang || 'hi';
  const [selectedRole, setSelectedRole] = useState(USER_ROLES.FARMER);

  const handleContinue = (role) => {
    navigation.navigate('Register', { role, lang });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* BACK / HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ {lang === 'hi' ? 'वापस' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.stepBadge}>
            {lang === 'hi' ? 'चरण 1 / 2' : 'Step 1 of 2'}
          </Text>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.titleText}>
            {lang === 'hi' ? 'अपनी भूमिका चुनें' : 'Choose Your Role'}
          </Text>
          <Text style={styles.subtitleText}>
            {lang === 'hi'
              ? 'आप किसान साथी का उपयोग किस रूप में करना चाहते हैं?'
              : 'Select how you want to use KisanSAATHI'}
          </Text>
        </View>

        {/* 3 ROLE CARDS */}
        <View style={styles.cardsContainer}>
          {/* ROLE 1: FARMER */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === USER_ROLES.FARMER && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole(USER_ROLES.FARMER)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="sprout" size={26} color="#2E7D32" />
              </View>
              <View style={styles.roleTitleBox}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi' ? 'किसान' : 'Farmer'}
                </Text>
                <Text style={styles.roleBadge}>
                  {lang === 'hi' ? 'कृषि उत्पादक' : 'Producer'}
                </Text>
              </View>
            </View>
            <Text style={styles.roleDescription}>
              Manage your farming activities, monitor crop health, discover market prices and find better selling opportunities.
            </Text>
            {lang === 'hi' && (
              <Text style={styles.roleDescHi}>
                अपनी खेती की गतिविधियों का प्रबंधन करें, फसल स्वास्थ्य की निगरानी करें, बाजार भाव जानें और बेहतर बिक्री के अवसर खोजें।
              </Text>
            )}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => handleContinue(USER_ROLES.FARMER)}
            >
              <Text style={styles.continueBtnText}>
                {lang === 'hi' ? 'किसान के रूप में आगे बढ़ें' : 'Continue as Farmer'} →
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* ROLE 2: CUSTOMER / BUYER */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === USER_ROLES.CUSTOMER && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole(USER_ROLES.CUSTOMER)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="cart-outline" size={26} color="#1565C0" />
              </View>
              <View style={styles.roleTitleBox}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi' ? 'खरीदार / ग्राहक' : 'Customer / Buyer'}
                </Text>
                <Text style={[styles.roleBadge, { backgroundColor: '#E3F2FD', color: '#1565C0' }]}>
                  {lang === 'hi' ? 'थोक व खुदरा खरीदार' : 'Buyer'}
                </Text>
              </View>
            </View>
            <Text style={styles.roleDescription}>
              Discover agricultural products, compare available produce and connect with farmers.
            </Text>
            {lang === 'hi' && (
              <Text style={styles.roleDescHi}>
                कृषि उत्पादों की खोज करें, उपलब्ध उपज की तुलना करें और सीधे किसानों से संपर्क करें।
              </Text>
            )}
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: '#1565C0' }]}
              onPress={() => handleContinue(USER_ROLES.CUSTOMER)}
            >
              <Text style={styles.continueBtnText}>
                {lang === 'hi' ? 'खरीदार के रूप में आगे बढ़ें' : 'Continue as Customer'} →
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* ROLE 3: MANDI OWNER */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === USER_ROLES.MANDI_OWNER && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole(USER_ROLES.MANDI_OWNER)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="storefront-outline" size={26} color="#E65100" />
              </View>
              <View style={styles.roleTitleBox}>
                <Text style={styles.roleTitle}>
                  {lang === 'hi' ? 'मंडी संचालक / APMC' : 'Mandi Owner'}
                </Text>
                <Text style={[styles.roleBadge, { backgroundColor: '#FFF3E0', color: '#E65100' }]}>
                  {lang === 'hi' ? 'बाज़ार प्रशासक' : 'APMC / Market'}
                </Text>
              </View>
            </View>
            <Text style={styles.roleDescription}>
              Manage your mandi, publish market information and connect with farmers and agricultural buyers.
            </Text>
            {lang === 'hi' && (
              <Text style={styles.roleDescHi}>
                अपनी मंडी का प्रबंधन करें, आधिकारिक बाज़ार भाव प्रकाशित करें और किसानों व खरीदारों से जुड़ें।
              </Text>
            )}
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: '#E65100' }]}
              onPress={() => handleContinue(USER_ROLES.MANDI_OWNER)}
            >
              <Text style={styles.continueBtnText}>
                {lang === 'hi' ? 'मंडी संचालक के रूप में आगे बढ़ें' : 'Continue as Mandi Owner'} →
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginRedirectBtn}
          onPress={() => navigation.navigate('Login', { lang })}
        >
          <Text style={styles.loginRedirectText}>
            {lang === 'hi' ? 'पहले से खाता है? ' : 'Already have an account? '}
            <Text style={{ fontWeight: 'bold', color: '#1B5E20' }}>
              {lang === 'hi' ? 'लॉग इन करें' : 'Login'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAF7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  stepBadge: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  titleSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitleText: {
    fontSize: 13,
    color: '#557A55',
    marginTop: 4,
  },
  cardsContainer: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: '#E0EAE0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#FAFCFA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 26,
  },
  roleTitleBox: {
    marginLeft: 12,
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  roleBadge: {
    fontSize: 11,
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  roleDescHi: {
    fontSize: 12,
    color: '#616161',
    lineHeight: 16,
    marginTop: 4,
  },
  continueBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loginRedirectBtn: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginRedirectText: {
    fontSize: 13,
    color: '#666',
  },
});
