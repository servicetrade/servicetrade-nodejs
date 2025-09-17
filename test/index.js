const nock = require('nock');
const assert = require('assert');
const {ServicetradeSDK, ServicetradeLegacySDK} = require('../index');

BASE_URL = 'https://api.servicetrade.com';
ALT_BASE_URL = 'https://test.host.com';

// Create a sinon like nock that will let use know if the nock was called.
function createNock({
    url,
    method,
    endpoint,
    params,
    rc,
    data,
    headers
}) {
    const ret = {
        request: [],
        callCount: 0,
        wasCalled: false
    };

    nock(url)
        [method](endpoint, params)
        .reply(function(uri, body) {
            ret.request.push({...this.req, body});
            ret.wasCalled = true;
            ret.callCount++;
            return [rc, data, headers || []];
        });
    return ret;
}

async function catchError(cb) {
    try {
        await cb();
    } catch (e) {
        return e;
    }
    return null;
}

describe('Legacy PHPSESSID Tests', function() {

    const n = {};
    const endpoint = '/api/auth';
    const goodCreds = { username: 'good_user', password: 'good_pass' };
    const altCreds = { username: 'test_user', password: 'test_pass' };
    const badCreds = { username: 'bad_user', password: 'bad_pass' };

    beforeEach(function() {
        nock.cleanAll();
        // Good user on base url
        n.authGoodUserOnBaseUrl = createNock({
            url: BASE_URL,
            method: 'post',
            endpoint,
            params: goodCreds,
            rc: 200,
            data: {data: { authenticated: true, authToken: 'BASE_URL_AUTH_TOKEN' }},
            headers: ['set-cookie', 'PHPSESSID=BASE_URL_AUTH_TOKEN']
        });
        // Bad user on base url
        n.authBadUserOnBaseUrl = createNock({
            url: BASE_URL,
            method: 'post',
            endpoint,
            params: badCreds,
            rc: 403,
            data: null,
            headers: null
        });
        // Good user on alt url
        n.authGoodUserOnAltUrl = createNock({
            url: ALT_BASE_URL,
            method: 'post',
            endpoint,
            params: altCreds,
            rc: 200,
            data: {data: { authenticated: true, authToken: 'ALT_BASE_URL_AUTH_TOKEN'}},
            headers: ['set-cookie', 'PHPSESSID=ALT_BASE_URL_AUTH_TOKEN']
        });
        // logout on base url
        n.logoutOnBaseUrl = createNock({
            url: BASE_URL,
            method: 'delete',
            endpoint,
            params: undefined,
            rc: 200,
            data: null,
            headers: null
        });

        // logout failure on alt url
        n.logoutFailureOnAltUrl = createNock({
            url: ALT_BASE_URL,
            method: 'delete',
            endpoint,
            params: undefined,
            rc: 403,
            data: null,
            headers: null
        });
    });

    describe('Login tests', function() {
	    it('should return session if login is successful', async function() {
		    const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds });
            const ret =  await ST.login();
		    assert.deepEqual(ret, {authenticated: true, authToken: 'BASE_URL_AUTH_TOKEN'});
	    });

        it('should call the onSetAuth callback if provided', async function() {
            let authCallbackCalled = false;
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds, onSetAuth: (auth) => { authCallbackCalled = true; }});
            await ST.login();
            assert.deepEqual(authCallbackCalled, true);
        });

        it('should respect the legacy name of onSetCookie for onSetAuth callback', async function() {
            let authCallbackCalled = false;
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds, onSetCookie: (auth) => { authCallbackCalled = true; }});
            await ST.login();
            assert.deepEqual(authCallbackCalled, true);
        });

        it('should respect the set-cookie header to set the cookie', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds });
            await ST.login();
            assert.deepEqual(ST.request.defaults.headers.Cookie,  [ 'PHPSESSID=BASE_URL_AUTH_TOKEN' ]);
        });

	    it('should throw error if login fails', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...badCreds });
            const e = await catchError(() => ST.login());
		    assert.deepEqual(e.name, 'Error')
            assert.deepEqual(e.message, 'Request failed with status code 403')
	    });

    	it('should authenticate against alternate base URL if provided', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds });
    		const r = await ST.login();
            assert.deepEqual(r, {authenticated: true, authToken: 'ALT_BASE_URL_AUTH_TOKEN'})
    	});

        it('should set custom headers allows custom headers to be set', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds });
            ST.setCustomHeaders('X-M2M-Auth', 'Bearer 1234567890');
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 200,
                data: {data: { id: 100 }},
                headers: null
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            assert.deepEqual(jobNock.request[0].headers['x-m2m-auth'], 'Bearer 1234567890');
        });

        it('should attempt to use passed in cookie if provided to constructor', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds, cookie: 'PHPSESSID=CACHED_COOKIE' });
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 200,
                data: {data: { id: 100 }},
                headers: null,
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            // If I auth, the cookie will be updated to ALT_BASE_URL_AUTH_TOKEN.
            assert.deepEqual(jobNock.request[0].headers['cookie'], 'PHPSESSID=CACHED_COOKIE');
        });

        it('should use auth refresh handler is called if 401 is returned.', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds });

            const job401Nock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 401,
            });

            const job200Nock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 200,
                data: {data: { id: 100 }},
            });

            const r = await ST.get('/job/100');
            assert.deepEqual(r.id, 100);
            assert.deepEqual(job401Nock.wasCalled, true);
            assert.deepEqual(job401Nock.callCount, 1);
            assert.deepEqual(n.authGoodUserOnAltUrl.wasCalled, true);
            assert.deepEqual(n.authGoodUserOnAltUrl.callCount, 1);
            assert.deepEqual(job200Nock.wasCalled, true);
            assert.deepEqual(job200Nock.request[0].headers['cookie'], ['PHPSESSID=ALT_BASE_URL_AUTH_TOKEN']);
            assert.deepEqual(job200Nock.callCount, 1);
        });

        it('should use default user agent if not provided', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds});
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                rc: 200,
                data: {data: { id: 100 }},
                headers: ['set-cookie', 'PHPSESSID=ALT_BASE_URL_AUTH_TOKEN'],
                endpoint: '/api/job/100',
                params: undefined,
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            assert.deepEqual(jobNock.request[0].headers['user-agent'], 'Servicetrade Node.js SDK');
        });

        it('should use custom user agent if provided', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds, userAgent: 'Test UserAgent' });
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                rc: 200,
                data: {data: { id: 100 }},
                headers: ['set-cookie', 'PHPSESSID=ALT_BASE_URL_AUTH_TOKEN'],
                endpoint: '/api/job/100',
                params: undefined,
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            assert.deepEqual(jobNock.request[0].headers['user-agent'], 'Test UserAgent');
        });

        it('should call the onUnsetAuth callback if provided', async function() {
            let authCallbackCalled = false;
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds, onUnsetAuth: () => { authCallbackCalled = true; }});
            await ST.login();
            await ST.logout();
            assert.deepEqual(authCallbackCalled, true);
        });

        it('should respect the legacy name of onResetCookie for onUnsetAuth callback', async function() {
            let authCallbackCalled = false;
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds, onResetCookie: () => { authCallbackCalled = true; }});
            await ST.login();
            await ST.logout();
            assert.deepEqual(authCallbackCalled, true);
        });
    });

    describe('Logout tests', function() {
        it('should logout successfully, passing auth token to delete', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds });
            await ST.login();
            await ST.logout();
            assert.deepEqual(n.logoutOnBaseUrl.wasCalled, true);
            assert.deepEqual(n.logoutOnBaseUrl.callCount, 1);
            assert.deepEqual(n.logoutOnBaseUrl.request[0].headers['cookie'], ['PHPSESSID=BASE_URL_AUTH_TOKEN']);
        });

        it('should clear authentication on logout', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: BASE_URL, ...goodCreds });
            await ST.login();
            await ST.logout();
            assert.deepEqual(ST.request.defaults.headers.Cookie, null);
        });

        it('should throw error if logout fails', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds });
            await ST.login();
            const e = await catchError(() => ST.logout());
            assert.deepEqual(e.name, 'Error');
            assert.deepEqual(e.message, 'Request failed with status code 403')
            assert.deepEqual(n.logoutFailureOnAltUrl.wasCalled, true);
            assert.deepEqual(n.logoutFailureOnAltUrl.callCount, 1);
        });
    });
});

