import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from "react-native";
import { getSavedLocation, getPreferredLanguage, savePreferredLanguage } from "../services/weatherStorage";
import { INDIAN_LANGUAGES, getLanguageDetails } from "../services/translations";
import { useAuth } from "../services/AuthContext";

const { width: windowWidth } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { user, roleProfile, logout } = useAuth();
  const [locationText, setLocationText] = useState('New Delhi');
  const [currentLangCode, setCurrentLangCode] = useState('hi');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentLangDetails = getLanguageDetails(currentLangCode);

  useEffect(() => {
    let isMounted = true;
    async function loadProfileData() {
      try {
        const savedLoc = await getSavedLocation();
        if (savedLoc && isMounted) {
          setLocationText(savedLoc.displayName || savedLoc.primaryName || 'New Delhi');
        }
        const savedLang = await getPreferredLanguage();
        if (savedLang && isMounted) {
          setCurrentLangCode(savedLang);
        }
      } catch (e) {
        console.warn('Profile load error', e);
      }
    }
    loadProfileData();

    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleSelectLanguage = async (code) => {
    setCurrentLangCode(code);
    await savePreferredLanguage(code);
    setLangModalVisible(false);
    setSearchQuery('');
  };

  const filteredLanguages = INDIAN_LANGUAGES.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.nativeName.toLowerCase().includes(q) ||
      (item.region && item.region.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.bannerContainer}>
          <View style={styles.topView} />
          <Image source={require('../assets/user.jpg')} style={styles.userAvatar} />
        </View>

        <View style={styles.bottomView}>
        <Text style={styles.userName}>{user?.fullName || 'Abhishek Singh'}</Text>
        <Text style={styles.userRole}>
          {user?.role === 'farmer' ? 'Farmer / किसान' : user?.role || 'Farmer / किसान'} • {user?.email || 'farmer@kisansaathi.in'}
        </Text>

        {/* PROFILE SETTINGS CARD */}
        <View style={styles.featureView}>
          {/* Location Setting */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#2E7D32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Location / स्थान</Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {roleProfile?.district ? `${roleProfile.district}, ${roleProfile.state}` : locationText}
              </Text>
            </View>
          </View>

          <View style={styles.settingDivider} />

          {/* Farm Details if available */}
          {roleProfile?.farmSize && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingIconBox}>
                  <MaterialCommunityIcons name="sprout-outline" size={20} color="#2E7D32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Farm Size & Crops / खेत व फसलें</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {roleProfile.farmSize} • {Array.isArray(roleProfile.primaryCrops) ? roleProfile.primaryCrops.join(', ') : 'Wheat, Paddy'}
                  </Text>
                </View>
              </View>
              <View style={styles.settingDivider} />
            </>
          )}

          {/* Interactive Language Setting */}
          <TouchableOpacity
            style={styles.settingItemClickable}
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="translate" size={20} color="#2E7D32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Language / भाषा (22 Scheduled Languages)</Text>
              <Text style={styles.settingValueActive}>
                {currentLangDetails.nativeName} ({currentLangDetails.name})
              </Text>
            </View>
            <View style={styles.changeBadge}>
              <Text style={styles.changeBadgeText}>Change / बदलें ›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

                    {/* Internal Administration: KisanSAATHI Data Scraper */}
          <TouchableOpacity
            style={styles.settingItemClickable}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DataScraper')}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="robot-vacuum" size={20} color="#1B5E20" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Data Scraper (Admin) / डेटा स्क्रैपर</Text>
              <Text style={styles.settingValueActive}>
                Wikipedia & OpenAI Extraction Bot
              </Text>
            </View>
            <View style={[styles.changeBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.changeBadgeText, { color: '#1B5E20' }]}>Open ›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          {/* Logout Option */}
          <TouchableOpacity
            style={styles.settingItemClickable}
            activeOpacity={0.7}
            onPress={logout}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#FFEBEE' }]}>
              <MaterialCommunityIcons name="logout" size={20} color="#C62828" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: '#C62828' }]}>Log Out / लॉग आउट</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>

      {/* 22 SCHEDULED LANGUAGES SELECTION MODAL */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLangModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Language / भाषा चुनें</Text>
                <Text style={styles.modalSubtitle}>
                  All 22 Official Scheduled Languages of India + English
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchRow}>
              <MaterialCommunityIcons name="magnify" size={20} color="#888" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search language / भाषा खोजें (e.g. தமிழ், Marathi)..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* Language List */}
            <ScrollView
              style={styles.languageListScroll}
              showsVerticalScrollIndicator={true}
            >
              {filteredLanguages.map((item) => {
                const isSelected = item.code === currentLangCode;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.langListItem,
                      isSelected && styles.langListItemSelected,
                    ]}
                    onPress={() => handleSelectLanguage(item.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langItemLeft}>
                      <Text style={[styles.langNativeName, isSelected && styles.langTextActive]}>
                        {item.nativeName}
                      </Text>
                      <Text style={styles.langEnglishName}>
                        {item.name} • {item.region}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.checkCircleSelected}>
                        <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.checkCircleEmpty} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF7',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 130, // Clear bottom navigation bar completely
  },
  bannerContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  topView: {
    width: '100%',
    height: 130,
    backgroundColor: '#B9F2AF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  userAvatar: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    height: 110,
    width: 110,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  bottomView: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  userRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  featureView: {
    width: '90%',
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingItemClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingEmoji: {
    fontSize: 20,
  },
  settingLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginTop: 2,
  },
  settingValueActive: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 2,
  },
  changeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
  },
  clearSearchText: {
    fontSize: 16,
    color: '#888',
    paddingHorizontal: 4,
  },
  languageListScroll: {
    marginTop: 4,
  },
  langListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  langListItemSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#2E7D32',
  },
  langItemLeft: {
    flex: 1,
  },
  langNativeName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212121',
  },
  langEnglishName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  langTextActive: {
    color: '#1B5E20',
  },
  checkCircleSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  checkCircleEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
});
