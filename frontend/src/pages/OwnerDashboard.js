import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, AlertCircle, Search, Upload, Wrench, DollarSign, Users, TrendingUp, CreditCard, Printer, Download, Send, CheckCircle, Share2, UserPlus, LogOut, Home } from 'lucide-react';
import propnexaLogo from '../propnexa_logo.png';
import { getAllProperties, getAllMaintenance, getAllDocuments, getAnalytics, addProperty, updateProperty, addUser, addDocument, updateMaintenanceStatus } from '../firebase/firestore';
import { uploadDocument } from '../firebase/storage';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function OwnerDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };
  const [properties, setProperties] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Tenant Form State
  const [newTenant, setNewTenant] = useState({
    name: '', username: '', password: '',
    property_id: '', rent_amount: '', lease_start: '', lease_end: ''
  });
  const [tenantFiles, setTenantFiles] = useState({ aadhaar: null, pan: null });
  // New Property State
  const [newProperty, setNewProperty] = useState({ address: '', type: 'Residential', rent_amount: '', owner_name: '' });
  // Receipt State
  const [receiptDetails, setReceiptDetails] = useState({ tenant_id: '', month: '', amount: '', date: new Date().toISOString().split('T')[0] });
  // Upload State
  const [uploadMeta, setUploadMeta] = useState({ property_id: '', tenant_id: '' });

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    try {
      await addProperty({
        address: newProperty.address,
        type: newProperty.type,
        rentAmount: parseFloat(newProperty.rent_amount),
        landlordName: newProperty.owner_name || 'Ishaan Chawla',
        leaseType: 'Fixed',
        status: 'Vacant'
      });
      alert('Property Created Successfully in Firestore!');
      setNewProperty({ address: '', type: 'Residential', rent_amount: '', owner_name: '' });
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Error creating property');
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { url } = await uploadDocument(file, 'qr_codes');
      alert(`QR Code Uploaded to Storage! URL: ${url}`);
    } catch (err) { alert('Upload failed'); }
  };

  const handleOnboardTenant = async (e) => {
    e.preventDefault();
    if (!newTenant.property_id) return alert('Please select a property');

    try {
      let aadhaarUrl = null;
      let panUrl = null;

      // 1. Upload Documents
      if (tenantFiles.aadhaar) {
        const res = await uploadDocument(tenantFiles.aadhaar, 'identification');
        aadhaarUrl = res.url;
      }
      if (tenantFiles.pan) {
        const res = await uploadDocument(tenantFiles.pan, 'identification');
        panUrl = res.url;
      }

      // 2. Create Tenant Data in Firestore (Note: Auth user creation typically requires Admin SDK or separate flow)
      const tenantId = newTenant.username; // Using username as ID for simplicity
      await addUser({
        name: newTenant.name,
        email: `${newTenant.username}@example.com`, // Pseudo email
        role: 'tenant',
        propertyId: newTenant.property_id,
        phone: "9999999999",
        aadhaarUrl,
        panUrl
      }, tenantId);

      // 3. Update Property with Tenant Info
      await updateProperty(newTenant.property_id, {
        tenantName: newTenant.name,
        tenantId: tenantId,
        rentAmount: parseFloat(newTenant.rent_amount),
        leaseStartDate: newTenant.lease_start,
        leaseEndDate: newTenant.lease_end,
        status: 'Occupied'
      });

      alert('Tenant Onboarded & Documents Uploaded Successfully!');
      setNewTenant({ name: '', username: '', password: '', property_id: '', rent_amount: '', lease_start: '', lease_end: '' });
      setTenantFiles({ aadhaar: null, pan: null });
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Error onboarding tenant: ' + err.message);
    }
  };

  // Helper for Indian Currency Formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch from Firestore instead of backend API
      const [propsData, maintenanceData, docsData, analyticsData] = await Promise.all([
        getAllProperties(),
        getAllMaintenance(),
        getAllDocuments(),
        getAnalytics()
      ]);

      setProperties(propsData);

      // Enrich maintenance data with property address
      const enrichedMaintenance = maintenanceData.map(issue => {
        const prop = propsData.find(p => p.id === issue.propertyId);
        return {
          ...issue,
          address: prop ? prop.address : 'Unknown Property'
        };
      });

      setMaintenance(enrichedMaintenance);
      setDocuments(docsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error('Query error:', error);
      setQueryResult({
        answer: 'Error processing query. Make sure the backend is running.',
        data: [],
        query_type: 'error'
      });
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadMeta.property_id) return alert("Please select a property first!");

    try {
      // Upload to Firebase Storage
      const { url, filename } = await uploadDocument(file, 'documents');

      // Save metadata to Firestore
      await addDocument({
        propertyId: uploadMeta.property_id,
        tenantId: uploadMeta.tenant_id,
        filename: filename,
        url: url,
        type: 'Lease/Contract' // Default type
      });

      alert('File Uploaded Successfully!');
      fetchAllData();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    }
  };

  const resolveIssue = async (id) => {
    try {
      await updateMaintenanceStatus(id, 'Resolved');
      alert('Issue marked as Resolved');
      fetchAllData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8 border-b border-blue-900/20 pb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <img
                src={propnexaLogo}
                alt="PropNexa Logo"
                className="relative w-20 h-20 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>
                PROPNEXA
              </h1>
              <p className="text-slate-400 font-medium tracking-wide text-sm mt-1 uppercase">Full Stack AI-Powered Property Management</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-blue-900/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-slate-700 hover:border-blue-500/30">
              <Home className="w-4 h-4" /> Home
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-all border border-slate-700 hover:border-red-500/30">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 glass-strong rounded-2xl p-6 glow-blue animate-fade-in">
          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500/50 w-5 h-5 group-focus-within:text-blue-400 group-focus-within:scale-110 transition-all duration-300" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                placeholder="Ask AI: 'Show maintenance for Galaxy Heights', 'Rent for Villa 12', 'Expiring Leases'..."
                className="w-full input-glass pl-12 pr-4 py-4 rounded-xl placeholder:text-slate-500 focus:border-blue-500/50 transition-all shadow-inner"
              />
            </div>
            <button
              onClick={handleQuery}
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Search'}
            </button>
          </div>

          {queryResult && (
            <div className="mt-4 p-6 glass rounded-xl glow-blue animate-slide-up">
              <p className="text-lg mb-4 text-slate-50 leading-relaxed border-l-4 border-blue-500 pl-4">{queryResult.answer}</p>
              {queryResult.data && queryResult.data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {queryResult.data.map((item, idx) => (
                    <div key={idx} className={`bubble p-5 rounded-xl text-sm transition-all duration-300 animate-fade-in delay-${Math.min(idx, 4) * 100}`}>
                      {item.address && <div className="font-bold text-blue-300 mb-2 text-base">{item.address}</div>}
                      {item.description && <div className="text-slate-100/90 mb-3 leading-relaxed">{item.description}</div>}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {item.date && <span className="bg-slate-900/50 px-3 py-1.5 rounded-lg text-blue-400 border border-blue-500/20">📅 {item.date}</span>}
                        {item.cost > 0 && <span className="bg-blue-900/40 px-3 py-1.5 rounded-lg text-blue-300 font-semibold border border-blue-500/30">💰 {formatCurrency(item.cost)}</span>}
                        {item.total_cost > 0 && <span className="bg-blue-900/40 px-3 py-1.5 rounded-lg text-blue-300 font-semibold border border-blue-500/30">💵 Total: {formatCurrency(item.total_cost)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 glass p-2 rounded-xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'properties', label: 'Properties', icon: Building2 },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'collect', label: 'Collect Rent', icon: DollarSign },
            { id: 'issue', label: 'Issue Receipts', icon: FileText },
            { id: 'add_tenant', label: 'Add Tenant', icon: UserPlus },
            { id: 'add_property', label: 'Add Property', icon: Building2 },
            { id: 'upload', label: 'Upload Documents', icon: Upload }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[100px] py-3 px-4 rounded-lg font-semibold transition-all duration-300 capitalize tracking-wide flex items-center justify-center gap-2 ${activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/50 glow-blue scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-blue-900/20 hover:scale-102'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {
          activeTab === 'dashboard' && analytics && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6 rounded-2xl glow-on-hover hover-lift group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-all duration-300 group-hover:scale-110">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-800/50 rounded-lg text-slate-400">Total</span>
                  </div>
                  <div className="text-3xl font-bold mb-1 text-white">{analytics.total_properties}</div>
                  <div className="text-slate-400 text-sm">Properties Managed</div>
                </div>

                <div className="glass-card p-6 rounded-2xl glow-on-hover hover-lift group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-all duration-300 group-hover:scale-110">
                      <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-800/50 rounded-lg text-slate-400">Monthly</span>
                  </div>
                  <div className="text-3xl font-bold mb-1 text-white">{formatCurrency(analytics.total_monthly_rent)}</div>
                  <div className="text-slate-400 text-sm">Total Rent Roll</div>
                </div>

                <div className="glass-card p-6 rounded-2xl glow-on-hover hover-lift group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-all duration-300 group-hover:scale-110">
                      <Wrench className="w-6 h-6 text-orange-400" />
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-800/50 rounded-lg text-slate-400">Active</span>
                  </div>
                  <div className="text-3xl font-bold mb-1 text-white">{analytics.active_issues}</div>
                  <div className="text-slate-400 text-sm">Maintenance Issues</div>
                </div>

                <div className="glass-card p-6 rounded-2xl glow-on-hover hover-lift group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-all duration-300 group-hover:scale-110">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-800/50 rounded-lg text-slate-400">YTD</span>
                  </div>
                  <div className="text-3xl font-bold mb-1 text-white">{formatCurrency(analytics.total_maintenance_cost)}</div>
                  <div className="text-slate-400 text-sm">Maintenance Cost</div>
                </div>
              </div>

              <div className="glass-strong p-8 rounded-2xl glow-blue">
                <h3 className="text-xl font-bold mb-6 text-white">Maintenance by Category</h3>
                <div className="space-y-4">
                  {analytics.issues_by_category.map((cat, idx) => (
                    <div key={idx} className="bubble p-5 rounded-xl transition-all duration-300 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-12 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-500/50"></div>
                          <div>
                            <div className="font-bold capitalize text-slate-100 text-lg">{cat.category}</div>
                            <div className="text-sm text-slate-400">{cat.count} issue{cat.count !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <div className="text-green-400 font-bold font-mono bg-slate-900/50 px-4 py-2 rounded-lg border border-green-500/30 shadow-lg">
                          {formatCurrency(cat.total_cost)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        {/* Properties Tab */}
        {
          activeTab === 'properties' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {properties.map((prop, idx) => (
                <div key={prop.id} className={`glass-card p-6 rounded-2xl glow-on-hover hover-lift cursor-pointer animate-fade-in delay-${Math.min(idx, 4) * 100}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-blue-400 mb-1">{prop.address}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">{prop.type}</span>
                        <span>•</span>
                        <span className="text-slate-300">{prop.leaseType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">{formatCurrency(prop.rentAmount)}<span className="text-base text-green-400/50 font-normal">/mo</span></div>
                      <div className="text-slate-500 text-sm mt-1">Expires: <span className="text-slate-300">{prop.leaseEndDate}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-blue-500/20 inline-flex">
                    <Users className="w-4 h-4" />
                    <span>Tenant: <span className="text-slate-100 font-medium">{prop.tenantName}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )
        }

        {/* Maintenance Tab */}
        {
          activeTab === 'maintenance' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {maintenance.map((issue, idx) => (
                <div key={issue.id} className={`bubble p-6 rounded-xl cursor-pointer animate-fade-in delay-${Math.min(idx, 4) * 100}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-blue-300 text-lg mb-1">{issue.address}</div>
                      <div className="text-slate-100/90 mt-1 mb-3 leading-relaxed">{issue.description}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">📅 {issue.date}</span>
                        <span>•</span>
                        <span className="text-slate-300">👷 {issue.vendor}</span>
                        <span>•</span>
                        <span className="uppercase tracking-wider font-semibold bg-slate-800/50 px-2 py-1 rounded">{issue.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="text-slate-100 font-bold text-xl">{formatCurrency(issue.cost)}</div>
                      <div className={`text-xs px-3 py-1.5 rounded-full font-medium shadow-lg ${issue.status === 'Resolved'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-glow-pulse'
                        }`}>
                        {issue.status}
                      </div>
                    </div>
                    {issue.status !== 'Resolved' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveIssue(issue.id); }}
                        className="mt-2 text-xs bg-green-600/20 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/30 hover:bg-green-600/40 transition-colors font-medium flex items-center gap-1 ml-auto"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }

        {/* Documents Tab */}
        {
          activeTab === 'documents' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
              {documents.map((doc, idx) => (
                <div key={doc.id} className={`glass-card p-5 rounded-xl flex items-center justify-between glow-on-hover hover-lift group cursor-pointer animate-fade-in delay-${Math.min(idx, 4) * 100}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800/50 rounded-lg group-hover:bg-blue-500/10 transition-all duration-300 group-hover:scale-110">
                      <FileText className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">{doc.filename}</div>
                      <div className="text-sm text-slate-400 mt-0.5">
                        📁 {doc.propertyId} • 📅 {doc.uploadDate}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">
                    {doc.type}
                  </span>
                </div>
              ))}
            </div>
          )
        }

        {/* Pay Rent Tab */}
        {/* Collect Rent Tab (Landlord View) */}
        {
          activeTab === 'collect' && (
            <div className="animate-in fade-in zoom-in-95 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-strong p-8 rounded-2xl glow-blue flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-400" /> Rent Collection Status
                </h3>

                <div className="space-y-4">
                  {properties.map(prop => (
                    <div key={prop.id} className="p-4 bg-slate-900/60 rounded-xl border border-blue-500/10 flex justify-between items-center group hover:border-blue-500/30 transition-all">
                      <div>
                        <div className="font-semibold text-slate-200">{prop.address.split(',')[0]}</div>
                        <div className="text-sm text-slate-400">{prop.tenantName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{formatCurrency(prop.rentAmount)}</div>
                        <div className="flex gap-2 mt-2 justify-end">
                          <button
                            className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-600/40"
                            onClick={() => alert(`Marked ${prop.address} as PAID`)}
                          >
                            <CheckCircle className="w-3 h-3" /> Mark Paid
                          </button>
                          <button
                            className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-600/40"
                            onClick={() => window.open(`https://wa.me/?text=Hello ${prop.tenantName}, this is a reminder to pay rent of ${formatCurrency(prop.rentAmount)} for ${prop.address}. Please pay via UPI.`, '_blank')}
                          >
                            <Send className="w-3 h-3" /> Remind
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold text-blue-400 mb-2">Receive Payments</h3>
                <p className="text-slate-400 mb-6 text-sm">Show this QR to tenants for direct payment</p>

                <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
                  <img
                    src={`${API_BASE}/api/qr?t=${Date.now()}`}
                    onError={(e) => e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=propnexa@bank&pn=PropNexa&am=0&cu=INR`}
                    alt="My UPI QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <input type="file" onChange={handleQRUpload} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <p className="text-xs text-slate-500 mt-2">Scan via GPay / PhonePe / Paytm</p>
              </div>
            </div>
          )
        }

        {/* Issue Receipts Tab (Landlord View) */}
        {
          activeTab === 'issue' && (
            <div className="animate-in fade-in zoom-in-95 max-w-3xl mx-auto">
              <div className="glass-strong p-8 rounded-2xl glow-blue">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-400" /> Issue Rent Receipts
                  </h3>
                  <button className="btn-primary flex items-center gap-2 py-2 px-4 shadow-none text-sm" onClick={() => window.open(`https://wa.me/?text=Here is your rent receipt for ${receiptDetails.month}. Amount: ${receiptDetails.amount}. Property: ${properties.find(p => p.id === receiptDetails.tenant_id)?.address}`, '_blank')}>
                    <Share2 className="w-4 h-4" /> Send to Tenant
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-slate-400 mb-2 text-sm">Select Tenant / Property</label>
                    <select value={receiptDetails.tenant_id} onChange={e => {
                      const p = properties.find(x => x.id === e.target.value);
                      setReceiptDetails({ ...receiptDetails, tenant_id: e.target.value, amount: p ? p.rentAmount : '' });
                    }} className="w-full input-glass p-3 rounded-lg bg-slate-900 text-slate-300">
                      <option value="">Select Tenant</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.tenantName} - {p.address}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-2 text-sm">For Month</label>
                    <input type="month" value={receiptDetails.month} onChange={e => setReceiptDetails({ ...receiptDetails, month: e.target.value })} className="w-full input-glass p-3 rounded-lg bg-slate-900 text-slate-300" />
                  </div>
                </div>

                {/* Receipt Preview */}
                {/* Receipt Preview */}
                {receiptDetails.tenant_id && (
                  <div className="bg-white text-slate-900 p-8 rounded-lg shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Building2 className="w-32 h-32" />
                    </div>

                    <div className="text-center mb-8 border-b-2 border-slate-900 pb-4">
                      <h2 className="text-3xl font-serif font-bold">RENT PAYMENT RECEIPT</h2>
                      <p className="text-sm text-slate-500 mt-1">Authorized Official Receipt</p>
                    </div>

                    <div className="space-y-4 relative z-10 text-left">
                      <div className="flex items-center gap-2">
                        <span className="w-32 text-slate-600 font-semibold">Received from:</span>
                        <input
                          type="text"
                          value={receiptDetails.tenant_name || ''}
                          onChange={e => setReceiptDetails({ ...receiptDetails, tenant_name: e.target.value })}
                          className="font-bold border-b-2 border-slate-900 px-2 flex-1 outline-none bg-transparent hover:bg-slate-50 focus:bg-blue-50 transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-32 text-slate-600 font-semibold">The sum of:</span>
                        <input
                          type="text"
                          value={receiptDetails.amount ? formatCurrency(receiptDetails.amount) : ''}
                          onChange={e => setReceiptDetails({ ...receiptDetails, amount: e.target.value.replace(/[^0-9]/g, '') })}
                          className="font-bold border-b-2 border-slate-900 px-2 flex-1 outline-none bg-transparent hover:bg-slate-50 focus:bg-blue-50 transition-colors"
                        />
                      </div>
                      <div className="">
                        <span className="text-slate-600 block mb-1 font-semibold">Being rent for the premises at:</span>
                        <textarea
                          value={receiptDetails.address || ''}
                          onChange={e => setReceiptDetails({ ...receiptDetails, address: e.target.value })}
                          className="font-bold block w-full border-l-4 border-slate-900 pl-4 py-2 bg-slate-100 rounded-r outline-none resize-none hover:bg-blue-50 focus:bg-white transition-colors"
                          rows="2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-32 text-slate-600 font-semibold">Month:</span>
                        <span className="font-bold border-b-2 border-slate-900 px-2 flex-1">{receiptDetails.month ? new Date(receiptDetails.month).toLocaleDateString('default', { month: 'long', year: 'numeric' }) : 'Current Month'}</span>
                      </div>
                    </div>

                    <div className="mt-12 flex justify-between items-end">
                      <div className="text-sm text-slate-500">
                        <p>Date: {new Date().toLocaleDateString()}</p>
                        <p>Location: Mumbai</p>
                      </div>
                      <div className="text-center">
                        <p className="font-serif italic text-lg mb-1">{properties.find(p => p.id === receiptDetails.tenant_id)?.landlordName || 'Authorized Signatory'}</p>
                        <div className="h-0 w-32 border-b border-slate-900 mb-1"></div>
                        <p className="text-xs font-bold uppercase tracking-wider">Landlord Signature</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {/* Upload Tab */}
        {
          activeTab === 'upload' && (
            <div className="glass-strong p-8 rounded-2xl glow-blue animate-in fade-in zoom-in-95">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={uploadMeta.property_id} onChange={e => setUploadMeta({ ...uploadMeta, property_id: e.target.value })} className="input-glass p-3 rounded-lg bg-slate-900 text-slate-300 border border-slate-700/50">
                  <option value="">Select Property (required)</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
                <select value={uploadMeta.tenant_id} onChange={e => setUploadMeta({ ...uploadMeta, tenant_id: e.target.value })} className="input-glass p-3 rounded-lg bg-slate-900 text-slate-300 border border-slate-700/50">
                  <option value="">Select Tenant (Optional)</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.tenantName}</option>)}
                </select>
              </div>
              <div className="border-2 border-dashed border-blue-500/30 rounded-2xl p-16 text-center hover:border-blue-500 hover:bg-blue-950/20 transition-all duration-300 group animate-glow-pulse">
                <Upload className="w-16 h-16 mx-auto mb-6 text-blue-500/50 group-hover:text-blue-400 transition-all duration-300 group-hover:scale-110 animate-float" />
                <label className="cursor-pointer block">
                  <span className="text-blue-400 font-bold text-lg hover:text-blue-300 underline decoration-2 underline-offset-4 transition-colors">Click to upload document</span>
                  <span className="text-slate-400 block mt-2">or drag and drop files here</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                </label>
                <p className="text-slate-500 text-sm mt-6">Supported: PDF, JPG, PNG, DOC (max 10MB)</p>
              </div>

              <div className="mt-8 bubble p-6 rounded-xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-400 leading-relaxed">
                  <strong className="text-blue-400 block mb-1 text-base">System Connected</strong>
                  Files are securely stored in the local database. Our AI automatically extracts metadata, categorizes details, and links them to specific properties.
                </div>
              </div>
            </div>
          )
        }

        {/* Add Tenant Tab */}
        {
          activeTab === 'add_tenant' && (
            <div className="glass-strong p-8 rounded-2xl glow-blue animate-in fade-in zoom-in-95 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Onboard New Tenant</h3>
                  <p className="text-slate-400 text-sm">Create credentials and assign property</p>
                </div>
              </div>

              <form onSubmit={handleOnboardTenant} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Selection */}
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-2 pl-1">Assign Property</label>
                  <select
                    value={newTenant.property_id}
                    onChange={e => setNewTenant({ ...newTenant, property_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/50 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select Property</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address} {p.tenantName ? `(Current: ${p.tenantName})` : '(Vacant)'}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider border-b border-blue-500/20 pb-2 mb-4">Personal Details</h4>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Full Name</label>
                    <input
                      type="text"
                      value={newTenant.name}
                      onChange={e => setNewTenant({ ...newTenant, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      placeholder="e.g. Rahul Sharma"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Username (Login ID)</label>
                    <input
                      type="text"
                      value={newTenant.username}
                      onChange={e => setNewTenant({ ...newTenant, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      placeholder="e.g. rahul_sharma"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Password</label>
                    <input
                      type="text"
                      value={newTenant.password}
                      onChange={e => setNewTenant({ ...newTenant, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      placeholder="Secret Password"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider border-b border-green-500/20 pb-2 mb-4">Lease Terms</h4>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Monthly Rent (₹)</label>
                    <input
                      type="number"
                      value={newTenant.rent_amount}
                      onChange={e => setNewTenant({ ...newTenant, rent_amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      placeholder="e.g. 45000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Lease Start Date</label>
                    <input
                      type="date"
                      value={newTenant.lease_start}
                      onChange={e => setNewTenant({ ...newTenant, lease_start: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Lease End Date</label>
                    <input
                      type="date"
                      value={newTenant.lease_end}
                      onChange={e => setNewTenant({ ...newTenant, lease_end: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-yellow-400 font-bold uppercase text-xs tracking-wider border-b border-yellow-500/20 pb-2 mb-4">Identity Documents</h4>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Aadhaar Card (PDF/JPG)</label>
                    <input
                      type="file"
                      onChange={e => setTenantFiles({ ...tenantFiles, aadhaar: e.target.files[0] })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 transition-all"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">PAN Card (PDF/JPG)</label>
                    <input
                      type="file"
                      onChange={e => setTenantFiles({ ...tenantFiles, pan: e.target.files[0] })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 transition-all"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 pt-4">
                  <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-3">
                    <UserPlus className="w-5 h-5" /> Create Tenant Account
                  </button>
                </div>
              </form>
            </div>
          )
        }

        {/* Add Property Tab */}
        {
          activeTab === 'add_property' && (
            <div className="glass-strong p-8 rounded-2xl glow-blue animate-in fade-in zoom-in-95 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-400" /> Add New Property
              </h3>
              <form onSubmit={handleCreateProperty} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1 pl-1">Property Address</label>
                  <input type="text" value={newProperty.address} onChange={e => setNewProperty({ ...newProperty, address: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="e.g. 502, Ocean View, Mumbai" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Property Type</label>
                    <select value={newProperty.type} onChange={e => setNewProperty({ ...newProperty, type: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white">
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 pl-1">Expected Rent (₹)</label>
                    <input type="number" value={newProperty.rent_amount} onChange={e => setNewProperty({ ...newProperty, rent_amount: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="25000" required />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1 pl-1">Owner Name (for Records)</label>
                  <input type="text" value={newProperty.owner_name} onChange={e => setNewProperty({ ...newProperty, owner_name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Ishaan Chawla" required />
                </div>
                <button type="submit" className="w-full btn-primary py-4 mt-6">Add Property to Portfolio</button>
              </form>
            </div>
          )
        }
      </div >
    </div >
  );
}

export default OwnerDashboard;