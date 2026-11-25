// screens/SchemesScreen.js
// KisanSAATHI - Government Agricultural Schemes in Simple Farmer-Friendly Language

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { getPreferredLanguage } from '../services/weatherStorage';

const SCHEMES_DATA = [
  {
    id: 'pmkisan',
    nameHi: 'पीएम-किसान सम्मान निधि (PM-KISAN)',
    nameEn: 'PM-KISAN Samman Nidhi',
    whoCanApplyHi: 'कृषि योग्य भूमि वाले छोटे और सीमांत किसान परिवार',
    whoCanApplyEn: 'Landholding farmer families with cultivable land',
    benefitHi: 'प्रति वर्ष ₹6,000 सीधे बैंक खाते में (₹2,000 की तीन किस्तों में)',
    benefitEn: '₹6,000 per year in 3 equal installments directly to bank account',
    eligibilityHi: 'आधार कार्ड बैंक खाते से जुड़ा होना चाहिए और भू-अभिलेख (खसरा/खतौनी) मान्य होना चाहिए। अंतिम पात्रता सरकारी सत्यापन पर निर्भर करती है।',
    eligibilityEn: 'Valid land records, Aadhaar linked bank account, and completed e-KYC. Final eligibility is subject to government verification.',
    documentsHi: 'आधार कार्ड, बैंक पासबुक, जमीन के कागजात (खतौनी), मोबाइल नंबर',
    documentsEn: 'Aadhaar Card, Bank Passbook, Land Ownership Papers, Mobile Number',
    applyHi: 'नजदीकी CSC केंद्र (जन सेवा केंद्र) या आधिकारिक वेबसाइट पर ऑनलाइन आवेदन करें।',
    applyEn: 'Apply online via the official portal or visit your nearest CSC (Common Service Centre).',
    officialUrl: 'https://pmkisan.gov.in/',
  },
  {
    id: 'pmfby',
    nameHi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    nameEn: 'Pradhan Mantri Fasal Bima Yojana (Crop Insurance)',
    whoCanApplyHi: 'अधिसूचित फसलें उगाने वाले सभी किसान (बटाईदार व किरायेदार किसान सहित)',
    whoCanApplyEn: 'All farmers growing notified crops (including tenant & sharecropper farmers)',
    benefitHi: 'सूखा, बाढ़, ओलावृष्टि या कीट से फसल नुकसान पर बीमा सुरक्षा',
    benefitEn: 'Financial protection against crop loss due to drought, flood, hailstorm, or pests',
    eligibilityHi: 'बुवाई के बाद तय समय सीमा के अंदर प्रीमियम (खरीफ 2%, रबी 1.5%) जमा करना आवश्यक है।',
    eligibilityEn: 'Must enroll within seasonal cut-off dates (farmer premium: 2% Kharif, 1.5% Rabi).',
    documentsHi: 'आधार कार्ड, बैंक खाता, बुवाई प्रमाणपत्र / जमीन का पट्टा या खसरा',
    documentsEn: 'Aadhaar Card, Bank Account, Sowing Certificate / Land or Lease Record',
    applyHi: 'बैंक शाखा, CSC केंद्र, या आधिकारिक बीमा पोर्टल से आवेदन करें।',
    applyEn: 'Enroll through your bank branch, CSC center, or the official PMFBY portal.',
    officialUrl: 'https://pmfby.gov.in/',
  },
  {
    id: 'kcc',
    nameHi: 'किसान क्रेडिट कार्ड (KCC)',
    nameEn: 'Kisan Credit Card (KCC)',
    whoCanApplyHi: 'किसान, पशुपालक और मछली पालन करने वाले व्यक्ति',
    whoCanApplyEn: 'Crop farmers, dairy/livestock farmers, and fisheries workers',
    benefitHi: 'बीज, खाद और खेती के खर्च के लिए कम ब्याज (समय पर भुगतान पर ~4%) पर ऋण',
    benefitEn: 'Low-interest short-term farm credit (~4% effective interest on timely repayment)',
    eligibilityHi: 'बैंक के मानकों के अनुसार केवाईसी और खेती/पशुपालन का प्रमाण होना चाहिए।',
    eligibilityEn: 'Subject to bank KYC norms and proof of agricultural/allied activity.',
    documentsHi: 'आधार कार्ड, पैन कार्ड, जमीन के दस्तावेज, पासपोर्ट फोटो',
    documentsEn: 'Aadhaar Card, PAN Card, Land Documents, Passport Photo',
    applyHi: 'अपने नजदीकी सहकारी, क्षेत्रीय ग्रामीण या राष्ट्रीयकृत बैंक शाखा में फॉर्म जमा करें।',
    applyEn: 'Submit application at your nearest Cooperative, RRB, or Public Sector Bank branch.',
    officialUrl: 'https://www.myscheme.gov.in/schemes/kcc',
  },
  {
    id: 'soilhealth',
    nameHi: 'मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)',
    nameEn: 'Soil Health Card Scheme',
    whoCanApplyHi: 'सभी किसान जो अपनी खेत की मिट्टी की जांच करवाना चाहते हैं',
    whoCanApplyEn: 'All farmers wishing to test their farm soil nutrients',
    benefitHi: 'मिट्टी में पोषक तत्वों की जांच और सही खाद डालने की वैज्ञानिक सलाह',
    benefitEn: 'Soil nutrient report with balanced fertilizer recommendations to reduce excess urea cost',
    eligibilityHi: 'कोई शुल्क नहीं — सभी किसानों के लिए उपलब्ध (राज्य कृषि विभाग के माध्यम से)।',
    eligibilityEn: 'Open to all farmers via State Agriculture Departments and soil testing labs.',
    documentsHi: 'किसान का नाम, मोबाइल नंबर और खेत का विवरण (खसरा संख्या)',
    documentsEn: 'Farmer name, mobile number, and farm survey/khasra details',
    applyHi: 'नजदीकी कृषि विज्ञान केंद्र (KVK) या ब्लॉक कृषि कार्यालय में मिट्टी का नमूना दें।',
    applyEn: 'Submit a soil sample at your nearest Krishi Vigyan Kendra (KVK) or Block Agriculture Office.',
    officialUrl: 'https://soilhealth.dac.gov.in/',
  },
  {
    id: 'enam',
    nameHi: 'ई-नाम राष्ट्रीय कृषि बाजार (e-NAM)',
    nameEn: 'e-NAM (National Agriculture Market)',
    whoCanApplyHi: 'अपनी उपज ऑनलाइन मंडी में पारदर्शी बोली से बेचने वाले किसान',
    whoCanApplyEn: 'Farmers selling produce in APMC mandis connected to e-NAM',
    benefitHi: 'देश की कई मंडियों के खरीदारों से ऑनलाइन पारदर्शी बोली और सीधा बैंक भुगतान',
    benefitEn: 'Transparent online auction across buyers with direct bank settlement',
    eligibilityHi: 'आधार और बैंक खाता सत्यापन के साथ e-NAM पंजीकरण।',
    eligibilityEn: 'Free registration on e-NAM with Aadhaar and bank account verification.',
    documentsHi: 'आधार कार्ड, बैंक खाता विवरण, मोबाइल नंबर',
    documentsEn: 'Aadhaar Card, Bank Account Details, Mobile Number',
    applyHi: 'e-NAM पोर्टल या अपनी नजदीकी e-NAM मंडी के हेल्प डेस्क पर पंजीकरण करें।',
    applyEn: 'Register on the official e-NAM portal or at your local APMC e-NAM help desk.',
    officialUrl: 'https://www.enam.gov.in/',
  },
];

