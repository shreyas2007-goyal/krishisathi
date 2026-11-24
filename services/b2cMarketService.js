// services/b2cMarketService.js
// KisanSAATHI - Direct Farmer-to-Consumer (B2C) Marketplace & Farmer-Customer Chat Service

import AsyncStorage from '@react-native-async-storage/async-storage';

const B2C_LISTINGS_STORAGE_KEY = '@kisansaathi_b2c_listings_v1';
const B2C_CHATS_STORAGE_KEY = '@kisansaathi_b2c_chats_v1';

/**
 * Initial curated B2C Direct-from-Farm Produce Listings
 * Focused on retail / consumer friendly quantities: 25 kg, 50 kg, 100 kg (1 Quintal)
 */
export const INITIAL_B2C_LISTINGS = [
  {
    id: 'b2c_prod_1',
    farmerId: 'farmer_ramesh',
    farmerName: 'Rameshwar Patil',
    farmerPhone: '+91 98220 55190',
    farmerVillage: 'Pimpalgaon Baswant',
    district: 'Nashik',
    state: 'Maharashtra',
    distanceKm: 8,
    crop: 'Wheat',
    cropHi: 'गेहूं (Sharbati)',
    variety: 'Sharbati Gold MP Selection',
    packageSizes: ['50 kg Bag', '100 kg (1 Quintal)', '25 kg Bag'],
    defaultPackage: '50 kg Bag',
    pricePerKg: 34,
    pricePerQuintal: 3400,
    pricePer50kg: 1700,
    minOrderQtyKg: 50,
    availableQtyQuintals: 35, // ~70 bags of 50kg
    qualityGrade: '100% Organic & Machine Cleaned',
    deliveryOptions: ['Farm Gate Pickup', 'Home Delivery within 25 km'],
    description: 'High-protein MP Sharbati wheat, freshly harvested. Triple-sieved, clean, zero stones or dust. Ideal for soft rotis for household year-round consumption.',
    rating: 4.9,
    reviewsCount: 38,
    verifiedFarmer: true,
    harvestDate: 'April 2026',
    imagePlaceholder: 'barley',
    accentColor: '#E65100',
  },
  {
    id: 'b2c_prod_2',
    farmerId: 'farmer_gurpreet',
    farmerName: 'Sardar Gurpreet Singh',
    farmerPhone: '+91 98141 22910',
    farmerVillage: 'Raikot Farm',
    district: 'Ludhiana',
    state: 'Punjab',
    distanceKm: 14,
    crop: 'Basmati Rice',
    cropHi: 'बासमती चावल (1121)',
    variety: 'Pusa 1121 Traditional Aged Rice',
    packageSizes: ['25 kg Bag', '50 kg Bag', '100 kg (1 Quintal)'],
    defaultPackage: '50 kg Bag',
    pricePerKg: 85,
    pricePerQuintal: 8500,
    pricePer50kg: 4250,
    minOrderQtyKg: 25,
    availableQtyQuintals: 20,
    qualityGrade: '2-Year Aged Super Long Grain',
    deliveryOptions: ['Doorstep Delivery across State', 'Farm Pickup'],
    description: 'Naturally aged Pusa 1121 Basmati with authentic aroma and 8.3mm uncooked grain length. Sold directly from our family farm mill with no polishing chemical agents.',
    rating: 4.8,
    reviewsCount: 52,
    verifiedFarmer: true,
    harvestDate: 'March 2026',
    imagePlaceholder: 'rice',
    accentColor: '#1B5E20',
  },
  {
    id: 'b2c_prod_3',
    farmerId: 'farmer_kailash',
    farmerName: 'Kailash Choudhary',
    farmerPhone: '+91 94140 88201',
    farmerVillage: 'Bassi Chomu Road',
    district: 'Jaipur',
    state: 'Rajasthan',
    distanceKm: 19,
    crop: 'Mustard Oil & Seeds',
    cropHi: 'पीली सरसों / कोल्ड प्रेस्ड तेल',
    variety: 'Yellow Mustard (Pili Sarson)',
    packageSizes: ['50 kg Bag (Seeds)', '15 Litre Cold Pressed Tin', '25 kg Bag'],
    defaultPackage: '50 kg Bag (Seeds)',
    pricePerKg: 68,
    pricePerQuintal: 6800,
    pricePer50kg: 3400,
    minOrderQtyKg: 25,
    availableQtyQuintals: 15,
    qualityGrade: 'Cold Pressed / Wood Pressed (Kacchi Ghani)',
    deliveryOptions: ['Farm Gate Pickup', 'Courier & Local Transport'],
    description: 'High pungency organic yellow mustard seeds or pure wood-pressed cold kacchi ghani oil. Zero adulteration, lab tested.',
    rating: 4.95,
    reviewsCount: 64,
    verifiedFarmer: true,
    harvestDate: 'April 2026',
    imagePlaceholder: 'flower',
    accentColor: '#F57F17',
  },
  {
    id: 'b2c_prod_4',
    farmerId: 'farmer_mukesh',
    farmerName: 'Mukesh Patidar',
    farmerPhone: '+91 97555 44910',
    farmerVillage: 'Sanwer Kshipra Farm',
    district: 'Indore',
    state: 'Madhya Pradesh',
    distanceKm: 11,
    crop: 'Soybean & Chana',
    cropHi: 'सोयाबीन एवं चना दाल',
    variety: 'Desi Chana & Grade-A Soybean',
    packageSizes: ['50 kg Bag', '100 kg (1 Quintal)'],
    defaultPackage: '50 kg Bag',
    pricePerKg: 58,
    pricePerQuintal: 5800,
    pricePer50kg: 2900,
    minOrderQtyKg: 50,
    availableQtyQuintals: 40,
    qualityGrade: 'Sun-Dried Natural Pulse',
    deliveryOptions: ['Farm Gate Pickup', 'Delivery on Orders > 1 Quintal'],
    description: 'Fresh 2026 harvest high-protein Desi Chana and Soybean for households, poultry, and local food businesses. Clean and ready to cook or mill.',
    rating: 4.7,
    reviewsCount: 29,
    verifiedFarmer: true,
    harvestDate: 'April 2026',
    imagePlaceholder: 'seed',
    accentColor: '#2E7D32',
  },
  {
    id: 'b2c_prod_5',
    farmerId: 'farmer_baldev',
    farmerName: 'Baldev Singh Dhillon',
    farmerPhone: '+91 98765 11029',
    farmerVillage: 'Nilokheri Agri Zone',
    district: 'Karnal',
    state: 'Haryana',
    distanceKm: 6,
    crop: 'Desi Shakkar & Jaggery',
    cropHi: 'देसी खांड एवं गुड़ (Organic)',
    variety: 'Organic Sugarcane Gur (Chemical-Free)',
    packageSizes: ['25 kg Bucket', '50 kg Box', '100 kg (1 Quintal)'],
    defaultPackage: '25 kg Bucket',
    pricePerKg: 62,
    pricePerQuintal: 6200,
    pricePer50kg: 3100,
    minOrderQtyKg: 25,
    availableQtyQuintals: 18,
    qualityGrade: 'Zero Chemicals / Certified Organic',
    deliveryOptions: ['Doorstep Delivery within 20 km', 'Farm Gate Pickup'],
    description: 'Traditional kolhu-processed organic jaggery made with natural bhendi okra clarifying agent. Pure golden goodness for families and sweetmakers.',
    rating: 5.0,
    reviewsCount: 45,
    verifiedFarmer: true,
    harvestDate: 'March 2026',
    imagePlaceholder: 'leaf',
    accentColor: '#8D6E63',
  },
  {
    id: 'b2c_prod_6',
    farmerId: 'farmer_rameshwar',
    farmerName: 'Babulal Meena',
    farmerPhone: '+91 94142 99012',
    farmerVillage: 'Kota Rural APMC Belt',
    district: 'Kota',
    state: 'Rajasthan',
    distanceKm: 22,
    crop: 'Garlic & Onion',
    cropHi: 'देसी लहसुन एवं प्याज',
    variety: 'Bold Clove Ooty Garlic & Red Onion',
    packageSizes: ['25 kg Net Bag', '50 kg Bag', '100 kg (1 Quintal)'],
    defaultPackage: '50 kg Bag',
    pricePerKg: 110,
    pricePerQuintal: 11000,
    pricePer50kg: 5500,
    minOrderQtyKg: 25,
    availableQtyQuintals: 25,
    qualityGrade: 'Grade-A Bold Dry Clove',
    deliveryOptions: ['Farm Gate Pickup', 'Mandi Transporter Booking'],
    description: 'Dry cured garlic and onions with 4+ months shelf life. Directly purchase in 50kg or 100kg bags for restaurants, grocery shops, or large families.',
    rating: 4.85,
    reviewsCount: 31,
    verifiedFarmer: true,
    harvestDate: 'April 2026',
    imagePlaceholder: 'sprout',
    accentColor: '#6A1B9A',
  },
];

