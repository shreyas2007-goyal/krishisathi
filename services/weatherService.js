// services/weatherService.js
// Handles Open-Meteo Weather API integration

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * Maps WMO code to human-readable key and icon symbol
 */
export const getWeatherConditionInfo = (wmoCode) => {
  const code = Number(wmoCode);
  switch (code) {
    case 0:
      return { translationKey: 'wmo_0', label: 'Clear Sky', icon: 'weather-sunny', type: 'sunny' };
    case 1:
      return { translationKey: 'wmo_1', label: 'Mainly Clear', icon: 'weather-partly-cloudy', type: 'mostly_sunny' };
    case 2:
      return { translationKey: 'wmo_2', label: 'Partly Cloudy', icon: 'weather-partly-cloudy', type: 'partly_cloudy' };
    case 3:
      return { translationKey: 'wmo_3', label: 'Overcast', icon: 'weather-cloudy', type: 'cloudy' };
    case 45:
    case 48:
      return { translationKey: 'wmo_45', label: 'Foggy', icon: 'weather-fog', type: 'fog' };
    case 51:
    case 53:
    case 55:
      return { translationKey: 'wmo_51', label: 'Drizzle', icon: 'weather-partly-rainy', type: 'drizzle' };
    case 61:
    case 63:
    case 65:
      return { translationKey: code === 65 ? 'wmo_65' : code === 63 ? 'wmo_63' : 'wmo_61', label: 'Rain', icon: 'weather-rainy', type: 'rain' };
    case 71:
    case 73:
    case 75:
      return { translationKey: 'wmo_71', label: 'Snow Fall', icon: 'weather-snowy', type: 'snow' };
    case 80:
    case 81:
    case 82:
      return { translationKey: code === 82 ? 'wmo_82' : code === 81 ? 'wmo_81' : 'wmo_80', label: 'Rain Showers', icon: 'weather-pouring', type: 'showers' };
    case 95:
    case 96:
    case 99:
      return { translationKey: code === 95 ? 'wmo_95' : 'wmo_96', label: 'Thunderstorm', icon: 'weather-lightning-rainy', type: 'thunderstorm' };
    default:
      return { translationKey: 'wmo_2', label: 'Partly Cloudy', icon: 'weather-partly-cloudy', type: 'partly_cloudy' };
  }
};

/**
 * Converts wind degrees into cardinal directions
 */
export const getWindDirectionText = (degrees) => {
  if (degrees === undefined || degrees === null) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((degrees % 360) / 45) % 8;
  return directions[index] || 'N';
};

/**
 * Fetches comprehensive live weather forecast from Open-Meteo
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>}
 */
