import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    setDoc
} from 'firebase/firestore';
import { db } from './config';

// ==================== USERS ====================

/**
 * Add or update a user document
 * @param {string} userId - Auth User ID (optional, if empty auto-id used)
 * @param {Object} userData - User data
 */
export const addUser = async (userData, userId = null) => {
    try {
        if (userId) {
            await setDoc(doc(db, 'users', userId), userData);
            return userId;
        } else {
            const docRef = await addDoc(collection(db, 'users'), userData);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error adding user:', error);
        throw error;
    }
};

// ==================== PROPERTIES ====================

/**
 * Get all properties
 * @returns {Promise<Array>} Array of properties
 */
export const getAllProperties = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'properties'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting properties:', error);
        throw error;
    }
};

/**
 * Get property by ID
 * @param {string} propertyId - Property ID
 * @returns {Promise<Object>} Property data
 */
export const getProperty = async (propertyId) => {
    try {
        const docRef = doc(db, 'properties', propertyId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            throw new Error('Property not found');
        }
    } catch (error) {
        console.error('Error getting property:', error);
        throw error;
    }
};

/**
 * Add new property
 * @param {Object} propertyData - Property data
 * @returns {Promise<string>} Created property ID
 */
export const addProperty = async (propertyData) => {
    try {
        const docRef = await addDoc(collection(db, 'properties'), {
            ...propertyData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding property:', error);
        throw error;
    }
};

/**
 * Update property
 * @param {string} propertyId - Property ID
 * @param {Object} updates - Fields to update
 */
export const updateProperty = async (propertyId, updates) => {
    try {
        const docRef = doc(db, 'properties', propertyId);
        await updateDoc(docRef, updates);
    } catch (error) {
        console.error('Error updating property:', error);
        throw error;
    }
};

// ==================== MAINTENANCE ====================

/**
 * Get all maintenance issues
 * @returns {Promise<Array>} Array of maintenance issues
 */
export const getAllMaintenance = async () => {
    try {
        const q = query(collection(db, 'maintenance'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting maintenance:', error);
        throw error;
    }
};

/**
 * Get maintenance issues for a property
 * @param {string} propertyId - Property ID
 * @returns {Promise<Array>} Array of maintenance issues
 */
export const getMaintenanceByProperty = async (propertyId) => {
    try {
        const q = query(
            collection(db, 'maintenance'),
            where('propertyId', '==', propertyId)
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Sort in memory instead of using Firestore orderBy
        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error getting maintenance by property:', error);
        throw error;
    }
};

/**
 * Add new maintenance issue
 * @param {Object} maintenanceData - Maintenance issue data
 * @returns {Promise<string>} Created maintenance issue ID
 */
export const addMaintenance = async (maintenanceData) => {
    try {
        const docRef = await addDoc(collection(db, 'maintenance'), {
            ...maintenanceData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding maintenance:', error);
        throw error;
    }
};

/**
 * Update maintenance issue status
 * @param {string} maintenanceId - Maintenance issue ID
 * @param {string} status - New status
 */
export const updateMaintenanceStatus = async (maintenanceId, status) => {
    try {
        const docRef = doc(db, 'maintenance', maintenanceId);
        await updateDoc(docRef, { status });
    } catch (error) {
        console.error('Error updating maintenance status:', error);
        throw error;
    }
};

// ==================== DOCUMENTS ====================

/**
 * Get all documents
 * @returns {Promise<Array>} Array of documents
 */
export const getAllDocuments = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'documents'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting documents:', error);
        throw error;
    }
};

/**
 * Get documents for a property
 * @param {string} propertyId - Property ID
 * @returns {Promise<Array>} Array of documents
 */
export const getDocumentsByProperty = async (propertyId) => {
    try {
        const q = query(
            collection(db, 'documents'),
            where('propertyId', '==', propertyId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting documents by property:', error);
        throw error;
    }
};

/**
 * Add new document
 * @param {Object} documentData - Document data
 * @returns {Promise<string>} Created document ID
 */
export const addDocument = async (documentData) => {
    try {
        const docRef = await addDoc(collection(db, 'documents'), {
            ...documentData,
            uploadDate: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding document:', error);
        throw error;
    }
};

// ==================== ANALYTICS ====================

/**
 * Get analytics data
 * @returns {Promise<Object>} Analytics data
 */
export const getAnalytics = async () => {
    try {
        const properties = await getAllProperties();
        const maintenance = await getAllMaintenance();

        const totalProperties = properties.length;
        const totalRent = properties.reduce((sum, prop) => sum + (prop.rentAmount || 0), 0);
        const activeIssues = maintenance.filter(m => m.status === 'In Progress').length;
        const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);

        // Group by category
        const byCategory = maintenance.reduce((acc, m) => {
            const cat = m.category || 'Other';
            if (!acc[cat]) {
                acc[cat] = { category: cat, count: 0, total_cost: 0 };
            }
            acc[cat].count++;
            acc[cat].total_cost += m.cost || 0;
            return acc;
        }, {});

        return {
            total_properties: totalProperties,
            total_monthly_rent: totalRent,
            active_issues: activeIssues,
            total_maintenance_cost: totalMaintenanceCost,
            issues_by_category: Object.values(byCategory)
        };
    } catch (error) {
        console.error('Error getting analytics:', error);
        throw error;
    }
};

// ==================== REAL-TIME LISTENERS ====================

/**
 * Listen to properties changes
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const onPropertiesChange = (callback) => {
    return onSnapshot(collection(db, 'properties'), (snapshot) => {
        const properties = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(properties);
    });
};

/**
 * Listen to maintenance changes
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const onMaintenanceChange = (callback) => {
    const q = query(collection(db, 'maintenance'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const maintenance = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(maintenance);
    });
};
