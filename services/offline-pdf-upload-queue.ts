import { ConsultationService } from '@/services/consultation-service';
import { normalizeApiError } from '@/shared/lib/error-normalizer';
import { File as FSFile, Paths } from 'expo-file-system';
import { AppState, Platform } from 'react-native';

const QUEUE_STORAGE_KEY = 'emr_offline_pdf_upload_queue';
const QUEUE_FILENAME = 'offline_pdf_upload_queue.json';
const RETRY_INTERVAL_MS = 20_000;
const MAX_UPLOAD_ATTEMPTS = 20;

interface PendingPdfUpload {
    id: string;
    consultationId: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    pdfUri: string;
    fileName?: string;
    createdAt: number;
    attempts: number;
    lastError?: string;
}

interface EnqueuePdfUploadInput {
    consultationId: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    pdfUri: string;
    fileName?: string;
}

function getQueueFile(): FSFile {
    return new FSFile(Paths.document, QUEUE_FILENAME);
}

function generateQueueId(): string {
    return `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class OfflinePdfUploadQueueService {
    private queue: PendingPdfUpload[] = [];
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private isProcessing = false;
    private retryTimer: ReturnType<typeof setInterval> | null = null;
    private appStateSubscription: { remove: () => void } | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            this.queue = await this.readPersistedQueue();
            this.initialized = true;
            this.startRetryWorkers();

            if (this.queue.length > 0) {
                void this.flush();
            }
        })();

        try {
            await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    async enqueue(input: EnqueuePdfUploadInput): Promise<void> {
        await this.initialize();

        this.queue.push({
            ...input,
            id: generateQueueId(),
            createdAt: Date.now(),
            attempts: 0,
        });

        await this.persistQueue();
        void this.flush();
    }

    async flush(): Promise<void> {
        await this.initialize();
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        try {
            const batchSize = this.queue.length;
            for (let i = 0; i < batchSize; i += 1) {
                const item = this.queue.shift();
                if (!item) break;

                try {
                    await ConsultationService.uploadConsultationPdf({
                        consultationId: item.consultationId,
                        patientId: item.patientId,
                        doctorId: item.doctorId,
                        appointmentId: item.appointmentId,
                        pdfUri: item.pdfUri,
                        fileName: item.fileName,
                    });
                } catch (error) {
                    const normalized = normalizeApiError(error);
                    const attempts = item.attempts + 1;
                    const shouldDrop = attempts >= MAX_UPLOAD_ATTEMPTS;

                    if (!shouldDrop) {
                        this.queue.push({
                            ...item,
                            attempts,
                            lastError: normalized.message,
                        });
                    } else if (__DEV__) {
                        console.warn(
                            `[OfflinePdfUploadQueue] Dropped upload ${item.id} after ${attempts} attempt(s): ${normalized.message}`
                        );
                    }
                }
            }

            await this.persistQueue();
        } finally {
            this.isProcessing = false;
        }
    }

    async getPendingCount(): Promise<number> {
        await this.initialize();
        return this.queue.length;
    }

    private startRetryWorkers(): void {
        if (this.retryTimer) return;

        this.retryTimer = setInterval(() => {
            if (this.queue.length > 0) {
                void this.flush();
            }
        }, RETRY_INTERVAL_MS);

        if (!this.appStateSubscription) {
            this.appStateSubscription = AppState.addEventListener('change', (state) => {
                if (state === 'active' && this.queue.length > 0) {
                    void this.flush();
                }
            });
        }
    }

    private async readPersistedQueue(): Promise<PendingPdfUpload[]> {
        try {
            if (Platform.OS === 'web') {
                if (typeof localStorage === 'undefined') return [];
                const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed as PendingPdfUpload[] : [];
            }

            const file = getQueueFile();
            if (!file.exists) return [];
            const raw = await file.text();
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed as PendingPdfUpload[] : [];
        } catch (error) {
            if (__DEV__) {
                console.warn('[OfflinePdfUploadQueue] Failed to load queue, starting empty.', error);
            }
            return [];
        }
    }

    private async persistQueue(): Promise<void> {
        try {
            if (this.queue.length === 0) {
                if (Platform.OS === 'web') {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.removeItem(QUEUE_STORAGE_KEY);
                    }
                } else {
                    const file = getQueueFile();
                    if (file.exists) {
                        file.delete();
                    }
                }
                return;
            }

            const raw = JSON.stringify(this.queue);
            if (Platform.OS === 'web') {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(QUEUE_STORAGE_KEY, raw);
                }
                return;
            }

            const file = getQueueFile();
            file.write(raw);
        } catch (error) {
            if (__DEV__) {
                console.warn('[OfflinePdfUploadQueue] Failed to persist queue.', error);
            }
        }
    }
}

export const OfflinePdfUploadQueue = new OfflinePdfUploadQueueService();
export type { EnqueuePdfUploadInput };
