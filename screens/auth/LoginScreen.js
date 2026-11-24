import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/auth/LoginScreen.js
// KisanSAATHI - Multi-Role Authentication Login Screen

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
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';
import { USER_ROLES } from '../../services/authService';

export default function LoginScreen({ navigation, route }) {
  const lang = route.params?.lang || 'hi';
  const { login, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLoginSubmit = async () => {
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया ईमेल और पासवर्ड दोनों दर्ज करें।'
          : 'Please enter both email and password.'
      );
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      // Upon successful login, AuthContext updates state, triggering navigation in App.js
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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

  // Demo shortcut login for quick testing
  const handleQuickDemoFill = (roleType) => {
    if (roleType === USER_ROLES.FARMER) {
      setEmail('farmer.ramesh@kisansaathi.in');
      setPassword('Kisan@123');
    } else if (roleType === USER_ROLES.CUSTOMER) {
      setEmail('buyer.itc@kisansaathi.in');
      setPassword('Kisan@123');
    } else if (roleType === USER_ROLES.MANDI_OWNER) {
      setEmail('mandi.karnal@kisansaathi.in');
      setPassword('Kisan@123');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* TOP BAR */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ {lang === 'hi' ? 'वापस' : 'Back'}</Text>
          </TouchableOpacity>
        </View>

        {/* TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>
            {lang === 'hi' ? 'खाते में लॉग इन करें' : 'Login to Your Account'}
          </Text>
          <Text style={styles.subtitleText}>
            {lang === 'hi'
              ? 'किसान साथी में आपका स्वागत है। अपनी भूमिका के अनुसार सुरक्षित प्रवेश करें।'
              : 'Enter your credentials to access your personalized role dashboard.'}
          </Text>
        </View>

        {/* ERROR BANNER */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C62828" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* FORM FIELDS */}
        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>
            {lang === 'hi' ? 'ईमेल पता' : 'Email Address'}
          </Text>
          <TextInput
            style={styles.inputField}
            placeholder={lang === 'hi' ? 'उदा. ramesh@kisansaathi.in' : 'e.g. farmer@kisansaathi.in'}
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <View style={styles.passwordLabelRow}>
            <Text style={styles.fieldLabel}>
              {lang === 'hi' ? 'पासवर्ड' : 'Password'}
            </Text>
            <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
              <Text style={styles.forgotText}>
                {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={lang === 'hi' ? '••••••••' : '••••••••'}
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLoginSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>
                {lang === 'hi' ? 'लॉग इन करें' : 'Login'} →
              </Text>
            )}
          </TouchableOpacity>

          {/* DEMO SHORTCUT PRESETS */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>
              {lang === 'hi' ? 'त्वरित परीक्षण खाते (Quick Demo Presets):' : 'Quick Demo Credentials:'}
            </Text>
            <View style={styles.demoBtnsRow}>
              <TouchableOpacity
                style={[styles.demoBtn, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => handleQuickDemoFill(USER_ROLES.FARMER)}
              >
                <MaterialCommunityIcons name="sprout" size={16} color="#1B5E20" style={{ marginRight: 4 }} />
                <Text style={styles.demoBtnText}>{lang === 'hi' ? 'किसान' : 'Farmer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, { borderColor: '#1565C0', backgroundColor: '#E3F2FD', flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => handleQuickDemoFill(USER_ROLES.CUSTOMER)}
              >
                <MaterialCommunityIcons name="cart-outline" size={16} color="#1565C0" style={{ marginRight: 4 }} />
                <Text style={[styles.demoBtnText, { color: '#1565C0' }]}>{lang === 'hi' ? 'खरीदार' : 'Buyer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, { borderColor: '#E65100', backgroundColor: '#FFF3E0', flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => handleQuickDemoFill(USER_ROLES.MANDI_OWNER)}
              >
                <MaterialCommunityIcons name="storefront-outline" size={16} color="#E65100" style={{ marginRight: 4 }} />
                <Text style={[styles.demoBtnText, { color: '#E65100' }]}>{lang === 'hi' ? 'मंडी' : 'Mandi'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* REGISTER LINK */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('RoleSelect', { lang })}
          >
            <Text style={styles.registerLinkText}>
              {lang === 'hi' ? 'नया खाता बनाना चाहते हैं? ' : "Don't have an account? "}
              <Text style={{ color: '#1B5E20', fontWeight: 'bold' }}>
                {lang === 'hi' ? 'रजिस्टर करें' : 'Create Account'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FORGOT PASSWORD MODAL */}
      <Modal visible={forgotModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
              </Text>
              <TouchableOpacity onPress={() => setForgotModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {lang === 'hi'
                ? 'अपना पंजीकृत ईमेल दर्ज करें। हम आपको पासवर्ड रीसेट करने का लिंक भेजेंगे।'
                : 'Enter your registered email address. We will send you instructions to reset your password.'}
            </Text>

            {resetSuccess ? (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                <Text style={styles.successText}>{resetSuccess}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. farmer@kisansaathi.in"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
            />

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleResetSubmit}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.resetBtnText}>
                  {lang === 'hi' ? 'रीसेट लिंक भेजें' : 'Send Reset Link'}
                </Text>
              )}
            </TouchableOpacity>
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
  },
  headerRow: {
    marginTop: 10,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  titleSection: {
    marginTop: 20,
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
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E8E0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#D0DDD0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212121',
    marginBottom: 16,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#D0DDD0',
    borderRadius: 14,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212121',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loginBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#1B5E20',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  demoTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  demoBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  registerLinkText: {
    fontSize: 13,
    color: '#666',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalSub: {
    fontSize: 13,
    color: '#666',
    marginVertical: 10,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    marginVertical: 10,
  },
  resetBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
