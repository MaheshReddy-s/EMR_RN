import { API_BASE_URL, ApiError } from '@/constants/endpoints';

/**
 * Production-ready API Client
 * --------------------------
 * A robust fetch wrapper that handles:
 * - Automatic base URL prepending
 * - JSON/binary response handling
 * - Error handling and status code mapping
 * - Authorization headers
 * - Configurable request timeouts via AbortController
 * - Bounded retry for idempotent GET requests
 */

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_GET_ATTEMPTS = 2;
const SLOW_REQUEST_THRESHOLD_MS = 1_500;
const GET_COALESCE_WINDOW_MS = Number(process.env.EXPO_PUBLIC_GET_COALESCE_WINDOW_MS || 150);
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export type ApiResponseType = 'json' | 'arrayBuffer';

interface ApiRequestOptions extends RequestInit {
    timeoutMs?: number;
    responseType?: ApiResponseType;
}

interface ApiClientError extends ApiError {
    status?: number;
    isRetryable?: boolean;
}

export interface ApiResponseMeta<T> {
    data: T;
    headers: Headers;
    status: number;
}

export interface SlowRequestEvent {
    method: string;
    path: string;
    durationMs: number;
    status?: number;
}

export interface ApiObservabilityHooks {
    onSlowRequest?: (event: SlowRequestEvent) => void;
}

function isPlainJson(body: any): boolean {
    if (!body) return false;
    // Assume strings are JSON-compatible (ApiClient.post behavior)
    if (typeof body === 'string') return true;

    return (
        typeof body === 'object' &&
        !(body instanceof FormData) &&
        !(body instanceof Blob) &&
        !(body instanceof ArrayBuffer) &&
        !(body instanceof URLSearchParams)
    );
}

function isAbsoluteUrl(path: string): boolean {
    return /^https?:\/\//i.test(path);
}

class ApiClient {
    private static instance: ApiClient;
    private token: string | null = null;
    private onUnauthorized: (() => void) | null = null;
    private observabilityHooks: ApiObservabilityHooks = {};
    private coalescedGetRequests = new Map<
        string,
        { promise: Promise<unknown>; expiresAt: number; cleanupTimer: ReturnType<typeof setTimeout> }
    >();

    private constructor() { }

    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    /**
     * Set the global auth token for subsequent requests
     */
    public setToken(token: string | null): void {
        this.token = token;
    }

    /**
     * Get the current authorization token
     */
    public getToken(): string | null {
        return this.token;
    }

    /**
     * Register a callback to be invoked when a 401 Unauthorized response is received.
     * Typically used to redirect to the login screen.
     */
    public setOnUnauthorized(callback: (() => void) | null): void {
        this.onUnauthorized = callback;
    }

    /**
     * Optional observability hooks (Sentry/NewRelic/etc) without coupling.
     */
    public setObservabilityHooks(hooks: ApiObservabilityHooks | null): void {
        this.observabilityHooks = hooks || {};
    }