describe('OAuth2 token tests', function() {

    const n = {};

    const goodCreds = { clientId: 'good_client_id', clientSecret: 'good_client_secret' };
    const goodCredsResponse = {
        access_token: 'BASE_URL_AUTH_TOKEN',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write'
    };

    const altCreds = { clientId: 'alt_client_id', clientSecret: 'alt_client_secret' };
    const altCredsResponse = {
        access_token: 'ALT_BASE_URL_AUTH_TOKEN',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write'
    };

    const badCreds = { clientId: 'bad_client_id', clientSecret: 'bad_client_secret' };
    const endpoint = '/api/oauth2/token';

    function getCredentials(creds) {
        return ServicetradeSDK.prototype.getCredentials(
            creds.username,
            creds.password,
            creds.clientId,
            creds.clientSecret
        );
    }

    beforeEach(function() {
        nock.cleanAll();
        // Good user on base url
        n.authGoodUserOnBaseUrl = createNock({
            url: BASE_URL,
            method: 'post',
            endpoint,
            params: getCredentials(goodCreds),
            rc: 200,
            data: goodCredsResponse,
            headers: ['set-cookie', 'PHPSESSID=BASE_URL_AUTH_TOKEN']
        });
        // Bad user on base url
        n.authBadUserOnBaseUrl = createNock({
            url: BASE_URL,
            method: 'post',
            endpoint,
            params: getCredentials(badCreds),
            rc: 403,
            data: null,
            headers: null
        });
        // Good user on alt url
        n.authGoodUserOnAltUrl = createNock({
            url: ALT_BASE_URL,
            method: 'post',
            endpoint,
            params: getCredentials(altCreds),
            rc: 200,
            data: altCredsResponse,
            headers: ['set-cookie', 'PHPSESSID=ALT_BASE_URL_AUTH_TOKEN']
        });
        // // logout on base url
        n.logoutOnBaseUrl = createNock({
            url: BASE_URL,
            method: 'post',
            endpoint: '/api/oauth2/revoke',
            rc: 200,
        });

        // // logout failure on alt url
        n.logoutFailureOnAltUrl = createNock({
            url: ALT_BASE_URL,
            method: 'post',
            endpoint: '/api/oauth2/revoke',
            rc: 403,
        });
    });

    describe('Login tests', function() {
	    it('should return session if login is successful', async function() {
		    const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
            const ret =  await ST.login();
            assert.deepEqual(ret, goodCredsResponse);
	    });

        it('should NOT respect the set-cookie header to set the cookie', async function() {
            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
            await ST.login();
            assert.deepEqual(ST.request.defaults.headers.Cookie, undefined);
        });

        it('should call the onSetAuth callback if provided', async function() {
            let authCallbackCalled = false;
            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds, onSetAuth: (auth) => { authCallbackCalled = true; }});
            await ST.login();
            assert.deepEqual(authCallbackCalled, true);
        });

	    it('should throw error if login fails', async function() {
            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...badCreds });
            const e = await catchError(() => ST.login());
		    assert.deepEqual(e.name, 'Error')
            assert.deepEqual(e.message, 'Request failed with status code 403')
	    });

    	it('should authenticate against alternate base URL if provided', async function() {
            const ST = new ServicetradeSDK({ baseUrl: ALT_BASE_URL, ...altCreds });
    		const r = await ST.login();
            assert.deepEqual(r, altCredsResponse)
    	});

        it('should set custom headers allows custom headers to be set', async function() {
            const ST = new ServicetradeSDK({ baseUrl: ALT_BASE_URL, ...altCreds });
            ST.setCustomHeaders('X-M2M-Auth', 'Bearer 1234567890');
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 200,
                data: {data: { id: 100 }},
                headers: null
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            assert.deepEqual(jobNock.request[0].headers['x-m2m-auth'], 'Bearer 1234567890');
        });

        it('should attempt to use passed in token if provided to constructor', async function() {
            const ST = new ServicetradeSDK({ baseUrl: ALT_BASE_URL, ...altCreds, token: 'CACHED_TOKEN' });
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 200,
                data: {data: { id: 100 }},
                headers: null,
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            // If I auth, the cookie will be updated to ALT_BASE_URL_AUTH_TOKEN.
            assert.deepEqual(jobNock.request[0].headers['authorization'], 'Bearer CACHED_TOKEN');
        });

        it('should use auth refresh handler is called if 401 is returned.', async function() {
            const ST = new ServicetradeSDK({ baseUrl: ALT_BASE_URL, ...altCreds });

            const job401Nock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 401,
            });

            const job200Nock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                endpoint: '/api/job/100',
                params: undefined,
                rc: 200,
                data: {data: { id: 100 }},
            });

            const r = await ST.get('/job/100');
            assert.deepEqual(r.id, 100);
            assert.deepEqual(job401Nock.wasCalled, true);
            assert.deepEqual(job401Nock.callCount, 1);
            assert.deepEqual(job200Nock.wasCalled, true);
            assert.deepEqual(n.authGoodUserOnAltUrl.wasCalled, true);
            assert.deepEqual(n.authGoodUserOnAltUrl.callCount, 1);
            assert.deepEqual(job200Nock.request[0].headers['authorization'], 'Bearer ALT_BASE_URL_AUTH_TOKEN');
            assert.deepEqual(job200Nock.callCount, 1);
        }).timeout(10000);

        it('should use default user agent if not provided', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds});
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                rc: 200,
                data: {data: { id: 100 }},
                endpoint: '/api/job/100',
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            assert.deepEqual(jobNock.request[0].headers['user-agent'], 'Servicetrade Node.js SDK');
        });

        it('should use custom user agent if provided', async function() {
            const ST = new ServicetradeLegacySDK({ baseUrl: ALT_BASE_URL, ...altCreds, userAgent: 'Test UserAgent' });
            const jobNock = createNock({
                url: ALT_BASE_URL,
                method: 'get',
                rc: 200,
                data: {data: { id: 100 }},
                endpoint: '/api/job/100',
            });
            await ST.get('/job/100');
            assert.deepEqual(jobNock.callCount, 1);
            assert.deepEqual(jobNock.request[0].headers['user-agent'], 'Test UserAgent');
        });
    });

    describe('Logout tests', function() {
        it('should logout successfully, passing auth token to delete', async function() {
            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
            await ST.login();
            await ST.logout();
            assert.deepEqual(n.logoutOnBaseUrl.wasCalled, true);
            assert.deepEqual(n.logoutOnBaseUrl.request[0].headers['authorization'], 'Bearer BASE_URL_AUTH_TOKEN');
        });

        it('should clear authentication on logout', async function() {
            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
            await ST.login();
            await ST.logout();
            assert.deepEqual(ST.request.defaults.headers.Authorization, null);
        });

        it('should call the onUnsetAuth callback if provided', async function() {
            let authCallbackCalled = false;
            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds, onUnsetAuth: () => { authCallbackCalled = true; }});
            await ST.login();
            await ST.logout();
            assert.deepEqual(authCallbackCalled, true);
        });

        it('should throw error if logout fails', async function() {
            const ST = new ServicetradeSDK({ baseUrl: ALT_BASE_URL, ...altCreds });
            await ST.login();
            const e = await catchError(() => ST.logout());
            assert.deepEqual(e.name, 'Error');
            assert.deepEqual(e.message, 'Request failed with status code 403')
            assert.deepEqual(n.logoutFailureOnAltUrl.wasCalled, true);
            assert.deepEqual(n.logoutFailureOnAltUrl.request[0].headers['authorization'], 'Bearer ALT_BASE_URL_AUTH_TOKEN');
        });
    });
});

