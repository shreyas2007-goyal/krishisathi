// services/agriIntelligence.js
// Agriculture-Specific Weather Intelligence Engine for KisanSAATHI

export const CROP_PROFILES = [
  { id: 'general', nameEn: 'General / Multiple Crops', nameHi: 'सामान्य / मिश्रित फसल', waterNeed: 'medium' },
  { id: 'wheat', nameEn: 'Wheat (गेंहू)', nameHi: 'गेहूं (Wheat)', waterNeed: 'medium', criticalStages: 'Crown root initiation, flowering' },
  { id: 'rice', nameEn: 'Paddy / Rice (धान)', nameHi: 'धान (Paddy)', waterNeed: 'high', criticalStages: 'Panicle initiation, tillering' },
  { id: 'mustard', nameEn: 'Mustard (सरसों)', nameHi: 'सरसों (Mustard)', waterNeed: 'low', criticalStages: 'Branching, pod formation' },
  { id: 'cotton', nameEn: 'Cotton (कपास)', nameHi: 'कपास (Cotton)', waterNeed: 'medium', criticalStages: 'Square formation, boll development' },
  { id: 'sugarcane', nameEn: 'Sugarcane (गन्ना)', nameHi: 'गन्ना (Sugarcane)', waterNeed: 'high', criticalStages: 'Formative phase, grand growth' },
  { id: 'vegetables', nameEn: 'Vegetables (सब्जियां)', nameHi: 'सब्जियां (Vegetables)', waterNeed: 'high', criticalStages: 'Transplanting, fruit development' },
];

export const SOIL_PROFILES = [
  { id: 'loam', nameEn: 'Loam / Alluvial (दोमट)', nameHi: 'दोमट मिट्टी (संतुलित जल धारण)', retention: 'balanced' },
  { id: 'sandy', nameEn: 'Sandy (बलुई)', nameHi: 'बलुई मिट्टी (शीघ्र सूखती है)', retention: 'low' },
  { id: 'clay', nameEn: 'Clay / Black (चिकनी/काली)', nameHi: 'काली/चिकनी मिट्टी (धीमी निकासी)', retention: 'high' },
];

/**
 * Generates conditional farming recommendations
 */
