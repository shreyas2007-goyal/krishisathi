// tests/b2cMarketService.test.js
// Unit tests for Kisan Direct B2C retail quantities and farmer chat reply simulation.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function loadFarmerReplyFn() {
  const src = fs.readFileSync(path.join(ROOT_DIR, 'services', 'b2cMarketService.js'), 'utf8');
  const match = src.match(/export function generateFarmerReplyText\([\s\S]*?\n\}/);
  assert.ok(match, 'generateFarmerReplyText must exist');
  const fnCode = match[0].replace('export function ', 'function ') + '\nreturn generateFarmerReplyText;';
  return new Function(fnCode)();
}

test('generateFarmerReplyText responds contextually to price, delivery, quality, and quantity queries', () => {
  const generateFarmerReplyText = loadFarmerReplyFn();

  const priceReply = generateFarmerReplyText('Bhav thoda kam ho sakta hai?', 'Wheat', 'Rameshwar');
  assert.match(priceReply, /डिस्काउंट|भाव/);

  const deliveryReply = generateFarmerReplyText('Farm pickup ya delivery?', 'Wheat', 'Rameshwar');
  assert.match(deliveryReply, /खेत|पिकअप/);

  const qualityReply = generateFarmerReplyText('Sample photo aur quality?', 'Wheat', 'Rameshwar');
  assert.match(qualityReply, /सैंपल|फसल/);

  const qtyReply = generateFarmerReplyText('50 kg available hai kya?', 'Wheat', 'Rameshwar');
  assert.match(qtyReply, /50 kg|100 kg/);

  const defaultReply = generateFarmerReplyText('Namaste', 'Wheat', 'Rameshwar');
  assert.match(defaultReply, /Rameshwar/);
});

test('B2C listings include 25kg, 50kg, and 100kg (1 Quintal) package sizes', () => {
  const src = fs.readFileSync(path.join(ROOT_DIR, 'services', 'b2cMarketService.js'), 'utf8');
  assert.match(src, /25 kg Bag/);
  assert.match(src, /50 kg Bag/);
  assert.match(src, /100 kg \(1 Quintal\)/);
});
