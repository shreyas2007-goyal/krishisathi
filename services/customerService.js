// services/customerService.js
// KisanSAATHI - Customer / Buyer Agricultural Sourcing & Offers Service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';

const PRODUCE_STORAGE_KEY = '@kisansaathi_produce_listings';
const OFFERS_STORAGE_KEY = '@kisansaathi_buyer_offers';

// Seed Initial Verified Farmer Produce Listings across India
export const INITIAL_PRODUCE_LISTINGS = [
  {
    id: 'prod_1',
    farmerId: 'farmer_001',
    farmerName: 'Sardar Gurpreet Singh',
    farmerPhone: '+91 98141 22910',
    village: 'Raikot',
    district: 'Ludhiana',
    state: 'Punjab',
    crop: 'Wheat',
    variety: 'HD-3086 (Sharbati Gold)',
    quantityQuintals: 150,
    minPricePerQuintal: 2500,
    expectedPricePerQuintal: 2620,
    harvestDate: '2026-04-10',
    qualityGrade: 'Grade A (Moisture < 11.5%)',
    verifiedFarmer: true,
    description: 'Direct farm harvest. Cleaned, graded, and bag-packed at farm warehouse. Ready for inspection.',
    createdAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'prod_2',
    farmerId: 'farmer_002',
    farmerName: 'Chaudhary Dharamvir',
    farmerPhone: '+91 94160 33812',
    village: 'Nilokheri',
    district: 'Karnal',
    state: 'Haryana',
    crop: 'Paddy / Basmati',
    variety: 'Pusa 1121 Extra Long',
    quantityQuintals: 200,
    minPricePerQuintal: 3800,
    expectedPricePerQuintal: 4100,
    harvestDate: '2026-03-25',
    qualityGrade: 'Super Export Grade',
    verifiedFarmer: true,
    description: 'Export quality aromatic paddy with zero chemical residue. Moisture measured at 12%.',
    createdAt: '2026-04-12T14:30:00Z',
  },
  {
    id: 'prod_3',
    farmerId: 'farmer_003',
    farmerName: 'Mukesh Patidar',
    farmerPhone: '+91 97555 44910',
    village: 'Sanwer',
    district: 'Indore',
    state: 'Madhya Pradesh',
    crop: 'Soybean',
    variety: 'JS-9560 High Oil',
    quantityQuintals: 120,
    minPricePerQuintal: 4400,
    expectedPricePerQuintal: 4650,
    harvestDate: '2026-04-01',
    qualityGrade: 'FAQ Grade',
    verifiedFarmer: true,
    description: 'Sun-dried premium yellow soybean, ideal for solvent extraction and seed processing.',
    createdAt: '2026-04-16T09:15:00Z',
  },
  {
    id: 'prod_4',
    farmerId: 'farmer_004',
    farmerName: 'Kailash Choudhary',
    farmerPhone: '+91 94140 88201',
    village: 'Bassi',
    district: 'Jaipur',
    state: 'Rajasthan',
    crop: 'Mustard',
    variety: 'Pusa Bold High Pungency',
    quantityQuintals: 80,
    minPricePerQuintal: 5400,
    expectedPricePerQuintal: 5750,
    harvestDate: '2026-04-05',
    qualityGrade: 'Grade A (Oil content 41.5%)',
    verifiedFarmer: true,
    description: 'Laboratory tested 41.5% oil yield. Machine cleaned and ready for immediate mill loading.',
    createdAt: '2026-04-14T11:45:00Z',
  },
  {
    id: 'prod_5',
    farmerId: 'farmer_005',
    farmerName: 'Rameshwar Patil',
    farmerPhone: '+91 98220 55190',
    village: 'Dindori',
    district: 'Nashik',
    state: 'Maharashtra',
    crop: 'Onion',
    variety: 'Garwa Red Top Quality',
    quantityQuintals: 300,
    minPricePerQuintal: 2400,
    expectedPricePerQuintal: 2750,
    harvestDate: '2026-04-18',
    qualityGrade: 'Medium Big Size (50-60mm)',
    verifiedFarmer: true,
    description: 'Excellent shelf-life red onion stored in aerated chawl. 0% rotting, suitable for long distance dispatch.',
    createdAt: '2026-04-18T08:00:00Z',
  },
];

