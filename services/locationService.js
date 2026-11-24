// services/locationService.js
// Handles Browser Geolocation API and OpenStreetMap Nominatim Reverse Geocoding & Search

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'KisanSAATHI-DigitalKrishiOfficer/1.0 (contact@kisansaathi.org)';

/**
 * Common agricultural districts for quick fallback or suggestions
 */
export const SUGGESTED_LOCATIONS = [
  { name: 'Karnal', district: 'Karnal', state: 'Haryana', latitude: 29.6857, longitude: 76.9905 },
  { name: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', latitude: 30.9010, longitude: 75.8573 },
  { name: 'Meerut', district: 'Meerut', state: 'Uttar Pradesh', latitude: 28.9845, longitude: 77.7064 },
  { name: 'Indore', district: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  { name: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  { name: 'New Delhi', district: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
];

/**
 * Requests browser location via Geolocation API
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const requestBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    // Check if navigator.geolocation is available (browser / web environment)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Browser Geolocation is not supported in this environment.',
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000, // 1 minute cached position ok
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorCode = 'UNKNOWN';
        if (error.code === 1) errorCode = 'PERMISSION_DENIED';
        else if (error.code === 2) errorCode = 'POSITION_UNAVAILABLE';
        else if (error.code === 3) errorCode = 'TIMEOUT';

        reject({
          code: errorCode,
          nativeCode: error.code,
          message: error.message,
        });
      },
      options
    );
  });
};

/**
 * Converts GPS coordinates into readable Village, Town, District, State
 * using OpenStreetMap Nominatim reverse geocoding API.
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>}
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Reverse geocoding failed with status ${res.status}`);
    }

    const data = await res.json();
    const address = data.address || {};

    const village = address.village || address.hamlet || address.suburb || address.neighbourhood || address.residential || '';
    const town = address.town || address.city || address.municipality || '';
    const district = address.state_district || address.district || address.county || town || '';
    const state = address.state || '';
    const country = address.country || 'India';

    // Build farmer-friendly display title
    let primaryName = village || town || district || 'My Farm';
    let secondaryParts = [];
    if (village && town && village !== town) secondaryParts.push(town);
    if (district && district !== village && district !== town) secondaryParts.push(district);
    if (state) secondaryParts.push(state);

    const secondaryText = secondaryParts.join(', ');
    const fullDisplayName = secondaryText ? `${primaryName}, ${secondaryText}` : primaryName;

    return {
      village,
      town,
      district,
      state,
      country,
      displayName: fullDisplayName,
      primaryName,
      secondaryText,
      latitude,
      longitude,
      osmId: data.osm_id,
      attribution: '© OpenStreetMap contributors',
    };
  } catch (error) {
    console.warn('reverseGeocode warning:', error.message);
    // Return coordinate fallback if network or geocoding fails
    return {
      village: '',
      town: '',
      district: '',
      state: '',
      country: 'India',
      displayName: `GPS: ${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
      primaryName: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
      secondaryText: 'Detected Coordinates',
      latitude,
      longitude,
      attribution: 'Open-Meteo & GPS',
    };
  }
};

/**
 * Searches for a village, town, or district in India using Nominatim
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export const searchLocationNominatim = async (query) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encoded}&countrycodes=in&limit=6&addressdetails=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const list = await res.json();
    return list.map((item) => {
      const addr = item.address || {};
      const placeName = item.name || addr.village || addr.town || addr.city || addr.county || '';
      const district = addr.state_district || addr.district || addr.county || '';
      const state = addr.state || '';

      const subParts = [];
      if (district && district !== placeName) subParts.push(district);
      if (state && state !== placeName) subParts.push(state);

      return {
        id: item.place_id || String(item.osm_id || Math.random()),
        name: placeName,
        district,
        state,
        displayName: subParts.length > 0 ? `${placeName}, ${subParts.join(', ')}` : item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });
  } catch (error) {
    console.warn('searchLocationNominatim error:', error);
    return [];
  }
};
