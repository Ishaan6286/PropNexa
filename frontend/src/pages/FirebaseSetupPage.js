import React, { useState } from 'react';
import { setupUsers } from '../firebase/setupUsers';
import { migrateAllData } from '../firebase/migrateData';
import { fixPropertyData } from '../firebase/fixData';

export default function FirebaseSetupPage() {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetupUsers = async () => {
        setLoading(true);
        setStatus('Creating Firebase Auth users...');

        try {
            await setupUsers();
            setStatus('✅ Users created successfully! You can now login.');
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }

        setLoading(false);
    };

    const handleMigrateData = async () => {
        setLoading(true);
        setStatus('Migrating data to Firestore...');

        try {
            await migrateAllData();
            setStatus('✅ Data migrated successfully!');
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }

        setLoading(false);
    };

    const handleFixData = async () => {
        setLoading(true);
        setStatus('Fixing property data...');

        try {
            await fixPropertyData();
            setStatus('✅ Property data fixed! Rent for Chintu is now ₹10,000.');
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }

        setLoading(false);
    };

    const handleSetupAll = async () => {
        setLoading(true);

        try {
            setStatus('Step 1/2: Creating users...');
            await setupUsers();

            setStatus('Step 2/2: Migrating data...');
            await migrateAllData();

            setStatus('✅ Setup complete! Firebase is ready to use.');
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Firebase Setup</h1>

                <div className="bg-slate-900 p-6 rounded-lg mb-6">
                    <h2 className="text-2xl font-semibold mb-4">One-Time Setup</h2>
                    <p className="text-slate-400 mb-6">
                        Run this setup to create Firebase Auth users and migrate data from SQLite to Firestore.
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={handleSetupAll}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Setting up...' : '🚀 Run Complete Setup'}
                        </button>

                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={handleSetupUsers}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                            >
                                Create Users
                            </button>

                            <button
                                onClick={handleMigrateData}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                            >
                                Migrate Data
                            </button>

                            <button
                                onClick={handleFixData}
                                disabled={loading}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                            >
                                Fix Data
                            </button>
                        </div>
                    </div>
                </div>

                {status && (
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Status:</h3>
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap">{status}</pre>
                    </div>
                )}

                <div className="mt-8 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">ℹ️ After Setup:</h3>
                    <ul className="text-sm text-slate-300 space-y-1">
                        <li>• Owner login: Ishaan / Ishaan123</li>
                        <li>• Tenant login: Chintu / Chintu123</li>
                        <li>• All data will be in Firestore</li>
                        <li>• You can delete the backend server</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
