import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
// Image attachments are sent as base64 inside the JSON request.
app.use(express.json({ limit: '15mb' }));

// Persistent Knowledge Store for Scraped Agricultural Data
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'agricultural_knowledge.json');

function loadKnowledgeStore() {
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const raw = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading knowledge store:', e);
  }
  return [];
}

function saveKnowledgeStore(records) {
  try {
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving knowledge store:', e);
  }
}

// User-Agent required by Wikimedia API policies
const WIKIPEDIA_USER_AGENT = 'KisanSAATHI-ScraperBot/1.0 (https://kisansaathi.in; contact@kisansaathi.in) MediaWikiAPIClient/1.0';

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// =========================================================================
// 1. WIKIMEDIA SEARCH & PAGE RETRIEVAL (MediaWiki Action API)
// =========================================================================

/**
 * Search Wikipedia (English or Hindi)
 * GET /scraper/wiki-search?query=...&lang=en|hi&limit=5
 */
app.get('/scraper/wiki-search', async (req, res) => {
  const { query, lang = 'en', limit = 5 } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const host = lang === 'hi' ? 'hi.wikipedia.org' : 'en.wikipedia.org';
  const endpoint = `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${Math.min(Number(limit) || 5, 20)}&format=json&origin=*&utf8=1`;

  try {
    const wikiRes = await fetch(endpoint, {
      headers: { 'User-Agent': WIKIPEDIA_USER_AGENT },
    });
    if (!wikiRes.ok) {
      return res.status(wikiRes.status).json({ error: `Wikipedia API responded with HTTP ${wikiRes.status}` });
    }
    const data = await wikiRes.json();
    const searchResults = (data.query?.search || []).map((item) => ({
      pageId: item.pageid,
      title: item.title,
      snippet: item.snippet?.replace(/<[^>]+>/g, ''), // Strip HTML snippet tags
      wordCount: item.wordcount,
      timestamp: item.timestamp,
      language: lang === 'hi' ? 'Hindi' : 'English',
      langCode: lang,
    }));

    return res.json({
      query,
      language: lang,
      totalHits: data.query?.searchinfo?.totalhits || searchResults.length,
      results: searchResults,
    });
  } catch (err) {
    console.error('Wikipedia search error:', err);
    return res.status(500).json({ error: 'Failed to query Wikipedia API', details: err.message });
  }
});

/**
 * Fetch Wikipedia Page Content & Revision Metadata
 * GET /scraper/wiki-page?pageId=...&lang=en|hi&depth=standard|full|summary
 */
app.get('/scraper/wiki-page', async (req, res) => {
  const { pageId, lang = 'en', depth = 'standard' } = req.query;
  if (!pageId) {
    return res.status(400).json({ error: 'pageId is required' });
  }

  const host = lang === 'hi' ? 'hi.wikipedia.org' : 'en.wikipedia.org';
  const exintro = depth === 'summary' ? '1' : '0';
  const endpoint = `https://${host}/w/api.php?action=query&prop=extracts|revisions|info&explaintext=1&exintro=${exintro}&rvprop=ids|timestamp|user|comment&inprop=url&pageids=${pageId}&format=json&origin=*&utf8=1`;

  try {
    const wikiRes = await fetch(endpoint, {
      headers: { 'User-Agent': WIKIPEDIA_USER_AGENT },
    });
    if (!wikiRes.ok) {
      return res.status(wikiRes.status).json({ error: `Wikipedia API HTTP ${wikiRes.status}` });
    }
    const data = await wikiRes.json();
    const page = data.query?.pages?.[pageId];
    if (!page || page.missing) {
      return res.status(404).json({ error: 'Wikipedia article page not found' });
    }

    const latestRevision = page.revisions?.[0] || {};
    return res.json({
      pageId: Number(pageId),
      title: page.title,
      extract: page.extract || '',
      url: page.fullurl || `https://${host}/wiki/${encodeURIComponent(page.title)}`,
      revisionId: String(latestRevision.revid || ''),
      revisionTimestamp: latestRevision.timestamp || new Date().toISOString(),
      editor: latestRevision.user || 'Wikipedia Contributor',
      language: lang === 'hi' ? 'Hindi' : 'English',
      langCode: lang,
      license: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
      attribution: 'Text available under the Creative Commons Attribution-ShareAlike 4.0 License; additional terms may apply.',
    });
  } catch (err) {
    console.error('Wikipedia page fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve Wikipedia article content', details: err.message });
  }
});

// =========================================================================
// 2. OPENAI-POWERED INTELLIGENT DATA EXTRACTION & STRUCTURING
// =========================================================================

