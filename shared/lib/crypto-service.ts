/**
 * CryptoService — Centralized PDF/Asset Decryption
 * ─────────────────────────────────────────────────
 * Extracts the triplicated decryption logic from:
 *   - app/(app)/patient/[id].tsx
 *   - components/patient/VisitHistoryModal.tsx
 *   - components/patient/AssetGalleryModal.tsx
 *
 * All three files used identical crypto logic for:
 *   1. Decrypting the master key (AES-CBC via CryptoJS)
 *   2. Decoding base64 encrypted data
 *   3. Decrypting file content (AES-GCM via noble-ciphers or Web Crypto)
 *   4. Detecting MIME type from raw bytes
 *
 * ZERO BEHAVIOR CHANGE: This is a pure extraction — same algorithms,
 * same key derivation, same fallbacks, same error handling.
 */

import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import { AuthRepository } from '@/repositories';
import { api } from '@/lib/api-client';

// @ts-ignore — noble-ciphers doesn't ship TS declarations for this import
import { gcm } from '@noble/ciphers/aes';

// ─── Types ───────────────────────────────────────────────────

export interface DecryptedResult {
    /** Blob for web usage (null on native) */
    blob: Blob | null;
    /** Raw decrypted bytes */
    bytes: Uint8Array;
    /** Detected MIME type */
    mimeType: string;
}

// ─── Internal Helpers ────────────────────────────────────────

/**
 * Sanitize a base64 string: URL-safe → standard, pad to 4-char boundary.
 */
function sanitizeBase64(input: string): string {
    return input
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(input.length / 4) * 4, '=');
}

/**
 * Convert CryptoJS WordArray to Uint8Array.
 */
function wordArrayToBytes(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const { sigBytes, words } = wordArray;
    const result = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return result;
}

/**
 * Decode a base64 string to Uint8Array.
 * Tries native atob first, falls back to CryptoJS.
 */
function base64ToBytes(base64: string): Uint8Array {
    const clean = sanitizeBase64(base64);
    try {
        const binaryString = atob(clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch {
        // Fallback for environments where atob is not available
        return wordArrayToBytes(CryptoJS.enc.Base64.parse(clean));
    }
}

function bytesToUtf8(bytes: Uint8Array): string {
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(bytes);
    }

    // Fallback for environments without TextDecoder
    let output = '';
    const CHUNK_SIZE = 8_192;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        output += String.fromCharCode(...Array.from(chunk));
    }
    return output;
}

/**
 * Convert Uint8Array to base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
    const CHUNK_SIZE = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE) as any);
    }
    return btoa(binary);
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Decrypt the encrypted master key stored in clinicDetails.
 * Uses AES-CBC with the app-level secret key/IV from env vars.
 *
 * @param encryptedKeyBase64 - The encrypted file_encryption_key from login response
 * @returns Raw key bytes for AES-GCM file decryption
 */
export async function getDecryptedMasterKey(encryptedKeyBase64: string): Promise<Uint8Array> {
    const secretKey = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || '';
    const secretIv = process.env.EXPO_PUBLIC_ENCRYPTION_IV || '';

    const keyUtf8 = CryptoJS.enc.Utf8.parse(secretKey);
    const ivUtf8 = CryptoJS.enc.Utf8.parse(secretIv);

    const decrypted = CryptoJS.AES.decrypt(encryptedKeyBase64, keyUtf8, {
        iv: ivUtf8,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    const fileKeyBase64 = decrypted.toString(CryptoJS.enc.Utf8);
    return wordArrayToBytes(CryptoJS.enc.Base64.parse(sanitizeBase64(fileKeyBase64)));
}

/**
 * Detect MIME type from decrypted file bytes using magic number signatures.
 */
export function detectMimeType(bytes: Uint8Array): string {
    // PDF: %PDF (0x25 0x50 0x44 0x46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return 'application/pdf';
    }
    // PNG: 0x89 0x50 0x4E 0x47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return 'image/png';
    }
    // JPEG: 0xFF 0xD8 0xFF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg';
    }
    // Default to PDF
    return 'application/pdf';
}

/**
 * Decrypt raw encrypted bytes using AES-GCM.
 * Uses noble-ciphers on native for reliability, Web Crypto API on web for performance.
 *
 * @param encryptedBytes - IV (12 bytes) + Ciphertext
 * @param masterKeyBytes - The raw AES key
 * @returns Decrypted bytes
 */
export async function decryptAesGcm(
    encryptedBytes: Uint8Array,
    masterKeyBytes: Uint8Array
): Promise<Uint8Array> {
    const iv = encryptedBytes.slice(0, 12);
    const ciphertext = encryptedBytes.slice(12);

    // Prefer noble-ciphers on native, Web Crypto on web
    if (Platform.OS !== 'web' || !window.crypto?.subtle) {
        const aes = gcm(masterKeyBytes, iv);
        return aes.decrypt(ciphertext);
    }

    // Web Crypto path
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        masterKeyBytes.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        ciphertext.buffer as ArrayBuffer
    );

    return new Uint8Array(decryptedBuffer);
}

