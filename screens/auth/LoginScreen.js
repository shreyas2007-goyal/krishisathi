// screens/auth/LoginScreen.js
// KisanSAATHI - Glassmorphic Farm Background Login Screen

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import { USER_ROLES } from '../../services/authService';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const [lang, setLang] = useState(route.params?.lang || 'hi');
  const { login, loginWithPhone, resetPassword } = useAuth();

  // Mode: 'phone' (Name & Mobile Number as in screenshot) vs 'email' (Email & Password)
  const [loginMode, setLoginMode] = useState('phone'); // 'phone' | 'email'

  // Selected Role
  const [selectedRole, setSelectedRole] = useState(USER_ROLES.FARMER);

  // Phone Login State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Email Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // General State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  /**
   * Handle Direct Phone + Name Login (Matching Screenshot)
   */
  const handlePhoneLogin = async () => {
    setErrorMessage('');
    if (!fullName.trim()) {
      setErrorMessage(lang === 'hi' ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your name.');
      return;
    }
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage(
        lang === 'hi' ? 'कृपया मान्य 10-अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    setLoading(true);
    try {
      await loginWithPhone({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        role: selectedRole,
        preferredLanguage: lang,
      });
      // Navigation is automatically handled in App.js based on auth state
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Standard Email + Password Login
   */
  const handleEmailLogin = async () => {
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage(lang === 'hi' ? 'कृपया ईमेल और पासवर्ड दोनों दर्ज करें।' : 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * One-Tap Instant Demo Login (Farmer / Buyer / Mandi)
   */
  const handleInstantDemoLogin = async (demoRole = selectedRole) => {
    setErrorMessage('');
    const demoProfiles = {
      [USER_ROLES.FARMER]: { fullName: 'Ramesh Kumar', phoneNumber: '9876543210' },
      [USER_ROLES.CUSTOMER]: { fullName: 'Amit Sharma', phoneNumber: '9823044100' },
      [USER_ROLES.MANDI_OWNER]: { fullName: 'Suresh Gupta', phoneNumber: '9811122233' },
    };
    const chosen = demoProfiles[demoRole] || demoProfiles[USER_ROLES.FARMER];

    setSelectedRole(demoRole);
    setFullName(chosen.fullName);
    setMobileNumber(chosen.phoneNumber);
    setLoading(true);
    try {
      await loginWithPhone({
        fullName: chosen.fullName,
        phoneNumber: chosen.phoneNumber,
        role: demoRole,
        preferredLanguage: lang,
      });
    } catch (err) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quick Demo Auto-Fill & Login
   */
  const handleQuickDemo = () => {
    handleInstantDemoLogin(selectedRole);
  };

  const handleResetSubmit = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await resetPassword(resetEmail.trim());
      setResetSuccess(res.message);
      setTimeout(() => {
        setForgotModalVisible(false);
        setResetSuccess('');
        setResetEmail('');
      }, 2500);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/farm_login_bg.jpg')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* TOP BAR OVERLAY WITH KISANSAATHI LOGO */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.topCornerBrandBox}>
              <Image
                source={require('../../assets/kisansaathi_logo.png')}
                style={styles.topCornerLogo}
                resizeMode="contain"
              />
              <Text style={styles.topCornerBrandName}>KisanSAATHI</Text>
            </View>
          </View>

          {/* Quick Demo Fill & Language Switcher */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleQuickDemo} style={styles.demoFillBtn} activeOpacity={0.8}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFFFFF" />
              <Text style={styles.demoFillText}>{lang === 'hi' ? 'डेमो भरें' : 'Demo'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}
              style={styles.langSwitchBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.langSwitchText}>{lang === 'hi' ? 'EN' : 'हिंदी'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.centerContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* GLASSMORPHIC LOGIN CARD (MATCHING USER SCREENSHOT) */}
          <View style={styles.glassCard}>
            {/* ROLE SELECTOR CHIPS ON TOP OF CARD */}
            <View style={styles.roleTabsContainer}>
              {[
                { role: USER_ROLES.FARMER, label: lang === 'hi' ? 'किसान' : 'Farmer', icon: 'sprout' },
                { role: USER_ROLES.CUSTOMER, label: lang === 'hi' ? 'खरीदार' : 'Buyer', icon: 'cart-outline' },
                { role: USER_ROLES.MANDI_OWNER, label: lang === 'hi' ? 'मंडी' : 'Mandi', icon: 'storefront-outline' },
              ].map((r) => {
                const isActive = selectedRole === r.role;
                return (
                  <TouchableOpacity
                    key={r.role}
                    style={[styles.roleTab, isActive && styles.roleTabActive]}
                    onPress={() => setSelectedRole(r.role)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={r.icon}
                      size={14}
                      color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* OFFICIAL KISAN SAATHI LOGO EMBLEM */}
            <View style={styles.logoBadgeContainer}>
              <View style={styles.logoCircleWrapper}>
                <Image
                  source={require('../../assets/kisansaathi_logo.png')}
                  style={styles.officialLogoImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* CARD TITLE */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {selectedRole === USER_ROLES.FARMER
                  ? (lang === 'hi' ? 'किसान लॉगिन' : 'Farmer Login')
                  : selectedRole === USER_ROLES.CUSTOMER
                  ? (lang === 'hi' ? 'खरीदार लॉगिन' : 'Customer Login')
                  : (lang === 'hi' ? 'मंडी संचालक लॉगिन' : 'Mandi Login')}
              </Text>
            </View>

            {/* ERROR BANNER */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FFCDD2" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ========================================================== */}
            {/* MODE 1: NAME & MOBILE NUMBER (DEFAULT AS PER SCREENSHOT)    */}
            {/* ========================================================== */}
            {loginMode === 'phone' ? (
              <View style={styles.formSection}>
                {/* FIELD 1: NAME */}
                <Text style={styles.inputLabel}>{lang === 'hi' ? 'नाम (Name)' : 'Name'}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={lang === 'hi' ? 'अपना नाम दर्ज करें' : 'Enter your name'}
                    placeholderTextColor="rgba(255, 255, 255, 0.65)"
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </View>

                {/* FIELD 2: MOBILE NUMBER */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                  {lang === 'hi' ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Number'}
                </Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={lang === 'hi' ? 'मोबाइल नंबर दर्ज करें' : 'Enter mobile number'}
                    placeholderTextColor="rgba(255, 255, 255, 0.65)"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobileNumber}
                    onChangeText={(val) => {
                      setMobileNumber(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </View>

                {/* LOGIN BUTTON (SOLID VIBRANT GREEN) */}
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={handlePhoneLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginBtnText}>{lang === 'hi' ? 'लॉगिन करें' : 'Login'}</Text>
                  )}
                </TouchableOpacity>

                {/* SWITCH TO EMAIL & PASSWORD */}
                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => setLoginMode('email')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="email-outline" size={14} color="rgba(255, 255, 255, 0.85)" style={{ marginRight: 6 }} />
                  <Text style={styles.switchModeText}>
                    {lang === 'hi' ? 'ईमेल एवं पासवर्ड से लॉगिन करें' : 'Or Login with Email & Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ========================================================== */
              /* MODE 2: EMAIL & PASSWORD LOGIN                              */
              /* ========================================================== */
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>{lang === 'hi' ? 'ईमेल पता' : 'Email Address'}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="farmer@kisansaathi.in"
                    placeholderTextColor="rgba(255, 255, 255, 0.65)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? 'पासवर्ड' : 'Password'}</Text>
                  <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
                    <Text style={styles.forgotPassText}>{lang === 'hi' ? 'भूल गए?' : 'Forgot?'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputBox, { flexDirection: 'row', alignItems: 'center' }]}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255, 255, 255, 0.65)"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                  </TouchableOpacity>
                </View>

                {/* LOGIN BUTTON */}
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={handleEmailLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginBtnText}>{lang === 'hi' ? 'लॉगिन करें' : 'Login'}</Text>
                  )}
                </TouchableOpacity>

                {/* SWITCH TO MOBILE NUMBER LOGIN */}
                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => setLoginMode('phone')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="cellphone" size={14} color="rgba(255, 255, 255, 0.85)" style={{ marginRight: 6 }} />
                  <Text style={styles.switchModeText}>
                    {lang === 'hi' ? 'नाम व मोबाइल नंबर से लॉगिन करें' : 'Back to Mobile Number Login'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ONE-TAP DEMO LOGIN SECTION */}
            <View style={styles.demoSection}>
              <Text style={styles.demoSectionLabel}>
                {lang === 'hi' ? 'एक-टैप डेमो लॉगिन (Instant Demo Login)' : 'One-Tap Demo Login'}
              </Text>
              <View style={styles.demoBtnRow}>
                <TouchableOpacity
                  style={styles.demoRoleBtn}
                  onPress={() => handleInstantDemoLogin(USER_ROLES.FARMER)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="sprout" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.demoRoleBtnText}>{lang === 'hi' ? 'किसान डेमो' : 'Farmer'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoRoleBtn}
                  onPress={() => handleInstantDemoLogin(USER_ROLES.CUSTOMER)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="cart-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.demoRoleBtnText}>{lang === 'hi' ? 'खरीदार डेमो' : 'Buyer'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoRoleBtn}
                  onPress={() => handleInstantDemoLogin(USER_ROLES.MANDI_OWNER)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="storefront-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.demoRoleBtnText}>{lang === 'hi' ? 'मंडी डेमो' : 'Mandi'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CREATE ACCOUNT LINK */}
            <View style={styles.createAccountRow}>
              <Text style={styles.createAccountPrompt}>
                {lang === 'hi' ? 'नया खाता बनाना चाहते हैं?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('RoleSelect', { lang })}>
                <Text style={styles.createAccountLink}>
                  {' '}{lang === 'hi' ? 'रजिस्टर करें' : 'Register'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* FORGOT PASSWORD MODAL */}
        <Modal
          visible={forgotModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setForgotModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeading}>{lang === 'hi' ? 'पासवर्ड रीसेट' : 'Reset Password'}</Text>
              <Text style={styles.modalSub}>
                {lang === 'hi'
                  ? 'अपना पंजीकृत ईमेल दर्ज करें। रीसेट लिंक भेज दिया जाएगा।'
                  : 'Enter your registered email address to receive password reset link.'}
              </Text>

              {resetSuccess ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{resetSuccess}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.modalInput}
                placeholder="farmer@kisansaathi.in"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={resetEmail}
                onChangeText={setResetEmail}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setForgotModalVisible(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>{lang === 'hi' ? 'रद्द करें' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResetSubmit}
                  style={styles.modalSubmitBtn}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>{lang === 'hi' ? 'भेजें' : 'Send Link'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: windowWidth,
    height: windowHeight,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Subtle dark overlay for contrast
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  topCornerBrandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  topCornerLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  topCornerBrandName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  demoFillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  langSwitchBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  langSwitchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  // FROSTED GLASSMORPHIC CARD (EXACT MATCH FOR SCREENSHOT)
  glassCard: {
    width: Math.min(windowWidth - 32, 420),
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    paddingHorizontal: 26,
    paddingVertical: 28,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
      },
    }),
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 11,
  },
  roleTabActive: {
    backgroundColor: '#00A859',
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoCircleWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  officialLogoImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  farmerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 40, 40, 0.75)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  formSection: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  textInput: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  forgotPassText: {
    fontSize: 12,
    color: '#E0F2F1',
    textDecorationLine: 'underline',
  },
  // VIBRANT GREEN LOGIN BUTTON (MATCHES SCREENSHOT)
  loginBtn: {
    backgroundColor: '#00A859',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  switchModeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  createAccountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 14,
  },
  createAccountPrompt: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  createAccountLink: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  // MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  modalSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#222',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSubmitBtn: {
    backgroundColor: '#00A859',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  demoSectionLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  demoBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  demoRoleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  demoRoleBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