export const generateFarmingRecommendations = (weather, lang = 'hi') => {
  if (!weather || !weather.current) return [];

  const current = weather.current;
  const hourly = weather.hourly || [];
  const daily = weather.daily || [];

  const recommendations = [];

  // 1. Rain Expected in next 48h
  const next48hRainMaxProb = Math.max(
    ...daily.slice(0, 2).map((d) => d.precipProbMax || 0),
    ...hourly.slice(0, 24).map((h) => h.rainProb || 0)
  );
  const next48hTotalPrecip = daily.slice(0, 2).reduce((sum, d) => sum + (d.precipSum || 0), 0);

  if (next48hRainMaxProb >= 50 || next48hTotalPrecip >= 5) {
    recommendations.push({
      id: 'rain_postpone_irrigation',
      type: 'warning',
      category: 'irrigation',
      icon: 'weather-rainy',
      title: lang === 'hi' ? 'सिंचाई और खाद छिड़काव स्थगित करने पर विचार करें' : lang === 'pa' ? "ਸਿੰਚਾਈ ਅਤੇ ਖਾਦ ਰੋਕਣ 'ਤੇ ਵਿਚਾਰ ਕਰੋ" : 'Consider Postponing Irrigation & Fertilizer',
      description:
        lang === 'hi'
          ? `अगले 24-48 घंटों में बारिश की संभावना (${next48hRainMaxProb}%) है। यूरिया या सिंचाई अभी देने से पानी और पोषक तत्वों का बहाव हो सकता है।`
          : lang === 'pa'
          ? `ਅਗਲੇ 24-48 ਘੰਟਿਆਂ ਵਿੱਚ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ (${next48hRainMaxProb}%) ਹੈ। ਸਿੰਚਾਈ ਅਤੇ ਖਾਦ ਰੋਕ ਕੇ ਰੱਖੋ।`
          : `Significant rain is expected in the next 24-48h (${next48hRainMaxProb}% chance). Postpone scheduled irrigation and fertilizer top-dressing to prevent nutrient runoff.`,
    });
  }

  // 2. Heavy Rainfall Forecast (> 25mm in 48h)
  if (next48hTotalPrecip >= 25) {
    recommendations.push({
      id: 'heavy_rain_drainage',
      type: 'critical',
      category: 'drainage',
      icon: 'waves',
      title: lang === 'hi' ? 'जल निकासी प्रबंध एवं मेड़ की मरम्मत' : lang === 'pa' ? 'ਖੇਤ ਵਿੱਚੋਂ ਪਾਣੀ ਨਿਕਾਸੀ ਦਾ ਪ੍ਰਬੰਧ ਕਰੋ' : 'Field Drainage & Bund Protection',
      description:
        lang === 'hi'
          ? `आगामी दिनों में भारी बारिश (${next48hTotalPrecip.toFixed(1)} मिमी) का अनुमान है। खेतों में पानी भराव रोकने के लिए जल निकासी नालियों को तुरंत साफ करें।`
          : lang === 'pa'
          ? `ਭਾਰੀ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਖੇਤਾਂ ਵਿੱਚੋਂ ਵਾਧੂ ਪਾਣੀ ਕੱਢਣ ਲਈ ਨਾਲੀਆਂ ਸਾਫ਼ ਰੱਖੋ।`
          : `Heavy precipitation (~${next48hTotalPrecip.toFixed(1)} mm) forecast. Ensure farm drainage channels are open to prevent root-zone waterlogging.`,
    });
  }

  // 3. High Temperature (> 36°C)
  if (current.temp >= 36) {
    recommendations.push({
      id: 'heat_stress',
      type: 'caution',
      category: 'crop_care',
      icon: 'thermometer',
      title: lang === 'hi' ? 'फसल में नमी और हीट स्ट्रेस की निगरानी' : lang === 'pa' ? 'ਫ਼ਸਲ ਵਿੱਚ ਨਮੀ ਦਾ ਧਿਆਨ ਰੱਖੋ' : 'Monitor Crop Water Requirements & Heat Stress',
      description:
        lang === 'hi'
          ? `दिन का तापमान ${current.temp}°C तक पहुंच रहा है। तेज धूप में पत्तियां मुरझाने से बचाने के लिए सुबह या शाम को हल्की सिंचाई करें।`
          : lang === 'pa'
          ? `ਤਾਪਮਾਨ ਬਹੁਤ ਜ਼ਿਆਦਾ ਹੈ। ਸਵੇਰੇ ਜਾਂ ਸ਼ਾਮ ਵੇਲੇ ਹਲਕਾ ਪਾਣੀ ਦੇ ਕੇ ਫ਼ਸਲ ਨੂੰ ਸੜਨ ਤੋਂ ਬਚਾਓ।`
          : `Ambient temperature is elevated (${current.temp}°C). Provide light irrigation during early morning or evening hours to reduce heat stress.`,
    });
  }

  // 4. High Humidity & Warm Temp -> Fungal Disease Risk
  if (current.humidity >= 75 && current.temp >= 20 && current.temp <= 32) {
    recommendations.push({
      id: 'fungal_disease_risk',
      type: 'caution',
      category: 'pest_disease',
      icon: 'shield-alert-outline',
      title: lang === 'hi' ? 'फफूंद जनित रोगों (फंगस/ब्लाइट) की निगरानी करें' : lang === 'pa' ? 'ਉੱਲੀ ਰੋਗਾਂ (ਫੰਗਸ) ਦੀ ਜਾਂਚ ਕਰੋ' : 'Elevated Risk of Fungal Crop Diseases',
      description:
        lang === 'hi'
          ? `हवा में नमी ${current.humidity}% और अनुकूल तापमान फंगस, रतुआ या झुलसा रोग के लिए अनुकूल है। फसलों की पत्तियों का नियमित निरीक्षण करें।`
          : lang === 'pa'
          ? `ਹਵਾ ਵਿੱਚ ਨਮੀ ਜ਼ਿਆਦਾ ਹੈ, ਫ਼ਸਲ 'ਤੇ ਉੱਲੀ ਰੋਗ ਲੱਗਣ ਦਾ ਖ਼ਤਰਾ ਹੈ। ਪੱਤਿਆਂ ਦੀ ਜਾਂਚ ਰੱਖੋ।`
          : `High atmospheric humidity (${current.humidity}%) favors fungal pathogens (blight/mildew). Inspect crops regularly for leaf spots or spore development.`,
    });
  }

  // 5. Strong Winds (> 18 km/h)
  if (current.windSpeed >= 18) {
    recommendations.push({
      id: 'strong_winds_spraying',
      type: 'warning',
      category: 'spraying',
      icon: 'weather-windy',
      title: lang === 'hi' ? 'तेज हवा: कीटनाशक/खरपतवारनाशक छिड़काव से बचें' : lang === 'pa' ? 'ਤੇਜ਼ ਹਵਾ: ਦਵਾਈ ਦਾ ਛਿੜਕਾਅ ਨਾ ਕਰੋ' : 'Strong Winds: Avoid Chemical Spraying',
      description:
        lang === 'hi'
          ? `हवा की रफ्तार ${current.windSpeed} किमी/घंटा है। दवा हवा में उड़ने और आसपास की फसलों को नुकसान पहुंचने का खतरा है।`
          : lang === 'pa'
          ? `ਹਵਾ ਤੇਜ਼ ਚੱਲ ਰਹੀ ਹੈ। ਦਵਾਈ ਦੇ ਉੱਡਣ ਦਾ ਖ਼ਤਰਾ ਹੈ, ਸਪਰੇਅ ਰੋਕੋ।`
          : `Wind speed is elevated (${current.windSpeed} km/h). Foliar spraying is strongly discouraged to prevent spray drift and chemical loss.`,
    });
  }

  // 6. Extended Dry Spell / Low Rainfall
  const next7DaysRainTotal = daily.reduce((sum, d) => sum + (d.precipSum || 0), 0);
  if (next7DaysRainTotal < 1 && current.humidity < 50) {
    recommendations.push({
      id: 'dry_spell_irrigation',
      type: 'info',
      category: 'irrigation',
      icon: 'weather-sunny',
      title: lang === 'hi' ? 'शुष्क मौसम: नियमित सिंचाई योजना की समीक्षा करें' : lang === 'pa' ? 'ਖੁਸ਼ਕ ਮੌਸਮ: ਸਿੰਚਾਈ ਦੀ ਯੋਜਨਾ ਬਣਾਓ' : 'Dry Outlook: Review Irrigation Schedule',
      description:
        lang === 'hi'
          ? `अगले 7 दिनों में मौसम सूखा रहने का अनुमान है। अपनी फसल की विकास अवस्था के अनुसार सिंचाई की तैयारी रखें।`
          : lang === 'pa'
          ? `ਅਗਲੇ 7 ਦਿਨ ਮੌਸਮ ਖੁਸ਼ਕ ਰਹੇਗਾ। ਫ਼ਸਲ ਲਈ ਪਾਣੀ ਦਾ ਪ੍ਰਬੰਧ ਰੱਖੋ।`
          : `Dry weather projected for the next 7 days (<1 mm rain). Ensure timely irrigation planning based on crop water requirements.`,
    });
  }

  return recommendations;
};

