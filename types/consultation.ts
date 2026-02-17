/**
 * BACKWARD COMPATIBILITY RE-EXPORT
 * ─────────────────────────────────
 * Types have been consolidated into entities/consultation/types.ts.
 * This file re-exports everything to avoid breaking existing imports.
 *
 * Consumers should gradually migrate to:
 *   import { ... } from '@/entities/consultation/types';
 */
export {
    PrescriptionVariant,
    PrescriptionData,
    StrokeData,
    ConsultationItem,
    PrescriptionPayload,
} from '@/entities/consultation/types';
