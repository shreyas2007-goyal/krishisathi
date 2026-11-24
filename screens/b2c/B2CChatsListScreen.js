// screens/b2c/B2CChatsListScreen.js
// KisanSAATHI - Farmer-Customer Direct Messaging Inbox & Negotiation Threads

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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import { getB2CConversations } from '../../services/b2cMarketService';

export default function B2CChatsListScreen({ navigation }) {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = async () => {
    try {
      const data = await getB2CConversations(user?.uid);
      setChats(data);
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {lang === 'hi' ? 'किसान-ग्राहक बातचीत (Direct Chats)' : 'Farmer-Customer Direct Chats'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {lang === 'hi'
              ? '50kg, 1 क्विंटल की खरीद एवं सीधी बात'
              : 'Direct messaging for 50kg & 100kg retail produce'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B5E20']} />}
      >
        {/* DIRECT BENEFIT NOTICE */}
        <View style={styles.benefitNotice}>
          <MaterialCommunityIcons name="handshake" size={20} color="#1B5E20" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.benefitTitle}>
              {lang === 'hi' ? 'सीधा संपर्क • शून्य दलाली' : 'Direct Farm Contact • 0% Commission'}
            </Text>
            <Text style={styles.benefitText}>
              {lang === 'hi'
                ? 'किसान से सीधे चैट पर बातचीत करें, भाव तय करें और सीधे फार्म से पिकअप या डिलीवरी का समय तय करें।'
                : 'Chat directly with farmers to negotiate price, ask for samples, and coordinate delivery.'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={{ marginTop: 8, color: '#666' }}>Loading conversations...</Text>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>No active chats</Text>
            <Text style={styles.emptyDesc}>Browse Kisan Direct produce to chat with local farmers.</Text>
          </View>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatCard}
              onPress={() => navigation.navigate('B2CChatDetail', { conversationId: chat.id })}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.farmerName}>{chat.farmerName}</Text>
                  <Text style={styles.timeText}>
                    {new Date(chat.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* DEAL INFO PILL */}
                <View style={styles.dealBadgeRow}>
                  <View style={styles.cropBadge}>
                    <Text style={styles.cropBadgeText}>{chat.cropName}</Text>
                  </View>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{chat.dealQuantity}</Text>
                  </View>
                  <Text style={styles.dealPriceText}>{chat.dealPrice}</Text>
                </View>

                {/* LAST MESSAGE */}
                <Text style={styles.lastMessageText} numberOfLines={1}>
                  {chat.lastMessage}
                </Text>
              </View>

              <MaterialCommunityIcons name="chevron-right" size={20} color="#B0BEC5" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A331A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  scrollContent: {
    padding: 14,
  },
  benefitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B5E20',
  },
  benefitText: {
    fontSize: 11,
    color: '#2E7D32',
    lineHeight: 15,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#263238',
  },
  timeText: {
    fontSize: 10,
    color: '#90A4AE',
  },
  dealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cropBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  cropBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  qtyBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  qtyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E65100',
  },
  dealPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1B5E20',
  },
  lastMessageText: {
    fontSize: 12,
    color: '#546E7A',
  },
});
