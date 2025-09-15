const axios = require('axios');
const createAuthRefreshInterceptor = require('axios-auth-refresh').default;
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

// Abstract class for a generic ST API client. Common for both PHPSESSID and OAuth2.
// See below for Oauth2 vs PHPSESSID implementations.
class ServicetradeApi {
    constructor({
        // URL of the API
        baseUrl,
        // callback when auth is initially set
        onSetAuth,
        // callback when auth is unset
        onUnsetAuth,
        // User-Agent value
        userAgent,
        // Do not set auth interceptor
        disableRefreshAuth,
    }) {
        this.baseUrl = baseUrl || 'https://api.servicetrade.com';
        this.authentication = null;
        this._onSetAuth = onSetAuth;
        this._onUnsetAuth = onUnsetAuth;
        this.request = axios.create({
            baseURL: this.baseUrl + '/api',
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': userAgent || 'Servicetrade Node.js SDK'
            },
        });

        this.request.interceptors.response.use(this.unpackResponse.bind(this));

        if (!disableRefreshAuth) {
            createAuthRefreshInterceptor(this.request, this.refreshAuth.bind(this));
        }
    }

    async unpackResponse(response) {
        return response?.data?.data || null;
    }

    async onSetAuth(auth) {
        return this._onSetAuth && this._onSetAuth(auth);
    }

    async onUnsetAuth(auth) {
        return this._onUnsetAuth && this._onUnsetAuth(auth);
    }

    async refreshAuth() {
        throw new Error('Not implemented');
    }

    async login() {
        throw new Error('Not implemented');
    }

    async logout() {
        throw new Error('Not implemented');
    }

    async get(path) {
        return this.request.get(path);
    }

    async put(path, postData) {
        return this.request.put(path, postData);
    }

    async post(path, postData) {
        return this.request.post(path, postData);
    }

    async delete(path) {
        return this.request.delete(path);
    }

    async attach(params, file) {
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

        return this.request.post('/attachment', formData, formDataConfig);
    }
}

class ServicetradePHPSessionAuth extends ServicetradeApi {
    constructor({
        username,
        password,
        cookie,
        onSetCookie,
        onResetCookie,
        ...options
    }) {
        super(options);
        this.creds = { username, password };
        this._onSetAuth = onSetCookie;
        this._onUnsetAuth = onResetCookie;

        if (cookie) {
            this.request.defaults.headers.Cookie = cookie;
        }
    }

    async unpackResponse(response) {
        // Capture set-cookies from responses. Update authentication if needed.
        const newCookie = response?.headers?.['set-cookie'];
        const curCookie = this.request.defaults.headers.Cookie;
        if (newCookie !== undefined && newCookie !== curCookie) {
            this.request.defaults.headers.Cookie = newCookie;
        }

        return super.unpackResponse(response);
    }

    async setCookie(cookie) {
        this.request.defaults.headers.Cookie = cookie;
    }

    async setBearerToken(token) {
        this.request.defaults.headers.Authorization = `Bearer ${token}`;
    }

    async refreshAuth() {
        this.request.defaults.headers.Cookie = null;
        this.onUnsetAuth();
        return this.login();
    }

    async login() {
        const response = await this.request.post('/auth', this.creds);
        await this.onSetAuth(response);
        return response;
    }

    async logout() {
        const result = await this.request.delete('/auth');
        this.onUnsetAuth();
        return result;
    }
}

class ServicetradeOAuth2Auth extends ServicetradeApi {
    constructor({
        username,
        password,
        clientId,
        clientSecret,
        ...options
    }) {
        super(options);
        this.creds = this.getCredentials(username, password, clientId, clientSecret);
    }

    getCredentials(username, password, clientId, clientSecret) {
        if (clientId && clientSecret) {
            return {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            };
        } else if (username && password) {
            return {
                grant_type: 'password',
                username: username,
                password: password,
            };
        } else {
            throw new Error('Username and password or clientId and clientSecret are required');
        }
    }

    async login() {
        const result = await this.request.post('/oauth2/token', this.creds);
        const token = result.access_token;
        this.request.defaults.headers.Authorization = `Bearer ${token}`;
        await this.onSetAuth(token);
        return result;
    }

    async logout() {
        this.request.defaults.headers.Authorization = null;
        await this.onUnsetAuth();
    }
}

function Servicetrade(options) {
    if (options.oauth2 || options.clientId || options.clientSecret) {
        return new ServicetradeOAuth2Auth(options);
    }

    if (options.username && options.password) {
        return new ServicetradePHPSessionAuth(options);
    }
    throw new Error('Username and password are required');
}

module.exports = Servicetrade;
module.exports.ServicetradeApi = ServicetradeApi;