/**
 * High-level: Fetch an encrypted file from the API and decrypt it.
 * This is the full pipeline used by patient/[id], VisitHistoryModal, and AssetGalleryModal.
 *
 * @param fileUrl - Full URL to fetch the encrypted file from
 * @returns Decrypted result with blob (web), bytes, and mimeType
 */
export async function fetchAndDecryptFile(fileUrl: string): Promise<DecryptedResult> {
    const encryptedKey = await AuthRepository.getFileEncryptionKey();

    if (!encryptedKey) {
        throw new Error('Missing encryption key. Please log in again.');
    }

    // 1. Fetch encrypted data
    const response = await api.getWithMeta<ArrayBuffer>(fileUrl, {
        responseType: 'arrayBuffer',
    });
    const contentType = response.headers.get('Content-Type') ?? '';
    const bytes = new Uint8Array(response.data);

    // Handle raw unencrypted PDF
    if (contentType.includes('application/pdf')) {
        let blob: Blob | null = null;
        if (Platform.OS === 'web') {
            blob = new Blob([bytes], { type: 'application/pdf' });
        }
        return { blob, bytes, mimeType: 'application/pdf' };
    }

    // 2. Extract encrypted base64 from response
    const responseText = bytesToUtf8(bytes);
    let encryptedBase64 = '';
    try {
        const json = JSON.parse(responseText);
        encryptedBase64 = json.encrypted_data || json.data || responseText;
    } catch {
        encryptedBase64 = responseText;
    }

    // 3. Decrypt the master key
    const masterKeyBytes = await getDecryptedMasterKey(encryptedKey);

    // 4. Decode the encrypted base64 data
    const encryptedBytes = base64ToBytes(encryptedBase64);

    // 5. Decrypt with AES-GCM
    let decryptedBytes: Uint8Array;
    try {
        decryptedBytes = await decryptAesGcm(encryptedBytes, masterKeyBytes);
    } catch (error) {
        if (__DEV__) console.error('[CryptoService] GCM Decryption failed:', error);
        throw new Error('Failed to decrypt medical report.');
    }

    // 6. Detect content type
    const mimeType = detectMimeType(decryptedBytes);

    // 7. Create Blob on web (native RN has limited Blob support)
    let blob: Blob | null = null;
    if (Platform.OS === 'web') {
        blob = new Blob([decryptedBytes as any], { type: mimeType });
    }

    return { blob, bytes: decryptedBytes, mimeType };
}

/**
 * High-level convenience: decrypt an asset by URL.
 * Handles blob:// and file:// passthrough, only decrypts http(s) URLs.
 *
 * @param assetUrl - The asset URL (may be http, blob, or file)
 * @param assetType - 'pdf' or 'image' for MIME type hint
 * @returns Data URI (web) or file URI (native), or null on failure
 */
export async function decryptAssetUrl(
    assetUrl: string,
    assetType: 'pdf' | 'image' = 'pdf'
): Promise<string | null> {
    // Passthrough for already-decrypted URLs
    if (assetUrl.startsWith('blob:') || assetUrl.startsWith('file://')) {
        return assetUrl;
    }

    const result = await fetchAndDecryptFile(assetUrl);

    if (Platform.OS === 'web') {
        const mimeType = assetType === 'pdf' ? 'application/pdf' : 'image/jpeg';
        const blob = new Blob([result.bytes as any], { type: mimeType });
        return URL.createObjectURL(blob);
    } else {
        const { Paths, File } = require('expo-file-system');
        const extension = assetType === 'pdf' ? 'pdf' : 'jpg';
        const fileName = `Decrypted_${Date.now()}.${extension}`;
        const file = new File(Paths.cache, fileName);
        file.write(result.bytes);
        return file.uri;
    }
}

/**
 * Encrypt raw bytes using AES-GCM.
 */
export async function encryptAesGcm(
    bytes: Uint8Array,
    masterKeyBytes: Uint8Array
): Promise<Uint8Array> {
    const iv = Platform.OS === 'web' && window.crypto?.getRandomValues
        ? window.crypto.getRandomValues(new Uint8Array(12))
        : require('expo-crypto').getRandomBytes(12);

    if (Platform.OS !== 'web' || !window.crypto?.subtle) {
        const aes = gcm(masterKeyBytes, iv);
        const ciphertext = aes.encrypt(bytes);
        const combined = new Uint8Array(iv.length + ciphertext.length);
        combined.set(iv);
        combined.set(ciphertext, iv.length);
        return combined;
    }

    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        masterKeyBytes.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        bytes.buffer as ArrayBuffer
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv);
    combined.set(ciphertext, iv.length);
    return combined;
}
