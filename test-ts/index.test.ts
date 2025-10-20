import assert from 'assert';
import ServicetradeClientBearerToken, {
    ServicetradeClientSession,
    ServicetradeClient,
} from '../src/index';

// Also test importing as named exports
import {
    ServicetradeClientBearerToken as BearerToken,
    ServicetradeClientSession as SessionClient,
} from '../src/index';

describe('Module exports', function() {

    it('Default export should be ServicetradeClientBearerToken', function() {
        assert.strictEqual(ServicetradeClientBearerToken.name, 'ServicetradeClientBearerToken');

        const client = new ServicetradeClientBearerToken({
            username: 'test',
            password: 'test'
        });

        assert.ok(client);
        assert.strictEqual(typeof client.login, 'function');
    });

    it('Named export ServicetradeClientBearerToken should work', function() {
        assert.strictEqual(BearerToken.name, 'ServicetradeClientBearerToken');

        const client = new BearerToken({
            username: 'test',
            password: 'test'
        });

        assert.ok(client);
    });

    it('Named export ServicetradeClientSession should work', function() {
        assert.strictEqual(ServicetradeClientSession.name, 'ServicetradePHPSessionAuth');

        const client = new ServicetradeClientSession({
            username: 'test',
            password: 'test'
        });

        assert.ok(client);
        assert.strictEqual(typeof client.login, 'function');
    });

    it('ServicetradeClientSession as SessionClient should work', function() {
        assert.strictEqual(SessionClient.name, 'ServicetradePHPSessionAuth');

        const client = new SessionClient({
            username: 'test',
            password: 'test'
        });

        assert.ok(client);
    });

    it('ServicetradeClient should be abstract base class', function() {
        assert.strictEqual(ServicetradeClient.name, 'ServicetradeClient');
        // Cannot instantiate abstract class, but can reference it
        assert.ok(ServicetradeClient);
    });

    it('Default export and named BearerToken export should be the same', function() {
        assert.strictEqual(ServicetradeClientBearerToken, BearerToken);
    });

    it('All client types should have expected methods', function() {
        const bearerClient = new ServicetradeClientBearerToken({
            username: 'test',
            password: 'test'
        });

        const sessionClient = new ServicetradeClientSession({
            username: 'test',
            password: 'test'
        });

        // Check Bearer Token client methods
        assert.strictEqual(typeof bearerClient.login, 'function');
        assert.strictEqual(typeof bearerClient.logout, 'function');
        assert.strictEqual(typeof bearerClient.get, 'function');
        assert.strictEqual(typeof bearerClient.post, 'function');
        assert.strictEqual(typeof bearerClient.put, 'function');
        assert.strictEqual(typeof bearerClient.delete, 'function');
        assert.strictEqual(typeof bearerClient.attach, 'function');
        assert.strictEqual(typeof bearerClient.setAuth, 'function');
        assert.strictEqual(typeof bearerClient.clearAuth, 'function');
        assert.strictEqual(typeof bearerClient.setCustomHeaders, 'function');

        // Check Session client methods
        assert.strictEqual(typeof sessionClient.login, 'function');
        assert.strictEqual(typeof sessionClient.logout, 'function');
        assert.strictEqual(typeof sessionClient.get, 'function');
        assert.strictEqual(typeof sessionClient.post, 'function');
        assert.strictEqual(typeof sessionClient.put, 'function');
        assert.strictEqual(typeof sessionClient.delete, 'function');
        assert.strictEqual(typeof sessionClient.attach, 'function');
        assert.strictEqual(typeof sessionClient.setAuth, 'function');
        assert.strictEqual(typeof sessionClient.clearAuth, 'function');
        assert.strictEqual(typeof sessionClient.setCustomHeaders, 'function');
    });
});
