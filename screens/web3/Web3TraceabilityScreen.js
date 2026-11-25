// screens/web3/Web3TraceabilityScreen.js
// KisanSAATHI - Web3 Crop Provenance Ledger, Agri-Wallet & Smart Contract Escrow Hub

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import {
  NETWORK_CONFIG,
  connectAgriWallet,
  getConnectedWallet,
  disconnectAgriWallet,
  getOnChainBatches,
  mintHarvestPassport,
  getEscrowDeals,
  releaseSmartEscrowDeal,
} from '../../services/web3Service';

export default function Web3TraceabilityScreen({ navigation }) {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'hi';

  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('provenance'); // 'provenance' | 'escrow'
  const [batches, setBatches] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mint Passport Modal
  const [mintModalVisible, setMintModalVisible] = useState(false);
  const [mintCrop, setMintCrop] = useState('');
  const [mintOrigin, setMintOrigin] = useState(user?.district ? `${user.district}, ${user.state}` : 'Ludhiana, Punjab');
  const [mintQtyKg, setMintQtyKg] = useState('500');
  const [mintSeal, setMintSeal] = useState('100% Organic & Farm Direct');
  const [minting, setMinting] = useState(false);

  const loadWeb3Data = async () => {
    try {
      const [w, b, e] = await Promise.all([
        getConnectedWallet(),
        getOnChainBatches(),
        getEscrowDeals(),
      ]);
      setWallet(w);
      setBatches(b);
      setEscrows(e);
    } catch (err) {
      console.warn('Web3 load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeb3Data();
  }, []);

  const handleConnectWallet = async () => {
    setConnecting(true);
    try {
      const connected = await connectAgriWallet(user?.uid || user?.email || 'kisan_farmer');
      setWallet(connected);
    } catch (err) {
      Alert.alert('Wallet Error', 'Could not connect Web3 wallet.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    await disconnectAgriWallet();
    setWallet(null);
  };

  const handleMintPassport = async () => {
    if (!mintCrop.trim()) {
      Alert.alert('Required', 'Please enter crop name.');
      return;
    }
    setMinting(true);
    try {
      await mintHarvestPassport({
        cropName: mintCrop.trim(),
        farmerName: user?.fullName || 'Ramesh Kumar',
        farmerWallet: wallet?.address,
        origin: mintOrigin.trim(),
        quantityKg: mintQtyKg,
        qualitySeal: mintSeal.trim(),
      });
      setMintModalVisible(false);
      setMintCrop('');
      await loadWeb3Data();
    } catch (err) {
      Alert.alert('Mint Failed', 'Could not mint on-chain passport.');
    } finally {
      setMinting(false);
    }
  };

  const handleReleaseEscrow = async (dealId) => {
    try {
      await releaseSmartEscrowDeal(dealId);
      await loadWeb3Data();
    } catch (err) {
      Alert.alert('Error', 'Failed to release smart contract escrow.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A237E" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.networkPill}>
            <View style={styles.networkDot} />
            <Text style={styles.networkPillText}>{NETWORK_CONFIG.chainName}</Text>
          </View>
          <Text style={styles.headerTitle}>
            {lang === 'hi' ? 'Web3 कृषि लेजर एवं एस्क्रो' : 'Web3 Agri-Chain & Escrow'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* AGRI-WALLET CONNECTION CARD */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View style={styles.walletIconBox}>
              <MaterialCommunityIcons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.walletTitle}>
                {wallet ? 'Connected Agri-Wallet' : 'Decentralized Agri-Wallet'}
              </Text>
              <Text style={styles.walletSubtitle}>
                {wallet
                  ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)} • ${wallet.balancePol}`
                  : 'Connect MetaMask or Gasless Agri-Wallet for On-Chain Verification'}
              </Text>
            </View>
          </View>

          {wallet ? (
            <View style={styles.walletActionsRow}>
              <View style={styles.providerBadge}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#A5D6A7" style={{ marginRight: 4 }} />
                <Text style={styles.providerBadgeText}>{wallet.providerType}</Text>
              </View>
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnectWallet}>
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectWalletBtn}
              onPress={handleConnectWallet}
              disabled={connecting}
              activeOpacity={0.85}
            >
              {connecting ? (
                <ActivityIndicator color="#1A237E" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="cube-outline" size={18} color="#1A237E" style={{ marginRight: 6 }} />
                  <Text style={styles.connectWalletBtnText}>Connect Web3 Wallet</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* SEGMENTED TABS */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'provenance' && styles.tabBtnActive]}
            onPress={() => setActiveTab('provenance')}
          >
            <MaterialCommunityIcons
              name="certificate-outline"
              size={18}
              color={activeTab === 'provenance' ? '#FFFFFF' : '#3949AB'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'provenance' && styles.tabBtnTextActive]}>
              Crop Passports ({batches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'escrow' && styles.tabBtnActive]}
            onPress={() => setActiveTab('escrow')}
          >
            <MaterialCommunityIcons
              name="file-lock-outline"
              size={18}
              color={activeTab === 'escrow' ? '#FFFFFF' : '#3949AB'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'escrow' && styles.tabBtnTextActive]}>
              Smart Escrow ({escrows.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1A237E" style={{ marginTop: 30 }} />
        ) : activeTab === 'provenance' ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Immutable Harvest Provenance</Text>
              <TouchableOpacity
                style={styles.mintActionBtn}
                onPress={() => setMintModalVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.mintActionText}>Mint Passport</Text>
              </TouchableOpacity>
            </View>

            {batches.map((batch) => (
              <View key={batch.batchId} style={styles.ledgerCard}>
                <View style={styles.ledgerTopRow}>
                  <View style={styles.batchIdBadge}>
                    <Text style={styles.batchIdText}>{batch.batchId}</Text>
                  </View>
                  <View style={styles.verifiedOnChainPill}>
                    <MaterialCommunityIcons name="check-decagram" size={13} color="#1B5E20" style={{ marginRight: 4 }} />
                    <Text style={styles.verifiedOnChainText}>On-Chain Verified</Text>
                  </View>
                </View>

                <Text style={styles.batchCropTitle}>{batch.cropName}</Text>
                <Text style={styles.batchMeta}>
                  Farmer: {batch.farmerName} • Origin: {batch.origin}
                </Text>
                <Text style={styles.batchMeta}>
                  Quantity: {batch.quantityKg} kg • Seal: {batch.qualitySeal}
                </Text>

                <View style={styles.hashBox}>
                  <Text style={styles.hashLabel}>Tx Hash (Block #{batch.blockNumber}):</Text>
                  <Text style={styles.hashValue} numberOfLines={1}>
                    {batch.txHash}
                  </Text>
                </View>

                {/* Traceability Milestones */}
                <View style={styles.milestonesBox}>
                  {(batch.milestones || []).map((m, idx) => (
                    <View key={idx} style={styles.milestoneRow}>
                      <MaterialCommunityIcons name="check-circle" size={14} color="#2E7D32" style={{ marginRight: 6 }} />
                      <Text style={styles.milestoneText}>{m.stage}</Text>
                      <Text style={styles.milestoneDate}>{m.date}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
              B2C Smart Contract Escrow Deals
            </Text>

            {escrows.map((deal) => {
              const isReleased = deal.status === 'RELEASED';
              return (
                <View key={deal.dealId} style={styles.ledgerCard}>
                  <View style={styles.ledgerTopRow}>
                    <Text style={styles.dealIdText}>{deal.dealId}</Text>
                    <View style={[styles.escrowStatusPill, isReleased ? styles.statusReleased : styles.statusFunded]}>
                      <Text style={[styles.escrowStatusText, isReleased ? styles.textReleased : styles.textFunded]}>
                        {isReleased ? 'FUNDS RELEASED' : 'LOCKED IN ESCROW'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.batchCropTitle}>
                    {deal.cropName} ({deal.quantityLabel})
                  </Text>
                  <Text style={styles.dealAmountText}>
                    Escrow Value: ₹{deal.amountInr.toLocaleString('en-IN')} ({deal.amountPol})
                  </Text>
                  <Text style={styles.batchMeta}>
                    Buyer: {deal.buyerName} → Farmer: {deal.farmerName}
                  </Text>

                  <View style={styles.hashBox}>
                    <Text style={styles.hashLabel}>Escrow Contract Tx:</Text>
                    <Text style={styles.hashValue} numberOfLines={1}>
                      {deal.releaseTxHash || deal.txHash}
                    </Text>
                  </View>

                  {!isReleased && (
                    <TouchableOpacity
                      style={styles.releaseBtn}
                      onPress={() => handleReleaseEscrow(deal.dealId)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="lock-open-check-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.releaseBtnText}>Confirm Delivery & Release Escrow</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MINT HARVEST PASSPORT MODAL */}
      <Modal visible={mintModalVisible} animationType="slide" transparent onRequestClose={() => setMintModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mint On-Chain Crop Passport</Text>
              <TouchableOpacity onPress={() => setMintModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Crop & Variety *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Organic Sharbati Wheat"
              value={mintCrop}
              onChangeText={setMintCrop}
            />

            <Text style={styles.inputLabel}>Farm Origin (District, State)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Nashik, Maharashtra"
              value={mintOrigin}
              onChangeText={setMintOrigin}
            />

            <Text style={styles.inputLabel}>Batch Quantity (kg)</Text>
            <TextInput
              style={styles.inputField}
              keyboardType="numeric"
              value={mintQtyKg}
              onChangeText={setMintQtyKg}
            />

            <Text style={styles.inputLabel}>Quality / Organic Certification</Text>
            <TextInput
              style={styles.inputField}
              value={mintSeal}
              onChangeText={setMintSeal}
            />

            <TouchableOpacity style={styles.submitMintBtn} onPress={handleMintPassport} disabled={minting}>
              {minting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitMintBtnText}>Mint On-Chain Record</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4EC',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  networkPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3949AB',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A237E',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 60,
  },
  walletCard: {
    backgroundColor: '#1A237E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1A237E',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  walletSubtitle: {
    fontSize: 11.5,
    color: '#C5CAE9',
    marginTop: 2,
  },
  walletActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerBadgeText: {
    fontSize: 11,
    color: '#A5D6A7',
    fontWeight: '700',
  },
  disconnectBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  disconnectBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  connectWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD54F',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  connectWalletBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A237E',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  tabBtnActive: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3949AB',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#263238',
  },
  mintActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mintActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCE1EC',
  },
  ledgerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  batchIdBadge: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batchIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A237E',
  },
  verifiedOnChainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedOnChainText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B5E20',
  },
  batchCropTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 3,
  },
  batchMeta: {
    fontSize: 11.5,
    color: '#4B5563',
    marginBottom: 2,
  },
  hashBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hashLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  hashValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#3949AB',
    marginTop: 2,
  },
  milestonesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneText: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  milestoneDate: {
    fontSize: 10.5,
    color: '#64748B',
  },
  dealIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A237E',
  },
  escrowStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusFunded: {
    backgroundColor: '#FFF3E0',
  },
  statusReleased: {
    backgroundColor: '#E8F5E9',
  },
  escrowStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textFunded: {
    color: '#E65100',
  },
  textReleased: {
    color: '#1B5E20',
  },
  dealAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 4,
  },
  releaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  releaseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A237E',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37474F',
    marginTop: 8,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  submitMintBtn: {
    backgroundColor: '#1A237E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  submitMintBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
