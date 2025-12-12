// Data Migration Script - SQLite to Firestore
// This script migrates data from the SQLite backend to Firebase Firestore

import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './config';

// Sample data from SQLite database
const properties = [
    {
        id: 'mumbai_galaxy',
        address: '101, Galaxy Heights, Bandra West, Mumbai',
        type: 'Residential',
        tenantName: 'Chintu',
        leaseType: '11-Month Agreement',
        rentAmount: 85000,
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        landlordName: 'Ishaan Chawla',
        panNumber: 'ABCPV1234A'
    },
    {
        id: 'bangalore_tech',
        address: 'Unit 402, Tech Park View, Koramangala, Bangalore',
        type: 'Commercial',
        tenantName: 'Innovate Solutions Pvt Ltd',
        leaseType: 'Triple Net',
        rentAmount: 150000,
        leaseStartDate: '2023-04-01',
        leaseEndDate: '2026-03-31',
        landlordName: 'Ishaan Chawla',
        panNumber: 'XYZPM5678B'
    },
    {
        id: 'delhi_villa',
        address: 'Villa 12, Green Park, South Delhi',
        type: 'Residential',
        tenantName: 'Mehta Family',
        leaseType: 'Standard Lease',
        rentAmount: 120000,
        leaseStartDate: '2024-06-01',
        leaseEndDate: '2025-05-31',
        landlordName: 'Ishaan Chawla',
        panNumber: 'PQRSJ9012C'
    }
];

const maintenanceIssues = [
    {
        propertyId: 'mumbai_galaxy',
        category: 'plumbing',
        description: 'Monsoon leakage in master bedroom wall',
        date: '2024-07-15',
        status: 'Resolved',
        cost: 4500,
        vendor: 'QuickFix Utilities'
    },
    {
        propertyId: 'bangalore_tech',
        category: 'electrical',
        description: 'UPS Battery replacement for server room',
        date: '2024-02-20',
        status: 'Resolved',
        cost: 12000,
        vendor: 'PowerSafe Ltd'
    },
    {
        propertyId: 'mumbai_galaxy',
        category: 'electrical',
        description: 'Geyser switch burnout',
        date: '2024-08-10',
        status: 'Resolved',
        cost: 850,
        vendor: 'Local Electrician'
    },
    {
        propertyId: 'delhi_villa',
        category: 'gardening',
        description: 'Seasonal lawn maintenance and pruning',
        date: '2024-09-05',
        status: 'In Progress',
        cost: 2500,
        vendor: 'Green Thumbs'
    },
    {
        propertyId: 'mumbai_galaxy',
        category: 'painting',
        description: 'Living room touch-up paint',
        date: '2024-01-10',
        status: 'Resolved',
        cost: 15000,
        vendor: 'Asian Paints Service'
    }
];

async function migrateProperties() {
    console.log('Migrating properties to Firestore...');

    for (const property of properties) {
        try {
            await setDoc(doc(db, 'properties', property.id), {
                ...property,
                createdAt: new Date().toISOString()
            });
            console.log(`✅ Migrated property: ${property.id}`);
        } catch (error) {
            console.error(`❌ Error migrating property ${property.id}:`, error.message);
        }
    }
}

async function migrateMaintenance() {
    console.log('\nMigrating maintenance issues to Firestore...');

    for (const issue of maintenanceIssues) {
        try {
            const docRef = doc(collection(db, 'maintenance'));
            await setDoc(docRef, {
                ...issue,
                createdAt: new Date().toISOString()
            });
            console.log(`✅ Migrated maintenance issue for ${issue.propertyId}`);
        } catch (error) {
            console.error(`❌ Error migrating maintenance:`, error.message);
        }
    }
}

async function migrateAllData() {
    console.log('🚀 Starting data migration from SQLite to Firestore...\n');

    try {
        await migrateProperties();
        await migrateMaintenance();

        console.log('\n✅ Data migration complete!');
        console.log('\nMigrated:');
        console.log(`- ${properties.length} properties`);
        console.log(`- ${maintenanceIssues.length} maintenance issues`);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    }
}

// Export for use
export { migrateAllData, migrateProperties, migrateMaintenance };
