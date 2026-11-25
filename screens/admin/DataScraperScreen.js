// screens/admin/DataScraperScreen.js
// KisanSAATHI Data Scraper - Internal Administration Interface

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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AGRICULTURAL_CATEGORIES,
  PRESET_TOPICS,
  searchWikipedia,
  fetchWikipediaPage,
  extractWithOpenAI,
  getKnowledgeRecords,
  updateRecordStatus,
  deleteKnowledgeRecord,
  getScraperStats,
} from '../../services/scraperService';

const { width: windowWidth } = Dimensions.get('window');

export default function DataScraperScreen({ navigation }) {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState('scraper'); // 'scraper' | 'dashboard' | 'review'

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
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [activityLogs, setActivityLogs] = useState([]);

  // Control Refs for Pause/Stop in async loops
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);

  // Statistics State
  const [stats, setStats] = useState({
    totalDiscovered: 0,
    totalExtracted: 0,
    successful: 0,
    pendingReview: 0,
    approved: 0,
    duplicates: 0,
    failed: 0,
    lastSync: null,
  });

  // Admin Review System State
  const [records, setRecords] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('pending_review'); // 'pending_review' | 'approved' | 'rejected' | 'all'
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedRecordModal, setSelectedRecordModal] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({ summary: '', category: '' });

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
      setStats((prev) => ({
        ...prev,
        totalExtracted: s.totalRecords || 0,
        approved: s.approved || 0,
        pendingReview: s.pendingReview || 0,
        rejected: s.rejected || 0,
        lastSync: s.lastUpdated || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  };

  const loadRecords = async () => {
    setReviewLoading(true);
    try {
      const data = await getKnowledgeRecords({ status: reviewFilter });
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
    } else if (activeTab === 'dashboard') {
      loadStats();
    }
  }, [activeTab, reviewFilter]);

  /**
   * Search Wikipedia for articles
   */
  const handleSearchWikipedia = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Required', 'Please enter a search topic or choose from the presets.');
      return;
    }

    setIsSearching(true);
    addLog(`Initiating Wikipedia search: "${searchQuery}" (${sourceLang.toUpperCase()})...`);

    try {
      const data = await searchWikipedia({
        query: searchQuery.trim(),
        lang: sourceLang,
        limit: articleCount,
      });

      setSearchResults(data.results || []);
      setStats((prev) => ({ ...prev, totalDiscovered: prev.totalDiscovered + (data.results?.length || 0) }));
      addLog(`Discovered ${data.results?.length || 0} candidate articles from Wikimedia API.`, 'success');
    } catch (err) {
      addLog(`Search failed: ${err.message}`, 'error');
      Alert.alert('Search Error', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Start Batch Extraction Pipeline
   */
  const handleStartExtraction = async () => {
    let articlesToProcess = searchResults;

    if (articlesToProcess.length === 0) {
      // Auto-search first if not yet searched
      setIsSearching(true);
      addLog(`Auto-searching Wikipedia for: "${searchQuery}"...`);
      try {
        const searchRes = await searchWikipedia({
          query: searchQuery.trim(),
          lang: sourceLang,
          limit: articleCount,
        });
        articlesToProcess = searchRes.results || [];
        setSearchResults(articlesToProcess);
      } catch (err) {
        addLog(`Auto-search failed: ${err.message}`, 'error');
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
    addLog(`Starting AI Extraction Bot for ${articlesToProcess.length} articles...`, 'success');

    let processedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (let i = 0; i < articlesToProcess.length; i++) {
      // Check if user stopped
      if (isStoppedRef.current) {
        addLog('Extraction process stopped by administrator.', 'warning');
        setBotState('stopped');
        break;
      }

      // Check if user paused (wait until unpaused)
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

      addLog(`[${i + 1}/${articlesToProcess.length}] Fetching article: "${item.title}" (PageID: ${item.pageId})...`);

      try {
        // Step 1: Fetch plain text extract and latest revision info from MediaWiki
        const pageData = await fetchWikipediaPage({
          pageId: item.pageId,
          lang: sourceLang,
          depth: extractionDepth,
        });

        addLog(
          `Retrieved revision #${pageData.revisionId} (${new Date(pageData.revisionTimestamp).toLocaleDateString()}). Sending to OpenAI...`
        );

        // Step 2: Intelligent Structured Extraction via existing OpenAI Integration
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
          addLog(`Skipped unchanged revision #${pageData.revisionId} (Already in database).`, 'warning');
        } else {
          processedCount++;
          addLog(
            `Extracted & structured successfully. Saved as Pending Review (Doc: ${extractResult.docId}).`,
            'success'
          );
        }

        // Polite rate limit delay between requests (1 second) to respect Wikimedia policies
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (articleErr) {
        failedCount++;
        addLog(`Failed to process "${item.title}": ${articleErr.message}`, 'error');
      }
    }

    if (!isStoppedRef.current) {
      setBotState('completed');
      addLog(
        `Batch completed: ${processedCount} processed, ${duplicateCount} unchanged, ${failedCount} failed.`,
        'success'
      );
    }

    // Refresh statistics & records
    loadStats();
    loadRecords();
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setBotState('paused');
    addLog('Bot paused. Click Resume to continue.', 'warning');
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setBotState('running');
    addLog('Bot resumed extraction pipeline.', 'info');
  };

  const handleStop = () => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setBotState('stopped');
    addLog('Bot stop signal received.', 'error');
  };

  /**
   * Admin Review Actions
   */
  const handleApproveRecord = async (record) => {
    try {
      await updateRecordStatus({ id: record.id, verificationStatus: 'approved' });
      addLog(`Record "${record.title}" approved by administrator.`, 'success');
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
      'Confirm Deletion',
      `Delete "${record.title}" from the agricultural knowledge database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteKnowledgeRecord(record.id);
              addLog(`Deleted record "${record.title}".`, 'info');
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
      addLog(`Edited record fields for "${selectedRecordModal.title}".`, 'success');
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
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>KisanSAATHI Data Scraper</Text>
          <Text style={styles.headerSubtitle}>Wikipedia & OpenAI Knowledge Extraction Engine</Text>
        </View>
        <View style={styles.liveServerBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.liveServerText}>AI Online</Text>
        </View>
      </View>

      {/* TOP TAB SWITCHER */}
      <View style={styles.navTabsRow}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'scraper' && styles.navTabActive]}
          onPress={() => setActiveTab('scraper')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="robot-vacuum"
            size={18}
            color={activeTab === 'scraper' ? '#1B5E20' : '#666'}
          />
          <Text style={[styles.navTabText, activeTab === 'scraper' && styles.navTabTextActive]}>
            Scraper Bot
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'review' && styles.navTabActive]}
          onPress={() => setActiveTab('review')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="check-decagram-outline"
            size={18}
            color={activeTab === 'review' ? '#1B5E20' : '#666'}
          />
          <Text style={[styles.navTabText, activeTab === 'review' && styles.navTabTextActive]}>
            Admin Review ({stats.pendingReview})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'dashboard' && styles.navTabActive]}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chart-box-outline"
            size={18}
            color={activeTab === 'dashboard' ? '#1B5E20' : '#666'}
          />
          <Text style={[styles.navTabText, activeTab === 'dashboard' && styles.navTabTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ============================================================== */}
        {/* TAB 1: SCRAPER BOT & EXTRACTION ENGINE                         */}
        {/* ============================================================== */}
        {activeTab === 'scraper' && (
          <View>
            {/* SEARCH TOPIC CARD */}
            <View style={styles.cardContainer}>
              <Text style={styles.cardHeading}>1. Search Topic & Target Information</Text>

              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color="#666" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Enter topic or agricultural information to collect..."
                  placeholderTextColor="#888"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Topic Preset Chips */}
              <Text style={styles.subLabel}>Recommended Agricultural Topics:</Text>
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

            {/* EXTRACTION CONFIGURATION */}
            <View style={styles.cardContainer}>
              <Text style={styles.cardHeading}>2. Extraction Settings</Text>

              {/* Language Selection: English / Hindi */}
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Source Language:</Text>
                <View style={styles.pillGroup}>
                  <TouchableOpacity
                    style={[styles.pillBtn, sourceLang === 'en' && styles.pillBtnActive]}
                    onPress={() => setSourceLang('en')}
                  >
                    <Text style={[styles.pillBtnText, sourceLang === 'en' && styles.pillBtnTextActive]}>
                      English (en)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillBtn, sourceLang === 'hi' && styles.pillBtnActive]}
                    onPress={() => setSourceLang('hi')}
                  >
                    <Text style={[styles.pillBtnText, sourceLang === 'hi' && styles.pillBtnTextActive]}>
                      Hindi (hi)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Data Category */}
              <View style={[styles.configRow, { alignItems: 'flex-start', marginTop: 12 }]}>
                <Text style={[styles.configLabel, { marginTop: 6 }]}>Category:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginLeft: 10 }}>
                  {AGRICULTURAL_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catPill, selectedCategory === cat.id && styles.catPillActive]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={14}
                        color={selectedCategory === cat.id ? '#FFFFFF' : '#2E7D32'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.catPillText, selectedCategory === cat.id && styles.catPillTextActive]}>
                        {cat.nameEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Number of Articles & Depth */}
              <View style={[styles.configRow, { marginTop: 12 }]}>
                <Text style={styles.configLabel}>Articles Limit:</Text>
                <View style={styles.pillGroup}>
                  {[3, 5, 10].map((cnt) => (
                    <TouchableOpacity
                      key={cnt}
                      style={[styles.pillBtnSmall, articleCount === cnt && styles.pillBtnActive]}
                      onPress={() => setArticleCount(cnt)}
                    >
                      <Text style={[styles.pillBtnText, articleCount === cnt && styles.pillBtnTextActive]}>
                        {cnt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.configRow, { marginTop: 12 }]}>
                <Text style={styles.configLabel}>Extraction Depth:</Text>
                <View style={styles.pillGroup}>
                  {[
                    { id: 'summary', label: 'Summary' },
                    { id: 'standard', label: 'Standard' },
                    { id: 'full', label: 'Full Detailed' },
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.pillBtn, extractionDepth === d.id && styles.pillBtnActive]}
                      onPress={() => setExtractionDepth(d.id)}
                    >
                      <Text style={[styles.pillBtnText, extractionDepth === d.id && styles.pillBtnTextActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ACTION CONTROLS */}
            <View style={styles.actionButtonsRow}>
              {/* Search Wikipedia */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.searchBtn]}
                onPress={handleSearchWikipedia}
                disabled={isSearching || botState === 'running'}
                activeOpacity={0.8}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Search Wikipedia</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Start Extraction */}
              {botState !== 'running' && botState !== 'paused' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.startBtn]}
                  onPress={handleStartExtraction}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Start Extraction</Text>
                </TouchableOpacity>
              )}

              {/* Pause Extraction */}
              {botState === 'running' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.pauseBtn]}
                  onPress={handlePause}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="pause" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Pause</Text>
                </TouchableOpacity>
              )}

              {/* Resume Extraction */}
              {botState === 'paused' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.resumeBtn]}
                  onPress={handleResume}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Resume</Text>
                </TouchableOpacity>
              )}

              {/* Stop Extraction */}
              {(botState === 'running' || botState === 'paused') && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.stopBtn]}
                  onPress={handleStop}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="stop" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* LIVE EXTRACTION STATUS PANEL */}
            <View style={styles.statusPanelCard}>
              <View style={styles.statusHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={[
                      styles.statusIndicatorDot,
                      botState === 'running' && { backgroundColor: '#2E7D32' },
                      botState === 'paused' && { backgroundColor: '#F57C00' },
                      botState === 'completed' && { backgroundColor: '#1565C0' },
                    ]}
                  />
                  <Text style={styles.statusTitle}>
                    Bot Status: <Text style={{ fontWeight: 'bold' }}>{botState.toUpperCase()}</Text>
                  </Text>
                </View>

                {botState === 'running' && (
                  <Text style={styles.progressCounter}>
                    {currentProgress.current} / {currentProgress.total} Articles
                  </Text>
                )}
              </View>

              {currentProgress.currentTitle ? (
                <Text style={styles.activeArticleText} numberOfLines={1}>
                  Current: {currentProgress.currentTitle}
                </Text>
              ) : null}

              {/* REAL-TIME LOG STREAM */}
              <View style={styles.logTerminal}>
                <View style={styles.terminalHeader}>
                  <Text style={styles.terminalTitle}>Real-Time Extraction Log Stream</Text>
                  <TouchableOpacity onPress={() => setActivityLogs([])}>
                    <Text style={styles.clearLogsText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.logScrollView} nestedScrollEnabled={true}>
                  {activityLogs.length === 0 ? (
                    <Text style={styles.emptyLogText}>
                      Ready. Enter an agricultural topic and click "Start Extraction" to run the pipeline.
                    </Text>
                  ) : (
                    activityLogs.map((log) => (
                      <View key={log.id} style={styles.logLine}>
                        <Text style={styles.logTime}>[{log.time}]</Text>
                        <Text
                          style={[
                            styles.logMsg,
                            log.type === 'success' && styles.logSuccess,
                            log.type === 'error' && styles.logError,
                            log.type === 'warning' && styles.logWarning,
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
        {/* TAB 2: DASHBOARD & ANALYTICS                                   */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <View>
            <View style={styles.cardContainer}>
              <Text style={styles.cardHeading}>Scraping & Knowledge Base Statistics</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{stats.totalExtracted}</Text>
                  <Text style={styles.statLabel}>Total Articles</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.statNumber, { color: '#2E7D32' }]}>{stats.approved}</Text>
                  <Text style={styles.statLabel}>Approved</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#FFF8E1' }]}>
                  <Text style={[styles.statNumber, { color: '#F57C00' }]}>{stats.pendingReview}</Text>
                  <Text style={styles.statLabel}>Pending Review</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#FFEBEE' }]}>
                  <Text style={[styles.statNumber, { color: '#C62828' }]}>{stats.rejected}</Text>
                  <Text style={styles.statLabel}>Rejected</Text>
                </View>
              </View>

              <View style={styles.detailList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Wikimedia API Source:</Text>
                  <Text style={styles.detailValue}>English & Hindi Official Action APIs</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Processing Engine:</Text>
                  <Text style={styles.detailValue}>OpenAI gpt-4o-mini (Zero Hallucination)</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Database Collection:</Text>
                  <Text style={styles.detailValue}>agricultural_knowledge</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Last Synchronization:</Text>
                  <Text style={styles.detailValue}>
                    {stats.lastSync ? new Date(stats.lastSync).toLocaleString('en-IN') : 'Just now'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ADMIN REVIEW SYSTEM                                     */}
        {/* ============================================================== */}
        {activeTab === 'review' && (
          <View>
            {/* Filter Bar */}
            <View style={styles.reviewFilterRow}>
              {[
                { id: 'pending_review', label: 'Pending Review' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'all', label: 'All Records' },
              ].map((rf) => (
                <TouchableOpacity
                  key={rf.id}
                  style={[styles.filterChip, reviewFilter === rf.id && styles.filterChipActive]}
                  onPress={() => setReviewFilter(rf.id)}
                >
                  <Text style={[styles.filterChipText, reviewFilter === rf.id && styles.filterChipTextActive]}>
                    {rf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {reviewLoading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color="#1B5E20" />
                <Text style={styles.loaderText}>Loading knowledge records...</Text>
              </View>
            ) : records.length === 0 ? (
              <View style={styles.emptyRecordsBox}>
                <MaterialCommunityIcons name="book-open-page-variant-outline" size={42} color="#AAA" />
                <Text style={styles.emptyRecordsTitle}>No Records Found</Text>
                <Text style={styles.emptyRecordsSub}>
                  No articles currently in the "{reviewFilter}" queue. Run the Scraper Bot to extract topics.
                </Text>
              </View>
            ) : (
              records.map((rec) => {
                const isPending = rec.verificationStatus === 'pending_review';
                const isApproved = rec.verificationStatus === 'approved';
                const isRejected = rec.verificationStatus === 'rejected';

                return (
                  <View key={rec.id} style={styles.recordCard}>
                    <View style={styles.recordTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recordTitle}>{rec.title}</Text>
                        <Text style={styles.recordCategory}>
                          {rec.category} • {rec.language} • Rev #{rec.source?.revision_id || 'N/A'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isApproved && styles.badgeApproved,
                          isPending && styles.badgePending,
                          isRejected && styles.badgeRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isApproved && styles.badgeTextApproved,
                            isPending && styles.badgeTextPending,
                            isRejected && styles.badgeTextRejected,
                          ]}
                        >
                          {rec.verificationStatus?.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.recordSummary} numberOfLines={3}>
                      {rec.summary}
                    </Text>

                    {/* Quick Data Chips */}
                    {rec.extractedData?.crop_name && (
                      <View style={styles.recordChipsRow}>
                        <View style={styles.smallDataChip}>
                          <Text style={styles.smallDataChipText}>
                            Crop: {rec.extractedData.crop_name}
                            {rec.extractedData.scientific_name ? ` (${rec.extractedData.scientific_name})` : ''}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Source Attribution Link */}
                    <TouchableOpacity
                      onPress={() => rec.source?.url && Linking.openURL(rec.source.url)}
                      style={styles.sourceLinkRow}
                    >
                      <MaterialCommunityIcons name="open-in-new" size={14} color="#1565C0" />
                      <Text style={styles.sourceLinkText}>
                        Source: Wikipedia ({new Date(rec.source?.revision_timestamp || Date.now()).toLocaleDateString()})
                      </Text>
                    </TouchableOpacity>

                    {/* Admin Action Buttons */}
                    <View style={styles.recordActionsRow}>
                      <TouchableOpacity
                        style={[styles.smallActionBtn, styles.viewDetailsBtn]}
                        onPress={() => setSelectedRecordModal(rec)}
                      >
                        <MaterialCommunityIcons name="eye-outline" size={14} color="#333" />
                        <Text style={styles.smallActionBtnText}>Inspect</Text>
                      </TouchableOpacity>

                      {isPending && (
                        <>
                          <TouchableOpacity
                            style={[styles.smallActionBtn, styles.approveBtn]}
                            onPress={() => handleApproveRecord(rec)}
                          >
                            <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                            <Text style={[styles.smallActionBtnText, { color: '#FFFFFF' }]}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallActionBtn, styles.rejectBtn]}
                            onPress={() => handleRejectRecord(rec)}
                          >
                            <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                            <Text style={[styles.smallActionBtnText, { color: '#FFFFFF' }]}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {isApproved && (
                        <TouchableOpacity
                          style={[styles.smallActionBtn, styles.rejectBtn]}
                          onPress={() => handleRejectRecord(rec)}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                          <Text style={[styles.smallActionBtnText, { color: '#FFFFFF' }]}>Revoke</Text>
                        </TouchableOpacity>
                      )}

                      {isRejected && (
                        <TouchableOpacity
                          style={[styles.smallActionBtn, styles.approveBtn]}
                          onPress={() => handleApproveRecord(rec)}
                        >
                          <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                          <Text style={[styles.smallActionBtnText, { color: '#FFFFFF' }]}>Re-Approve</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.smallActionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteRecord(rec)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={14} color="#C62828" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: DETAILED RECORD INSPECTION                            */}
      {/* ============================================================== */}
      <Modal
        visible={!!selectedRecordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedRecordModal(null)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.inspectModalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedRecordModal?.title}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedRecordModal?.category} • Status: {selectedRecordModal?.verificationStatus}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRecordModal(null)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.inspectSectionHeading}>Summary</Text>
              <Text style={styles.inspectBodyText}>{selectedRecordModal?.summary}</Text>

              {selectedRecordModal?.extractedData?.crop_name && (
                <>
                  <Text style={styles.inspectSectionHeading}>Crop & Botanical Details</Text>
                  <Text style={styles.inspectBodyText}>
                    Crop Name: {selectedRecordModal.extractedData.crop_name}
                  </Text>
                  {selectedRecordModal.extractedData.scientific_name && (
                    <Text style={styles.inspectBodyText}>
                      Scientific Name: {selectedRecordModal.extractedData.scientific_name}
                    </Text>
                  )}
                </>
              )}

              {selectedRecordModal?.extractedData?.growing_conditions?.length > 0 && (
                <>
                  <Text style={styles.inspectSectionHeading}>Growing Conditions</Text>
                  {selectedRecordModal.extractedData.growing_conditions.map((item, i) => (
                    <Text key={i} style={styles.inspectBullet}>• {item}</Text>
                  ))}
                </>
              )}

              {selectedRecordModal?.extractedData?.soil_requirements?.length > 0 && (
                <>
                  <Text style={styles.inspectSectionHeading}>Soil Requirements</Text>
                  {selectedRecordModal.extractedData.soil_requirements.map((item, i) => (
                    <Text key={i} style={styles.inspectBullet}>• {item}</Text>
                  ))}
                </>
              )}

              {selectedRecordModal?.extractedData?.cultivation_methods?.length > 0 && (
                <>
                  <Text style={styles.inspectSectionHeading}>Cultivation & Farming Methods</Text>
                  {selectedRecordModal.extractedData.cultivation_methods.map((item, i) => (
                    <Text key={i} style={styles.inspectBullet}>• {item}</Text>
                  ))}
                </>
              )}

              {selectedRecordModal?.extractedData?.key_facts?.length > 0 && (
                <>
                  <Text style={styles.inspectSectionHeading}>Key Agricultural Facts</Text>
                  {selectedRecordModal.extractedData.key_facts.map((item, i) => (
                    <Text key={i} style={styles.inspectBullet}>• {item}</Text>
                  ))}
                </>
              )}

              <Text style={styles.inspectSectionHeading}>Source & Revision Provenance</Text>
              <Text style={styles.inspectMetaText}>Source: Wikipedia ({selectedRecordModal?.source?.name})</Text>
              <Text style={styles.inspectMetaText}>URL: {selectedRecordModal?.source?.url}</Text>
              <Text style={styles.inspectMetaText}>Revision ID: {selectedRecordModal?.source?.revision_id}</Text>
              <Text style={styles.inspectMetaText}>
                Revision Date: {new Date(selectedRecordModal?.source?.revision_timestamp || Date.now()).toLocaleString()}
              </Text>
              <Text style={styles.inspectMetaText}>Content Hash: {selectedRecordModal?.contentHash}</Text>
              <Text style={styles.inspectMetaText}>License: CC BY-SA 4.0</Text>

              <View style={{ height: 30 }} />
            </ScrollView>

            {/* Modal Bottom Bar */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditFormData({
                    summary: selectedRecordModal.summary,
                    category: selectedRecordModal.category,
                  });
                  setEditModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#333" style={{ marginRight: 4 }} />
                <Text style={styles.editBtnText}>Edit Fields</Text>
              </TouchableOpacity>

              {selectedRecordModal?.verificationStatus !== 'approved' && (
                <TouchableOpacity
                  style={styles.modalApproveBtn}
                  onPress={() => handleApproveRecord(selectedRecordModal)}
                >
                  <MaterialCommunityIcons name="check-bold" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.modalApproveBtnText}>Approve for AI</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDIT FIELDS                                           */}
      {/* ============================================================== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.editModalBox}>
            <Text style={styles.modalTitle}>Edit Extracted Record</Text>
            <Text style={styles.subLabel}>Summary Description:</Text>
            <TextInput
              style={styles.editInputArea}
              multiline={true}
              numberOfLines={4}
              value={editFormData.summary}
              onChangeText={(txt) => setEditFormData((prev) => ({ ...prev, summary: txt }))}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
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
    backgroundColor: '#F5F7F5',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#666',
  },
  liveServerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
    marginRight: 4,
  },
  liveServerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  navTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navTabActive: {
    borderBottomColor: '#1B5E20',
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  navTabTextActive: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECE8',
    elevation: 1,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D7E3D7',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#222',
  },
  subLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  presetChipActive: {
    backgroundColor: '#1B5E20',
  },
  presetChipText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  pillGroup: {
    flexDirection: 'row',
  },
  pillBtn: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  pillBtnSmall: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  pillBtnActive: {
    backgroundColor: '#1B5E20',
  },
  pillBtnText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#DCE8DC',
  },
  catPillActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  catPillText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 3,
    elevation: 2,
  },
  searchBtn: {
    backgroundColor: '#1565C0',
  },
  startBtn: {
    backgroundColor: '#2E7D32',
  },
  pauseBtn: {
    backgroundColor: '#F57C00',
  },
  resumeBtn: {
    backgroundColor: '#2E7D32',
  },
  stopBtn: {
    backgroundColor: '#C62828',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusPanelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8ECE8',
    elevation: 1,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9E9E9E',
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 13,
    color: '#333',
  },
  progressCounter: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  activeArticleText: {
    fontSize: 11,
    color: '#555',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  logTerminal: {
    backgroundColor: '#1E231F',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#2D362F',
    paddingBottom: 6,
    marginBottom: 6,
  },
  terminalTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#81C784',
  },
  clearLogsText: {
    fontSize: 11,
    color: '#A5D6A7',
  },
  logScrollView: {
    height: 150,
  },
  emptyLogText: {
    fontSize: 11,
    color: '#777',
    fontStyle: 'italic',
  },
  logLine: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logTime: {
    fontSize: 10,
    color: '#66BB6A',
    marginRight: 6,
    fontFamily: 'monospace',
  },
  logMsg: {
    fontSize: 11,
    color: '#ECEFF1',
    flex: 1,
  },
  logSuccess: {
    color: '#A5D6A7',
  },
  logError: {
    color: '#EF9A9A',
  },
  logWarning: {
    color: '#FFE082',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  detailList: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailKey: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  reviewFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  filterChipActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loaderBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 12,
  },
  emptyRecordsBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRecordsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
  },
  emptyRecordsSub: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8ECE8',
    elevation: 1,
  },
  recordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  recordCategory: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeApproved: {
    backgroundColor: '#E8F5E9',
  },
  badgePending: {
    backgroundColor: '#FFF8E1',
  },
  badgeRejected: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeTextApproved: {
    color: '#2E7D32',
  },
  badgeTextPending: {
    color: '#F57C00',
  },
  badgeTextRejected: {
    color: '#C62828',
  },
  recordSummary: {
    fontSize: 12,
    color: '#444',
    lineHeight: 18,
    marginBottom: 8,
  },
  recordChipsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  smallDataChip: {
    backgroundColor: '#F1F5F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smallDataChipText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  sourceLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceLinkText: {
    fontSize: 11,
    color: '#1565C0',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  recordActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  viewDetailsBtn: {
    backgroundColor: '#F0F0F0',
  },
  approveBtn: {
    backgroundColor: '#2E7D32',
  },
  rejectBtn: {
    backgroundColor: '#C62828',
  },
  deleteBtn: {
    backgroundColor: '#FFEBEE',
  },
  smallActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  inspectModalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inspectSectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 12,
    marginBottom: 4,
  },
  inspectBodyText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  inspectBullet: {
    fontSize: 12,
    color: '#444',
    marginLeft: 6,
    marginBottom: 3,
  },
  inspectMetaText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  modalBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FAFAFA',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modalApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalApproveBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editModalBox: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 14,
    padding: 18,
  },
  editInputArea: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#222',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
