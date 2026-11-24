import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/mandi/MandiHistoryScreen.js
// KisanSAATHI - APMC Mandi Historical Arrivals & Auction Clearing Records

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';

export default function MandiHistoryScreen() {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const historyData = [
    {
      date: '2026-04-17',
      totalArrivalTons: 2950,
      clearingRate: '98.5%',
      topCommodity: 'Wheat (1,450 T @ ₹2,560)',
      totalTransactions: 342,
    },
    {
      date: '2026-04-16',
      totalArrivalTons: 2780,
      clearingRate: '97.2%',
      topCommodity: 'Wheat (1,380 T @ ₹2,550)',
      totalTransactions: 310,
    },
    {
      date: '2026-04-15',
      totalArrivalTons: 2620,
      clearingRate: '99.0%',
      topCommodity: 'Mustard (890 T @ ₹5,620)',
      totalTransactions: 285,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>
            {lang === 'hi' ? 'मंडी आवक व नीलामी इतिहास' : 'Market Arrival History'}
          </Text>
          <Text style={styles.screenSub}>
            {lang === 'hi'
              ? 'दैनिक यार्ड आवक, नीलामी निपटान प्रतिशत और लेन-देन लॉग'
              : 'Daily yard arrival logs, e-NAM clearance percentage and auction records'}
          </Text>
        </View>

        {historyData.map((day, idx) => (
          <View key={idx} style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="calendar-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.dateText}>{day.date}</Text>
              </View>
              <View style={styles.clearingBadge}>
                <Text style={styles.clearingText}>{day.clearingRate} Cleared</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{lang === 'hi' ? 'कुल आवक' : 'Total Arrivals'}</Text>
                <Text style={styles.statVal}>{day.totalArrivalTons} Tons</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{lang === 'hi' ? 'नीलामी लेन-देन' : 'Transactions'}</Text>
                <Text style={styles.statVal}>{day.totalTransactions} Lots</Text>
              </View>
            </View>

            <View style={styles.topCommRow}>
              <Text style={styles.topCommLabel}>{lang === 'hi' ? 'प्रमुख फसल:' : 'Top Traded:'}</Text>
              <Text style={styles.topCommVal}>{day.topCommodity}</Text>
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
    backgroundColor: '#FAF7F5',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  screenSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  historyCard: {
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
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  clearingBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#757575',
  },
  statVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginTop: 2,
  },
  topCommRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  topCommLabel: {
    fontSize: 11,
    color: '#757575',
    marginRight: 6,
  },
  topCommVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212121',
  },
});
