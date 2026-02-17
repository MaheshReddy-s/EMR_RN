import { Platform } from 'react-native';
import { File as FSFile, Paths } from 'expo-file-system';
import { ConsultationItem } from '@/types/consultation';
import { SECTION_KEYS, TabType } from '@/hooks/useConsultation';

/**
 * DraftService
 * ------------
 * Lightweight consultation draft persistence for crash recovery.
 *
 * Storage strategy:
 *  - Native: expo-file-system (File class API, no size limit, fast JSON read/write)
 *  - Web: localStorage (5MB limit, sufficient for drafts)
 *
 * Constraints:
 *  - Does NOT auto-submit drafts
 *  - Does NOT modify backend contracts
 *  - Strips SkPath objects (non-serializable) — only StrokeData.svg is persisted
 */

const DRAFT_STORAGE_KEY = 'emr_consultation_draft';
const DRAFT_FILENAME = 'consultation_draft.json';

interface DraftData {
    patientId: string;
    timestamp: number;
    sections: Partial<Record<TabType, ConsultationItem[]>>;
}

// ─── HELPERS ─────────────────────────────────────────────────

function getDraftFile(): FSFile {
    return new FSFile(Paths.document, DRAFT_FILENAME);
}

/**
 * Strip non-serializable fields from items before saving.
 * StrokeData.svg strings are kept; SkPath objects are not in state anyway.
 */
function sanitizeForStorage(sections: Partial<Record<TabType, ConsultationItem[]>>): Partial<Record<TabType, ConsultationItem[]>> {
    const clean: Partial<Record<TabType, ConsultationItem[]>> = {};
    for (const key of SECTION_KEYS) {
        const items = sections[key];
        if (items && items.length > 0) {
            clean[key] = items.map(item => ({
                ...item,
                // Only keep serializable drawing data
                drawings: item.drawings?.map(d => ({
                    svg: d.svg,
                    color: d.color,
                    width: d.width,
                    blendMode: d.blendMode,
                })),
            }));
        }
    }
    return clean;
}

// ─── PUBLIC API ──────────────────────────────────────────────

export const DraftService = {
    /**
     * Save consultation draft to local storage.
     * Called every 30s, on app background, and on screen blur.
     */
    async saveDraft(patientId: string, sections: Partial<Record<TabType, ConsultationItem[]>>): Promise<void> {
        const draft: DraftData = {
            patientId,
            timestamp: Date.now(),
            sections: sanitizeForStorage(sections),
        };

        const json = JSON.stringify(draft);

        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(DRAFT_STORAGE_KEY, json);
            } else {
                const file = getDraftFile();
                file.write(json);
            }
            if (__DEV__) console.log(`[DraftService] Draft saved (${(json.length / 1024).toFixed(1)}KB)`);
        } catch (e) {
            // Silently fail — draft is best-effort, never blocks consultation flow
            if (__DEV__) console.warn('[DraftService] Save failed:', e);
        }
    },

    /**
     * Load a draft for a specific patient.
     * Returns null if no draft exists or draft is for a different patient.
     */
    async loadDraft(patientId: string): Promise<DraftData | null> {
        try {
            let json: string | null = null;

            if (Platform.OS === 'web') {
                json = localStorage.getItem(DRAFT_STORAGE_KEY);
            } else {
                const file = getDraftFile();
                if (file.exists) {
                    json = await file.text();
                }
            }

            if (!json) return null;

            const draft: DraftData = JSON.parse(json);

            // Only return if draft matches the requested patient
            if (draft.patientId !== patientId) return null;

            // Reject drafts older than 24 hours (stale)
            const MAX_AGE_MS = 24 * 60 * 60 * 1000;
            if (Date.now() - draft.timestamp > MAX_AGE_MS) {
                await this.clearDraft();
                return null;
            }

            return draft;
        } catch (e) {
            if (__DEV__) console.warn('[DraftService] Load failed:', e);
            return null;
        }
    },

    /**
     * Clear any stored draft. Called after successful consultation save.
     */
    async clearDraft(): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            } else {
                const file = getDraftFile();
                if (file.exists) {
                    file.delete();
                }
            }
            if (__DEV__) console.log('[DraftService] Draft cleared');
        } catch (e) {
            if (__DEV__) console.warn('[DraftService] Clear failed:', e);
        }
    },

    /**
     * Check if a draft exists for ANY patient (used on app launch for recovery prompt).
     */
    async hasDraft(): Promise<{ exists: boolean; patientId?: string; timestamp?: number }> {
        try {
            let json: string | null = null;
            if (Platform.OS === 'web') {
                json = localStorage.getItem(DRAFT_STORAGE_KEY);
            } else {
                const file = getDraftFile();
                if (file.exists) {
                    json = await file.text();
                }
            }
            if (!json) return { exists: false };
            const draft: DraftData = JSON.parse(json);
            return { exists: true, patientId: draft.patientId, timestamp: draft.timestamp };
        } catch {
            return { exists: false };
        }
    },
};
