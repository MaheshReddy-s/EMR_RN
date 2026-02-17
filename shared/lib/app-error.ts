export interface AppErrorParams {
    code: string;
    message: string;
    isRetryable?: boolean;
    status?: number;
    cause?: unknown;
}

export class AppError extends Error {
    code: string;
    isRetryable: boolean;
    status?: number;
    override cause?: unknown;

    constructor(params: AppErrorParams) {
        super(params.message);
        this.name = 'AppError';
        this.code = params.code;
        this.isRetryable = Boolean(params.isRetryable);
        this.status = params.status;
        this.cause = params.cause;
    }
}

export const APP_ERROR_CODES = {
    INVALID_SESSION: 'INVALID_SESSION',
    TENANT_CONTEXT_MISSING: 'TENANT_CONTEXT_MISSING',
    NETWORK: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    SERVER: 'SERVER_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    PARTIAL_FAILURE: 'PARTIAL_FAILURE',
    UNKNOWN: 'UNKNOWN_ERROR',
} as const;
