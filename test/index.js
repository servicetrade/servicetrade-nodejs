const nock = require('nock');
const assert = require('assert');
const Servicetrade = require('../index');

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

describe('Login tests', function() {

	it('Successful login returns session', async function() {
		nock('https://api.servicetrade.com')
			.post('/api/auth', {
				username: 'good_user',
				password: 'good_pass',
			})
			.reply(200, {
				data: {
					authenticated: true,
					authToken: 'abcd1234wxyz'
				}
			});

		const ST = Servicetrade(goodStOptions);
		const loginResponse = await ST.login();
		assert.deepEqual(typeof loginResponse, 'object');
		assert.deepEqual(loginResponse.authenticated, true);
		assert.deepEqual(loginResponse.authToken, 'abcd1234wxyz');
	});

	it('Failed login throws error', async function() {
		nock('https://api.servicetrade.com')
			.post('/api/auth', {
				username: 'bad_user',
				password: 'bad_pass',
			})
			.reply(403);

        const ST = Servicetrade(badOptions);
		try {
			await ST.login();
		} catch (e) {
			assert.deepEqual(e.name, 'Error');
			assert.deepEqual(e.message, 'Request failed with status code 403');
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
					authToken: 'aaaa5555yyyy'
				}
			});

		let auth;
        const ST = Servicetrade({
            ...testOptions,
            onSetCookie: (value) => {
                auth = value;
            }
        });
		const loginResponse = await ST.login();
		assert.deepEqual(typeof loginResponse, 'object');
		assert.deepEqual(loginResponse.authenticated, true);
		assert.deepEqual(loginResponse.authToken, 'aaaa5555yyyy');
        assert.deepEqual(auth.authenticated, true);
        assert.deepEqual(auth.authToken, 'aaaa5555yyyy');
	});

    it('Auth again if call return 401 error', async function() {
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
                    authToken: 'aaaa5555yyyy'
                }
            }, {
            	'set-cookie': ['PHPSESSID=aaaa5555yyyy']
			});

        const ST = Servicetrade(testOptions);
        const jobResponse = await ST.get('/job/100');
        assert.deepEqual(typeof jobResponse, 'object');
        assert.deepEqual(jobResponse.id, 100);
    });

});

describe('Logout tests', function() {
    it('Logout success', async function() {
        nock('https://test.host.com')
            .delete('/api/auth')
            .reply(200);

        const ST = Servicetrade(testOptions);
        await ST.logout();
    });

    it('Logout failed', async function() {
        nock('https://test.host.com')
            .delete('/api/auth')
            .reply(403);

        const ST = Servicetrade(testOptions);
      try {
          await ST.logout();
	  } catch (e) {
          assert.deepEqual(e.name, 'Error');
          assert.deepEqual(e.message, 'Request failed with status code 403');
      }
    });
});

describe('Get tests', function() {
    const testJobId = 100;

    it('get job success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

			.get(`/api/job/${testJobId}`)
			.reply(200, {
				data: {
					id: testJobId
				}
			});

        const ST = Servicetrade(testOptions);
        await ST.login();
        const jobResponse = await ST.get(`job/${testJobId}`);
        assert.deepEqual(typeof jobResponse, 'object');
        assert.deepEqual(jobResponse.id, testJobId);
    });

    it('return empty response cause not data property', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

            .get(`/api/job/${testJobId}`)
            .reply(200, {
                id: testJobId
            });

        const ST = Servicetrade(testOptions);
        await ST.login();
        const jobResponse = await ST.get(`job/${testJobId}`);
        assert.deepEqual(jobResponse, null);
    });
});

describe('Put tests', function() {

    it('put job item success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

            .put(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { data: { id: 1234 } });

        const ST = Servicetrade(testOptions);
        await ST.login();
        const jobItemResponse = await ST.put(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.deepEqual(jobItemResponse.id, 1234);
    });

    it('return empty response cause not data property', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

            .put(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { id: 1234 });

        const ST = Servicetrade(testOptions);
        await ST.login();
        const jobItemResponse = await ST.put(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.deepEqual(jobItemResponse, null);
    });
});

describe('Post tests', function() {
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
            .reply(200)

            .post('/api/jobitem', postData)
            .reply(200, { data: { id: 444 } });

        const ST = Servicetrade(testOptions);
        const jobItemResponse = await ST.post(`/jobitem`, postData);
        assert.deepEqual(jobItemResponse.id, 444);
    });

    it('return empty response cause not data property', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

            .post(`/api/jobitem/${jobItemId}`, { libitemId: 9876 })
            .reply(200, { id: 1234 });

        const ST = Servicetrade(testOptions);
        const jobItemResponse = await ST.post(`/jobitem/${jobItemId}`, { libitemId: 9876 });
        assert.deepEqual(jobItemResponse, null);
    });
});

describe('Delete tests', function() {
    const testJobId = 100;
    it('delete job success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

            .delete(`/api/job/${testJobId}`)
            .reply(200, {});


        const ST = Servicetrade(testOptions);
        await ST.login();
        const response = await ST.delete(`/job/${testJobId}`);
        assert.deepEqual(response, null);
    });
});

describe('Attach tests', function() {
    it('attach success', async function() {
        nock('https://test.host.com')
            .post('/api/auth')
            .reply(200)

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

        const ST = Servicetrade(testOptions);
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
        assert.deepEqual(attachResponse.id, 1);
        assert.deepEqual(attachResponse.uri, 'testUrl');
        assert.deepEqual(attachResponse.fileName, 'testFileName');
	})
});

describe('setCookie tests', function() {
    it('test setCookie success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
			.matchHeader('cookie', 'testCookie')
            .reply(200, {});

        const ST = Servicetrade(testOptions);
        ST.setCookie('testCookie');
        await ST.delete(`/job/100`);
    });
});

describe('check userAgent header', function() {
    it('test userAgent success', async function() {
        nock('https://test.host.com')
            .delete(`/api/job/100`)
            .matchHeader('User-Agent', 'Test UserAgent')
            .reply(200, {});

        const ST = Servicetrade({...testOptions, userAgent: 'Test UserAgent'});
        await ST.delete(`/job/100`);
    });
});
