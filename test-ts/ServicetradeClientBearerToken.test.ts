import nock from 'nock';
import assert from 'assert';
import ServicetradeClientBearerToken from '../src/ServicetradeClientBearerToken';

const passwordOptions = {
    baseUrl: 'https://test.host.com',
    username: 'test_user',
    password: 'test_pass',
};

const clientCredentialsOptions = {
    baseUrl: 'https://test.host.com',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
};

const badOptions = {
    baseUrl: 'https://test.host.com',
};

const jobItemId = 1234;

describe('ServicetradeClientBearerToken - Constructor tests', function() {

    it('Creates client with username/password credentials', function() {
        const ST = new ServicetradeClientBearerToken(passwordOptions);
        assert.ok(ST);
        assert.strictEqual(ST['creds'].grant_type, 'password');
        assert.strictEqual(ST['creds'].username, 'test_user');
        assert.strictEqual(ST['creds'].password, 'test_pass');
    });

    it('Creates client with client credentials', function() {
        const ST = new ServicetradeClientBearerToken(clientCredentialsOptions);
        assert.ok(ST);
        assert.strictEqual(ST['creds'].grant_type, 'client_credentials');
        assert.strictEqual(ST['creds'].client_id, 'test_client_id');
        assert.strictEqual(ST['creds'].client_secret, 'test_client_secret');
    });

    it('Throws error when no credentials provided', function() {
        try {
            new ServicetradeClientBearerToken(badOptions as any);
            assert.fail('Should have thrown an error');
        } catch (e: any) {
            assert.strictEqual(e.message, 'Username and password or clientId and clientSecret are required');
        }
    });

    it('Sets token if provided in options', function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('Authorization', 'Bearer preset-token')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken({
            ...passwordOptions,
            token: 'preset-token'
        });
        assert.strictEqual(ST['request'].defaults.headers.Authorization, 'Bearer preset-token');
    });
});

describe('ServicetradeClientBearerToken - Login tests', function() {

    it('Successful login with password grant returns token', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token', {
                grant_type: 'password',
                username: 'test_user',
                password: 'test_pass',
            })
            .reply(200, {
                data: {
                    access_token: 'abcd1234wxyz',
                    token_type: 'Bearer'
                }
            });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        assert.strictEqual(ST['request'].defaults.headers.Authorization, 'Bearer abcd1234wxyz');
    });

    it('Successful login with client credentials returns token', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token', {
                grant_type: 'client_credentials',
                client_id: 'test_client_id',
                client_secret: 'test_client_secret',
            })
            .reply(200, {
                data: {
                    access_token: 'xyz9876abcd',
                    token_type: 'Bearer'
                }
            });

        const ST = new ServicetradeClientBearerToken(clientCredentialsOptions);
        await ST.login();
        assert.strictEqual(ST['request'].defaults.headers.Authorization, 'Bearer xyz9876abcd');
    });

    it('Failed login throws error', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(401, {
                error: 'invalid_grant',
                error_description: 'Invalid credentials'
            });

        const ST = new ServicetradeClientBearerToken({
            ...passwordOptions,
            autoRefreshAuth: false
        });
        try {
            await ST.login();
            assert.fail('Should have thrown an error');
        } catch (e: any) {
            assert.strictEqual(e.name, 'Error');
            assert.ok(e.message.includes('401'));
        }
    });

    it('Calls onSetAuth callback on successful login', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'callback-token'
                }
            });

        let capturedToken: string | undefined;
        const ST = new ServicetradeClientBearerToken({
            ...passwordOptions,
            onSetAuth: (token) => {
                capturedToken = token;
            }
        });
        await ST.login();
        assert.strictEqual(capturedToken, 'callback-token');
    });

    it('Auth again if call returns 401 error', async function() {
        nock('https://test.host.com')
            .get(`/api/job/100`)
            .reply(401)

            .post('/api/oauth2/token', {
                grant_type: 'password',
                username: 'test_user',
                password: 'test_pass',
            })
            .reply(200, {
                data: {
                    access_token: 'refreshed-token'
                }
            })

            .get(`/api/job/100`)
            .reply(200, {
                data: {
                    id: 100
                }
            });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        const jobResponse = await ST.get('/job/100');
        assert.strictEqual(typeof jobResponse, 'object');
        assert.strictEqual(jobResponse.id, 100);
    });
});

describe('ServicetradeClientBearerToken - Logout tests', function() {
    it('Logout clears auth token', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        assert.strictEqual(ST['request'].defaults.headers.Authorization, 'Bearer test-token');

        await ST.logout();
        assert.strictEqual(ST['request'].defaults.headers.Authorization, null);
    });

    it('Logout calls onUnsetAuth callback', async function() {
        let unsetCalled = false;
        const ST = new ServicetradeClientBearerToken({
            ...passwordOptions,
            onUnsetAuth: () => {
                unsetCalled = true;
            }
        });

        await ST.logout();
        assert.strictEqual(unsetCalled, true);
    });
});