/**
 * Calculates spraying suitability index and best operational windows
 */
export const calculateSprayingAdvisory = (weather, lang = 'hi') => {
  if (!weather || !weather.current) {
    return {
      status: 'caution',
      label: 'Checking...',
      suitable: false,
      reasons: [],
      bestWindow: '',
      windOk: true,
      rainOk: true,
      tempOk: true,
      humidityOk: true,
    };
  }

  const { temp, humidity, windSpeed, rainProb } = weather.current;
  const reasons = [];

  const windOk = windSpeed <= 15;
  const rainOk = rainProb < 30;
  const tempOk = temp >= 15 && temp <= 33;
  const humidityOk = humidity >= 35 && humidity <= 75;

  let status = 'suitable';

  if (!windOk) {
    status = 'unsuitable';
    reasons.push(
      lang === 'hi'
        ? `हवा की गति अधिक है (${windSpeed} km/h)। 15 किमी/घंटे से अधिक हवा में दवा उड़ने का खतरा रहता है।`
        : `Wind speed is too high (${windSpeed} km/h). Wind >15 km/h causes severe spray drift.`
    );
  }

  if (!rainOk) {
    status = 'unsuitable';
    reasons.push(
      lang === 'hi'
        ? `बारिश की संभावना (${rainProb}%) अधिक है। बारिश से दवा धुल जाएगी।`
        : `Rain probability is high (${rainProb}%). Spray will be washed off by impending precipitation.`
    );
  }

  if (temp > 34) {
    status = status === 'unsuitable' ? 'unsuitable' : 'caution';
    reasons.push(
      lang === 'hi'
        ? `तापमान अधिक (${temp}°C) है। दोपहर की तेज धूप में दवा जल्दी सूखती है और असर कम होता है।`
        : `Temperature is high (${temp}°C). Rapid droplet evaporation reduces pesticide effectiveness.`
    );
  } else if (temp < 10) {
    status = status === 'unsuitable' ? 'unsuitable' : 'caution';
    reasons.push(
      lang === 'hi'
        ? `तापमान बहुत कम (${temp}°C) है।`
        : `Low temperature (${temp}°C) may reduce biological uptake.`
    );
  }

  if (humidity > 80 && status !== 'unsuitable') {
    status = 'caution';
    reasons.push(
      lang === 'hi'
        ? `हवा में नमी अधिक (${humidity}%) है। दवा सूखने में समय लेगी।`
        : `High relative humidity (${humidity}%). Drying time is extended.`
    );
  }

  let labelText = '';
  if (status === 'suitable') {
    labelText = lang === 'hi' ? 'छिड़काव के लिए अनुकूल समय' : lang === 'pa' ? 'ਸਪਰੇਅ ਲਈ ਢੁਕਵਾਂ ਸਮਾਂ' : 'Favorable for Spraying';
  } else if (status === 'caution') {
    labelText = lang === 'hi' ? 'सावधानी के साथ छिड़काव करें' : lang === 'pa' ? 'ਸਾਵਧਾਨੀ ਨਾਲ ਸਪਰੇਅ ਕਰੋ' : 'Moderate / Exercise Caution';
  } else {
    labelText = lang === 'hi' ? 'छिड़काव के लिए प्रतिकूल (छिड़काव न करें)' : lang === 'pa' ? 'ਸਪਰੇਅ ਨਾ ਕਰੋ' : 'Unfavorable / Avoid Spraying';
  }

  return {
    status,
    label: labelText,
    suitable: status === 'suitable',
    reasons,
    windOk,
    rainOk,
    tempOk,
    humidityOk,
    bestWindow:
      lang === 'hi'
        ? 'उत्तम समय: सुबह 6:00 से 9:00 बजे अथवा शाम 4:30 से 6:30 बजे (शांत हवा)।'
        : 'Recommended Window: Early morning (6:00–9:00 AM) or late afternoon (4:30–6:30 PM).',
    disclaimer:
      lang === 'hi'
        ? 'अनिवार्य सूचना: छिड़काव से पहले हमेशा विशिष्ट उत्पाद लेबल और निर्माता के निर्देशों का पालन करें। कभी भी हवा की विपरीत दिशा में छिड़काव न करें।'
        : 'Mandatory Notice: Always follow specific product label instructions and wear protective gear. Never spray against wind direction.',
  };
};

