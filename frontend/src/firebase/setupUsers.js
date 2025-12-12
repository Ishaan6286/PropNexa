// Firebase User Setup Script
// Run this once to create initial users in Firebase Authentication and Firestore

import { registerUser } from './auth';

const initialUsers = [
    {
        email: 'ishaan@propnexa.com',
        password: 'Ishaan123',
        username: 'Ishaan',
        role: 'owner',
        propertyId: null
    },
    {
        email: 'chintu@propnexa.com',
        password: 'Chintu123',
        username: 'Chintu',
        role: 'tenant',
        propertyId: 'mumbai_galaxy'
    },
    {
        email: 'suresh@propnexa.com',
        password: 'tenant123',
        username: 'suresh',
        role: 'tenant',
        propertyId: 'bangalore_tech'
    }
];

async function setupUsers() {
    console.log('Setting up Firebase users...');

    for (const user of initialUsers) {
        try {
            const result = await registerUser(user.email, user.password, {
                username: user.username,
                role: user.role,
                propertyId: user.propertyId
            });

            if (result.status === 'success') {
                console.log(`✅ Created user: ${user.username} (${user.email})`);
            } else {
                console.error(`❌ Failed to create ${user.username}:`, result.message);
            }
        } catch (error) {
            console.error(`❌ Error creating ${user.username}:`, error.message);
        }
    }

    console.log('\n✅ User setup complete!');
    console.log('\nYou can now login with:');
    console.log('Owner: Ishaan / Ishaan123');
    console.log('Tenant 1: Chintu / Chintu123');
    console.log('Tenant 2: suresh / tenant123');
}

// Export for use
export { setupUsers, initialUsers };
