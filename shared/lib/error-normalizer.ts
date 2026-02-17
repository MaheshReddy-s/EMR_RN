import { APP_ERROR_CODES, AppError } from './app-error';

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function mapStatusToCode(status?: number): string {
    if (status === 401) return APP_ERROR_CODES.UNAUTHORIZED;
    if (status === 403) return APP_ERROR_CODES.FORBIDDEN;
    if (status === 404) return APP_ERROR_CODES.NOT_FOUND;
    if (status === 422 || status === 400) return APP_ERROR_CODES.VALIDATION;
    if (status === 429) return APP_ERROR_CODES.RATE_LIMITED;
    if (typeof status === 'number' && status >= 500) return APP_ERROR_CODES.SERVER;
    return APP_ERROR_CODES.UNKNOWN;
}

function isRetryableStatus(status?: number): boolean {
    return typeof status === 'number' && RETRYABLE_STATUSES.has(status);
}

export function normalizeApiError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (typeof error === 'object' && error !== null) {
        const record = error as Record<string, unknown>;
        const statusFromCode = typeof record.code === 'number' ? record.code : undefined;
        const statusFromStatus = typeof record.status === 'number' ? record.status : undefined;
        const status = statusFromStatus ?? statusFromCode;
        const message = typeof record.message === 'string' && record.message.trim().length > 0
            ? record.message
            : 'Unexpected application error';
        const isRetryable = typeof record.isRetryable === 'boolean'
            ? record.isRetryable
            : isRetryableStatus(status);
        const code = typeof record.code === 'string'
            ? record.code
            : mapStatusToCode(status);

        return new AppError({
            code,
            message,
            status,
            isRetryable,
            cause: error,
        });
    }

    if (error instanceof Error) {
        return new AppError({
            code: APP_ERROR_CODES.UNKNOWN,
            message: error.message || 'Unexpected application error',
            isRetryable: false,
            cause: error,
        });
    }

    return new AppError({
        code: APP_ERROR_CODES.UNKNOWN,
        message: 'Unexpected application error',
        isRetryable: false,
        cause: error,
    });
}

