import { uploadToCloudinary } from "../utils/cloudinaryUpload";

export const BASE_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

/**
 * Uploads a file/attachment/image/pdf to Cloudinary.
 * @param {string|File|Blob} base64Data - The file content (File, Blob, or base64 Data URL).
 * @param {string} fileName - The name of the file.
 * @param {string} mimeType - The MIME type of the file.
 * @param {string} folderId - Unused, kept for backwards compatibility.
 * @returns {Promise<Object>} - The JSON response object containing fileUrl and downloadUrl.
 */
export const uploadFile = async (base64Data, fileName, mimeType, folderId) => {
    try {
        const fileUrl = await uploadToCloudinary(base64Data, fileName);
        return {
            success: true,
            fileUrl,
            downloadUrl: fileUrl,
            data: { secure_url: fileUrl },
        };
    } catch (error) {
        console.error("Service Upload Error:", error);
        throw error;
    }
};

/**
 * Submits data to a Google Sheet.
 * @param {string} sheetName - The name of the sheet to insert/update data.
 * @param {string} action - The action to perform (e.g., 'bulkInsert', 'insert').
 * @param {Array|Object} rowsData - The data payload.
 * @returns {Promise<Object>} - The response object.
 */
export const submitData = async (sheetName, action, rowsData) => {
    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            body: new URLSearchParams({
                sheetName,
                action,
                rowsData: typeof rowsData === 'string' ? rowsData : JSON.stringify(rowsData),
            }),
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Submission failed");
        }
        return result;
    } catch (error) {
        console.error("Service Submit Error:", error);
        throw error;
    }
};