/**
 * Initial Simulated Farmer-Customer Conversations
 */
export const INITIAL_B2C_CHATS = [
  {
    id: 'chat_ramesh_wheat_01',
    produceId: 'b2c_prod_1',
    farmerId: 'farmer_ramesh',
    farmerName: 'Rameshwar Patil',
    farmerPhone: '+91 98220 55190',
    farmerVillage: 'Pimpalgaon Baswant, Nashik',
    buyerId: 'buyer_default',
    buyerName: 'Amit Sharma',
    buyerPhone: '+91 98230 44100',
    cropName: 'Sharbati Wheat',
    cropNameHi: 'शरबती गेहूं (Sharbati)',
    dealQuantity: '1 Quintal (100 kg)',
    dealPrice: '₹3,400',
    status: 'Active',
    lastMessage: 'हां जी भाई साहब, 1 क्विंटल की दो 50-50 kg की बोरियां तैयार हैं। कल सुबह पिकअप कर सकते हैं।',
    lastUpdated: '2026-11-25T05:10:00Z',
    messages: [
      {
        id: 'msg_1',
        sender: 'buyer',
        senderName: 'Amit Sharma',
        text: 'नमस्ते रामेश्वर जी, क्या शरबती गेहूं 1 क्विंटल (100 kg) मिल जाएगा? घर के इस्तेमाल के लिए चाहिए।',
        timestamp: '2026-11-25T04:45:00Z',
      },
      {
        id: 'msg_2',
        sender: 'farmer',
        senderName: 'Rameshwar Patil',
        text: 'राम राम अमित भाई! बिलकुल उपलब्ध है। हमारे खेत का सीधा एमपी शरबती गेहूं है, तीन बार छना हुआ और बिना किसी कंकड़-धूल के।',
        timestamp: '2026-11-25T04:48:00Z',
      },
      {
        id: 'msg_3',
        sender: 'buyer',
        senderName: 'Amit Sharma',
        text: 'रेट क्या पड़ेगा 100 kg का? और क्या आप घर पर डिलीवर कर देंगे या फार्म से पिकअप करना होगा?',
        timestamp: '2026-11-25T04:55:00Z',
      },
      {
        id: 'msg_4',
        sender: 'farmer',
        senderName: 'Rameshwar Patil',
        text: '1 क्विंटल का ₹3,400 (₹34/kg) पड़ेगा। अगर आप हमारे फार्म (पिंपलगांव, 8 किमी) से लेंगे तो तुरंत लोड करवा देंगे। अगर घर भिजवाना है तो छोटा टैंपो ₹200 में छोड़ देगा।',
        timestamp: '2026-11-25T05:02:00Z',
      },
      {
        id: 'msg_5',
        sender: 'buyer',
        senderName: 'Amit Sharma',
        text: 'बहुत बढ़िया! क्या 50-50 kg के 2 कट्टे तैयार हैं? मैं कल सुबह फार्म पर ही आकर ले जाऊंगा।',
        timestamp: '2026-11-25T05:07:00Z',
      },
      {
        id: 'msg_6',
        sender: 'farmer',
        senderName: 'Rameshwar Patil',
        text: 'हां जी भाई साहब, 1 क्विंटल की दो 50-50 kg की बोरियां तैयार हैं। कल सुबह पिकअप कर सकते हैं।',
        timestamp: '2026-11-25T05:10:00Z',
      },
    ],
  },
  {
    id: 'chat_gurpreet_rice_02',
    produceId: 'b2c_prod_2',
    farmerId: 'farmer_gurpreet',
    farmerName: 'Sardar Gurpreet Singh',
    farmerPhone: '+91 98141 22910',
    farmerVillage: 'Raikot Farm, Ludhiana',
    buyerId: 'buyer_default',
    buyerName: 'Sunita Verma',
    buyerPhone: '+91 98721 88301',
    cropName: 'Pusa 1121 Basmati Rice',
    cropNameHi: 'पूसा 1121 बासमती चावल',
    dealQuantity: '50 kg Bag',
    dealPrice: '₹4,250',
    status: 'Active',
    lastMessage: 'Ji bilkul, sample photo bhej di hai. 50 kg bag kal dispatch ho jayega.',
    lastUpdated: '2026-11-25T04:30:00Z',
    messages: [
      {
        id: 'msg_g1',
        sender: 'buyer',
        senderName: 'Sunita Verma',
        text: 'Sat Sri Akal Gurpreet ji! Is 50 kg Pusa 1121 Basmati available for household delivery?',
        timestamp: '2026-11-25T04:15:00Z',
      },
      {
        id: 'msg_g2',
        sender: 'farmer',
        senderName: 'Sardar Gurpreet Singh',
        text: 'Sat Sri Akal ji! Haanji, 2-year aged pure 1121 Basmati hai, bilkul khushbudaar aur lamba daana. 50 kg sealed bag ₹4,250.',
        timestamp: '2026-11-25T04:22:00Z',
      },
      {
        id: 'msg_g3',
        sender: 'farmer',
        senderName: 'Sardar Gurpreet Singh',
        text: 'Ji bilkul, sample photo bhej di hai. 50 kg bag kal dispatch ho jayega.',
        timestamp: '2026-11-25T04:30:00Z',
      },
    ],
  },
];

