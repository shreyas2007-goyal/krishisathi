import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/auth/AuthEntryScreen.js
// KisanSAATHI - Welcome & Authentication Landing Screen

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { getTranslation } from '../../services/translations';

const { width: windowWidth } = Dimensions.get('window');

export default function AuthEntryScreen({ navigation }) {
  const [lang, setLang] = useState('hi');
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const t = getTranslation(lang);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TOP LANGUAGE SELECTOR BAR */}
        <View style={styles.topLangBar}>
          <TouchableOpacity
            style={[styles.langChip, lang === 'hi' && styles.langChipActive]}
            onPress={() => setLang('hi')}
          >
            <Text style={[styles.langChipText, lang === 'hi' && styles.langChipTextActive]}>हिंदी</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, lang === 'pa' && styles.langChipActive]}
            onPress={() => setLang('pa')}
          >
            <Text style={[styles.langChipText, lang === 'pa' && styles.langChipTextActive]}>ਪੰਜਾਬੀ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, lang === 'en' && styles.langChipActive]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>English</Text>
          </TouchableOpacity>
        </View>

        {/* HERO BRANDING */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/farm.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>KisanSAATHI</Text>
          <Text style={styles.appSubtitle}>
            {lang === 'hi' ? 'आपका डिजिटल कृषि अधिकारी' : 'Your Digital Krishi Officer'}
          </Text>
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>
              {lang === 'hi'
                ? 'कृषि, मंडी भाव और बेहतर सौदों का संपूर्ण मंच'
                : 'Your farming and agricultural marketplace companion.'}
            </Text>
          </View>
        </View>

        {/* 3 ROLE VALUE PREVIEWS */}
        <View style={styles.rolesPreviewContainer}>
          <Text style={styles.rolesPreviewTitle}>
            {lang === 'hi' ? 'सभी कृषि हितधारकों के लिए' : 'Empowering Agricultural Stakeholders'}
          </Text>

          <View style={styles.roleMiniCard}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="sprout" size={22} color="#2E7D32" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.roleMiniHeading}>{lang === 'hi' ? 'किसान (Farmer)' : 'Farmer'}</Text>
              <Text style={styles.roleMiniDesc}>
                {lang === 'hi'
                  ? 'मौसम, फसल रोग निदान, लाइव मंडी भाव और उपज बिक्री'
                  : 'Crop health, weather, mandi prices & direct selling'}
              </Text>
            </View>
          </View>

          <View style={styles.roleMiniCard}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="cart-outline" size={22} color="#1565C0" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.roleMiniHeading}>{lang === 'hi' ? 'खरीदार व व्यापारी (Buyer)' : 'Customer / Buyer'}</Text>
              <Text style={styles.roleMiniDesc}>
                {lang === 'hi'
                  ? 'किसानों से सीधे ताज़ा कृषि उत्पाद खोजें और खरीद प्रस्ताव दें'
                  : 'Source verified crops directly from farmers at fair prices'}
              </Text>
            </View>
          </View>

          <View style={styles.roleMiniCard}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="storefront-outline" size={22} color="#E65100" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.roleMiniHeading}>{lang === 'hi' ? 'मंडी संचालक (Mandi Owner)' : 'Mandi Owner'}</Text>
              <Text style={styles.roleMiniDesc}>
                {lang === 'hi'
                  ? 'आधिकारिक मंडी भाव प्रकाशित करें और बाज़ार आवक प्रबंधित करें'
                  : 'Manage APMC market arrivals and publish authorized rates'}
              </Text>
            </View>
          </View>
        </View>

        {/* AUTH BUTTONS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('RoleSelect', { lang })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {lang === 'hi' ? 'खाता बनाएं (Create Account)' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login', { lang })}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>
              {lang === 'hi' ? 'लॉग इन करें (Login)' : 'Login to Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER LINKS */}
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => setTermsModalVisible(true)}>
            <Text style={styles.footerLinkText}>
              {lang === 'hi' ? 'नियम व शर्तें' : 'Terms & Conditions'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>•</Text>
          <TouchableOpacity onPress={() => setPrivacyModalVisible(true)}>
            <Text style={styles.footerLinkText}>
              {lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* TERMS MODAL */}
      <Modal visible={termsModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'hi' ? 'नियम एवं शर्तें' : 'Terms & Conditions'}
              </Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalParagraph}>
                1. KisanSAATHI connects Indian farmers, wholesale buyers, and APMC mandis to facilitate agricultural intelligence, fair pricing, and transparency.
              </Text>
              <Text style={styles.modalParagraph}>
                2. Market prices are sourced from official AGMARKNET feeds and authorized mandi authorities.
              </Text>
              <Text style={styles.modalParagraph}>
                3. Users agree to provide truthful business and crop details. False reporting may result in account suspension.
              </Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* PRIVACY POLICY MODAL */}
      <Modal visible={privacyModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
              </Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalParagraph}>
                1. Location data is collected solely to provide local weather forecasts, nearby mandi rates, and freight estimation.
              </Text>
              <Text style={styles.modalParagraph}>
                2. We protect your personal data with secure Firebase authentication and never sell your information to third-party advertisers.
              </Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
  },
  topLangBar: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 3,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  langChipActive: {
    backgroundColor: '#1B5E20',
  },
  langChipText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E7D32',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#4E6D4E',
    fontWeight: '600',
    marginTop: 2,
  },
  taglineBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  taglineText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
  rolesPreviewContainer: {
    width: '100%',
    marginTop: 26,
  },
  rolesPreviewTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  roleMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E8E0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  roleMiniIcon: {
    fontSize: 28,
  },
  roleMiniHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  roleMiniDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  actionsContainer: {
    width: '100%',
    marginTop: 20,
  },
  primaryBtn: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1B5E20',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  footerLinkText: {
    fontSize: 12,
    color: '#557A55',
    textDecorationLine: 'underline',
  },
  footerDot: {
    marginHorizontal: 8,
    color: '#AAA',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#777',
    fontWeight: 'bold',
  },
  modalBody: {
    marginTop: 14,
  },
  modalParagraph: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginBottom: 10,
  },
});
