/**
 * Shared library barrel export
 * ─────────────────────────────
 * Centralized re-export of all shared utilities.
 */

export {
    getDecryptedMasterKey,
    detectMimeType,
    decryptAesGcm,
    fetchAndDecryptFile,
    decryptAssetUrl,
} from './lib/crypto-service';

export type { DecryptedResult } from './lib/crypto-service';

export {
    safeFormatTimestamp,
    stableVisitId,
    mapPdfHistory,
    mapConsultationHistory,
} from './lib/format-utils';

export { AppError, APP_ERROR_CODES } from './lib/app-error';
export { normalizeApiError } from './lib/error-normalizer';
export { createCacheMissRateLogger } from './lib/cache-observability';
export { reportCapturedError, setErrorReporter } from './lib/error-reporter';
export { getTenantContext, requireTenantContext } from './lib/tenant-context';
