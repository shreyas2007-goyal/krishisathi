import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/customer/CustomerHistoryScreen.js
// KisanSAATHI - Customer / Buyer Purchase History & Invoices

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';

export default function CustomerHistoryScreen() {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const historyRecords = [
    {
      id: 'tx_101',
      date: '2026-03-28',
      crop: 'Wheat (HD-2967)',
      farmerName: 'Balwinder Singh',
      district: 'Sangrur, Punjab',
      quantityQuintals: 100,
      ratePerQuintal: 2580,
      totalPaid: 258000,
      receiptNo: 'REC-KS-2026-8812',
      status: 'Delivered & Paid',
    },
    {
      id: 'tx_102',
      date: '2026-02-14',
      crop: 'Mustard (Pusa Bold)',
      farmerName: 'Ramprasad Meena',
      district: 'Alwar, Rajasthan',
      quantityQuintals: 60,
      ratePerQuintal: 5650,
      totalPaid: 339000,
      receiptNo: 'REC-KS-2026-7731',
      status: 'Delivered & Paid',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>
            {lang === 'hi' ? 'खरीद इतिहास व रसीदें' : 'Purchase History'}
          </Text>
          <Text style={styles.screenSub}>
            {lang === 'hi'
              ? 'सफलतापूर्वक पूर्ण हुए सौदे, भुगतान रसीदें और वजन पर्चियां'
              : 'Past procurement records, completed weighment receipts & invoices'}
          </Text>
        </View>

        {historyRecords.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cropName}>{item.crop}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <MaterialCommunityIcons name="calendar-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>{lang === 'hi' ? 'मात्रा' : 'Quantity'}</Text>
                <Text style={styles.detailVal}>{item.quantityQuintals} Quintals</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>{lang === 'hi' ? 'भाव' : 'Rate'}</Text>
                <Text style={styles.detailVal}>₹{item.ratePerQuintal}/Q</Text>
              </View>
              <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.detailLabel}>{lang === 'hi' ? 'कुल भुगतान' : 'Total Paid'}</Text>
                <Text style={[styles.detailVal, { color: '#16A34A', fontWeight: 'bold' }]}>
                  ₹{item.totalPaid.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="receipt-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.receiptText}>{item.receiptNo}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="account" size={14} color="#2E7D32" style={{ marginRight: 4 }} />
                <Text style={styles.farmerText}>{item.farmerName} ({item.district})</Text>
              </View>
            </View>
          </View>
        ))}
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
    marginBottom: 14,
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
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#15803D',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  receiptText: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: '600',
  },
  farmerText: {
    fontSize: 11,
    color: '#64748B',
  },
});
