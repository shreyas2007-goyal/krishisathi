// tests/marketAndNotifications.test.js
// Unit tests for 2026 Mandi benchmarks, Notification service, and Express AI/Scraper backend.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('marketService.js has updated 2026 Soybean modal price (5120)', () => {
  const src = fs.readFileSync(path.join(ROOT_DIR, 'services', 'marketService.js'), 'utf8');
  assert.match(src, /id:\s*'soybean'[\s\S]*defaultPrice:\s*5120/);
  assert.match(src, /export const INDIAN_STATES/);
});

test('notificationService.js defines unread notifications and category actions', () => {
  const src = fs.readFileSync(path.join(ROOT_DIR, 'services', 'notificationService.js'), 'utf8');
  assert.match(src, /export const INITIAL_NOTIFICATIONS/);
  assert.match(src, /Soybean Mandi Surge/);
  assert.match(src, /markAllNotificationsAsRead/);
  assert.match(src, /actionRoute:\s*'Market'/);
  assert.match(src, /actionRoute:\s*'B2CChatsList'/);
});

test('voice-server/server.js configures 2026 mandi benchmarks and live Wikipedia scanner', () => {
  const src = fs.readFileSync(path.join(ROOT_DIR, 'voice-server', 'server.js'), 'utf8');
  assert.match(src, /LIVE_2026_MANDI_RATES/);
  assert.match(src, /4,892/);
  assert.match(src, /scanWikipediaLive/);
  assert.match(src, /app\.post\('\/chat'/);
});
