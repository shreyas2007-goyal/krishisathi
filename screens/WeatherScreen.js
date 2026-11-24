// screens/WeatherScreen.js
// Weather & Crop Advisory Module for KisanSAATHI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { requestBrowserLocation, reverseGeocode, searchLocationNominatim, SUGGESTED_LOCATIONS } from '../services/locationService';
import { fetchWeatherData } from '../services/weatherService';
import {
  generateFarmingRecommendations,
  calculateSprayingAdvisory,
  calculateIrrigationAdvisory,
  evaluateWeatherRiskAlerts,
  CROP_PROFILES,
  SOIL_PROFILES,
} from '../services/agriIntelligence';
import { translations, getTranslation } from '../services/translations';
import {
  saveSavedLocation,
  getSavedLocation,
  saveWeatherCache,
  getWeatherCache,
  savePreferredLanguage,
  getPreferredLanguage,
} from '../services/weatherStorage';

const { width: windowWidth } = Dimensions.get('window');

export default function WeatherScreen({ navigation }) {
  // State variables
  const [lang, setLang] = useState('hi'); // Default Hindi
  const t = getTranslation(lang);

  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Manual search modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Crop & Soil selection for advisory
  const [selectedCrop, setSelectedCrop] = useState('general');
  const [selectedSoil, setSelectedSoil] = useState('loam');

  // Auto-refresh timer ref
  const refreshTimerRef = useRef(null);

  /**
   * Load weather for given coordinates
   */
  const loadWeatherForCoords = useCallback(
    async (lat, lon, locationInfo = null, isPullRefresh = false) => {
      try {
        if (!isPullRefresh) setLoading(true);
        setErrorMessage(null);

        // Fetch live weather data
        const weatherData = await fetchWeatherData(lat, lon);
        setWeather(weatherData);

        // If locationInfo not supplied, reverse geocode
        let resolvedLoc = locationInfo;
        if (!resolvedLoc || !resolvedLoc.displayName) {
          resolvedLoc = await reverseGeocode(lat, lon);
        }

        setLocation(resolvedLoc);
        await saveSavedLocation(resolvedLoc);
        await saveWeatherCache(weatherData);
      } catch (err) {
        console.error('Error fetching weather:', err);
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
   * Initial mount setup: Load cached data, language, and check freshness
   */
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      // 1. Load language preference
      const savedLang = await getPreferredLanguage();
      if (isMounted) setLang(savedLang);

      // 2. Load cached location & weather
      const savedLoc = await getSavedLocation();
      const cached = await getWeatherCache();

      if (savedLoc && cached?.weather && !cached?.isExpired) {
        if (isMounted) {
          setLocation(savedLoc);
          setWeather(cached?.weather);
          setLoading(false);
        }
      } else if (savedLoc) {
        // Refresh with saved location
        if (isMounted) setLocation(savedLoc);
        await loadWeatherForCoords(savedLoc.latitude, savedLoc.longitude, savedLoc);
      } else {
        // Default to prompt user to detect or search, or load fallback agricultural capital
        handleDetectLocation();
      }
    }

    initialize();

    // 3. Set up auto-refresh every 12 minutes (between 10-15 mins requirement)
    refreshTimerRef.current = setInterval(() => {
      if (location && location.latitude) {
        loadWeatherForCoords(location.latitude, location.longitude, location, true);
      }
    }, 12 * 60 * 1000);

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

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (location && location.latitude) {
      loadWeatherForCoords(location.latitude, location.longitude, location, true);
    } else {
      handleDetectLocation();
    }
  }, [location, loadWeatherForCoords]);

  /**
   * Switch language handler
   */
  const handleLanguageChange = async (newLang) => {
    setLang(newLang);
    await savePreferredLanguage(newLang);
  };

  /**
   * Manual Search handler
   */
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

  // Derive agricultural intelligence
  const farmingRecs = weather ? generateFarmingRecommendations(weather, lang) : [];
  const sprayingAdvisory = weather ? calculateSprayingAdvisory(weather, lang) : null;
  const irrigationAdvisory = weather
    ? calculateIrrigationAdvisory(weather, selectedCrop, selectedSoil, lang)
    : null;
  const weatherAlerts = weather ? evaluateWeatherRiskAlerts(weather, lang) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t.weatherAndCropAdvisory}</Text>
          <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
      >
        {/* Location Detection & Control Card */}
        <View style={styles.locationBarCard}>
          <View style={styles.locationInfoRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#2E7D32" />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationPrimaryText}>
                {location ? location.primaryName || location.village || location.town || location.district : t.detectingLocation}
              </Text>
              <Text style={styles.locationSecondaryText}>
                {location ? location.secondaryText || location.state || 'India' : 'Tap detect or search below'}
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

        {/* MAIN WEATHER & CROP ADVISORY DASHBOARD */}
        {!loading && weather && (
          <>
            {/* CARD 12: WEATHER RISK ALERTS (Top priority if any severe alert exists) */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t.weatherAlerts}</Text>
              </View>

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
                <View>
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

              {/* Quick Status Pill Bar */}
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

            {/* CARDS 3, 4, 5, 6, 7, 8: DETAILED GRID METRICS CARDS */}
            <View style={styles.gridContainer}>
              {/* Card 3: Feels Like */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="thermometer" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.feelsLike}</Text>
                <Text style={styles.gridCardValue}>{weather.current.feelsLike}°C</Text>
                <Text style={styles.gridCardSub}>
                  {weather.current.feelsLike > weather.current.temp ? 'Warmer due to humidity' : 'Comfortable'}
                </Text>
              </View>

              {/* Card 4: Humidity */}
              <View style={styles.gridCard}>
                <MaterialCommunityIcons name="water-percent" size={22} color="#2E7D32" />
                <Text style={styles.gridCardLabel}>{t.humidity}</Text>
                <Text style={styles.gridCardValue}>{weather.current.humidity}%</Text>
                <Text style={styles.gridCardSub}>
                  {weather.current.humidity > 70 ? 'High (Fungus Risk)' : 'Moderate Moisture'}
                </Text>
              </View>

              {/* Card 5: Wind Speed */}
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

            {/* CARD 9: HOURLY FORECAST (24-HOUR HORIZONTAL SCROLL) */}
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

            {/* CARD 11: AGRICULTURAL RECOMMENDATIONS & ADVISORY (CRITICAL FOR FARMERS) */}
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

              {/* Sub-Card A: Practical Farming Weather Recommendations */}
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
            Weather data powered by Open-Meteo • Geocoding by OpenStreetMap Nominatim
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E8E0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 18,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
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

  scrollContent: {
    paddingBottom: 40,
  },

  // Location Card
  locationBarCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  locationSecondaryText: {
    fontSize: 13,
    color: '#555',
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
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  detectBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  searchManualBtn: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  searchManualBtnText: {
    fontSize: 14,
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
    fontSize: 14,
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
    paddingVertical: 7,
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
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#2E7D32',
  },

  // HERO WEATHER CARD (Cards 1 & 2)
  heroWeatherCard: {
    backgroundColor: '#7593FF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    padding: 20,
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
    fontSize: 48,
  },
  heroTempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  heroTemperature: {
    fontSize: 54,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  heroTempSubBox: {
    marginLeft: 16,
  },
  heroFeelsLike: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroRainProb: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  quickMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 18,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // GRID CONTAINER (Cards 3, 4, 5, 6, 7, 8)
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    width: (windowWidth - 44) / 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  gridCardLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  gridCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 4,
  },
  gridCardSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },

  // SECTION CONTAINERS
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },

  // HOURLY SCROLL
  hourlyScrollContent: {
    paddingVertical: 8,
  },
  hourlyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 82,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  hourlyTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  hourlyIcon: {
    fontSize: 26,
    marginVertical: 6,
  },
  hourlyTempText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  hourlyRainBadge: {
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  hourlyRainText: {
    fontSize: 10,
    color: '#0288D1',
    fontWeight: '600',
  },
  hourlyWindText: {
    fontSize: 10,
    color: '#777',
    marginTop: 4,
  },

  // FILTER PILLS
  filterPillContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  filterChip: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 12,
    color: '#33691E',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // RECOMMENDATION CARDS
  recommendationCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
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
    marginBottom: 6,
  },
  recIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  recDesc: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },

  // ADVISORY SUB CARDS (Irrigation & Spraying)
  advisorySubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  advisoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  advisoryIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  advisoryMainTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  advisoryBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  advisoryExplanation: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 19,
    marginBottom: 8,
  },
  advisoryDisclaimerText: {
    fontSize: 11,
    color: '#757575',
    fontStyle: 'italic',
    lineHeight: 15,
    marginTop: 4,
  },

  // Spraying Checklist
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FBF9',
    padding: 10,
    borderRadius: 12,
    marginVertical: 8,
  },
  checkItem: {
    alignItems: 'center',
  },
  checkText: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
  },
  reasonsList: {
    marginVertical: 6,
  },
  reasonBullet: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E20',
  },

  // DAILY FORECAST (Card 10)
  dailyRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
    width: 75,
  },
  dailyDayName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  dailyDateText: {
    fontSize: 11,
    color: '#888',
  },
  dailyConditionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  dailyIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  dailyConditionText: {
    fontSize: 13,
    color: '#444',
  },
  dailyRainCol: {
    alignItems: 'flex-end',
    width: 65,
  },
  dailyRainProb: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0288D1',
  },
  dailyPrecipSum: {
    fontSize: 10,
    color: '#777',
  },
  dailyTempCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    width: 60,
    justifyContent: 'flex-end',
  },
  dailyMaxTemp: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  dailyMinTemp: {
    fontSize: 13,
    color: '#777',
  },

  // WEATHER ALERTS (Card 12)
  alertCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  alertDescription: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  alertAttributionText: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
  },
  noAlertCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAlertIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  noAlertText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    flex: 1,
  },

  // FOOTER
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
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
    fontSize: 18,
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
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  modalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultItemIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  resultItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  resultItemDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
