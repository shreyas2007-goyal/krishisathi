// __tests__/App.test.js
// Verifies root App navigation and Babel JSX compilation across all role-based screens.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const ROOT_DIR = path.resolve(__dirname, '..');

test('App.js registers all role dashboards, B2C, and Web3 routes', () => {
  const appCode = fs.readFileSync(path.join(ROOT_DIR, 'App.js'), 'utf8');
  assert.match(appCode, /CustomerDashboard/);
  assert.match(appCode, /MandiDashboard/);
  assert.match(appCode, /FarmerDashboard/);
  assert.match(appCode, /B2CMarketplace/);
  assert.match(appCode, /B2CChatDetail/);
  assert.match(appCode, /B2CChatsList/);
  assert.match(appCode, /Web3Traceability/);
});

test('All application screens compile cleanly via babel-preset-expo', () => {
  const screens = [
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
    'screens/admin/DataScraperScreen.js',
  ];

  for (const relPath of screens) {
    const absPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(absPath), `Missing screen: ${relPath}`);
    const code = fs.readFileSync(absPath, 'utf8');
    const result = babel.transformSync(code, {
      presets: ['babel-preset-expo'],
      filename: path.basename(absPath),
    });
    assert.ok(result && result.code, `Empty Babel output for ${relPath}`);
  }
});
