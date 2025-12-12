import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The storage path (e.g. 'documents/lease.pdf')
 * @returns {Promise<string>} The download URL
 */
export const uploadFile = async (file, path) => {
    if (!file) return null;

    try {
        // Create a unique filename if needed, or use the provided path
        const fileRef = ref(storage, path);

        // Upload
        await uploadBytes(fileRef, file);

        // Get URL
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

/**
 * Upload a document with auto-generated path
 * @param {File} file - File object
 * @param {string} folder - Folder name (e.g. 'documents', 'identification')
 * @returns {Promise<Object>} { url, path, filename }
 */
export const uploadDocument = async (file, folder = 'documents') => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const path = `${folder}/${timestamp}_${safeName}`;

    const url = await uploadFile(file, path);
    return { url, path, filename: file.name };
};
