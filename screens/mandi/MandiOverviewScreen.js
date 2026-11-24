import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/mandi/MandiOverviewScreen.js
// KisanSAATHI - Mandi Owner & APMC Overview Dashboard

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
import { getMandiCommodities, getMandiEnquiries } from '../../services/mandiService';

export default function MandiOverviewScreen({ navigation }) {
  const { user, roleProfile, logout, approveMandi } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [commodities, setCommodities] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  const verificationStatus = roleProfile?.verificationStatus || 'pending';
  const isApproved = verificationStatus === 'approved';

  const loadData = async () => {
    try {
      const [comms, enqs] = await Promise.all([
        getMandiCommodities(),
        getMandiEnquiries(),
      ]);
      setCommodities(comms);
      setEnquiries(enqs);
    } catch (e) {
      console.warn('Failed to load mandi overview data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleProfile?.verificationStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAdminVerifyToggle = async () => {
    setAdminActionLoading(true);
    try {
      const newStatus = isApproved ? 'pending' : 'approved';
      await approveMandi(user?.uid, newStatus);
      Alert.alert(
        'Admin Action Successful',
        `Mandi verification status set to: "${newStatus.toUpperCase()}".`
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const totalArrivals = commodities.reduce((acc, curr) => acc + (curr.dailyArrivalTons || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E65100']} />}
      >
        {/* MANDI HEADER */}
        <View style={styles.headerBar}>
          <View style={{ flex: 1 }}>
            <View style={styles.roleBadgeRow}>
              <View style={[styles.mandiPill, { flexDirection: 'row', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="storefront-outline" size={14} color="#E65100" style={{ marginRight: 4 }} />
                <Text style={styles.mandiPillText}>{lang === 'hi' ? 'मंडी प्रशासन' : 'APMC Administration'}</Text>
              </View>
            </View>
            <Text style={styles.mandiTitle}>{roleProfile?.mandiName || 'Karnal Grain Market APMC'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.mandiLocation}>
                {roleProfile?.mandiAddress || `${roleProfile?.district || 'Karnal'}, ${roleProfile?.state || 'Haryana'}`}
              </Text>
            </View>
            <Text style={styles.regNumber}>
              {lang === 'hi' ? 'लाइसेंस सं.: ' : 'Reg No: '}
              <Text style={{ fontWeight: 'bold' }}>{roleProfile?.registrationDetails || 'APMC/HR/2026/089'}</Text>
            </Text>
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { flexDirection: 'row', alignItems: 'center' }]} onPress={logout} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={14} color="#C62828" style={{ marginRight: 4 }} />
            <Text style={styles.logoutBtnText}>{lang === 'hi' ? 'लॉगआउट' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>

        {/* VERIFICATION STATUS CARD */}
        <View
          style={[
            styles.verificationBanner,
            isApproved ? styles.verificationApproved : styles.verificationPending,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons
              name={isApproved ? "check-decagram" : "clock-outline"}
              size={24}
              color={isApproved ? "#15803D" : "#B45309"}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.verificationTitle,
                  { color: isApproved ? '#15803D' : '#B45309' },
                ]}
              >
                {isApproved
                  ? (lang === 'hi' ? 'सत्यापित आधिकारिक मंडी (Verified APMC)' : 'Verified APMC Market')
                  : (lang === 'hi' ? 'सत्यापन समीक्षाधीन (Verification Pending)' : 'Verification Under Review')}
              </Text>
              <Text style={styles.verificationDesc}>
                {isApproved
                  ? (lang === 'hi'
                    ? 'आपकी मंडी कृषि विपणन बोर्ड द्वारा सत्यापित है। आप दैनिक आधिकारिक मंडी भाव प्रकाशित करने हेतु अधिकृत हैं।'
                    : 'Your mandi is verified by the Directorate of Agricultural Marketing. You are authorized to publish official daily rates.')
                  : (lang === 'hi'
                    ? 'आपके दस्तावेज़ सत्यापन के लिए प्रस्तुत हैं। आधिकारिक भाव प्रकाशन की अनुमति मिलने तक यह सुविधा प्रतीक्षारत रहेगी।'
                    : 'Your registration is under administrative verification. Official price publishing is locked until approval.')}
              </Text>
            </View>
          </View>

          {/* ADMIN VERIFICATION CONTROL PANEL (For Testing & Reviewers) */}
          <View style={styles.adminControlBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminControlHeading}>
                {lang === 'hi' ? 'प्रशासक सत्यापन नियंत्रण' : 'Admin Verification Control'}:
              </Text>
              <Text style={styles.adminControlSub}>
                {lang === 'hi'
                  ? 'तत्काल सत्यापन स्थिति टॉगल करने के लिए क्लिक करें'
                  : 'Toggle verification status for instant testing'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.adminToggleBtn,
                { backgroundColor: isApproved ? '#FEE2E2' : '#DCFCE7' },
              ]}
              onPress={handleAdminVerifyToggle}
              disabled={adminActionLoading}
            >
              {adminActionLoading ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <Text
                  style={[
                    styles.adminToggleBtnText,
                    { color: isApproved ? '#DC2626' : '#15803D' },
                  ]}
                >
                  {isApproved
                    ? (lang === 'hi' ? 'लंबित करें' : 'Set Pending')
                    : (lang === 'hi' ? 'सत्यापित करें' : 'Approve Now')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* METRICS ROW */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{totalArrivals.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricUnit}>Tons</Text>
            <Text style={styles.metricLabel}>
              {lang === 'hi' ? 'दैनिक बाज़ार आवक' : 'Daily Arrivals'}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#E65100' }]}>{commodities.length}</Text>
            <Text style={styles.metricUnit}>Commodities</Text>
            <Text style={styles.metricLabel}>
              {lang === 'hi' ? 'सूचीबद्ध फसलें' : 'Active Crops'}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#1565C0' }]}>{enquiries.length}</Text>
            <Text style={styles.metricUnit}>Messages</Text>
            <Text style={styles.metricLabel}>
              {lang === 'hi' ? 'व्यापारिक पूछताछ' : 'Enquiries'}
            </Text>
          </View>
        </View>

        {/* QUICK ACTION BUTTON */}
        <TouchableOpacity
          style={[styles.publishActionBtn, !isApproved && styles.publishActionBtnDisabled]}
          onPress={() => {
            if (!isApproved) {
              Alert.alert(
                'Verification Required',
                'Your mandi account must be approved before publishing official rates. Use the Admin Control toggle above to approve for testing.'
              );
            } else {
              navigation.navigate('Prices');
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.publishActionBtnText}>
            {lang === 'hi' ? 'आज के आधिकारिक मंडी भाव प्रकाशित करें' : 'Publish Today APMC Prices'} →
          </Text>
        </TouchableOpacity>

        {/* ACTIVE COMMODITIES OVERVIEW */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {lang === 'hi' ? 'वर्तमान आधिकारिक भाव' : 'Active Market Rates'}
            </Text>
            <Text style={styles.sectionSub}>
              {lang === 'hi' ? 'मंडी यार्ड में चल रहे न्यूनतम, मॉडल और अधिकतम भाव' : 'Current min, modal and max clearance rates'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Prices')}>
            <Text style={styles.seeAllText}>{lang === 'hi' ? 'प्रबंधन करें ›' : 'Manage ›'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E65100" style={{ marginVertical: 30 }} />
        ) : (
          commodities.map((item) => (
            <View key={item.id} style={styles.commCard}>
              <View style={styles.commHeader}>
                <View>
                  <Text style={styles.commName}>{item.commodity}</Text>
                  <Text style={styles.commVariety}>{item.variety}</Text>
                </View>
                <View style={styles.modalRateBadge}>
                  <Text style={styles.modalRateLabel}>MODEL RATE</Text>
                  <Text style={styles.modalRateVal}>₹{item.modalPrice}</Text>
                  <Text style={styles.modalRateUnit}>/ क्विंटल</Text>
                </View>
              </View>

              <View style={styles.ratesRangeRow}>
                <View style={styles.rangeCol}>
                  <Text style={styles.rangeLabel}>{lang === 'hi' ? 'न्यूनतम (Min)' : 'Min Price'}:</Text>
                  <Text style={styles.rangeVal}>₹{item.minPrice}</Text>
                </View>
                <View style={styles.rangeCol}>
                  <Text style={styles.rangeLabel}>{lang === 'hi' ? 'अधिकतम (Max)' : 'Max Price'}:</Text>
                  <Text style={styles.rangeVal}>₹{item.maxPrice}</Text>
                </View>
                <View style={[styles.rangeCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.rangeLabel}>{lang === 'hi' ? 'दैनिक आवक' : 'Daily Arrival'}:</Text>
                  <Text style={[styles.rangeVal, { color: '#E65100' }]}>{item.dailyArrivalTons} Tons</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  roleBadgeRow: {
    marginBottom: 4,
  },
  mandiPill: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mandiPillText: {
    fontSize: 11,
    color: '#E65100',
    fontWeight: 'bold',
  },
  mandiTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 2,
  },
  mandiLocation: {
    fontSize: 12,
    color: '#616161',
    marginTop: 2,
  },
  regNumber: {
    fontSize: 11,
    color: '#757575',
    marginTop: 3,
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
  verificationBanner: {
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1.5,
  },
  verificationPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  verificationApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verificationDesc: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
    marginTop: 3,
  },
  adminControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adminControlHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  adminControlSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  adminToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminToggleBtnText: {
    fontSize: 11,
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
    borderColor: '#EFEBE9',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  metricUnit: {
    fontSize: 10,
    color: '#757575',
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 10,
    color: '#616161',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  publishActionBtn: {
    backgroundColor: '#E65100',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#E65100',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  publishActionBtnDisabled: {
    backgroundColor: '#BDBDBD',
    shadowOpacity: 0,
  },
  publishActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    color: '#212121',
  },
  sectionSub: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: 'bold',
  },
  commCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  commHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  commName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  commVariety: {
    fontSize: 12,
    color: '#757575',
    marginTop: 1,
  },
  modalRateBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalRateLabel: {
    fontSize: 8,
    color: '#E65100',
    fontWeight: 'bold',
  },
  modalRateVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#BF360C',
  },
  modalRateUnit: {
    fontSize: 9,
    color: '#757575',
  },
  ratesRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
  },
  rangeCol: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 10,
    color: '#757575',
  },
  rangeVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 1,
  },
});
