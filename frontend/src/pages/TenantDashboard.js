import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Wrench, FileText, LogOut, CheckCircle, Clock, Plus, X, Home } from 'lucide-react';
import propnexaLogo from '../propnexa_logo.png';
import { getProperty, getMaintenanceByProperty, getDocumentsByProperty, addMaintenance } from '../firebase/firestore';

export default function TenantDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [property, setProperty] = useState(null);
    const [issues, setIssues] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showQRModal, setShowQRModal] = useState(false);

    // Modal State
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [newIssue, setNewIssue] = useState({ category: 'plumbing', description: '' });

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user'));
        if (!u || u.role !== 'tenant') {
            navigate('/login');
            return;
        }
        setUser(u);
        fetchPropertyData(u.propertyId);
    }, [navigate]);

    const fetchPropertyData = async (propId) => {
        try {
            // Fetch property from Firestore
            const propData = await getProperty(propId);
            setProperty(propData);

            // Fetch maintenance issues from Firestore
            const maintenanceData = await getMaintenanceByProperty(propId);
            setIssues(maintenanceData.sort((a, b) => new Date(b.date) - new Date(a.date)));

            // Fetch documents from Firestore
            const docsData = await getDocumentsByProperty(propId);
            setDocuments(docsData);
        } catch (error) {
            console.error("Failed to fetch data from Firestore:", error);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const submitIssue = async (e) => {
        e.preventDefault();
        if (!newIssue.description) return;

        try {
            await addMaintenance({
                propertyId: user.propertyId,
                category: newIssue.category,
                description: newIssue.description,
                date: new Date().toISOString().split('T')[0],
                status: 'Open',
                cost: 0,
                vendor: 'Pending Assignment'
            });

            alert('Issue Reported Successfully');
            setShowIssueModal(false);
            setNewIssue({ category: 'plumbing', description: '' });
            fetchPropertyData(user.propertyId); // Reload data
        } catch (err) {
            console.error('Error reporting issue:', err);
            alert('Failed to report issue');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans relative">
            <div className="container mx-auto p-4 max-w-5xl">
                {/* Simple Header */}
                <div className="flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                        <img src={propnexaLogo} alt="Logo" className="w-8 h-8 object-contain" />
                        <h1 className="text-xl font-bold font-serif text-amber-100">PropNexa Tenant</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">Welcome, {user.username}</span>
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                            title="Home"
                        >
                            <Home className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'home' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" /> My Home
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'maintenance' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Wrench className="w-4 h-4" /> Maintenance
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'documents' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                    >
                        <FileText className="w-4 h-4" /> Documents
                    </button>
                </div>

                {/* Content */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 min-h-[400px]">
                    {loading ? <div className="text-center p-10 text-slate-500">Loading Property Data...</div> : (
                        <>
                            {activeTab === 'home' && property && (
                                <div className="animate-in fade-in">
                                    <h2 className="text-2xl font-bold mb-4">Rent Status</h2>
                                    <div className="card bg-slate-800/50 p-6 rounded-xl border border-green-500/20 mb-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-slate-400 text-sm mb-1">Upcoming Rent</div>
                                                <div className="text-3xl font-bold text-white">{formatCurrency(property.rentAmount)}</div>
                                                <div className="text-xs text-green-400 mt-1">Due Date: 1st {new Date().toLocaleString('default', { month: 'short' })}</div>
                                            </div>
                                            <button
                                                onClick={() => setShowQRModal(true)}
                                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all transform hover:scale-105"
                                            >
                                                Pay Now
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg mb-3">Lease Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950 p-4 rounded-lg">
                                            <label className="text-xs text-slate-500 uppercase">Property</label>
                                            <div className="text-slate-200">{property.address}</div>
                                        </div>
                                        <div className="bg-slate-950 p-4 rounded-lg">
                                            <label className="text-xs text-slate-500 uppercase">Landlord</label>
                                            <div className="text-slate-200">{property.landlordName}</div>
                                        </div>
                                        <div className="bg-slate-950 p-4 rounded-lg">
                                            <label className="text-xs text-slate-500 uppercase">Lease Ends</label>
                                            <div className="text-slate-200">{property.leaseEndDate}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'maintenance' && (
                                <div className="animate-in fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold">Reported Issues</h2>
                                        <button
                                            onClick={() => setShowIssueModal(true)}
                                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-4 py-2 rounded-lg text-sm border border-blue-500/30 flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> New Request
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {issues.length === 0 ? <p className="text-slate-500 text-center py-8">No issues reported.</p> : issues.map(issue => (
                                            <div key={issue.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${issue.status === 'Resolved' ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                                                        {issue.status === 'Resolved' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-orange-400" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{issue.description}</div>
                                                        <div className="text-xs text-slate-500">Category: {issue.category} • {issue.date}</div>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs ${issue.status === 'Resolved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                    {issue.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="animate-in fade-in space-y-3">
                                    {documents.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p>No documents shared yet.</p>
                                        </div>
                                    ) : (
                                        documents.map(doc => (
                                            <div key={doc.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:border-blue-500/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-200">{doc.filename}</div>
                                                        <div className="text-xs text-slate-500 uppercase">{doc.type} • {doc.upload_date}</div>
                                                    </div>
                                                </div>
                                                <a href="#" className="text-blue-400 text-sm hover:underline">Download</a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {showQRModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
                        <div className="bg-white p-6 rounded-2xl max-w-sm w-full relative">
                            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">Scan to Pay Rent</h3>
                            <div className="bg-slate-100 p-4 rounded-xl mb-4">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=propnexa@bank&pn=PropNexa&am=0&cu=INR`}
                                    className="w-full h-64 object-contain mx-auto mix-blend-multiply"
                                />
                            </div>
                            <p className="text-center text-slate-500 text-sm font-mono bg-slate-100 py-2 rounded-lg">UPI: propnexa@bank</p>
                        </div>
                    </div>
                )}

                {/* New Issue Modal */}
                {showIssueModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">Report New Issue</h3>
                                <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={submitIssue}>
                                <div className="mb-4">
                                    <label className="block text-slate-400 text-sm mb-2">Category</label>
                                    <select
                                        value={newIssue.category}
                                        onChange={e => setNewIssue({ ...newIssue, category: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                                    >
                                        <option value="plumbing">Plumbing</option>
                                        <option value="electrical">Electrical</option>
                                        <option value="painting">Painting</option>
                                        <option value="appliance">Appliance</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-slate-400 text-sm mb-2">Description</label>
                                    <textarea
                                        value={newIssue.description}
                                        onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white min-h-[100px]"
                                        placeholder="Describe the issue..."
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg">Submit Request</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
