import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/customer/CustomerHomeScreen.js
// KisanSAATHI - Customer / Buyer Dashboard Home Screen

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';
import { getProduceListings, getBuyerOffers } from '../../services/customerService';
import { getTranslation } from '../../services/translations';

export default function CustomerHomeScreen({ navigation }) {
  const { user, roleProfile, logout } = useAuth();
  const lang = user?.preferredLanguage || 'hi';
  const t = getTranslation(lang);

  const [produceList, setProduceList] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [listings, myOffers] = await Promise.all([
        getProduceListings(),
        getBuyerOffers(user?.uid),
      ]);
      setProduceList(listings);
      setOffers(myOffers);
    } catch (e) {
      console.warn('Failed to load customer home data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pendingCount = offers.filter((o) => o.status === 'Pending').length;
  const acceptedCount = offers.filter((o) => o.status === 'Accepted').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565C0']} />}
      >
        {/* TOP PROFILE HEADER */}
        <View style={styles.headerBar}>
          <View style={{ flex: 1 }}>
            <View style={styles.roleBadgeRow}>
              <View style={[styles.buyerPill, { flexDirection: 'row', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#1565C0" style={{ marginRight: 4 }} />
                <Text style={styles.buyerPillText}>{lang === 'hi' ? 'सत्यापित खरीदार / व्यापारी' : 'Verified Buyer / Trader'}</Text>
              </View>
            </View>
            <Text style={styles.userName}>{user?.fullName || 'Business Buyer'}</Text>
            <Text style={styles.userSubtitle}>
              {roleProfile?.businessName || 'Agri Commodity Trading'} • {roleProfile?.district || 'Karnal'}, {roleProfile?.state || 'Haryana'}
            </Text>
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { flexDirection: 'row', alignItems: 'center' }]} onPress={logout} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={14} color="#C62828" style={{ marginRight: 4 }} />
            <Text style={styles.logoutBtnText}>{lang === 'hi' ? 'लॉगआउट' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>

        {/* B2C DIRECT FARMER-TO-CONSUMER CALLOUT CARD */}
        <TouchableOpacity
          style={styles.b2cCalloutCard}
          onPress={() => navigation.navigate('Direct B2C')}
          activeOpacity={0.88}
        >
          <View style={styles.b2cCalloutContent}>
            <View style={styles.b2cHeaderRow}>
              <View style={styles.b2cIconBadge}>
                <MaterialCommunityIcons name="handshake" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.b2cBadgeTag}>NEW B2C PLATFORM</Text>
                  <View style={styles.b2cLotSizePill}>
                    <Text style={styles.b2cLotSizePillText}>50kg / 100kg Lots</Text>
                  </View>
                </View>
                <Text style={styles.b2cTitle}>
                  {lang === 'hi' ? 'किसान सीधा बाज़ार (Kisan Direct)' : 'Buy Direct from Local Farmers'}
                </Text>
              </View>
            </View>
            <Text style={styles.b2cSubtitle}>
              {lang === 'hi'
                ? '50 kg और 1 क्विंटल की बोरियां सीधे खेत से खरीदें। किसान से सीधी चैट और मोलभाव करें!'
                : 'Purchase household and retail lots directly from verified farmers with instant 1-on-1 negotiation chat.'}
            </Text>
            <View style={styles.b2cActionRow}>
              <Text style={styles.b2cActionLink}>
                {lang === 'hi' ? 'सीधे किसान लॉट देखें एवं चैट करें ›' : 'Explore Farmer Lots & Chat ›'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* METRICS ROW */}
        <View style={styles.metricsContainer}>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Browse')}
            activeOpacity={0.8}
          >
            <Text style={styles.metricVal}>{produceList.length}</Text>
            <Text style={styles.metricLabel}>
              {lang === 'hi' ? 'उपलब्ध किसान लॉट' : 'Farmer Lots'}
            </Text>
            <Text style={styles.metricAction}>{lang === 'hi' ? 'ब्राउज़ करें ›' : 'Browse ›'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, { borderColor: '#BBDEFB' }]}
            onPress={() => navigation.navigate('My Offers')}
            activeOpacity={0.8}
          >
            <Text style={[styles.metricVal, { color: '#E65100' }]}>{pendingCount}</Text>
            <Text style={styles.metricLabel}>
              {lang === 'hi' ? 'सक्रिय खरीद प्रस्ताव' : 'Pending Offers'}
            </Text>
            <Text style={[styles.metricAction, { color: '#E65100' }]}>{lang === 'hi' ? 'स्थिति देखें ›' : 'Track ›'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metricCard, { borderColor: '#C8E6C9' }]}
            onPress={() => navigation.navigate('My Offers')}
            activeOpacity={0.8}
          >
            <Text style={[styles.metricVal, { color: '#1B5E20' }]}>{acceptedCount}</Text>
            <Text style={styles.metricLabel}>
              {lang === 'hi' ? 'स्वीकृत सौदे' : 'Accepted Deals'}
            </Text>
            <Text style={[styles.metricAction, { color: '#1B5E20' }]}>{lang === 'hi' ? 'कॉन्ट्रैक्ट्स ›' : 'Contracts ›'}</Text>
          </TouchableOpacity>
        </View>

        {/* WHOLESALE COMMODITY TICKER */}
        <View style={styles.tickerCard}>
          <View style={styles.tickerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="trending-up" size={18} color="#1565C0" style={{ marginRight: 6 }} />
              <Text style={styles.tickerTitle}>
                {lang === 'hi' ? 'आज के बेंचमार्क थोक भाव (₹/क्विंटल)' : "Today's Wholesale Benchmarks (₹/Qtl)"}
              </Text>
            </View>
            <Text style={styles.tickerLiveBadge}>● LIVE APMC</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {[
              { crop: 'Wheat (गेहूं)', rate: '₹2,620', change: '+₹25' },
              { crop: 'Basmati Paddy', rate: '₹4,150', change: '+₹60' },
              { crop: 'Mustard (सरसों)', rate: '₹5,750', change: '+₹40' },
              { crop: 'Soybean (सोयाबीन)', rate: '₹4,650', change: '-₹15' },
              { crop: 'Chana (चना)', rate: '₹6,100', change: '+₹30' },
            ].map((item, idx) => (
              <View key={idx} style={styles.tickerPill}>
                <Text style={styles.tickerCropName}>{item.crop}</Text>
                <Text style={styles.tickerCropRate}>{item.rate}</Text>
                <Text style={[styles.tickerChange, { color: item.change.startsWith('+') ? '#2E7D32' : '#C62828' }]}>
                  {item.change}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* FEATURED PRODUCE LISTINGS */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="sprout" size={18} color="#1565C0" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>
                {lang === 'hi' ? 'किसानों के ताज़ा उत्पाद' : 'Direct Farmer Produce Lots'}
              </Text>
            </View>
            <Text style={styles.sectionSub}>
              {lang === 'hi' ? 'किसानों से सीधे ताज़ा कृषि उत्पाद' : 'Direct from farmers across verified mandis'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
            <Text style={styles.seeAllText}>{lang === 'hi' ? 'सभी देखें ›' : 'View All ›'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1565C0" style={{ marginVertical: 30 }} />
        ) : (
          produceList.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.produceCard}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.produceCrop}>{item.crop}</Text>
                  <Text style={styles.produceVariety}>{item.variety}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₹{item.expectedPricePerQuintal}</Text>
                  <Text style={styles.priceUnit}>/ क्विंटल</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" style={{ marginRight: 3 }} />
                  <Text style={styles.metaItem}>{item.village}, {item.district} ({item.state})</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="package-variant-closed" size={13} color="#64748B" style={{ marginRight: 3 }} />
                  <Text style={styles.metaItem}>{item.quantityQuintals} Quintals Available</Text>
                </View>
              </View>

              <View style={styles.farmerRow}>
                <View style={styles.farmerIconCircle}>
                  <MaterialCommunityIcons name="account" size={16} color="#2E7D32" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.farmerName}>{item.farmerName}</Text>
                  <Text style={styles.farmerQuality}>{item.qualityGrade}</Text>
                </View>
                <TouchableOpacity
                  style={styles.offerBtn}
                  onPress={() => navigation.navigate('Browse')}
                >
                  <Text style={styles.offerBtnText}>
                    {lang === 'hi' ? 'प्रस्ताव भेजें' : 'Make Offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* QUICK SOURCING BANNER */}
        <View style={styles.sourcingBanner}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="handshake-outline" size={24} color="#1565C0" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>
              {lang === 'hi' ? 'सीधे किसान से थोक खरीद' : 'Direct Sourcing Advantage'}
            </Text>
            <Text style={styles.bannerDesc}>
              {lang === 'hi'
                ? 'बिचौलियों के बिना सीधे कृषि उत्पादकों से संपर्क करें, पारदर्शी वज़न और सुरक्षित बैंक भुगतान के साथ।'
                : 'Connect directly with certified farmers with zero intermediary commission and verified weighment.'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  roleBadgeRow: {
    marginBottom: 4,
  },
  buyerPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buyerPillText: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  metricAction: {
    fontSize: 10,
    color: '#1565C0',
    fontWeight: 'bold',
    marginTop: 4,
  },
  tickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tickerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  },
  tickerLiveBadge: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: 'bold',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tickerPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  tickerCropName: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tickerCropRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginVertical: 2,
  },
  tickerChange: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: 'bold',
  },
  produceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  produceCrop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  produceVariety: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  priceBadge: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  priceUnit: {
    fontSize: 10,
    color: '#64748B',
  },
  metaRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    fontSize: 11,
    color: '#475569',
    marginVertical: 1,
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
  },
  farmerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  farmerQuality: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
  },
  offerBtn: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  offerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sourcingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerEmoji: {
    fontSize: 32,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  b2cCalloutCard: {
    backgroundColor: '#1565C0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#1565C0',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  b2cCalloutContent: {},
  b2cHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  b2cIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  b2cBadgeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#90CAF9',
    letterSpacing: 0.5,
  },
  b2cLotSizePill: {
    backgroundColor: '#FFD54F',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  b2cLotSizePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  b2cTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  b2cSubtitle: {
    fontSize: 11,
    color: '#E3F2FD',
    lineHeight: 15,
    marginVertical: 6,
  },
  b2cActionRow: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  b2cActionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD54F',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 16,
    marginTop: 2,
  },
});