    private isRetryableStatus(status: number): boolean {
        return RETRYABLE_STATUSES.has(status);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private resolveUrl(path: string): string {
        if (isAbsoluteUrl(path)) {
            return path;
        }
        return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    }

    private toApiClientError(error: unknown, timeoutMs: number): ApiClientError {
        const isAbortError = error instanceof Error && error.name === 'AbortError';
        if (isAbortError) {
            return {
                code: 0,
                status: 0,
                message: `Request timed out after ${timeoutMs}ms`,
                isRetryable: true,
            };
        }

        if (typeof error === 'object' && error !== null && 'code' in error) {
            const source = error as Record<string, unknown>;
            const status = typeof source.status === 'number'
                ? source.status
                : (typeof source.code === 'number' ? source.code : 0);
            const message = typeof source.message === 'string'
                ? source.message
                : 'An unexpected error occurred';
            const isRetryable = typeof source.isRetryable === 'boolean'
                ? source.isRetryable
                : this.isRetryableStatus(status);
            return {
                code: typeof source.code === 'number' ? source.code : status,
                status,
                message,
                errors: source.errors as Record<string, string[]> | undefined,
                isRetryable,
            };
        }

        return {
            code: 0,
            status: 0,
            message: error instanceof Error ? error.message : 'Network request failed',
            isRetryable: true,
        };
    }

    private emitSlowRequest(event: SlowRequestEvent): void {
        if (__DEV__) {
            console.warn(
                `[ApiClient] Slow request (${event.durationMs}ms): ${event.method} ${event.path}`
            );
        }
        // Production sink is optional and intentionally decoupled (e.g. Sentry).
        this.observabilityHooks.onSlowRequest?.(event);
    }

    private buildHeaders(inputHeaders: HeadersInit | undefined, body: any, responseType: ApiResponseType): Headers {
        const headers = new Headers(inputHeaders);

        if (!headers.has('Content-Type') && body && isPlainJson(body)) {
            headers.set('Content-Type', 'application/json');
        }

        if (!headers.has('Accept')) {
            headers.set('Accept', responseType === 'arrayBuffer' ? '*/*' : 'application/json');
        }

        if (this.token) {
            headers.set('Authorization', `Bearer ${this.token}`);
        }

        return headers;
    }

    private getCoalescingWindowMs(): number {
        if (Number.isFinite(GET_COALESCE_WINDOW_MS) && GET_COALESCE_WINDOW_MS >= 0) {
            return GET_COALESCE_WINDOW_MS;
        }
        return 150;
    }

    private buildGetCoalescingKey(path: string, responseType: ApiResponseType): string {
        return `${this.token || 'anonymous'}::${responseType}::${path}`;
    }

    private extractErrorMessage(parsed: any, fallbackText: string): string {
        const nested = parsed && typeof parsed.data === 'object' ? parsed.data : null;
        return (
            (parsed?.message as string) ||
            (parsed?.msg as string) ||
            (parsed?.error as string) ||
            (nested?.message as string) ||
            (nested?.msg as string) ||
            (nested?.error as string) ||
            fallbackText ||
            'An unexpected error occurred'
        );
    }

    /**
     * Core request engine with AbortController timeout.
     * Supports JSON and binary responses while preserving retry/401 behavior.
     */
    private async requestWithMeta<T>(
        path: string,
        options: ApiRequestOptions = {}
    ): Promise<ApiResponseMeta<T>> {
        const {
            timeoutMs = DEFAULT_TIMEOUT_MS,
            responseType = 'json',
            ...fetchOptions
        } = options;

        const method = (fetchOptions.method || 'GET').toUpperCase();
        const maxAttempts = method === 'GET' ? MAX_GET_ATTEMPTS : 1;
        const url = this.resolveUrl(path);

        const baseConfig: RequestInit = {
            ...fetchOptions,
            method,
            headers: this.buildHeaders(fetchOptions.headers, fetchOptions.body, responseType),
        };

        const executeWithRetry = async (): Promise<ApiResponseMeta<T>> => {
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                const attemptStartedAt = Date.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                const config: RequestInit = {
                    ...baseConfig,
                    signal: controller.signal,
                };

                if (__DEV__) {
                    console.log(
                        `[ApiClient] Requesting: ${method} ${url} (attempt ${attempt}/${maxAttempts})`
                    );
                }

                try {
                    const response = await fetch(url, config);
                    const durationMs = Date.now() - attemptStartedAt;
                    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
                        this.emitSlowRequest({
                            method,
                            path,
                            durationMs,
                            status: response.status,
                        });
                    }

                    if (!response.ok) {
                        // Handle 401 - session expired or invalid token
                        if (response.status === 401) {
                            this.token = null;
                            this.onUnauthorized?.();
                        }

                        const errorText = await response.text();
                        let parsedError: any = {};
                        try {
                            parsedError = errorText ? JSON.parse(errorText) : {};
                        } catch {
                            parsedError = {};
                        }

                        throw {
                            code: response.status,
                            status: response.status,
                            message: this.extractErrorMessage(parsedError, errorText),
                            errors: parsedError?.errors as Record<string, string[]> | undefined,
                            isRetryable: this.isRetryableStatus(response.status),
                        } as ApiClientError;
                    }

                    if (responseType === 'arrayBuffer') {
                        const buffer = await response.arrayBuffer();
                        return {
                            data: buffer as T,
                            headers: response.headers,
                            status: response.status,
                        };
                    }

                    const responseText = await response.text();
                    let parsed: any;
                    try {
                        parsed = responseText ? JSON.parse(responseText) : {};
                    } catch {
                        throw {
                            code: response.status,
                            status: response.status,
                            message: `Invalid JSON response from server (${response.status})`,
                            isRetryable: false,
                        } as ApiClientError;
                    }

                    // If the response contains pagination metadata (like next_url), return the whole object.
                    const data = (parsed?.data !== undefined && parsed?.next_url !== undefined)
                        ? parsed
                        : (parsed?.data !== undefined ? parsed.data : parsed);

                    return {
                        data: data as T,
                        headers: response.headers,
                        status: response.status,
                    };
                } catch (error: unknown) {
                    const normalizedError = this.toApiClientError(error, timeoutMs);
                    const shouldRetry =
                        method === 'GET' &&
                        attempt < maxAttempts &&
                        normalizedError.isRetryable === true;

                    if (!shouldRetry) {
                        throw normalizedError;
                    }

                    const backoffMs = attempt === 1 ? 200 : 500;
                    if (__DEV__) {
                        console.warn(
                            `[ApiClient] Retrying ${method} ${path} in ${backoffMs}ms due to retryable error: ${normalizedError.message}`
                        );
                    }
                    await this.sleep(backoffMs);
                } finally {
                    clearTimeout(timeoutId);
                }
            }

            throw {
                code: 0,
                status: 0,
                message: 'Request failed after retries',
                isRetryable: false,
            } as ApiClientError;
        };

