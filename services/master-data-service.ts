import { API_ENDPOINTS, ConsultationSection } from '@/constants/endpoints';
import { api } from '@/lib/api-client';

export interface MasterDataItem {
    _id: string;
    name: string;
    // Some items might have extra fields, but for listing/editing we mostly care about name
    data?: string; // For things like drawings/encoded data if applicable
}

export type MasterDataCategory = ConsultationSection | 'prescription';

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
            name: item.name || item.medicine_name || item.brand_name || 'Unknown', // Fallback for various types
            data: item.data
        }));
    },

    /**
     * Add a new item
     */
    async addItem(doctorId: string, category: MasterDataCategory, value: string): Promise<boolean> {
        if (category === 'prescription') {
            await api.post(API_ENDPOINTS.PRESCRIPTIONS.CREATE(doctorId), {
                medicine_name: value,
                medicine_type: "Tablet", // Default
                brand_name: value
            });
        } else {
            // New Specification: POST /v1/<doctor_id>/properties
            // Payload: { "property_name": "diagnosis", "property_value": "..." }
            await api.post(API_ENDPOINTS.PROPERTIES.ADD_PROPERTY(doctorId), {
                property_name: category,
                property_value: value
            });
        }
        return true;
    },

    /**
     * Update an item
     */
    async updateItem(doctorId: string, category: MasterDataCategory, id: string, value: string): Promise<boolean> {
        if (category === 'prescription') {
            await api.put(API_ENDPOINTS.PRESCRIPTIONS.UPDATE(doctorId, id), {
                medicine_name: value,
                brand_name: value
            });
        } else {
            // New Specification: PUT /v1/properties/<doctor_id>/<property_type>
            // Payload: { "property_id": "...", "property_value": "..." }
            const url = API_ENDPOINTS.PROPERTIES.UPDATE_OR_DELETE(doctorId, category as ConsultationSection);
            await api.put(url, {
                property_id: id,
                property_value: value
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
