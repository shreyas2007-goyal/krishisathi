// tests/web3Service.test.js
// Unit & contract integrity tests for Web3 Agri-Wallet, Crop Passports, and Smart Escrow.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function loadWeb3Helpers() {
  const src = fs.readFileSync(path.join(ROOT_DIR, 'services', 'web3Service.js'), 'utf8');
  // Extract pure generateDeterministicHash function for direct runtime execution
  const match = src.match(/export function generateDeterministicHash\(input\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'generateDeterministicHash must be exported');
  const fnCode = match[0].replace('export function ', 'function ') + '\nreturn generateDeterministicHash;';
  return new Function(fnCode)();
}

test('generateDeterministicHash produces deterministic 66-char 0x hex hashes', () => {
  const generateDeterministicHash = loadWeb3Helpers();
  const h1 = generateDeterministicHash('KS-BATCH-2026-001');
  const h2 = generateDeterministicHash('KS-BATCH-2026-001');
  const h3 = generateDeterministicHash('KS-BATCH-2026-002');

  assert.equal(h1.length, 66);
  assert.match(h1, /^0x[0-9a-f]{64}$/);
  assert.equal(h1, h2, 'Same input must produce identical hash');
  assert.notEqual(h1, h3, 'Different inputs must produce distinct hashes');
});

test('KisanEscrowTraceability.sol defines provenance and escrow lifecycle', () => {
  const solPath = path.join(ROOT_DIR, 'contracts', 'KisanEscrowTraceability.sol');
  assert.ok(fs.existsSync(solPath));
  const sol = fs.readFileSync(solPath, 'utf8');
  assert.match(sol, /pragma solidity \^0\.8\.20;/);
  assert.match(sol, /contract KisanEscrowTraceability/);
  assert.match(sol, /function registerHarvestBatch/);
  assert.match(sol, /function createEscrowDeal/);
  assert.match(sol, /function releaseEscrow/);
  assert.match(sol, /function raiseDispute/);
});
