// screens/DiagnosisScreen.js
// KisanSAATHI - Simple Farmer-First AI Crop Disease Detection

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../services/AuthContext';
import { getPreferredLanguage } from '../services/weatherStorage';

export default function DiagnosisScreen({ navigation }) {
  const { user } = useAuth();
  const [lang, setLang] = useState(user?.preferredLanguage || 'hi');
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getPreferredLanguage().then((saved) => {
      if (saved) setLang(saved);
    });
  }, []);

  const isHi = lang === 'hi';

  const pickImage = async (source) => {
    setErrorMsg('');
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMsg(
        isHi
          ? 'फोटो लेने या चुनने के लिए कैमरा/गैलरी की अनुमति दें।'
          : 'Please allow camera or gallery permission to upload a crop photo.'
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.55,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.55,
            base64: true,
          });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset);
      analyzeCropImage(asset);
    }
  };

  const analyzeCropImage = async (asset) => {
    if (!asset?.base64) return;
    setAnalyzing(true);
    setErrorMsg('');
    setDiagnosisResult(null);

    const promptText = isHi
      ? `इस फसल की फोटो को ध्यान से देखें और किसान के लिए बहुत ही सरल हिंदी में बताएं:
1. पहचानी गई फसल (यदि स्पष्ट हो)
2. संभावित बीमारी या कीट (कभी भी अनिश्चित बीमारी को पक्का न बताएं, "संभावित" लिखें)
3. फोटो में दिखने वाले लक्षण
4. विश्वास स्तर / अनिश्चितता (कम / मध्यम / स्पष्ट)
5. किसान को अभी क्या सावधानी व कदम उठाने चाहिए
6. नजदीकी कृषि विशेषज्ञ या कृषि विज्ञान केंद्र (KVK) से कब संपर्क करें।`
      : `Examine this crop photo carefully and explain in simple, farmer-friendly English:
1. Detected crop (if identifiable)
2. Possible disease or pest (never state an uncertain diagnosis as confirmed)
3. Visible symptoms in the photo
4. Confidence / uncertainty level
5. Suggested safe next steps for the farmer
6. When to consult an agricultural expert or Krishi Vigyan Kendra (KVK).`;

    try {
      const serverUrl = process.env.EXPO_PUBLIC_VOICE_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(`${serverUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          imageBase64: asset.base64,
          imageMimeType: asset.mimeType || 'image/jpeg',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Analysis failed');

      setDiagnosisResult(data.reply || '');
    } catch (err) {
      setErrorMsg(
        isHi
          ? 'फोटो की जांच अभी नहीं हो सकी। इंटरनेट कनेक्शन जांचें और दोबारा प्रयास करें।'
          : 'Could not analyze the photo right now. Please check your connection and retry.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isHi ? 'फसल की बीमारी पहचानें' : 'Crop Disease Detection'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi ? 'फोटो से शुरुआती जांच व सलाह' : 'Photo-based preliminary crop check'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* MAIN INSTRUCTION CARD */}
        <View style={styles.instructionCard}>
          <MaterialCommunityIcons name="leaf-circle-outline" size={40} color="#1B5E20" />
          <Text style={styles.mainPrompt}>
            अपनी फसल की फोटो खींचें और बीमारी की जानकारी पाएं।
          </Text>
          {!isHi && (
            <Text style={styles.subPrompt}>
              Take or upload a clear photo of the affected leaf or crop to check possible symptoms.
            </Text>
          )}
        </View>

        {/* TWO LARGE TOUCH-FRIENDLY BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => pickImage('camera')}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="camera" size={32} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {isHi ? 'फोटो खींचें\n(Take Photo)' : 'Take Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => pickImage('gallery')}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="image-multiple" size={32} color="#1B5E20" />
            <Text style={styles.secondaryBtnText}>
              {isHi ? 'फोटो अपलोड करें\n(Upload Photo)' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SELECTED PHOTO PREVIEW */}
        {selectedImage && (
          <View style={styles.previewCard}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="cover" />
          </View>
        )}

        {/* LOADING */}
        {analyzing && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>
              {isHi
                ? 'फोटो की जांच की जा रही है... कृपया थोड़ा इंतजार करें।'
                : 'Checking crop photo... Please wait.'}
            </Text>
          </View>
        )}

        {/* ERROR + RETRY */}
        {!!errorMsg && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            {selectedImage && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => analyzeCropImage(selectedImage)}
              >
                <Text style={styles.retryBtnText}>{isHi ? 'दोबारा प्रयास करें' : 'Retry'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* RESULT CARD */}
        {diagnosisResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color="#1B5E20" style={{ marginRight: 8 }} />
              <Text style={styles.resultTitle}>
                {isHi ? 'प्रारंभिक जांच रिपोर्ट' : 'Preliminary Crop Assessment'}
              </Text>
            </View>
            <Text style={styles.resultBody}>{diagnosisResult}</Text>

            <View style={styles.disclaimerBox}>
              <MaterialCommunityIcons name="alert-outline" size={18} color="#92400E" style={{ marginRight: 6 }} />
              <Text style={styles.disclaimerText}>
                {isHi
                  ? 'चेतावनी: यह केवल फोटो आधारित प्रारंभिक जानकारी है। किसी भी दवा या कीटनाशक के छिड़काव से पहले नजदीकी कृषि विशेषज्ञ या KVK से सलाह जरूर लें।'
                  : 'Advisory: AI photo checks are preliminary and may be uncertain. Always confirm with a local agricultural officer or KVK before spraying pesticides.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D1E7D1',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1B5E20',
  },
  headerSub: {
    fontSize: 12.5,
    color: '#4B5563',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  instructionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: 16,
  },
  mainPrompt: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B5E20',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  subPrompt: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  secondaryBtnText: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1E7D1',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1E7D1',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginTop: 10,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
  },
  resultBody: {
    fontSize: 14.5,
    color: '#1F2937',
    lineHeight: 22,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '600',
  },
});
