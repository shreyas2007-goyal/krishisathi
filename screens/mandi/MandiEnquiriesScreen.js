import { MaterialCommunityIcons } from '@expo/vector-icons';
// screens/mandi/MandiEnquiriesScreen.js
// KisanSAATHI - Farmer & Buyer Trade Enquiries for Mandi Owner

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuth } from '../../services/AuthContext';
import { getMandiEnquiries } from '../../services/mandiService';

export default function MandiEnquiriesScreen() {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMandiEnquiries();
        setEnquiries(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>
            {lang === 'hi' ? 'व्यापारिक पूछताछ व अनुरोध' : 'Market Inquiries'}
          </Text>
          <Text style={styles.screenSub}>
            {lang === 'hi'
              ? 'किसानों और थोक खरीदारों द्वारा मंडी नीलामी व आवक संबंधी प्रश्न'
              : 'Direct trade messages from farmers and corporate buyers'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E65100" style={{ marginVertical: 30 }} />
        ) : enquiries.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="email-outline" size={32} color="#CBD5E1" />
            <Text style={{ marginTop: 8, color: '#666' }}>No new inquiries.</Text>
          </View>
        ) : (
          enquiries.map((enq) => {
            const isFarmer = enq.senderType === 'Farmer';
            return (
              <View key={enq.id} style={styles.enqCard}>
                <View style={styles.enqHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons
                      name={isFarmer ? "sprout" : "domain"}
                      size={22}
                      color={isFarmer ? "#2E7D32" : "#1565C0"}
                      style={{ marginRight: 8 }}
                    />
                    <View>
                      <Text style={styles.senderName}>{enq.senderName}</Text>
                      <Text style={styles.senderType}>
                        {isFarmer ? 'Farmer Producer' : 'Corporate Buyer'} • {enq.date}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, enq.status === 'New' ? styles.statusNew : styles.statusResponded]}>
                    <Text style={[styles.statusText, enq.status === 'New' ? styles.statusTextNew : styles.statusTextResponded]}>
                      {enq.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.commodityPill}>Crop: {enq.commodity}</Text>
                  <Text style={styles.quantityPill}>Qty: {enq.quantity}</Text>
                </View>

                <Text style={styles.enqMessage}>{enq.message}</Text>

                <View style={styles.footerRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="phone" size={13} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.phoneText}>{enq.senderPhone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.replyBtn}
                    onPress={() => Linking.openURL(`tel:${enq.senderPhone}`)}
                  >
                    <Text style={styles.replyBtnText}>
                      {lang === 'hi' ? 'कॉल करें' : 'Call Sender'}
                    </Text>
                  </TouchableOpacity>
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
    backgroundColor: '#FAF7F5',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  screenSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  enqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  enqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  senderType: {
    fontSize: 11,
    color: '#757575',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusNew: {
    backgroundColor: '#FFF3E0',
  },
  statusResponded: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextNew: {
    color: '#E65100',
  },
  statusTextResponded: {
    color: '#2E7D32',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  commodityPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    color: '#424242',
    fontWeight: '600',
  },
  quantityPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    color: '#424242',
    fontWeight: '600',
  },
  enqMessage: {
    fontSize: 12,
    color: '#424242',
    lineHeight: 18,
    backgroundColor: '#FAFAFA',
    padding: 8,
    borderRadius: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  phoneText: {
    fontSize: 11,
    color: '#616161',
  },
  replyBtn: {
    backgroundColor: '#E65100',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  replyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