/**
 * Get all B2C listings from cache or initialize
 */
export async function getB2CListings(filters = {}) {
  try {
    const raw = await AsyncStorage.getItem(B2C_LISTINGS_STORAGE_KEY);
    let listings = raw ? JSON.parse(raw) : null;
    if (!listings || listings.length === 0) {
      listings = INITIAL_B2C_LISTINGS;
      await AsyncStorage.setItem(B2C_LISTINGS_STORAGE_KEY, JSON.stringify(listings));
    }

    // Apply filters
    let result = [...listings];
    if (filters.crop && filters.crop !== 'All') {
      const q = filters.crop.toLowerCase();
      result = result.filter((item) => item.crop.toLowerCase().includes(q) || item.cropHi.toLowerCase().includes(q));
    }
    if (filters.packageSize && filters.packageSize !== 'All') {
      result = result.filter((item) =>
        item.packageSizes.some((s) => s.toLowerCase().includes(filters.packageSize.toLowerCase()))
      );
    }
    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.crop.toLowerCase().includes(q) ||
          item.variety.toLowerCase().includes(q) ||
          item.farmerName.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q)
      );
    }
    return result;
  } catch (error) {
    console.error('getB2CListings error:', error);
    return INITIAL_B2C_LISTINGS;
  }
}

