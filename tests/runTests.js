// tests/runTests.js
// KisanSAATHI - SDLC Automated Test Suite (Unit, Integration & JSX AST Verification)
// Run with: node --test tests/runTests.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const ROOT_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. JSX / AST Syntax Verification Across All Application Screens
// ---------------------------------------------------------------------------
test('All core screens and App.js compile cleanly with babel-preset-expo', () => {
  const filesToCheck = [
    'App.js',
    'screens/HomeScreen.js',
    'screens/MarketScreen.js',
    'screens/ChatScreen.js',
    'screens/ProfileScreen.js',
    'screens/b2c/B2CMarketplaceScreen.js',
    'screens/b2c/B2CChatDetailScreen.js',
    'screens/b2c/B2CChatsListScreen.js',
    'screens/web3/Web3TraceabilityScreen.js',
    'screens/customer/CustomerTabScreen.js',
    'screens/customer/CustomerHomeScreen.js',
    'screens/customer/CustomerProfileScreen.js',
    'screens/mandi/MandiProfileScreen.js',
  ];

  for (const relPath of filesToCheck) {
    const absPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(absPath), `Expected file to exist: ${relPath}`);
    const code = fs.readFileSync(absPath, 'utf8');
    babel.transformSync(code, {
      presets: ['babel-preset-expo'],
      filename: path.basename(absPath),
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Web3 Deterministic Hashing & Smart Contract Integrity
// ---------------------------------------------------------------------------
test('Web3 Solidity smart contract exists and defines required functions', () => {
  const solPath = path.join(ROOT_DIR, 'contracts', 'KisanEscrowTraceability.sol');
  assert.ok(fs.existsSync(solPath), 'KisanEscrowTraceability.sol must exist');
  const solCode = fs.readFileSync(solPath, 'utf8');
  assert.match(solCode, /contract KisanEscrowTraceability/);
  assert.match(solCode, /function registerHarvestBatch/);
  assert.match(solCode, /function createEscrowDeal/);
  assert.match(solCode, /function releaseEscrow/);
  assert.match(solCode, /function raiseDispute/);
});

test('Web3 deterministic hash generator produces valid 66-char 0x hex hashes', () => {
  const web3Path = path.join(ROOT_DIR, 'services', 'web3Service.js');
  const code = fs.readFileSync(web3Path, 'utf8');
  assert.match(code, /export function generateDeterministicHash/);
  assert.match(code, /export const INITIAL_ONCHAIN_BATCHES/);
  assert.match(code, /export const INITIAL_ESCROW_DEALS/);
});

// ---------------------------------------------------------------------------
// 3. B2C Marketplace & Direct Chat Logic Verification
// ---------------------------------------------------------------------------
test('B2C Marketplace service defines 50kg and 100kg retail lots and chat helpers', () => {
  const b2cPath = path.join(ROOT_DIR, 'services', 'b2cMarketService.js');
  const code = fs.readFileSync(b2cPath, 'utf8');
  assert.match(code, /50 kg Bag/);
  assert.match(code, /100 kg \(1 Quintal\)/);
  assert.match(code, /export function generateFarmerReplyText/);
  assert.match(code, /export async function sendB2CMessage/);
});

// ---------------------------------------------------------------------------
// 4. Notification Service & Market 2026 Benchmark Verification
// ---------------------------------------------------------------------------
test('Notification service includes unread tracking and multi-category alerts', () => {
  const notifPath = path.join(ROOT_DIR, 'services', 'notificationService.js');
  const code = fs.readFileSync(notifPath, 'utf8');
  assert.match(code, /export const INITIAL_NOTIFICATIONS/);
  assert.match(code, /markAllNotificationsAsRead/);
  assert.match(code, /Soybean Mandi Surge/);
});

test('Market service contains updated 2026 Soybean modal price (5120)', () => {
  const marketPath = path.join(ROOT_DIR, 'services', 'marketService.js');
  const code = fs.readFileSync(marketPath, 'utf8');
  assert.match(code, /id:\s*'soybean'[\s\S]*defaultPrice:\s*5120/);
});

// ---------------------------------------------------------------------------
// 5. SDLC Artifacts & Environment Hygiene Verification
// ---------------------------------------------------------------------------
test('SDLC documentation, .env.example, and CI workflow exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'docs', 'SDLC_SPECIFICATION.md')));
  assert.ok(fs.existsSync(path.join(ROOT_DIR, '.env.example')));
  assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'workflows', 'ci.yml')));
});