/**
 * Intelligent Data Extraction from Wikipedia Text using Existing OpenAI Configuration
 * POST /scraper/extract
 * Body: { title, extract, category, language, pageId, revisionId, revisionTimestamp, url }
 */
app.post('/scraper/extract', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const {
    title,
    extract,
    category = 'Crop Information',
    language = 'English',
    pageId,
    revisionId,
    revisionTimestamp,
    url,
  } = req.body || {};

  if (!title || !extract) {
    return res.status(400).json({ error: 'Article title and extract text are required.' });
  }

  // Check if article is already in knowledge store with the exact same revisionId
  const store = loadKnowledgeStore();
  const existingRecord = store.find((r) => r.source?.page_id === String(pageId) || r.source?.url === url);

  if (existingRecord && existingRecord.source?.revision_id === String(revisionId)) {
    return res.json({
      status: 'skipped_unchanged',
      message: 'Article is already extracted at the latest revision. Skipped duplicate processing.',
      record: existingRecord,
    });
  }

  // Truncate extract if excessively long to stay well within token limits (approx 14,000 characters)
  const trimmedText = extract.length > 14000 ? extract.substring(0, 14000) + '\n...[Content truncated for processing]' : extract;

  const systemPrompt = `You are the KisanSAATHI Agricultural Data Extraction Engine.
Your task is to analyze real Wikipedia article text and extract structured, reliable agricultural records for Indian farmers and krishi officers.

CRITICAL RULES:
1. ONLY extract information that is explicitly stated in the provided Wikipedia text.
2. NEVER invent, fabricate, hallucinate, or extrapolate missing statistics, market prices, yields, or citations.
3. If an attribute is not discussed in the text, return an empty array [] or null.
4. Clean away Wikipedia citation marks (such as [1], [2], [citation needed]).
5. Categorize into one of: 'Crop Information', 'Crop Diseases', 'Soil Information', 'Farming Techniques', 'Agricultural Pests', 'Agricultural Knowledge'.
6. Return valid, well-formed JSON matching the specified schema.`;

  const userPrompt = `Target Topic: ${title}
Assigned Category: ${category}
Language: ${language}
Source URL: ${url}
Revision ID: ${revisionId}
Revision Timestamp: ${revisionTimestamp}

--- WIKIPEDIA ARTICLE EXTRACT ---
${trimmedText}
---------------------------------

Extract and format the agricultural data into this EXACT JSON structure:
{
  "title": "${title}",
  "category": "${category}",
  "language": "${language}",
  "is_relevant": true,
  "summary": "Concise 2-3 sentence overview of this agricultural topic based on the text.",
  "crop_name": "Common crop name if applicable, or null",
  "scientific_name": "Botanical/scientific name if present, or null",
  "varieties": ["List of varieties mentioned in text"],
  "growing_conditions": ["Climate, temperature, rainfall, or altitude requirements"],
  "soil_requirements": ["Soil types, pH, drainage requirements"],
  "cultivation_methods": ["Sowing, spacing, weeding, harvesting practices"],
  "growing_seasons": ["Rabi, Kharif, Zaid or calendar seasons mentioned"],
  "disease_details": {
    "disease_name": "Name of disease if applicable, or null",
    "affected_crops": ["List of crops affected"],
    "symptoms": ["Specific visible symptoms"],
    "causes": ["Pathogen, fungus, bacteria, or abiotic causes"],
    "prevention_and_management": ["Recommended control or cultural practices"]
  },
  "pest_details": {
    "pest_name": "Pest name if applicable, or null",
    "affected_crops": ["Crops attacked"],
    "damage_symptoms": ["Type of damage"],
    "prevention_and_control": ["Control measures"]
  },
  "soil_details": {
    "soil_type": "Soil classification name, or null",
    "properties": ["Texture, nutrients, water retention"],
    "agricultural_suitability": ["Best suited crops"]
  },
  "farming_techniques": ["Irrigation, crop rotation, organic methods, or specific practices discussed"],
  "key_facts": ["Bullet points of important agricultural takeaways"],
  "verification_status": "pending_review"
}`;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2, // Low temperature for high factual consistency
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.json();
      console.error('OpenAI completion error:', errBody);
      return res.status(openaiResponse.status).json({ error: 'OpenAI API extraction failed', details: errBody });
    }

    const data = await openaiResponse.json();
    const rawContent = data.choices?.[0]?.message?.content;
    let structuredJson = {};

    try {
      structuredJson = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse OpenAI JSON output:', rawContent);
      return res.status(500).json({ error: 'OpenAI returned invalid JSON', raw: rawContent });
    }

    // Compute cryptographic content hash for revision change detection
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(structuredJson) + (revisionId || ''))
      .digest('hex');

    // Create unique Document ID
    const docId = `agri_${langCodeFor(language)}_${pageId || title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_r${revisionId || 'latest'}`;

    // Full finalized Agricultural Knowledge record
    const completeRecord = {
      id: docId,
      documentId: docId,
      title: structuredJson.title || title,
      category: structuredJson.category || category,
      language: language,
      summary: structuredJson.summary || 'Summary unavailable',
      extractedData: {
        crop_name: structuredJson.crop_name || null,
        scientific_name: structuredJson.scientific_name || null,
        varieties: structuredJson.varieties || [],
        growing_conditions: structuredJson.growing_conditions || [],
        soil_requirements: structuredJson.soil_requirements || [],
        cultivation_methods: structuredJson.cultivation_methods || [],
        growing_seasons: structuredJson.growing_seasons || [],
        disease_details: structuredJson.disease_details || null,
        pest_details: structuredJson.pest_details || null,
        soil_details: structuredJson.soil_details || null,
        farming_techniques: structuredJson.farming_techniques || [],
        key_facts: structuredJson.key_facts || [],
      },
      source: {
        name: 'Wikipedia',
        url: url || `https://${language === 'Hindi' ? 'hi' : 'en'}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        page_id: String(pageId || ''),
        revision_id: String(revisionId || ''),
        revision_timestamp: revisionTimestamp || new Date().toISOString(),
        license: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
        attribution: 'Extracted from Wikipedia under CC BY-SA 4.0 license.',
      },
      contentHash,
      verificationStatus: 'pending_review', // Initially pending admin review
      isRelevant: structuredJson.is_relevant !== false,
      extractedAt: new Date().toISOString(),
      processedByModel: 'gpt-4o-mini',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save into persistent Knowledge Store
    const existingIndex = store.findIndex((r) => r.id === docId || (r.source?.page_id === String(pageId) && r.source?.page_id));
    if (existingIndex >= 0) {
      store[existingIndex] = completeRecord;
    } else {
      store.unshift(completeRecord);
    }
    saveKnowledgeStore(store);

    return res.json({
      status: 'success',
      docId,
      record: completeRecord,
    });
  } catch (err) {
    console.error('Scraper extraction pipeline error:', err);
    return res.status(500).json({ error: 'Extraction pipeline failed', details: err.message });
  }
});

function langCodeFor(lang) {
  const lower = String(lang).toLowerCase();
  return lower.includes('hi') ? 'hi' : 'en';
}

// =========================================================================
// 3. KNOWLEDGE STORE & ADMIN REVIEW ENDPOINTS
// =========================================================================

/**
 * Get Extracted Records with Filters
 * GET /scraper/records?status=all|pending_review|approved|rejected&category=...&search=...
 */
app.get('/scraper/records', (req, res) => {
  const { status, category, language, search } = req.query;
  let records = loadKnowledgeStore();

  if (status && status !== 'all') {
    records = records.filter((r) => r.verificationStatus === status);
  }
  if (category && category !== 'all') {
    records = records.filter((r) => r.category === category);
  }
  if (language && language !== 'all') {
    records = records.filter((r) => r.language?.toLowerCase() === language.toLowerCase());
  }
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    records = records.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q) ||
        r.extractedData?.crop_name?.toLowerCase().includes(q)
    );
  }

  res.json({
    total: records.length,
    records,
  });
});

/**
 * Update Verification Status (Admin Review: Approve / Reject / Edit)
 * PATCH /scraper/records/:id
 * Body: { verificationStatus: 'approved' | 'rejected' | 'pending_review', edits: {...} }
 */
app.patch('/scraper/records/:id', (req, res) => {
  const { id } = req.params;
  const { verificationStatus, edits } = req.body || {};

  const store = loadKnowledgeStore();
  const index = store.findIndex((r) => r.id === id || r.documentId === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Record not found in knowledge store.' });
  }

  if (verificationStatus) {
    store[index].verificationStatus = verificationStatus;
    store[index].verifiedAt = new Date().toISOString();
  }

  if (edits && typeof edits === 'object') {
    if (edits.summary) store[index].summary = edits.summary;
    if (edits.category) store[index].category = edits.category;
    if (edits.extractedData) {
      store[index].extractedData = { ...store[index].extractedData, ...edits.extractedData };
    }
  }

  store[index].updatedAt = new Date().toISOString();
  saveKnowledgeStore(store);

  return res.json({
    status: 'success',
    record: store[index],
  });
});

/**
 * Delete a Record (Admin Review)
 * DELETE /scraper/records/:id
 */
app.delete('/scraper/records/:id', (req, res) => {
  const { id } = req.params;
  let store = loadKnowledgeStore();
  const initialLength = store.length;
  store = store.filter((r) => r.id !== id && r.documentId !== id);

  if (store.length === initialLength) {
    return res.status(404).json({ error: 'Record not found to delete.' });
  }

  saveKnowledgeStore(store);
  return res.json({ status: 'success', message: 'Record deleted successfully.' });
});

/**
 * Scraper Dashboard Statistics
 * GET /scraper/stats
 */
app.get('/scraper/stats', (_req, res) => {
  const store = loadKnowledgeStore();
  const stats = {
    totalRecords: store.length,
    approved: store.filter((r) => r.verificationStatus === 'approved').length,
    pendingReview: store.filter((r) => r.verificationStatus === 'pending_review').length,
    rejected: store.filter((r) => r.verificationStatus === 'rejected').length,
    englishRecords: store.filter((r) => r.language === 'English').length,
    hindiRecords: store.filter((r) => r.language === 'Hindi').length,
    categories: {
      'Crop Information': store.filter((r) => r.category === 'Crop Information').length,
      'Crop Diseases': store.filter((r) => r.category === 'Crop Diseases').length,
      'Soil Information': store.filter((r) => r.category === 'Soil Information').length,
      'Farming Techniques': store.filter((r) => r.category === 'Farming Techniques').length,
      'Agricultural Pests': store.filter((r) => r.category === 'Agricultural Pests').length,
      'Agricultural Knowledge': store.filter((r) => r.category === 'Agricultural Knowledge').length,
    },
    lastUpdated: store[0]?.updatedAt || new Date().toISOString(),
  };
  return res.json(stats);
});

// =========================================================================
// 4. CHAT / REALTIME INTEGRATION ENRICHED WITH VERIFIED KNOWLEDGE
// =========================================================================

app.post('/realtime/session', async (_req, res) => {
  console.log('Realtime session requested');
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the voice server.' });
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime-2.1-mini',
          instructions:
            'You are Krishi Sahayak, a practical agricultural voice assistant for Indian farmers. Provide safe, verified agricultural guidance in clear Hindi or English.',
          audio: {
            input: {
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: 'alloy' },
          },
        },
      }),
    });

    const data = await openaiResponse.json();
    return res.status(openaiResponse.status).json(data);
  } catch (error) {
    console.error('Realtime session error:', error);
    return res.status(500).json({ error: 'Failed to create Realtime session.' });
  }
});

app.post('/chat', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the voice server.' });
  }

  const { message, imageBase64, imageMimeType = 'image/jpeg' } = req.body || {};
  console.log(`Chat request received (image bytes: ${imageBase64?.length || 0})`);
  if (!message?.trim()) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  // Retrieve approved agricultural knowledge relevant to query
  const store = loadKnowledgeStore();
  const approved = store.filter((r) => r.verificationStatus === 'approved');
  const lowerMsg = message.toLowerCase();

  const relevantKnowledge = approved
    .filter(
      (r) =>
        lowerMsg.includes(r.title.toLowerCase()) ||
        (r.extractedData?.crop_name && lowerMsg.includes(r.extractedData.crop_name.toLowerCase()))
    )
    .slice(0, 2);

  let contextInjection = '';
  if (relevantKnowledge.length > 0) {
    contextInjection = `\n\nVERIFIED AGRICULTURAL KNOWLEDGE (From KisanSAATHI Verified Database):\n` +
      relevantKnowledge
        .map(
          (k) =>
            `- Topic: ${k.title}\n  Summary: ${k.summary}\n  Key Facts: ${(k.extractedData?.key_facts || []).join('; ')}\n  Source: ${k.source?.name} (${k.source?.url})`
        )
        .join('\n\n');
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Krishi Sahayak, an expert agricultural assistant dedicated to supporting Indian farmers with accurate, practical advice on crops, weather, diseases, government schemes, and mandi trading.${contextInjection}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: message.trim() },
              ...(imageBase64 ? [{ type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } }] : []),
            ],
          },
        ],
        max_tokens: 450,
        temperature: 0.7,
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) return res.status(openaiResponse.status).json(data);
    return res.json({ reply: data.choices?.[0]?.message?.content?.trim() || 'No response received.' });
  } catch (error) {
    console.error('Chat request error:', error);
    return res.status(500).json({ error: 'Failed to contact OpenAI.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`KisanSAATHI backend and scraping server listening on http://localhost:${port}`);
});
