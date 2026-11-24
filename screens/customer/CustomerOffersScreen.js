import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/customer/CustomerOffersScreen.js
// KisanSAATHI - Buyer Offers Management Screen

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
  Alert,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';
import { getBuyerOffers, updateOfferStatus } from '../../services/customerService';

export default function CustomerOffersScreen({ navigation }) {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'accepted'

  const loadOffers = async () => {
    try {
      const data = await getBuyerOffers(user?.uid);
      setOffers(data);
    } catch (e) {
      console.warn('Failed to load buyer offers', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOffers();
  };

  const handleWithdrawOffer = async (offerId) => {
    Alert.alert(
      lang === 'hi' ? 'प्रस्ताव वापस लें' : 'Withdraw Offer',
      lang === 'hi'
        ? 'क्या आप निश्चित रूप से यह खरीद प्रस्ताव वापस लेना चाहते हैं?'
        : 'Are you sure you want to withdraw this purchase offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: lang === 'hi' ? 'हाँ, वापस लें' : 'Yes, Withdraw',
          style: 'destructive',
          onPress: async () => {
            await updateOfferStatus(offerId, 'Withdrawn');
            loadOffers();
          },
        },
      ]
    );
  };

  const filteredOffers = offers.filter((o) => {
    if (filterTab === 'pending') return o.status === 'Pending';
    if (filterTab === 'accepted') return o.status === 'Accepted';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565C0']} />}
      >
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>
            {lang === 'hi' ? 'मेरे खरीद प्रस्ताव व सौदे' : 'My Purchase Offers'}
          </Text>
          <Text style={styles.screenSub}>
            {lang === 'hi'
              ? 'किसानों को भेजे गए खरीद प्रस्तावों की स्थिति और स्वीकृत अनुबंध'
              : 'Track status of dispatched offers and finalized farmer contracts'}
          </Text>
        </View>

        {/* TABS FILTER */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'all' && styles.tabBtnActive]}
            onPress={() => setFilterTab('all')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'all' && styles.tabBtnTextActive]}>
              {lang === 'hi' ? 'सभी प्रस्ताव' : 'All Offers'} ({offers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setFilterTab('pending')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'pending' && styles.tabBtnTextActive]}>
              {lang === 'hi' ? 'समीक्षाधीन' : 'Pending'} ({offers.filter((o) => o.status === 'Pending').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'accepted' && styles.tabBtnActive]}
            onPress={() => setFilterTab('accepted')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'accepted' && styles.tabBtnTextActive]}>
              {lang === 'hi' ? 'स्वीकृत' : 'Accepted'} ({offers.filter((o) => o.status === 'Accepted').length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1565C0" style={{ marginVertical: 30 }} />
        ) : filteredOffers.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="file-document-outline" size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>
              {lang === 'hi' ? 'कोई प्रस्ताव नहीं मिला' : 'No Offers in this category'}
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('Browse')}
            >
              <Text style={styles.browseBtnText}>
                {lang === 'hi' ? 'उपज ब्राउज़ करें' : 'Browse Produce'} →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOffers.map((item) => {
            const isAccepted = item.status === 'Accepted';
            const isPending = item.status === 'Pending';

            return (
              <View key={item.id} style={styles.offerCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerCrop}>{item.crop}</Text>
                    <Text style={styles.offerVariety}>{item.variety}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isAccepted
                        ? styles.statusAccepted
                        : isPending
                        ? styles.statusPending
                        : styles.statusRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isAccepted
                          ? styles.statusTextAccepted
                          : isPending
                          ? styles.statusTextPending
                          : styles.statusTextRejected,
                      ]}
                    >
                      {item.status === 'Accepted'
                        ? lang === 'hi' ? 'स्वीकृत सौदा' : 'Deal Accepted'
                        : item.status === 'Pending'
                        ? lang === 'hi' ? 'समीक्षाधीन' : 'Pending Review'
                        : item.status}
                    </Text>
                  </View>
                </View>

                {/* Amount Details */}
                <View style={styles.amountBox}>
                  <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>{lang === 'hi' ? 'प्रस्तावित दर' : 'Offered Rate'}:</Text>
                    <Text style={styles.amountVal}>₹{item.offeredPricePerQuintal} / Q</Text>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>{lang === 'hi' ? 'मात्रा' : 'Quantity'}:</Text>
                    <Text style={styles.amountVal}>{item.quantityQuintals} Quintals</Text>
                  </View>
                  <View style={[styles.amountCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.amountLabel}>{lang === 'hi' ? 'कुल राशि' : 'Total Amount'}:</Text>
                    <Text style={[styles.amountVal, { color: '#1565C0', fontWeight: 'bold' }]}>
                      ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Farmer Contact & Terms */}
                <View style={styles.farmerBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="account" size={14} color="#2E7D32" style={{ marginRight: 4 }} />
                    <Text style={styles.farmerDetailText}>
                      {lang === 'hi' ? 'किसान' : 'Farmer'}: <Text style={{ fontWeight: 'bold' }}>{item.farmerName}</Text> • {item.location}
                    </Text>
                  </View>
                  {isAccepted ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <MaterialCommunityIcons name="phone" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                      <Text style={styles.farmerContactText}>
                        {lang === 'hi' ? 'संपर्क नंबर' : 'Direct Phone'}: <Text style={{ fontWeight: 'bold', color: '#16A34A' }}>{item.farmerPhone}</Text>
                      </Text>
                    </View>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <MaterialCommunityIcons name="credit-card-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.termsText}>{item.paymentTerms}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <MaterialCommunityIcons name="truck-delivery-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.termsText}>{item.deliveryTerms}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {isAccepted ? (
                    <View style={[styles.confirmedPill, { flexDirection: 'row', alignItems: 'center' }]}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color="#166534" style={{ marginRight: 6 }} />
                      <Text style={[styles.confirmedText, { flex: 1 }]}>
                        {lang === 'hi' ? 'किसान ने सौदा स्वीकार कर लिया है। वजन व लोडिंग के लिए संपर्क करें।' : 'Contract confirmed! Contact farmer for dispatch schedule.'}
                      </Text>
                    </View>
                  ) : isPending ? (
                    <TouchableOpacity
                      style={styles.withdrawBtn}
                      onPress={() => handleWithdrawOffer(item.id)}
                    >
                      <Text style={styles.withdrawBtnText}>
                        {lang === 'hi' ? 'प्रस्ताव वापस लें' : 'Withdraw Offer'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
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
  titleSection: {
    marginTop: 14,
    marginBottom: 12,
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
  },
  browseBtn: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offerCrop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  offerVariety: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusAccepted: {
    backgroundColor: '#DCFCE7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextAccepted: {
    color: '#15803D',
  },
  statusTextRejected: {
    color: '#B91C1C',
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  amountVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  farmerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  farmerDetailText: {
    fontSize: 11,
    color: '#334155',
  },
  farmerContactText: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 3,
  },
  termsText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  actionsRow: {
    marginTop: 6,
  },
  confirmedPill: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmedText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  withdrawBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  withdrawBtnText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
