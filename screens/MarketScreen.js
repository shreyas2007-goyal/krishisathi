// screens/MarketScreen.js
// KisanSAATHI - Market Intelligence & Better Deals Module

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  CROP_CATEGORIES,
  INITIAL_CROPS_CATALOGUE,
  INDIAN_STATES,
  fetchLiveMandiPrices,
} from '../services/marketService';
import { computeBetterDeals } from '../services/dealsEngine';
import { registerBuyerOffer } from '../services/buyerService';
import { getSavedLocation, getPreferredLanguage } from '../services/weatherStorage';
import { getTranslation } from '../services/translations';

const { width: windowWidth } = Dimensions.get('window');

export default function MarketScreen({ navigation }) {
  // Multilingual state
  const [lang, setLang] = useState('hi');
  const t = getTranslation(lang);

  // Active top tab: 'mandi' (Live Mandi Prices) or 'deals' (Better Deals)
  const [activeTab, setActiveTab] = useState('mandi');

  // Location state
  const [farmerLocation, setFarmerLocation] = useState(null);

  // Crop & Filter state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cropSearchQuery, setCropSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(INITIAL_CROPS_CATALOGUE[0]); // Wheat
  const [selectedState, setSelectedState] = useState('All States');
  const [sortBy, setSortBy] = useState('best_price'); // 'best_price', 'highest_price', 'lowest_price', 'nearest', 'latest'
  const [stateDropdownVisible, setStateDropdownVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  // Live Mandi Prices state
  const [mandiPrices, setMandiPrices] = useState([]);
  const [mandiLoading, setMandiLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Better Deals state
  const [dealsData, setDealsData] = useState(null);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [quantityQuintals, setQuantityQuintals] = useState('50');
  const [selectedVariety, setSelectedVariety] = useState('FAQ / Sharbati');
  const [maxDistanceKm, setMaxDistanceKm] = useState(150);

  // Modals state
  const [selectedDealModal, setSelectedDealModal] = useState(null);
  const [buyerModalVisible, setBuyerModalVisible] = useState(false);
  const [buyerFormData, setBuyerFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    commodity: 'Wheat',
    variety: 'Sharbati / Grade-A',
    offeredPrice: '',
    quantityRequiredQuintals: '100',
    state: 'Haryana',
    district: 'Karnal',
    paymentTerms: 'Instant Bank Transfer within 24 hours of weighment',
    deliveryTerms: 'Delivery at Mill Gate / Warehouse',
    transportSubsidy: '500',
  });
  const [buyerSubmitting, setBuyerSubmitting] = useState(false);
  const [buyerSuccessMsg, setBuyerSuccessMsg] = useState('');

  /**
   * Load saved location from storage
   */
  const loadSavedFarmerLocation = useCallback(async () => {
    try {
      const loc = await getSavedLocation();
      if (loc) {
        setFarmerLocation(loc);
        if (loc.state && INDIAN_STATES.includes(loc.state)) {
          setSelectedState(loc.state);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved location in MarketScreen', e);
    }
  }, []);

  /**
   * Load Live Mandi Prices for currently selected crop & filters
   */
  const loadMandiPrices = useCallback(
    async (isPull = false) => {
      try {
        if (!isPull) setMandiLoading(true);
        const prices = await fetchLiveMandiPrices({
          commodity: selectedCrop.name,
          state: selectedState,
          farmerLat: farmerLocation?.latitude,
          farmerLon: farmerLocation?.longitude,
        });

        // Apply sorting
        const sorted = [...prices].sort((a, b) => {
          if (sortBy === 'best_price') {
            // Best Price: sorts by highest modal price, then highest max price
            const priceA = a.modalPrice || a.maxPrice || 0;
            const priceB = b.modalPrice || b.maxPrice || 0;
            return priceB - priceA;
          }
          if (sortBy === 'highest_price') {
            const maxA = a.maxPrice || a.modalPrice || 0;
            const maxB = b.maxPrice || b.modalPrice || 0;
            return maxB - maxA;
          }
          if (sortBy === 'lowest_price') {
            const minA = a.modalPrice || a.minPrice || 0;
            const minB = b.modalPrice || b.minPrice || 0;
            return minA - minB;
          }
          if (sortBy === 'nearest') {
            const distA = a.distanceKm !== null ? a.distanceKm : 9999;
            const distB = b.distanceKm !== null ? b.distanceKm : 9999;
            return distA - distB;
          }
          if (sortBy === 'latest') return new Date(b.reportingDate) - new Date(a.reportingDate);
          return 0;
        });

        setMandiPrices(sorted);
      } catch (err) {
        console.warn('Error loading mandi prices:', err);
      } finally {
        setMandiLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCrop, selectedState, sortBy, farmerLocation]
  );

  /**
   * Compute Better Deals for farmer's produce
   */
  const evaluateBetterDeals = useCallback(async () => {
    try {
      setDealsLoading(true);
      const res = await computeBetterDeals({
        commodity: selectedCrop.name,
        variety: selectedVariety,
        quantity: Number(quantityQuintals) || 50,
        farmerLat: farmerLocation?.latitude,
        farmerLon: farmerLocation?.longitude,
        farmerState: selectedState !== 'All States' ? selectedState : farmerLocation?.state || '',
        farmerDistrict: farmerLocation?.district || '',
        maxDistanceKm,
      });
      setDealsData(res);
    } catch (err) {
      console.warn('Error computing better deals:', err);
    } finally {
      setDealsLoading(false);
    }
  }, [selectedCrop, selectedVariety, quantityQuintals, farmerLocation, selectedState, maxDistanceKm]);

  /**
   * Lifecycle setup: Focus listener for language updates and initial data
   */
  useEffect(() => {
    let isMounted = true;
    async function init() {
      const savedLang = await getPreferredLanguage();
      if (savedLang && isMounted) setLang(savedLang);
      await loadSavedFarmerLocation();
    }
    init();

    const unsubscribe = navigation.addListener('focus', async () => {
      const savedLang = await getPreferredLanguage();
      if (savedLang && isMounted) setLang(savedLang);
      await loadSavedFarmerLocation();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation, loadSavedFarmerLocation]);

  /**
   * Reload mandi prices whenever crop, state filter, or sort changes
   */
  useEffect(() => {
    loadMandiPrices();
    if (activeTab === 'deals') {
      evaluateBetterDeals();
    }
  }, [selectedCrop, selectedState, sortBy, activeTab, loadMandiPrices, evaluateBetterDeals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMandiPrices(true);
    if (activeTab === 'deals') {
      evaluateBetterDeals();
    }
  }, [loadMandiPrices, evaluateBetterDeals, activeTab]);

  /**
   * Filtered crop catalogue based on category & search text
   */
  const filteredCrops = INITIAL_CROPS_CATALOGUE.filter((crop) => {
    const matchesCategory =
      selectedCategory === 'all' || crop.category === selectedCategory;
    const q = cropSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      crop.name.toLowerCase().includes(q) ||
      (crop.nameHi && crop.nameHi.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  /**
   * Handle buyer offer submission
   */
  const handleBuyerSubmit = async () => {
    if (!buyerFormData.businessName || !buyerFormData.offeredPrice) {
      alert(lang === 'hi' ? 'कृपया प्रतिष्ठान का नाम और भाव दर्ज करें।' : 'Please enter business name and offered price.');
      return;
    }
    setBuyerSubmitting(true);
    try {
      await registerBuyerOffer(buyerFormData);
      setBuyerSuccessMsg(
        lang === 'hi'
          ? 'आपका खरीद प्रस्ताव सफलतापूर्वक दर्ज हो गया है!'
          : 'Your purchase requirement has been posted successfully!'
      );
      setTimeout(() => {
        setBuyerModalVisible(false);
        setBuyerSuccessMsg('');
        evaluateBetterDeals();
      }, 1500);
    } catch (e) {
      alert('Error registering offer: ' + e.message);
    } finally {
      setBuyerSubmitting(false);
    }
  };

  // Filtered states for state selection dropdown
  const filteredStates = INDIAN_STATES.filter((st) => {
    if (!stateSearchQuery.trim()) return true;
    return st.toLowerCase().includes(stateSearchQuery.toLowerCase().trim());
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <Image
          source={require('../assets/kisansaathi_logo.png')}
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#C8E6C9' }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t.marketTitle}</Text>
          <Text style={styles.headerSubtitle}>{t.marketSubtitle}</Text>
        </View>

        {/* Post Buyer Offer Button */}
        <TouchableOpacity
          style={styles.postBuyerBtn}
          onPress={() => setBuyerModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.postBuyerBtnText}>+ {lang === 'hi' ? 'खरीदार मांग' : 'Post Buy'}</Text>
        </TouchableOpacity>
      </View>

      {/* TWO PRIMARY TABS SWITCHER */}
      <View style={styles.tabSwitcherRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mandi' && styles.tabButtonActive]}
          onPress={() => setActiveTab('mandi')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabButtonText, activeTab === 'mandi' && styles.tabButtonTextActive]}>
            {t.tabLiveMandi}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'deals' && styles.tabButtonActive]}
          onPress={() => setActiveTab('deals')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabButtonText, activeTab === 'deals' && styles.tabButtonTextActive]}>
            {t.tabBetterDeals}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
      >
        {/* ============================================================== */}
        {/* TAB 1: LIVE MANDI PRICES                                       */}
        {/* ============================================================== */}
        {activeTab === 'mandi' && (
          <View>
            {/* B2C DIRECT FARMER-TO-CONSUMER PROMO BANNER */}
            <TouchableOpacity
              style={styles.b2cPromoBanner}
              onPress={() => navigation.navigate('B2CMarketplace')}
              activeOpacity={0.88}
            >
              <View style={styles.b2cPromoLeft}>
                <View style={styles.b2cPromoTagRow}>
                  <Text style={styles.b2cPromoTag}>नया B2C प्लेटफार्म • Kisan Direct</Text>
                  <View style={styles.b2cPromoPill}>
                    <Text style={styles.b2cPromoPillText}>50kg / 100kg</Text>
                  </View>
                </View>
                <Text style={styles.b2cPromoTitle}>
                  {lang === 'hi'
                    ? 'सीधे ग्राहकों को बेचें — 25-40% अधिक मुनाफा'
                    : 'Sell in 50kg & 100kg Lots directly to Retail Buyers'}
                </Text>
                <Text style={styles.b2cPromoDesc}>
                  {lang === 'hi'
                    ? 'मंडी कटौती से बचें। 50kg, 1 क्विंटल की बोरियां सीधे परिवारों को बेचें और सीधी चैट करें।'
                    : 'List your produce in retail lots and chat directly with household buyers.'}
                </Text>
              </View>
              <View style={styles.b2cPromoRight}>
                <MaterialCommunityIcons name="arrow-right-circle" size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* CROP SELECTION SECTION */}
            <View style={styles.cardContainer}>
              <Text style={styles.cardHeaderTitle}>{t.whatCropToSell}</Text>

              {/* Crop Search Bar */}
              <View style={styles.searchBarRow}>
                <MaterialCommunityIcons name="magnify" size={20} color="#666" style={{ marginHorizontal: 4 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t.searchCrops}
                  placeholderTextColor="#888"
                  value={cropSearchQuery}
                  onChangeText={setCropSearchQuery}
                />
                {cropSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setCropSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {CROP_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.catChipText, selectedCategory === cat.id && styles.catChipTextActive]}>
                      {lang === 'hi' ? cat.labelHi : cat.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Crop Grid Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropsHorizontalScroll}>
                {filteredCrops.map((crop) => {
                  const isSelected = selectedCrop.id === crop.id;
                  return (
                    <TouchableOpacity
                      key={crop.id}
                      style={[styles.cropCard, isSelected && styles.cropCardSelected]}
                      onPress={() => setSelectedCrop(crop)}
                      activeOpacity={0.7}
                    >
                      <View style={{ marginBottom: 4, alignItems: 'center' }}>
                        <MaterialCommunityIcons
                          name={crop.icon || 'sprout'}
                          size={24}
                          color={isSelected ? '#2E7D32' : '#555'}
                        />
                      </View>
                      <Text style={[styles.cropCardName, isSelected && styles.cropCardNameSelected]}>
                        {lang === 'hi' ? crop.nameHi : crop.name}
                      </Text>
                      <Text style={styles.cropCardPrice}>
                        ₹{crop.defaultPrice}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* LOCATION & STATE FILTER BAR (WITH STATE DROPDOWN) */}
            <View style={styles.filterBarContainer}>
              <View style={styles.filterTitleRow}>
                <Text style={styles.filterBarLabel}>{lang === 'hi' ? 'राज्य व मंडी फिल्टर' : 'State & Mandi Filter'}:</Text>
                {farmerLocation && (
                  <Text style={styles.currentLocPill}>
                    {farmerLocation.primaryName || farmerLocation.district}
                  </Text>
                )}
              </View>

              {/* State Dropdown Selector */}
              <TouchableOpacity
                style={styles.stateDropdownBtn}
                onPress={() => setStateDropdownVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.stateDropdownLeft}>
                  <View style={styles.stateIconCircle}>
                    <MaterialCommunityIcons name="bank-outline" size={16} color="#2E7D32" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.stateDropdownHint}>
                      {lang === 'hi' ? 'राज्य चुनें (मंडी भाव फ़िल्टर)' : 'Select State (Mandi Prices Filter)'}
                    </Text>
                    <Text style={styles.stateDropdownSelectedText}>
                      {selectedState === 'All States'
                        ? (lang === 'hi' ? 'सभी राज्य (पूरा भारत)' : 'All States (Pan India)')
                        : `${selectedState}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.stateDropdownRight}>
                  {selectedState !== 'All States' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedState('All States');
                      }}
                      style={styles.clearStateBadge}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearStateText}>{lang === 'hi' ? 'हटाएं' : 'Clear'}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.stateChevronCircle}>
                    <Text style={styles.stateDropdownCaret}>▼</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Quick State Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {['All States', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Maharashtra'].map((st) => (
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

              {/* Sorting Bar with Best Price First */}
              <View style={styles.sortingContainer}>
                <View style={styles.sortHeaderRow}>
                  <Text style={styles.sortLabel}>{t.sortBy}:</Text>
                  <Text style={styles.sortCurrentSubtitle}>
                    {sortBy === 'best_price'
                      ? (lang === 'hi' ? 'सर्वोत्तम भाव (Best Rate)' : 'Best Return')
                      : sortBy === 'highest_price'
                      ? (lang === 'hi' ? 'उच्चतम भाव' : 'Highest Price')
                      : sortBy === 'lowest_price'
                      ? (lang === 'hi' ? 'न्यूनतम भाव' : 'Lowest Price')
                      : (lang === 'hi' ? 'निकटतम' : 'Nearest')}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {/* 1. Best Price */}
                  <TouchableOpacity
                    style={[styles.sortBtn, sortBy === 'best_price' && styles.sortBtnActive]}
                    onPress={() => setSortBy('best_price')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortBtnText, sortBy === 'best_price' && styles.sortBtnTextActive]}>
                      {t.sortBestPrice || (lang === 'hi' ? 'सर्वोत्तम भाव' : 'Best Price')}
                    </Text>
                  </TouchableOpacity>

                  {/* 2. Highest Price */}
                  <TouchableOpacity
                    style={[styles.sortBtn, sortBy === 'highest_price' && styles.sortBtnActive]}
                    onPress={() => setSortBy('highest_price')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortBtnText, sortBy === 'highest_price' && styles.sortBtnTextActive]}>
                      {t.sortHighestModal || (lang === 'hi' ? 'उच्चतम भाव' : 'Highest Price')}
                    </Text>
                  </TouchableOpacity>

                  {/* 3. Lowest Price */}
                  <TouchableOpacity
                    style={[styles.sortBtn, sortBy === 'lowest_price' && styles.sortBtnActive]}
                    onPress={() => setSortBy('lowest_price')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortBtnText, sortBy === 'lowest_price' && styles.sortBtnTextActive]}>
                      {t.sortLowestModal || (lang === 'hi' ? 'न्यूनतम भाव' : 'Lowest Price')}
                    </Text>
                  </TouchableOpacity>

                  {/* 4. Nearest Mandi */}
                  <TouchableOpacity
                    style={[styles.sortBtn, sortBy === 'nearest' && styles.sortBtnActive]}
                    onPress={() => setSortBy('nearest')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortBtnText, sortBy === 'nearest' && styles.sortBtnTextActive]}>
                      {t.sortNearest || (lang === 'hi' ? 'निकटतम मंडी' : 'Nearest Mandi')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>

            {/* LIVE MANDI PRICES LIST */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t.mandiPriceResults} ({mandiPrices.length} {lang === 'hi' ? 'मंडियां' : 'Mandis'})
              </Text>
              <Text style={styles.commoditySubtitle}>
                {lang === 'hi' ? selectedCrop.nameHi : selectedCrop.name} • {selectedState}
              </Text>
            </View>

            {mandiLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={styles.loadingText}>
                  {lang === 'hi' ? 'लाइव मंडी भाव लोड हो रहे हैं...' : 'Fetching Live Mandi Prices from AGMARKNET...'}
                </Text>
              </View>
            ) : mandiPrices.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="sprout-outline" size={36} color="#CBD5E1" style={{ alignSelf: "center", marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>
                  {lang === 'hi' ? 'इस फिल्टर के लिए आज कोई भाव दर्ज नहीं हुआ' : 'No mandi reports found for this filter today'}
                </Text>
                <Text style={styles.emptySub}>
                  {lang === 'hi' ? 'कृपया अन्य राज्य चुनें अथवा "सभी राज्य" का चयन करें।' : 'Try selecting "All States" to see active markets.'}
                </Text>
              </View>
            ) : (
              mandiPrices.map((mandi) => (
                <View key={mandi.id} style={styles.mandiCard}>
                  {/* Top Row: Mandi Name & Distance */}
                  <View style={styles.mandiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mandiNameText}>{mandi.market}</Text>
                      <Text style={styles.mandiLocText}>
                        {mandi.district}, {mandi.state}
                      </Text>
                    </View>

                    {mandi.distanceKm !== null && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceBadgeText}>{mandi.distanceKm} km</Text>
                      </View>
                    )}
                  </View>

                  {/* Variety & Grade info */}
                  <View style={styles.varietyRow}>
                    <Text style={styles.varietyLabel}>
                      {lang === 'hi' ? 'किस्म' : 'Variety'}: <Text style={{ fontWeight: 'bold' }}>{mandi.variety}</Text>
                    </Text>
                    <Text style={styles.varietyLabel}>
                      {lang === 'hi' ? 'ग्रेड' : 'Grade'}: <Text style={{ fontWeight: 'bold' }}>{mandi.grade}</Text>
                    </Text>
                  </View>

                  {/* Price Banner */}
                  <View style={styles.priceContainer}>
                    <View style={styles.minMaxCol}>
                      <Text style={styles.minMaxLabel}>
                        {t.minPrice}: <Text style={styles.minPriceVal}>₹{mandi.minPrice}</Text>
                      </Text>
                      <Text style={styles.minMaxLabel}>
                        {t.maxPrice}: <Text style={styles.maxPriceVal}>₹{mandi.maxPrice}</Text>
                      </Text>
                    </View>

                    <View style={styles.modalPriceBox}>
                      <Text style={styles.modalPriceTitle}>{t.modalPrice}</Text>
                      <Text style={styles.modalPriceAmount}>₹{mandi.modalPrice}</Text>
                      <Text style={styles.unitText}>{mandi.priceUnit}</Text>
                    </View>
                  </View>

                  {/* Footer Meta: Reporting Date & Source */}
                  <View style={styles.mandiFooterRow}>
                    <Text style={styles.metaText}>
                      {mandi.reportingDate} • {mandi.dataSource}
                    </Text>

                    <TouchableOpacity
                      style={styles.betterDealLinkBtn}
                      onPress={() => {
                        setActiveTab('deals');
                        evaluateBetterDeals();
                      }}
                    >
                      <Text style={styles.betterDealLinkText}>
                        {lang === 'hi' ? 'बेहतर सौदा खोजें ›' : 'Find Better Deal ›'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BETTER DEALS (PRICE COMPARISON & NET CALCULATOR)        */}
        {/* ============================================================== */}
        {activeTab === 'deals' && (
          <View>
            {/* FARMER INPUT FORM */}
            <View style={styles.cardContainer}>
              <Text style={styles.cardHeaderTitle}>{t.subBetterDeals}</Text>

              {/* Crop & Quantity Row */}
              <View style={styles.dealsInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputFieldLabel}>{lang === 'hi' ? 'चयनित फसल' : 'Crop'}:</Text>
                  <View style={styles.readOnlyPill}>
                    <Text style={styles.readOnlyPillText}>
                      {selectedCrop.icon} {lang === 'hi' ? selectedCrop.nameHi : selectedCrop.name}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputFieldLabel}>{t.availableQuantity}:</Text>
                  <TextInput
                    style={styles.numericInput}
                    keyboardType="numeric"
                    value={quantityQuintals}
                    onChangeText={setQuantityQuintals}
                    placeholder="50"
                  />
                </View>
              </View>

              {/* Variety & Travel Radius */}
              <View style={[styles.dealsInputRow, { marginTop: 10 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputFieldLabel}>{t.variety}:</Text>
                  <TextInput
                    style={styles.textInputStandard}
                    value={selectedVariety}
                    onChangeText={setSelectedVariety}
                    placeholder="FAQ / Sharbati"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputFieldLabel}>
                    {lang === 'hi' ? 'अधिकतम दूरी' : 'Max Radius'}: {maxDistanceKm} km
                  </Text>
                  <View style={styles.radiusPillsRow}>
                    {[50, 100, 200].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.radiusChip, maxDistanceKm === d && styles.radiusChipActive]}
                        onPress={() => setMaxDistanceKm(d)}
                      >
                        <Text style={[styles.radiusChipText, maxDistanceKm === d && styles.radiusChipTextActive]}>
                          {d}km
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.calculateDealsBtn}
                onPress={evaluateBetterDeals}
                activeOpacity={0.85}
              >
                <Text style={styles.calculateDealsBtnText}>
                  {lang === 'hi' ? 'सर्वोत्तम सौदों की तुलना करें' : 'Compare & Find Best Deals'}
                </Text>
              </TouchableOpacity>
            </View>

            {dealsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={styles.loadingText}>
                  {lang === 'hi' ? 'परिवहन खर्च और शुद्ध मुनाफे की गणना हो रही है...' : 'Calculating net realization & freight expenses...'}
                </Text>
              </View>
            ) : dealsData && dealsData.bestDeal ? (
              <>
                {/*  BEST AVAILABLE DEAL HERO RECOMMENDATION CARD */}
                <View style={styles.bestDealHeroCard}>
                  <View style={styles.bestDealBadgeRow}>
                    <View style={styles.bestDealTrophyBadge}>
                      <Text style={styles.bestDealTrophyText}>{t.bestAvailableDeal}</Text>
                    </View>
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>{dealsData.bestDeal.verificationLabel}</Text>
                    </View>
                  </View>

                  <Text style={styles.bestDealBuyerName}>{dealsData.bestDeal.name}</Text>
                  <Text style={styles.bestDealEntityType}>
                    {dealsData.bestDeal.entityType} • {dealsData.bestDeal.district}, {dealsData.bestDeal.state} ({dealsData.bestDeal.distanceKm} km)
                  </Text>

                  {/* Net Realization Hero Number */}
                  <View style={styles.netHighlightBox}>
                    <Text style={styles.netHighlightLabel}>{t.netSellingAmount}</Text>
                    <Text style={styles.netHighlightAmount}>₹{dealsData.bestDeal.netTotal.toLocaleString('en-IN')}</Text>
                    <Text style={styles.netPerQuintalText}>
                      ≈ ₹{dealsData.bestDeal.netEffectivePerQuintal} / Quintal ({lang === 'hi' ? 'परिवहन व खर्च कटने के बाद' : 'Net in-hand rate'})
                    </Text>
                  </View>

                  {/* Profit Advantage Banner */}
                  {dealsData.netAdvantage > 0 && (
                    <View style={styles.profitAdvantageBanner}>
                      <MaterialCommunityIcons name="arrow-up-bold-circle-outline" size={24} color="#166534" />
                      <Text style={styles.profitAdvantageText}>
                        +₹{dealsData.netAdvantage.toLocaleString('en-IN')} {t.netAdvantageText}
                      </Text>
                    </View>
                  )}

                  {/* Breakdown chips */}
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>{lang === 'hi' ? 'सकल भाव' : 'Gross Rate'}</Text>
                      <Text style={styles.breakdownVal}>₹{dealsData.bestDeal.grossPricePerQuintal}/Q</Text>
                    </View>
                    <View style={styles.breakdownDivider} />
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>{t.estimatedTransport}</Text>
                      <Text style={styles.breakdownVal}>-₹{dealsData.bestDeal.transportCost}</Text>
                    </View>
                    <View style={styles.breakdownDivider} />
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>{lang === 'hi' ? 'मंडी शुल्क' : 'Mandi Fee'}</Text>
                      <Text style={styles.breakdownVal}>
                        {dealsData.bestDeal.mandiCharges > 0 ? `-₹${dealsData.bestDeal.mandiCharges}` : '₹0 (Direct)'}
                      </Text>
                    </View>
                  </View>

                  {/* View Details Action */}
                  <TouchableOpacity
                    style={styles.viewDealBtn}
                    onPress={() => setSelectedDealModal(dealsData.bestDeal)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.viewDealBtnText}>{t.viewDealDetails}</Text>
                  </TouchableOpacity>
                </View>

                {/* COMPARISON SUMMARY KPI ROW */}
                <View style={styles.kpiRowContainer}>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>{lang === 'hi' ? 'सर्वोच्च सकल भाव' : 'Highest Gross'}</Text>
                    <Text style={styles.kpiValue}>₹{dealsData.highestGrossPrice}/Q</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>{lang === 'hi' ? 'न्यूनतम भाड़ा' : 'Lowest Freight'}</Text>
                    <Text style={styles.kpiValue}>₹{dealsData.lowestTransportExpense}</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>{lang === 'hi' ? 'कुल उपलब्ध सौदे' : 'Total Deals'}</Text>
                    <Text style={styles.kpiValue}>{dealsData.totalDealsFound}</Text>
                  </View>
                </View>

                {/* ALL COMPARED DEALS LIST */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'hi' ? 'मंडी एवं खरीदार तुलना सूची' : 'Market & Buyer Comparison'}
                  </Text>
                  <Text style={styles.commoditySubtitle}>
                    {lang === 'hi' ? 'शुद्ध मुनाफे के आधार पर क्रमित' : 'Ranked by highest net profit in hand'}
                  </Text>
                </View>

                {dealsData.deals.map((deal, idx) => {
                  const isTop = idx === 0;
                  return (
                    <TouchableOpacity
                      key={deal.id}
                      style={[styles.dealComparisonCard, isTop && styles.dealComparisonCardTop]}
                      activeOpacity={0.9}
                      onPress={() => setSelectedDealModal(deal)}
                    >
                      <View style={styles.dealCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.dealNameText}>{deal.name}</Text>
                            {isTop && (
                              <View style={styles.rankOneBadge}>
                                <Text style={styles.rankOneText}>#1 Best Net</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.dealSubText}>
                            {deal.entityType} • {deal.distanceKm} km away
                          </Text>
                        </View>

                        <View style={styles.dealNetAmountCol}>
                          <Text style={styles.dealNetTotal}>₹{deal.netTotal.toLocaleString('en-IN')}</Text>
                          <Text style={styles.dealNetRate}>₹{deal.netEffectivePerQuintal}/Q Net</Text>
                        </View>
                      </View>

                      {/* Financial Formula Row */}
                      <View style={styles.dealFormulaRow}>
                        <Text style={styles.formulaItem}>
                          Gross: <Text style={{ fontWeight: 'bold' }}>₹{deal.grossTotal.toLocaleString('en-IN')}</Text>
                        </Text>
                        <Text style={styles.formulaOperator}>-</Text>
                        <Text style={styles.formulaItem}>
                          Freight: <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>₹{deal.transportCost}</Text>
                        </Text>
                        <Text style={styles.formulaOperator}>-</Text>
                        <Text style={styles.formulaItem}>
                          Fees: <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>₹{deal.mandiCharges}</Text>
                        </Text>
                        {deal.transportSubsidy > 0 && (
                          <>
                            <Text style={styles.formulaOperator}>+</Text>
                            <Text style={styles.formulaItem}>
                              Sub: <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>+₹{deal.transportSubsidy}</Text>
                            </Text>
                          </>
                        )}
                      </View>

                      {/* Payment terms & View button */}
                      <View style={styles.dealCardFooter}>
                        <Text style={styles.dealPaymentText} numberOfLines={1}>
                          {deal.paymentTerms}
                        </Text>
                        <Text style={styles.detailsChevronText}>Details ›</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="cash-multiple" size={36} color="#CBD5E1" style={{ alignSelf: "center", marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>
                  {lang === 'hi' ? 'सर्वोत्तम सौदे खोजने के लिए ऊपर तुलना बटन दबाएं' : 'Press Compare Deals above to discover best buyer offers'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* FOOTER ATTRIBUTION */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerMainText}>KisanSAATHI – Market Intelligence & Net Deals</Text>
          <Text style={styles.footerSubText}>
            Official APMC Mandi Data powered by AGMARKNET (data.gov.in) • Verified Buyer Network
          </Text>
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: DEAL DETAILS MODAL                                    */}
      {/* ============================================================== */}
      {selectedDealModal && (
        <Modal
          visible={Boolean(selectedDealModal)}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedDealModal(null)}
        >
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedDealModal.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedDealModal.entityType}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedDealModal(null)} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={20} color="#555" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ marginTop: 8 }}>
                {/* Financial Payout Summary */}
                <View style={styles.modalPayoutCard}>
                  <Text style={styles.payoutCardLabel}>{t.netSellingAmount}</Text>
                  <Text style={styles.payoutCardValue}>₹{selectedDealModal.netTotal.toLocaleString('en-IN')}</Text>
                  <Text style={styles.payoutCardSub}>
                    {selectedDealModal.grossPricePerQuintal} ₹/Q (Gross) | Net Realization: ₹{selectedDealModal.netEffectivePerQuintal} / Quintal
                  </Text>
                </View>

                {/* Complete Cost Breakdown */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionTitle}>{lang === 'hi' ? 'खर्च व आय विवरण' : 'Financial Breakdown'}:</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t.grossSellingAmount} ({quantityQuintals} Q @ ₹{selectedDealModal.grossPricePerQuintal}):</Text>
                    <Text style={styles.detailValue}>₹{selectedDealModal.grossTotal.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t.estimatedTransport} ({selectedDealModal.distanceKm} km):</Text>
                    <Text style={[styles.detailValue, { color: '#C62828' }]}>- ₹{selectedDealModal.transportCost}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{lang === 'hi' ? 'मंडी शुल्क / सेस' : 'Mandi Cess & Weighment'}:</Text>
                    <Text style={[styles.detailValue, { color: '#C62828' }]}>- ₹{selectedDealModal.mandiCharges}</Text>
                  </View>
                  {selectedDealModal.transportSubsidy > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{lang === 'hi' ? 'खरीदार परिवहन सब्सिडी' : 'Buyer Transport Subsidy'}:</Text>
                      <Text style={[styles.detailValue, { color: '#2E7D32' }]}>+ ₹{selectedDealModal.transportSubsidy}</Text>
                    </View>
                  )}
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { fontWeight: 'bold' }]}>{lang === 'hi' ? 'हाथ में आने वाली कुल शुद्ध राशि' : 'Net Amount in Hand'}:</Text>
                    <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#1B5E20' }]}>
                      ₹{selectedDealModal.netTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Terms and Requirements */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionTitle}>{lang === 'hi' ? 'सौदा एवं खरीद शर्तें' : 'Terms & Requirements'}:</Text>
                  <Text style={styles.termsLabel}>{t.paymentTerms}:</Text>
                  <Text style={styles.termsValue}>{selectedDealModal.paymentTerms}</Text>

                  <Text style={[styles.termsLabel, { marginTop: 8 }]}>{t.deliveryTerms}:</Text>
                  <Text style={styles.termsValue}>{selectedDealModal.deliveryTerms}</Text>

                  <Text style={[styles.termsLabel, { marginTop: 8 }]}>{t.qualityRequirements}:</Text>
                  <Text style={styles.termsValue}>{selectedDealModal.qualityTerms}</Text>
                </View>

                {/* Contact Information (if verified buyer) */}
                {selectedDealModal.phone && (
                  <View style={styles.contactBuyerCard}>
                    <Text style={styles.contactTitle}>{lang === 'hi' ? 'खरीदार से सीधा संपर्क' : 'Direct Buyer Contact'}:</Text>
                    <Text style={styles.contactName}>{selectedDealModal.contactPerson || selectedDealModal.name}</Text>
                    <Text style={styles.contactPhone}>{selectedDealModal.phone}</Text>
                    {selectedDealModal.email && <Text style={styles.contactEmail}>{selectedDealModal.email}</Text>}
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: BUYER REQUIREMENT SUBMISSION MODAL                   */}
      {/* ============================================================== */}
      <Modal
        visible={buyerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBuyerModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t.postBuyerOffer}</Text>
                <Text style={styles.modalSubtitle}>
                  {lang === 'hi' ? 'सत्यापित व्यापारी व मिल मालिक यहां खरीद मांग दर्ज करें' : 'Post verified procurement requirements for farmers'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBuyerModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 8 }}>
              {buyerSuccessMsg ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>{buyerSuccessMsg}</Text>
                </View>
              ) : null}

              <Text style={styles.formFieldLabel}>{t.businessName} *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Kisan Agro Mills / Sharma Traders"
                value={buyerFormData.businessName}
                onChangeText={(text) => setBuyerFormData({ ...buyerFormData, businessName: text })}
              />

              <Text style={styles.formFieldLabel}>{lang === 'hi' ? 'संपर्क व्यक्ति का नाम' : 'Contact Person'}</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Rameshwar Sharma"
                value={buyerFormData.contactPerson}
                onChangeText={(text) => setBuyerFormData({ ...buyerFormData, contactPerson: text })}
              />

              <Text style={styles.formFieldLabel}>{lang === 'hi' ? 'मोबाइल नंबर' : 'Phone Number'} *</Text>
              <TextInput
                style={styles.modalTextInput}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                value={buyerFormData.phone}
                onChangeText={(text) => setBuyerFormData({ ...buyerFormData, phone: text })}
              />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.formFieldLabel}>{lang === 'hi' ? 'फसल' : 'Commodity'}</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={buyerFormData.commodity}
                    onChangeText={(text) => setBuyerFormData({ ...buyerFormData, commodity: text })}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.formFieldLabel}>{t.offeredPricePerQuintal} *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="numeric"
                    placeholder="2600"
                    value={buyerFormData.offeredPrice}
                    onChangeText={(text) => setBuyerFormData({ ...buyerFormData, offeredPrice: text })}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.formFieldLabel}>{lang === 'hi' ? 'राज्य' : 'State'}</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={buyerFormData.state}
                    onChangeText={(text) => setBuyerFormData({ ...buyerFormData, state: text })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.formFieldLabel}>{lang === 'hi' ? 'जिला / मंडी क्षेत्र' : 'District'}</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={buyerFormData.district}
                    onChangeText={(text) => setBuyerFormData({ ...buyerFormData, district: text })}
                  />
                </View>
              </View>

              <Text style={styles.formFieldLabel}>{t.paymentTerms}</Text>
              <TextInput
                style={styles.modalTextInput}
                value={buyerFormData.paymentTerms}
                onChangeText={(text) => setBuyerFormData({ ...buyerFormData, paymentTerms: text })}
              />

              <TouchableOpacity
                style={styles.submitOfferBtn}
                onPress={handleBuyerSubmit}
                disabled={buyerSubmitting}
                activeOpacity={0.85}
              >
                {buyerSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitOfferBtnText}>{t.submitOffer}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: STATE SELECTION DROPDOWN MODAL                        */}
      {/* ============================================================== */}
      <Modal
        visible={stateDropdownVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setStateDropdownVisible(false);
          setStateSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.stateModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {lang === 'hi' ? 'राज्य चुनें (मंडी भाव)' : 'Select State (Mandi Prices)'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {lang === 'hi'
                    ? 'अपनी पसंदीदा राज्य की मंडियां देखने के लिए चुनें'
                    : 'Choose a state to filter live APMC market rates'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setStateDropdownVisible(false);
                  setStateSearchQuery('');
                }}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {/* State Search Bar */}
            <View style={styles.stateSearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#888" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.stateSearchInput}
                placeholder={lang === 'hi' ? 'राज्य का नाम खोजें...' : 'Search state name...'}
                placeholderTextColor="#888"
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                clearButtonMode="while-editing"
              />
              {stateSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStateSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* List of States */}
            <ScrollView style={styles.stateListScroll} keyboardShouldPersistTaps="handled">
              {filteredStates.map((st) => {
                const isSelected = selectedState === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stateItemRow, isSelected && styles.stateItemRowActive]}
                    onPress={() => {
                      setSelectedState(st);
                      setStateDropdownVisible(false);
                      setStateSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stateItemLeft}>
                      <View style={[styles.stateItemIconBox, isSelected && styles.stateItemIconBoxActive]}>
                        <MaterialCommunityIcons name={st === "All States" ? "flag-outline" : "bank-outline"} size={16} color="#2E7D32" />
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[styles.stateItemText, isSelected && styles.stateItemTextActive]}>
                          {st === 'All States' ? (lang === 'hi' ? 'सभी राज्य (पूरा भारत)' : 'All States (Pan India)') : st}
                        </Text>
                        <Text style={styles.stateItemSubtext}>
                          {st === 'All States'
                            ? (lang === 'hi' ? 'देश की सभी मंडियों के लाइव भाव' : 'Aggregate prices from all Indian APMCs')
                            : (lang === 'hi' ? `${st} राज्य के लाइव भाव` : `Live mandi records in ${st}`)}
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <View style={styles.stateCheckBadge}>
                        <MaterialCommunityIcons name="check" size={14} color="#1B5E20" />
                      </View>
                    ) : (
                      <Text style={styles.stateSelectChevron}>›</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {filteredStates.length === 0 && (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <MaterialCommunityIcons name="magnify" size={32} color="#CBD5E1" />
                  <Text style={{ color: '#666', marginTop: 8, fontSize: 14 }}>
                    {lang === 'hi' ? 'कोई राज्य नहीं मिला' : 'No state found matching search'}
                  </Text>
                </View>
              )}
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
    backgroundColor: '#F4F7F4',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // HEADER BAR
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E8E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postBuyerBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  postBuyerBtnText: {
    color: '#1B5E20',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // TWO TABS SWITCHER
  tabSwitcherRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#2E7D32',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  // CARD CONTAINERS
  b2cPromoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#1B5E20',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  b2cPromoLeft: {
    flex: 1,
    marginRight: 8,
  },
  b2cPromoTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  b2cPromoTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A5D6A7',
    textTransform: 'uppercase',
  },
  b2cPromoPill: {
    backgroundColor: '#FFD54F',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  b2cPromoPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  b2cPromoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  b2cPromoDesc: {
    fontSize: 11,
    color: '#E8F5E9',
    lineHeight: 14,
  },
  b2cPromoRight: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },

  // SEARCH BAR
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#212121',
  },
  clearSearchIcon: {
    fontSize: 16,
    color: '#888',
    paddingHorizontal: 4,
  },

  // CATEGORY PILLS
  catChip: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  catChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  catChipText: {
    fontSize: 12,
    color: '#33691E',
    fontWeight: '500',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // CROPS HORIZONTAL SCROLL
  cropsHorizontalScroll: {
    paddingVertical: 6,
  },
  cropCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 8,
    width: 90,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
  },
  cropCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
    shadowColor: '#2E7D32',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cropCardIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  cropCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#424242',
    textAlign: 'center',
  },
  cropCardNameSelected: {
    color: '#1B5E20',
  },
  cropCardPrice: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },

  // FILTER BAR
  filterBarContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
  },
  filterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterBarLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  currentLocPill: {
    fontSize: 11,
    backgroundColor: '#E1F5FE',
    color: '#0277BD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
  },

  // STATE DROPDOWN STYLES
  stateDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F8E9',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  stateDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  stateDropdownHint: {
    fontSize: 10,
    color: '#33691E',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stateDropdownSelectedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 2,
  },
  stateDropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearStateBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  clearStateText: {
    fontSize: 10,
    color: '#C62828',
    fontWeight: 'bold',
  },
  stateChevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateDropdownCaret: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },

  stateChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stateChipActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  stateChipText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  stateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // SORTING STYLES
  sortingContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sortHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: 'bold',
  },
  sortCurrentSubtitle: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  sortBtn: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sortBtnActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#2E7D32',
  },
  sortBtnText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
  },
  sortBtnTextActive: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },

  // SECTION HEADER
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  commoditySubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },

  // MANDI CARD
  mandiCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  mandiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mandiNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  mandiLocText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  distanceBadgeText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  varietyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  varietyLabel: {
    fontSize: 11,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  minMaxCol: {
    flex: 1,
  },
  minMaxLabel: {
    fontSize: 12,
    color: '#666',
    marginVertical: 1,
  },
  minPriceVal: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  maxPriceVal: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  modalPriceBox: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  modalPriceTitle: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalPriceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  unitText: {
    fontSize: 10,
    color: '#555',
  },
  mandiFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  metaText: {
    fontSize: 10,
    color: '#888',
    flex: 1,
  },
  betterDealLinkBtn: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  betterDealLinkText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },

  // BETTER DEALS INPUTS
  dealsInputRow: {
    flexDirection: 'row',
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  readOnlyPill: {
    backgroundColor: '#F1F8E9',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  readOnlyPillText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  numericInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  textInputStandard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    fontSize: 13,
    color: '#212121',
  },
  radiusPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  radiusChipActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  radiusChipText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '500',
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calculateDealsBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  calculateDealsBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // BEST DEAL HERO CARD
  bestDealHeroCard: {
    backgroundColor: '#1B5E20',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  bestDealBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestDealTrophyBadge: {
    backgroundColor: '#FFD54F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestDealTrophyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  verifiedTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedTagText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bestDealBuyerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
  },
  bestDealEntityType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  netHighlightBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  netHighlightLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  netHighlightAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  netPerQuintalText: {
    fontSize: 12,
    color: '#FFF9C4',
    fontWeight: '600',
  },
  profitAdvantageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  profitAdvantageIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  profitAdvantageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E65100',
    flex: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  breakdownLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  viewDealBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  viewDealBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1B5E20',
  },

  // KPI CARDS ROW
  kpiRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    width: (windowWidth - 44) / 3,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 10,
    color: '#777',
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 3,
  },

  // COMPARISON DEAL CARD
  dealComparisonCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  dealComparisonCardTop: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  dealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dealNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  dealSubText: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  rankOneBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  rankOneText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  dealNetAmountCol: {
    alignItems: 'flex-end',
  },
  dealNetTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  dealNetRate: {
    fontSize: 11,
    color: '#555',
  },
  dealFormulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  formulaItem: {
    fontSize: 11,
    color: '#444',
  },
  formulaOperator: {
    fontSize: 12,
    color: '#888',
    marginHorizontal: 4,
  },
  dealCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  dealPaymentText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  detailsChevronText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
  },
  modalPayoutCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginVertical: 8,
  },
  payoutCardLabel: {
    fontSize: 11,
    color: '#2E7D32',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  payoutCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginVertical: 2,
  },
  payoutCardSub: {
    fontSize: 11,
    color: '#33691E',
  },
  detailSectionBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: '#555',
  },
  detailValue: {
    fontSize: 12,
    color: '#212121',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 6,
  },
  termsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
  },
  termsValue: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginTop: 2,
  },
  contactBuyerCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  contactPhone: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    marginTop: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // BUYER FORM INPUTS
  formFieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 8,
    marginBottom: 4,
  },
  modalTextInput: {
    backgroundColor: '#F9FBF9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    color: '#212121',
  },
  submitOfferBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitOfferBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  successBannerText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // LOADING & EMPTY STATES
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#2E7D32',
    marginTop: 10,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 4,
  },

  // STATE MODAL STYLES
  stateModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
  },
  stateSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stateSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  stateListScroll: {
    maxHeight: 380,
    marginTop: 4,
  },
  stateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  stateItemRowActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  stateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stateItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateItemIconBoxActive: {
    backgroundColor: '#C8E6C9',
  },
  stateItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stateItemTextActive: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  stateItemSubtext: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  stateCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stateSelectChevron: {
    fontSize: 20,
    color: '#BBB',
    fontWeight: 'bold',
  },

  // FOOTER
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerMainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  footerSubText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
});