/**
 * Generates Irrigation Advisory based on weather, crop, and soil
 */
export const calculateIrrigationAdvisory = (weather, cropId = 'general', soilId = 'loam', lang = 'hi') => {
  if (!weather || !weather.current) {
    return {
      status: 'moderate',
      title: 'Checking...',
      explanation: '',
    };
  }

  const { temp, humidity, rainProb } = weather.current;
  const next3DaysPrecip = (weather.daily || []).slice(0, 3).reduce((acc, d) => acc + (d.precipSum || 0), 0);
  const next3DaysRainProbMax = Math.max(...(weather.daily || []).slice(0, 3).map((d) => d.precipProbMax || 0), rainProb);

  // If rain expected
  if (next3DaysRainProbMax >= 60 || next3DaysPrecip >= 8) {
    return {
      status: 'postpone',
      icon: 'clock-outline',
      badgeColor: '#FF9800',
      title: lang === 'hi' ? 'सिंचाई स्थगित करें (बारिश का अनुमान)' : lang === 'pa' ? 'ਸਿੰਚਾਈ ਰੋਕੋ (ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ)' : 'Postpone Irrigation (Rain Expected)',
      explanation:
        lang === 'hi'
          ? `आगामी दिनों में बारिश की संभावना (${next3DaysRainProbMax}%) और कुल वर्षा अनुमान लगभग ${next3DaysPrecip.toFixed(1)} मिमी है। प्राकृतिक वर्षा का लाभ उठाएं और बिजली व पानी बचाएं।`
          : `Rain forecast indicates a ${next3DaysRainProbMax}% probability (~${next3DaysPrecip.toFixed(1)} mm). Postpone irrigation to utilize natural rain and conserve groundwater.`,
      disclaimer:
        lang === 'hi'
          ? 'यह सलाह मौसमी वाष्पीकरण और वर्षा मॉडल पर आधारित है। पंप चलाने से पहले खेत में वास्तविक नमी की स्थिति जरूर परखें।'
          : 'Notice: This advisory is based on evapotranspiration and forecast models. Always verify actual field root-zone moisture before operating pumps.',
    };
  }

  // If hot, dry, sandy soil
  if (temp > 32 || soilId === 'sandy') {
    return {
      status: 'needed',
      icon: 'water-outline',
      badgeColor: '#2196F3',
      title: lang === 'hi' ? 'सिंचाई की आवश्यकता है' : lang === 'pa' ? 'ਸਿੰਚਾਈ ਦੀ ਲੋੜ ਹੈ' : 'Irrigation Recommended',
      explanation:
        lang === 'hi'
          ? `उच्च तापमान (${temp}°C) और कम आर्द्रता के कारण मिट्टी से नमी तेजी से घट रही है। अपनी फसल की क्रांतिक अवस्था के अनुसार सिंचाई करें।`
          : `Higher temperatures (${temp}°C) elevate crop evapotranspiration. Soil moisture depletion is active; timely irrigation is advised.`,
      disclaimer:
        lang === 'hi'
          ? 'यह सलाह मौसमी वाष्पीकरण मॉडल पर आधारित है। वास्तविक नमी जांच कर ही पानी दें।'
          : 'Notice: Advisory is weather-model based. Verify local root moisture before irrigation.',
    };
  }

  return {
    status: 'moderate',
    icon: 'sprout',
    badgeColor: '#4CAF50',
    title: lang === 'hi' ? 'सामान्य सिंचाई (फसल चक्र अनुसार)' : lang === 'pa' ? 'ਫ਼ਸਲ ਮੁਤਾਬਕ ਆਮ ਸਿੰਚਾਈ' : 'Normal Irrigation As Scheduled',
    explanation:
      lang === 'hi'
        ? `मौसम संतुलित है (तापमान ${temp}°C, नमी ${humidity}%)। अपनी फसल के सामान्य सिंचाई चक्र का पालन करें।`
        : `Weather parameters are moderate (${temp}°C, ${humidity}% RH). Follow standard irrigation scheduling for your crop stage.`,
    disclaimer:
      lang === 'hi'
        ? 'यह सामान्य मौसम सलाह है, खेत में नमी पर्याप्त हो तो अनावश्यक पानी न लगाएं।'
        : 'Notice: Weather guidance only. Avoid over-irrigation if field moisture is adequate.',
  };
};

