import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyB7hMmjcNdNLvFO7rmCXqmPm4TB08QtLwo",
    authDomain: "real-estate-asset-brain.firebaseapp.com",
    projectId: "real-estate-asset-brain",
    storageBucket: "real-estate-asset-brain.firebasestorage.app",
    messagingSenderId: "646141446210",
    appId: "1:646141446210:web:ef38266178149dd39745db",
    measurementId: "G-MHYFT6QYJ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence not supported by browser');
    }
});

export const storage = getStorage(app);

export default app;
