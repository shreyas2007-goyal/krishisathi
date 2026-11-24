import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/customer/CustomerBrowseScreen.js
// KisanSAATHI - Agricultural Produce Marketplace for Buyers

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
import { getProduceListings, submitPurchaseOffer } from '../../services/customerService';
import { INDIAN_STATES } from '../../services/marketService';

export default function CustomerBrowseScreen({ navigation }) {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCropCategory, setSelectedCropCategory] = useState('All');

  // Offer Modal State
  const [activeLotForOffer, setActiveLotForOffer] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Direct Bank Transfer within 24 hours of weighment');
  const [deliveryTerms, setDeliveryTerms] = useState('Mill Gate / Collection Center Delivery');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offerSuccessMsg, setOfferSuccessMsg] = useState('');

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await getProduceListings({
        crop: selectedCropCategory === 'All' ? '' : selectedCropCategory,
        state: selectedState,
      });
      setListings(data);
    } catch (e) {
      console.warn('Error loading browse listings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [selectedState, selectedCropCategory]);

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.crop.toLowerCase().includes(q) ||
      item.variety.toLowerCase().includes(q) ||
      item.farmerName.toLowerCase().includes(q) ||
      item.district.toLowerCase().includes(q) ||
      item.state.toLowerCase().includes(q)
    );
  });

  const handleOpenOfferModal = (lot) => {
    setActiveLotForOffer(lot);
    setOfferPrice(String(lot.expectedPricePerQuintal));
    setOfferQuantity(String(Math.min(50, lot.quantityQuintals)));
    setOfferSuccessMsg('');
  };

  const handleSubmitOffer = async () => {
    if (!offerPrice || !offerQuantity || Number(offerPrice) <= 0 || Number(offerQuantity) <= 0) {
      Alert.alert('Required', 'Please enter valid offered price and quantity.');
      return;
    }

    setSubmittingOffer(true);
    try {
      await submitPurchaseOffer({
        buyerId: user?.uid || 'buyer_user',
        buyerName: user?.fullName || 'Registered Buyer',
        produceId: activeLotForOffer.id,
        crop: activeLotForOffer.crop,
        variety: activeLotForOffer.variety,
        farmerName: activeLotForOffer.farmerName,
        farmerPhone: activeLotForOffer.farmerPhone,
        location: `${activeLotForOffer.district}, ${activeLotForOffer.state}`,
        offeredPricePerQuintal: offerPrice,
        quantityQuintals: offerQuantity,
        paymentTerms,
        deliveryTerms,
      });

      setOfferSuccessMsg(
        lang === 'hi'
          ? 'आपका खरीद प्रस्ताव किसान को सफलतापूर्वक भेज दिया गया है!'
          : 'Purchase offer dispatched to farmer successfully!'
      );

      setTimeout(() => {
        setActiveLotForOffer(null);
        setOfferSuccessMsg('');
      }, 2000);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const calculatedTotal =
    Number(offerPrice || 0) * Number(offerQuantity || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TOP TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>
            {lang === 'hi' ? 'कृषि उपज बाज़ार' : 'Browse Farmer Produce'}
          </Text>
          <Text style={styles.screenSub}>
            {lang === 'hi'
              ? 'सत्यापित किसानों से सीधे उपलब्ध लॉट खोजें और उचित भाव पर खरीदें'
              : 'Direct verified farm listings available for immediate trade'}
          </Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              lang === 'hi'
                ? 'फसल, किस्म या किसान का नाम खोजें...'
                : 'Search crop, variety, or farmer...'
            }
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close" size={18} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* CROP CATEGORY CHIPS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {['All', 'Wheat', 'Paddy', 'Mustard', 'Soybean', 'Onion', 'Chana'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, selectedCropCategory === c && styles.catChipActive]}
              onPress={() => setSelectedCropCategory(c)}
            >
              <Text style={[styles.catChipText, selectedCropCategory === c && styles.catChipTextActive]}>
                {c === 'All' ? (lang === 'hi' ? 'सभी फसलें' : 'All Crops') : c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STATE FILTER */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['All States', 'Punjab', 'Haryana', 'Madhya Pradesh', 'Rajasthan', 'Maharashtra'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.stateChip, selectedState === st && styles.stateChipActive]}
              onPress={() => setSelectedState(st)}
            >
              <Text style={[styles.stateChipText, selectedState === st && styles.stateChipTextActive]}>
                {st === 'All States' ? (lang === 'hi' ? 'सभी राज्य' : 'All States') : st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LISTINGS RESULTS */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredListings.length} {lang === 'hi' ? 'उपलब्ध लॉट' : 'Farmer Lots Available'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1565C0" style={{ marginVertical: 40 }} />
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="sprout-outline" size={40} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>
              {lang === 'hi' ? 'कोई लॉट नहीं मिला' : 'No Produce Found'}
            </Text>
            <Text style={styles.emptySub}>
              {lang === 'hi' ? 'कृपया अपनी खोज या राज्य फिल्टर बदलें' : 'Try clearing filters or search query'}
            </Text>
          </View>
        ) : (
          filteredListings.map((lot) => (
            <View key={lot.id} style={styles.lotCard}>
              <View style={styles.lotHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lotCrop}>{lot.crop}</Text>
                  <Text style={styles.lotVariety}>{lot.variety}</Text>
                </View>
                <View style={styles.lotPriceBox}>
                  <Text style={styles.lotExpectedLabel}>
                    {lang === 'hi' ? 'अपेक्षित भाव' : 'Expected'}
                  </Text>
                  <Text style={styles.lotPrice}>₹{lot.expectedPricePerQuintal}</Text>
                  <Text style={styles.lotUnit}>/ क्विंटल</Text>
                </View>
              </View>

              <View style={styles.lotSpecsRow}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'hi' ? 'मात्रा' : 'Available'}:</Text>
                  <Text style={styles.specValue}>{lot.quantityQuintals} Quintals</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'hi' ? 'स्थान' : 'Location'}:</Text>
                  <Text style={styles.specValue}>{lot.district}, {lot.state}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>{lang === 'hi' ? 'गुणवत्ता' : 'Quality'}:</Text>
                  <Text style={[styles.specValue, { color: '#16A34A' }]}>{lot.qualityGrade}</Text>
                </View>
              </View>

              <Text style={styles.lotDesc}>{lot.description}</Text>

              <View style={styles.lotFooter}>
                <View style={styles.farmerInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="account" size={14} color="#2E7D32" style={{ marginRight: 4 }} />
                    <Text style={styles.farmerNameText}>{lot.farmerName}</Text>
                  </View>
                  <Text style={styles.farmerLocText}>{lot.village}, {lot.district}</Text>
                </View>

                <TouchableOpacity
                  style={styles.makeOfferBtn}
                  onPress={() => handleOpenOfferModal(lot)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.makeOfferBtnText}>
                    {lang === 'hi' ? 'खरीद प्रस्ताव दें' : 'Make Offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* SUBMIT PURCHASE OFFER MODAL */}
      {activeLotForOffer && (
        <Modal visible={Boolean(activeLotForOffer)} transparent animationType="slide">
          <SafeAreaView style={styles.modalBackdrop}>
            <View style={styles.offerModalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderTitle}>
                    {lang === 'hi' ? 'खरीद प्रस्ताव (Purchase Offer)' : 'Submit Purchase Offer'}
                  </Text>
                  <Text style={styles.modalHeaderSub}>
                    {activeLotForOffer.crop} • {activeLotForOffer.variety}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveLotForOffer(null)} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={20} color="#555" />
                </TouchableOpacity>
              </View>

              {offerSuccessMsg ? (
                <View style={styles.successBanner}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                  <Text style={styles.successText}>{offerSuccessMsg}</Text>
                </View>
              ) : null}

              <ScrollView style={{ marginTop: 10 }}>
                {/* Farmer & Lot Info */}
                <View style={styles.offerSummaryCard}>
                  <Text style={styles.summaryFarmer}>
                    {activeLotForOffer.farmerName} • {activeLotForOffer.district}, {activeLotForOffer.state}
                  </Text>
                  <Text style={styles.summaryPrice}>
                    {lang === 'hi' ? 'किसान की अपेक्षित दर: ' : "Farmer's Expected: "}
                    <Text style={{ fontWeight: 'bold', color: '#16A34A' }}>
                      ₹{activeLotForOffer.expectedPricePerQuintal} / क्विंटल
                    </Text>
                  </Text>
                </View>

                {/* Offer Input Fields */}
                <View style={styles.twoColInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>
                      {lang === 'hi' ? 'प्रस्तावित भाव (₹/क्विंटल) *' : 'Offer Rate (₹/Q) *'}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={offerPrice}
                      onChangeText={setOfferPrice}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>
                      {lang === 'hi' ? 'मात्रा (क्विंटल) *' : 'Quantity (Q) *'}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      value={offerQuantity}
                      onChangeText={setOfferQuantity}
                    />
                  </View>
                </View>

                {/* Total Payout Calculation */}
                <View style={styles.totalCalculationBox}>
                  <Text style={styles.totalLabel}>
                    {lang === 'hi' ? 'कुल अनुबंध राशि (Total Contract Value):' : 'Total Contract Payout:'}
                  </Text>
                  <Text style={styles.totalAmount}>
                    ₹{calculatedTotal.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.totalSub}>
                    ({offerQuantity} Quintals @ ₹{offerPrice}/Quintal)
                  </Text>
                </View>

                {/* Terms */}
                <Text style={styles.inputLabel}>
                  {lang === 'hi' ? 'भुगतान शर्तें (Payment Terms)' : 'Payment Terms'}
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={paymentTerms}
                  onChangeText={setPaymentTerms}
                />

                <Text style={styles.inputLabel}>
                  {lang === 'hi' ? 'डिलिवरी व लोडिंग शर्तें (Delivery Terms)' : 'Delivery Terms'}
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryTerms}
                  onChangeText={setDeliveryTerms}
                />

                <TouchableOpacity
                  style={styles.submitOfferBtn}
                  onPress={handleSubmitOffer}
                  disabled={submittingOffer}
                  activeOpacity={0.85}
                >
                  {submittingOffer ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitOfferBtnText}>
                      {lang === 'hi' ? 'किसान को प्रस्ताव भेजें' : 'Dispatch Offer to Farmer'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
    paddingBottom: 40,
  },
  titleSection: {
    marginTop: 14,
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  screenSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  catChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  catChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  stateChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stateChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  stateChipText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
  },
  stateChipTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 'bold',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lotCrop: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  lotVariety: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  lotPriceBox: {
    alignItems: 'flex-end',
  },
  lotExpectedLabel: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  lotPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  lotUnit: {
    fontSize: 10,
    color: '#64748B',
  },
  lotSpecsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginVertical: 10,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  specValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 1,
  },
  lotDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  lotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  farmerInfo: {
    flex: 1,
  },
  farmerNameText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  farmerLocText: {
    fontSize: 10,
    color: '#64748B',
  },
  makeOfferBtn: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  makeOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  offerModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  offerSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryFarmer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  summaryPrice: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  twoColInputs: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  totalCalculationBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalLabel: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginVertical: 2,
  },
  totalSub: {
    fontSize: 11,
    color: '#3B82F6',
  },
  submitOfferBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  submitOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
