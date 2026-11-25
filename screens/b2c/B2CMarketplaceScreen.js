// screens/b2c/B2CMarketplaceScreen.js
// KisanSAATHI - Direct Farmer-to-Consumer (B2C) Marketplace Screen
// Allows consumers to buy directly from farmers in household/small lots (25kg, 50kg, 1 Quintal / 100kg)

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
  Dimensions,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import {
  getB2CListings,
  addB2CListing,
  getB2CConversations,
  getOrCreateConversation,
} from '../../services/b2cMarketService';

const { width: windowWidth } = Dimensions.get('window');

const QUANTITY_FILTERS = [
  { id: 'All', label: 'All Lots', labelHi: 'सभी लॉट' },
  { id: '50 kg', label: '50 kg Bags', labelHi: '50 kg बैग' },
  { id: '100 kg', label: '100 kg (1 Quintal)', labelHi: '100 kg (1 क्विंटल)' },
  { id: '25 kg', label: '25 kg Trial', labelHi: '25 kg कट्टा' },
];

const CATEGORY_CHIPS = ['All', 'Wheat', 'Rice', 'Mustard', 'Soybean', 'Jaggery', 'Garlic'];

export default function B2CMarketplaceScreen({ navigation }) {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQtyFilter, setSelectedQtyFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [chatsCount, setChatsCount] = useState(2);

  // New Listing Modal (for Farmers)
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCrop, setNewCrop] = useState('');
  const [newVariety, setNewVariety] = useState('');
  const [newPricePerKg, setNewPricePerKg] = useState('');
  const [newPricePer50kg, setNewPricePer50kg] = useState('');
  const [newPricePerQuintal, setNewPricePerQuintal] = useState('');
  const [newPackageSize, setNewPackageSize] = useState('50 kg Bag');
  const [newAvailableQuintals, setNewAvailableQuintals] = useState('');
  const [newVillage, setNewVillage] = useState(user?.village || '');
  const [newDistrict, setNewDistrict] = useState(user?.district || 'Karnal');
  const [newDescription, setNewDescription] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);

  const loadData = async () => {
    try {
      const [data, chats] = await Promise.all([
        getB2CListings({
          crop: selectedCategory,
          packageSize: selectedQtyFilter,
          searchQuery,
        }),
        getB2CConversations(user?.uid),
      ]);
      setListings(data);
      setChatsCount(chats.length);
    } catch (e) {
      console.warn('Error loading B2C listings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedQtyFilter, selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenChatWithFarmer = async (produceItem, initialPackage) => {
    try {
      const conv = await getOrCreateConversation({
        produce: produceItem,
        buyer: user,
        initialQuantity: initialPackage || produceItem.defaultPackage,
      });
      navigation.navigate('B2CChatDetail', { conversationId: conv.id });
    } catch (err) {
      console.error('Failed to open chat:', err);
      Alert.alert('Error', 'Unable to open chat with farmer.');
    }
  };

  const handleCreateListing = async () => {
    if (!newCrop || !newPricePerKg) {
      Alert.alert('Required Fields', 'Please enter crop name and price per kg.');
      return;
    }

    setCreatingListing(true);
    try {
      const perKg = Number(newPricePerKg);
      const per50kg = newPricePer50kg ? Number(newPricePer50kg) : perKg * 50;
      const perQuintal = newPricePerQuintal ? Number(newPricePerQuintal) : perKg * 100;

      await addB2CListing({
        farmerId: user?.uid || 'farmer_current',
        farmerName: user?.fullName || 'Registered Farmer',
        farmerPhone: user?.mobile || '+91 98123 45678',
        farmerVillage: newVillage || 'Agri Farm Belt',
        district: newDistrict || 'Karnal',
        state: user?.state || 'Haryana',
        distanceKm: 5,
        crop: newCrop,
        cropHi: `${newCrop} (ताज़ा फसल)`,
        variety: newVariety || 'Farm Fresh Selection',
        packageSizes: ['25 kg Bag', '50 kg Bag', '100 kg (1 Quintal)'],
        defaultPackage: newPackageSize,
        pricePerKg: perKg,
        pricePer50kg: per50kg,
        pricePerQuintal: perQuintal,
        minOrderQtyKg: 25,
        availableQtyQuintals: Number(newAvailableQuintals) || 10,
        qualityGrade: 'Direct Farm Harvest (Clean & Graded)',
        deliveryOptions: ['Farm Gate Pickup', 'Local Delivery'],
        description: newDescription || 'Freshly harvested direct farm produce packed in consumer friendly bags.',
        rating: 5.0,
        reviewsCount: 1,
        harvestDate: 'April 2026',
        accentColor: '#1B5E20',
      });

      setAddModalVisible(false);
      setNewCrop('');
      setNewVariety('');
      setNewPricePerKg('');
      setNewPricePer50kg('');
      setNewPricePerQuintal('');
      setNewDescription('');
      Alert.alert('Success', 'Your produce listing has been published to consumers!');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to publish listing.');
    } finally {
      setCreatingListing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <View style={styles.platformBadge}>
              <MaterialCommunityIcons name="handshake" size={14} color="#1B5E20" style={{ marginRight: 4 }} />
              <Text style={styles.platformBadgeText}>Kisan Direct • B2C</Text>
            </View>
            <View style={styles.smallQuantityBadge}>
              <Text style={styles.smallQuantityBadgeText}>50kg / 100kg Lots</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>
            {lang === 'hi' ? 'किसान सीधा बाज़ार' : 'Farmer Direct Marketplace'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {lang === 'hi'
              ? 'बिचौलियों के बिना सीधे खेत से ताज़ा फसल (50 kg, 1 क्विंटल में)'
              : 'Buy direct from farmers in household quantities (50 kg, 1 Quintal)'}
          </Text>
        </View>

        {/* WEB3 TRACEABILITY BUTTON */}
        <TouchableOpacity
          style={[styles.chatNavButton, { backgroundColor: '#1A237E', marginRight: 8 }]}
          onPress={() => navigation.navigate('Web3Traceability')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="cube-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* INBOX / CHAT BUTTON */}
        <TouchableOpacity
          style={styles.chatNavButton}
          onPress={() => navigation.navigate('B2CChatsList')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#FFFFFF" />
          {chatsCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>{chatsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B5E20']} />}
      >
        {/* FARMER SELL DIRECT CALLOUT BANNER */}
        <View style={styles.farmerCalloutBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons name="sprout" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
              <Text style={styles.calloutTag}>
                {lang === 'hi' ? 'किसानों के लिए सुनहरा अवसर' : 'For Farmers: Direct B2C Selling'}
              </Text>
            </View>
            <Text style={styles.calloutTitle}>
              {lang === 'hi' ? 'सीधे ग्राहकों को बेचें — 25-40% अधिक मुनाफा' : 'Sell in 50kg & 100kg Lots directly to consumers'}
            </Text>
            <Text style={styles.calloutBody}>
              {lang === 'hi'
                ? 'मंडी आढ़त और कटौती से बचें। 50 kg और 1 क्विंटल की बोरियां सीधे परिवारों और दुकानों को बेचें।'
                : 'Bypass commission agents. List your produce and chat directly with buyers.'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.listProduceButton}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.listProduceButtonText}>
              {lang === 'hi' ? 'फसल जोड़ें' : 'List Harvest'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#757575" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={lang === 'hi' ? 'फसल, किसान या जिला खोजें (जैसे गेहूं, 50 kg, नासिक)...' : 'Search crop, farmer, or district...'}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              loadData();
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadData(); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>

        {/* QUANTITY FILTERS (50kg, 100kg / 1 Quintal, 25kg) */}
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="scale-bathroom" size={18} color="#1B5E20" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeading}>
            {lang === 'hi' ? 'मात्रा अनुसार चुनें (Retail Lots)' : 'Filter by Package Size'}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {QUANTITY_FILTERS.map((q) => {
            const isSelected = selectedQtyFilter === q.id;
            return (
              <TouchableOpacity
                key={q.id}
                style={[styles.qtyChip, isSelected && styles.qtyChipActive]}
                onPress={() => setSelectedQtyFilter(q.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.qtyChipText, isSelected && styles.qtyChipTextActive]}>
                  {lang === 'hi' ? q.labelHi : q.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CATEGORY CHIPS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORY_CHIPS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* PRODUCE LISTINGS FEED */}
        <View style={styles.resultsInfoRow}>
          <Text style={styles.resultsCountText}>
            {listings.length} {lang === 'hi' ? 'सीधे किसान लॉट उपलब्ध' : 'Direct Farmer Produce Lots'}
          </Text>
          <Text style={styles.resultsSubText}>
            {lang === 'hi' ? 'सीधी बातचीत एवं मोलभाव उपलब्ध' : 'Direct chat & negotiation enabled'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>{lang === 'hi' ? 'ताज़ा फसल लॉट लोड हो रहे हैं...' : 'Loading direct farmer produce...'}</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="sprout-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>{lang === 'hi' ? 'कोई लॉट नहीं मिला' : 'No Produce Listings Found'}</Text>
            <Text style={styles.emptyDesc}>{lang === 'hi' ? 'कृपया अन्य फ़िल्टर या खोज शब्द आज़माएँ।' : 'Try adjusting your search or filters.'}</Text>
          </View>
        ) : (
          listings.map((item) => (
            <View key={item.id} style={styles.produceCard}>
              {/* TOP ROW: CROP & DISTANCE */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cropTitleRow}>
                    <Text style={styles.cropNameText}>{item.crop}</Text>
                    {item.verifiedFarmer && (
                      <View style={styles.verifiedPill}>
                        <MaterialCommunityIcons name="check-decagram" size={12} color="#1565C0" style={{ marginRight: 2 }} />
                        <Text style={styles.verifiedPillText}>Verified Farmer</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cropVarietyText}>{item.variety}</Text>
                </View>

                {/* DISTANCE BADGE */}
                <View style={styles.distanceBadge}>
                  <MaterialCommunityIcons name="map-marker-distance" size={13} color="#2E7D32" style={{ marginRight: 2 }} />
                  <Text style={styles.distanceText}>{item.distanceKm} km</Text>
                </View>
              </View>

              {/* FARMER DETAIL BAR */}
              <View style={styles.farmerDetailBar}>
                <MaterialCommunityIcons name="account-circle" size={18} color="#455A64" style={{ marginRight: 6 }} />
                <Text style={styles.farmerName}>{item.farmerName}</Text>
                <Text style={styles.farmerLocation}> • {item.farmerVillage}, {item.district}</Text>
              </View>

              {/* PRICING & PACKAGE BOX */}
              <View style={styles.pricingBox}>
                <View style={styles.priceColumn}>
                  <Text style={styles.priceSubLabel}>{lang === 'hi' ? 'प्रति किलो भाव' : 'Rate / kg'}</Text>
                  <Text style={styles.pricePerKgText}>₹{item.pricePerKg}<Text style={styles.perUnit}>/kg</Text></Text>
                </View>

                <View style={styles.verticalDivider} />

                <View style={styles.priceColumn}>
                  <Text style={styles.priceSubLabel}>{lang === 'hi' ? '50 kg बोरी भाव' : '50 kg Bag'}</Text>
                  <Text style={styles.pricePerBagText}>₹{item.pricePer50kg.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.verticalDivider} />

                <View style={styles.priceColumn}>
                  <Text style={styles.priceSubLabel}>{lang === 'hi' ? '1 क्विंटल (100kg)' : '1 Quintal (100kg)'}</Text>
                  <Text style={styles.pricePerQuintalText}>₹{item.pricePerQuintal.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* AVAILABLE PACKAGES ROW */}
              <View style={styles.packagesRow}>
                <Text style={styles.packagePrefix}>{lang === 'hi' ? 'पैकेजिंग उपलब्ध:' : 'Packaging:'}</Text>
                {item.packageSizes.map((pkg, idx) => (
                  <View key={idx} style={styles.packageTag}>
                    <Text style={styles.packageTagText}>{pkg}</Text>
                  </View>
                ))}
              </View>

              {/* DESCRIPTION & QUALITY */}
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>

              {/* ACTION BUTTONS ROW */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => handleOpenChatWithFarmer(item, item.defaultPackage)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="chat-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.chatButtonText}>
                    {lang === 'hi' ? 'किसान से बात करें (Chat)' : 'Chat with Farmer'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => handleOpenChatWithFarmer(item, '100 kg (1 Quintal)')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="cart-outline" size={16} color="#1B5E20" style={{ marginRight: 4 }} />
                  <Text style={styles.detailsButtonText}>
                    {lang === 'hi' ? '1 क्विंटल खरीदें' : 'Buy 1 Quintal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL: FARMER SELL DIRECT LISTING */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {lang === 'hi' ? 'सीधा बाज़ार में फसल जोड़ें (B2C)' : 'List Produce for Direct B2C Sale'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {lang === 'hi' ? '50 kg एवं 1 क्विंटल बोरियों में ग्राहकों को बेचें' : 'Sell in 50kg / 100kg bags to retail buyers'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.inputLabel}>{lang === 'hi' ? 'फसल का नाम *' : 'Crop Name *'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="उदा. शरबती गेहूं, बासमती चावल, सरसों"
                value={newCrop}
                onChangeText={setNewCrop}
              />

              <Text style={styles.inputLabel}>{lang === 'hi' ? 'किस्म / वैरायटी' : 'Variety / Specification'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="उदा. MP Sharbati Gold, Pusa 1121"
                value={newVariety}
                onChangeText={setNewVariety}
              />

              <View style={styles.multiInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? 'भाव प्रति किलो (₹/kg) *' : 'Price / kg (₹) *'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="उदा. 34"
                    keyboardType="numeric"
                    value={newPricePerKg}
                    onChangeText={setNewPricePerKg}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? '50 kg बोरी का भाव (₹)' : 'Price / 50kg bag (₹)'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="उदा. 1700"
                    keyboardType="numeric"
                    value={newPricePer50kg}
                    onChangeText={setNewPricePer50kg}
                  />
                </View>
              </View>

              <View style={styles.multiInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? '1 क्विंटल का भाव (₹)' : 'Price / Quintal (₹)'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="उदा. 3400"
                    keyboardType="numeric"
                    value={newPricePerQuintal}
                    onChangeText={setNewPricePerQuintal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{lang === 'hi' ? 'उपलब्ध मात्रा (क्विंटल)' : 'Available (Quintals)'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="उदा. 20"
                    keyboardType="numeric"
                    value={newAvailableQuintals}
                    onChangeText={setNewAvailableQuintals}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>{lang === 'hi' ? 'खेत / गांव का पता' : 'Farm Village / Location'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="उदा. पिंपलगांव, नासिक"
                value={newVillage}
                onChangeText={setNewVillage}
              />

              <Text style={styles.inputLabel}>{lang === 'hi' ? 'फसल का विवरण (Quality & Cleaning)' : 'Description'}</Text>
              <TextInput
                style={[styles.modalInput, { height: 70 }]}
                multiline
                placeholder="उदा. तीन बार छना हुआ गेहूं, कोई कंकड़ नहीं, घर के लिए उत्तम..."
                value={newDescription}
                onChangeText={setNewDescription}
              />

              <TouchableOpacity
                style={styles.submitListingBtn}
                onPress={handleCreateListing}
                disabled={creatingListing}
              >
                {creatingListing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitListingBtnText}>
                    {lang === 'hi' ? 'फसल प्रकाशित करें (Publish)' : 'Publish B2C Listing'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F4',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  platformBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
  },
  smallQuantityBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  smallQuantityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E65100',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A331A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#556B55',
    marginTop: 2,
  },
  chatNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#D32F2F',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  farmerCalloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  calloutTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 2,
  },
  calloutBody: {
    fontSize: 11,
    color: '#388E3C',
    lineHeight: 15,
  },
  listProduceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  listProduceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D0DBD0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E4C2E',
  },
  filterScroll: {
    paddingBottom: 8,
  },
  qtyChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  qtyChipActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  qtyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#455A64',
  },
  qtyChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryScroll: {
    paddingBottom: 10,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ECEFF1',
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: '#388E3C',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#546E7A',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  resultsSubText: {
    fontSize: 11,
    color: '#757575',
    fontStyle: 'italic',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  produceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8E2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cropTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A331A',
    marginRight: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
  },
  cropVarietyText: {
    fontSize: 12,
    color: '#616161',
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  farmerDetailBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  farmerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37474F',
  },
  farmerLocation: {
    fontSize: 11,
    color: '#78909C',
  },
  pricingBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FBF9',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E8F0E8',
    marginBottom: 10,
  },
  priceColumn: {
    flex: 1,
    alignItems: 'center',
  },
  priceSubLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  pricePerKgText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E65100',
  },
  perUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
  },
  pricePerBagText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
  },
  pricePerQuintalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D47A1',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 2,
  },
  packagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  packagePrefix: {
    fontSize: 11,
    color: '#616161',
    marginRight: 6,
  },
  packageTag: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 2,
  },
  packageTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#33691E',
  },
  descriptionText: {
    fontSize: 12,
    color: '#424242',
    lineHeight: 16,
    marginBottom: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingVertical: 10,
    borderRadius: 10,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  detailsButtonText: {
    color: '#1B5E20',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F5F7F5',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
  },
  multiInputRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  submitListingBtn: {
    backgroundColor: '#1B5E20',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  submitListingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