/**
 * Evaluates severe weather alerts
 */
export const evaluateWeatherRiskAlerts = (weather, lang = 'hi') => {
  if (!weather || !weather.current) return [];

  const alerts = [];
  const current = weather.current;
  const daily = weather.daily || [];

  // 1. Extreme Heatwave Alert (Temp >= 42°C or 5°C above seasonal)
  const maxDayTemp = Math.max(...daily.slice(0, 3).map((d) => d.maxTemp || 0), current.temp);
  if (maxDayTemp >= 40) {
    alerts.push({
      id: 'heatwave_alert',
      level: maxDayTemp >= 43 ? 'severe' : 'warning',
      type: 'heatwave',
      icon: 'fire',
      title: lang === 'hi' ? 'लू / अत्यधिक तापमान चेतावनी (Heatwave Alert)' : 'Heatwave / Extreme Temperature Alert',
      severityColor: '#D32F2F',
      description:
        lang === 'hi'
          ? `आगामी दिनों में तापमान ${maxDayTemp}°C तक पहुंचने की संभावना है। फसलों में नमी बनाए रखने हेतु ड्रिप या शाम की हल्की सिंचाई करें तथा मवेशियों को छायादार स्थान पर रखें।`
          : `Forecast temperatures reach up to ${maxDayTemp}°C. Protect standing crops with mulching or light evening irrigation and shelter livestock.`,
      source: 'Model-Based Prediction (Open-Meteo)',
    });
  }

  // 2. Frost / Cold Wave Alert (Min Temp <= 4°C)
  const minDayTemp = Math.min(...daily.slice(0, 3).map((d) => d.minTemp || 99), current.temp);
  if (minDayTemp <= 4) {
    alerts.push({
      id: 'frost_alert',
      level: minDayTemp <= 2 ? 'severe' : 'warning',
      type: 'frost',
      icon: 'snowflake',
      title: lang === 'hi' ? 'पाला / शीत लहर चेतावनी (Frost Risk Alert)' : 'Frost & Cold Wave Risk Alert',
      severityColor: '#1976D2',
      description:
        lang === 'hi'
          ? `न्यूनतम तापमान ${minDayTemp}°C तक गिरने का अनुमान है, जिससे पाला पड़ने का खतरा है। सब्जियों और कोमल फसलों की सुरक्षा के लिए शाम को हल्की सिंचाई करें अथवा धुंआ करें।`
          : `Minimum temperatures projected around ${minDayTemp}°C. Vulnerable crops face frost damage risk. Consider light evening irrigation or field border smoking.`,
      source: 'Model-Based Prediction (Open-Meteo)',
    });
  }

  // 3. Heavy Rainfall Alert (>30 mm in next 24-48h)
  const precipNext48h = daily.slice(0, 2).reduce((sum, d) => sum + (d.precipSum || 0), 0);
  if (precipNext48h >= 30) {
    alerts.push({
      id: 'heavy_rain_alert',
      level: precipNext48h >= 50 ? 'severe' : 'warning',
      type: 'heavy_rain',
      icon: 'weather-lightning-rainy',
      title: lang === 'hi' ? 'भारी वर्षा चेतावनी (Heavy Rainfall Warning)' : 'Heavy Rainfall Alert',
      severityColor: '#C2185B',
      description:
        lang === 'hi'
          ? `अगले 48 घंटों में भारी वर्षा (${precipNext48h.toFixed(1)} मिमी) का अनुमान है। निचले खेतों में जल निकासी की व्यवस्था सुनिश्चित करें एवं कटी हुई फसल को सुरक्षित गोदाम में रखें।`
          : `Forecast indicates heavy rainfall (~${precipNext48h.toFixed(1)} mm) in the next 48 hours. Clear drainage bunds immediately and protect harvested produce.`,
      source: 'Model-Based Prediction (Open-Meteo)',
    });
  }

  // 4. Strong Wind / Gale Alert (> 35 km/h)
  const maxWind = Math.max(...(weather.hourly || []).slice(0, 24).map((h) => h.windSpeed || 0), current.windSpeed);
  if (maxWind >= 35) {
    alerts.push({
      id: 'high_wind_alert',
      level: maxWind >= 50 ? 'severe' : 'warning',
      type: 'high_wind',
      icon: 'weather-tornado',
      title: lang === 'hi' ? 'तेज आंधी / अंधड़ चेतावनी (High Wind Alert)' : 'High Wind & Storm Alert',
      severityColor: '#E65100',
      description:
        lang === 'hi'
          ? `हवा की गति ${maxWind} किमी/घंटा तक पहुंचने की संभावना है। लंबी फसलों (जैसे गन्ना, मक्का) में सिंचाई न करें ताकि फसल गिरने (लॉजिंग) से बच सके।`
          : `Gale force winds up to ${maxWind} km/h anticipated. Avoid irrigating tall crops (sugarcane/maize) to prevent lodging.`,
      source: 'Model-Based Prediction (Open-Meteo)',
    });
  }

  // 5. Thunderstorm / Hail Risk (WMO 95, 96, 99)
  const hasThunderstorm = daily.slice(0, 2).some((d) => [95, 96, 99].includes(d.weatherCode));
  if (hasThunderstorm) {
    alerts.push({
      id: 'thunderstorm_alert',
      level: 'warning',
      type: 'thunderstorm',
      icon: 'flash',
      title: lang === 'hi' ? 'गरज-चमक एवं आंधी की संभावना (Thunderstorm Alert)' : 'Thunderstorm & Lightning Alert',
      severityColor: '#7B1FA2',
      description:
        lang === 'hi'
          ? `बिजली गिरने और तेज गर्जना के साथ बौछारें पड़ने की संभावना है। खुले खेत में काम करने से बचें तथा ऊंचे पेड़ों के नीचे शरण न लें।`
          : `Thunderstorm activity with lightning predicted. Farmers are cautioned against working in open fields or taking shelter under isolated trees during squalls.`,
      source: 'Model-Based Prediction (Open-Meteo)',
    });
  }

  return alerts;
};
