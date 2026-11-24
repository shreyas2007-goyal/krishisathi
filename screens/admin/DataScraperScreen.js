// screens/admin/DataScraperScreen.js
// KisanSAATHI AI Data Scraping Agent - Command Center & Knowledge Extraction Studio

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AGRICULTURAL_CATEGORIES,
  PRESET_TOPICS,
  searchWikipedia,
  fetchWikipediaPage,
  extractWithOpenAI,
  compareArticleRevisions,
  getKnowledgeRecords,
  updateRecordStatus,
  deleteKnowledgeRecord,
  getScraperStats,
} from '../../services/scraperService';

const { width: windowWidth } = Dimensions.get('window');

export default function DataScraperScreen({ navigation }) {
  // Navigation / Tabs: 'studio' | 'diff' | 'review' | 'agent'
  const [activeTab, setActiveTab] = useState('studio');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('Wheat cultivation');
  const [sourceLang, setSourceLang] = useState('en'); // 'en' | 'hi'
  const [selectedCategory, setSelectedCategory] = useState(AGRICULTURAL_CATEGORIES[0].id);
  const [articleCount, setArticleCount] = useState(3);
  const [extractionDepth, setExtractionDepth] = useState('standard'); // 'summary' | 'standard' | 'full'

  // Scraping Execution State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [botState, setBotState] = useState('idle'); // 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0..4 in visual pipeline
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [activityLogs, setActivityLogs] = useState([]);

  // Control Refs for Pause/Stop in async loops
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);

  // Statistics State
  const [stats, setStats] = useState({
    totalRecords: 0,
    approved: 0,
    pendingReview: 0,
    rejected: 0,
    englishRecords: 0,
    hindiRecords: 0,
    lastUpdated: null,
  });

  // Admin Review System State
  const [records, setRecords] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('pending_review'); // 'pending_review' | 'approved' | 'rejected' | 'all'
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedRecordModal, setSelectedRecordModal] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({ summary: '', category: '' });

  // Revision Diff Studio State
  const [diffTopic, setDiffTopic] = useState('Wheat');
  const [diffOldText, setDiffOldText] = useState(
    'Wheat is a cereal grain. Sowing occurs in November. Yields are around 3.5 tonnes/ha. Rust is treated with Mancozeb spray at 2.5g/L.'
  );
  const [diffNewText, setDiffNewText] = useState(
    'Wheat is an essential cereal grain of the genus Triticum. Sowing is recommended between Nov 1-15 for optimal tillering. High-yielding varieties reach 5.2 tonnes/ha with micro-irrigation. Rust resistance in PBW-343 has broken down; ICAR advises resistant varieties like HD-2967 and propiconazole 25 EC at 0.1%.'
  );
  const [diffResult, setDiffResult] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    loadStats();
    loadRecords();
  }, []);

  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setActivityLogs((prev) => [{ id: Math.random().toString(), time, msg, type }, ...prev.slice(0, 99)]);
  }, []);

  const loadStats = async () => {
    try {
      const s = await getScraperStats();
      setStats(s);
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  };

  const loadRecords = async () => {
    setReviewLoading(true);
    try {
      const data = await getKnowledgeRecords({
        status: reviewFilter,
        search: reviewSearchQuery,
      });
      setRecords(data);
    } catch (e) {
      console.warn('Failed to load records', e);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'review') {
      loadRecords();
    } else if (activeTab === 'studio') {
      loadStats();
    }
  }, [activeTab, reviewFilter]);

  /**
   * Search Wikipedia for candidate articles
   */
  const handleSearchWikipedia = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Query Required', 'Please enter a search topic or select a preset.');
      return;
    }

    setIsSearching(true);
    addLog(`Initiating Wikimedia search: "${searchQuery}" [${sourceLang.toUpperCase()}]...`);

    try {
      const data = await searchWikipedia({
        query: searchQuery.trim(),
        lang: sourceLang,
        limit: articleCount,
      });

      setSearchResults(data.results || []);
      addLog(`Found ${data.results?.length || 0} candidate articles from Wikipedia API.`, 'success');
    } catch (err) {
      addLog(`Search failed: ${err.message}`, 'error');
      Alert.alert('Search Error', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Run Visual Extraction Pipeline
   */
  const handleStartExtraction = async () => {
    let articlesToProcess = searchResults;

    if (articlesToProcess.length === 0) {
      setIsSearching(true);
      addLog(`Querying Wikipedia articles for "${searchQuery}"...`);
      try {
        const searchRes = await searchWikipedia({
          query: searchQuery.trim(),
          lang: sourceLang,
          limit: articleCount,
        });
        articlesToProcess = searchRes.results || [];
        setSearchResults(articlesToProcess);
      } catch (err) {
        addLog(`Search failed: ${err.message}`, 'error');
        setIsSearching(false);
        return;
      }
      setIsSearching(false);
    }

    if (articlesToProcess.length === 0) {
      Alert.alert('No Articles', 'No Wikipedia articles found matching this query.');
      return;
    }

    // Reset controls
    isPausedRef.current = false;
    isStoppedRef.current = false;
    setBotState('running');
    setCurrentProgress({ current: 0, total: articlesToProcess.length, currentTitle: '' });
    addLog(`Agent launched for ${articlesToProcess.length} candidate articles...`, 'success');

    let processedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (let i = 0; i < articlesToProcess.length; i++) {
      if (isStoppedRef.current) {
        addLog('Extraction stopped by administrator.', 'warning');
        setBotState('stopped');
        break;
      }

      while (isPausedRef.current && !isStoppedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (isStoppedRef.current) break;

      const item = articlesToProcess[i];
      setCurrentProgress({
        current: i + 1,
        total: articlesToProcess.length,
        currentTitle: item.title,
      });

      // Pipeline Step 1: Ingestion
      setCurrentStepIndex(0);
      addLog(`[Step 1/5] Ingesting "${item.title}" (PageID: ${item.pageId})...`);

      try {
        const pageData = await fetchWikipediaPage({
          pageId: item.pageId,
          lang: sourceLang,
          depth: extractionDepth,
        });

        // Pipeline Step 2: Relevance & Deduplication
        setCurrentStepIndex(1);
        addLog(`[Step 2/5] Checking revision #${pageData.revisionId} against hash registry...`);

        // Pipeline Step 3: AI Extraction & Structuring
        setCurrentStepIndex(2);
        addLog(`[Step 3/5] AI Agent analyzing factual content and entities with GPT-4o-mini...`);

        const extractResult = await extractWithOpenAI({
          title: pageData.title,
          extract: pageData.extract,
          category: selectedCategory,
          language: sourceLang === 'hi' ? 'Hindi' : 'English',
          pageId: pageData.pageId,
          revisionId: pageData.revisionId,
          revisionTimestamp: pageData.revisionTimestamp,
          url: pageData.url,
        });

        if (extractResult.status === 'skipped_unchanged') {
          duplicateCount++;
          addLog(`Skipped unchanged revision #${pageData.revisionId} (Up-to-date in database).`, 'warning');
        } else {
          // Pipeline Step 4: Grounding & Confidence
          setCurrentStepIndex(3);
          addLog(`[Step 4/5] Grounded ${extractResult.record?.extracted_information?.length || 0} claims with source quotes.`, 'info');

          // Pipeline Step 5: Verification & Safety Audit
          setCurrentStepIndex(4);
          addLog(
            `[Step 5/5] Record filed under Pending ICAR Review (Doc: ${extractResult.docId}).`,
            'success'
          );
          processedCount++;
        }

        // Polite rate limit delay (1 sec)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (articleErr) {
        failedCount++;
        addLog(`Failed to process "${item.title}": ${articleErr.message}`, 'error');
      }
    }

    if (!isStoppedRef.current) {
      setBotState('completed');
      addLog(
        `Batch finished: ${processedCount} extracted, ${duplicateCount} unchanged, ${failedCount} failed.`,
        'success'
      );
    }

    loadStats();
    loadRecords();
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setBotState('paused');
    addLog('Agent paused. Tap Resume to continue.', 'warning');
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setBotState('running');
    addLog('Agent resumed extraction.', 'info');
  };

  const handleStop = () => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setBotState('stopped');
    addLog('Stop signal delivered to Agent.', 'error');
  };

  /**
   * Run Revision Diff Analysis
   */
  const handleRunRevisionDiff = async () => {
    if (!diffOldText.trim() || !diffNewText.trim()) {
      Alert.alert('Text Required', 'Please provide both original and updated revision texts.');
      return;
    }
    setDiffLoading(true);
    addLog(`Running Revision Diff Engine for "${diffTopic}"...`);
    try {
      const res = await compareArticleRevisions({
        articleTitle: diffTopic,
        oldContent: diffOldText,
        newContent: diffNewText,
        oldRevId: 'Rev-A (Baseline)',
        newRevId: 'Rev-B (Latest)',
      });
      setDiffResult(res.diff);
      addLog(`Revision comparison completed for "${diffTopic}".`, 'success');
    } catch (err) {
      addLog(`Revision comparison failed: ${err.message}`, 'error');
      Alert.alert('Diff Error', err.message);
    } finally {
      setDiffLoading(false);
    }
  };

  /**
   * Admin Review Actions
   */
  const handleApproveRecord = async (record) => {
    try {
      await updateRecordStatus({ id: record.id, verificationStatus: 'approved' });
      addLog(`Record "${record.title}" approved for AI Knowledge Base.`, 'success');
      loadRecords();
      loadStats();
      if (selectedRecordModal?.id === record.id) {
        setSelectedRecordModal((prev) => ({ ...prev, verificationStatus: 'approved' }));
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRejectRecord = async (record) => {
    try {
      await updateRecordStatus({ id: record.id, verificationStatus: 'rejected' });
      addLog(`Record "${record.title}" marked as rejected.`, 'warning');
      loadRecords();
      loadStats();
      if (selectedRecordModal?.id === record.id) {
        setSelectedRecordModal((prev) => ({ ...prev, verificationStatus: 'rejected' }));
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteRecord = async (record) => {
    Alert.alert(
      'Delete Knowledge Record',
      `Permanently remove "${record.title}" from the knowledge base?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteKnowledgeRecord(record.id);
              addLog(`Record "${record.title}" deleted.`, 'info');
              loadRecords();
              loadStats();
              setSelectedRecordModal(null);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!selectedRecordModal) return;
    try {
      await updateRecordStatus({
        id: selectedRecordModal.id,
        verificationStatus: selectedRecordModal.verificationStatus,
        edits: {
          summary: editFormData.summary,
          category: editFormData.category,
        },
      });
      addLog(`Updated summary for "${selectedRecordModal.title}".`, 'success');
      setSelectedRecordModal((prev) => ({
        ...prev,
        summary: editFormData.summary,
        category: editFormData.category,
      }));
      setEditModalVisible(false);
      loadRecords();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* COMMAND CENTER HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#00E676" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>KisanSAATHI AI Scraping Agent</Text>
            <View style={styles.livePulseDot} />
          </View>
          <Text style={styles.headerSubtitle}>
            Wikipedia Data Extraction & Provenance Tracking Engine
          </Text>
        </View>

        <View style={styles.agentModelBadge}>
          <MaterialCommunityIcons name="brain" size={14} color="#00E676" style={{ marginRight: 4 }} />
          <Text style={styles.agentModelText}>GPT-4o-mini</Text>
        </View>
      </View>

      {/* TOP INTELLIGENCE METRIC RIBBON */}
      <View style={styles.statsRibbon}>
        <View style={styles.statPill}>
          <Text style={styles.statPillVal}>{stats.totalRecords}</Text>
          <Text style={styles.statPillLabel}>Total Nodes</Text>
        </View>
        <View style={[styles.statPill, { borderColor: 'rgba(0, 230, 118, 0.4)' }]}>
          <Text style={[styles.statPillVal, { color: '#00E676' }]}>{stats.approved}</Text>
          <Text style={styles.statPillLabel}>Approved for AI</Text>
        </View>
        <View style={[styles.statPill, { borderColor: 'rgba(255, 179, 0, 0.4)' }]}>
          <Text style={[styles.statPillVal, { color: '#FFB300' }]}>{stats.pendingReview}</Text>
          <Text style={styles.statPillLabel}>Pending ICAR Review</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillVal}>{stats.englishRecords + stats.hindiRecords}</Text>
          <Text style={styles.statPillLabel}>En & Hi Revisions</Text>
        </View>
      </View>

      {/* 4 COMMAND CENTER TABS */}
      <View style={styles.tabNavRow}>
        {[
          { id: 'studio', label: 'Extraction Studio', icon: 'robot-vacuum' },
          { id: 'diff', label: 'Revision Diff', icon: 'compare-horizontal' },
          { id: 'review', label: `Knowledge (${stats.pendingReview})`, icon: 'check-decagram-outline' },
          { id: 'agent', label: 'Agent Directives', icon: 'shield-account-outline' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabNavItem, isActive && styles.tabNavItemActive]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={t.icon}
                size={16}
                color={isActive ? '#00E676' : 'rgba(255, 255, 255, 0.6)'}
              />
              <Text style={[styles.tabNavText, isActive && styles.tabNavTextActive]} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ============================================================== */}
        {/* TAB 1: AI EXTRACTION STUDIO                                    */}
        {/* ============================================================== */}
        {activeTab === 'studio' && (
          <View>
            {/* SEARCH & INTAKE CARD */}
            <View style={styles.darkCard}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="database-search" size={18} color="#00E676" style={{ marginRight: 6 }} />
                  <Text style={styles.darkCardTitle}>1. Target Article & Query Intake</Text>
                </View>
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceTagText}>Wikimedia API</Text>
                </View>
              </View>

              <View style={styles.searchBarContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#00E676" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInputText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Enter topic or crop information to collect..."
                  placeholderTextColor="rgba(255, 255, 255, 0.45)"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Preset Chips */}
              <Text style={styles.fieldSectionHeading}>Curated Agricultural Presets:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {PRESET_TOPICS.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, searchQuery === p.title && styles.presetChipActive]}
                    onPress={() => {
                      setSearchQuery(p.title);
                      setSelectedCategory(p.category);
                    }}
                  >
                    <Text style={[styles.presetChipText, searchQuery === p.title && styles.presetChipTextActive]}>
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* CONFIGURATION & 15 CATEGORIES */}
            <View style={styles.darkCard}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="tune-variant" size={18} color="#00E676" style={{ marginRight: 6 }} />
                  <Text style={styles.darkCardTitle}>2. Taxonomy & Agent Configuration</Text>
                </View>
              </View>

              {/* Language Selection: English / Hindi */}
              <View style={styles.configInlineRow}>
                <Text style={styles.configLabelText}>Source Language:</Text>
                <View style={styles.btnSegmentGroup}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, sourceLang === 'en' && styles.segmentBtnActive]}
                    onPress={() => setSourceLang('en')}
                  >
                    <Text style={[styles.segmentBtnText, sourceLang === 'en' && styles.segmentBtnTextActive]}>
                      English (en)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, sourceLang === 'hi' && styles.segmentBtnActive]}
                    onPress={() => setSourceLang('hi')}
                  >
                    <Text style={[styles.segmentBtnText, sourceLang === 'hi' && styles.segmentBtnTextActive]}>
                      Hindi (hi)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 15 Data Categories Grid */}
              <Text style={[styles.fieldSectionHeading, { marginTop: 14 }]}>
                Data Category ({AGRICULTURAL_CATEGORIES.length} Master Classes):
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {AGRICULTURAL_CATEGORIES.map((cat) => {
                  const isCatActive = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryTile, isCatActive && styles.categoryTileActive]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={16}
                        color={isCatActive ? '#FFFFFF' : '#00E676'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.categoryTileText, isCatActive && styles.categoryTileTextActive]}>
                        {cat.nameEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Concurrency Limit & Depth */}
              <View style={[styles.configInlineRow, { marginTop: 8 }]}>
                <Text style={styles.configLabelText}>Article Limit:</Text>
                <View style={styles.btnSegmentGroup}>
                  {[3, 5, 10].map((cnt) => (
                    <TouchableOpacity
                      key={cnt}
                      style={[styles.segmentBtnSmall, articleCount === cnt && styles.segmentBtnActive]}
                      onPress={() => setArticleCount(cnt)}
                    >
                      <Text style={[styles.segmentBtnText, articleCount === cnt && styles.segmentBtnTextActive]}>
                        {cnt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ACTION CONTROLS */}
            <View style={styles.controlButtonsRow}>
              <TouchableOpacity
                style={[styles.cmdBtn, styles.searchCmdBtn]}
                onPress={handleSearchWikipedia}
                disabled={isSearching || botState === 'running'}
                activeOpacity={0.8}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.cmdBtnText}>Search Wikipedia</Text>
                  </>
                )}
              </TouchableOpacity>

              {botState !== 'running' && botState !== 'paused' && (
                <TouchableOpacity
                  style={[styles.cmdBtn, styles.launchCmdBtn]}
                  onPress={handleStartExtraction}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="play-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cmdBtnText}>Start Extraction</Text>
                </TouchableOpacity>
              )}

              {botState === 'running' && (
                <TouchableOpacity
                  style={[styles.cmdBtn, styles.pauseCmdBtn]}
                  onPress={handlePause}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="pause-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cmdBtnText}>Pause</Text>
                </TouchableOpacity>
              )}

              {botState === 'paused' && (
                <TouchableOpacity
                  style={[styles.cmdBtn, styles.resumeCmdBtn]}
                  onPress={handleResume}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="play-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cmdBtnText}>Resume</Text>
                </TouchableOpacity>
              )}

              {(botState === 'running' || botState === 'paused') && (
                <TouchableOpacity
                  style={[styles.cmdBtn, styles.stopCmdBtn]}
                  onPress={handleStop}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="stop-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cmdBtnText}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* VISUAL EXTRACTION RADAR / STEP PIPELINE */}
            <View style={styles.darkCard}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="pipeline" size={18} color="#00E676" style={{ marginRight: 6 }} />
                  <Text style={styles.darkCardTitle}>Live Agent Extraction Pipeline</Text>
                </View>
                <Text style={styles.pipelineProgressStatus}>
                  {botState === 'running'
                    ? `Processing ${currentProgress.current}/${currentProgress.total}`
                    : botState.toUpperCase()}
                </Text>
              </View>

              {/* 5 Node Radar */}
              <View style={styles.radarStepsContainer}>
                {[
                  { step: '1. Ingestion', icon: 'cloud-download-outline' },
                  { step: '2. De-dupe', icon: 'shield-check-outline' },
                  { step: '3. Extraction', icon: 'brain' },
                  { step: '4. Grounding', icon: 'format-quote-close' },
                  { step: '5. ICAR Audit', icon: 'check-decagram' },
                ].map((st, i) => {
                  const isCurrent = botState === 'running' && currentStepIndex === i;
                  const isDone = botState === 'completed' || (botState === 'running' && currentStepIndex > i);
                  return (
                    <View key={i} style={styles.radarNodeItem}>
                      <View
                        style={[
                          styles.radarNodeCircle,
                          isCurrent && styles.radarNodeCircleActive,
                          isDone && styles.radarNodeCircleDone,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={st.icon}
                          size={16}
                          color={isCurrent ? '#00E676' : isDone ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.radarNodeLabel,
                          isCurrent && styles.radarNodeLabelActive,
                          isDone && styles.radarNodeLabelDone,
                        ]}
                      >
                        {st.step}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Current Article Highlight */}
              {currentProgress.currentTitle ? (
                <View style={styles.activeArticleBanner}>
                  <MaterialCommunityIcons name="file-document-outline" size={14} color="#00E676" style={{ marginRight: 6 }} />
                  <Text style={styles.activeArticleText} numberOfLines={1}>
                    Active Node: {currentProgress.currentTitle}
                  </Text>
                </View>
              ) : null}

              {/* REAL-TIME TERMINAL STREAM */}
              <View style={styles.agentTerminal}>
                <View style={styles.terminalHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="console-line" size={14} color="#00E676" style={{ marginRight: 6 }} />
                    <Text style={styles.terminalHeaderText}>AGENT STREAM & REASONING FEED</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActivityLogs([])}>
                    <Text style={styles.clearTerminalText}>Clear</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.terminalScroll} nestedScrollEnabled={true}>
                  {activityLogs.length === 0 ? (
                    <Text style={styles.emptyTerminalText}>
                      Ready. Agent waiting for trigger. Select an agricultural category and tap "Start Extraction".
                    </Text>
                  ) : (
                    activityLogs.map((log) => (
                      <View key={log.id} style={styles.terminalLogLine}>
                        <Text style={styles.logTimestamp}>[{log.time}]</Text>
                        <Text
                          style={[
                            styles.logBody,
                            log.type === 'success' && styles.logTypeSuccess,
                            log.type === 'error' && styles.logTypeError,
                            log.type === 'warning' && styles.logTypeWarning,
                          ]}
                        >
                          {log.msg}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: REVISION DIFF & SAFETY STUDIO                           */}
        {/* ============================================================== */}
        {activeTab === 'diff' && (
          <View>
            <View style={styles.darkCard}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="compare-horizontal" size={18} color="#00E676" style={{ marginRight: 6 }} />
                  <Text style={styles.darkCardTitle}>Wikipedia Revision Diff & Delta Engine</Text>
                </View>
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceTagText}>Directive #6</Text>
                </View>
              </View>

              <Text style={styles.studioDescText}>
                Compare two versions of an agricultural Wikipedia article. The AI agent analyzes added facts, removed sections, altered yields, and flags chemical or dosage modifications.
              </Text>

              <Text style={styles.fieldSectionHeading}>Target Commodity / Article:</Text>
              <TextInput
                style={styles.diffTopicInput}
                value={diffTopic}
                onChangeText={setDiffTopic}
                placeholder="e.g. Wheat, Rice, Mustard"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <View style={styles.diffInputsRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.diffBoxLabel}>Baseline Version (Rev-A):</Text>
                  <TextInput
                    style={styles.diffTextArea}
                    multiline={true}
                    value={diffOldText}
                    onChangeText={setDiffOldText}
                    placeholder="Baseline revision extract..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.diffBoxLabel}>Updated Version (Rev-B):</Text>
                  <TextInput
                    style={styles.diffTextArea}
                    multiline={true}
                    value={diffNewText}
                    onChangeText={setDiffNewText}
                    placeholder="Updated revision extract..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.runDiffBtn}
                onPress={handleRunRevisionDiff}
                disabled={diffLoading}
                activeOpacity={0.8}
              >
                {diffLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="delta" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.runDiffBtnText}>Run Revision Comparison & Safety Audit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* DIFF RESULTS CARD */}
            {diffResult && (
              <View style={styles.darkCard}>
                <View style={styles.cardHeaderFlex}>
                  <Text style={styles.darkCardTitle}>
                    Delta Analysis: {diffResult.article_title || diffTopic}
                  </Text>
                  {diffResult.safety_flag && (
                    <View style={styles.safetyAlertBadge}>
                      <MaterialCommunityIcons name="alert" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.safetyAlertText}>Safety Flag Active</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.diffSummaryText}>{diffResult.summary_of_changes}</Text>

                {/* Added Information */}
                {diffResult.added_information?.length > 0 && (
                  <View style={styles.deltaBoxAdded}>
                    <Text style={styles.deltaHeadingAdded}>+ Added Agricultural Information:</Text>
                    {diffResult.added_information.map((item, i) => (
                      <Text key={i} style={styles.deltaItemAdded}>• {item}</Text>
                    ))}
                  </View>
                )}

                {/* Removed Information */}
                {diffResult.removed_information?.length > 0 && (
                  <View style={styles.deltaBoxRemoved}>
                    <Text style={styles.deltaHeadingRemoved}>- Removed Information / Deleted Claims:</Text>
                    {diffResult.removed_information.map((item, i) => (
                      <Text key={i} style={styles.deltaItemRemoved}>• {item}</Text>
                    ))}
                  </View>
                )}

                {/* Modified Claims */}
                {diffResult.modified_claims?.length > 0 && (
                  <View style={styles.deltaBoxModified}>
                    <Text style={styles.deltaHeadingModified}>~ Modified Agricultural Claims / Figures:</Text>
                    {diffResult.modified_claims.map((item, i) => (
                      <Text key={i} style={styles.deltaItemModified}>• {item}</Text>
                    ))}
                  </View>
                )}

                {/* Safety & Chemical Audit */}
                {diffResult.safety_reason ? (
                  <View style={styles.deltaBoxSafety}>
                    <Text style={styles.deltaHeadingSafety}>Safety & ICAR Verification Advisory:</Text>
                    <Text style={styles.deltaItemSafety}>{diffResult.safety_reason}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: KNOWLEDGE EXPLORER & VERIFICATION QUEUE                 */}
        {/* ============================================================== */}
        {activeTab === 'review' && (
          <View>
            {/* Filter Pills Bar */}
            <View style={styles.reviewFilterPillsRow}>
              {[
                { id: 'pending_review', label: 'Pending Review' },
                { id: 'approved', label: 'Approved (AI Ready)' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'all', label: 'All Knowledge Nodes' },
              ].map((rf) => (
                <TouchableOpacity
                  key={rf.id}
                  style={[styles.filterSegmentBtn, reviewFilter === rf.id && styles.filterSegmentBtnActive]}
                  onPress={() => setReviewFilter(rf.id)}
                >
                  <Text style={[styles.filterSegmentText, reviewFilter === rf.id && styles.filterSegmentTextActive]}>
                    {rf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* In-tab search filter */}
            <View style={styles.reviewSearchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color="#00E676" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.reviewSearchInput}
                value={reviewSearchQuery}
                onChangeText={setReviewSearchQuery}
                onSubmitEditing={loadRecords}
                placeholder="Search extracted knowledge nodes..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
              />
            </View>

            {reviewLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00E676" />
                <Text style={styles.loadingText}>Loading Knowledge Registry...</Text>
              </View>
            ) : records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="database-off-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>No Records Found</Text>
                <Text style={styles.emptySub}>
                  No articles currently in the "{reviewFilter}" filter. Launch the Scraper Bot in the Extraction Studio.
                </Text>
              </View>
            ) : (
              records.map((rec) => {
                const isApproved = rec.verificationStatus === 'approved';
                const isPending = rec.verificationStatus === 'pending_review';
                const isRejected = rec.verificationStatus === 'rejected';

                return (
                  <View key={rec.id} style={styles.knowledgeNodeCard}>
                    {/* Top Row: Title, Category & Status Badge */}
                    <View style={styles.nodeHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.nodeTitle}>{rec.title || rec.article_title}</Text>
                        <Text style={styles.nodeSubMeta}>
                          {rec.category} • {rec.language} • Rev #{rec.source?.revision_id || 'Latest'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusTagBadge,
                          isApproved && styles.badgeAppr,
                          isPending && styles.badgePend,
                          isRejected && styles.badgeRej,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            isApproved && styles.tagTextAppr,
                            isPending && styles.tagTextPend,
                            isRejected && styles.tagTextRej,
                          ]}
                        >
                          {rec.verificationStatus?.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Summary */}
                    <Text style={styles.nodeSummary} numberOfLines={3}>
                      {rec.summary}
                    </Text>

                    {/* Entities Pill Group */}
                    {rec.entities?.length > 0 && (
                      <View style={styles.entitiesRow}>
                        {rec.entities.slice(0, 3).map((ent, idx) => (
                          <View key={idx} style={styles.entityPill}>
                            <MaterialCommunityIcons name="tag-outline" size={12} color="#00E676" style={{ marginRight: 4 }} />
                            <Text style={styles.entityPillText}>
                              {ent.name} {ent.scientific_name ? `(${ent.scientific_name})` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Grounded Evidence Sample */}
                    {rec.extracted_information?.length > 0 && (
                      <View style={styles.evidenceSampleBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <MaterialCommunityIcons name="format-quote-close" size={14} color="#00E676" style={{ marginRight: 4 }} />
                          <Text style={styles.evidenceHeading}>
                            {rec.extracted_information[0].heading}
                          </Text>
                          <View style={styles.confidencePill}>
                            <Text style={styles.confidencePillText}>
                              {rec.extracted_information[0].confidence?.toUpperCase() || 'HIGH'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.evidenceSnippet} numberOfLines={2}>
                          "{rec.extracted_information[0].evidence_text || rec.extracted_information[0].information}"
                        </Text>
                      </View>
                    )}

                    {/* Source Attribution Link */}
                    <TouchableOpacity
                      onPress={() => rec.source?.url && Linking.openURL(rec.source.url)}
                      style={styles.sourceAnchorRow}
                    >
                      <MaterialCommunityIcons name="open-in-new" size={13} color="#64B5F6" />
                      <Text style={styles.sourceAnchorText}>
                        Wikipedia: {rec.source?.url || 'Official Article Link'}
                      </Text>
                    </TouchableOpacity>

                    {/* Admin Action Buttons */}
                    <View style={styles.nodeActionRow}>
                      <TouchableOpacity
                        style={styles.nodeInspectBtn}
                        onPress={() => setSelectedRecordModal(rec)}
                      >
                        <MaterialCommunityIcons name="eye-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.nodeBtnText}>Inspect Node</Text>
                      </TouchableOpacity>

                      {isPending && (
                        <>
                          <TouchableOpacity
                            style={[styles.nodeBtn, styles.nodeApproveBtn]}
                            onPress={() => handleApproveRecord(rec)}
                          >
                            <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                            <Text style={styles.nodeBtnText}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.nodeBtn, styles.nodeRejectBtn]}
                            onPress={() => handleRejectRecord(rec)}
                          >
                            <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                            <Text style={styles.nodeBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {isApproved && (
                        <TouchableOpacity
                          style={[styles.nodeBtn, styles.nodeRejectBtn]}
                          onPress={() => handleRejectRecord(rec)}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                          <Text style={styles.nodeBtnText}>Revoke</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.nodeDeleteBtn}
                        onPress={() => handleDeleteRecord(rec)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={15} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 4: AGENT DIRECTIVES & SYSTEM PROMPT CONSOLE               */}
        {/* ============================================================== */}
        {activeTab === 'agent' && (
          <View>
            <View style={styles.darkCard}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="shield-account" size={18} color="#00E676" style={{ marginRight: 6 }} />
                  <Text style={styles.darkCardTitle}>KisanSAATHI Agent System Directives</Text>
                </View>
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceTagText}>Active v2.4</Text>
                </View>
              </View>

              <Text style={styles.studioDescText}>
                The AI Scraping Agent operates under strict agricultural safety, zero-hallucination rules, and provenance tracking directives.
              </Text>

              {[
                { title: '1. Fact Preservation & Zero Hallucination', desc: 'Agent only extracts explicitly mentioned data. Never fabricates imaginary yields, prices, or scientific names.' },
                { title: '2. 15 Agricultural Taxonomy Classes', desc: 'Strict multi-class classification into Crop Info, Varieties, Soil, Plant Diseases, Pests, Irrigation, Fertilizers, Seeds, Equipment, etc.' },
                { title: '3. Evidence Grounding & Confidence', desc: 'Every extracted claim links directly to a verbatim evidence_text excerpt from Wikipedia with high/medium/low confidence.' },
                { title: '4. ICAR & University Safety Audit', desc: 'Treatments, pesticides, and chemical dosages are flagged requiring agricultural university or ICAR verification before farmer advisory.' },
                { title: '5. Revision Delta Engine', desc: 'Cryptographic SHA-256 content hashing detects Wikipedia revision changes, preventing duplicate reprocessing.' },
                { title: '6. Content Security Isolation', desc: 'Treats all web article text as untrusted data. Ignores embedded prompt injection or credential leak attempts.' },
              ].map((dir, idx) => (
                <View key={idx} style={styles.directiveRow}>
                  <Text style={styles.directiveTitle}>{dir.title}</Text>
                  <Text style={styles.directiveDesc}>{dir.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL: DETAILED RECORD INSPECTION & GROUNDED EVIDENCE          */}
      {/* ============================================================== */}
      <Modal
        visible={!!selectedRecordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedRecordModal(null)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.inspectModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeaderFlex}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inspectModalTitle}>
                  {selectedRecordModal?.title || selectedRecordModal?.article_title}
                </Text>
                <Text style={styles.inspectModalSub}>
                  {selectedRecordModal?.category} • Status: {selectedRecordModal?.verificationStatus}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRecordModal(null)} style={styles.closeIconBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Summary */}
              <Text style={styles.modalSectionHeading}>Summary</Text>
              <Text style={styles.modalBodyText}>{selectedRecordModal?.summary}</Text>

              {/* Entities */}
              {selectedRecordModal?.entities?.length > 0 && (
                <>
                  <Text style={styles.modalSectionHeading}>Extracted Agricultural Entities</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {selectedRecordModal.entities.map((e, idx) => (
                      <View key={idx} style={styles.entityTagFull}>
                        <Text style={styles.entityTagFullText}>
                          [{e.type}] {e.name} {e.scientific_name ? `• ${e.scientific_name}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Grounded Claims List */}
              {selectedRecordModal?.extracted_information?.length > 0 && (
                <>
                  <Text style={styles.modalSectionHeading}>Grounded Claims & Source Evidence</Text>
                  {selectedRecordModal.extracted_information.map((info, idx) => (
                    <View key={idx} style={styles.claimEvidenceCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.claimHeading}>{info.heading}</Text>
                        <View style={styles.confidenceBadgeSmall}>
                          <Text style={styles.confidenceBadgeText}>{info.confidence?.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={styles.claimInformation}>{info.information}</Text>
                      {info.evidence_text ? (
                        <View style={styles.evidenceQuoteBox}>
                          <Text style={styles.evidenceQuoteText}>
                            Source quote: "{info.evidence_text}"
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </>
              )}

              {/* Verification Reasons */}
              {selectedRecordModal?.verification_reason?.length > 0 && (
                <>
                  <Text style={styles.modalSectionHeading}>Verification & Safety Flags</Text>
                  {selectedRecordModal.verification_reason.map((reason, idx) => (
                    <Text key={idx} style={styles.verificationFlagText}>⚠️ {reason}</Text>
                  ))}
                </>
              )}

              {/* Provenance Metadata */}
              <Text style={styles.modalSectionHeading}>Provenance & Source Tracking</Text>
              <Text style={styles.metaRow}>Source: Wikipedia ({selectedRecordModal?.source?.name})</Text>
              <Text style={styles.metaRow}>URL: {selectedRecordModal?.source?.url}</Text>
              <Text style={styles.metaRow}>Revision ID: {selectedRecordModal?.source?.revision_id}</Text>
              <Text style={styles.metaRow}>
                Revision Timestamp: {new Date(selectedRecordModal?.source?.revision_timestamp || Date.now()).toLocaleString()}
              </Text>
              <Text style={styles.metaRow}>Content Hash: {selectedRecordModal?.contentHash}</Text>
              <Text style={styles.metaRow}>License: CC BY-SA 4.0</Text>

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={styles.modalEditBtn}
                onPress={() => {
                  setEditFormData({
                    summary: selectedRecordModal.summary,
                    category: selectedRecordModal.category,
                  });
                  setEditModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#00E676" style={{ marginRight: 4 }} />
                <Text style={styles.modalEditBtnText}>Edit Summary</Text>
              </TouchableOpacity>

              {selectedRecordModal?.verificationStatus !== 'approved' && (
                <TouchableOpacity
                  style={styles.modalApproveBtn}
                  onPress={() => handleApproveRecord(selectedRecordModal)}
                >
                  <MaterialCommunityIcons name="check-bold" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalApproveBtnText}>Approve for AI</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: EDIT RECORD FIELDS                                      */}
      {/* ============================================================== */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.editBox}>
            <Text style={styles.inspectModalTitle}>Edit Knowledge Node</Text>
            <Text style={styles.fieldSectionHeading}>Summary Description:</Text>
            <TextInput
              style={styles.editTextInput}
              multiline={true}
              numberOfLines={4}
              value={editFormData.summary}
              onChangeText={(txt) => setEditFormData((prev) => ({ ...prev, summary: txt }))}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEdit}>
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071A0E', // High-tech deep forest green command center
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A2614',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 118, 0.2)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#00E676',
    marginTop: 1,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00E676',
    marginLeft: 6,
  },
  agentModelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  agentModelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00E676',
  },
  statsRibbon: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0D3019',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'space-between',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statPillVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statPillLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    textAlign: 'center',
  },
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: '#0A2614',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 118, 0.2)',
  },
  tabNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabNavItemActive: {
    borderBottomColor: '#00E676',
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
  },
  tabNavText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginLeft: 5,
    fontWeight: '600',
  },
  tabNavTextActive: {
    color: '#00E676',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  darkCard: {
    backgroundColor: '#0D3019',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.18)',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.3)' },
      default: { elevation: 2 },
    }),
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  darkCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  sourceTag: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceTagText: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  searchInputText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
  },
  fieldSectionHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
  },
  presetChip: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  presetChipActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  presetChipText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: '#071A0E',
    fontWeight: 'bold',
  },
  configInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configLabelText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  btnSegmentGroup: {
    flexDirection: 'row',
  },
  segmentBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentBtnSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentBtnActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  segmentBtnText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#071A0E',
    fontWeight: 'bold',
  },
  categoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  categoryTileActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  categoryTileText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '600',
  },
  categoryTileTextActive: {
    color: '#071A0E',
    fontWeight: 'bold',
  },
  controlButtonsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cmdBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 3,
  },
  searchCmdBtn: {
    backgroundColor: '#0D47A1',
  },
  launchCmdBtn: {
    backgroundColor: '#00C853',
  },
  pauseCmdBtn: {
    backgroundColor: '#FF8F00',
  },
  resumeCmdBtn: {
    backgroundColor: '#00C853',
  },
  stopCmdBtn: {
    backgroundColor: '#D32F2F',
  },
  cmdBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  pipelineProgressStatus: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#00E676',
  },
  radarStepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  radarNodeItem: {
    flex: 1,
    alignItems: 'center',
  },
  radarNodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  radarNodeCircleActive: {
    borderColor: '#00E676',
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
  },
  radarNodeCircleDone: {
    borderColor: '#00E676',
    backgroundColor: '#00C853',
  },
  radarNodeLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 4,
    textAlign: 'center',
  },
  radarNodeLabelActive: {
    color: '#00E676',
    fontWeight: 'bold',
  },
  radarNodeLabelDone: {
    color: '#FFFFFF',
  },
  activeArticleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
  },
  activeArticleText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '600',
    flex: 1,
  },
  agentTerminal: {
    backgroundColor: '#051209',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  terminalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 118, 0.15)',
    paddingBottom: 6,
    marginBottom: 6,
  },
  terminalHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00E676',
  },
  clearTerminalText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  terminalScroll: {
    height: 140,
  },
  emptyTerminalText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  terminalLogLine: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 10,
    color: 'rgba(0, 230, 118, 0.7)',
    fontFamily: 'monospace',
    marginRight: 6,
  },
  logBody: {
    fontSize: 11,
    color: '#ECEFF1',
    flex: 1,
  },
  logTypeSuccess: {
    color: '#00E676',
  },
  logTypeError: {
    color: '#FF5252',
  },
  logTypeWarning: {
    color: '#FFB300',
  },
  studioDescText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 10,
  },
  diffTopicInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginBottom: 10,
  },
  diffInputsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  diffBoxLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 4,
    fontWeight: '600',
  },
  diffTextArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 11,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  runDiffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 10,
  },
  runDiffBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  safetyAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  safetyAlertText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  diffSummaryText: {
    fontSize: 12,
    color: '#ECEFF1',
    lineHeight: 18,
    marginBottom: 10,
  },
  deltaBoxAdded: {
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00C853',
  },
  deltaHeadingAdded: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#00E676',
    marginBottom: 4,
  },
  deltaItemAdded: {
    fontSize: 11,
    color: '#E8F5E9',
    marginBottom: 2,
  },
  deltaBoxRemoved: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  deltaHeadingRemoved: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 4,
  },
  deltaItemRemoved: {
    fontSize: 11,
    color: '#FFCDD2',
    marginBottom: 2,
  },
  deltaBoxModified: {
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB300',
  },
  deltaHeadingModified: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFB300',
    marginBottom: 4,
  },
  deltaItemModified: {
    fontSize: 11,
    color: '#FFF8E1',
    marginBottom: 2,
  },
  deltaBoxSafety: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF1744',
  },
  deltaHeadingSafety: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF1744',
    marginBottom: 4,
  },
  deltaItemSafety: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  reviewFilterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterSegmentBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterSegmentBtnActive: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  filterSegmentText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  filterSegmentTextActive: {
    color: '#071A0E',
    fontWeight: 'bold',
  },
  reviewSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    marginBottom: 12,
  },
  reviewSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
  },
  knowledgeNodeCard: {
    backgroundColor: '#0D3019',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.18)',
  },
  nodeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nodeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nodeSubMeta: {
    fontSize: 11,
    color: '#00E676',
    marginTop: 2,
  },
  statusTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeAppr: { backgroundColor: 'rgba(0, 200, 83, 0.2)' },
  badgePend: { backgroundColor: 'rgba(255, 179, 0, 0.2)' },
  badgeRej: { backgroundColor: 'rgba(211, 47, 47, 0.2)' },
  statusTagText: { fontSize: 9, fontWeight: 'bold' },
  tagTextAppr: { color: '#00E676' },
  tagTextPend: { color: '#FFB300' },
  tagTextRej: { color: '#FF5252' },
  nodeSummary: {
    fontSize: 12,
    color: '#CFD8DC',
    lineHeight: 18,
    marginBottom: 8,
  },
  entitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  entityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  entityPillText: {
    fontSize: 10,
    color: '#A5D6A7',
    fontWeight: '600',
  },
  evidenceSampleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#00E676',
  },
  evidenceHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  confidencePill: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidencePillText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#00E676',
  },
  evidenceSnippet: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontStyle: 'italic',
  },
  sourceAnchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceAnchorText: {
    fontSize: 11,
    color: '#64B5F6',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  nodeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
  nodeInspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  nodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  nodeApproveBtn: {
    backgroundColor: '#00C853',
  },
  nodeRejectBtn: {
    backgroundColor: '#D32F2F',
  },
  nodeDeleteBtn: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  directiveRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  directiveTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00E676',
    marginBottom: 2,
  },
  directiveDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#00E676',
    fontSize: 12,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  inspectModalContent: {
    backgroundColor: '#0A2614',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  modalHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  inspectModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inspectModalSub: {
    fontSize: 11,
    color: '#00E676',
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 4,
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00E676',
    marginTop: 12,
    marginBottom: 4,
  },
  modalBodyText: {
    fontSize: 12,
    color: '#ECEFF1',
    lineHeight: 18,
  },
  entityTagFull: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  entityTagFullText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  claimEvidenceCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00E676',
  },
  claimHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00E676',
  },
  confidenceBadgeSmall: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#00E676',
  },
  claimInformation: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    lineHeight: 17,
  },
  evidenceQuoteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  evidenceQuoteText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  verificationFlagText: {
    fontSize: 11,
    color: '#FFB300',
    marginBottom: 3,
  },
  metaRow: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 3,
  },
  modalBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#071A0E',
  },
  modalEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E676',
  },
  modalApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalApproveBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editBox: {
    backgroundColor: '#0A2614',
    margin: 20,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalSaveBtn: {
    backgroundColor: '#00C853',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
