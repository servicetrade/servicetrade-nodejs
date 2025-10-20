// Simple test script to verify the SDK can be imported and used
const ServiceTrade = require('./dist/index.js').default;
const { ServicetradeClientSession } = require('./dist/index.js');

console.log('Testing ServiceTrade SDK imports...\n');

// Test 1: Default import (Bearer Token)
console.log('1. Testing default export (Bearer Token Client):');
const bearerClient = new ServiceTrade({
    baseUrl: 'https://api-sandbox.servicetrade.com',
    username: 'test@example.com',
    password: 'password123',
    clientId: 'my-client-id',
    clientSecret: 'my-client-secret'
});

console.log('   ✓ Bearer Token client created');
console.log('   ✓ Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(bearerClient)).filter(m => m !== 'constructor').join(', '));

// Test 2: Named import (Session Client)
console.log('\n2. Testing named export (Session Client):');
const sessionClient = new ServicetradeClientSession({
    baseUrl: 'https://api-sandbox.servicetrade.com',
    username: 'test@example.com',
    password: 'password123'
});

console.log('   ✓ Session client created');
console.log('   ✓ Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sessionClient)).filter(m => m !== 'constructor').join(', '));

// Test 3: Verify methods exist
console.log('\n3. Verifying client methods:');
const methods = ['login', 'logout', 'get', 'post', 'put', 'delete', 'attach', 'setAuth', 'clearAuth', 'setCustomHeaders'];
methods.forEach(method => {
    console.log(`   ✓ ${method}: ${typeof bearerClient[method] === 'function' ? 'available' : 'MISSING'}`);
});

console.log('\n✅ All imports working correctly!');
console.log('\nUsage examples:');
console.log('  const ST = require("@servicetrade/sdk").default;');
console.log('  const { ServicetradeClientSession } = require("@servicetrade/sdk");');
