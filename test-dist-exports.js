// Test script to verify the compiled dist/index.js exports work correctly
const assert = require('assert');

console.log('Testing compiled dist exports...\n');

// Test default export (should be ServicetradeClientBearerToken)
const DefaultExport = require('./dist/index.js').default;
console.log('✓ Default export loaded:', DefaultExport.name);
assert.strictEqual(DefaultExport.name, 'ServicetradeClientBearerToken', 'Default export should be ServicetradeClientBearerToken');

// Test named exports
const {
    ServicetradeClientBearerToken,
    ServicetradeClientSession,
    ServicetradeClient
} = require('./dist/index.js');

console.log('✓ Named export ServicetradeClientBearerToken:', ServicetradeClientBearerToken.name);
console.log('✓ Named export ServicetradeClientSession:', ServicetradeClientSession.name);
console.log('✓ Named export ServicetradeClient:', ServicetradeClient.name);

assert.strictEqual(ServicetradeClientBearerToken.name, 'ServicetradeClientBearerToken');
assert.strictEqual(ServicetradeClientSession.name, 'ServicetradePHPSessionAuth');
assert.strictEqual(ServicetradeClient.name, 'ServicetradeClient');

// Test instantiation
const bearerClient = new DefaultExport({
    username: 'test',
    password: 'test'
});

const sessionClient = new ServicetradeClientSession({
    username: 'test',
    password: 'test'
});

console.log('✓ Bearer token client instantiated');
console.log('✓ Session client instantiated');

// Verify methods exist
assert.strictEqual(typeof bearerClient.login, 'function');
assert.strictEqual(typeof bearerClient.logout, 'function');
assert.strictEqual(typeof bearerClient.get, 'function');
assert.strictEqual(typeof bearerClient.post, 'function');
assert.strictEqual(typeof bearerClient.put, 'function');
assert.strictEqual(typeof bearerClient.delete, 'function');
assert.strictEqual(typeof bearerClient.attach, 'function');

console.log('✓ All client methods exist');

console.log('\n✅ All dist export tests passed!');