// Seed Initial Buyer Purchase Offers
export const INITIAL_BUYER_OFFERS = [
  {
    id: 'off_001',
    buyerId: 'buyer_itc',
    buyerName: 'ITC Agri Business Division',
    produceId: 'prod_1',
    crop: 'Wheat',
    variety: 'HD-3086 (Sharbati Gold)',
    farmerName: 'Sardar Gurpreet Singh',
    farmerPhone: '+91 98141 22910',
    location: 'Ludhiana, Punjab',
    offeredPricePerQuintal: 2640,
    quantityQuintals: 100,
    totalAmount: 264000,
    paymentTerms: 'Direct NEFT/RTGS within 24 hours of gate weighment',
    deliveryTerms: 'Farmer to dispatch at ITC Moga Collection Hub (Subsidy: ₹500/truck provided)',
    status: 'Accepted',
    createdAt: '2026-04-17T12:00:00Z',
  },
  {
    id: 'off_002',
    buyerId: 'buyer_itc',
    buyerName: 'ITC Agri Business Division',
    produceId: 'prod_2',
    crop: 'Paddy / Basmati',
    variety: 'Pusa 1121 Extra Long',
    farmerName: 'Chaudhary Dharamvir',
    farmerPhone: '+91 94160 33812',
    location: 'Karnal, Haryana',
    offeredPricePerQuintal: 4150,
    quantityQuintals: 150,
    totalAmount: 622500,
    paymentTerms: 'e-NAM linked Escrow payment within 12 hours',
    deliveryTerms: 'Mill gate delivery at Taraori Basmati Complex',
    status: 'Pending',
    createdAt: '2026-04-18T16:30:00Z',
  },
];

/**
 * Fetch all available farmer produce listings
 */
export async function getProduceListings({ crop = '', state = '', maxPrice = null } = {}) {
  try {
    const raw = await AsyncStorage.getItem(PRODUCE_STORAGE_KEY);
    let listings = raw ? JSON.parse(raw) : INITIAL_PRODUCE_LISTINGS;

    if (!raw) {
      await AsyncStorage.setItem(PRODUCE_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCE_LISTINGS));
    }

    if (crop && crop !== 'All Crops') {
      listings = listings.filter((l) => l.crop.toLowerCase().includes(crop.toLowerCase()));
    }
    if (state && state !== 'All States') {
      listings = listings.filter((l) => l.state.toLowerCase() === state.toLowerCase());
    }
    if (maxPrice) {
      listings = listings.filter((l) => l.expectedPricePerQuintal <= maxPrice);
    }

    return listings;
  } catch (e) {
    console.warn('Error loading produce listings', e);
    return INITIAL_PRODUCE_LISTINGS;
  }
}

/**
 * Submit a Purchase Offer for a produce listing
 */
export async function submitPurchaseOffer({
  buyerId,
  buyerName,
  produceId,
  crop,
  variety,
  farmerName,
  farmerPhone,
  location,
  offeredPricePerQuintal,
  quantityQuintals,
  paymentTerms,
  deliveryTerms,
}) {
  const newOffer = {
    id: 'off_' + Date.now(),
    buyerId,
    buyerName,
    produceId,
    crop,
    variety,
    farmerName,
    farmerPhone,
    location,
    offeredPricePerQuintal: Number(offeredPricePerQuintal),
    quantityQuintals: Number(quantityQuintals),
    totalAmount: Number(offeredPricePerQuintal) * Number(quantityQuintals),
    paymentTerms: paymentTerms || 'Direct Bank Transfer within 24 hours of weighment',
    deliveryTerms: deliveryTerms || 'Mill Gate / Yard Delivery',
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = await AsyncStorage.getItem(OFFERS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : INITIAL_BUYER_OFFERS;
    const updated = [newOffer, ...existing];
    await AsyncStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(updated));

    // Also write to Firestore if available
    try {
      await addDoc(collection(db, 'buyerOffers'), {
        ...newOffer,
        createdAt: serverTimestamp(),
      });
    } catch (fsErr) {
      // Offline fallback persisted
    }

    return newOffer;
  } catch (e) {
    console.error('Failed to submit purchase offer', e);
    throw e;
  }
}

/**
 * Get offers submitted by this buyer or received by farmer
 */
export async function getBuyerOffers(buyerId = null) {
  try {
    const raw = await AsyncStorage.getItem(OFFERS_STORAGE_KEY);
    let offers = raw ? JSON.parse(raw) : INITIAL_BUYER_OFFERS;

    if (!raw) {
      await AsyncStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(INITIAL_BUYER_OFFERS));
    }

    if (buyerId) {
      offers = offers.filter((o) => o.buyerId === buyerId || o.buyerId === 'buyer_itc');
    }

    return offers;
  } catch (e) {
    console.warn('Failed to load buyer offers', e);
    return INITIAL_BUYER_OFFERS;
  }
}

/**
 * Update Offer Status (Accepted, Rejected, Withdrawn)
 */
export async function updateOfferStatus(offerId, status) {
  try {
    const raw = await AsyncStorage.getItem(OFFERS_STORAGE_KEY);
    const offers = raw ? JSON.parse(raw) : INITIAL_BUYER_OFFERS;
    const updated = offers.map((o) => (o.id === offerId ? { ...o, status } : o));
    await AsyncStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.warn('Failed to update offer status', e);
    return false;
  }
}
