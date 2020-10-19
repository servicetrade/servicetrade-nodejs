const nock = require('nock');
const assert = require('assert');

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

		const ST = require('../index')({
			username: 'good_user',
			password: 'good_pass',
		});
		const loginResponse = await ST.login();
		assert.deepEqual(typeof loginResponse, 'object');
		assert.deepEqual(loginResponse.authenticated, true);
		assert.deepEqual(loginResponse.authToken, 'abcd1234wxyz');
	});

	it('Failed login throws error', async function() {
		let loginResponse;

		nock('https://api.servicetrade.com')
			.post('/api/auth', {
				username: 'bad_user',
				password: 'bad_pass',
			})
			.reply(403);

		const ST = require('../index')({
			username: 'bad_user',
			password: 'bad_pass',
		});
		try {
			await ST.login();
		} catch (e) {
			assert.deepEqual(e.name, 'StatusCodeError');
			assert.deepEqual(e.message, '403 - undefined');
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

		const ST = require('../index')({
			baseUrl: 'https://test.host.com',
			username: 'test_user',
			password: 'test_pass',
		});
		const loginResponse = await ST.login();
		assert.deepEqual(typeof loginResponse, 'object');
		assert.deepEqual(loginResponse.authenticated, true);
		assert.deepEqual(loginResponse.authToken, 'aaaa5555yyyy');
	});

});

describe('Logout tests', function() {
	//@TODO
});

describe('Get tests', function() {
	//@TODO
});

describe('Put tests', function() {
	//@TODO
});

describe('Post tests', function() {
	//@TODO
});

describe('Delete tests', function() {
	//@TODO
});

describe('Attach tests', function() {
	//@TODO
});
