#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Restore entry point to legacy version for repo
packageJson.main = 'index.js';
packageJson.types = 'dist/index.d.ts';

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✓ Restored package.json entry point to index.js (legacy)');
console.log('✓ Package.json restored for repository use');