describe('Common functionality tests', function() {
    const goodCreds = { clientId: 'good_client_id', clientSecret: 'good_client_secret' };
    const methodsThatAcceptParams = ['post', 'put'];

    for (const method of ['get', 'put', 'post', 'delete']) {
        describe(`${method} tests`, function() {
            const testJobId = 100;
            const testJobWithNoDataId = 101;

            it('should get job successfully, should unpack and return only data.data object', async function() {
                createNock({
                    url: BASE_URL,
                    method,
                    endpoint: `/api/job/${testJobId}`,
                    rc: 200,
                    data: {data: {id: testJobId}},
                    params: undefined,
                })

                const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
                const jobResponse = await ST[method](`job/${testJobId}`);
                assert.deepEqual(jobResponse.id, testJobId);
            });

            if (methodsThatAcceptParams.includes(method)) {
                it('should accept params and pass them to the request in the body', async function() {
                    const n = createNock({
                        url: BASE_URL,
                        method,
                        endpoint: `/api/job/${testJobId}`,
                        rc: 200,
                        data: {data: {id: testJobId}},
                        params: {id: testJobId},
                    })

                    const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
                    const jobResponse = await ST[method](`job/${testJobId}`, {id: testJobId});
                    assert.deepEqual(n.request[0].body, {id: testJobId});
                    assert.deepEqual(jobResponse.id, testJobId);
                });
            } else {
                it('should not accept params and ignore extra params', async function() {
                    const n = createNock({
                        url: BASE_URL,
                        method,
                        endpoint: `/api/job/${testJobId}`,
                        rc: 200,
                        data: {data: {id: testJobId}},
                        params: undefined,
                    })

                    const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
                    const jobResponse = await ST[method](`job/${testJobId}`, {id: testJobId});
                    assert.deepEqual(n.request[0].body, '');
                    assert.deepEqual(jobResponse.id, testJobId);
                });
            }

            it('should return null if the response has no data property', async function() {
                createNock({
                    url: BASE_URL,
                    method,
                    endpoint: `/api/job/${testJobWithNoDataId}`,
                    rc: 200,
                    data: {id: testJobWithNoDataId},
                    params: undefined,
                })
                const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
                const jobResponse = await ST[method](`job/${testJobWithNoDataId}`);
                assert.deepEqual(jobResponse, null);
            });

            it('should call endpoint with correct api prefix', async function() {
                const n = createNock({
                    url: BASE_URL,
                    method,
                    endpoint: `/api/v2/job/${testJobId}`,
                    rc: 200,
                    data: {data: {id: 'ALTERNATIVE_API_PREFIX'}},
                    params: undefined,
                })
                const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds, apiPrefix: '/api/v2', token: 'BASE_URL_AUTH_TOKEN' });
                const jobResponse = await ST[method](`job/${testJobId}`);
                assert.deepEqual(jobResponse.id, 'ALTERNATIVE_API_PREFIX');
                assert.deepEqual(n.wasCalled, true);
                assert.deepEqual(n.request[0].headers['authorization'], 'Bearer BASE_URL_AUTH_TOKEN');
            });
        });
    };

    describe('attach tests', function() {
        it('should attach successfully', async function() {
            createNock({
                url: BASE_URL,
                method: 'post',
                endpoint: '/api/attachment',
                rc: 200,
                data: {data: {id: 1, uri: 'testUrl', fileName: 'testFileName'}},
                params: undefined,
            });

            const imgBuffer = Buffer.from('test', 'base64');

            const imgAttachment = {
                value: imgBuffer,
                options: {
                    filename: 'deficiency.jpg',
                    contentType: 'image/jpeg'
                }
            }

            const ST = new ServicetradeSDK({ baseUrl: BASE_URL, ...goodCreds });
            const attachResponse = await ST.attach(
                {
                    purposeId: 1,
                    entityId: 1,
                    entityType: 1,
                    description: 'description'
                },
                imgAttachment
            );
            assert.deepEqual(attachResponse.id, 1);
            assert.deepEqual(attachResponse.uri, 'testUrl');
            assert.deepEqual(attachResponse.fileName, 'testFileName');
        });
    });
});