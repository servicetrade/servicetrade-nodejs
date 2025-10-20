import nock from 'nock';
import assert from 'assert';
import ServicetradeClientSession from '../src/ServicetradeClientSession';

const goodStOptions = {
    baseUrl: 'https://api.servicetrade.com',
    username: 'good_user',
    password: 'good_pass',
};

const badOptions = {
    username: 'bad_user',
    password: 'bad_pass',
};

const testOptions = {
    baseUrl: 'https://test.host.com',
    username: 'test_user',
    password: 'test_pass',
};

const jobItemId = 1234;

describe('ServicetradeClientSession - Login tests', function() {

    it('Successful login returns session', async function() {
        nock('https://api.servicetrade.com')
            .post('/api/auth', {
                username: 'good_user',
                password: 'good_pass',
            })
            .reply(200, {
                data: {
                    authenticated: true,
                    token: 'abcd1234wxyz'
                }
            });

        const ST = new ServicetradeClientSession(goodStOptions);
        await ST.login();
        // Verify the cookie was set
        assert.strictEqual(ST['request'].defaults.headers.Cookie, 'abcd1234wxyz');
    });

    it('Failed login throws error', async function() {
        nock('https://api.servicetrade.com')
            .post('/api/auth', {
                username: 'bad_user',
                password: 'bad_pass',
            })
            .reply(403);

        const ST = new ServicetradeClientSession(badOptions);
        try {
            await ST.login();
            assert.fail('Should have thrown an error');
        } catch (e: any) {
            assert.strictEqual(e.name, 'Error');
            assert.strictEqual(e.message, 'Request failed with status code 403');
        }
    });

    it('Authenticates against alternate base URL if provided', async function() {
        nock('https://test.host.com')
            .post('/api/auth', {
                username: 'test_user',
                password: 'test_pass',
            })
            .reply(200, {
                data: {
                    authenticated: true,
                    token: 'aaaa5555yyyy'
                }
            });

        let authCookie: string | undefined;
        const ST = new ServicetradeClientSession({
            ...testOptions,
            onSetCookie: (value) => {
                authCookie = value;
            }
        });
        await ST.login();
        assert.strictEqual(authCookie, 'aaaa5555yyyy');
        assert.strictEqual(ST['request'].defaults.headers.Cookie, 'aaaa5555yyyy');
    });

    it('Auth again if call returns 401 error', async function() {
        nock('https://test.host.com')
            .get(`/api/job/100`)
            .reply(401)

            .get(`/api/job/100`)
            .reply(200, {
                data: {
                    id: 100
                }
            })

            .post('/api/auth', {
                username: 'test_user',
                password: 'test_pass',
            })
            .reply(200, {
                data: {
                    authenticated: true,
                    token: 'aaaa5555yyyy'
                }
            }, {
                'set-cookie': ['PHPSESSID=aaaa5555yyyy']
            });

        const ST = new ServicetradeClientSession(testOptions);
        const jobResponse = await ST.get('/job/100');
        assert.strictEqual(typeof jobResponse, 'object');
        assert.strictEqual(jobResponse.id, 100);
    });

});

describe('ServicetradeClientSession - Logout tests', function() {
    it('Logout success', async function() {
        nock('https://test.host.com')
            .delete('/api/auth')
            .reply(200);

        const ST = new ServicetradeClientSession(testOptions);
        await ST.logout();
    });

    it('Logout failed', async function() {
        nock('https://test.host.com')
            .delete('/api/auth')
            .reply(403);

        const ST = new ServicetradeClientSession(testOptions);
        try {
            await ST.logout();
            assert.fail('Should have thrown an error');
        } catch (e: any) {
            assert.strictEqual(e.name, 'Error');
            assert.strictEqual(e.message, 'Request failed with status code 403');
        }
    });
});

