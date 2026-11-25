// services/scraperService.js
// KisanSAATHI - AI Data Scraping Bot & Agricultural Knowledge Service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const BASE_URL = process.env.EXPO_PUBLIC_VOICE_SERVER_URL || 'http://localhost:3001';
const LOCAL_KNOWLEDGE_KEY = '@kisansaathi_agri_knowledge';

export const AGRICULTURAL_CATEGORIES = [
  { id: 'Crop Information', nameEn: 'Crop Information', nameHi: 'फसल जानकारी', icon: 'sprout-outline' },
  { id: 'Crop Diseases', nameEn: 'Crop Diseases', nameHi: 'फसल रोग व उपचार', icon: 'shield-alert-outline' },
  { id: 'Soil Information', nameEn: 'Soil Information', nameHi: 'मृदा व मिट्टी विज्ञान', icon: 'terrain' },
  { id: 'Farming Techniques', nameEn: 'Farming Techniques', nameHi: 'उन्नत कृषि तकनीकें', icon: 'water-pump' },
  { id: 'Agricultural Pests', nameEn: 'Agricultural Pests', nameHi: 'कीट व रोकथाम', icon: 'bug-outline' },
  { id: 'Agricultural Knowledge', nameEn: 'Agricultural Knowledge', nameHi: 'कृषि शब्दावली व ज्ञान', icon: 'book-open-outline' },
];

export const PRESET_TOPICS = [
  { title: 'Wheat cultivation', hi: 'गेहूं की खेती', category: 'Crop Information' },
  { title: 'Rice diseases', hi: 'धान के रोग', category: 'Crop Diseases' },
  { title: 'Mustard farming', hi: 'सरसों की खेती', category: 'Crop Information' },
  { title: 'Soil types in India', hi: 'भारत में मृदा के प्रकार', category: 'Soil Information' },
  { title: 'Agricultural pests', hi: 'कृषि कीट नियंत्रण', category: 'Agricultural Pests' },
  { title: 'Irrigation methods', hi: 'सिंचाई के तरीके', category: 'Farming Techniques' },
  { title: 'Crop rotation', hi: 'फसल चक्र (Crop Rotation)', category: 'Farming Techniques' },
  { title: 'Organic farming', hi: 'जैविक खेती (Organic Farming)', category: 'Farming Techniques' },
];

/**
 * 1. Search Wikipedia via MediaWiki API
 */
export async function searchWikipedia({ query: topic, lang = 'en', limit = 5 }) {
  const url = `${BASE_URL}/scraper/wiki-search?query=${encodeURIComponent(topic)}&lang=${lang}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Wikipedia search failed with HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * 2. Fetch Page Details & Latest Revision Metadata
 */
export async function fetchWikipediaPage({ pageId, lang = 'en', depth = 'standard' }) {
  const url = `${BASE_URL}/scraper/wiki-page?pageId=${pageId}&lang=${lang}&depth=${depth}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Wikipedia page fetch failed with HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * 3. Extract Structured Knowledge using Existing OpenAI Integration
 */
export async function extractWithOpenAI(payload) {
  const url = `${BASE_URL}/scraper/extract`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `OpenAI extraction failed (HTTP ${res.status})`);
  }

  const result = await res.json();

  // If a new record was returned, sync it to Firestore when possible
  if (result.record) {
    syncRecordToFirestore(result.record).catch((err) => {
      console.warn('Firestore sync note:', err.message);
    });
  }

  return result;
}

/**
 * Sync record to Cloud Firestore collection: agricultural_knowledge
 */
async function syncRecordToFirestore(record) {
  try {
    if (!record?.id) return;
    const docRef = doc(db, 'agricultural_knowledge', record.id);
    await setDoc(docRef, {
      ...record,
      firestoreSyncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    // Graceful offline fallback
    console.log('Local/offline storage active for agricultural_knowledge:', e.message);
  }
}

/**
 * 4. Get Knowledge Records with Filters
 */
export async function getKnowledgeRecords({ status = 'all', category = 'all', language = 'all', search = '' } = {}) {
  try {
    const url = `${BASE_URL}/scraper/records?status=${status}&category=${category}&language=${language}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      // Cache locally
      await AsyncStorage.setItem(LOCAL_KNOWLEDGE_KEY, JSON.stringify(data.records || []));
      return data.records || [];
    }
  } catch (e) {
    console.warn('Failed to fetch from backend store, trying local storage cache:', e.message);
  }

  // Fallback to local storage
  try {
    const local = await AsyncStorage.getItem(LOCAL_KNOWLEDGE_KEY);
    let list = local ? JSON.parse(local) : [];
    if (status && status !== 'all') list = list.filter((r) => r.verificationStatus === status);
    if (category && category !== 'all') list = list.filter((r) => r.category === category);
    if (language && language !== 'all') list = list.filter((r) => r.language?.toLowerCase() === language.toLowerCase());
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.title?.toLowerCase().includes(q) || r.summary?.toLowerCase().includes(q));
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * 5. Update Record Verification Status (Admin Review: Approve / Reject / Edit)
 */
export async function updateRecordStatus({ id, verificationStatus, edits = null }) {
  const url = `${BASE_URL}/scraper/records/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationStatus, edits }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update verification status (HTTP ${res.status})`);
  }

  const result = await res.json();

  // Update in Firestore
  try {
    const docRef = doc(db, 'agricultural_knowledge', id);
    const updates = { verificationStatus, updatedAt: serverTimestamp() };
    if (verificationStatus === 'approved') updates.verifiedAt = serverTimestamp();
    if (edits) Object.assign(updates, edits);
    await updateDoc(docRef, updates);
  } catch (e) {
    console.log('Firestore update note:', e.message);
  }

  return result.record;
}

/**
 * 6. Delete Record (Admin Review)
 */
export async function deleteKnowledgeRecord(id) {
  const url = `${BASE_URL}/scraper/records/${id}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Failed to delete record (HTTP ${res.status})`);
  }

  // Delete from Firestore
  try {
    const docRef = doc(db, 'agricultural_knowledge', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.log('Firestore delete note:', e.message);
  }

  return true;
}

/**
 * 7. Fetch Scraper Dashboard Analytics
 */
export async function getScraperStats() {
  try {
    const url = `${BASE_URL}/scraper/stats`;
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch stats from server:', e.message);
  }

  // Local fallback
  return {
    totalRecords: 0,
    approved: 0,
    pendingReview: 0,
    rejected: 0,
    englishRecords: 0,
    hindiRecords: 0,
    categories: {},
    lastUpdated: new Date().toISOString(),
  };
}
