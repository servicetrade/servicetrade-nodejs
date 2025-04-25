const axios = require('axios');
const createAuthRefreshInterceptor = require('axios-auth-refresh');
const FormData = require('form-data');

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

    let request = axios.create({
        baseURL: options.baseUrl + '/api',
        maxBodyLength: Infinity,
    });

    if (options.cookie) {
        request.defaults.headers.Cookie = options.cookie;
    }

    if (options.userAgent) {
        request.defaults.headers['User-Agent'] = options.userAgent;
    }

    if (!options.disableRefreshAuth) {
        const refreshAuthLogic = async function(failedRequest) {
            request.defaults.headers.Cookie = null;

            if (options.onResetCookie) {
                await options.onResetCookie();
            }

            let auth = {
                username: options.username,
                password: options.password
            };
            try {
               const result = await request.post('/auth', auth);
               if (options.onSetCookie) {
                   await options.onSetCookie(result);
               }
            } catch (e) {
                request.defaults.headers.Cookie = null;
                if (options.onResetCookie) {
                    await options.onResetCookie();
                }
                throw e;
            }
        };
        createAuthRefreshInterceptor.default(request, refreshAuthLogic);
    }

    request.interceptors.response.use(function(response) {
        if (
            !request.defaults.headers.Cookie ||
            !Object.keys(request.defaults.headers.Cookie).length
        ) {
            if (response.headers && response.headers['set-cookie']) {
                request.defaults.headers.Cookie = response.headers['set-cookie'].find((ele) => ele.startsWith("PHPSESSID="));
            }
        }

        // detect if it response which we have after refresh token
        if (!response.config && !response.headers && !response.request) {
            return response;
        }
        return response && response.data && response.data.data ? response.data.data : null;
    });

    return {
        setCookie: (cookie) => {
            request.defaults.headers.Cookie = cookie;
        },

        login: async (username, password) => {
            let auth = {
                username: username || options.username,
                password: password || options.password
            };
            let result;
            try {
               result = await request.post('/auth', auth);
               if (options.onSetCookie) {
                   await options.onSetCookie(result);
               }
            } catch (e) {
                request.defaults.headers.Cookie = null;
                throw e;
            }
            return result;
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
            let data = params || {};
            const formData = new FormData();
            for (let key of Object.keys(data)) {
                formData.append(key, data[key]);
            }
            formData.append('uploadedFile', file.value, file.options);

            const formDataConfig = {
                headers: {
                    'Content-Type': 'multipart/form-data',
            	    ...formData.getHeaders()
                }
            };

            return request.post('/attachment', formData, formDataConfig);
        }
    };
};

module.exports = Servicetrade;
