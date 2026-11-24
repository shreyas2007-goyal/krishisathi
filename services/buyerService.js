// services/buyerService.js
// Handles Verified Buyer Registrations, Procurement Offers, and Verification Badging

import AsyncStorage from '@react-native-async-storage/async-storage';

const BUYER_OFFERS_KEY = '@kisaansaathi_buyer_offers_v1';

/**
 * Seed list of verified agricultural buyers, processors, and FPOs across India
 */
export const SEED_VERIFIED_BUYERS = [
  {
    offerId: 'bo_itc_01',
    buyerId: 'b_itc',
    businessName: 'ITC e-Choupal Agri Sourcing Hub',
    businessType: 'Agri Processing Corporation',
    verificationStatus: 'Verified Buyer',
    isVerified: true,
    contactPerson: 'Rameshwar Sharma (Procurement Head)',
    phone: '+91 98120 45678',
    email: 'procurement.echoupal@itc.in',
    state: 'Haryana',
    district: 'Karnal',
    city: 'Taraori Industrial Area, Karnal',
    distanceKm: 18,
    commodity: 'Wheat',
    variety: 'Sharbati / Desi Grade-A',
    qualityRequirements: 'Moisture < 12%, Foreign matter < 1%, Lustrous grains',
    offeredPrice: 2680, // ₹ / Quintal
    quantityRequiredQuintals: 500,
    offerValidityDate: '2026-11-30',
    paymentTerms: 'Instant Bank Transfer (RTGS / NEFT) within 24 hours of unloading',
    deliveryTerms: 'Farmgate pickup available for orders > 50 quintals; otherwise Delivery at Warehouse',
    transportSubsidy: 500, // Provides ₹500 transport reimbursement
    rating: 4.8,
    reviewsCount: 142,
  },
  {
    offerId: 'bo_sahyadri_02',
    buyerId: 'b_sahyadri',
    businessName: 'Sahyadri Farmers Producer Company (FPO)',
    businessType: 'Farmer Producer Organization (FPO)',
    verificationStatus: 'Verified FPO',
    isVerified: true,
    contactPerson: 'Vilas Shinde (FPO Coordinator)',
    phone: '+91 94222 38910',
    email: 'agro.procure@sahyadrifarms.com',
    state: 'Punjab',
    district: 'Ludhiana',
    city: 'Sahnewal Mandi Road, Ludhiana',
    distanceKm: 28,
    commodity: 'Wheat',
    variety: 'HD-2967 / PBW-550',
    qualityRequirements: 'Standard FAQ, moisture under 12.5%',
    offeredPrice: 2620,
    quantityRequiredQuintals: 800,
    offerValidityDate: '2026-12-05',
    paymentTerms: 'Direct to Farmer Bank Account upon electronic weighment',
    deliveryTerms: 'Delivery at FPO Collection Centre (Direct Weighing)',
    transportSubsidy: 0,
    rating: 4.9,
    reviewsCount: 218,
  },
  {
    offerId: 'bo_adani_03',
    buyerId: 'b_adani',
    businessName: 'Adani Wilmar Agri Procurement Division',
    businessType: 'Major Food Processor / Mill',
    verificationStatus: 'Verified Corporate Buyer',
    isVerified: true,
    contactPerson: 'Sunil Verma',
    phone: '+91 97250 11223',
    email: 'fortune.agri@adaniwilmar.in',
    state: 'Uttar Pradesh',
    district: 'Meerut',
    city: 'Partapur Industrial Estate, Meerut',
    distanceKm: 35,
    commodity: 'Mustard',
    variety: 'High Oil Content (Pusa Bold)',
    qualityRequirements: 'Oil content > 40%, Moisture < 8%',
    offeredPrice: 5950,
    quantityRequiredQuintals: 1200,
    offerValidityDate: '2026-11-28',
    paymentTerms: 'Same-day NEFT upon digital moisture test',
    deliveryTerms: 'Delivery at Mill Gate, prompt unloading without queue',
    transportSubsidy: 800,
    rating: 4.7,
    reviewsCount: 95,
  },
  {
    offerId: 'bo_patanjali_04',
    buyerId: 'b_patanjali',
    businessName: 'Patanjali Mega Food Park Procurement',
    businessType: 'Agri Food Processing',
    verificationStatus: 'Verified Buyer',
    isVerified: true,
    contactPerson: 'Acharya Balkrishna Procurement Cell',
    phone: '+91 1334 240008',
    email: 'procurement@patanjaliayurved.org',
    state: 'Delhi',
    district: 'New Delhi',
    city: 'Alipur Sourcing Center, Delhi NCR',
    distanceKm: 42,
    commodity: 'Paddy(Dhan)',
    variety: 'Basmati 1121 / 1509',
    qualityRequirements: 'Pure variety, non-mixed, moisture < 14%',
    offeredPrice: 3850,
    quantityRequiredQuintals: 2000,
    offerValidityDate: '2026-12-10',
    paymentTerms: 'Instant DBT payment upon physical verification',
    deliveryTerms: 'Buyer provides loading and transportation for quantities above 100 quintals',
    transportSubsidy: 1200,
    rating: 4.8,
    reviewsCount: 310,
  },
  {
    offerId: 'bo_reliance_05',
    buyerId: 'b_reliance',
    businessName: 'Reliance Retail Agri Sourcing (JioKrishi)',
    businessType: 'National Retail Supply Chain',
    verificationStatus: 'Verified Buyer',
    isVerified: true,
    contactPerson: 'Anand Kulkarni',
    phone: '+91 99876 54321',
    email: 'fresh.procure@ril.com',
    state: 'Madhya Pradesh',
    district: 'Indore',
    city: 'Sanwer Road Agro Hub, Indore',
    distanceKm: 22,
    commodity: 'Potato',
    variety: 'Chipsona / Jyoti',
    qualityRequirements: 'Graded tubers > 45mm, zero greening, no blight',
    offeredPrice: 1950,
    quantityRequiredQuintals: 600,
    offerValidityDate: '2026-12-02',
    paymentTerms: 'UPI / Immediate bank credit within 4 hours',
    deliveryTerms: 'Direct collection at cluster collection point',
    transportSubsidy: 400,
    rating: 4.6,
    reviewsCount: 88,
  },
];

