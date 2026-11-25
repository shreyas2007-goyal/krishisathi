// screens/b2c/B2CChatDetailScreen.js
// KisanSAATHI - 1-on-1 Direct Negotiation Chat between Customer and Farmer

import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import {
  getB2CConversations,
  sendB2CMessage,
  generateFarmerReplyText,
} from '../../services/b2cMarketService';
import { createSmartEscrowDeal } from '../../services/web3Service';

const { width: windowWidth } = Dimensions.get('window');

const QUICK_CHIPS = [
  '50 kg available hai kya?',
  'Farm pickup kar sakte hain?',
  'Bhav thoda kam ho sakta hai?',
  '1 Quintal (100 kg) ka final rate?',
  'Sample photo bhejenge?',
];

export default function B2CChatDetailScreen({ route, navigation }) {
  const { conversationId } = route.params || {};
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFarmerTyping, setIsFarmerTyping] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmedDeal, setConfirmedDeal] = useState(false);

  const scrollViewRef = useRef(null);

  const loadConversation = async () => {
    try {
      const allChats = await getB2CConversations();
      const current = allChats.find((c) => c.id === conversationId) || allChats[0];
      if (current) {
        setChat(current);
        setMessages(current.messages || []);
      }
    } catch (e) {
      console.warn('Error loading chat:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isFarmerTyping]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || !chat) return;

    setInputText('');

    // Send customer message
    try {
      const res = await sendB2CMessage(
        chat.id,
        text,
        'buyer',
        user?.fullName || 'Customer'
      );
      if (res?.updatedChat) {
        setChat(res.updatedChat);
        setMessages(res.updatedChat.messages);
      }

      // Simulate realistic farmer response after 800ms
      setIsFarmerTyping(true);
      setTimeout(async () => {
        const replyText = generateFarmerReplyText(text, chat.cropName, chat.farmerName);
        const replyRes = await sendB2CMessage(
          chat.id,
          replyText,
          'farmer',
          chat.farmerName
        );
        setIsFarmerTyping(false);
        if (replyRes?.updatedChat) {
          setChat(replyRes.updatedChat);
          setMessages(replyRes.updatedChat.messages);
        }
      }, 900);
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert('Error', 'Unable to send message.');
    }
  };

  const handleCallFarmer = () => {
    if (!chat?.farmerPhone) return;
    const phoneUrl = `tel:${chat.farmerPhone.replace(/\s+/g, '')}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert('Contact Farmer', `Farmer phone: ${chat.farmerPhone}`);
    });
  };

  const handleConfirmDeal = async () => {
    setConfirmedDeal(true);
    setConfirmModalVisible(false);
    try {
      const escrow = await createSmartEscrowDeal({
        cropName: chat.cropName,
        quantityLabel: chat.dealQuantity,
        amountInr: chat.dealPrice,
        farmerName: chat.farmerName,
        buyerName: user?.fullName || chat.buyerName,
      });
      handleSendMessage(
        `[SMART ESCROW LOCKED - ${escrow.dealId}]: मैंने ${chat.dealQuantity} (${chat.dealPrice}) का ऑर्डर कन्फर्म कर दिया है और राशि Web3 Smart Escrow (Tx: ${escrow.txHash.slice(0, 12)}...) में सुरक्षित कर दी है।`
      );
    } catch {
      handleSendMessage(`[DEAL CONFIRMED]: मैंने ${chat.dealQuantity} (${chat.dealPrice}) का ऑर्डर कन्फर्म कर दिया है। कृपया डिलीवरी / पिकअप समय बताएं।`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={{ marginTop: 8, color: '#666', fontSize: 13 }}>Connecting to Farmer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <Text style={{ color: '#666' }}>Conversation not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
            <Text style={{ color: '#1B5E20', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B5E20" />
        </TouchableOpacity>

        <View style={styles.farmerInfo}>
          <View style={styles.farmerTitleRow}>
            <Text style={styles.farmerNameText} numberOfLines={1}>
              {chat.farmerName}
            </Text>
            <View style={styles.farmerRoleBadge}>
              <Text style={styles.farmerRoleText}>Farmer</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.farmerLocationText} numberOfLines={1}>
              {chat.farmerVillage} • Online
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.callButton} onPress={handleCallFarmer} activeOpacity={0.8}>
          <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* STICKY DEAL CONTEXT BAR */}
      <View style={styles.dealBar}>
        <View style={styles.dealBarIcon}>
          <MaterialCommunityIcons name="sprout" size={20} color="#1B5E20" />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.dealCropName}>{chat.cropName}</Text>
            <View style={styles.dealQtyPill}>
              <Text style={styles.dealQtyText}>{chat.dealQuantity}</Text>
            </View>
          </View>
          <Text style={styles.dealPriceText}>
            Quoted: <Text style={{ fontWeight: '800', color: '#1B5E20' }}>{chat.dealPrice}</Text> • Farm Direct
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptDealButton, confirmedDeal && styles.dealAcceptedButton]}
          onPress={() => setConfirmModalVisible(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={confirmedDeal ? 'check-circle' : 'handshake'}
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.acceptDealButtonText}>
            {confirmedDeal ? 'Agreed' : 'Confirm'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CHAT MESSAGES SCROLL */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.safetyNoticeBox}>
          <MaterialCommunityIcons name="shield-check" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
          <Text style={styles.safetyNoticeText}>
            Direct farmer chat protected by KisanSAATHI. Inspect produce at pickup or delivery before final payment.
          </Text>
        </View>

        {messages.map((msg, index) => {
          const isMe = msg.sender === 'buyer';
          return (
            <View
              key={msg.id || index}
              style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
            >
              {!isMe && (
                <View style={styles.farmerAvatar}>
                  <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />
                </View>
              )}
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                {!isMe && <Text style={styles.senderHeader}>{msg.senderName || chat.farmerName}</Text>}
                <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                  {msg.text}
                </Text>
                <Text style={[styles.timestampText, isMe ? styles.timestampMe : styles.timestampOther]}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        })}

        {isFarmerTyping && (
          <View style={[styles.messageRow, styles.messageRowOther]}>
            <View style={styles.farmerAvatar}>
              <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.bubble, styles.bubbleOther, { paddingVertical: 8 }]}>
              <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                {chat.farmerName} is typing...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* QUICK NEGOTIATION CHIPS */}
      <View style={styles.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {QUICK_CHIPS.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chipButton}
              onPress={() => handleSendMessage(chip)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipButtonText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* INPUT BAR */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder={lang === 'hi' ? 'किसान को संदेश लिखें (जैसे 50 kg चाहिए)...' : 'Type message to farmer...'}
          placeholderTextColor="#888"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim()}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* MODAL: CONFIRM ORDER / DEAL */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalCard}>
            <MaterialCommunityIcons name="handshake" size={44} color="#1B5E20" style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={styles.confirmModalTitle}>Confirm Produce Deal</Text>
            <Text style={styles.confirmModalSub}>
              Direct purchase agreement with {chat.farmerName}
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Produce:</Text>
                <Text style={styles.summaryVal}>{chat.cropName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Package / Quantity:</Text>
                <Text style={styles.summaryVal}>{chat.dealQuantity}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Agreed Amount:</Text>
                <Text style={[styles.summaryVal, { color: '#1B5E20', fontWeight: '800' }]}>{chat.dealPrice}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Farm Location:</Text>
                <Text style={styles.summaryVal}>{chat.farmerVillage}</Text>
              </View>
            </View>

            <Text style={styles.modalHelpNotice}>
              Payment is to be made directly to the farmer upon visual inspection or delivery. No commission is deducted.
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={handleConfirmDeal}
              >
                <Text style={styles.confirmModalText}>Confirm & Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EFEBE9',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A331A',
    marginRight: 6,
  },
  farmerRoleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  farmerRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  farmerLocationText: {
    fontSize: 11,
    color: '#616161',
  },
  callButton: {
    backgroundColor: '#1B5E20',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D7CCC8',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  dealBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dealCropName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#263238',
    marginRight: 6,
  },
  dealQtyPill: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E65100',
  },
  dealPriceText: {
    fontSize: 11,
    color: '#546E7A',
    marginTop: 2,
  },
  acceptDealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dealAcceptedButton: {
    backgroundColor: '#2E7D32',
  },
  acceptDealButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  safetyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  safetyNoticeText: {
    flex: 1,
    fontSize: 10,
    color: '#2E7D32',
    lineHeight: 14,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  farmerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#455A64',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
  },
  senderHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextMe: {
    color: '#1A237E',
  },
  messageTextOther: {
    color: '#263238',
  },
  timestampText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timestampMe: {
    color: '#558B2F',
  },
  timestampOther: {
    color: '#90A4AE',
  },
  chipsWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  chipsScroll: {
    paddingHorizontal: 10,
  },
  chipButton: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#C5E1A5',
  },
  chipButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#33691E',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
    maxHeight: 80,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B5E20',
    textAlign: 'center',
  },
  confirmModalSub: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 14,
  },
  summaryBox: {
    backgroundColor: '#F9FBF9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#263238',
  },
  modalHelpNotice: {
    fontSize: 11,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 13,
    color: '#607D8B',
    fontWeight: '700',
  },
  confirmModalBtn: {
    flex: 1.5,
    backgroundColor: '#1B5E20',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmModalText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
