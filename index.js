'use strict';

const rp = require('request-promise');

/**
 * Servicetrade
 *
 * @param {Object} options:
 *  - {String} options.baseUrl - The API base URL (without /api)
 *  - {String} options.username - The API username
 *  - {String} options.password - The API password
 *
 *  If options.username and options.password are not provided, username and password must be
 *  explicitly provided to login()
 *
 * @return {Object} methods:
 * 	- login(username, password)
 * 	- logout()
 * 	- get(path)
 * 	- put(path, postdata)
 * 	- post(path, postdata)
 * 	- delete(path)
 * 	- attach(params, file)
 *
 */
const Servicetrade = (options) => {

	options = options || {};
	options.baseUrl = options.baseUrl || 'https://api.servicetrade.com';

	const request = rp.defaults({
		jar: true,
		baseUrl: options.baseUrl + '/api'
	});

	const jsonRequest = request.defaults({
		json: true,
		transform: function(body) {
			return body && body.data ? body.data : null;
		}
	});

	return {
		login: (username, password) => {
			let auth = {
				username: username || options.username,
				password: password || options.password
			};
			return jsonRequest.post('/auth', {body: auth});
		},

		logout: () => {
			return jsonRequest.del('/auth');
		},

		get: (path) => {
			return jsonRequest.get(path);
		},

		put: (path, postData) => {
			return jsonRequest.put(path, {body: postData});
		},

		post: (path, postData) => {
			return jsonRequest.post(path, {body: postData});
		},

		delete: (path) => {
			return jsonRequest.del(path);
		},

		attach: (params, file) => {
			let formData = params || {};
			formData.uploadedFile = file;

			let options = {
				uri: '/attachment',
				formData: formData,
				transform: (body) => {
					var jsonBody = JSON.parse(body);
					return jsonBody.data;
				}
			};
			return request.post(options);
		},
	};
};

module.exports = exports = Servicetrade;