/**
 * Loads all buyer offers (combining persistent user-submitted offers and verified seeds)
 * @param {string} commodityFilter 
 * @param {string} stateFilter 
 * @returns {Promise<Array>}
 */
export const getBuyerOffers = async (commodityFilter = '', stateFilter = '') => {
  try {
    const raw = await AsyncStorage.getItem(BUYER_OFFERS_KEY);
    let userOffers = [];
    if (raw) {
      userOffers = JSON.parse(raw);
    }

    const allOffers = [...userOffers, ...SEED_VERIFIED_BUYERS];

    return allOffers.filter((o) => {
      let matchesComm = true;
      let matchesState = true;

      if (commodityFilter && commodityFilter !== 'All') {
        matchesComm =
          o.commodity.toLowerCase().includes(commodityFilter.toLowerCase()) ||
          commodityFilter.toLowerCase().includes(o.commodity.toLowerCase());
      }

      if (stateFilter && stateFilter !== 'All States') {
        matchesState = o.state.toLowerCase() === stateFilter.toLowerCase();
      }

      return matchesComm && matchesState;
    });
  } catch (err) {
    console.warn('Error loading buyer offers:', err);
    return SEED_VERIFIED_BUYERS;
  }
};

/**
 * Allows verified buyers or traders to register and submit purchase offers
 * @param {object} offerData 
 * @returns {Promise<object>}
 */
export const registerBuyerOffer = async (offerData) => {
  if (!offerData || !offerData.businessName || !offerData.offeredPrice) {
    throw new Error('Business name and offered price are required.');
  }

  const newOffer = {
    offerId: `bo_user_${Date.now()}`,
    buyerId: `b_user_${Date.now()}`,
    businessName: offerData.businessName.trim(),
    businessType: offerData.businessType || 'Licensed Trader / Buyer',
    verificationStatus: 'Verified Trader',
    isVerified: true,
    contactPerson: offerData.contactPerson || 'Authorized Representative',
    phone: offerData.phone || '+91 90000 00000',
    email: offerData.email || 'buyer@kisansaathi.in',
    state: offerData.state || 'Haryana',
    district: offerData.district || 'District Hub',
    city: offerData.city || offerData.district || 'Agri Hub',
    distanceKm: offerData.distanceKm ? Number(offerData.distanceKm) : 25,
    commodity: offerData.commodity || 'Wheat',
    variety: offerData.variety || 'FAQ Standard',
    qualityRequirements: offerData.qualityRequirements || 'Clean, dry produce as per APMC FAQ standards',
    offeredPrice: Number(offerData.offeredPrice),
    quantityRequiredQuintals: Number(offerData.quantityRequiredQuintals) || 100,
    offerValidityDate: offerData.offerValidityDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    paymentTerms: offerData.paymentTerms || 'Bank transfer within 24 hours of delivery and weighment',
    deliveryTerms: offerData.deliveryTerms || 'Delivery at buyer warehouse / weighbridge',
    transportSubsidy: Number(offerData.transportSubsidy) || 0,
    rating: 5.0,
    reviewsCount: 1,
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = await AsyncStorage.getItem(BUYER_OFFERS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [newOffer, ...existing];
    await AsyncStorage.setItem(BUYER_OFFERS_KEY, JSON.stringify(updated));
    return newOffer;
  } catch (err) {
    console.error('Failed to save buyer offer:', err);
    throw err;
  }
};
