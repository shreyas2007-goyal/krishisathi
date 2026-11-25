// tests/completeness.test.js
// Repository completeness, backend syntax, and full-project AST integrity checks.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const babel = require('@babel/core');

const ROOT_DIR = path.resolve(__dirname, '..');

function walkJsFiles(dir) {
  const fullDir = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(fullDir)) return [];
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkJsFiles(rel));
    } else if (entry.name.endsWith('.js')) {
      files.push(rel);
    }
  }
  return files;
}

test('Every JS file across screens/, services/, components/, App.js, and index.js compiles cleanly', () => {
  const allFiles = [
    ...walkJsFiles('screens'),
    ...walkJsFiles('services'),
    ...walkJsFiles('components'),
    'App.js',
    'index.js',
  ];

  assert.ok(allFiles.length >= 40, `Expected at least 40 JS source files, found ${allFiles.length}`);

  for (const relPath of allFiles) {
    const absPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(absPath, 'utf8');
    const out = babel.transformSync(code, {
      presets: ['babel-preset-expo'],
      filename: path.basename(absPath),
    });
    assert.ok(out && out.code, `Failed to transform ${relPath}`);
  }
});

test('voice-server/server.js passes Node.js ESM syntax check', () => {
  const serverPath = path.join(ROOT_DIR, 'voice-server', 'server.js');
  assert.ok(fs.existsSync(serverPath));
  execFileSync(process.execPath, ['--check', serverPath], { stdio: 'pipe' });
});

test('Repository contains required SDLC, licensing, documentation, and CI files', () => {
  const required = [
    'README.md',
    'CONTRIBUTING.md',
    'LICENSE',
    '.env.example',
    '.gitignore',
    'package.json',
    'firestore.rules',
    'docs/SDLC_SPECIFICATION.md',
    'PROJECT_DOCUMENTATION.md',
    '.github/workflows/ci.yml',
    'contracts/KisanEscrowTraceability.sol',
  ];

  for (const rel of required) {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, rel)), `Missing required project file: ${rel}`);
  }
});
