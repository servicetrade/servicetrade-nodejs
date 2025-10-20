import createAuthRefreshInterceptor from 'axios-auth-refresh';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';

const NOOP = () => {};

export interface ServicetradeClientOptions<T> {
    baseUrl?: string;   /** The API base URL (without /api) */
    apiPrefix?: string; /** Api prifix  */
    userAgent?: string; /** Custom User-Agent header */
    onSetAuth?: (auth: T) => void; /** Callback when authentication is set */
    onUnsetAuth?: () => void; /** Callback when authentication is unset */
    autoRefreshAuth?: boolean; /** should authentication automatically refresh. Default to true*/
}

export type ServicetradeClientResponse = Record<string, any>;

export interface FileAttachment {
    value: any;
    options: any;
}

export default abstract class ServicetradeClient<T> {

    protected request: AxiosInstance;
    private baseUrl: string;
    private apiPrefix: string;
    private userAgent: string;
    private onSetAuth: ((auth: T) => void);
    private onUnsetAuth: (() => void);
    private autoRefreshAuth: boolean;

    constructor(options: ServicetradeClientOptions<T>) {

        this.baseUrl         = options.baseUrl         ?? 'https://api.servicetrade.com';
        this.apiPrefix       = options.apiPrefix       ?? '/api';
        this.userAgent       = options.userAgent       ?? 'Servicetrade Node.js SDK';
        this.onSetAuth       = options.onSetAuth       ?? NOOP;
        this.onUnsetAuth     = options.onUnsetAuth     ?? NOOP;
        this.autoRefreshAuth = options.autoRefreshAuth ?? true;

        this.request = axios.create({
            baseURL: this.baseUrl + this.apiPrefix,
            maxBodyLength: Infinity,
            headers: { 'User-Agent': this.userAgent },
        });

        this.request.interceptors.response.use(this.unpackResponse.bind(this));

        if (this.autoRefreshAuth) {
            createAuthRefreshInterceptor(this.request, this.refreshAuth.bind(this));
        }
    }

    abstract clearAuth(): void;
    abstract setAuth(token: T): void;
    abstract doLogin(): Promise<T>;
    abstract doLogout(): Promise<void>;

    setCustomHeaders(key: string, value: string) {
        this.request.defaults.headers[key] = value;
    }

    unpackResponse(response: AxiosResponse<ServicetradeClientResponse>) {
        return response && response.data && response.data.data || null;
    }

    async get(path: string): Promise<ServicetradeClientResponse> {
        return this.request.get(path) as unknown as ServicetradeClientResponse;
    }

    async put(path: string, postData: any): Promise<ServicetradeClientResponse> {
        return this.request.put(path, postData) as unknown as ServicetradeClientResponse;
    }

    async post(path: string, postData: any): Promise<ServicetradeClientResponse> {
        return this.request.post(path, postData) as unknown as ServicetradeClientResponse;
    }

    async delete(path: string): Promise<ServicetradeClientResponse> {
        return this.request.delete(path) as unknown as ServicetradeClientResponse;
    }

    async attach(params: Record<string, any>, file: FileAttachment): Promise<ServicetradeClientResponse> {
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

        return this.request.post('/attachment', formData, formDataConfig) as unknown as ServicetradeClientResponse;
    }

    async login() {
        const token = await this.doLogin();
        this.setAuth(token);
        this.onSetAuth(token);
    }

    async logout() {
        await this.doLogout();
        this.clearAuth();
        this.onUnsetAuth();
    }

    async refreshAuth() {
        this.clearAuth();
        this.onUnsetAuth();
        return this.login();
    }
}
