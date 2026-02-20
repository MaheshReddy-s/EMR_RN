import { API_ENDPOINTS, ConsultationSection } from '@/constants/endpoints';
import { api } from '@/lib/api-client';

export interface MasterDataItem {
    _id: string;
    name: string;
    // Some items might have extra fields, but for listing/editing we mostly care about name
    data?: string; // For things like drawings/encoded data if applicable
    fullData?: Record<string, any>;
}

export type MasterDataCategory = ConsultationSection | 'prescription';
export type MasterDataValue = string | Record<string, any>;

function isObject(value: MasterDataValue): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractTextValue(value: MasterDataValue): string {
    if (typeof value === 'string') return value;

    const candidates = [
        value.property_value,
        value.name,
        value.brand_name,
        value.medicine_name,
        value.brandName,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }

    return '';
}

function normalizePrescriptionPayload(value: MasterDataValue): Record<string, unknown> {
    const fallbackName = extractTextValue(value);
    if (!isObject(value)) {
        return {
            medicine_name: fallbackName,
            brand_name: fallbackName,
            medicine_type: 'Tablet',
        };
    }

    const brandName = extractTextValue({
        ...value,
        property_value: undefined,
        name: value.brand_name || value.medicine_name || value.brandName,
    });

    const variants = Array.isArray(value.variants)
        ? value.variants
            .filter((variant: unknown): variant is Record<string, any> => typeof variant === 'object' && variant !== null)
            .map((variant) => ({
                ...variant,
                variant_id: variant.variant_id || variant.id,
                timings: variant.timings || variant.frequency || variant.time || '',
                medicine_type: variant.medicine_type || variant.type || 'Tablet',
                type: variant.type || variant.medicine_type || 'Tablet',
                purchase_count: variant.purchase_count || variant.purchaseCount,
            }))
        : undefined;

    return {
        medicine_name: brandName,
        brand_name: brandName,
        generic_name: typeof value.generic_name === 'string'
            ? value.generic_name
            : (typeof value.genericName === 'string' ? value.genericName : ''),
        variants,
    };
}

export const MasterDataService = {
    /**
     * Get items for a specific category
     */
    async getItems(doctorId: string, category: MasterDataCategory): Promise<MasterDataItem[]> {
        let url: string;

        if (category === 'prescription') {
            url = API_ENDPOINTS.PRESCRIPTIONS.LIST(doctorId);
        } else {
            url = API_ENDPOINTS.PROPERTIES.SECTION(doctorId, category as ConsultationSection);
        }

        const response = await api.get<any>(url);
        // Handle different response structures if any
        // Usually returns { data: [...] } or just [...]
        // Swift response handlers map from data[]
        let items = [];
        if (Array.isArray(response)) {
            items = response;
        } else if (response.data && Array.isArray(response.data)) {
            items = response.data;
        } else {
            items = [];
        }

        // Normalize to MasterDataItem interface if needed
        // Assuming backend returns _id and name (or patient_name/etc which we handle)
        return items.map((item: any) => ({
            _id: item._id || item.id,
            name: item.name || item.medicine_name || item.brand_name || item.property_value || 'Unknown', // Fallback for various types
            data: item.data,
            fullData: item,
        }));
    },

    /**
     * Add a new item
     */
    async addItem(doctorId: string, category: MasterDataCategory, value: MasterDataValue): Promise<boolean> {
        if (category === 'prescription') {
            await api.post(API_ENDPOINTS.PRESCRIPTIONS.CREATE(doctorId), normalizePrescriptionPayload(value));
        } else {
            const propertyValue = extractTextValue(value);
            // New Specification: POST /v1/<doctor_id>/properties
            // Payload: { "property_name": "diagnosis", "property_value": "..." }
            await api.post(API_ENDPOINTS.PROPERTIES.ADD_PROPERTY(doctorId), {
                property_name: category,
                property_value: propertyValue
            });
        }
        return true;
    },

    /**
     * Update an item
     */
    async updateItem(doctorId: string, category: MasterDataCategory, id: string, value: MasterDataValue): Promise<boolean> {
        if (category === 'prescription') {
            await api.put(API_ENDPOINTS.PRESCRIPTIONS.UPDATE(doctorId, id), normalizePrescriptionPayload(value));
        } else {
            const propertyValue = extractTextValue(value);
            // New Specification: PUT /v1/properties/<doctor_id>/<property_type>
            // Payload: { "property_id": "...", "property_value": "..." }
            const url = API_ENDPOINTS.PROPERTIES.UPDATE_OR_DELETE(doctorId, category as ConsultationSection);
            await api.put(url, {
                property_id: id,
                property_value: propertyValue
            });
        }
        return true;
    },

    /**
     * Delete an item
     */
    async deleteItem(doctorId: string, category: MasterDataCategory, id: string): Promise<boolean> {
        if (category === 'prescription') {
            await api.delete(API_ENDPOINTS.PRESCRIPTIONS.DELETE(doctorId, id));
        } else {
            // New Specification: DELETE /v1/properties/<doctor_id>/<property_type>?property_id=...
            const baseUrl = API_ENDPOINTS.PROPERTIES.UPDATE_OR_DELETE(doctorId, category as ConsultationSection);
            const url = `${baseUrl}?property_id=${id}`;
            await api.delete(url);
        }
        return true;
    }
};
