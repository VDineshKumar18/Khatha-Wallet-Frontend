import axiosClient from "../api/axiosClient";
import { toast } from "react-toastify";

/**
 * Generates a WhatsApp link from the backend and opens it in a new tab.
 * This allows the user to send messages from their own personal account.
 * @param {'order' | 'due' | 'bill'} type 
 * @param {string|number} id 
 */
export const openWhatsApp = async (type, id) => {
    try {
        const response = await axiosClient.get(`/notifications/whatsapp/${type}/${id}`);
        
        if (response.status === 200 && response.data) {
            window.open(response.data, "_blank");
        } else {
            toast.error("Failed to generate WhatsApp link.");
        }
    } catch (error) {
        console.error("WhatsApp error:", error);
        
        // Extract specific error message from backend if available
        const backendMessage = error?.response?.data || "Error connecting to WhatsApp service.";
        toast.error(backendMessage);
    }
};
