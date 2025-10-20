#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update entry point to the new TypeScript compiled version
packageJson.main = 'dist/index.js';
packageJson.types = 'dist/index.d.ts';

// Ensure files array includes the dist directory
if (!packageJson.files) {
    packageJson.files = [];
}
if (!packageJson.files.includes('dist')) {
    packageJson.files.push('dist');
}

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✓ Updated package.json entry point to dist/index.js');
console.log('✓ Updated types declaration to dist/index.d.ts');
console.log('✓ Package is ready for NPM publishing');
