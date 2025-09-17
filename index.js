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
        // Optional callback when auth is initially set. Passes the auth return.
        onSetAuth,
        // Optional callback, called when auth is unset. No args passed.
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

    setCustomHeaders(key, value) {
        this.request.defaults.headers[key] = value;
    }

    async unpackResponse(response) {
        if (response.config.url === '/oauth2/token') {
            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
                token_type: response.data.token_type,
                scope: response.data.scope,
            };
        } else {
            return response?.data?.data || null;
        }
    }

    async onSetAuth(auth) {
        this._onSetAuth && this._onSetAuth(auth);
    }

    async onUnsetAuth() {
        this._onUnsetAuth && this._onUnsetAuth();
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
        this._onSetAuth = onSetCookie || this._onSetAuth;
        this._onUnsetAuth = onResetCookie || this._onUnsetAuth;

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

    async refreshAuth() {
        this.request.defaults.headers.Cookie = null;
        this.onUnsetAuth();
        return await this.login();
    }

    async login() {
        const response = await this.request.post('/auth', this.creds);
        this.onSetAuth(response);
        return response;
    }

    async logout() {
        const result = await this.request.delete('/auth');
        this.request.defaults.headers.Cookie = null;
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
        token,
        ...options
    }) {
        super(options);
        this.creds = this.getCredentials(username, password, clientId, clientSecret);

        if (token) {
            this.request.defaults.headers.authorization = `Bearer ${token}`;
        }
    }

    getCredentials(username, password, client_id, client_secret) {
        if (client_id && client_secret) {
            const grant_type = 'client_credentials';
            return { grant_type, client_id, client_secret };
        }

        if (username && password) {
            const grant_type = 'password';
            return { grant_type, username, password };
        }

        throw new Error('Username and password or clientId and clientSecret are required');
    }

    async login() {
        const result = await this.request.post('/oauth2/token', this.creds);
        const token = result.access_token;
        this.request.defaults.headers.Authorization = `Bearer ${token}`;
        this.onSetAuth(token);
        return result;
    }

    async logout() {
        const result = await this.request.post('/oauth2/revoke');
        this.request.defaults.headers.Authorization = null;
        this.onUnsetAuth();
    }

    async refreshAuth() {
        this.request.defaults.headers.Authorization = null;
        this.onUnsetAuth();
        return this.login();
    }
}

function Servicetrade(options) {
    return new ServicetradeOAuth2Auth(options);
}

module.exports = Servicetrade;
module.exports.ServicetradeSDK = ServicetradeOAuth2Auth;
module.exports.ServicetradeLegacySDK = ServicetradePHPSessionAuth;