export const fetchWeatherData = async (latitude, longitude) => {
  if (!latitude || !longitude) {
    throw new Error('Valid latitude and longitude are required.');
  }

  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'rain',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'uv_index',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
      'uv_index_max',
    ].join(','),
    timezone: 'auto',
    forecast_days: '7',
  });

  const url = `${OPEN_METEO_BASE}?${params.toString()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo request failed with status: ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.reason || 'Open-Meteo API returned an error.');
    }

    // Parse Current Weather safely
    const current = data.current || {};
    const condition = getWeatherConditionInfo(current.weather_code ?? 0);
    const windDirectionText = getWindDirectionText(current.wind_direction_10m);

    // Parse Hourly (take next 24 hours from current time) safely
    const hourlyRaw = data.hourly || {};
    const times = hourlyRaw.time || [];
    const weatherCodes = hourlyRaw.weather_code || [];
    const temps = hourlyRaw.temperature_2m || [];
    const humidities = hourlyRaw.relative_humidity_2m || [];
    const rainProbs = hourlyRaw.precipitation_probability || [];
    const precipitations = hourlyRaw.precipitation || [];
    const windSpeeds = hourlyRaw.wind_speed_10m || [];
    const uvIndices = hourlyRaw.uv_index || [];

    const nowIso = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    let startIndex = times.findIndex((t) => t.startsWith(nowIso));
    if (startIndex === -1) startIndex = 0;

    const next24Hours = [];
    const maxCount = Math.min(startIndex + 24, times.length);

    for (let i = startIndex; i < maxCount; i++) {
      const timeStr = times[i];
      const hour = new Date(timeStr).getHours();
      const formattedHour = `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? 'PM' : 'AM'}`;
      const code = weatherCodes[i] ?? 0;
      const hourCondition = getWeatherConditionInfo(code);

      next24Hours.push({
        time: timeStr,
        displayTime: formattedHour,
        temp: Math.round(temps[i] ?? 0),
        humidity: humidities[i] ?? 0,
        rainProb: rainProbs[i] ?? 0,
        precipitation: precipitations[i] ?? 0,
        weatherCode: code,
        condition: hourCondition,
        windSpeed: windSpeeds[i] ?? 0,
        uvIndex: uvIndices[i] ?? 0,
      });
    }

    // Parse 7-Day Daily Forecast safely
    const dailyRaw = data.daily || {};
    const dailyTimes = dailyRaw.time || [];
    const dailyCodes = dailyRaw.weather_code || [];
    const dailyMaxTemps = dailyRaw.temperature_2m_max || [];
    const dailyMinTemps = dailyRaw.temperature_2m_min || [];
    const dailyPrecipSums = dailyRaw.precipitation_sum || [];
    const dailyPrecipProbMax = dailyRaw.precipitation_probability_max || [];
    const dailySunrises = dailyRaw.sunrise || [];
    const dailySunsets = dailyRaw.sunset || [];
    const dailyUvMax = dailyRaw.uv_index_max || [];

    const sevenDayList = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const formatSunTime = (isoTime) => {
      if (!isoTime) return '--:--';
      const dt = new Date(isoTime);
      let h = dt.getHours();
      let m = dt.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const mm = m < 10 ? `0${m}` : m;
      return `${h}:${mm} ${ampm}`;
    };

    for (let d = 0; d < dailyTimes.length; d++) {
      const dateObj = new Date(dailyTimes[d]);
      const dayName = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : daysOfWeek[dateObj.getDay()];
      const code = dailyCodes[d] ?? 0;
      const dayCondition = getWeatherConditionInfo(code);

      sevenDayList.push({
        date: dailyTimes[d],
        dayName,
        maxTemp: Math.round(dailyMaxTemps[d] ?? 0),
        minTemp: Math.round(dailyMinTemps[d] ?? 0),
        precipSum: dailyPrecipSums[d] ?? 0,
        precipProbMax: dailyPrecipProbMax[d] ?? 0,
        weatherCode: code,
        condition: dayCondition,
        sunrise: formatSunTime(dailySunrises[d]),
        sunset: formatSunTime(dailySunsets[d]),
        uvMax: dailyUvMax[d] ?? 0,
      });
    }

    const currentUv = next24Hours.length > 0 ? (next24Hours[0].uvIndex || 0) : 0;
    const todayDaily = sevenDayList.length > 0 ? sevenDayList[0] : null;

    return {
      current: {
        temp: Math.round(current.temperature_2m ?? 0),
        feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
        humidity: current.relative_humidity_2m ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        windDirection: current.wind_direction_10m ?? 0,
        windDirectionText,
        precipitation: current.precipitation ?? 0,
        rain: current.rain ?? 0,
        cloudCover: current.cloud_cover ?? 0,
        weatherCode: current.weather_code ?? 0,
        condition,
        uvIndex: currentUv,
        sunrise: todayDaily ? todayDaily.sunrise : '06:30 AM',
        sunset: todayDaily ? todayDaily.sunset : '06:00 PM',
        rainProb: next24Hours.length > 0 ? next24Hours[0].rainProb : 0,
      },
      hourly: next24Hours,
      daily: sevenDayList,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};
