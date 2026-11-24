// services/dealsEngine.js
// Net Selling Price & Better Deals Comparison Engine for KisanSAATHI

import { getBuyerOffers } from './buyerService';
import { fetchLiveMandiPrices, calculateDistanceKm, getDistrictCoords } from './marketService';

/**
 * Calculates realistic transportation expense based on distance and quantity
 * in the context of Indian agricultural logistics (Tractor Trolley / Mini Truck / Truck).
 * @param {number} distanceKm 
 * @param {number} quantityQuintals 
 * @returns {number}
 */
export const calculateTransportCost = (distanceKm, quantityQuintals) => {
  const dist = Math.max(Number(distanceKm) || 10, 5);
  const qty = Math.max(Number(quantityQuintals) || 10, 1);

  // If quantity fits in a tractor trolley / pickup (up to 40 quintals / 4 tons)
  if (qty <= 40) {
    const baseHire = 400; // loading/base fee
    const perKmRate = 22; // ₹22 / km return
    return Math.round(baseHire + dist * perKmRate);
  }

  // Intermediate truck / Canter (41 - 100 quintals)
  if (qty <= 100) {
    const baseHire = 750;
    const perKmRate = 32;
    return Math.round(baseHire + dist * perKmRate);
  }

  // Full commercial truck (> 100 quintals)
  const trips = Math.ceil(qty / 120);
  const baseHire = 1200 * trips;
  const perKmRate = 45 * trips;
  return Math.round(baseHire + dist * perKmRate);
};

/**
 * Evaluates and compares all Mandi benchmark prices and Verified Buyer offers
 * to find the highest gross price, lowest expense, and the absolute best NET deal.
 * 
 * Formula:
 * Net Selling Amount = Gross Selling Amount - Transportation Cost - Mandi Charges + Subsidies
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
export const computeBetterDeals = async ({
  commodity = 'Wheat',
  variety = 'Standard',
  quantity = 50, // default 50 quintals
  farmerLat = null,
  farmerLon = null,
  farmerState = '',
  farmerDistrict = '',
  maxDistanceKm = 150,
}) => {
  const qty = Number(quantity) || 50;

  // 1. Fetch live mandi benchmark records
  const mandiPrices = await fetchLiveMandiPrices({
    commodity,
    state: farmerState,
    district: farmerDistrict,
    farmerLat,
    farmerLon,
  });

  // 2. Fetch verified buyer offers
  const buyerOffers = await getBuyerOffers(commodity, farmerState);

  const candidateDeals = [];

  // A. Process Mandi Deals
  mandiPrices.forEach((m) => {
    let dist = m.distanceKm;
    if (dist === null || dist === undefined) {
      const coords = getDistrictCoords(m.district, m.state);
      if (farmerLat && farmerLon && coords) {
        dist = calculateDistanceKm(farmerLat, farmerLon, coords.lat, coords.lon);
      } else {
        dist = 30; // fallback default reasonable distance
      }
    }

    if (maxDistanceKm && dist > maxDistanceKm) return;

    const grossPrice = m.modalPrice;
    const grossTotal = grossPrice * qty;
    const transport = calculateTransportCost(dist, qty);
    // Mandi fee / cess (approx 1.5% of value + weighment ₹10/quintal)
    const mandiCharges = Math.round(grossTotal * 0.015 + qty * 10);
    const netTotal = grossTotal - transport - mandiCharges;
    const netEffectivePerQuintal = Math.round(netTotal / qty);

    candidateDeals.push({
      id: `deal_mandi_${m.id}`,
      type: 'mandi',
      name: m.market,
      entityType: 'APMC Government Mandi',
      district: m.district,
      state: m.state,
      distanceKm: dist,
      grossPricePerQuintal: grossPrice,
      grossTotal,
      transportCost: transport,
      mandiCharges,
      transportSubsidy: 0,
      netTotal,
      netEffectivePerQuintal,
      isVerified: true,
      verificationLabel: 'APMC Regulated',
      reportingDate: m.reportingDate,
      paymentTerms: 'Payment via APMC licensed commission agent / e-NAM DBT',
      deliveryTerms: 'Farmer brings produce to Mandi Auction yard',
      qualityTerms: m.grade || 'FAQ Standard',
      contactInfo: 'District Agricultural Marketing Board / Mandi Secretary',
    });
  });

  // B. Process Verified Buyer Deals
  buyerOffers.forEach((b) => {
    let dist = b.distanceKm || 35;
    if (farmerLat && farmerLon) {
      const coords = getDistrictCoords(b.district, b.state);
      if (coords) {
        dist = calculateDistanceKm(farmerLat, farmerLon, coords.lat, coords.lon);
      }
    }

    if (maxDistanceKm && dist > maxDistanceKm) return;

    const grossPrice = b.offeredPrice;
    const grossTotal = grossPrice * qty;
    const transport = calculateTransportCost(dist, qty);
    // Direct buyer procurement usually has NO mandi cess for the farmer!
    const mandiCharges = 0;
    const subsidy = b.transportSubsidy || 0;
    const netTotal = grossTotal - transport - mandiCharges + subsidy;
    const netEffectivePerQuintal = Math.round(netTotal / qty);

    candidateDeals.push({
      id: `deal_buyer_${b.offerId}`,
      type: 'buyer',
      name: b.businessName,
      entityType: b.businessType,
      district: b.district,
      state: b.state,
      distanceKm: dist,
      grossPricePerQuintal: grossPrice,
      grossTotal,
      transportCost: transport,
      mandiCharges,
      transportSubsidy: subsidy,
      netTotal,
      netEffectivePerQuintal,
      isVerified: true,
      verificationLabel: b.verificationStatus || 'Verified Buyer',
      reportingDate: b.offerValidityDate,
      paymentTerms: b.paymentTerms,
      deliveryTerms: b.deliveryTerms,
      qualityTerms: b.qualityRequirements,
      contactPerson: b.contactPerson,
      phone: b.phone,
      email: b.email,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
    });
  });

  // Sort candidate deals by NET REALIZATION amount descending
  candidateDeals.sort((a, b) => b.netTotal - a.netTotal);

  // Identify Best Deal
  const bestDeal = candidateDeals.length > 0 ? candidateDeals[0] : null;

  // Identify baseline (lowest net or average mandi deal) to compute profit advantage
  const mandiDealsOnly = candidateDeals.filter((d) => d.type === 'mandi');
  const baselineDeal =
    mandiDealsOnly.length > 0
      ? mandiDealsOnly[mandiDealsOnly.length - 1]
      : candidateDeals[candidateDeals.length - 1] || null;

  const netAdvantage =
    bestDeal && baselineDeal ? Math.max(bestDeal.netTotal - baselineDeal.netTotal, 0) : 0;

  // Identify highest gross price and lowest transport expense for analytics
  const highestGross = candidateDeals.reduce((max, d) => Math.max(max, d.grossPricePerQuintal), 0);
  const lowestTransport = candidateDeals.reduce(
    (min, d) => Math.min(min, d.transportCost),
    Infinity
  );

  return {
    commodity,
    quantity: qty,
    deals: candidateDeals,
    bestDeal,
    baselineDeal,
    netAdvantage,
    highestGrossPrice: highestGross,
    lowestTransportExpense: lowestTransport === Infinity ? 0 : lowestTransport,
    totalDealsFound: candidateDeals.length,
    evaluatedAt: new Date().toISOString(),
  };
};
