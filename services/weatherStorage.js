// services/weatherStorage.js
// Handles AsyncStorage caching and automatic refresh timing for weather & location

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LOCATION: '@kisaansaathi_weather_location',
  WEATHER_CACHE: '@kisaansaathi_weather_cache',
  LANGUAGE: '@kisaansaathi_language',
};

// Auto-refresh threshold: 12 minutes (between 10-15 mins)
const CACHE_EXPIRY_MS = 12 * 60 * 1000;

export const saveSavedLocation = async (locationData) => {
  try {
    if (!locationData) return;
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(locationData));
  } catch (e) {
    console.warn('Failed to save location to storage', e);
  }
};

export const getSavedLocation = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to get location from storage', e);
    return null;
  }
};

export const saveWeatherCache = async (weatherData) => {
  try {
    if (!weatherData) return;
    const payload = {
      data: weatherData,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save weather cache', e);
  }
};

export const getWeatherCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WEATHER_CACHE);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const isExpired = Date.now() - (payload.timestamp || 0) > CACHE_EXPIRY_MS;
    return {
      weather: payload.data,
      timestamp: payload.timestamp,
      isExpired,
    };
  } catch (e) {
    console.warn('Failed to read weather cache', e);
    return null;
  }
};

export const savePreferredLanguage = async (lang) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (e) {
    console.warn('Failed to save language', e);
  }
};

export const getPreferredLanguage = async () => {
  try {
    const lang = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return lang || 'hi'; // Default Hindi
  } catch (e) {
    return 'hi';
  }
};