describe('ServicetradeClientBearerToken - Get tests', function() {
    const testJobId = 100;

    it('get job success', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .get(`/api/job/${testJobId}`)
            .matchHeader('Authorization', 'Bearer test-token')
            .reply(200, {
                data: {
                    id: testJobId
                }
            });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const jobResponse = await ST.get(`job/${testJobId}`);
        assert.strictEqual(typeof jobResponse, 'object');
        assert.strictEqual(jobResponse.id, testJobId);
    });

    it('return empty response cause no data property', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .get(`/api/job/${testJobId}`)
            .reply(200, {
                id: testJobId
            });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const jobResponse = await ST.get(`job/${testJobId}`);
        assert.strictEqual(jobResponse, null);
    });
});

describe('ServicetradeClientBearerToken - Put tests', function() {

    it('put job item success', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .put(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .matchHeader('Authorization', 'Bearer test-token')
            .reply(200, { data: { id: 1234 } });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const jobItemResponse = await ST.put(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.strictEqual(jobItemResponse.id, 1234);
    });

    it('return empty response cause no data property', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .put(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { id: 1234 });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const jobItemResponse = await ST.put(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.strictEqual(jobItemResponse, null);
    });
});

describe('ServicetradeClientBearerToken - Post tests', function() {
    const postData = {
        quantity: 5,
        cost: 6,
        serviceLineId: 33,
        name: 'fancy foo',
        jobId: 33445566,
        source: { type: 'refnumber', value: 'PO CC-654' }
    };

    it('post job item success', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .post('/api/jobitem', postData)
            .matchHeader('Authorization', 'Bearer test-token')
            .reply(200, { data: { id: 444 } });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const jobItemResponse = await ST.post(`/jobitem`, postData);
        assert.strictEqual(jobItemResponse.id, 444);
    });

    it('return empty response cause no data property', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .post(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { id: 1234 });

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const jobItemResponse = await ST.post(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.strictEqual(jobItemResponse, null);
    });
});

describe('ServicetradeClientBearerToken - Delete tests', function() {
    const testJobId = 100;
    it('delete job success', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .delete(`/api/job/${testJobId}`)
            .matchHeader('Authorization', 'Bearer test-token')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const response = await ST.delete(`/job/${testJobId}`);
        assert.strictEqual(response, null);
    });
});

describe('ServicetradeClientBearerToken - Attach tests', function() {
    it('attach success', async function() {
        nock('https://test.host.com')
            .post('/api/oauth2/token')
            .reply(200, {
                data: {
                    access_token: 'test-token'
                }
            })

            .post('/api/attachment')
            .matchHeader('Authorization', 'Bearer test-token')
            .reply(200, {
                data: {
                    id: 1,
                    uri: 'testUrl',
                    fileName: 'testFileName'
                }
            });

        const imgBuffer = Buffer.from('test', 'base64');

        const imgAttachment = {
            value: imgBuffer,
            options: {
                filename: 'deficiency.jpg',
                contentType: 'image/jpeg'
            }
        };

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        await ST.login();
        const attachResponse = await ST.attach(
            {
                purposeId: 1,
                entityId: 1,
                entityType: 1,
                description: 'description'
            },
            imgAttachment
        );
        assert.strictEqual(attachResponse.id, 1);
        assert.strictEqual(attachResponse.uri, 'testUrl');
        assert.strictEqual(attachResponse.fileName, 'testFileName');
    })
});

describe('ServicetradeClientBearerToken - setAuth tests', function() {
    it('test setAuth (setBearerToken) success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('Authorization', 'Bearer manual-token')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        ST.setAuth('manual-token');
        await ST.delete(`/job/100`);
    });
});

describe('ServicetradeClientBearerToken - check userAgent header', function() {
    it('test userAgent success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('User-Agent', 'Test UserAgent')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken({...passwordOptions, userAgent: 'Test UserAgent'});
        await ST.delete(`/job/100`);
    });
});

describe('ServicetradeClientBearerToken - setCustomHeaders tests', function() {
    it('test setCustomHeaders success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-Custom-Header', 'customValue')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        ST.setCustomHeaders('X-Custom-Header', 'customValue');
        await ST.delete(`/job/100`);
    });

    it('test setCustomHeaders with multiple headers', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-API-Key', 'apiKey123')
            .matchHeader('X-Client-Version', '1.0.0')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        ST.setCustomHeaders('X-API-Key', 'apiKey123');
        ST.setCustomHeaders('X-Client-Version', '1.0.0');
        await ST.delete(`/job/100`);
    });

    it('test setCustomHeaders overwrites existing header', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-Custom-Header', 'newValue')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        ST.setCustomHeaders('X-Custom-Header', 'originalValue');
        ST.setCustomHeaders('X-Custom-Header', 'newValue');
        await ST.delete(`/job/100`);
    });

    it('test setCustomHeaders with empty value', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-Empty-Header', '')
            .reply(200, {});

        const ST = new ServicetradeClientBearerToken(passwordOptions);
        ST.setCustomHeaders('X-Empty-Header', '');
        await ST.delete(`/job/100`);
    });
});
