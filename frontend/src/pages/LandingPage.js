import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, ArrowRight } from 'lucide-react';
import propnexaLogo from '../propnexa_logo.png';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center container mx-auto">
                <div className="flex items-center gap-3">
                    <img src={propnexaLogo} alt="Logo" className="w-32 h-32 object-contain drop-shadow-lg" />
                    <span className="text-2xl font-serif font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">PROPNEXA</span>
                </div>
                <button className="text-slate-400 hover:text-white transition-colors font-medium">Contact Support</button>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 text-center container mx-auto">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                    Property Management <br /> <span className="text-blue-500">Reimagined.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
                    Seamlessly connect property owners and tenants. Automate rent, track maintenance, and handle documents with AI-driven intelligence.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    {/* Owner Card */}
                    <div
                        onClick={() => navigate('/login?role=owner')}
                        className="group bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-blue-500/50 hover:bg-blue-950/30 transition-all duration-300 cursor-pointer flex flex-col items-center hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Building2 className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-300">I am a Landlord</h2>
                        <p className="text-slate-400 mb-6 text-sm">Manage properties, track rent, and issue receipts.</p>
                        <div className="mt-auto flex items-center gap-2 text-blue-400 font-semibold text-sm group-hover:gap-3 transition-all">
                            Owner Login <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Tenant Card */}
                    <div
                        onClick={() => navigate('/login?role=tenant')}
                        className="group bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-emerald-500/50 hover:bg-emerald-950/30 transition-all duration-300 cursor-pointer flex flex-col items-center hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Users className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-emerald-300">I am a Tenant</h2>
                        <p className="text-slate-400 mb-6 text-sm">Pay rent, request maintenance, and view documents.</p>
                        <div className="mt-auto flex items-center gap-2 text-emerald-400 font-semibold text-sm group-hover:gap-3 transition-all">
                            Tenant Login <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 p-6 text-center text-slate-600 text-sm">
                &copy; 2024 PropNexa Inc. All rights reserved.
            </footer>
        </div>
    );
}
