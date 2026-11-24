import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/auth/RegisterScreen.js
// KisanSAATHI - Role-Specific Registration Screen

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';
import { USER_ROLES } from '../../services/authService';

export default function RegisterScreen({ navigation, route }) {
  const lang = route.params?.lang || 'hi';
  const role = route.params?.role || USER_ROLES.FARMER;

  const { register } = useAuth();

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState(role === USER_ROLES.MANDI_OWNER ? 'Haryana' : 'Punjab');
  const [district, setDistrict] = useState(role === USER_ROLES.MANDI_OWNER ? 'Karnal' : 'Ludhiana');
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Farmer Specific Fields
  const [village, setVillage] = useState('Raikot');
  const [farmSize, setFarmSize] = useState('5 Acres');
  const [primaryCrops, setPrimaryCrops] = useState('Wheat, Paddy');
  const [farmingExperience, setFarmingExperience] = useState('8 Years');
  const [landOwnership, setLandOwnership] = useState('Owned');

  // Customer Specific Fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Wholesale Buyer / Trader');
  const [preferredCommodities, setPreferredCommodities] = useState('Wheat, Soybean, Mustard');
  const [businessAddress, setBusinessAddress] = useState('');

  // Mandi Owner Specific Fields
  const [mandiName, setMandiName] = useState('');
  const [mandiAddress, setMandiAddress] = useState('');
  const [registrationDetails, setRegistrationDetails] = useState('APMC/REG/2026/089');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegisterSubmit = async () => {
    setErrorMessage('');

    if (!fullName.trim() || !email.trim() || !password || !mobileNumber.trim()) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया नाम, मोबाइल, ईमेल और पासवर्ड दर्ज करें।'
          : 'Please complete all required fields.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        lang === 'hi'
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (!termsAccepted) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया नियम एवं शर्तों को स्वीकार करें।'
          : 'Please accept Terms & Privacy Policy to continue.'
      );
      return;
    }

    let profileData = {};
    if (role === USER_ROLES.FARMER) {
      profileData = {
        farmSize,
        primaryCrops: primaryCrops.split(',').map((c) => c.trim()),
        farmingExperience,
        state,
        district,
        village,
        landOwnership,
      };
    } else if (role === USER_ROLES.CUSTOMER) {
      profileData = {
        businessName: businessName.trim() || `${fullName}'s Agro Trades`,
        businessType,
        preferredCommodities: preferredCommodities.split(',').map((c) => c.trim()),
        state,
        district,
        address: businessAddress,
      };
    } else if (role === USER_ROLES.MANDI_OWNER) {
      profileData = {
        mandiName: mandiName.trim() || `${district} APMC Grain Market`,
        mandiAddress: mandiAddress.trim() || `${district}, ${state}`,
        state,
        district,
        registrationDetails: registrationDetails.trim(),
        verificationStatus: 'pending',
      };
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phoneNumber: mobileNumber.trim(),
        role,
        preferredLanguage: lang,
        profileData,
      });
      // Registration successful! AuthContext updates user state, triggering navigation in App.js
    } catch (e) {
      setErrorMessage(e.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleHeaderInfo = () => {
    if (role === USER_ROLES.FARMER) {
      return {
        iconName: 'sprout',
        title: lang === 'hi' ? 'किसान पंजीकरण' : 'Farmer Registration',
        badge: lang === 'hi' ? 'कृषि उत्पादक' : 'Producer Profile',
        badgeBg: '#E8F5E9',
        badgeColor: '#1B5E20',
      };
    }
    if (role === USER_ROLES.CUSTOMER) {
      return {
        iconName: 'cart-outline',
        title: lang === 'hi' ? 'खरीदार पंजीकरण' : 'Buyer Registration',
        badge: lang === 'hi' ? 'थोक व खुदरा खरीदार' : 'Buyer Profile',
        badgeBg: '#E3F2FD',
        badgeColor: '#1565C0',
      };
    }
    return {
      iconName: 'storefront-outline',
      title: lang === 'hi' ? 'मंडी संचालक पंजीकरण' : 'Mandi Owner Registration',
      badge: lang === 'hi' ? 'APMC बाज़ार' : 'Market Administration',
      badgeBg: '#FFF3E0',
      badgeColor: '#E65100',
    };
  };

  const roleInfo = getRoleHeaderInfo();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* HEADER BAR */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ {lang === 'hi' ? 'भूमिका बदलें' : 'Change Role'}</Text>
          </TouchableOpacity>
          <View style={[styles.roleBadgeBox, { backgroundColor: roleInfo.badgeBg, flexDirection: 'row', alignItems: 'center' }]}>
            <MaterialCommunityIcons name={roleInfo.iconName} size={15} color={roleInfo.badgeColor} style={{ marginRight: 5 }} />
            <Text style={[styles.roleBadgeText, { color: roleInfo.badgeColor }]}>
              {roleInfo.badge}
            </Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>{roleInfo.title}</Text>
          <Text style={styles.subtitleText}>
            {lang === 'hi'
              ? 'अपना विवरण दर्ज करें और अपनी समर्पित सुविधाओं तक पहुंचें।'
              : 'Complete your profile to access specialized features for your role.'}
          </Text>
        </View>

        {/* ERROR BANNER */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C62828" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* REGISTRATION FORM */}
        <View style={styles.formContainer}>
          {/* SECTION: BASIC IDENTITY */}
          <Text style={styles.sectionHeading}>
            {lang === 'hi' ? 'व्यक्तिगत पहचान' : 'Account Details'}
          </Text>

          <Text style={styles.fieldLabel}>
            {lang === 'hi' ? 'पूरा नाम *' : 'Full Name *'}
          </Text>
          <TextInput
            style={styles.inputField}
            placeholder={lang === 'hi' ? 'उदा. रमेश सिंह' : 'e.g. Ramesh Singh'}
            placeholderTextColor="#888"
            value={fullName}
            onChangeText={setFullName}
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>
                {lang === 'hi' ? 'मोबाइल नंबर *' : 'Mobile Number *'}
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="+91 98765 43210"
                placeholderTextColor="#888"
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>
                {lang === 'hi' ? 'ईमेल पता *' : 'Email *'}
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="ramesh@example.com"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            {lang === 'hi' ? 'पासवर्ड (कम से कम 6 अक्षर) *' : 'Password (min 6 chars) *'}
          </Text>
          <TextInput
            style={styles.inputField}
            placeholder="••••••••"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* SECTION: LOCATION */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
            {lang === 'hi' ? 'स्थान विवरण' : 'Location Information'}
          </Text>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'राज्य *' : 'State *'}</Text>
              <TextInput
                style={styles.inputField}
                value={state}
                onChangeText={setState}
                placeholder="e.g. Punjab"
                placeholderTextColor="#888"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'ज़िला *' : 'District *'}</Text>
              <TextInput
                style={styles.inputField}
                value={district}
                onChangeText={setDistrict}
                placeholder="e.g. Ludhiana"
                placeholderTextColor="#888"
              />
            </View>
          </View>

          {/* ROLE-SPECIFIC FIELDS */}
          {role === USER_ROLES.FARMER && (
            <View style={styles.roleSpecificBox}>
              <Text style={styles.sectionHeading}>
                {lang === 'hi' ? 'खेती का विवरण' : 'Farm Profile'}
              </Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>{lang === 'hi' ? 'गाँव / क्षेत्र' : 'Village'}</Text>
                  <TextInput
                    style={styles.inputField}
                    value={village}
                    onChangeText={setVillage}
                    placeholder="e.g. Raikot"
                    placeholderTextColor="#888"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{lang === 'hi' ? 'खेत का आकार' : 'Farm Size'}</Text>
                  <TextInput
                    style={styles.inputField}
                    value={farmSize}
                    onChangeText={setFarmSize}
                    placeholder="e.g. 5 Acres"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'मुख्य फसलें' : 'Primary Crops'}</Text>
              <TextInput
                style={styles.inputField}
                value={primaryCrops}
                onChangeText={setPrimaryCrops}
                placeholder="e.g. Wheat, Paddy, Cotton"
                placeholderTextColor="#888"
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>{lang === 'hi' ? 'अनुभव' : 'Experience'}</Text>
                  <TextInput
                    style={styles.inputField}
                    value={farmingExperience}
                    onChangeText={setFarmingExperience}
                    placeholder="e.g. 10 Years"
                    placeholderTextColor="#888"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{lang === 'hi' ? 'भूमि स्वामित्व' : 'Ownership'}</Text>
                  <TextInput
                    style={styles.inputField}
                    value={landOwnership}
                    onChangeText={setLandOwnership}
                    placeholder="Owned / Leased"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
            </View>
          )}

          {role === USER_ROLES.CUSTOMER && (
            <View style={styles.roleSpecificBox}>
              <Text style={styles.sectionHeading}>
                {lang === 'hi' ? 'व्यापारिक विवरण' : 'Buyer Profile'}
              </Text>

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'प्रतिष्ठान / व्यापार का नाम' : 'Business / Mill Name'}</Text>
              <TextInput
                style={styles.inputField}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Agros Agro Trades Ltd."
                placeholderTextColor="#888"
              />

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'व्यापार का प्रकार' : 'Business Type'}</Text>
              <TextInput
                style={styles.inputField}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="e.g. Wholesale Trader / Processor"
                placeholderTextColor="#888"
              />

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'पसंदीदा फसलें / उपज' : 'Target Commodities'}</Text>
              <TextInput
                style={styles.inputField}
                value={preferredCommodities}
                onChangeText={setPreferredCommodities}
                placeholder="e.g. Wheat, Mustard, Soybean"
                placeholderTextColor="#888"
              />
            </View>
          )}

          {role === USER_ROLES.MANDI_OWNER && (
            <View style={styles.roleSpecificBox}>
              <Text style={styles.sectionHeading}>
                {lang === 'hi' ? 'मंडी प्रशासन विवरण' : 'Mandi Administration Profile'}
              </Text>

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'मंडी का नाम *' : 'Mandi Name *'}</Text>
              <TextInput
                style={styles.inputField}
                value={mandiName}
                onChangeText={setMandiName}
                placeholder="e.g. Karnal Grain APMC Market"
                placeholderTextColor="#888"
              />

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'मंडी का पूरा पता *' : 'Full Mandi Address *'}</Text>
              <TextInput
                style={styles.inputField}
                value={mandiAddress}
                onChangeText={setMandiAddress}
                placeholder="e.g. APMC Yard, GT Road, Karnal"
                placeholderTextColor="#888"
              />

              <Text style={styles.fieldLabel}>{lang === 'hi' ? 'APMC पंजीकरण / लाइसेंस नंबर' : 'APMC Registration / License No.'}</Text>
              <TextInput
                style={styles.inputField}
                value={registrationDetails}
                onChangeText={setRegistrationDetails}
                placeholder="e.g. APMC/HR/KRN/2026/092"
                placeholderTextColor="#888"
              />

              <View style={styles.mandiNoticeBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#C62828" style={{ marginRight: 6 }} />
                  <Text style={styles.mandiNoticeTitle}>
                    {lang === 'hi' ? 'सत्यापन नोटिस (Verification Notice)' : 'Verification Notice'}
                  </Text>
                </View>
                <Text style={styles.mandiNoticeText}>
                  {lang === 'hi'
                    ? 'पंजीकरण के बाद आपका खाता "समीक्षाधीन (Pending)" रहेगा। कृषि विपणन निदेशालय द्वारा सत्यापन के बाद ही आधिकारिक भाव प्रकाशन की अनुमति होगी।'
                    : 'Your mandi account will be set to "Pending" initially. Official price publishing requires administrator verification.'}
                </Text>
              </View>
            </View>
          )}

          {/* TERMS CHECKBOX */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
              {termsAccepted && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>
              {lang === 'hi'
                ? 'मैं किसान साथी के नियम, शर्तें और गोपनीयता नीति स्वीकार करता हूँ।'
                : 'I agree to the Terms of Service & Privacy Policy of KisanSAATHI.'}
            </Text>
          </TouchableOpacity>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegisterSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {lang === 'hi' ? 'खाता बनाएं एवं जारी रखें' : 'Complete Registration'} →
              </Text>
            )}
          </TouchableOpacity>

          {/* ALREADY REGISTERED */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login', { lang })}
          >
            <Text style={styles.loginLinkText}>
              {lang === 'hi' ? 'पहले से खाता है? ' : 'Already registered? '}
              <Text style={{ color: '#1B5E20', fontWeight: 'bold' }}>
                {lang === 'hi' ? 'लॉग इन करें' : 'Login here'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 18,
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
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  roleBadgeBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  titleSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitleText: {
    fontSize: 12,
    color: '#557A55',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E0E8E0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#D0DDD0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#212121',
    marginBottom: 12,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  roleSpecificBox: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  mandiNoticeBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 12,
  },
  mandiNoticeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 2,
  },
  mandiNoticeText: {
    fontSize: 11,
    color: '#5D4037',
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#1B5E20',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#444',
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#1B5E20',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  loginLinkText: {
    fontSize: 13,
    color: '#666',
  },
});
