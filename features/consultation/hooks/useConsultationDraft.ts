import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { DraftService } from '@/services/draft-service';
import type { ConsultationState, TabType } from '@/hooks/useConsultation';

const SECTION_KEYS: TabType[] = [
    'complaints', 'diagnosis', 'examination', 'investigation',
    'procedure', 'prescriptions', 'instruction', 'notes',
];

interface UseConsultationDraftParams {
    patientId?: string;
    consultation: ConsultationState;
    restoreDraft: (draft: Partial<ConsultationState>) => void;
}

export function useConsultationDraft({
    patientId,
    consultation,
    restoreDraft,
}: UseConsultationDraftParams) {
    useEffect(() => {
        if (!patientId) return;
        let cancelled = false;

        (async () => {
            const draft = await DraftService.loadDraft(patientId);
            if (cancelled || !draft) return;

            const draftDate = new Date(draft.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit',
            });

            Alert.alert(
                'Restore Previous Session?',
                `A draft from ${draftDate} was found. Would you like to restore it?`,
                [
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => DraftService.clearDraft(),
                    },
                    {
                        text: 'Restore',
                        onPress: () => {
                            if (draft.sections) {
                                restoreDraft(draft.sections as any);
                            }
                        },
                    },
                ],
                { cancelable: false }
            );
        })();

        return () => { cancelled = true; };
    }, [patientId, restoreDraft]);

    useEffect(() => {
        if (!patientId) return;

        const saveDraftNow = () => {
            const sections: any = {};
            for (const key of SECTION_KEYS) {
                const items = consultation[key];
                if (items && (items as any[]).length > 0) {
                    sections[key] = items;
                }
            }
            if (Object.keys(sections).length > 0) {
                DraftService.saveDraft(patientId, sections);
            }
        };

        const interval = setInterval(saveDraftNow, 30_000);
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState !== 'active') {
                saveDraftNow();
            }
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [consultation, patientId]);
}
