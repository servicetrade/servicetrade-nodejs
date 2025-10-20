// Default export: ServicetradeClientBearerToken (OAuth2 Bearer Token authentication)
export { default } from './ServicetradeClientBearerToken';

// Named exports for all client types
export { default as ServicetradeClientBearerToken } from './ServicetradeClientBearerToken';
export { default as ServicetradeClientSession } from './ServicetradeClientSession';
export { default as ServicetradeClient } from './ServicetradeClient';

// Export types
export type { BearerToken, ServicetradeClientBearerOptions } from './ServicetradeClientBearerToken';
export type { PHPSessionAuth, ServicetradePHPSessionAuthOptions } from './ServicetradeClientSession';
export type {
    ServicetradeClientOptions,
    ServicetradeClientResponse,
    FileAttachment
} from './ServicetradeClient';
