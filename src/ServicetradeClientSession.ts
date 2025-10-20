import ServicetradeClient, { ServicetradeClientOptions, ServicetradeClientResponse } from './ServicetradeClient';
import { AxiosResponse } from 'axios';

export type PHPSessionAuth = string;

export interface ServicetradePHPSessionAuthOptions extends ServicetradeClientOptions<PHPSessionAuth> {
    username?: string;
    password?: string;
    cookie?: string;
    onSetCookie?: (auth: PHPSessionAuth) => void;
    onResetCookie?: () => void;
    token?: PHPSessionAuth;
}

export default class ServicetradePHPSessionAuth extends ServicetradeClient<PHPSessionAuth> {

    private creds: {
        username?: string;
        password?: string;
    };

    constructor(options: ServicetradePHPSessionAuthOptions) {
        options.onSetAuth = options.onSetCookie ?? options.onSetAuth;
        options.onUnsetAuth = options.onResetCookie ?? options.onUnsetAuth;

        super(options);
        this.creds = { username: options.username, password: options.password };

        if (options.cookie) {
            this.setAuth(options.cookie);
        }
    }

    // Extend the unpackResponse method to capture set-cookies from responses. Update authentication if needed.
    async unpackResponse(response: AxiosResponse<ServicetradeClientResponse>) {
        const newCookie = response && response.headers && response.headers['set-cookie'];
        const curCookie = this.request.defaults.headers.Cookie;
        if (newCookie !== undefined && newCookie !== curCookie) {
            this.request.defaults.headers.Cookie = newCookie;
        }
        return super.unpackResponse(response);
    }

    async doLogin() {
        const response = await this.request.post('/auth', this.creds) as any;
        return response.token;
    }

    async doLogout() {
        await this.request.delete('/auth');
    }

    setAuth(token: PHPSessionAuth) {
        this.request.defaults.headers.Cookie = token;
    }

    clearAuth() {
        this.request.defaults.headers.Cookie = null;
    }
}