export default function SchemesScreen({ navigation }) {
  const { user } = useAuth();
  const [lang, setLang] = useState(user?.preferredLanguage || 'hi');

  useEffect(() => {
    getPreferredLanguage().then((saved) => {
      if (saved) setLang(saved);
    });
  }, []);

  const isHi = lang === 'hi';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
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
            {isHi ? 'सरकारी योजनाएँ' : 'Government Schemes'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi
              ? 'किसानों के लिए प्रमुख सरकारी योजनाओं की सरल जानकारी'
              : 'Simple guide to agricultural schemes & official portals'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#1B5E20" style={{ marginRight: 8 }} />
          <Text style={styles.infoBannerText}>
            {isHi
              ? 'नोट: किसी भी योजना का लाभ लेने के लिए केवल आधिकारिक सरकारी वेबसाइट या नजदीकी कृषि केंद्र (CSC/KVK) से ही आवेदन करें।'
              : 'Note: Always verify final eligibility and apply only through official government portals or your nearest CSC/KVK office.'}
          </Text>
        </View>

        {SCHEMES_DATA.map((scheme) => (
          <View key={scheme.id} style={styles.card}>
            <Text style={styles.schemeTitle}>
              {isHi ? scheme.nameHi : scheme.nameEn}
            </Text>

            <View style={styles.rowBlock}>
              <Text style={styles.label}>{isHi ? 'कौन आवेदन कर सकता है:' : 'Who can apply:'}</Text>
              <Text style={styles.value}>{isHi ? scheme.whoCanApplyHi : scheme.whoCanApplyEn}</Text>
            </View>

            <View style={styles.benefitBox}>
              <Text style={styles.benefitLabel}>{isHi ? 'मुख्य लाभ:' : 'Main Benefit:'}</Text>
              <Text style={styles.benefitText}>{isHi ? scheme.benefitHi : scheme.benefitEn}</Text>
            </View>

            <View style={styles.rowBlock}>
              <Text style={styles.label}>{isHi ? 'पात्रता (Eligibility):' : 'Eligibility:'}</Text>
              <Text style={styles.value}>{isHi ? scheme.eligibilityHi : scheme.eligibilityEn}</Text>
            </View>

            <View style={styles.rowBlock}>
              <Text style={styles.label}>{isHi ? 'जरूरी दस्तावेज:' : 'Required Documents:'}</Text>
              <Text style={styles.value}>{isHi ? scheme.documentsHi : scheme.documentsEn}</Text>
            </View>

            <View style={styles.rowBlock}>
              <Text style={styles.label}>{isHi ? 'आवेदन का तरीका:' : 'How to Apply:'}</Text>
              <Text style={styles.value}>{isHi ? scheme.applyHi : scheme.applyEn}</Text>
            </View>

            <TouchableOpacity
              style={styles.officialBtn}
              onPress={() => Linking.openURL(scheme.officialUrl)}
              activeOpacity={0.85}
              accessibilityRole="link"
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.officialBtnText}>
                {isHi ? 'आधिकारिक सरकारी वेबसाइट खोलें' : 'Open Official Govt Portal'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
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
    padding: 14,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#1B5E20',
    lineHeight: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1E7D1',
  },
  schemeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 10,
  },
  rowBlock: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 2,
  },
  value: {
    fontSize: 13.5,
    color: '#374151',
    lineHeight: 19,
  },
  benefitBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  benefitLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1B5E20',
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  officialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  officialBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