/**
 * Add a new B2C produce listing by Farmer
 */
export async function addB2CListing(listing) {
  try {
    const listings = await getB2CListings();
    const newListing = {
      id: `b2c_${Date.now()}`,
      verifiedFarmer: true,
      rating: 5.0,
      reviewsCount: 1,
      createdAt: new Date().toISOString(),
      ...listing,
    };
    const updated = [newListing, ...listings];
    await AsyncStorage.setItem(B2C_LISTINGS_STORAGE_KEY, JSON.stringify(updated));
    return newListing;
  } catch (error) {
    console.error('addB2CListing error:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user (either buyer or farmer)
 */
export async function getB2CConversations(userId = null) {
  try {
    const raw = await AsyncStorage.getItem(B2C_CHATS_STORAGE_KEY);
    let chats = raw ? JSON.parse(raw) : null;
    if (!chats || chats.length === 0) {
      chats = INITIAL_B2C_CHATS;
      await AsyncStorage.setItem(B2C_CHATS_STORAGE_KEY, JSON.stringify(chats));
    }
    return chats;
  } catch (error) {
    console.error('getB2CConversations error:', error);
    return INITIAL_B2C_CHATS;
  }
}

/**
 * Get or initiate a conversation between buyer and farmer for a specific B2C produce lot
 */
export async function getOrCreateConversation({ produce, buyer, initialQuantity = '50 kg Bag' }) {
  try {
    const chats = await getB2CConversations();
    const existing = chats.find(
      (c) => c.produceId === produce.id && (c.buyerId === buyer?.uid || c.farmerId === produce.farmerId)
    );

    if (existing) {
      return existing;
    }

    const calculatedPrice = initialQuantity.includes('100') || initialQuantity.includes('Quintal')
      ? `₹${produce.pricePerQuintal.toLocaleString('en-IN')}`
      : `₹${produce.pricePer50kg.toLocaleString('en-IN')}`;

    const newChat = {
      id: `chat_${produce.id}_${Date.now()}`,
      produceId: produce.id,
      farmerId: produce.farmerId,
      farmerName: produce.farmerName,
      farmerPhone: produce.farmerPhone,
      farmerVillage: `${produce.farmerVillage}, ${produce.district}`,
      buyerId: buyer?.uid || 'buyer_current',
      buyerName: buyer?.fullName || 'Customer',
      buyerPhone: buyer?.mobile || '+91 98000 12345',
      cropName: produce.crop,
      cropNameHi: produce.cropHi,
      dealQuantity: initialQuantity,
      dealPrice: calculatedPrice,
      status: 'Active',
      lastMessage: `नमस्ते ${produce.farmerName} जी, मुझे ${produce.crop} के बारे में जानकारी चाहिए।`,
      lastUpdated: new Date().toISOString(),
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: 'buyer',
          senderName: buyer?.fullName || 'Customer',
          text: `नमस्ते ${produce.farmerName} जी! मुझे आपके खेत का ${produce.crop} (${produce.variety}) खरीदना है। क्या ${initialQuantity} उपलब्ध है?`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updated = [newChat, ...chats];
    await AsyncStorage.setItem(B2C_CHATS_STORAGE_KEY, JSON.stringify(updated));
    return newChat;
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    return INITIAL_B2C_CHATS[0];
  }
}

/**
 * Send a message in a conversation and optionally simulate instant realistic farmer reply
 */
export async function sendB2CMessage(conversationId, text, senderRole = 'buyer', senderName = 'Customer') {
  try {
    const chats = await getB2CConversations();
    const chatIndex = chats.findIndex((c) => c.id === conversationId);
    if (chatIndex === -1) return null;

    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: senderRole,
      senderName: senderName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    chats[chatIndex].messages.push(newMessage);
    chats[chatIndex].lastMessage = text.trim();
    chats[chatIndex].lastUpdated = new Date().toISOString();

    await AsyncStorage.setItem(B2C_CHATS_STORAGE_KEY, JSON.stringify(chats));

    return {
      updatedChat: chats[chatIndex],
      sentMessage: newMessage,
    };
  } catch (error) {
    console.error('sendB2CMessage error:', error);
    throw error;
  }
}

/**
 * Intelligent instant reply simulator from the Indian farmer
 */
export function generateFarmerReplyText(userMessage, cropName, farmerName) {
  const msg = (userMessage || '').toLowerCase();
  
  if (msg.includes('rate') || msg.includes('price') || msg.includes('bhav') || msg.includes('kam') || msg.includes('discount')) {
    return `राम राम जी! भाव बिल्कुल सही और थोक (farm-gate) लगाया है। अगर आप 1 क्विंटल (100 kg) या 2 बोरी लेते हैं, तो ₹100-₹150 का डिस्काउंट हो जाएगा। माल 100% खरा है।`;
  }
  if (msg.includes('delivery') || msg.includes('ghar') || msg.includes('bhejna') || msg.includes('transport') || msg.includes('kahan')) {
    return `जी, आप हमारे खेत पर आकर भी देख सकते हैं या 15-20 किमी के अंदर हम लोकल पिकअप ऑटो/टैंपो से आपके पते पर भिजवा सकते हैं। भाड़ा नाममात्र रहेगा।`;
  }
  if (msg.includes('quality') || msg.includes('sample') || msg.includes('photo') || msg.includes('shudh') || msg.includes('organic')) {
    return `बिल्कुल बेफिक्र रहें! फसल पूरी तरह से पकी हुई और मशीन से साफ की हुई है। इसमें कोई कंकड़ या केमिकल नहीं है। आप चाहें तो पहले 25 kg या 50 kg का सैंपल कट्टा ले सकते हैं।`;
  }
  if (msg.includes('available') || msg.includes('hai kya') || msg.includes('chahiye') || msg.includes('quintal') || msg.includes('kg')) {
    return `हां जी, ${cropName} का नया ताज़ा लॉट तैयार है! 50 kg और 100 kg (1 क्विंटल) दोनों पैकिंग में उपलब्ध है। आप जब चाहें बता दें, हम कट्टे पैक करवा देंगे।`;
  }
  
  return `नमस्ते जी! आपके संदेश के लिए धन्यवाद। मैं ${farmerName} बात कर रहा हूँ। बताइए आपको कितने कट्टे (50 kg / 1 क्विंटल) चाहिए और कब तक आवश्यकता है?`;
}
