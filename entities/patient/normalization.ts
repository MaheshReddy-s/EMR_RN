import type { Patient } from './types';

export interface NormalizedPatients {
    byId: Record<string, Patient>;
    allIds: string[];
}

export interface PatientNormalizationOptions {
    maxSize?: number;
    warnThreshold?: number;
    context?: string;
}

const DEFAULT_MAX_ENTITY_STORE_SIZE = Number(process.env.EXPO_PUBLIC_PATIENT_ENTITY_MAX || 5_000);
const DEFAULT_WARN_THRESHOLD = Number(process.env.EXPO_PUBLIC_PATIENT_ENTITY_WARN || 4_000);
const DEV_LARGE_DATASET_THRESHOLD = Number.isFinite(DEFAULT_WARN_THRESHOLD) && DEFAULT_WARN_THRESHOLD > 0
    ? DEFAULT_WARN_THRESHOLD
    : 1_500;

let hasWarnedLargePatientDataset = false;
let hasWarnedEntityEviction = false;

function warnLargeDataset(count: number): void {
    if (!__DEV__ || hasWarnedLargePatientDataset || count < DEV_LARGE_DATASET_THRESHOLD) {
        return;
    }

    hasWarnedLargePatientDataset = true;
    console.warn(
        `[Patients] Large dataset detected (${count}). Consider pagination tuning or virtualized rendering safeguards.`
    );
}

function resolveMaxSize(override?: number): number {
    if (typeof override === 'number' && override > 0) return override;
    if (Number.isFinite(DEFAULT_MAX_ENTITY_STORE_SIZE) && DEFAULT_MAX_ENTITY_STORE_SIZE > 0) {
        return DEFAULT_MAX_ENTITY_STORE_SIZE;
    }
    return 5_000;
}

function applyBoundedEviction(
    byId: Record<string, Patient>,
    allIds: string[],
    options?: PatientNormalizationOptions
): NormalizedPatients {
    const maxSize = resolveMaxSize(options?.maxSize);
    if (allIds.length <= maxSize) {
        return { byId, allIds };
    }

    const overflow = allIds.length - maxSize;
    const evictedIds = allIds.slice(0, overflow);
    const keptIds = allIds.slice(overflow);
    const nextById = { ...byId };

    for (const id of evictedIds) {
        delete nextById[id];
    }

    if (__DEV__ && !hasWarnedEntityEviction) {
        hasWarnedEntityEviction = true;
        const context = options?.context ? ` (${options.context})` : '';
        console.warn(
            `[Patients] Entity store eviction triggered${context}: removed ${evictedIds.length} entries to enforce max=${maxSize}.`
        );
    }

    return { byId: nextById, allIds: keptIds };
}

export function createEmptyNormalizedPatients(): NormalizedPatients {
    return { byId: {}, allIds: [] };
}

export function normalizePatients(
    items: Patient[],
    options?: PatientNormalizationOptions
): NormalizedPatients {
    const byId: Record<string, Patient> = {};
    const allIds: string[] = [];

    for (const item of items) {
        if (!item?._id) continue;
        if (byId[item._id]) {
            const existingIndex = allIds.indexOf(item._id);
            if (existingIndex >= 0) allIds.splice(existingIndex, 1);
        }
        byId[item._id] = item;
        allIds.push(item._id);
    }

    warnLargeDataset(allIds.length);
    return applyBoundedEviction(byId, allIds, options);
}

export function mergeNormalizedPatients(
    current: NormalizedPatients,
    incoming: Patient[],
    options?: PatientNormalizationOptions
): NormalizedPatients {
    if (incoming.length === 0) return current;

    const byId = { ...current.byId };
    const touchedIds = new Set<string>();
    const incomingIds: string[] = [];

    for (const item of incoming) {
        if (!item?._id) continue;
        byId[item._id] = item;
        if (!touchedIds.has(item._id)) {
            touchedIds.add(item._id);
            incomingIds.push(item._id);
        }
    }

    const retainedIds = current.allIds.filter((id) => !touchedIds.has(id));
    const allIds = [...retainedIds, ...incomingIds];

    warnLargeDataset(allIds.length);
    return applyBoundedEviction(byId, allIds, options);
}

export function denormalizePatients(state: NormalizedPatients): Patient[] {
    return state.allIds
        .map((id) => state.byId[id])
        .filter((patient): patient is Patient => Boolean(patient));
}
