// services/mandiService.js
// KisanSAATHI - Mandi Owner & APMC Market Administration Service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const MANDI_PRICES_KEY = '@kisansaathi_mandi_published_prices';
const MANDI_ENQUIRIES_KEY = '@kisansaathi_mandi_enquiries';

// Initial Published Mandi Rates for Mandi Owner
export const INITIAL_MANDI_COMMODITIES = [
  {
    id: 'mcomm_1',
    commodity: 'Wheat (गेहूं)',
    variety: 'Sharbati / Mill Quality',
    minPrice: 2450,
    maxPrice: 2680,
    modalPrice: 2570,
    dailyArrivalTons: 1250,
    unit: '₹ / Quintal',
    lastUpdated: '2026-04-18',
    status: 'Official Published',
  },
  {
    id: 'mcomm_2',
    commodity: 'Basmati Paddy (धान)',
    variety: 'Pusa 1121 Extra Long',
    minPrice: 3850,
    maxPrice: 4250,
    modalPrice: 4120,
    dailyArrivalTons: 820,
    unit: '₹ / Quintal',
    lastUpdated: '2026-04-18',
    status: 'Official Published',
  },
  {
    id: 'mcomm_3',
    commodity: 'Mustard (सरसों)',
    variety: 'Bold Black (41% Oil)',
    minPrice: 5350,
    maxPrice: 5800,
    modalPrice: 5650,
    dailyArrivalTons: 450,
    unit: '₹ / Quintal',
    lastUpdated: '2026-04-18',
    status: 'Official Published',
  },
  {
    id: 'mcomm_4',
    commodity: 'Gram / Chana (चना)',
    variety: 'Desi Chana Medium',
    minPrice: 5800,
    maxPrice: 6250,
    modalPrice: 6050,
    dailyArrivalTons: 310,
    unit: '₹ / Quintal',
    lastUpdated: '2026-04-18',
    status: 'Official Published',
  },
];

// Initial Enquiries for Mandi Owner
export const INITIAL_MANDI_ENQUIRIES = [
  {
    id: 'enq_1',
    senderType: 'Farmer',
    senderName: 'Sardar Jagjit Singh',
    senderPhone: '+91 98765 11029',
    commodity: 'Wheat',
    quantity: '300 Quintals',
    message: 'Bringing 3 trolleys tomorrow morning. Please confirm shed allocation and moisture check time.',
    date: 'Today, 09:30 AM',
    status: 'New',
  },
  {
    id: 'enq_2',
    senderType: 'Buyer',
    senderName: 'Patanjali Food Park Procurement',
    senderPhone: '+91 94140 22910',
    commodity: 'Mustard',
    quantity: '500 Quintals',
    message: 'Seeking bulk direct auction allotment for oil mill requirement. Can we participate in tomorrow e-auction?',
    date: 'Yesterday, 04:15 PM',
    status: 'Responded',
  },
];

/**
 * Fetch Mandi Published Commodities
 */
export async function getMandiCommodities() {
  try {
    const raw = await AsyncStorage.getItem(MANDI_PRICES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(MANDI_PRICES_KEY, JSON.stringify(INITIAL_MANDI_COMMODITIES));
      return INITIAL_MANDI_COMMODITIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MANDI_COMMODITIES;
  }
}

/**
 * Publish or update Mandi APMC Prices
 */
export async function publishMandiPrice({
  commodity,
  variety,
  minPrice,
  maxPrice,
  modalPrice,
  dailyArrivalTons,
  mandiName,
}) {
  const newRecord = {
    id: 'mcomm_' + Date.now(),
    commodity,
    variety: variety || 'FAQ Standard',
    minPrice: Number(minPrice),
    maxPrice: Number(maxPrice),
    modalPrice: Number(modalPrice),
    dailyArrivalTons: Number(dailyArrivalTons || 100),
    unit: '₹ / Quintal',
    lastUpdated: new Date().toISOString().split('T')[0],
    status: 'Official Published',
    mandiName,
  };

  try {
    const raw = await AsyncStorage.getItem(MANDI_PRICES_KEY);
    const existing = raw ? JSON.parse(raw) : INITIAL_MANDI_COMMODITIES;
    
    // Replace if same commodity or prepend
    const idx = existing.findIndex((c) => c.commodity.toLowerCase() === commodity.toLowerCase());
    let updated;
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...newRecord };
      updated = [...existing];
    } else {
      updated = [newRecord, ...existing];
    }

    await AsyncStorage.setItem(MANDI_PRICES_KEY, JSON.stringify(updated));

    // Also write to Firestore if available
    try {
      await addDoc(collection(db, 'mandiPriceSubmissions'), {
        ...newRecord,
        createdAt: serverTimestamp(),
      });
    } catch (fsErr) {
      // Offline fallback persisted
    }

    return newRecord;
  } catch (e) {
    console.error('Failed to publish mandi price', e);
    throw e;
  }
}

/**
 * Get Enquiries for Mandi Owner
 */
export async function getMandiEnquiries() {
  try {
    const raw = await AsyncStorage.getItem(MANDI_ENQUIRIES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(MANDI_ENQUIRIES_KEY, JSON.stringify(INITIAL_MANDI_ENQUIRIES));
      return INITIAL_MANDI_ENQUIRIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MANDI_ENQUIRIES;
  }
}