        if (method !== 'GET') {
            return executeWithRetry();
        }

        const coalescingWindowMs = this.getCoalescingWindowMs();
        if (coalescingWindowMs <= 0) {
            return executeWithRetry();
        }

        const coalescingKey = this.buildGetCoalescingKey(path, responseType);
        const now = Date.now();
        const existingCoalesced = this.coalescedGetRequests.get(coalescingKey);
        if (existingCoalesced && existingCoalesced.expiresAt > now) {
            return existingCoalesced.promise as Promise<ApiResponseMeta<T>>;
        }

        if (existingCoalesced) {
            clearTimeout(existingCoalesced.cleanupTimer);
            this.coalescedGetRequests.delete(coalescingKey);
        }

        const promise = executeWithRetry();
        const cleanupTimer = setTimeout(() => {
            const current = this.coalescedGetRequests.get(coalescingKey);
            if (current?.promise === promise) {
                this.coalescedGetRequests.delete(coalescingKey);
            }
        }, coalescingWindowMs);

        this.coalescedGetRequests.set(coalescingKey, {
            promise,
            expiresAt: now + coalescingWindowMs,
            cleanupTimer,
        });

        return promise;
    }

    private async request<T>(
        path: string,
        options: ApiRequestOptions = {}
    ): Promise<T> {
        const response = await this.requestWithMeta<T>(path, options);
        return response.data;
    }

    /**
     * HTTP GET
     */
    public async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
        return this.request<T>(path, { ...options, method: 'GET' });
    }

    /**
     * HTTP GET with response headers/status
     */
    public async getWithMeta<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponseMeta<T>> {
        return this.requestWithMeta<T>(path, { ...options, method: 'GET' });
    }

    /**
     * HTTP POST
     */
    public async post<T>(path: string, body: Record<string, unknown> | unknown[], options?: ApiRequestOptions): Promise<T> {
        return this.request<T>(path, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /**
     * HTTP POST with raw body (FormData, Blob, ArrayBuffer, etc.)
     */
    public async postRaw<T>(path: string, body: RequestInit['body'], options?: ApiRequestOptions): Promise<T> {
        return this.request<T>(path, {
            ...options,
            method: 'POST',
            body,
        });
    }

    /**
     * HTTP PUT
     */
    public async put<T>(path: string, body: Record<string, unknown> | Partial<unknown>, options?: ApiRequestOptions): Promise<T> {
        return this.request<T>(path, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    /**
     * HTTP DELETE
     */
    public async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
        return this.request<T>(path, { ...options, method: 'DELETE' });
    }
}

export const api = ApiClient.getInstance();
