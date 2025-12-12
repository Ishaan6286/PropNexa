// Fix Property Data in Firestore
// Run this to correct the rent amount for mumbai_galaxy property

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

async function fixPropertyData() {
    console.log('Fixing property data in Firestore...');

    try {
        // Update mumbai_galaxy property with correct rent
        await updateDoc(doc(db, 'properties', 'mumbai_galaxy'), {
            rentAmount: 10000,
            tenantName: 'Chintu Singh'
        });

        console.log('✅ Fixed mumbai_galaxy property data');
        console.log('   - Rent: ₹10,000');
        console.log('   - Tenant: Chintu Singh');
    } catch (error) {
        console.error('❌ Error fixing data:', error.message);
    }
}

export { fixPropertyData };
