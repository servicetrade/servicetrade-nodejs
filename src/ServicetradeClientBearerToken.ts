import ServicetradeClient, { ServicetradeClientOptions} from './ServicetradeClient';

export type BearerToken = string;

export interface ServicetradeClientBearerOptions extends ServicetradeClientOptions<BearerToken> {
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    token?: BearerToken;
}

export default class ServicetradeClientBearerToken extends ServicetradeClient<BearerToken> {
    private creds: {
        grant_type: string;
        username?: string;
        password?: string;
        client_id?: string;
        client_secret?: string
    };

    constructor(options: ServicetradeClientBearerOptions) {
        super(options);
        this.creds = this.getCredentials(options);

        if (options.token) {
            this.setAuth(options.token);
        }
    }

    getCredentials({username, password, clientId, clientSecret}: ServicetradeClientBearerOptions) {
        if (clientId && clientSecret)
            return { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret };

        if (username && password)
            return { grant_type: 'password', username, password };

        throw new Error('Username and password or clientId and clientSecret are required');
    }


    async doLogin() {
        const result = await this.request.post('/oauth2/token', this.creds) as any;
        return result.access_token;
    }

    async doLogout() {
        // NOOP
    }

    setAuth(token: BearerToken) {
        this.request.defaults.headers.Authorization = `Bearer ${token}`;
    }

    clearAuth() {
        this.request.defaults.headers.Authorization = null;
    }
}