describe('ServicetradeClientSession - Get tests', function() {
    const testJobId = 100;

    it('get job success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .get(`/api/job/${testJobId}`)
            .reply(200, {
                data: {
                    id: testJobId
                }
            });

        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const jobResponse = await ST.get(`job/${testJobId}`);
        assert.strictEqual(typeof jobResponse, 'object');
        assert.strictEqual(jobResponse.id, testJobId);
    });

    it('return empty response cause no data property', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .get(`/api/job/${testJobId}`)
            .reply(200, {
                id: testJobId
            });

        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const jobResponse = await ST.get(`job/${testJobId}`);
        assert.strictEqual(jobResponse, null);
    });
});

describe('ServicetradeClientSession - Put tests', function() {

    it('put job item success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .put(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { data: { id: 1234 } });

        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const jobItemResponse = await ST.put(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.strictEqual(jobItemResponse.id, 1234);
    });

    it('return empty response cause no data property', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .put(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { id: 1234 });

        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const jobItemResponse = await ST.put(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.strictEqual(jobItemResponse, null);
    });
});

describe('ServicetradeClientSession - Post tests', function() {
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
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .post('/api/jobitem', postData)
            .reply(200, { data: { id: 444 } });

        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const jobItemResponse = await ST.post(`/jobitem`, postData);
        assert.strictEqual(jobItemResponse.id, 444);
    });

    it('return empty response cause no data property', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .post(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { id: 1234 });

        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const jobItemResponse = await ST.post(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.strictEqual(jobItemResponse, null);
    });
});

describe('ServicetradeClientSession - Delete tests', function() {
    const testJobId = 100;
    it('delete job success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .delete(`/api/job/${testJobId}`)
            .reply(200, {});


        const ST = new ServicetradeClientSession(testOptions);
        await ST.login();
        const response = await ST.delete(`/job/${testJobId}`);
        assert.strictEqual(response, null);
    });
});

describe('ServicetradeClientSession - Attach tests', function() {
    it('attach success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200, {
                data: {
                    token: 'test-token'
                }
            })

            .post('/api/attachment')
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

        const ST = new ServicetradeClientSession(testOptions);
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

describe('ServicetradeClientSession - setCookie tests', function() {
    it('test setAuth (setCookie) success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('cookie', 'testCookie')
            .reply(200, {});

        const ST = new ServicetradeClientSession(testOptions);
        ST.setAuth('testCookie');
        await ST.delete(`/job/100`);
    });
});

describe('ServicetradeClientSession - check userAgent header', function() {
    it('test userAgent success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('User-Agent', 'Test UserAgent')
            .reply(200, {});

        const ST = new ServicetradeClientSession({...testOptions, userAgent: 'Test UserAgent'});
        await ST.delete(`/job/100`);
    });
});

describe('ServicetradeClientSession - setCustomHeaders tests', function() {
    it('test setCustomHeaders success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-Custom-Header', 'customValue')
            .reply(200, {});

        const ST = new ServicetradeClientSession(testOptions);
        ST.setCustomHeaders('X-Custom-Header', 'customValue');
        await ST.delete(`/job/100`);
    });

    it('test setCustomHeaders with multiple headers', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-API-Key', 'apiKey123')
            .matchHeader('X-Client-Version', '1.0.0')
            .reply(200, {});

        const ST = new ServicetradeClientSession(testOptions);
        ST.setCustomHeaders('X-API-Key', 'apiKey123');
        ST.setCustomHeaders('X-Client-Version', '1.0.0');
        await ST.delete(`/job/100`);
    });

    it('test setCustomHeaders overwrites existing header', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-Custom-Header', 'newValue')
            .reply(200, {});

        const ST = new ServicetradeClientSession(testOptions);
        ST.setCustomHeaders('X-Custom-Header', 'originalValue');
        ST.setCustomHeaders('X-Custom-Header', 'newValue');
        await ST.delete(`/job/100`);
    });

    it('test setCustomHeaders with empty value', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('X-Empty-Header', '')
            .reply(200, {});

        const ST = new ServicetradeClientSession(testOptions);
        ST.setCustomHeaders('X-Empty-Header', '');
        await ST.delete(`/job/100`);
    });
});
