import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data with role
 */
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user profile from Firestore
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                return {
                    status: 'success',
                    user: {
                        id: user.uid,
                        email: user.email,
                        ...userDoc.data()
                    }
                };
            } else {
                throw new Error('User profile not found');
            }
        } catch (firestoreError) {
            console.error('Firestore error during login:', firestoreError);
            if (firestoreError.code === 'permission-denied') {
                throw new Error('Missing or insufficient permissions. Please ensure Firestore Security Rules are deployed.');
            }
            throw firestoreError;
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            status: 'error',
            message: error.message || 'Login failed'
        };
    }
};

/**
 * Register new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} userData - Additional user data (username, role, etc.)
 * @returns {Promise<Object>} Created user data
 */
export const registerUser = async (email, password, userData) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            username: userData.username,
            role: userData.role,
            propertyId: userData.propertyId || null,
            createdAt: new Date().toISOString()
        });

        return {
            status: 'success',
            user: {
                id: user.uid,
                email: user.email,
                ...userData
            }
        };
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'permission-denied') {
            return {
                status: 'error',
                message: 'Permission denied. Please ensure Firestore Security Rules are deployed.'
            };
        }
        return {
            status: 'error',
            message: error.message || 'Registration failed'
        };
    }
};

/**
 * Sign out current user
 */
export const logoutUser = async () => {
    try {
        await signOut(auth);
        return { status: 'success' };
    } catch (error) {
        console.error('Logout error:', error);
        return {
            status: 'error',
            message: error.message || 'Logout failed'
        };
    }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} Current user or null
 */
export const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
                // Get user profile from Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    resolve({
                        id: user.uid,
                        email: user.email,
                        ...userDoc.data()
                    });
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        }, reject);
    });
};

/**
 * Listen to authentication state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                callback({
                    id: user.uid,
                    email: user.email,
                    ...userDoc.data()
                });
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    });
};
