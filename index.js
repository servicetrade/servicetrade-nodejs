const axios = require('axios');
const createAuthRefreshInterceptor = require('axios-auth-refresh');
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

    const request = axios.create({
        baseURL: options.baseUrl + '/api'
    });

    if (options.cookie) {
        request.defaults.headers.Cookie = options.cookie;
    }

    if (!options.disableRefreshAuth) {
        const refreshAuthLogic = function(failedRequest) {
            request.defaults.headers.Cookie = null;
            let auth = {
                username: options.username,
                password: options.password
            };
            return request.post('/auth', auth).catch((err) => {
                request.defaults.headers.Cookie = null;
                throw err;
            });
        };
        createAuthRefreshInterceptor.default(request, refreshAuthLogic);
    }

    request.interceptors.response.use(function(response) {
        if (
            !request.defaults.headers.Cookie ||
            !Object.keys(request.defaults.headers.Cookie).length
        ) {
            const [cookie] = response.headers['set-cookie'];
            request.defaults.headers.Cookie = cookie;
        }
        return response && response.data && response.data.data ? response.data.data : null;
    });

    return {
        login: (username, password) => {
            let auth = {
                username: username || options.username,
                password: password || options.password
            };
            return request.post('/auth', auth).catch((err) => {
                // clear bogus cookie from failed login attempt
                request.defaults.headers.Cookie = null;
                throw err;
            });
        },

        logout: () => {
            return request.delete('/auth');
        },

        get: (path) => {
            return request.get(path);
        },

        put: (path, postData) => {
            return request.put(path, postData);
        },

        post: (path, postData) => {
            return request.post(path, postData);
        },

        delete: (path) => {
            return request.delete(path);
        },

        attach: (params, file) => {
            let formData = params || {};
            formData.uploadedFile = file;

            let options = {
                uri: '/attachment',
                formData: formData,
                transform: (body) => {
                    const jsonBody = JSON.parse(body);
                    return jsonBody.data;
                }
            };
            return request.post(options);
        },

        setCookie: (cookie) => {
            request.defaults.headers.Cookie = cookie;
        }
    };
};

module.exports = Servicetrade;
