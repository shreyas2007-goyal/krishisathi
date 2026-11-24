// screens/HomeScreen.js
// KisanSAATHI - Unified Home Screen with Integrated Weather & Crop Advisory

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  requestBrowserLocation,
  reverseGeocode,
  searchLocationNominatim,
  SUGGESTED_LOCATIONS,
} from '../services/locationService';
import { fetchWeatherData } from '../services/weatherService';
import {
  generateFarmingRecommendations,
  calculateSprayingAdvisory,
  calculateIrrigationAdvisory,
  evaluateWeatherRiskAlerts,
  CROP_PROFILES,
  SOIL_PROFILES,
} from '../services/agriIntelligence';
import { getTranslation } from '../services/translations';
import {
  saveSavedLocation,
  getSavedLocation,
  saveWeatherCache,
  getWeatherCache,
  savePreferredLanguage,
  getPreferredLanguage,
} from '../services/weatherStorage';
import { useAuth } from '../services/AuthContext';

const { width: windowWidth } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  // Multilingual state
  const [lang, setLang] = useState('hi');
  const t = getTranslation(lang);

  // User Greeting
  const [greeting, setGreeting] = useState('Good Evening');

  // Weather & Location state
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Manual location search modal
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Agricultural filters
  const [selectedCrop, setSelectedCrop] = useState('general');
  const [selectedSoil, setSelectedSoil] = useState('loam');

  const refreshTimerRef = useRef(null);

  /**
   * Load weather for coordinates
   */
  const loadWeatherForCoords = useCallback(
    async (lat, lon, locationInfo = null, isPullRefresh = false) => {
      try {
        if (!isPullRefresh) setLoading(true);
        setErrorMessage(null);

        const weatherData = await fetchWeatherData(lat, lon);
        setWeather(weatherData);

        let resolvedLoc = locationInfo;
        if (!resolvedLoc || !resolvedLoc.displayName) {
          resolvedLoc = await reverseGeocode(lat, lon);
        }

        setLocation(resolvedLoc);
        await saveSavedLocation(resolvedLoc);
        await saveWeatherCache(weatherData);
      } catch (err) {
        console.error('Error fetching weather on HomeScreen:', err);
        setErrorMessage(
          lang === 'hi'
            ? 'मौसम की जानकारी प्राप्त करने में असमर्थ। इंटरनेट कनेक्शन जांचें।'
            : 'Unable to retrieve weather data. Please check your internet connection.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [lang]
  );

  /**
   * Browser GPS Detection Flow
   */
  const handleDetectLocation = async () => {
    try {
      setLocating(true);
      setErrorMessage(null);
      setPermissionDenied(false);

      const coords = await requestBrowserLocation();
      const revGeocoded = await reverseGeocode(coords.latitude, coords.longitude);
      await loadWeatherForCoords(coords.latitude, coords.longitude, revGeocoded);
    } catch (err) {
      console.warn('Location detection failed:', err);
      if (err.code === 'PERMISSION_DENIED') {
        setPermissionDenied(true);
        setErrorMessage(t.locationPermissionDenied);
      } else if (err.code === 'TIMEOUT') {
        setErrorMessage(t.locationTimeout);
      } else {
        setErrorMessage(t.locationUnavailable);
      }
      setLoading(false);
    } finally {
      setLocating(false);
    }
  };

  /**
   * Initialization
   */
  useEffect(() => {
    let isMounted = true;

    // Determine greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    async function initialize() {
      const savedLang = await getPreferredLanguage();
      if (isMounted) setLang(savedLang);

      const savedLoc = await getSavedLocation();
      const cached = await getWeatherCache();

      if (savedLoc && cached?.weather && !cached?.isExpired) {
        if (isMounted) {
          setLocation(savedLoc);
          setWeather(cached.weather);
          setLoading(false);
        }
      } else if (savedLoc) {
        if (isMounted) setLocation(savedLoc);
        await loadWeatherForCoords(savedLoc.latitude, savedLoc.longitude, savedLoc);
      } else {
        // Fallback or trigger detect
        handleDetectLocation();
      }
    }

    initialize();

    // 12-minute auto-refresh interval
    refreshTimerRef.current = setInterval(() => {
      if (location && location.latitude) {
        loadWeatherForCoords(location.latitude, location.longitude, location, true);
      }
    }, 12 * 60 * 1000);

    // Listen to focus to refresh when user returns from Profile with a new language
    const unsubscribe = navigation.addListener('focus', async () => {
      const savedLang = await getPreferredLanguage();
      if (savedLang && isMounted) setLang(savedLang);
    });

    return () => {
      isMounted = false;
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      unsubscribe();
    };
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (location && location.latitude) {
      loadWeatherForCoords(location.latitude, location.longitude, location, true);
    } else {
      handleDetectLocation();
    }
  }, [location, loadWeatherForCoords]);

  const handleLanguageChange = async (newLang) => {
    setLang(newLang);
    await savePreferredLanguage(newLang);
  };

  const handleSearchExecute = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await searchLocationNominatim(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.warn('Search failed', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = async (item) => {
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    setPermissionDenied(false);

    const locObj = {
      village: item.name,
      town: item.name,
      district: item.district || item.name,
      state: item.state || '',
      country: 'India',
      displayName: item.displayName || item.name,
      primaryName: item.name,
      secondaryText: item.district && item.state ? `${item.district}, ${item.state}` : item.state || '',
      latitude: item.latitude,
      longitude: item.longitude,
    };

    setLocation(locObj);
    await loadWeatherForCoords(item.latitude, item.longitude, locObj);
  };

  // Agricultural intelligence derived data
  const farmingRecs = weather ? generateFarmingRecommendations(weather, lang) : [];
  const sprayingAdvisory = weather ? calculateSprayingAdvisory(weather, lang) : null;
  const irrigationAdvisory = weather
    ? calculateIrrigationAdvisory(weather, selectedCrop, selectedSoil, lang)
    : null;
  const weatherAlerts = weather ? evaluateWeatherRiskAlerts(weather, lang) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
      >
        {/* TOP BRANDING & PROFILE HEADER */}
        <View style={styles.topProfileBar}>
          <View style={styles.topLeftView}>
            <Image
              source={require('../assets/kisansaathi_logo.png')}
              style={styles.brandLogoHeader}
              resizeMode="contain"
            />
            <View style={styles.userView}>
              <Text style={styles.brandTitleText}>KisanSAATHI</Text>
              <Text style={styles.greetingText}>{user?.fullName || 'Farmer'} • {greeting}</Text>
            </View>
          </View>
          <View style={styles.topRightView}>
            <Image source={require('../assets/notification.png')} style={styles.notificationIcon} />
          </View>
        </View>

        {/* QUICK ACTION FEATURE CARDS (Krishi Sahayak & Mandi Rates) */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="chat-question-outline" size={24} color="#1B5E20" />
            <Text style={styles.featureTitle}>
              {lang === 'hi' ? 'कृषि सहायक' : 'Krishi Sahayak'}
            </Text>
            <Text style={styles.featureSub}>
              {lang === 'hi' ? 'सलाह एवं समाधान' : 'Farming Advisory'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.marketShortcutButton}
            onPress={() => navigation.navigate('Market')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="store-outline" size={24} color="#1565C0" />
            <Text style={styles.featureTitle}>
              {lang === 'hi' ? 'मंडी भाव' : 'Live Mandi'}
            </Text>
            <Text style={styles.featureSub}>
              {lang === 'hi' ? 'ताजा बाजार दरें' : 'APMC Market Rates'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* B2C DIRECT SELL CALLOUT (FARMER-TO-CONSUMER) */}
        <TouchableOpacity
          style={styles.b2cFarmerCard}
          onPress={() => navigation.navigate('B2CMarketplace')}
          activeOpacity={0.88}
        >
          <View style={styles.b2cFarmerCardContent}>
            <View style={styles.b2cFarmerTopRow}>
              <View style={styles.b2cFarmerIconCircle}>
                <MaterialCommunityIcons name="handshake" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.b2cFarmerBadge}>KISAN DIRECT • B2C बाज़ार</Text>
                  <View style={styles.b2cFarmerQtyPill}>
                    <Text style={styles.b2cFarmerQtyPillText}>50kg / 100kg</Text>
                  </View>
                </View>
                <Text style={styles.b2cFarmerTitle}>
                  {lang === 'hi' ? 'सीधे ग्राहकों को बेचें — 25-40% अधिक मुनाफा' : 'Sell in 50kg & 100kg Lots directly to Retail Buyers'}
                </Text>
              </View>
            </View>
            <Text style={styles.b2cFarmerDesc}>
              {lang === 'hi'
                ? 'मंडी कटौती से बचें। अपनी 50 kg या 1 क्विंटल की बोरियां लिस्ट करें और स्थानीय परिवारों/दुकानों से सीधी चैट करें।'
                : 'Cut out middlemen. List your harvest in retail bags and negotiate directly with retail buyers over chat.'}
            </Text>
            <View style={styles.b2cFarmerBottomRow}>
              <Text style={styles.b2cFarmerActionText}>
                {lang === 'hi' ? 'फसल लिस्ट करें या खरीदार चैट देखें ›' : 'List Harvest & View Buyer Chats ›'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* SECTION HEADER: WEATHER & CROP ADVISORY */}
        <View style={styles.sectionHeaderBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleMainTitle}>{t.weatherAndCropAdvisory}</Text>
            <Text style={styles.moduleSubTitle}>{t.subtitle}</Text>
          </View>
        </View>

        {/* LOCATION DETECTION & CONTROL CARD */}
        <View style={styles.locationBarCard}>
          <View style={styles.locationInfoRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#2E7D32" />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationPrimaryText}>
                {location ? location.primaryName || location.village || location.town || location.district : t.detectingLocation}
              </Text>
              <Text style={styles.locationSecondaryText}>
                {location ? location.secondaryText || location.state || 'India' : 'Detect GPS or search village/district'}
              </Text>
            </View>
          </View>

          <View style={styles.locationActionButtons}>
            <TouchableOpacity
              style={styles.detectBtn}
              onPress={handleDetectLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#1B5E20" />
              ) : (
                <Text style={styles.detectBtnText}>{t.detectMyLocation}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.searchManualBtn}
              onPress={() => setSearchModalVisible(true)}
            >
              <Text style={styles.searchManualBtnText}>{t.manualLocation}</Text>
            </TouchableOpacity>
          </View>

          {/* Permission Denied Notice */}
          {permissionDenied && (
            <View style={styles.deniedNoticeBox}>
              <Text style={styles.deniedNoticeTitle}>{t.locationPermissionTitle}</Text>
              <Text style={styles.deniedNoticeMsg}>{t.locationPermissionDenied}</Text>
              <TouchableOpacity
                style={styles.deniedSearchAction}
                onPress={() => setSearchModalVisible(true)}
              >
                <Text style={styles.deniedSearchActionText}>{t.searchVillageOrDistrict}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* General Error Notice */}
          {errorMessage && !permissionDenied && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Loading Spinner */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>{t.refreshing}</Text>
          </View>
        )}

        {/* WEATHER & CROP ADVISORY DASHBOARD (12 CARDS) */}
        {!loading && weather && (
          <>
            {/* CARD 12: WEATHER RISK ALERTS (Top priority banner) */}
            <View style={styles.sectionContainer}>
              {weatherAlerts.length > 0 ? (
                weatherAlerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertCard,
                      { borderLeftColor: alert.severityColor, backgroundColor: '#FFF5F5' },
                    ]}
                  >
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon}>{alert.icon}</Text>
                      <Text style={[styles.alertTitle, { color: alert.severityColor }]}>
                        {alert.title}
                      </Text>
                    </View>
                    <Text style={styles.alertDescription}>{alert.description}</Text>
                    <Text style={styles.alertAttributionText}>{t.alertAttribution}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noAlertCard}>
                  <MaterialCommunityIcons name="shield-check-outline" size={24} color="#2E7D32" />
                  <Text style={styles.noAlertText}>{t.noActiveAlerts}</Text>
                </View>
              )}
            </View>

            {/* CARD 1 & 2: CURRENT WEATHER & TEMPERATURE HERO CARD */}
            <View style={styles.heroWeatherCard}>
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroConditionLabel}>
                    {t[weather.current.condition?.translationKey] || weather.current.condition?.label || 'Clear Sky'}
                  </Text>
                  <Text style={styles.heroLocation}>
                    {location ? location.primaryName : 'My Farm'}
                  </Text>
                </View>
                <MaterialCommunityIcons name={weather.current.condition?.icon || "weather-sunny"} size={52} color="#FFFFFF" />
              </View>

              <View style={styles.heroTempRow}>
                <Text style={styles.heroTemperature}>{weather.current.temp}°C</Text>
                <View style={styles.heroTempSubBox}>
                  <Text style={styles.heroFeelsLike}>
                    {t.feelsLike}: {weather.current.feelsLike}°C
                  </Text>
                  <Text style={styles.heroRainProb}>
                    {t.rainProbability}: {weather.current.rainProb}%
                  </Text>
                </View>
              </View>

              {/* Quick Status Bar */}
              <View style={styles.quickMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t.humidity}</Text>
                  <Text style={styles.metricValue}>{weather.current.humidity}%</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t.windSpeed}</Text>
                  <Text style={styles.metricValue}>
                    {weather.current.windSpeed} km/h {weather.current.windDirectionText}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t.uvIndex}</Text>
                  <Text style={styles.metricValue}>{weather.current.uvIndex}</Text>
                </View>
              </View>
            </View>

            {/* CARDS 3, 4, 5, 6, 7, 8: DETAILED METRICS GRID */}
            <View style={styles.gridContainer}>
              {/* Card 3: Feels Like */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="thermometer" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.feelsLike}</Text>
                <Text style={styles.gridCardValue}>{weather.current.feelsLike}°C</Text>
                <Text style={styles.gridCardSub}>
                  {weather.current.feelsLike > weather.current.temp ? 'Humid heat' : 'Comfortable'}
                </Text>
              </View>

              {/* Card 4: Relative Humidity */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="water-percent" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.humidity}</Text>
                <Text style={styles.gridCardValue}>{weather.current.humidity}%</Text>
                <Text style={styles.gridCardSub}>
                  {weather.current.humidity > 70 ? 'High (Fungus Risk)' : 'Balanced'}
                </Text>
              </View>

              {/* Card 5: Wind Speed & Direction */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="weather-windy" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.windSpeed}</Text>
                <Text style={styles.gridCardValue}>{weather.current.windSpeed} km/h</Text>
                <Text style={styles.gridCardSub}>
                  {t.windDirection}: {weather.current.windDirectionText} ({weather.current.windDirection}°)
                </Text>
              </View>

              {/* Card 6: Rain Probability & Precipitation */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="weather-rainy" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.rainProbability}</Text>
                <Text style={styles.gridCardValue}>{weather.current.rainProb}%</Text>
                <Text style={styles.gridCardSub}>
                  {t.rainfall}: {weather.current.precipitation} mm
                </Text>
              </View>

              {/* Card 7: UV Index */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="weather-sunny-alert" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.uvIndex}</Text>
                <Text style={styles.gridCardValue}>{weather.current.uvIndex}</Text>
                <Text style={styles.gridCardSub}>
                  {weather.current.uvIndex > 6 ? t.uvHigh : weather.current.uvIndex > 3 ? t.uvModerate : t.uvLow}
                </Text>
              </View>

              {/* Card 8: Sunrise & Sunset */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="weather-sunset-up" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.sunriseAndSunset}</Text>
                <Text style={styles.gridCardValue}>{weather.current.sunrise}</Text>
                <Text style={styles.gridCardSub}>{t.sunset}: {weather.current.sunset}</Text>
              </View>
            </View>

            {/* CARD 9: 24-HOUR HOURLY FORECAST */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t.hourlyForecast}</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyScrollContent}
              >
                {weather.hourly.map((hour, idx) => (
                  <View key={idx} style={styles.hourlyItemCard}>
                    <Text style={styles.hourlyTimeText}>{hour.displayTime}</Text>
                    <MaterialCommunityIcons name={hour.condition?.icon || "weather-sunny"} size={22} color="#2E7D32" />
                    <Text style={styles.hourlyTempText}>{hour.temp}°C</Text>
                    <View style={styles.hourlyRainBadge}>
                      <Text style={styles.hourlyRainText}>{hour.rainProb}%</Text>
                    </View>
                    <Text style={styles.hourlyWindText}>{hour.windSpeed} km/h</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* CARD 11: AGRICULTURAL RECOMMENDATIONS & INTELLIGENCE */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t.agriRecommendations}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{t.agriRecommendationsSubtitle}</Text>

              {/* Crop & Soil selector pills */}
              <View style={styles.filterPillContainer}>
                <Text style={styles.filterLabel}>{t.selectCrop}:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {CROP_PROFILES.map((crop) => (
                    <TouchableOpacity
                      key={crop.id}
                      style={[styles.filterChip, selectedCrop === crop.id && styles.filterChipActive]}
                      onPress={() => setSelectedCrop(crop.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedCrop === crop.id && styles.filterChipTextActive,
                        ]}
                      >
                        {lang === 'hi' ? crop.nameHi : crop.nameEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.filterLabel}>{t.selectSoil}:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {SOIL_PROFILES.map((soil) => (
                    <TouchableOpacity
                      key={soil.id}
                      style={[styles.filterChip, selectedSoil === soil.id && styles.filterChipActive]}
                      onPress={() => setSelectedSoil(soil.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedSoil === soil.id && styles.filterChipTextActive,
                        ]}
                      >
                        {lang === 'hi' ? soil.nameHi : soil.nameEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Sub-Card A: Practical Farming Recommendations */}
              {farmingRecs.map((rec) => (
                <View
                  key={rec.id}
                  style={[
                    styles.recommendationCard,
                    rec.type === 'critical'
                      ? styles.recCritical
                      : rec.type === 'warning'
                      ? styles.recWarning
                      : styles.recInfo,
                  ]}
                >
                  <View style={styles.recHeaderRow}>
                    <Text style={styles.recIcon}>{rec.icon}</Text>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                  </View>
                  <Text style={styles.recDesc}>{rec.description}</Text>
                </View>
              ))}

              {/* Sub-Card C: Irrigation Advisory */}
              {irrigationAdvisory && (
                <View style={styles.advisorySubCard}>
                  <View style={styles.advisoryHeaderRow}>
                    <Text style={styles.advisoryIcon}>{irrigationAdvisory.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.advisoryMainTitle}>{t.irrigationAdvisory}</Text>
                      <Text style={[styles.advisoryBadgeText, { color: irrigationAdvisory.badgeColor }]}>
                        {irrigationAdvisory.title}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.advisoryExplanation}>{irrigationAdvisory.explanation}</Text>
                  <Text style={styles.advisoryDisclaimerText}>{irrigationAdvisory.disclaimer}</Text>
                </View>
              )}

              {/* Sub-Card D: Spraying Suitability Advisory */}
              {sprayingAdvisory && (
                <View style={styles.advisorySubCard}>
                  <View style={styles.advisoryHeaderRow}>
                    <MaterialCommunityIcons name="tractor" size={26} color="#2E7D32" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.advisoryMainTitle}>{t.sprayingAdvisory}</Text>
                      <Text
                        style={[
                          styles.advisoryBadgeText,
                          {
                            color:
                              sprayingAdvisory.status === 'suitable'
                                ? '#2E7D32'
                                : sprayingAdvisory.status === 'caution'
                                ? '#E65100'
                                : '#C62828',
                          },
                        ]}
                      >
                        {sprayingAdvisory.label}
                      </Text>
                    </View>
                  </View>

                  {/* Spraying Check Indicators */}
                  <View style={styles.checklistRow}>
                    <View style={styles.checkItem}>
                      <MaterialCommunityIcons name={sprayingAdvisory.windOk ? "check-circle" : "close-circle"} size={16} color={sprayingAdvisory.windOk ? "#2E7D32" : "#C62828"} />
                      <Text style={styles.checkText}>{t.windSpeed} (&lt;15 km/h)</Text>
                    </View>
                    <View style={styles.checkItem}>
                      <MaterialCommunityIcons name={sprayingAdvisory.rainOk ? "check-circle" : "close-circle"} size={16} color={sprayingAdvisory.rainOk ? "#2E7D32" : "#C62828"} />
                      <Text style={styles.checkText}>{t.rainProbability} (&lt;30%)</Text>
                    </View>
                    <View style={styles.checkItem}>
                      <MaterialCommunityIcons name={sprayingAdvisory.tempOk ? "check-circle" : "close-circle"} size={16} color={sprayingAdvisory.tempOk ? "#2E7D32" : "#C62828"} />
                      <Text style={styles.checkText}>{t.temperature} (15-33°C)</Text>
                    </View>
                  </View>

                  {sprayingAdvisory.reasons.length > 0 && (
                    <View style={styles.reasonsList}>
                      {sprayingAdvisory.reasons.map((r, i) => (
                        <Text key={i} style={styles.reasonBullet}>
                          • {r}
                        </Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.bestWindowBox}>
                    <Text style={styles.bestWindowText}>{sprayingAdvisory.bestWindow}</Text>
                  </View>

                  <Text style={styles.advisoryDisclaimerText}>{sprayingAdvisory.disclaimer}</Text>
                </View>
              )}
            </View>

            {/* CARD 10: SEVEN-DAY FARM OUTLOOK */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t.sevenDayForecast}</Text>
              </View>

              {weather.daily.map((day, idx) => (
                <View key={idx} style={styles.dailyRowCard}>
                  <View style={styles.dailyDayCol}>
                    <Text style={styles.dailyDayName}>
                      {idx === 0 ? t.today : idx === 1 ? t.tomorrow : day.dayName}
                    </Text>
                    <Text style={styles.dailyDateText}>{day.date.slice(5)}</Text>
                  </View>

                  <View style={styles.dailyConditionCol}>
                    <MaterialCommunityIcons name={day.condition?.icon || "weather-sunny"} size={22} color="#2E7D32" />
                    <Text style={styles.dailyConditionText}>
                      {t[day.condition?.translationKey] || day.condition?.label || ''}
                    </Text>
                  </View>

                  <View style={styles.dailyRainCol}>
                    <Text style={styles.dailyRainProb}>{day.precipProbMax}%</Text>
                    {day.precipSum > 0 && (
                      <Text style={styles.dailyPrecipSum}>{day.precipSum} mm</Text>
                    )}
                  </View>

                  <View style={styles.dailyTempCol}>
                    <Text style={styles.dailyMaxTemp}>{day.maxTemp}°</Text>
                    <Text style={styles.dailyMinTemp}> / {day.minTemp}°</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer info & attribution */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>KisanSAATHI – {lang === 'hi' ? 'कृषि एवं मंडी सेवा' : 'Agriculture & Mandi Support'}</Text>
          <Text style={styles.footerSubText}>
            Live Weather powered by Open-Meteo • Geocoding by OpenStreetMap Nominatim
          </Text>
        </View>
      </ScrollView>

      {/* MANUAL LOCATION SEARCH MODAL */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.searchVillageOrDistrict}</Text>
              <TouchableOpacity
                onPress={() => setSearchModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t.searchVillageOrDistrict}
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchExecute}
                returnKeyType="search"
                autoFocus={true}
              />
              <TouchableOpacity style={styles.modalSearchBtn} onPress={handleSearchExecute}>
                <Text style={styles.modalSearchBtnText}>{t.search}</Text>
              </TouchableOpacity>
            </View>

            {searchLoading && (
              <View style={{ marginVertical: 20 }}>
                <ActivityIndicator size="small" color="#2E7D32" />
              </View>
            )}

            {/* Results or Suggested Locations */}
            <ScrollView style={styles.modalResultsList}>
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalResultItem}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#2E7D32" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultItemName}>{item.name}</Text>
                      <Text style={styles.resultItemDetail}>{item.displayName}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <>
                  <Text style={styles.modalSuggestedTitle}>{t.recentLocations}:</Text>
                  {SUGGESTED_LOCATIONS.map((loc, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.modalResultItem}
                      onPress={() =>
                        handleSelectSearchResult({
                          id: String(idx),
                          name: loc.name,
                          district: loc.district,
                          state: loc.state,
                          displayName: `${loc.name}, ${loc.district}, ${loc.state}`,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        })
                      }
                    >
                      <MaterialCommunityIcons name="map-marker-outline" size={18} color="#2E7D32" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultItemName}>{loc.name}</Text>
                        <Text style={styles.resultItemDetail}>
                          {loc.district}, {loc.state}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F4',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // TOP PROFILE BAR
  topProfileBar: {
    flexDirection: 'row',
    width: '90%',
    alignSelf: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeftView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoHeader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  userView: {
    flexDirection: 'column',
    marginLeft: 10,
  },
  brandTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  greetingText: {
    marginTop: 2,
    fontSize: 13,
    color: '#555555',
  },
  topRightView: {
    backgroundColor: '#E4E4E4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
  },
  notificationIcon: {
    width: 24,
    height: 24,
  },

  // QUICK ACTIONS ROW
  b2cFarmerCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#1B5E20',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  b2cFarmerCardContent: {},
  b2cFarmerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  b2cFarmerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  b2cFarmerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A5D6A7',
    letterSpacing: 0.5,
  },
  b2cFarmerQtyPill: {
    backgroundColor: '#FFD54F',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  b2cFarmerQtyPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  b2cFarmerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  b2cFarmerDesc: {
    fontSize: 11,
    color: '#E8F5E9',
    lineHeight: 15,
    marginVertical: 4,
  },
  b2cFarmerBottomRow: {
    marginTop: 4,
  },
  b2cFarmerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD54F',
  },
  featureRow: {
    flexDirection: 'row',
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  chatButton: {
    backgroundColor: '#E8F5E9',
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  marketShortcutButton: {
    backgroundColor: '#E3F2FD',
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  featureSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },

  // SECTION HEADER & LANGUAGE SELECTOR
  sectionHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  moduleMainTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  moduleSubTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langBtnActive: {
    backgroundColor: '#2E7D32',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },

  // LOCATION CARD
  locationBarCard: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    alignSelf: 'center',
    marginTop: 8,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPinIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  locationPrimaryText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  locationSecondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  locationActionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  detectBtn: {
    flex: 1,
    backgroundColor: '#B9F2AF',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  detectBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  searchManualBtn: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  searchManualBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },

  deniedNoticeBox: {
    marginTop: 12,
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFF176',
  },
  deniedNoticeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57F17',
  },
  deniedNoticeMsg: {
    fontSize: 12,
    color: '#5D4037',
    marginTop: 4,
  },
  deniedSearchAction: {
    marginTop: 8,
    backgroundColor: '#FBC02D',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deniedSearchActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3E2723',
  },

  errorBanner: {
    marginTop: 10,
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#2E7D32',
  },

  // HERO WEATHER CARD
  heroWeatherCard: {
    backgroundColor: '#7593FF',
    width: '90%',
    alignSelf: 'center',
    marginTop: 14,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroConditionLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  heroLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroWeatherIcon: {
    fontSize: 44,
  },
  heroTempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
  },
  heroTemperature: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  heroTempSubBox: {
    marginLeft: 16,
  },
  heroFeelsLike: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroRainProb: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  quickMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // GRID METRICS
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '90%',
    alignSelf: 'center',
    marginTop: 12,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    width: (windowWidth * 0.9 - 12) / 2,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  gridCardLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  gridCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 3,
  },
  gridCardSub: {
    fontSize: 10,
    color: '#888',
    marginTop: 3,
  },

  // SECTION CONTAINERS
  sectionContainer: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },

  // HOURLY
  hourlyScrollContent: {
    paddingVertical: 6,
  },
  hourlyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginRight: 8,
    width: 78,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  hourlyTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
  },
  hourlyIcon: {
    fontSize: 24,
    marginVertical: 4,
  },
  hourlyTempText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  hourlyRainBadge: {
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  hourlyRainText: {
    fontSize: 10,
    color: '#0288D1',
    fontWeight: '600',
  },
  hourlyWindText: {
    fontSize: 9,
    color: '#777',
    marginTop: 3,
  },

  // FILTERS
  filterPillContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  filterChip: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 11,
    color: '#33691E',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // RECOMMENDATION CARDS
  recommendationCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  recCritical: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 5,
    borderLeftColor: '#C62828',
  },
  recWarning: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 5,
    borderLeftColor: '#FF8F00',
  },
  recInfo: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 5,
    borderLeftColor: '#2E7D32',
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  recDesc: {
    fontSize: 12,
    color: '#424242',
    lineHeight: 17,
  },

  // ADVISORY SUB CARDS
  advisorySubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  advisoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  advisoryIcon: {
    fontSize: 26,
    marginRight: 8,
  },
  advisoryMainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  advisoryBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  advisoryExplanation: {
    fontSize: 12,
    color: '#424242',
    lineHeight: 18,
    marginBottom: 6,
  },
  advisoryDisclaimerText: {
    fontSize: 10,
    color: '#757575',
    fontStyle: 'italic',
    lineHeight: 14,
    marginTop: 4,
  },

  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FBF9',
    padding: 8,
    borderRadius: 10,
    marginVertical: 6,
  },
  checkItem: {
    alignItems: 'center',
  },
  checkText: {
    fontSize: 9,
    color: '#555',
    marginTop: 2,
  },
  reasonsList: {
    marginVertical: 4,
  },
  reasonBullet: {
    fontSize: 11,
    color: '#C62828',
    marginVertical: 2,
  },
  bestWindowBox: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 10,
    marginVertical: 6,
  },
  bestWindowText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1B5E20',
  },

  // DAILY FORECAST
  dailyRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  dailyDayCol: {
    width: 70,
  },
  dailyDayName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#212121',
  },
  dailyDateText: {
    fontSize: 10,
    color: '#888',
  },
  dailyConditionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 6,
  },
  dailyIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  dailyConditionText: {
    fontSize: 12,
    color: '#444',
  },
  dailyRainCol: {
    alignItems: 'flex-end',
    width: 60,
  },
  dailyRainProb: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0288D1',
  },
  dailyPrecipSum: {
    fontSize: 9,
    color: '#777',
  },
  dailyTempCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    width: 55,
    justifyContent: 'flex-end',
  },
  dailyMaxTemp: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  dailyMinTemp: {
    fontSize: 12,
    color: '#777',
  },

  // ALERTS
  alertCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 5,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  alertDescription: {
    fontSize: 12,
    color: '#333',
    lineHeight: 17,
  },
  alertAttributionText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  noAlertCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAlertIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  noAlertText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
    flex: 1,
  },

  // FOOTER
  footerContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  footerSubText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalSearchRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  modalSearchBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalSearchBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalResultsList: {
    marginTop: 8,
  },
  modalSuggestedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  modalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultItemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  resultItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  resultItemDetail: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});
