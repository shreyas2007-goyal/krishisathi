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

  const systemPrompt = `You are KisanSAATHI's intelligent Agricultural Data Extraction and Processing Agent.

Your primary responsibility is to process information retrieved from Wikipedia and other authorized agricultural information sources, identify useful agricultural knowledge, extract relevant facts, remove unnecessary content and return structured, source-linked records.

CORE DIRECTIVES:
1. Analyze retrieved article content thoroughly.
2. Identify relevant agricultural information.
3. Extract useful facts and entities with confidence ('high', 'medium', 'low') and direct evidence_text from source.
4. Categorize information into one of: 'Crop Information', 'Crop Varieties', 'Crop Cultivation', 'Soil Information', 'Plant Diseases', 'Agricultural Pests', 'Irrigation Methods', 'Fertilizers', 'Organic Farming', 'Seeds', 'Agricultural Equipment', 'Farming Techniques', 'Plant Science', 'Agricultural Terminology', 'General Agricultural Knowledge'.
5. Remove irrelevant, repetitive, formatting, or navigational text.
6. Detect incomplete, ambiguous, or safety-critical information (pesticides, fertilizers, disease treatments).
7. Flag treatment recommendations requiring ICAR, agricultural university, or government verification.
8. NEVER fabricate facts, imaginary scientific names, crop statistics, or citations. Mark missing as null or [].
9. Return valid JSON strictly matching the requested schema.`;

  const userPrompt = `Target Article: ${title}
Assigned Category: ${category}
Language: ${language}
Source URL: ${url}
Revision ID: ${revisionId}
Revision Timestamp: ${revisionTimestamp}

--- SOURCE TEXT (WIKIPEDIA EXTRACT) ---
${trimmedText}
---------------------------------------

Extract the agricultural knowledge into this EXACT JSON structure:
{
  "relevant": true,
  "article_title": "${title}",
  "category": "${category}",
  "language": "${language}",
  "summary": "Concise 2-3 sentence overview of this agricultural topic based strictly on the text.",
  "entities": [
    {
      "name": "Entity name (crop, pest, disease, tool, soil type)",
      "type": "Crop | Pest | Pathogen | Equipment | Chemical | Soil",
      "scientific_name": "Scientific/botanical name if stated, otherwise null"
    }
  ],
  "extracted_information": [
    {
      "heading": "Clear descriptive topic heading (e.g. Sowing Season, Pest Management, Soil pH)",
      "information": "Specific factual summary extracted from source",
      "evidence_text": "Direct quote or close factual excerpt from the source text",
      "confidence": "high"
    }
  ],
  "agricultural_topics": ["List of core farming concepts covered"],
  "keywords": ["List of search keywords"],
  "verification_required": true,
  "verification_reason": ["Reasons requiring human/ICAR review, e.g. chemical dosages, regional variations"],
  "source": {
    "name": "Wikipedia",
    "url": "${url || `https://${language === 'Hindi' ? 'hi' : 'en'}.wikipedia.org/wiki/${encodeURIComponent(title)}`}",
    "page_id": "${pageId || ''}",
    "revision_id": "${revisionId || ''}",
    "revision_timestamp": "${revisionTimestamp || new Date().toISOString()}",
    "retrieved_at": "${new Date().toISOString()}"
  },
  "processing_status": "pending_review"
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

    // Full finalized Agricultural Knowledge record matching Master Schema
    const completeRecord = {
      id: docId,
      documentId: docId,
      relevant: structuredJson.relevant !== false,
      title: structuredJson.article_title || structuredJson.title || title,
      article_title: structuredJson.article_title || structuredJson.title || title,
      category: structuredJson.category || category,
      language: language,
      summary: structuredJson.summary || 'Summary unavailable',
      entities: structuredJson.entities || [],
      extracted_information: structuredJson.extracted_information || [],
      agricultural_topics: structuredJson.agricultural_topics || [],
      keywords: structuredJson.keywords || [],
      verification_required: structuredJson.verification_required !== false,
      verification_reason: structuredJson.verification_reason || [],
      extractedData: {
        crop_name: (structuredJson.entities || []).find((e) => e.type === 'Crop')?.name || null,
        scientific_name: (structuredJson.entities || []).find((e) => e.scientific_name)?.scientific_name || null,
        entities: structuredJson.entities || [],
        extracted_information: structuredJson.extracted_information || [],
        agricultural_topics: structuredJson.agricultural_topics || [],
        keywords: structuredJson.keywords || [],
      },
      source: {
        name: 'Wikipedia',
        url: url || `https://${language === 'Hindi' ? 'hi' : 'en'}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        page_id: String(pageId || ''),
        revision_id: String(revisionId || ''),
        revision_timestamp: revisionTimestamp || new Date().toISOString(),
        retrieved_at: new Date().toISOString(),
        license: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
        attribution: 'Extracted from Wikipedia under CC BY-SA 4.0 license.',
      },
      contentHash,
      verificationStatus: 'pending_review',
      processing_status: 'pending_review',
      isRelevant: structuredJson.relevant !== false,
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
// 3. REVISION COMPARISON & DIFF ENGINE
// =========================================================================

/**
 * Compare Two Wikipedia Article Revisions (Revision Diff & Agricultural Delta Analysis)
 * POST /scraper/compare-revisions
 * Body: { articleTitle, oldContent, newContent, oldRevId, newRevId }
 */
app.post('/scraper/compare-revisions', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const { articleTitle, oldContent, newContent, oldRevId, newRevId } = req.body || {};
  if (!oldContent || !newContent) {
    return res.status(400).json({ error: 'Both oldContent and newContent are required for revision comparison.' });
  }

  const systemPrompt = `You are KisanSAATHI's Agricultural Revision Comparison Agent.
Your responsibility is to analyze two versions of an agricultural Wikipedia article, identify what changed, and flag potential agricultural or safety implications.

RULES:
1. Identify added agricultural information.
2. Identify removed agricultural information.
3. Identify modified claims, numbers, yields, or dates.
4. Identify changes in scientific or botanical terminology.
5. Identify potentially critical agricultural changes (e.g. chemical/pesticide dosage, disease treatments).
6. Report changes neutrally without assuming the newer revision is necessarily scientifically correct.
7. Return valid JSON only.`;

  const userPrompt = `Article: ${articleTitle || 'Agricultural Article'}
Old Revision: #${oldRevId || 'Version A'}
New Revision: #${newRevId || 'Version B'}

--- OLD VERSION EXTRACT ---
${oldContent.substring(0, 7000)}

--- NEW VERSION EXTRACT ---
${newContent.substring(0, 7000)}

Return JSON with this exact structure:
{
  "article_title": "${articleTitle || ''}",
  "old_revision": "${oldRevId || ''}",
  "new_revision": "${newRevId || ''}",
  "summary_of_changes": "Clear summary of what was updated between revisions.",
  "added_information": ["New points or techniques added in newer version"],
  "removed_information": ["Claims or sections deleted in newer version"],
  "modified_claims": ["Statements whose meaning, timing, or figures changed"],
  "scientific_term_changes": ["Changes in botanical, pest, or pathogen nomenclature"],
  "agricultural_impact_changes": ["Important changes affecting farming practices, fertilizers, or diseases"],
  "safety_flag": true,
  "safety_reason": "Explanation if any treatment or chemical dosage changed"
}`;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      return res.status(openaiRes.status).json({ error: 'OpenAI revision comparison failed', details: err });
    }

    const data = await openaiRes.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    return res.json({ status: 'success', diff: parsed });
  } catch (err) {
    console.error('Revision compare error:', err);
    return res.status(500).json({ error: 'Failed to compare revisions', details: err.message });
  }
});

// =========================================================================
// 4. KNOWLEDGE STORE & ADMIN REVIEW ENDPOINTS
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
