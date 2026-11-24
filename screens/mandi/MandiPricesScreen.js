import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/mandi/MandiPricesScreen.js
// KisanSAATHI - APMC Daily Price Publishing & Management Screen

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';
import { getMandiCommodities, publishMandiPrice } from '../../services/mandiService';

export default function MandiPricesScreen() {
  const { user, roleProfile } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [selectedCommodity, setSelectedCommodity] = useState('Wheat (गेहूं)');
  const [variety, setVariety] = useState('Sharbati / Mill Quality');
  const [minPrice, setMinPrice] = useState('2480');
  const [modalPrice, setModalPrice] = useState('2590');
  const [maxPrice, setMaxPrice] = useState('2710');
  const [dailyArrivalTons, setDailyArrivalTons] = useState('1100');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isApproved = roleProfile?.verificationStatus === 'approved';

  const loadCommodities = async () => {
    setLoading(true);
    try {
      const data = await getMandiCommodities();
      setCommodities(data);
    } catch (e) {
      console.warn('Error loading commodities', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommodities();
  }, []);

  const handlePublishSubmit = async () => {
    if (!minPrice || !modalPrice || !maxPrice || !dailyArrivalTons) {
      Alert.alert('Required', 'Please complete all price fields.');
      return;
    }

    if (Number(minPrice) > Number(modalPrice) || Number(modalPrice) > Number(maxPrice)) {
      Alert.alert('Invalid Price Range', 'Minimum price must be ≤ Modal price ≤ Maximum price.');
      return;
    }

    setSubmitting(true);
    try {
      await publishMandiPrice({
        commodity: selectedCommodity,
        variety,
        minPrice,
        modalPrice,
        maxPrice,
        dailyArrivalTons,
        mandiName: roleProfile?.mandiName || 'APMC Yard',
      });

      setSuccessMessage(
        lang === 'hi'
          ? 'आज के आधिकारिक मंडी भाव सफलतापूर्वक प्रकाशित हो गए!'
          : 'Official APMC rates published successfully!'
      );

      setTimeout(() => {
        setModalVisible(false);
        setSuccessMessage('');
        loadCommodities();
      }, 1500);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>
              {lang === 'hi' ? 'दैनिक मंडी भाव प्रबंधन' : 'APMC Price Publishing'}
            </Text>
            <Text style={styles.screenSub}>
              {roleProfile?.mandiName || 'APMC Market'} • {lang === 'hi' ? 'दैनिक सरकारी दरें' : 'Official Gazette Rates'}
            </Text>
          </View>

          {isApproved && (
            <TouchableOpacity
              style={styles.newRateBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.newRateBtnText}>+ {lang === 'hi' ? 'भाव प्रकाशित करें' : 'Publish Rates'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LOCKED BANNER IF UNVERIFIED */}
        {!isApproved ? (
          <View style={styles.lockedContainer}>
            <MaterialCommunityIcons name="lock-outline" size={44} color="#B45309" style={{ marginBottom: 10 }} />
            <Text style={styles.lockedTitle}>
              {lang === 'hi' ? 'भाव प्रकाशन लॉक है' : 'Price Publishing Locked'}
            </Text>
            <Text style={styles.lockedDesc}>
              {lang === 'hi'
                ? 'यह सुविधा केवल कृषि विपणन बोर्ड द्वारा सत्यापित आधिकारिक मंडी संचालकों के लिए उपलब्ध है। जब तक आपका खाता समीक्षाधीन है, आप आधिकारिक भाव प्रकाशित नहीं कर सकते।'
                : 'Official Price Publishing is locked for unverified accounts. Only verified APMC Mandi Owners can publish official market rates. Use the Admin Toggle on the Overview tab to approve for testing.'}
            </Text>
          </View>
        ) : null}

        {/* COMMODITIES LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>
            {lang === 'hi' ? 'वर्तमान में प्रकाशित फसल दरें' : 'Currently Published Commodities'} ({commodities.length})
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E65100" style={{ marginVertical: 30 }} />
        ) : (
          commodities.map((item) => (
            <View key={item.id} style={styles.priceCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardCommodity}>{item.commodity}</Text>
                  <Text style={styles.cardVariety}>{item.variety}</Text>
                </View>
                <View style={[styles.verifiedTag, { flexDirection: 'row', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="check-decagram" size={12} color="#15803D" style={{ marginRight: 3 }} />
                  <Text style={styles.verifiedTagText}>OFFICIAL</Text>
                </View>
              </View>

              <View style={styles.pricesTable}>
                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>{lang === 'hi' ? 'न्यूनतम (Min)' : 'Minimum'}</Text>
                  <Text style={styles.priceNumber}>₹{item.minPrice}</Text>
                </View>

                <View style={[styles.priceCol, styles.modalColHighlight]}>
                  <Text style={[styles.priceLabel, { color: '#BF360C', fontWeight: 'bold' }]}>
                    {lang === 'hi' ? 'मॉडल (Modal)' : 'Modal Price'}
                  </Text>
                  <Text style={[styles.priceNumber, { color: '#BF360C', fontSize: 18 }]}>
                    ₹{item.modalPrice}
                  </Text>
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>{lang === 'hi' ? 'अधिकतम (Max)' : 'Maximum'}</Text>
                  <Text style={styles.priceNumber}>₹{item.maxPrice}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="truck-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.arrivalText}>
                    {lang === 'hi' ? 'दैनिक आवक: ' : 'Daily Arrival: '}
                    <Text style={{ fontWeight: 'bold' }}>{item.dailyArrivalTons} Tons</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="calendar-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.dateText}>{item.lastUpdated}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* PUBLISH PRICE MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {lang === 'hi' ? 'दैनिक मंडी भाव दर्ज करें' : 'Publish APMC Market Rates'}
                </Text>
                <Text style={styles.modalSub}>
                  {roleProfile?.mandiName} • Official Gazette
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {successMessage ? (
              <View style={[styles.successBanner, { flexDirection: 'row', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color="#15803D" style={{ marginRight: 4 }} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <ScrollView style={{ marginTop: 10 }}>
              <Text style={styles.inputLabel}>{lang === 'hi' ? 'फसल चुनें *' : 'Commodity *'}</Text>
              <View style={styles.cropChipsRow}>
                {['Wheat (गेहूं)', 'Basmati Paddy (धान)', 'Mustard (सरसों)', 'Gram / Chana (चना)', 'Soybean (सोयाबीन)'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cropChip, selectedCommodity === c && styles.cropChipActive]}
                    onPress={() => setSelectedCommodity(c)}
                  >
                    <Text style={[styles.cropChipText, selectedCommodity === c && styles.cropChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{lang === 'hi' ? 'किस्म / ग्रेड *' : 'Variety / Grade *'}</Text>
              <TextInput
                style={styles.modalInput}
                value={variety}
                onChangeText={setVariety}
                placeholder="e.g. Sharbati / Export Grade"
              />

              <View style={styles.threeColRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? 'न्यूनतम (₹) *' : 'Min (₹) *'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: 3 }}>
                  <Text style={[styles.inputLabel, { color: '#E65100' }]}>{lang === 'hi' ? 'मॉडल (₹) *' : 'Modal (₹) *'}</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: '#FFB74D', backgroundColor: '#FFF8E1' }]}
                    keyboardType="numeric"
                    value={modalPrice}
                    onChangeText={setModalPrice}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? 'अधिकतम (₹) *' : 'Max (₹) *'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>{lang === 'hi' ? 'आज की कुल आवक (टन) *' : 'Daily Arrival (Tons) *'}</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={dailyArrivalTons}
                onChangeText={setDailyArrivalTons}
                placeholder="e.g. 1200"
              />

              <TouchableOpacity
                style={styles.publishSubmitBtn}
                onPress={handlePublishSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.publishSubmitBtnText}>
                    {lang === 'hi' ? 'आधिकारिक भाव प्रकाशित करें' : 'Publish Official Price Bulletin'}
                  </Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: '#FAF7F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  screenSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  newRateBtn: {
    backgroundColor: '#E65100',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newRateBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  lockedContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: '#FFE082',
  },
  lockedTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#E65100',
  },
  lockedDesc: {
    fontSize: 12,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardCommodity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  cardVariety: {
    fontSize: 12,
    color: '#757575',
    marginTop: 1,
  },
  verifiedTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  pricesTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalColHighlight: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 10,
    color: '#757575',
  },
  priceNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  arrivalText: {
    fontSize: 11,
    color: '#424242',
  },
  dateText: {
    fontSize: 11,
    color: '#757575',
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
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#E65100',
  },
  modalSub: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#757575',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 10,
    marginBottom: 4,
  },
  cropChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cropChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cropChipActive: {
    backgroundColor: '#E65100',
    borderColor: '#E65100',
  },
  cropChipText: {
    fontSize: 11,
    color: '#616161',
    fontWeight: '500',
  },
  cropChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#212121',
  },
  threeColRow: {
    flexDirection: 'row',
  },
  publishSubmitBtn: {
    backgroundColor: '#E65100',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  publishSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
