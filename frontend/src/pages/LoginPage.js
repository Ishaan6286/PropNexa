import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, User, Eye, EyeOff, Home } from 'lucide-react';
import propnexaLogo from '../propnexa_logo.png';
import { loginUser } from '../firebase/auth';
import { setupUsers } from '../firebase/setupUsers';

export default function LoginPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const role = searchParams.get('role') || 'owner'; // Default to owner

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Convert username to email format for Firebase Auth
            const email = username.includes('@') ? username : `${username.toLowerCase()}@propnexa.com`;

            const result = await loginUser(email, password);

            if (result.status === 'success') {
                // Save to local storage
                localStorage.setItem('user', JSON.stringify(result.user));

                // Redirect based on role
                if (result.user.role === 'owner') navigate('/owner');
                else if (result.user.role === 'tenant') navigate('/tenant');
                else setError('Unknown role');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed. Please check your credentials.');
        }
        setLoading(false);
    };

    const handleSetupDemo = async () => {
        if (!window.confirm("Initialize Demo Users? This will create 'Ishaan' and 'Chintu' accounts if they don't exist.")) return;
        setLoading(true);
        try {
            await setupUsers();
            alert("Demo users initialized! You can now login.");
        } catch (e) {
            console.error(e);
            alert("Setup failed: " + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Home Button */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
                <Home className="w-5 h-5" />
                <span className="text-sm font-medium">Home</span>
            </button>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <img src={propnexaLogo} alt="Logo" className="w-16 h-16 mx-auto mb-4 drop-shadow-xl" />
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                    <p className="text-slate-400">Login to your {role === 'owner' ? 'Landlord' : 'Tenant'} Portal</p>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}

                        <div>
                            <label className="block text-slate-400 text-sm font-medium mb-2 pl-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                    placeholder="e.g. admin"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-sm font-medium mb-2 pl-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors w-full text-right"
                            onClick={() => {
                                // Fill credentials for demo convenience
                                if (role === 'owner') { setUsername('Ishaan'); setPassword('Ishaan123'); }
                                else { setUsername('Chintu'); setPassword('Chintu123'); }
                            }}
                        >
                            (Demo: autofill credentials)
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging in...' : <>Login <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8 text-sm text-slate-500">
                    Protected by PropNexa Secure Auth
                    <div className="mt-2">
                        <button onClick={handleSetupDemo} className="text-xs text-blue-500 hover:text-blue-400 underline">
                            Can't login? Initialize Demo Users
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
